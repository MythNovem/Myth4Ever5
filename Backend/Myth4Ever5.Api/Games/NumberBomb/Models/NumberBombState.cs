namespace Myth4Ever5.Api.Games.NumberBomb.Models;

public class NumberBombState
{
    public int SecretBombNumber { get; set; }
    public int MinRange { get; set; } = 1;
    public int MaxRange { get; set; } = 100;
    public int CurrentTurnIndex { get; set; } = 0;
    public List<string> GameLogs { get; set; } = new();
    public bool IsGameOver { get; set; } = false;
    public bool IsExploding { get; set; } = false;
    public string? ExplodedPlayerId { get; set; }
    public string? WinnerPlayerId { get; set; }
}
