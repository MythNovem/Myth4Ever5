namespace Myth4Ever5.Api.Games.LiarsDeck;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.LiarsDeck.Models;

/// <summary>
/// Liar's Deck — Card deception mixed with Russian Roulette.
/// Auto-discovered and registered by Reflection in GameEngineFactory.
/// </summary>
public class LiarsDeckEngine : IGameEngine
{
    public string GameTypeId => "liars_deck";
    public string GameName   => "🃏 Liar's Deck (Bộ Bài Dối Tráo & Cò Quay Nga)";
    public int MinPlayers    => 2;
    public int MaxPlayers    => 4;

    private readonly Random _random = new();

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new LiarsDeckState();

        // 1. Initialize Revolvers & Player Status
        foreach (var p in room.Players)
        {
            p.IsAlive = true;
            state.Revolvers[p.PlayerId] = new PlayerRevolver
            {
                BulletChamber = _random.Next(0, 6),
                CurrentChamber = 0,
                TotalShotsFired = 0
            };
        }

        // 2. Start First Round
        state.CurrentTurnIndex = _random.Next(0, room.Players.Count);
        StartNewRound(room, state, isFirstRound: true);

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    private void StartNewRound(RoomModel room, LiarsDeckState state, bool isFirstRound)
    {
        // 1. Build Deck (6 Kings, 6 Queens, 6 Aces, 2 Jokers = 20 cards)
        var cards = new List<LiarsDeckCard>();
        for (int i = 0; i < 6; i++) cards.Add(new LiarsDeckCard { Rank = CardRank.King });
        for (int i = 0; i < 6; i++) cards.Add(new LiarsDeckCard { Rank = CardRank.Queen });
        for (int i = 0; i < 6; i++) cards.Add(new LiarsDeckCard { Rank = CardRank.Ace });
        for (int i = 0; i < 2; i++) cards.Add(new LiarsDeckCard { Rank = CardRank.Joker });

        // Shuffle deck
        cards = cards.OrderBy(_ => _random.Next()).ToList();

        // 2. Deal 5 cards to each alive player
        state.Hands.Clear();
        var alivePlayers = room.Players.Where(p => p.IsAlive).ToList();
        foreach (var p in alivePlayers)
        {
            var hand = cards.Take(5).ToList();
            cards.RemoveRange(0, Math.Min(5, cards.Count));
            state.Hands[p.PlayerId] = hand;
        }

        state.Deck = cards;
        state.TablePile.Clear();
        state.LastClaim = null;

        // 3. Random Table Rank (King, Queen, or Ace)
        var ranks = new[] { CardRank.King, CardRank.Queen, CardRank.Ace };
        state.TableRank = ranks[_random.Next(0, ranks.Length)];

        string tableRankName = state.TableRank switch
        {
            CardRank.King => "👑 Bàn KING",
            CardRank.Queen => "👸 Bàn QUEEN",
            CardRank.Ace => "🅰️ Bàn ACE",
            _ => state.TableRank.ToString()
        };

        if (isFirstRound)
        {
            state.GameLogs.Add($"🎮 Bắt đầu trò chơi Liar's Deck!");
        }
        else
        {
            state.GameLogs.Add($"🔄 Bắt đầu vòng chơi mới!");
        }

        var turnPlayer = room.Players[state.CurrentTurnIndex];
        state.GameLogs.Add($"🎲 Vòng này là {tableRankName}. Đã chia 5 lá bài cho mỗi người chơi.");
        state.GameLogs.Add($"👉 Lượt đầu thuộc về {turnPlayer.PlayerName}.");
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not LiarsDeckState state)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Trạng thái game không hợp lệ!" });

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        if (currentPlayer.PlayerId != playerId)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });

        if (actionType == "play_cards")
        {
            return Task.FromResult(HandlePlayCards(room, state, currentPlayer, payload));
        }
        else if (actionType == "challenge")
        {
            return Task.FromResult(HandleChallenge(room, state, currentPlayer));
        }

        return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ!" });
    }

    private GameActionResult HandlePlayCards(RoomModel room, LiarsDeckState state, PlayerModel player, JsonElement payload)
    {
        if (!payload.TryGetProperty("cardIds", out var cardIdsProp) || cardIdsProp.ValueKind != JsonValueKind.Array)
        {
            return new GameActionResult { Success = false, Message = "Vui lòng chọn lá bài muốn đánh!" };
        }

        var cardIds = new List<string>();
        foreach (var elem in cardIdsProp.EnumerateArray())
        {
            if (elem.ValueKind == JsonValueKind.String)
                cardIds.Add(elem.GetString()!);
        }

        if (cardIds.Count == 0 || cardIds.Count > 3)
        {
            return new GameActionResult { Success = false, Message = "Bạn chỉ được đánh từ 1 đến 3 lá bài mỗi lượt!" };
        }

        if (!state.Hands.TryGetValue(player.PlayerId, out var hand))
        {
            return new GameActionResult { Success = false, Message = "Không tìm thấy tay bài của bạn!" };
        }

        // Validate player owns all selected cards
        var selectedCards = new List<LiarsDeckCard>();
        foreach (var cid in cardIds)
        {
            var card = hand.FirstOrDefault(c => c.Id == cid);
            if (card == null)
            {
                return new GameActionResult { Success = false, Message = "Lá bài chọn không hợp lệ hoặc không có trên tay!" };
            }
            selectedCards.Add(card);
        }

        // Remove from hand and add to TablePile
        foreach (var card in selectedCards)
        {
            hand.Remove(card);
            state.TablePile.Add(card);
        }

        // Record LastClaim
        state.LastClaim = new LastClaimInfo
        {
            PlayerId = player.PlayerId,
            PlayerName = player.PlayerName,
            CardsPlayed = selectedCards,
            TableRankClaimed = state.TableRank,
            CanChallenge = true
        };

        state.GameLogs.Add($"🃏 {player.PlayerName} đã đánh úp {selectedCards.Count} lá bài và tuyên bố là {GetRankDisplayName(state.TableRank)}!");

        // Advance turn to next alive player
        AdvanceTurn(room, state);

        return new GameActionResult
        {
            Success = true,
            ActionType = "cards_played",
            Data = SanitizeStateForBroadcast(room, state)
        };
    }

    private GameActionResult HandleChallenge(RoomModel room, LiarsDeckState state, PlayerModel challenger)
    {
        if (state.LastClaim == null || !state.LastClaim.CanChallenge)
        {
            return new GameActionResult { Success = false, Message = "Không có lượt đánh nào để tố dối tráo!" };
        }

        var claimant = room.Players.FirstOrDefault(p => p.PlayerId == state.LastClaim.PlayerId);
        if (claimant == null)
        {
            return new GameActionResult { Success = false, Message = "Người chơi bị tố không tồn tại!" };
        }

        // 1. Reveal cards and check if claimant lied
        var cardsPlayed = state.LastClaim.CardsPlayed;
        bool wasLying = cardsPlayed.Any(c => c.Rank != state.TableRank && c.Rank != CardRank.Joker);

        var shooter = wasLying ? claimant : challenger;
        var nonShooter = wasLying ? challenger : claimant;

        state.GameLogs.Add($"🚨 {challenger.PlayerName} đã lật bài TỐ {claimant.PlayerName}!");

        string revealedStr = string.Join(", ", cardsPlayed.Select(c => c.GetDisplayName()));
        state.GameLogs.Add($"🔍 Lật bài: [{revealedStr}]");

        if (wasLying)
        {
            state.GameLogs.Add($"❌ {claimant.PlayerName} ĐÃ NÓI DỐI! {claimant.PlayerName} phải tự bóp cò súng!");
        }
        else
        {
            state.GameLogs.Add($"✅ {claimant.PlayerName} NÓI THẬT (hoặc dùng Joker)! {challenger.PlayerName} tố sai và phải tự bóp cò súng!");
        }

        // 2. Perform Russian Roulette on shooter
        var revolver = state.Revolvers[shooter.PlayerId];
        bool didFire = (revolver.CurrentChamber == revolver.BulletChamber);
        revolver.TotalShotsFired++;

        if (didFire)
        {
            shooter.IsAlive = false;
            state.GameLogs.Add($"💥 BANG!!! Súng của {shooter.PlayerName} NỔ TUNG! {shooter.PlayerName} bị loại khỏi trò chơi!");
        }
        else
        {
            revolver.CurrentChamber = (revolver.CurrentChamber + 1) % 6;
            state.GameLogs.Add($"💨 CLICK! Súng của {shooter.PlayerName} KHÔNG NỔ! {shooter.PlayerName} may mắn sống sót và lên đạn khoang tiếp theo ({revolver.CurrentChamber + 1}/6).");
        }

        state.LastChallengeResult = new ChallengeResultInfo
        {
            ChallengerId = challenger.PlayerId,
            ChallengerName = challenger.PlayerName,
            ClaimantId = claimant.PlayerId,
            ClaimantName = claimant.PlayerName,
            RevealedCards = cardsPlayed,
            WasLying = wasLying,
            ShooterId = shooter.PlayerId,
            ShooterName = shooter.PlayerName,
            DidGunFire = didFire,
            DidShooterDie = !shooter.IsAlive
        };

        state.LastClaim.CanChallenge = false;

        // 3. Check for Winner
        var survivors = room.Players.Where(p => p.IsAlive).ToList();
        if (survivors.Count <= 1)
        {
            var winner = survivors.FirstOrDefault() ?? room.Players.FirstOrDefault();
            state.WinnerPlayerId = winner?.PlayerId;
            state.WinnerPlayerName = winner?.PlayerName;

            state.GameLogs.Add($"🏆 CHÚC MỪNG {winner?.PlayerName} đã trở thành người duy nhất sống sót và GIÀNH CHIẾN THẮNG!");

            return new GameActionResult
            {
                Success = true,
                ActionType = "challenge_resolved",
                IsGameOver = true,
                WinnerId = winner?.PlayerId,
                WinnerName = winner?.PlayerName,
                Data = SanitizeStateForBroadcast(room, state)
            };
        }

        // 4. If > 1 survivors, start a new round
        // Advance turn to next alive player
        AdvanceTurn(room, state);
        StartNewRound(room, state, isFirstRound: false);

        return new GameActionResult
        {
            Success = true,
            ActionType = "challenge_resolved",
            Data = SanitizeStateForBroadcast(room, state)
        };
    }

    private void AdvanceTurn(RoomModel room, LiarsDeckState state)
    {
        do
        {
            state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;
        } while (!room.Players[state.CurrentTurnIndex].IsAlive);
    }

    private static string GetRankDisplayName(CardRank rank) => rank switch
    {
        CardRank.King => "👑 King",
        CardRank.Queen => "👸 Queen",
        CardRank.Ace => "🅰️ Ace",
        _ => rank.ToString()
    };

    public object SanitizeStateForBroadcast(RoomModel room, object genericState)
    {
        if (genericState is not LiarsDeckState state) return new { };

        var playersInfo = room.Players.Select(p =>
        {
            var revolver = state.Revolvers.GetValueOrDefault(p.PlayerId);
            int cardsCount = state.Hands.TryGetValue(p.PlayerId, out var hand) ? hand.Count : 0;
            return new
            {
                p.PlayerId,
                p.PlayerName,
                p.AvatarUrl,
                p.IsAlive,
                CardsCount = cardsCount,
                CurrentChamber = revolver != null ? revolver.CurrentChamber + 1 : 1,
                TotalShotsFired = revolver?.TotalShotsFired ?? 0
            };
        }).ToList();

        var currentTurnPlayer = room.Players[state.CurrentTurnIndex];

        // Format Hands so Rank is always a string ("King", "Queen", "Ace", "Joker")
        var formattedHands = state.Hands.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.Select(c => new
            {
                id = c.Id,
                rank = c.Rank.ToString()
            }).ToList()
        );

        return new
        {
            TableRank = state.TableRank.ToString(),
            TableRankName = GetRankDisplayName(state.TableRank),
            CurrentTurnPlayerId = currentTurnPlayer.PlayerId,
            CurrentTurnPlayerName = currentTurnPlayer.PlayerName,
            Players = playersInfo,
            TablePileCount = state.TablePile.Count,
            LastClaim = state.LastClaim != null ? new
            {
                state.LastClaim.PlayerId,
                state.LastClaim.PlayerName,
                CardCount = state.LastClaim.CardsPlayed.Count,
                state.LastClaim.CanChallenge
            } : null,
            LastChallengeResult = state.LastChallengeResult != null ? new
            {
                state.LastChallengeResult.ChallengerId,
                state.LastChallengeResult.ChallengerName,
                state.LastChallengeResult.ClaimantId,
                state.LastChallengeResult.ClaimantName,
                RevealedCards = state.LastChallengeResult.RevealedCards.Select(rc => new { id = rc.Id, rank = rc.Rank.ToString() }).ToList(),
                state.LastChallengeResult.WasLying,
                state.LastChallengeResult.ShooterId,
                state.LastChallengeResult.ShooterName,
                state.LastChallengeResult.DidGunFire,
                state.LastChallengeResult.DidShooterDie
            } : null,
            Hands = formattedHands,
            GameLogs = state.GameLogs.TakeLast(12).ToList(),
            WinnerPlayerId = state.WinnerPlayerId,
            WinnerPlayerName = state.WinnerPlayerName
        };
    }
}
