namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Handles "play_card" action — validates card plays, Nope counters, Defuse, and Pending actions.
/// Delegates single-card and combo execution to sub-handlers.
/// </summary>
public class PlayCardHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "play_card";

    private readonly MythicCardsContext _ctx;
    private readonly SingleCardEffectHandler _singleCardHandler;
    private readonly ComboCardEffectHandler _comboHandler;

    public PlayCardHandler(MythicCardsContext ctx)
    {
        _ctx = ctx;
        _singleCardHandler = new SingleCardEffectHandler(ctx);
        _comboHandler = new ComboCardEffectHandler(ctx);
    }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (state.AwaitingDefusePlacement)
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };

        if (!payload.TryGetProperty("cardIds", out var cardIdsProp))
            return new GameActionResult { Success = false, Message = "Thiếu cardIds" };

        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        if (cardIds.Count == 0)
            return new GameActionResult { Success = false, Message = "Chưa chọn lá bài nào" };

        var hand = state.PlayerHands[playerId];
        var cardsToPlay = new List<CardModel>();
        foreach (var id in cardIds)
        {
            var c = hand.FirstOrDefault(x => x.Id == id);
            if (c == null) return new GameActionResult { Success = false, Message = "Lá bài không tồn tại trên tay" };
            cardsToPlay.Add(c);
        }

        if (cardsToPlay.Any(c => c.Type == CardType.ExplodingTrap))
            return new GameActionResult { Success = false, Message = "Không thể tự ý đánh Bẫy Nổ!" };

        if (cardsToPlay.Any(c => c.Type == CardType.Defuse) && !state.IsExploding)
            return new GameActionResult { Success = false, Message = "Chỉ được dùng Gỡ Bẫy khi đang dính bom!" };

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        bool isNope = cardsToPlay.Count == 1 && cardsToPlay[0].Type == CardType.Nope;

        if (currentPlayer.PlayerId != playerId && !isNope)
            return new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn, chỉ có thể đánh Chặn (Nope)!" };

        // ─── NOPE ───
        if (isNope)
        {
            if (state.CurrentPendingAction == null)
                return new GameActionResult { Success = false, Message = "Không có hành động nào đang chờ để Chặn!" };

            if (state.CurrentPendingAction.SourcePlayerId == playerId)
                return new GameActionResult { Success = false, Message = "Bạn không thể tự chặn bài của chính mình!" };

            var nopeCard = cardsToPlay[0];
            hand.Remove(nopeCard);
            state.DiscardPile.Add(nopeCard);

            state.CurrentPendingAction.NopeCount++;
            state.CurrentPendingAction.ExpiryTime = DateTime.UtcNow.AddSeconds(10);

            string nopeType = state.CurrentPendingAction.NopeCount % 2 == 1 ? "🛑 CHẶN (NOPE)!" : "✅ YUP! (CHẶN LẠI CHẶN)";
            state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã ném {nopeType}");

            return new GameActionResult { Success = true, ActionType = "play_card", Data = _ctx.SanitizeState(room, state) };
        }

        // ─── Pending guard ───
        if (state.CurrentPendingAction != null)
            return new GameActionResult { Success = false, Message = "Đang chờ phân xử hành động trước đó!" };

        // ─── DEFUSE ───
        if (cardsToPlay.Count == 1 && cardsToPlay[0].Type == CardType.Defuse)
        {
            if (!state.IsExploding || state.ExplodingPlayerId != playerId)
                return new GameActionResult { Success = false, Message = "Bạn không bị nổ, không thể gỡ bẫy!" };

            hand.Remove(cardsToPlay[0]);
            state.DiscardPile.Add(cardsToPlay[0]);

            var trap = hand.FirstOrDefault(c => c.Type == CardType.ExplodingTrap);
            if (trap != null) hand.Remove(trap);

            state.IsExploding = false;
            state.ExplodingPlayerId = null;
            state.ExplodeExpiryTime = null;
            state.AwaitingDefusePlacement = true;
            state.PendingDefusePlayerId = playerId;
            state.GameLogs.Add($"🛡️ {room.Players.First(p => p.PlayerId == playerId).PlayerName} đã dùng Gỡ Bẫy kịp thời!");

            return new GameActionResult
            {
                Success = true,
                ActionType = "trap_defused_need_placement",
                Data = new
                {
                    PlayerId = playerId,
                    PlayerName = room.Players.First(p => p.PlayerId == playerId).PlayerName,
                    DeckCount = state.Deck.Count,
                    RoomState = _ctx.SanitizeState(room, state)
                }
            };
        }

        // ─── Single normal card guard ───
        if (cardsToPlay.Count == 1 && _ctx.IsNormalCard(cardsToPlay[0].Type))
            return new GameActionResult { Success = false, Message = "Bài thường phải đánh theo bộ, không được đánh lẻ!" };

        // ─── Validate combo ───
        if (cardsToPlay.Count > 1)
        {
            bool isPair    = cardsToPlay.Count == 2 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
            bool isThree   = cardsToPlay.Count == 3 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
            bool isFiveDiff = cardsToPlay.Count == 5 && cardsToPlay.Select(c => c.Type).Distinct().Count() == 5;

            if (!isPair && !isThree && !isFiveDiff)
                return new GameActionResult { Success = false, Message = "Combo không hợp lệ! Chỉ được đánh 2 lá giống nhau, 3 lá giống nhau, hoặc 5 lá khác nhau." };
        }

        // Move cards to discard
        foreach (var c in cardsToPlay)
        {
            hand.Remove(c);
            state.DiscardPile.Add(c);
        }

        state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã sử dụng {string.Join(", ", cardsToPlay.Select(c => c.Name))}");

        string cardNamesStr = string.Join(", ", cardsToPlay.Select(c => $"{c.Name} {c.Icon}".Trim()));

        // Queue as pending (awaiting Nope window)
        state.CurrentPendingAction = new PendingAction
        {
            SourcePlayerId = playerId,
            ActionType = "play_card",
            Payload = payload,
            ExpiryTime = DateTime.UtcNow.AddSeconds(10),
            NopeCount = 0,
            CardNames = cardNamesStr
        };

        return new GameActionResult { Success = true, ActionType = "play_card", Data = _ctx.SanitizeState(room, state) };
    }

    /// <summary>Called by ResolvePendingActionHandler after Nope window expires.</summary>
    public GameActionResult ExecuteResolved(RoomModel room, MythicCardsState state, string playerId, List<CardModel> cardsToPlay, JsonElement payload)
    {
        if (cardsToPlay.Count == 1)
            return _singleCardHandler.Execute(room, state, playerId, cardsToPlay[0], payload);

        return _comboHandler.Execute(room, state, playerId, cardsToPlay, payload);
    }
}
