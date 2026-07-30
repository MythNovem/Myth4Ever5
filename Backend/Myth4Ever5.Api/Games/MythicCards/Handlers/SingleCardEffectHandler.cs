namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Executes the effect of a single (non-combo) card after Nope window resolves.
/// </summary>
public class SingleCardEffectHandler
{
    private readonly MythicCardsContext _ctx;
    public SingleCardEffectHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Execute(RoomModel room, MythicCardsState state, string playerId, CardModel card, JsonElement payload)
    {
        var hand = state.PlayerHands[playerId];
        object? extraData = null;

        switch (card.Type)
        {
            case CardType.Skip:
                state.TurnsToTake--;
                if (state.TurnsToTake <= 0) _ctx.AdvanceTurn(room, state);
                break;

            case CardType.Attack:
                _ctx.AdvanceTurn(room, state);
                state.TurnsToTake = 2;
                break;

            case CardType.SeeFuture:
                extraData = new { FutureCards = state.Deck.Take(3).ToList() };
                break;

            case CardType.Shuffle:
                _ctx.ShuffleList(state.Deck);
                break;

            case CardType.Steal:
                var stealInfo = HandleSteal(room, state, playerId, hand, payload);
                if (stealInfo != null)
                {
                    return _ctx.CheckGameOverOrContinue(room, state, "card_stolen", new
                    {
                        StealInfo = stealInfo,
                        RoomState = _ctx.SanitizeState(room, state)
                    });
                }
                break;

            case CardType.TargetedAttack:
                HandleTargetedAttack(room, state, playerId, payload);
                break;

            case CardType.DrawBottom:
                if (state.Deck.Count > 0)
                {
                    var bottomCard = state.Deck.Last();
                    state.Deck.RemoveAt(state.Deck.Count - 1);
                    var drawHandler = new DrawCardHandler(_ctx);
                    return drawHandler.ProcessDrawn(room, state, playerId, bottomCard, isFromBottom: true);
                }
                break;

            case CardType.AlterFuture:
                extraData = new { FutureCards = state.Deck.Take(3).ToList(), IsAlter = true };
                break;

            case CardType.Favor:
                HandleFavor(room, state, playerId, payload);
                break;
        }

        return _ctx.CheckGameOverOrContinue(room, state, "card_played", new
        {
            PlayerId = playerId,
            Card = card,
            ExtraData = extraData,
            RoomState = _ctx.SanitizeState(room, state)
        });
    }

    private object? HandleSteal(RoomModel room, MythicCardsState state, string playerId, List<CardModel> hand, JsonElement payload)
    {
        string targetId = payload.TryGetProperty("targetPlayerId", out var tp) ? tp.GetString() ?? "" : "";
        int targetCardIndex = payload.TryGetProperty("targetCardIndex", out var ti) && ti.ValueKind == JsonValueKind.Number ? ti.GetInt32() : -1;

        var aliveTargets = room.Players.Where(p => p.PlayerId != playerId && p.IsAlive && state.PlayerHands[p.PlayerId].Count > 0).ToList();
        if (aliveTargets.Count == 0) return null;

        var target = aliveTargets.FirstOrDefault(p => p.PlayerId == targetId) ?? aliveTargets[_ctx.RandomInt(aliveTargets.Count)];
        var targetHand = state.PlayerHands[target.PlayerId];
        int stealIdx = (targetCardIndex >= 0 && targetCardIndex < targetHand.Count) ? targetCardIndex : _ctx.RandomInt(targetHand.Count);

        var stolen = targetHand[stealIdx];
        targetHand.RemoveAt(stealIdx);
        hand.Add(stolen);

        var robberName = room.Players.First(p => p.PlayerId == playerId).PlayerName;
        state.GameLogs.Add($"🎁 {robberName} đã cướp 1 lá bài của {target.PlayerName}!");

        return new
        {
            RobberId = playerId,
            RobberName = robberName,
            VictimId = target.PlayerId,
            VictimName = target.PlayerName,
            StolenCard = stolen
        };
    }

    private void HandleTargetedAttack(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        string taTargetId = payload.TryGetProperty("targetPlayerId", out var taProp) ? taProp.GetString() ?? "" : "";
        var taTargetIndex = room.Players.FindIndex(p => p.PlayerId == taTargetId && p.IsAlive);
        if (taTargetIndex >= 0)
        {
            state.CurrentTurnIndex = taTargetIndex;
            state.TurnsToTake = 2;
            state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã 🎯 Ám Sát {room.Players[taTargetIndex].PlayerName}, bắt phải đi 2 lượt!");
        }
        else
        {
            _ctx.AdvanceTurn(room, state);
            state.TurnsToTake = 2;
        }
    }

    private void HandleFavor(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        string favorTargetId = payload.TryGetProperty("targetPlayerId", out var ftProp) ? ftProp.GetString() ?? "" : "";
        var fTarget = room.Players.FirstOrDefault(p => p.PlayerId == favorTargetId && p.IsAlive && p.PlayerId != playerId);
        if (fTarget != null && state.PlayerHands[fTarget.PlayerId].Count > 0)
        {
            state.AwaitingFavorResponse = true;
            state.PendingFavorSourceId = playerId;
            state.PendingFavorTargetId = fTarget.PlayerId;
            state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã Xin Xỏ {fTarget.PlayerName}. Đang chờ chọn bài...");
        }
        else
        {
            state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã Xin Xỏ nhưng mục tiêu không hợp lệ hoặc hết bài!");
        }
    }
}
