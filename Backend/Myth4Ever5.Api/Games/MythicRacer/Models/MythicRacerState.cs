namespace Myth4Ever5.Api.Games.MythicRacer.Models;

public class MythicRacerState
{
    public string SelectedTrackId { get; set; } = "f1_monaco";
    public TrackDefinition Track { get; set; } = new();

    public Dictionary<string, CarModel> Cars { get; set; } = new();
    public List<ItemBoxModel> ItemBoxes { get; set; } = new();
    public List<DroppedItemModel> DroppedItems { get; set; } = new();
    public List<RocketModel> Rockets { get; set; } = new();

    public int TotalLaps { get; set; } = 3;
    public bool IsCountdown { get; set; } = true;
    public float CountdownTimer { get; set; } = 5.0f; // 5.. 4.. 3.. 2.. 1.. GO!
    public int RedLightsCount { get; set; } = 0; // 0 to 5 red lights ON
    public float RandomLaunchDelay { get; set; } = 1.2f; // Random delay before lights out
    public DateTime? LightsOutTime { get; set; }

    public bool IsGameOver { get; set; } = false;
    public string? WinnerPlayerId { get; set; }
    public string? WinnerName { get; set; }
    public List<string> RaceRankings { get; set; } = new(); // PlayerIds in finish order
    public List<string> RaceLogs { get; set; } = new();
}
