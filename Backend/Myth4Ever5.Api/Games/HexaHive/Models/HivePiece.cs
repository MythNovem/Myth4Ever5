namespace Myth4Ever5.Api.Games.HexaHive.Models;

public class HivePiece
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string PieceType { get; set; } = string.Empty; // queen, ant, spider, grasshopper, beetle, ladybug, mosquito, pillbug
    public string OwnerId { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public int OwnerIndex { get; set; } // 0 or 1
    public int StackHeight { get; set; } = 0; // 0 for ground level, 1+ for beetles/mosquitoes stacked on top

    public string GetIcon() => PieceType switch
    {
        "queen" => "👑",
        "ant" => "🐜",
        "spider" => "🕷️",
        "grasshopper" => "🦗",
        "beetle" => "🪲",
        "ladybug" => "🐞",
        "mosquito" => "🦟",
        "pillbug" => "🛡️",
        _ => "❓"
    };

    public string GetDisplayName() => PieceType switch
    {
        "queen" => "Ong Chúa",
        "ant" => "Kiến Chiến Binh",
        "spider" => "Nhện Sát Thủ",
        "grasshopper" => "Châu Chấu",
        "beetle" => "Bọ Cánh Cứng",
        "ladybug" => "Bọ Rùa",
        "mosquito" => "Muỗi",
        "pillbug" => "Bọ Cuộn",
        _ => PieceType
    };
}
