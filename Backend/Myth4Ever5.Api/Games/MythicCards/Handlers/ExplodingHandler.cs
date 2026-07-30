namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>Handles "resolve_exploding_timer" — kills the player who failed to defuse.</summary>
public class ExplodingTimerHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "resolve_exploding_timer";
    private readonly MythicCardsContext _ctx;
    public ExplodingTimerHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.IsExploding || state.ExplodingPlayerId == null)
            return new GameActionResult { Success = false, Message = "Không hợp lệ" };

        var victimId = state.ExplodingPlayerId;
        var player = room.Players.FirstOrDefault(p => p.PlayerId == victimId);
        if (player == null) return new GameActionResult { Success = false, Message = "Lỗi" };

        player.IsAlive = false;
        state.IsExploding = false;
        state.ExplodingPlayerId = null;
        state.ExplodeExpiryTime = null;

        state.GameLogs.Add($"💥 BÙM! {player.PlayerName} đã nổ tung vì không gỡ bẫy kịp thời!");

        state.DiscardPile.AddRange(state.PlayerHands[victimId]);
        state.PlayerHands[victimId].Clear();

        return _ctx.CheckGameOverOrContinue(room, state, "player_exploded", new { playerId = victimId });
    }
}

/// <summary>Handles "insert_trap" — player places the defused bomb back into deck.</summary>
public class InsertTrapHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "insert_trap";
    private readonly MythicCardsContext _ctx;
    public InsertTrapHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.AwaitingDefusePlacement || state.PendingDefusePlayerId != playerId)
            return new GameActionResult { Success = false, Message = "Không ở trong trạng thái nhét Bẫy" };

        int insertIndex = payload.TryGetProperty("insertIndex", out var idxProp) ? idxProp.GetInt32() : 0;
        insertIndex = Math.Clamp(insertIndex, 0, state.Deck.Count);

        var insertCard = state.DiscardPile.FirstOrDefault(c => c.Type == CardType.ExplodingTrap)
                         ?? new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Rút phải là TOANG!", Icon = "💣", Color = "#ef4444" };

        state.DiscardPile.Remove(insertCard);
        state.Deck.Insert(insertIndex, insertCard);
        state.AwaitingDefusePlacement = false;
        state.PendingDefusePlayerId = null;

        var player = room.Players.First(p => p.PlayerId == playerId);
        state.GameLogs.Add($"🛡️ {player.PlayerName} đã giấu lại Bẫy Nổ vào bộ bài!");

        state.TurnsToTake--;
        if (state.TurnsToTake <= 0) _ctx.AdvanceTurn(room, state);

        return new GameActionResult
        {
            Success = true,
            ActionType = "trap_reinserted",
            Data = new { PlayerId = playerId, InsertIndex = insertIndex, RoomState = _ctx.SanitizeState(room, state) }
        };
    }
}
