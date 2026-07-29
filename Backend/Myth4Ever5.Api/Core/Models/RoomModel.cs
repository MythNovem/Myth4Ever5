namespace Myth4Ever5.Api.Core.Models;

public class RoomModel
{
    public string RoomCode { get; set; } = string.Empty;
    public string HostConnectionId { get; set; } = string.Empty;
    public List<PlayerModel> Players { get; set; } = new();
    public string SelectedGameTypeId { get; set; } = "mythic_cards";
    public bool IsGameStarted { get; set; } = false;
    public object? GameState { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
