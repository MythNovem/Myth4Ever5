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
    
    // Đếm ngược bom nổ
    public bool IsExploding { get; set; } = false;
    public string? ExplodingPlayerId { get; set; }
    public DateTime? ExplodeExpiryTime { get; set; }

    // Chờ Xin Xỏ
    public bool AwaitingFavorResponse { get; set; } = false;
    public string? PendingFavorSourceId { get; set; }
    public string? PendingFavorTargetId { get; set; }

    public PendingAction? CurrentPendingAction { get; set; }
}

public class PendingAction
{
    public string SourcePlayerId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty; // e.g. "play_card", "favor"
    public System.Text.Json.JsonElement Payload { get; set; }
    public int NopeCount { get; set; } = 0;
    public DateTime ExpiryTime { get; set; }
    public string TargetPlayerId { get; set; } = string.Empty; // For Favor
    public string CardNames { get; set; } = string.Empty;
    public string LastActionPlayerId { get; set; } = string.Empty;
}

