namespace Myth4Ever5.Api.Games.MythicCards.Models;

public class MythicCardsState
{
    public List<CardModel> Deck { get; set; } = new();
    public List<CardModel> DiscardPile { get; set; } = new();
    public Dictionary<string, List<CardModel>> PlayerHands { get; set; } = new();
    public int CurrentTurnIndex { get; set; } = 0;
    public int TurnsToTake { get; set; } = 1; // Số lượt cần rút bài trong turn này (nếu bị Attack thì > 1)
    public List<string> GameLogs { get; set; } = new();
    public bool AwaitingDefusePlacement { get; set; } = false;
    public string? PendingDefusePlayerId { get; set; }
}
