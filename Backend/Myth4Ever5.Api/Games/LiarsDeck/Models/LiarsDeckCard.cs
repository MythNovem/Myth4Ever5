namespace Myth4Ever5.Api.Games.LiarsDeck.Models;

public enum CardRank
{
    King,
    Queen,
    Ace,
    Joker
}

public class LiarsDeckCard
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public CardRank Rank { get; set; }

    public string GetDisplayName() => Rank switch
    {
        CardRank.King => "👑 King",
        CardRank.Queen => "👸 Queen",
        CardRank.Ace => "🅰️ Ace",
        CardRank.Joker => "🃏 Joker",
        _ => Rank.ToString()
    };
}
