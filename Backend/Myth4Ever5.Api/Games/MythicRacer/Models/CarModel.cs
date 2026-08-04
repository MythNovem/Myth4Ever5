namespace Myth4Ever5.Api.Games.MythicRacer.Models;

public class CarModel
{
    public string PlayerId { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
    public string Color { get; set; } = "#ef4444"; // Red, Blue, Green, Yellow

    // Kinematics & Position
    public float X { get; set; } = 0;
    public float Y { get; set; } = 0;
    public float Angle { get; set; } = 0; // In radians
    public float Speed { get; set; } = 0;
    public float MaxSpeed { get; set; } = 8.5f;

    // Steering Inputs (Real-time state)
    public bool SteerLeft { get; set; } = false;
    public bool SteerRight { get; set; } = false;
    public bool Accelerate { get; set; } = false;
    public bool Reverse { get; set; } = false;

    // Race Progress
    public int CurrentLap { get; set; } = 1;
    public int LastPassedCheckpoint { get; set; } = -1;
    public bool IsFinished { get; set; } = false;
    public int FinishedRank { get; set; } = 0;
    public DateTime? FinishedTime { get; set; }

    // Item & Ability State
    public string CurrentItem { get; set; } = string.Empty; // rocket, banana, nitro, shield, bomb
    public bool IsShielded { get; set; } = false;
    public float ShieldTimer { get; set; } = 0;
    public float NitroTimer { get; set; } = 0;
    public float SpinoutTimer { get; set; } = 0; // Spinning 360 deg when hit banana
    public float HitStunTimer { get; set; } = 0; // Knocked back when hit by rocket

    // F1 Reaction Launch
    public int LaunchReactionMs { get; set; } = -1; // Reaction time in ms (-1 if not launched yet)
    public bool IsRocketLaunch { get; set; } = false; // Perfect launch bonus (< 250ms)
    public bool IsJumpStart { get; set; } = false; // Penalty for accelerating early
}
