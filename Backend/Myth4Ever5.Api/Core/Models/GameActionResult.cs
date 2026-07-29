namespace Myth4Ever5.Api.Core.Models;

public class GameActionResult
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public object? Data { get; set; }
    public bool IsGameOver { get; set; } = false;
    public string? WinnerId { get; set; }
    public string? WinnerName { get; set; }
}
