namespace Myth4Ever5.Api.Games.HexaHive.Models;

public class HexaHiveState
{
    // Board representation: key is "q,r", value is stack of pieces (ground at index 0, top at index Count-1)
    public Dictionary<string, List<HivePiece>> Board { get; set; } = new();

    // Player hands: PlayerId -> List of pieces left to place
    public Dictionary<string, List<HivePiece>> UnplacedHands { get; set; } = new();

    // Queen placed status: PlayerId -> bool
    public Dictionary<string, bool> QueenPlaced { get; set; } = new();

    public int TurnNumber { get; set; } = 1;
    public int CurrentTurnIndex { get; set; } = 0;
    public bool IsExpansionEnabled { get; set; } = true;

    public List<string> GameLogs { get; set; } = new();
    public string? WinnerPlayerId { get; set; }
    public string? WinnerName { get; set; }
    public bool IsDraw { get; set; }

    // Pillbug restrictions
    public string? LastMovedPieceId { get; set; }
    public string? ImmobilePieceId { get; set; }
}
