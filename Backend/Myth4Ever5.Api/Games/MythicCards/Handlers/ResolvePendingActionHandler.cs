namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Handles "resolve_pending_action" — fires the queued card effect or cancels it if Noped.
/// </summary>
public class ResolvePendingActionHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "resolve_pending_action";

    private readonly MythicCardsContext _ctx;
    private readonly PlayCardHandler _playCardHandler;

    public ResolvePendingActionHandler(MythicCardsContext ctx, PlayCardHandler playCardHandler)
    {
        _ctx = ctx;
        _playCardHandler = playCardHandler;
    }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        var pending = state.CurrentPendingAction;
        if (pending == null) return new GameActionResult { Success = false, Message = "Không có hành động chờ xử lý" };

        bool isCancelled = pending.NopeCount % 2 != 0;
        state.CurrentPendingAction = null;

        if (isCancelled)
        {
            state.GameLogs.Add("🛑 Hành động đã bị huỷ bỏ bởi Chặn (Nope)!");
            return new GameActionResult { Success = true, ActionType = "action_noped", Data = _ctx.SanitizeState(room, state) };
        }

        state.GameLogs.Add("✅ Hành động được thông qua.");

        if (!pending.Payload.TryGetProperty("cardIds", out var cardIdsProp))
            return new GameActionResult { Success = false, Message = "Lỗi payload" };

        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        var cardsToPlay = cardIds
            .Select(id => state.DiscardPile.FirstOrDefault(x => x.Id == id))
            .Where(c => c != null)
            .Cast<CardModel>()
            .ToList();

        return _playCardHandler.ExecuteResolved(room, state, pending.SourcePlayerId, cardsToPlay, pending.Payload);
    }
}
