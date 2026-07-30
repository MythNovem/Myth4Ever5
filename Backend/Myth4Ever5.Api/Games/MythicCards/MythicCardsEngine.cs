namespace Myth4Ever5.Api.Games.MythicCards;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Handlers;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// MythicCards game engine — orchestrates game flow.
/// All business logic is delegated to focused handler classes.
/// To add a new action: create a new IGameActionHandler and add it to the _handlers dict.
/// </summary>
public class MythicCardsEngine : IGameEngine
{
    public string GameTypeId  => "mythic_cards";
    public string GameName    => "Mythic Cards: Trap & Survive";
    public int    MinPlayers  => 2;
    public int    MaxPlayers  => 4;

    private readonly MythicCardsContext _ctx;
    private readonly MythicCardsDeckBuilder _deckBuilder;
    private readonly Dictionary<string, Func<RoomModel, MythicCardsState, string, JsonElement, GameActionResult>> _handlers;

    public MythicCardsEngine()
    {
        _ctx        = new MythicCardsContext();
        _deckBuilder = new MythicCardsDeckBuilder();

        // Build handler map — each entry owns exactly one action type (Open/Closed principle)
        var playCardHandler = new PlayCardHandler(_ctx);
        var handlers = new List<(string action, Func<RoomModel, MythicCardsState, string, JsonElement, GameActionResult> fn)>
        {
            ("play_card",              playCardHandler.Handle),
            ("draw_card",              new DrawCardHandler(_ctx).Handle),
            ("insert_trap",            new InsertTrapHandler(_ctx).Handle),
            ("reorder_hand",           new ReorderHandHandler(_ctx).Handle),
            ("rearrange_future",       new RearrangeFutureHandler(_ctx).Handle),
            ("surrender",              new SurrenderHandler(_ctx).Handle),
            ("resolve_pending_action", new ResolvePendingActionHandler(_ctx, playCardHandler).Handle),
            ("resolve_exploding_timer",new ExplodingTimerHandler(_ctx).Handle),
            ("give_favor_card",        new FavorHandler(_ctx).Handle),
        };

        _handlers = handlers.ToDictionary(h => h.action, h => h.fn);
    }

    // ─── IGameEngine ────────────────────────────────────────────────────────────

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new MythicCardsState();
        _deckBuilder.Initialize(room, state);

        state.CurrentTurnIndex = new Random().Next(0, room.Players.Count);
        state.TurnsToTake = 1;
        state.GameLogs.Add($"Bắt đầu game! Người chơi {room.Players[state.CurrentTurnIndex].PlayerName} đi trước.");

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not MythicCardsState state)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Game state không hợp lệ" });

        if (!state.PlayerHands.TryGetValue(playerId, out _))
            return Task.FromResult(new GameActionResult { Success = false, Message = "Không tìm thấy tay bài của bạn" });

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        bool isMyTurn = currentPlayer.PlayerId == playerId;

        // Actions allowed regardless of turn
        bool isAllowedOutOfTurn = actionType is "insert_trap" or "surrender" or "reorder_hand"
                                            or "resolve_pending_action" or "resolve_exploding_timer"
                                            or "play_card" or "give_favor_card" or "rearrange_future";

        if (!isMyTurn && !isAllowedOutOfTurn)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });

        if (!currentPlayer.IsAlive)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Bạn đã bị loại!" });

        if (!_handlers.TryGetValue(actionType, out var handler))
            return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ" });

        return Task.FromResult(handler(room, state, playerId, payload));
    }

    public object SanitizeStateForBroadcast(RoomModel room, object genericState)
    {
        return genericState is MythicCardsState state
            ? _ctx.SanitizeState(room, state)
            : new { };
    }
}
