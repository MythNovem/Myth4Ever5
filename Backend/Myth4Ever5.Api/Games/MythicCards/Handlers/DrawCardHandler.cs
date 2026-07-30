namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Handles the "draw_card" action — draws top card, triggers bomb if ExplodingTrap.
/// </summary>
public class DrawCardHandler : IGameActionHandler<MythicCardsState>
{
    public string ActionType => "draw_card";

    private readonly MythicCardsContext _ctx;
    public DrawCardHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Handle(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        // Guard: locked during bomb
        if (state.IsExploding && state.ExplodingPlayerId == playerId)
            return new GameActionResult { Success = false, Message = "Bạn đang dính Bẫy Nổ! Hãy dùng lá Gỡ Bẫy trước!" };

        if (state.AwaitingDefusePlacement)
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };

        if (state.Deck.Count == 0)
            return new GameActionResult { Success = false, Message = "Bộ bài rút đã hết!" };

        var drawnCard = state.Deck[0];
        state.Deck.RemoveAt(0);

        return ProcessDrawn(room, state, playerId, drawnCard, isFromBottom: false);
    }

    public GameActionResult ProcessDrawn(RoomModel room, MythicCardsState state, string playerId, CardModel drawnCard, bool isFromBottom)
    {
        var player = room.Players.First(p => p.PlayerId == playerId);
        var hand = state.PlayerHands[playerId];

        if (drawnCard.Type == CardType.ExplodingTrap)
        {
            state.IsExploding = true;
            state.ExplodingPlayerId = playerId;
            state.ExplodeExpiryTime = DateTime.UtcNow.AddSeconds(10);
            hand.Add(drawnCard);
            state.GameLogs.Add($"💣 BÁO ĐỘNG! {player.PlayerName} rút phải BẪY NỔ{(isFromBottom ? " từ dưới đáy" : "")}! Có 10 giây để Gỡ Bẫy!");

            return new GameActionResult
            {
                Success = true,
                ActionType = "player_is_exploding",
                Data = _ctx.SanitizeState(room, state)
            };
        }

        hand.Add(drawnCard);
        state.GameLogs.Add($"{player.PlayerName} đã rút 1 lá bài{(isFromBottom ? " từ dưới đáy" : "")}.");
        state.TurnsToTake--;

        if (state.TurnsToTake <= 0)
            _ctx.AdvanceTurn(room, state);

        return new GameActionResult
        {
            Success = true,
            ActionType = "card_drawn",
            Data = new
            {
                PlayerId = playerId,
                DrawnCardType = drawnCard.Type.ToString(),
                RoomState = _ctx.SanitizeState(room, state)
            }
        };
    }
}
