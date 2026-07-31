namespace Myth4Ever5.Api.Games.MythicRacer.Models;

public class Vector2D
{
    public float X { get; set; }
    public float Y { get; set; }

    public Vector2D() { }
    public Vector2D(float x, float y)
    {
        X = x;
        Y = y;
    }
}

public class CheckpointModel
{
    public int Index { get; set; }
    public Vector2D Center { get; set; } = new();
    public float Radius { get; set; } = 90f;
}

public class CarSpawnPoint
{
    public Vector2D Position { get; set; } = new();
    public float Angle { get; set; } = 0;
}

public class TrackDefinition
{
    public string TrackId { get; set; } = "f1_monaco";
    public string TrackName { get; set; } = "🏎️ Đường Đua F1 Grand Prix";
    public int CanvasWidth { get; set; } = 1400;
    public int CanvasHeight { get; set; } = 900;
    public float TrackWidth { get; set; } = 120f; // Road width

    // Waypoints forming the center-line loop of the race track
    public List<Vector2D> Waypoints { get; set; } = new();

    // Key checkpoints to track lap progress & validate direction
    public List<CheckpointModel> Checkpoints { get; set; } = new();

    // 🎁 Item box spawn coordinates
    public List<Vector2D> ItemBoxLocations { get; set; } = new();

    // Starting grid positions (4 cars)
    public List<CarSpawnPoint> GridStartPositions { get; set; } = new();
}
