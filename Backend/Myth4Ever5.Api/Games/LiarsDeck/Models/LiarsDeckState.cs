namespace Myth4Ever5.Api.Games.LiarsDeck.Models;

public class PlayerRevolver
{
    public int BulletChamber { get; set; } // 0-5 (position of live bullet)
    public int CurrentChamber { get; set; } // 0-5 (pointer for current turn trigger pull)
    public int TotalShotsFired { get; set; }
}

public class LastClaimInfo
{
    public string PlayerId { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
    public List<LiarsDeckCard> CardsPlayed { get; set; } = new();
    public CardRank TableRankClaimed { get; set; }
    public bool CanChallenge { get; set; } = true;
}

public class ChallengeResultInfo
{
    public string ChallengerId { get; set; } = string.Empty;
    public string ChallengerName { get; set; } = string.Empty;
    public string ClaimantId { get; set; } = string.Empty;
    public string ClaimantName { get; set; } = string.Empty;
    public List<LiarsDeckCard> RevealedCards { get; set; } = new();
    public bool WasLying { get; set; }
    public string ShooterId { get; set; } = string.Empty;
    public string ShooterName { get; set; } = string.Empty;
    public bool DidGunFire { get; set; } // true = BANG (death), false = BLANK (survived)
    public bool DidShooterDie { get; set; }
}

public class LiarsDeckState
{
    public CardRank TableRank { get; set; } // King, Queen, Ace
    public List<LiarsDeckCard> Deck { get; set; } = new();
    public Dictionary<string, List<LiarsDeckCard>> Hands { get; set; } = new();
    public Dictionary<string, PlayerRevolver> Revolvers { get; set; } = new();
    public int CurrentTurnIndex { get; set; }
    public LastClaimInfo? LastClaim { get; set; }
    public ChallengeResultInfo? LastChallengeResult { get; set; }
    public List<LiarsDeckCard> TablePile { get; set; } = new();
    public List<string> GameLogs { get; set; } = new();
    public string? WinnerPlayerId { get; set; }
    public string? WinnerPlayerName { get; set; }
}
