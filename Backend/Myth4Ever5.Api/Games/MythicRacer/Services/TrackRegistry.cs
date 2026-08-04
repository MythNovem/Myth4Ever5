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
            TrackName = "🏎️ Đường Đua F1 Night Grand Prix Extended",
            CanvasWidth = 2400,
            CanvasHeight = 1500,
            TrackWidth = 150, // 3-Lane F1 Highway standard width (50px per lane)

            // 36 Smooth Technical Waypoints (Doubled track length: Main straight -> Hairpin 1 -> NE Chicane -> North straight -> Hairpin 2 -> SW S-Bends -> Finish)
            Waypoints = new List<Vector2D>
            {
                // Main Straight (Bottom: Left to Right)
                new Vector2D(350, 1300),  // [Idx 0] Start/Finish Line
                new Vector2D(700, 1300),
                new Vector2D(1100, 1300),
                new Vector2D(1500, 1300),
                new Vector2D(1850, 1300), // Main Straight End

                // Turn 1 & East Loop
                new Vector2D(2100, 1220),
                new Vector2D(2250, 1050),
                new Vector2D(2250, 850),  // East Hairpin 1
                new Vector2D(2100, 700),
                new Vector2D(1850, 650),

                // Chicane S-Bends 1 (East Center)
                new Vector2D(1600, 750),
                new Vector2D(1400, 850),
                new Vector2D(1200, 750),
                new Vector2D(1350, 550),

                // North-East Straight
                new Vector2D(1650, 400),
                new Vector2D(2000, 300),
                new Vector2D(2150, 200),
                new Vector2D(1950, 150),
                new Vector2D(1600, 150), // North Straight

                // North-West High Speed Section
                new Vector2D(1200, 150),
                new Vector2D(800, 150),
                new Vector2D(450, 150),

                // West Loop & Hairpin 2
                new Vector2D(250, 220),
                new Vector2D(150, 380),  // West Loop Peak
                new Vector2D(150, 600),
                new Vector2D(250, 720),

                // South-West Technical Curves & Hairpin 3
                new Vector2D(450, 750),
                new Vector2D(650, 850),
                new Vector2D(500, 950),
                new Vector2D(300, 950),
                new Vector2D(180, 1050),
                new Vector2D(180, 1200),
                new Vector2D(250, 1300)  // Back to Start Line
            },

            // 8 Strict Checkpoints (75px Radius)
            Checkpoints = new List<CheckpointModel>
            {
                new CheckpointModel { Index = 0, Center = new Vector2D(350, 1300), Radius = 75 }, // Start/Finish Line
                new CheckpointModel { Index = 1, Center = new Vector2D(1850, 1300), Radius = 75 }, // Main Straight End
                new CheckpointModel { Index = 2, Center = new Vector2D(2250, 850), Radius = 75 },  // East Hairpin
                new CheckpointModel { Index = 3, Center = new Vector2D(1400, 850), Radius = 75 },  // East Chicane
                new CheckpointModel { Index = 4, Center = new Vector2D(1950, 150), Radius = 75 },  // NE Straight
                new CheckpointModel { Index = 5, Center = new Vector2D(1200, 150), Radius = 75 },  // North Straight
                new CheckpointModel { Index = 6, Center = new Vector2D(150, 380), Radius = 75 },   // West Hairpin
                new CheckpointModel { Index = 7, Center = new Vector2D(180, 1050), Radius = 75 }   // Final Curve Entry
            },

            // 🎁 10 Item Box Pickup Locations across the extended track
            ItemBoxLocations = new List<Vector2D>
            {
                new Vector2D(900, 1300),
                new Vector2D(2250, 950),
                new Vector2D(1500, 750),
                new Vector2D(1800, 220),
                new Vector2D(1000, 150),
                new Vector2D(200, 280),
                new Vector2D(550, 800),
                new Vector2D(220, 1120),
                new Vector2D(480, 1300),
                new Vector2D(1400, 150)
            },

            // 4 Grid Start Positions (Staggered after Checkpoint 0)
            GridStartPositions = new List<CarSpawnPoint>
            {
                new CarSpawnPoint { Position = new Vector2D(480, 1270), Angle = 0 }, // Car 1 (Red)
                new CarSpawnPoint { Position = new Vector2D(480, 1330), Angle = 0 }, // Car 2 (Blue)
                new CarSpawnPoint { Position = new Vector2D(400, 1270), Angle = 0 }, // Car 3 (Green)
                new CarSpawnPoint { Position = new Vector2D(400, 1330), Angle = 0 }  // Car 4 (Yellow)
            }
        };

        _tracks[track.TrackId] = track;
    }
}
