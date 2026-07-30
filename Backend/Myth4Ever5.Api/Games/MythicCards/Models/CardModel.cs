using System.Text.Json.Serialization;

namespace Myth4Ever5.Api.Games.MythicCards.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CardType
{
    ExplodingTrap, // Bẫy Nổ
    Defuse,        // Gỡ Bẫy
    Skip,          // Bỏ Lượt
    Attack,        // Ép Lượt (+2 lượt cho đối thủ)
    SeeFuture,     // Nhìn Trước Tương Lai 3 lá
    Shuffle,       // Xáo Bài
    Steal,         // Cướp Bài
    Normal1,       // Cáo Chín Đuôi
    Normal2,       // Rồng Con
    Normal3,       // Sói Băng
    Normal4,       // Tinh Linh
    Normal5,       // Golem Đá
    AlterFuture,   // Đổi Tương Lai
    DrawBottom,    // Rút Đáy
    TargetedAttack,// Ép Lượt Chỉ Định
    Nope,          // Chặn
    Favor          // Xin Xỏ
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
