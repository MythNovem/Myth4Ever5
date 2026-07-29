namespace Myth4Ever5.Api.Games.MythicCards.Models;

public enum CardType
{
    ExplodingTrap, // Bẫy Nổ
    Defuse,        // Gỡ Bẫy
    Skip,          // Bỏ Lượt
    Attack,        // Ép Lượt (+2 lượt cho đối thủ)
    SeeFuture,     // Nhìn Trước Tương Lai 3 lá
    Shuffle,       // Xáo Bài
    Steal          // Cướp Bài
}

public class CardModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public CardType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}
