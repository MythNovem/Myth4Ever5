namespace Myth4Ever5.Api.Games.MythicCards.Handlers;

using System.Text.Json;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Executes combo (2/3/5-card) effects after the Nope window resolves.
/// </summary>
public class ComboCardEffectHandler
{
    private readonly MythicCardsContext _ctx;
    public ComboCardEffectHandler(MythicCardsContext ctx) { _ctx = ctx; }

    public GameActionResult Execute(RoomModel room, MythicCardsState state, string playerId, List<CardModel> cardsToPlay, JsonElement payload)
    {
        int count = cardsToPlay.Count;
        var hand = state.PlayerHands[playerId];
        var player = room.Players.First(p => p.PlayerId == playerId);

        bool isPair    = count == 2 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isThree   = count == 3 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isFiveDiff = count == 5 && cardsToPlay.Select(c => c.Type).Distinct().Count() == 5;

        if (!isPair && !isThree && !isFiveDiff)
            return new GameActionResult { Success = false, Message = "Combo không hợp lệ!" };

        if (isPair || isThree)
        {
            string targetId = payload.TryGetProperty("targetPlayerId", out var tp) ? tp.GetString() ?? "" : "";
            var target = room.Players.FirstOrDefault(p => p.PlayerId == targetId && p.IsAlive && p.PlayerId != playerId);
            if (target == null) return new GameActionResult { Success = false, Message = "Mục tiêu không hợp lệ hoặc đã bị loại!" };

            var targetHand = state.PlayerHands[target.PlayerId];

            if (isPair)
            {
                if (targetHand.Count > 0)
                {
                    var stolen = targetHand[_ctx.RandomInt(targetHand.Count)];
                    targetHand.Remove(stolen);
                    hand.Add(stolen);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá cướp 1 lá bài của {target.PlayerName}!");
                }
                else state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá nhắm vào {target.PlayerName} nhưng họ không còn bài!");
            }
            else // isThree
            {
                string typeStr = payload.TryGetProperty("targetCardType", out var typeProp) ? typeProp.GetString() ?? "" : "";
                if (!Enum.TryParse<CardType>(typeStr, out var requestedType))
                    return new GameActionResult { Success = false, Message = "Loại bài yêu cầu không hợp lệ!" };

                var cardToGive = targetHand.FirstOrDefault(c => c.Type == requestedType);
                if (cardToGive != null)
                {
                    targetHand.Remove(cardToGive);
                    hand.Add(cardToGive);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} và THÀNH CÔNG!");
                }
                else state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} nhưng THẤT BẠI (không có)!");
            }
        }
        else // isFiveDiff
        {
            string targetCardId = payload.TryGetProperty("targetCardIdFromDiscard", out var dp) ? dp.GetString() ?? "" : "";
            var cardToRevive = state.DiscardPile.FirstOrDefault(c => c.Id == targetCardId);
            if (cardToRevive == null) return new GameActionResult { Success = false, Message = "Lá bài muốn lấy không có trong Discard Pile!" };

            state.DiscardPile.Remove(cardToRevive);
            hand.Add(cardToRevive);
            state.GameLogs.Add($"{player.PlayerName} dùng Combo 5 lá khác nhau bới rác lấy lại lá {cardToRevive.Name}!");
        }

        // Move played cards to discard
        foreach (var c in cardsToPlay) { hand.Remove(c); state.DiscardPile.Add(c); }

        return _ctx.CheckGameOverOrContinue(room, state, "combo_played", new
        {
            PlayerId = playerId,
            ComboSize = count,
            RoomState = _ctx.SanitizeState(room, state)
        });
    }
}
