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
            TrackName = "🏎️ Đường Đua F1 Grand Prix",
            CanvasWidth = 1400,
            CanvasHeight = 900,
            TrackWidth = 110,

            // F1 Technical Loop: Main Straight -> Hairpin 180° -> S-Bends -> Curved Return
            Waypoints = new List<Vector2D>
            {
                // Main Straight (Bottom left to bottom right)
                new Vector2D(250, 750),  // Grid Start Line
                new Vector2D(650, 750),  // Speed Straight
                new Vector2D(1050, 750), // Main Straight End
                
                // Turn 1 & Hairpin 180° (Bottom right up into hairpin)
                new Vector2D(1220, 700),
                new Vector2D(1280, 550), 
                new Vector2D(1220, 400), // Hairpin Apex
                new Vector2D(1050, 420), 

                // Chicane S-Bends (Center technical curves)
                new Vector2D(850, 360),
                new Vector2D(700, 480),  // S-Curve Bend 1
                new Vector2D(550, 340),  // S-Curve Bend 2
                
                // Top Loop (Top left curve)
                new Vector2D(350, 200),
                new Vector2D(200, 250),
                new Vector2D(150, 450),
                new Vector2D(180, 650),
                new Vector2D(250, 750)   // Back to Finish
            },

            // Checkpoints to validate lap progression (5 key checkpoints)
            Checkpoints = new List<CheckpointModel>
            {
                new CheckpointModel { Index = 0, Center = new Vector2D(250, 750), Radius = 100 }, // Start/Finish Line
                new CheckpointModel { Index = 1, Center = new Vector2D(1050, 750), Radius = 100 }, // Turn 1 Entry
                new CheckpointModel { Index = 2, Center = new Vector2D(1220, 400), Radius = 100 }, // Hairpin Peak
                new CheckpointModel { Index = 3, Center = new Vector2D(700, 480), Radius = 100 },  // S-Bends Center
                new CheckpointModel { Index = 4, Center = new Vector2D(150, 450), Radius = 100 }   // Final Curve
            },

            // 🎁 Item Box Spawn Locations (4 clusters around the track)
            ItemBoxLocations = new List<Vector2D>
            {
                new Vector2D(450, 750),
                new Vector2D(650, 750),
                new Vector2D(1250, 480),
                new Vector2D(770, 420),
                new Vector2D(350, 200),
                new Vector2D(160, 550)
            },

            // 4 Grid Start Positions (Staggered start pointing East along Main Straight)
            GridStartPositions = new List<CarSpawnPoint>
            {
                new CarSpawnPoint { Position = new Vector2D(270, 725), Angle = 0 }, // Car 1 (Red)
                new CarSpawnPoint { Position = new Vector2D(270, 775), Angle = 0 }, // Car 2 (Blue)
                new CarSpawnPoint { Position = new Vector2D(210, 725), Angle = 0 }, // Car 3 (Green)
                new CarSpawnPoint { Position = new Vector2D(210, 775), Angle = 0 }  // Car 4 (Yellow)
            }
        };

        _tracks[track.TrackId] = track;
    }
}
