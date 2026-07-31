namespace Myth4Ever5.Api.Games.MythicRacer.Services;

using Myth4Ever5.Api.Games.MythicRacer.Models;

public static class TrackRegistry
{
    private static readonly Dictionary<string, TrackDefinition> _tracks = new();

    static TrackRegistry()
    {
        RegisterF1GrandPrix();
    }

    public static TrackDefinition GetTrack(string trackId)
    {
        if (_tracks.TryGetValue(trackId, out var track))
        {
            return track;
        }
        return _tracks["f1_monaco"];
    }

    private static void RegisterF1GrandPrix()
    {
        var track = new TrackDefinition
        {
            TrackId = "f1_monaco",
            TrackName = "🏎️ Đường Đua F1 Night Grand Prix",
            CanvasWidth = 1400,
            CanvasHeight = 900,
            TrackWidth = 95, // Tighter track width for higher driving precision

            // Smooth 22-Waypoint Technical F1 Circuit (Main straight -> Hairpin 1 -> Chicane S-curve -> Hairpin 2 -> Final Curve)
            Waypoints = new List<Vector2D>
            {
                // Main Straight (Bottom: Left to Right)
                new Vector2D(250, 760),  // [Idx 0] Start/Finish Line
                new Vector2D(500, 760),
                new Vector2D(750, 760),
                new Vector2D(1000, 760), // Main Straight Speed Trap

                // Turn 1: High-Speed Right Curve into East Loop
                new Vector2D(1180, 720),
                new Vector2D(1280, 600),
                new Vector2D(1280, 450), // East Hairpin 180°
                new Vector2D(1180, 340),
                new Vector2D(1020, 320),

                // Technical Chicane S-Bends (Center)
                new Vector2D(880, 380),
                new Vector2D(750, 480),  // Chicane Apex 1
                new Vector2D(620, 480),
                new Vector2D(500, 360),  // Chicane Apex 2
                new Vector2D(420, 260),

                // Top West Loop & Hairpin 2
                new Vector2D(300, 200),
                new Vector2D(180, 250),  // Top Left Hairpin
                new Vector2D(140, 400),
                new Vector2D(140, 560),
                new Vector2D(180, 680),  // Final Curve Entry
                new Vector2D(250, 760)   // Back to Finish Line
            },

            // 5 Strict Checkpoints (Tighter 65px Radius to prevent premature trigger)
            Checkpoints = new List<CheckpointModel>
            {
                new CheckpointModel { Index = 0, Center = new Vector2D(250, 760), Radius = 65 }, // Start/Finish Line
                new CheckpointModel { Index = 1, Center = new Vector2D(1000, 760), Radius = 65 }, // Turn 1 Entry
                new CheckpointModel { Index = 2, Center = new Vector2D(1280, 450), Radius = 65 }, // East Hairpin Apex
                new CheckpointModel { Index = 3, Center = new Vector2D(750, 480), Radius = 65 },  // Chicane S-Curve Center
                new CheckpointModel { Index = 4, Center = new Vector2D(140, 400), Radius = 65 }   // West Loop Apex
            },

            // 🎁 Item Box Locations (6 strategic pickup spots)
            ItemBoxLocations = new List<Vector2D>
            {
                new Vector2D(600, 760),
                new Vector2D(1280, 520),
                new Vector2D(810, 430),
                new Vector2D(460, 300),
                new Vector2D(220, 210),
                new Vector2D(150, 620)
            },

            // 4 Grid Start Positions (Positioned 70px AFTER Checkpoint 0 to prevent early lap trigger)
            GridStartPositions = new List<CarSpawnPoint>
            {
                new CarSpawnPoint { Position = new Vector2D(340, 735), Angle = 0 }, // Car 1 (Red)
                new CarSpawnPoint { Position = new Vector2D(340, 785), Angle = 0 }, // Car 2 (Blue)
                new CarSpawnPoint { Position = new Vector2D(280, 735), Angle = 0 }, // Car 3 (Green)
                new CarSpawnPoint { Position = new Vector2D(280, 785), Angle = 0 }  // Car 4 (Yellow)
            }
        };

        _tracks[track.TrackId] = track;
    }
}
