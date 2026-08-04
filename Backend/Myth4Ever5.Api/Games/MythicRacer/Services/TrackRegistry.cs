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
            CanvasWidth = 1600,
            CanvasHeight = 1000,
            TrackWidth = 120, // Compact 3-lane standard width

            // 36 Smooth Technical Waypoints (Scaled to 1600x1000 for perfect screen fit)
            Waypoints = new List<Vector2D>
            {
                // Main Straight (Bottom: Left to Right)
                new Vector2D(240, 860),  // [Idx 0] Start/Finish Line
                new Vector2D(480, 860),
                new Vector2D(750, 860),
                new Vector2D(1000, 860),
                new Vector2D(1240, 860), // Main Straight End

                // Turn 1 & East Loop
                new Vector2D(1400, 810),
                new Vector2D(1500, 700),
                new Vector2D(1500, 560),  // East Hairpin 1
                new Vector2D(1400, 460),
                new Vector2D(1240, 430),

                // Chicane S-Bends 1 (East Center)
                new Vector2D(1070, 500),
                new Vector2D(930, 560),
                new Vector2D(800, 500),
                new Vector2D(900, 360),

                // North-East Straight
                new Vector2D(1100, 260),
                new Vector2D(1330, 200),
                new Vector2D(1430, 130),
                new Vector2D(1300, 100),
                new Vector2D(1070, 100), // North Straight

                // North-West High Speed Section
                new Vector2D(800, 100),
                new Vector2D(530, 100),
                new Vector2D(300, 100),

                // West Loop & Hairpin 2
                new Vector2D(160, 150),
                new Vector2D(100, 250),  // West Loop Peak
                new Vector2D(100, 400),
                new Vector2D(160, 480),

                // South-West Technical Curves & Hairpin 3
                new Vector2D(300, 500),
                new Vector2D(430, 560),
                new Vector2D(330, 630),
                new Vector2D(200, 630),
                new Vector2D(120, 700),
                new Vector2D(120, 800),
                new Vector2D(160, 860)  // Back to Start Line
            },

            // 8 Strict Checkpoints (65px Radius)
            Checkpoints = new List<CheckpointModel>
            {
                new CheckpointModel { Index = 0, Center = new Vector2D(240, 860), Radius = 65 }, // Start/Finish Line
                new CheckpointModel { Index = 1, Center = new Vector2D(1240, 860), Radius = 65 }, // Main Straight End
                new CheckpointModel { Index = 2, Center = new Vector2D(1500, 560), Radius = 65 },  // East Hairpin
                new CheckpointModel { Index = 3, Center = new Vector2D(930, 560), Radius = 65 },   // East Chicane
                new CheckpointModel { Index = 4, Center = new Vector2D(1300, 100), Radius = 65 },  // NE Straight
                new CheckpointModel { Index = 5, Center = new Vector2D(800, 100), Radius = 65 },   // North Straight
                new CheckpointModel { Index = 6, Center = new Vector2D(100, 250), Radius = 65 },   // West Hairpin
                new CheckpointModel { Index = 7, Center = new Vector2D(120, 700), Radius = 65 }    // Final Curve Entry
            },

            // 🎁 10 Item Box Pickup Locations across the scaled track
            ItemBoxLocations = new List<Vector2D>
            {
                new Vector2D(600, 860),
                new Vector2D(1500, 630),
                new Vector2D(1000, 500),
                new Vector2D(1200, 150),
                new Vector2D(670, 100),
                new Vector2D(130, 180),
                new Vector2D(360, 530),
                new Vector2D(150, 750),
                new Vector2D(320, 860),
                new Vector2D(930, 100)
            },

            // 4 Grid Start Positions (Staggered after Checkpoint 0)
            GridStartPositions = new List<CarSpawnPoint>
            {
                new CarSpawnPoint { Position = new Vector2D(330, 835), Angle = 0 }, // Car 1 (Red)
                new CarSpawnPoint { Position = new Vector2D(330, 885), Angle = 0 }, // Car 2 (Blue)
                new CarSpawnPoint { Position = new Vector2D(270, 835), Angle = 0 }, // Car 3 (Green)
                new CarSpawnPoint { Position = new Vector2D(270, 885), Angle = 0 }  // Car 4 (Yellow)
            }
        };

        _tracks[track.TrackId] = track;
    }
}
