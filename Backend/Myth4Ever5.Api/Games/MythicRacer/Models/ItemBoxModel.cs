namespace Myth4Ever5.Api.Games.MythicRacer.Models;

public class ItemBoxModel
{
    public int Id { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
    public bool IsActive { get; set; } = true;
    public float RespawnTimer { get; set; } = 0;
}

public class DroppedItemModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ItemType { get; set; } = "banana"; // banana, bomb
    public string OwnerId { get; set; } = string.Empty;
    public float X { get; set; }
    public float Y { get; set; }
    public float Radius { get; set; } = 25f;
}

public class RocketModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string OwnerId { get; set; } = string.Empty;
    public string TargetPlayerId { get; set; } = string.Empty;
    public float X { get; set; }
    public float Y { get; set; }
    public float Angle { get; set; } = 0;
    public float Speed { get; set; } = 12f;
    public float Lifetime { get; set; } = 6f; // Expires in 6s
}
