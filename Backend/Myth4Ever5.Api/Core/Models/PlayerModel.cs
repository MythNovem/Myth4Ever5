namespace Myth4Ever5.Api.Core.Models;

public class PlayerModel
{
    public string PlayerId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public bool IsHost { get; set; } = false;
    public bool IsReady { get; set; } = true;
    public bool IsAlive { get; set; } = true;
    public bool IsConnected { get; set; } = true;
    public int Score { get; set; } = 0;
}
