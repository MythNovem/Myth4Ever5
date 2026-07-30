namespace Myth4Ever5.Api.Games.MythicCards;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

public class MythicCardsEngine : IGameEngine
{
    public string GameTypeId => "mythic_cards";
    public string GameName => "Mythic Cards: Trap & Survive";
    public int MinPlayers => 2;
    public int MaxPlayers => 4;

    private readonly Random _random = new();

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new MythicCardsState();

        // 1. Tạo các lá bài Action cơ bản
        var actionCards = new List<CardModel>();
        for (int i = 0; i < 6; i++) // Tăng số lượng bài lên 6 bộ (30 lá) để deck dày hơn
        {
            actionCards.Add(new CardModel { Type = CardType.Skip, Name = "Bỏ Lượt", Description = "Bỏ qua lượt hiện tại không cần rút bài", Icon = "⏭️", Color = "#3b82f6" });
            actionCards.Add(new CardModel { Type = CardType.Attack, Name = "Ép Lượt", Description = "Bỏ lượt & ép đối thủ kế tiếp đi 2 lượt", Icon = "🔄", Color = "#ef4444" });
            actionCards.Add(new CardModel { Type = CardType.SeeFuture, Name = "Nhìn Tương Lai", Description = "Xem 3 lá bài đầu tiên của bộ bài", Icon = "👁️", Color = "#8b5cf6" });
            actionCards.Add(new CardModel { Type = CardType.Shuffle, Name = "Xáo Bài", Description = "Xáo trộn ngẫu nhiên bộ bài rút", Icon = "🔀", Color = "#10b981" });
            actionCards.Add(new CardModel { Type = CardType.Steal, Name = "Cướp Bài", Description = "Cướp 1 lá ngẫu nhiên trên tay đối thủ", Icon = "🎁", Color = "#f59e0b" });
        }

        // Thêm 4 bản sao cho mỗi loại Bài Thường
        for (int i = 0; i < 4; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Normal1, Name = "Cáo Chín Đuôi", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🦊", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal2, Name = "Rồng Con", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐲", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal3, Name = "Sói Băng", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐺", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal4, Name = "Tinh Linh", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🧚", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal5, Name = "Golem Đá", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🪨", Color = "#78716c" });
        }

        // Xáo trộn các lá Action để chia
        ShuffleList(actionCards);

        // 2. Phát cho mỗi người chơi 1 lá Defuse + 4 lá Action ngẫu nhiên
        foreach (var player in room.Players)
        {
            player.IsAlive = true;
            var hand = new List<CardModel>
            {
                new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" }
            };

            for (int i = 0; i < 4; i++)
            {
                if (actionCards.Count > 0)
                {
                    hand.Add(actionCards[0]);
                    actionCards.RemoveAt(0);
                }
            }

            state.PlayerHands[player.ConnectionId] = hand;
        }

        // 3. Đưa Bẫy Nổ (PlayerCount - 1 = 2) và các lá Defuse còn lại vào Deck chung
        var remainingDeck = new List<CardModel>(actionCards);
        
        // Thêm 2 lá Bẫy Nổ
        for (int i = 0; i < room.Players.Count - 1; i++)
        {
            remainingDeck.Add(new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Nổ tung và loại người chơi khỏi bàn!", Icon = "💣", Color = "#dc2626" });
        }

        // Thêm 1 lá Defuse dự phòng vào bộ bài
        remainingDeck.Add(new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" });

        ShuffleList(remainingDeck);
        state.Deck = remainingDeck;

        state.CurrentTurnIndex = _random.Next(0, room.Players.Count);
        state.TurnsToTake = 1;
        state.GameLogs.Add($"Bắt đầu game! Người chơi {room.Players[state.CurrentTurnIndex].PlayerName} đi trước.");

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not MythicCardsState state)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Game state không hợp lệ" });
        }

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        if (currentPlayer.ConnectionId != playerId && actionType != "insert_trap")
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });
        }

        if (!currentPlayer.IsAlive)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Bạn đã bị loại!" });
        }

        switch (actionType)
        {
            case "play_card":
                return Task.FromResult(HandlePlayCard(room, state, playerId, payload));

            case "draw_card":
                return Task.FromResult(HandleDrawCard(room, state, playerId));

            case "insert_trap":
                return Task.FromResult(HandleInsertTrap(room, state, playerId, payload));

            default:
                return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ" });
        }
    }

    private GameActionResult HandlePlayCard(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (state.AwaitingDefusePlacement)
        {
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };
        }

        if (!payload.TryGetProperty("cardIds", out var cardIdsProp))
        {
            return new GameActionResult { Success = false, Message = "Thiếu cardIds" };
        }

        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        if (cardIds.Count == 0)
        {
            return new GameActionResult { Success = false, Message = "Chưa chọn lá bài nào" };
        }

        var hand = state.PlayerHands[playerId];
        var cardsToPlay = new List<CardModel>();

        foreach (var id in cardIds)
        {
            var c = hand.FirstOrDefault(x => x.Id == id);
            if (c == null) return new GameActionResult { Success = false, Message = "Lá bài không tồn tại trên tay" };
            cardsToPlay.Add(c);
        }

        if (cardsToPlay.Any(c => c.Type == CardType.Defuse || c.Type == CardType.ExplodingTrap))
        {
            return new GameActionResult { Success = false, Message = "Bẫy Nổ và Gỡ Bẫy không thể tự ý đánh ra!" };
        }

        // Logic đánh 1 lá (Action cơ bản)
        if (cardsToPlay.Count == 1)
        {
            var card = cardsToPlay[0];
            if (IsNormalCard(card.Type))
            {
                return new GameActionResult { Success = false, Message = "Bài thường phải đánh theo bộ, không được đánh lẻ!" };
            }

            hand.Remove(card);
            state.DiscardPile.Add(card);

            string playerMsg = $"{room.Players.First(p => p.ConnectionId == playerId).PlayerName} đã đánh lá [{card.Name}] {card.Icon}";
            state.GameLogs.Add(playerMsg);

            return ExecuteSingleCardEffect(room, state, playerId, card, payload);
        }
        else
        {
            // Logic đánh Combo (2, 3, 5 lá)
            return ExecuteComboEffect(room, state, playerId, cardsToPlay, payload);
        }
    }

    private bool IsNormalCard(CardType type)
    {
        return type == CardType.Normal1 || type == CardType.Normal2 || type == CardType.Normal3 || type == CardType.Normal4 || type == CardType.Normal5;
    }

    private GameActionResult ExecuteSingleCardEffect(RoomModel room, MythicCardsState state, string playerId, CardModel card, JsonElement payload)
    {
        var hand = state.PlayerHands[playerId];
        object? extraData = null;

        switch (card.Type)
        {
            case CardType.Skip:
                state.TurnsToTake--;
                if (state.TurnsToTake <= 0)
                {
                    AdvanceTurn(room, state);
                }
                break;

            case CardType.Attack:
                // Kết thúc lượt hiện tại ngay lập tức, người tiếp theo chịu 2 lượt
                AdvanceTurn(room, state);
                state.TurnsToTake = 2;
                break;

            case CardType.SeeFuture:
                var top3 = state.Deck.Take(3).ToList();
                extraData = new { FutureCards = top3 };
                break;

            case CardType.Shuffle:
                ShuffleList(state.Deck);
                break;

            case CardType.Steal:
                string targetId = "";
                if (payload.TryGetProperty("targetPlayerId", out var targetProp))
                {
                    targetId = targetProp.GetString() ?? "";
                }

                var aliveTargets = room.Players.Where(p => p.ConnectionId != playerId && p.IsAlive && state.PlayerHands[p.ConnectionId].Count > 0).ToList();
                if (aliveTargets.Count > 0)
                {
                    var target = aliveTargets.FirstOrDefault(p => p.ConnectionId == targetId) ?? aliveTargets[_random.Next(aliveTargets.Count)];
                    var targetHand = state.PlayerHands[target.ConnectionId];
                    var stolenCard = targetHand[_random.Next(targetHand.Count)];
                    targetHand.Remove(stolenCard);
                    hand.Add(stolenCard);
                    state.GameLogs.Add($"{room.Players.First(p => p.ConnectionId == playerId).PlayerName} đã cướp 1 lá bài của {target.PlayerName}!");
                }
                break;
        }

        return CheckGameOverOrContinue(room, state, "card_played", new
        {
            PlayerId = playerId,
            Card = card,
            ExtraData = extraData,
            RoomState = SanitizeStateForBroadcast(room, state)
        });
    }

    private GameActionResult ExecuteComboEffect(RoomModel room, MythicCardsState state, string playerId, List<CardModel> cardsToPlay, JsonElement payload)
    {
        int count = cardsToPlay.Count;
        var hand = state.PlayerHands[playerId];
        var player = room.Players.First(p => p.ConnectionId == playerId);
        
        bool isPair = count == 2 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isThree = count == 3 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isFiveDiff = count == 5 && cardsToPlay.Select(c => c.Type).Distinct().Count() == 5;

        if (!isPair && !isThree && !isFiveDiff)
        {
            return new GameActionResult { Success = false, Message = "Combo không hợp lệ! Chỉ được đánh 2 lá giống nhau, 3 lá giống nhau, hoặc 5 lá khác nhau." };
        }

        object? extraData = null;

        if (isPair || isThree)
        {
            string targetId = "";
            if (payload.TryGetProperty("targetPlayerId", out var targetProp))
            {
                targetId = targetProp.GetString() ?? "";
            }

            var target = room.Players.FirstOrDefault(p => p.ConnectionId == targetId && p.IsAlive && p.ConnectionId != playerId);
            if (target == null)
            {
                return new GameActionResult { Success = false, Message = "Mục tiêu không hợp lệ hoặc đã bị loại!" };
            }

            var targetHand = state.PlayerHands[target.ConnectionId];

            if (isPair)
            {
                if (targetHand.Count > 0)
                {
                    var stolenCard = targetHand[_random.Next(targetHand.Count)];
                    targetHand.Remove(stolenCard);
                    hand.Add(stolenCard);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá cướp 1 lá bài của {target.PlayerName}!");
                }
                else
                {
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá nhắm vào {target.PlayerName} nhưng họ không còn bài!");
                }
            }
            else if (isThree)
            {
                string targetCardTypeStr = "";
                if (payload.TryGetProperty("targetCardType", out var typeProp))
                {
                    targetCardTypeStr = typeProp.GetString() ?? "";
                }

                if (!Enum.TryParse<CardType>(targetCardTypeStr, out var requestedType))
                {
                    return new GameActionResult { Success = false, Message = "Loại bài yêu cầu không hợp lệ!" };
                }

                var cardToGive = targetHand.FirstOrDefault(c => c.Type == requestedType);
                if (cardToGive != null)
                {
                    targetHand.Remove(cardToGive);
                    hand.Add(cardToGive);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} và THÀNH CÔNG!");
                }
                else
                {
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} nhưng THẤT BẠI (không có)!");
                }
            }
        }
        else if (isFiveDiff)
        {
            string targetCardIdFromDiscard = "";
            if (payload.TryGetProperty("targetCardIdFromDiscard", out var discardProp))
            {
                targetCardIdFromDiscard = discardProp.GetString() ?? "";
            }

            var cardToRevive = state.DiscardPile.FirstOrDefault(c => c.Id == targetCardIdFromDiscard);
            if (cardToRevive == null)
            {
                return new GameActionResult { Success = false, Message = "Lá bài muốn lấy không có trong Discard Pile!" };
            }

            state.DiscardPile.Remove(cardToRevive);
            hand.Add(cardToRevive);
            state.GameLogs.Add($"{player.PlayerName} dùng Combo 5 lá khác nhau bới rác lấy lại lá {cardToRevive.Name}!");
        }

        // Bỏ các lá bài đã dùng vào Discard Pile
        foreach (var c in cardsToPlay)
        {
            hand.Remove(c);
            state.DiscardPile.Add(c);
        }

        return CheckGameOverOrContinue(room, state, "combo_played", new
        {
            PlayerId = playerId,
            ComboSize = count,
            ExtraData = extraData,
            RoomState = SanitizeStateForBroadcast(room, state)
        });
    }

    private GameActionResult HandleDrawCard(RoomModel room, MythicCardsState state, string playerId)
    {
        if (state.AwaitingDefusePlacement)
        {
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };
        }

        if (state.Deck.Count == 0)
        {
            return new GameActionResult { Success = false, Message = "Bộ bài rút đã hết!" };
        }

        var drawnCard = state.Deck[0];
        state.Deck.RemoveAt(0);

        var player = room.Players.First(p => p.ConnectionId == playerId);
        var hand = state.PlayerHands[playerId];

        if (drawnCard.Type == CardType.ExplodingTrap)
        {
            // Kiểm tra xem có Defuse không
            var defuseCard = hand.FirstOrDefault(c => c.Type == CardType.Defuse);
            if (defuseCard != null)
            {
                hand.Remove(defuseCard);
                state.DiscardPile.Add(defuseCard);
                state.AwaitingDefusePlacement = true;
                state.PendingDefusePlayerId = playerId;
                state.GameLogs.Add($"💣 {player.PlayerName} rút phải BẪY NỔ! Nhưng đã dùng 🛡️ Gỡ Bẫy cứu mạng!");

                return new GameActionResult
                {
                    Success = true,
                    ActionType = "trap_defused_need_placement",
                    Data = new
                    {
                        PlayerId = playerId,
                        PlayerName = player.PlayerName,
                        DeckCount = state.Deck.Count,
                        RoomState = SanitizeStateForBroadcast(room, state)
                    }
                };
            }
            else
            {
                // Bị nổ loại khỏi cuộc chơi
                player.IsAlive = false;
                state.DiscardPile.Add(drawnCard);
                state.GameLogs.Add($"💥 BOOM! {player.PlayerName} rút phải BẪY NỔ và đã BỊ LOẠI khỏi cuộc chơi!");

                var alivePlayers = room.Players.Where(p => p.IsAlive).ToList();
                if (alivePlayers.Count <= 1)
                {
                    var winner = alivePlayers.FirstOrDefault();
                    return new GameActionResult
                    {
                        Success = true,
                        ActionType = "player_exploded",
                        IsGameOver = true,
                        WinnerId = winner?.ConnectionId,
                        WinnerName = winner?.PlayerName,
                        Data = new
                        {
                            PlayerId = playerId,
                            PlayerName = player.PlayerName,
                            RoomState = SanitizeStateForBroadcast(room, state)
                        }
                    };
                }

                AdvanceTurn(room, state);
                return new GameActionResult
                {
                    Success = true,
                    ActionType = "player_exploded",
                    Data = new
                    {
                        PlayerId = playerId,
                        PlayerName = player.PlayerName,
                        RoomState = SanitizeStateForBroadcast(room, state)
                    }
                };
            }
        }
        else
        {
            hand.Add(drawnCard);
            state.GameLogs.Add($"{player.PlayerName} đã rút 1 lá bài.");
            state.TurnsToTake--;

            if (state.TurnsToTake <= 0)
            {
                AdvanceTurn(room, state);
            }

            return new GameActionResult
            {
                Success = true,
                ActionType = "card_drawn",
                Data = new
                {
                    PlayerId = playerId,
                    DrawnCardType = drawnCard.Type.ToString(),
                    RoomState = SanitizeStateForBroadcast(room, state)
                }
            };
        }
    }

    private GameActionResult HandleInsertTrap(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.AwaitingDefusePlacement || state.PendingDefusePlayerId != playerId)
        {
            return new GameActionResult { Success = false, Message = "Không ở trong trạng thái nhét Bẫy" };
        }

        int insertIndex = 0;
        if (payload.TryGetProperty("insertIndex", out var idxProp))
        {
            insertIndex = idxProp.GetInt32();
        }

        insertIndex = Math.Clamp(insertIndex, 0, state.Deck.Count);

        var trapCard = new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Nổ tung và loại người chơi khỏi bàn!", Icon = "💣", Color = "#dc2626" };
        state.Deck.Insert(insertIndex, trapCard);

        state.AwaitingDefusePlacement = false;
        state.PendingDefusePlayerId = null;

        var player = room.Players.First(p => p.ConnectionId == playerId);
        state.GameLogs.Add($"🛡️ {player.PlayerName} đã giấu lại Bẫy Nổ vào bộ bài!");

        state.TurnsToTake--;
        if (state.TurnsToTake <= 0)
        {
            AdvanceTurn(room, state);
        }

        return new GameActionResult
        {
            Success = true,
            ActionType = "trap_reinserted",
            Data = new
            {
                PlayerId = playerId,
                InsertIndex = insertIndex,
                RoomState = SanitizeStateForBroadcast(room, state)
            }
        };
    }

    private void AdvanceTurn(RoomModel room, MythicCardsState state)
    {
        int aliveCount = room.Players.Count(p => p.IsAlive);
        if (aliveCount <= 1) return;

        do
        {
            state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;
        } while (!room.Players[state.CurrentTurnIndex].IsAlive);

        state.TurnsToTake = 1;
    }

    private GameActionResult CheckGameOverOrContinue(RoomModel room, MythicCardsState state, string actionType, object data)
    {
        var alivePlayers = room.Players.Where(p => p.IsAlive).ToList();
        if (alivePlayers.Count <= 1)
        {
            var winner = alivePlayers.FirstOrDefault();
            return new GameActionResult
            {
                Success = true,
                ActionType = actionType,
                IsGameOver = true,
                WinnerId = winner?.ConnectionId,
                WinnerName = winner?.PlayerName,
                Data = data
            };
        }

        return new GameActionResult
        {
            Success = true,
            ActionType = actionType,
            Data = data
        };
    }

    private object SanitizeStateForBroadcast(RoomModel room, MythicCardsState state)
    {
        return new
        {
            DeckCount = state.Deck.Count,
            DiscardPile = state.DiscardPile,
            CurrentTurnPlayerId = room.Players[state.CurrentTurnIndex].ConnectionId,
            CurrentTurnPlayerName = room.Players[state.CurrentTurnIndex].PlayerName,
            TurnsToTake = state.TurnsToTake,
            AwaitingDefusePlacement = state.AwaitingDefusePlacement,
            PendingDefusePlayerId = state.PendingDefusePlayerId,
            GameLogs = state.GameLogs.TakeLast(10).ToList(),
            PlayerCardCounts = state.PlayerHands.ToDictionary(k => k.Key, v => v.Value.Count),
            PlayerHands = state.PlayerHands // Client JS sẽ lọc hoặc hiển thị theo connection ID của mình
        };
    }

    private void ShuffleList<T>(List<T> list)
    {
        int n = list.Count;
        while (n > 1)
        {
            n--;
            int k = _random.Next(n + 1);
            (list[k], list[n]) = (list[n], list[k]);
        }
    }
}
