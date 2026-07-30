namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>Handles "give_favor_card" — target player gives a card to the Favor requester.</summary>
public class FavorHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "give_favor_card";
    private readonly MythicCardsContext _ctx;
    public FavorHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.AwaitingFavorResponse || state.PendingFavorTargetId != playerId)
            return new GameActionResult { Success = false, Message = "Không có ai xin xỏ bạn cả!" };

        if (!payload.TryGetProperty("cardId", out var cardIdProp))
            return new GameActionResult { Success = false, Message = "Chưa chọn bài" };

        string cardId = cardIdProp.GetString() ?? "";
        var hand = state.PlayerHands[playerId];
        var card = hand.FirstOrDefault(c => c.Id == cardId);
        if (card == null) return new GameActionResult { Success = false, Message = "Lá bài không tồn tại trên tay" };

        var sourceId = state.PendingFavorSourceId!;
        hand.Remove(card);
        state.PlayerHands[sourceId].Add(card);

        state.AwaitingFavorResponse = false;
        state.PendingFavorSourceId = null;
        state.PendingFavorTargetId = null;

        var targetName = room.Players.First(p => p.PlayerId == playerId).PlayerName;
        var sourceName = room.Players.First(p => p.PlayerId == sourceId).PlayerName;
        state.GameLogs.Add($"{targetName} đã cho {sourceName} 1 lá bài theo yêu cầu Xin Xỏ.");

        return new GameActionResult { Success = true, ActionType = "favor_resolved", Data = _ctx.SanitizeState(room, state) };
    }
}

/// <summary>Handles "surrender" — player concedes and is removed from the game.</summary>
public class SurrenderHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "surrender";
    private readonly MythicCardsContext _ctx;
    public SurrenderHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        var victim = room.Players.First(p => p.PlayerId == playerId);
        victim.IsAlive = false;

        state.DiscardPile.AddRange(state.PlayerHands[playerId]);
        state.PlayerHands[playerId].Clear();
        state.GameLogs.Add($"🏳️ {victim.PlayerName} đã đầu hàng và rời phòng!");

        if (room.Players[state.CurrentTurnIndex].PlayerId == playerId)
            _ctx.AdvanceTurn(room, state);

        return _ctx.CheckGameOverOrContinue(room, state, "player_surrendered", new { surrenderedPlayerId = playerId });
    }
}

/// <summary>Handles "reorder_hand" — player rearranges their hand cards.</summary>
public class ReorderHandHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "reorder_hand";
    private readonly MythicCardsContext _ctx;
    public ReorderHandHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!payload.TryGetProperty("cardIds", out var cardIdsProp))
            return new GameActionResult { Success = false, Message = "Invalid reorder payload" };

        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        var hand = state.PlayerHands[playerId];

        if (cardIds.Count != hand.Count)
            return new GameActionResult { Success = false, Message = "Invalid reorder payload" };

        var newHand = cardIds.Select(id => hand.FirstOrDefault(c => c.Id == id)).Where(c => c != null).Cast<CardModel>().ToList();
        if (newHand.Count != hand.Count)
            return new GameActionResult { Success = false, Message = "Invalid reorder payload" };

        state.PlayerHands[playerId] = newHand;
        return new GameActionResult { Success = true, ActionType = "reorder_hand", Data = _ctx.SanitizeState(room, state) };
    }
}

/// <summary>Handles "rearrange_future" — player reorders top 3 deck cards after AlterFuture.</summary>
public class RearrangeFutureHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "rearrange_future";
    private readonly MythicCardsContext _ctx;
    public RearrangeFutureHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!payload.TryGetProperty("newOrderIds", out var newOrderProp))
            return new GameActionResult { Success = false, Message = "Thiếu newOrderIds" };

        var newOrderIds = newOrderProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        var topCards = state.Deck.Take(newOrderIds.Count).ToList();

        if (newOrderIds.Count != topCards.Count)
            return new GameActionResult { Success = false, Message = "Số lượng bài sắp xếp không hợp lệ" };

        var newTopCards = newOrderIds.Select(id => topCards.FirstOrDefault(c => c.Id == id)).Where(c => c != null).Cast<CardModel>().ToList();
        if (newTopCards.Count != topCards.Count)
            return new GameActionResult { Success = false, Message = "Có ID không nằm trong top 3" };

        for (int i = 0; i < newTopCards.Count; i++) state.Deck[i] = newTopCards[i];

        var player = room.Players.First(p => p.PlayerId == playerId);
        state.GameLogs.Add($"🔮 {player.PlayerName} đã dùng phép Đổi Tương Lai thay đổi trật tự bộ bài!");

        return new GameActionResult
        {
            Success = true,
            ActionType = "future_rearranged",
            Data = new { PlayerId = playerId, RoomState = _ctx.SanitizeState(room, state) }
        };
    }
}
