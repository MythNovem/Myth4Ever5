namespace Myth4Ever5.Api.Games.MythicCards;

using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Shared context/utilities for MythicCards handlers.
/// Passed to each handler so they don't need to call engine methods directly.
/// </summary>
public class MythicCardsContext
{
    private readonly Random _random = new();

    public object SanitizeState(RoomModel room, MythicCardsState state)
    {
        CheckAndRefillEmptyHands(room, state);

        return new
        {
            DeckCount = state.Deck.Count,
            DiscardPile = state.DiscardPile,
            CurrentTurnPlayerId = room.Players[state.CurrentTurnIndex].PlayerId,
            CurrentTurnPlayerName = room.Players[state.CurrentTurnIndex].PlayerName,
            TurnsToTake = state.TurnsToTake,
            AwaitingDefusePlacement = state.AwaitingDefusePlacement,
            PendingDefusePlayerId = state.PendingDefusePlayerId,
            GameLogs = state.GameLogs.TakeLast(10).ToList(),
            PlayerCardCounts = state.PlayerHands.ToDictionary(k => k.Key, v => v.Value.Count),
            PlayerHands = state.PlayerHands,

            // Online Mechanics States
            IsExploding = state.IsExploding,
            ExplodingPlayerId = state.ExplodingPlayerId,
            ExplodeExpiryTime = state.ExplodeExpiryTime,
            AwaitingFavorResponse = state.AwaitingFavorResponse,
            PendingFavorSourceId = state.PendingFavorSourceId,
            PendingFavorTargetId = state.PendingFavorTargetId,
            CurrentPendingAction = state.CurrentPendingAction
        };
    }

    public void CheckAndRefillEmptyHands(RoomModel room, MythicCardsState state)
    {
        if (room == null || state == null || room.Players == null) return;

        foreach (var player in room.Players)
        {
            if (!player.IsAlive) continue;

            if (!state.PlayerHands.TryGetValue(player.PlayerId, out var hand) || hand == null)
            {
                hand = new List<CardModel>();
                state.PlayerHands[player.PlayerId] = hand;
            }

            if (hand.Count == 0)
            {
                int countToDraw = Math.Min(5, state.Deck.Count);
                if (countToDraw > 0)
                {
                    state.GameLogs.Add($"🃏 {player.PlayerName} không còn lá nào trên tay nên được tự động rút bù {countToDraw} lá!");
                    for (int i = 0; i < countToDraw; i++)
                    {
                        if (state.Deck.Count == 0) break;
                        var card = state.Deck[0];
                        state.Deck.RemoveAt(0);

                        hand.Add(card);

                        if (card.Type == CardType.ExplodingTrap)
                        {
                            state.IsExploding = true;
                            state.ExplodingPlayerId = player.PlayerId;
                            state.ExplodeExpiryTime = DateTime.UtcNow.AddSeconds(10);
                            state.GameLogs.Add($"💣 BÁO ĐỘNG! {player.PlayerName} rút phải BẪY NỔ khi rút bù bài!");
                            break;
                        }
                    }
                }
            }
        }
    }

    public GameActionResult CheckGameOverOrContinue(RoomModel room, MythicCardsState state, string actionType, object data)
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
                WinnerId = winner?.PlayerId,
                WinnerName = winner?.PlayerName,
                Data = data
            };
        }
        return new GameActionResult { Success = true, ActionType = actionType, Data = data };
    }

    public void AdvanceTurn(RoomModel room, MythicCardsState state)
    {
        int aliveCount = room.Players.Count(p => p.IsAlive);
        if (aliveCount <= 1) return;
        do
        {
            state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;
        } while (!room.Players[state.CurrentTurnIndex].IsAlive);
        state.TurnsToTake = 1;
    }

    public void ShuffleList<T>(List<T> list)
    {
        int n = list.Count;
        while (n > 1)
        {
            n--;
            int k = _random.Next(n + 1);
            (list[k], list[n]) = (list[n], list[k]);
        }
    }

    public bool IsNormalCard(CardType type) =>
        type == CardType.Normal1 || type == CardType.Normal2 || type == CardType.Normal3
        || type == CardType.Normal4 || type == CardType.Normal5;

    public int RandomInt(int maxExclusive) => _random.Next(maxExclusive);
}
