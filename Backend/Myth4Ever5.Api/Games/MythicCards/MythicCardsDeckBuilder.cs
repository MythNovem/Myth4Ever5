namespace Myth4Ever5.Api.Games.MythicCards;

using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

/// <summary>
/// Responsible solely for building and initializing the MythicCards deck.
/// Single Responsibility: knows nothing about game flow, only card setup.
/// </summary>
public class MythicCardsDeckBuilder
{
    private readonly Random _random = new();

    public void Initialize(RoomModel room, MythicCardsState state)
    {
        int playerCount = Math.Max(2, Math.Min(4, room.Players.Count));
        var actionCards = new List<CardModel>();

        // Dynamic card scaling based on player count
        int actionCopies    = playerCount == 2 ? 3 : 5;
        int normalCopies    = playerCount == 2 ? 5 : 8;
        int expansionCopies = playerCount == 2 ? 2 : 3;
        int nopeCopies      = playerCount == 2 ? 3 : 5;
        int favorCopies     = playerCount == 2 ? 3 : 4;

        // Action cards
        for (int i = 0; i < actionCopies; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Skip,      Name = "Bỏ Lượt",       Description = "Bỏ qua lượt hiện tại không cần rút bài",         Icon = "⏭️", Color = "#3b82f6" });
            actionCards.Add(new CardModel { Type = CardType.Attack,    Name = "Ép Lượt",       Description = "Bỏ lượt & ép đối thủ kế tiếp đi 2 lượt",        Icon = "🔄", Color = "#ef4444" });
            actionCards.Add(new CardModel { Type = CardType.SeeFuture, Name = "Nhìn Tương Lai",Description = "Xem 3 lá bài đầu tiên của bộ bài",              Icon = "👁️", Color = "#8b5cf6" });
            actionCards.Add(new CardModel { Type = CardType.Shuffle,   Name = "Xáo Bài",       Description = "Xáo trộn ngẫu nhiên bộ bài rút",                Icon = "🔀", Color = "#10b981" });
            actionCards.Add(new CardModel { Type = CardType.Steal,     Name = "Cướp Bài",      Description = "Cướp 1 lá ngẫu nhiên trên tay đối thủ",          Icon = "🎁", Color = "#f59e0b" });
        }

        // Normal cards (for combo building)
        for (int i = 0; i < normalCopies; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Normal1, Name = "Cáo Chín Đuôi", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🦊", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal2, Name = "Rồng Con",      Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐲", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal3, Name = "Sói Băng",      Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐺", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal4, Name = "Tinh Linh",     Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🧚", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal5, Name = "Golem Đá",      Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🪨", Color = "#78716c" });
        }

        // Expansion cards
        for (int i = 0; i < expansionCopies; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.AlterFuture,    Name = "Đổi Tương Lai", Description = "Xem và tự do sắp xếp lại 3 lá đầu tiên",        Icon = "🔮", Color = "#c084fc" });
            actionCards.Add(new CardModel { Type = CardType.DrawBottom,     Name = "Rút Đáy",       Description = "Kết thúc lượt bằng cách rút lá dưới cùng",       Icon = "⚓", Color = "#0284c7" });
            actionCards.Add(new CardModel { Type = CardType.TargetedAttack, Name = "Ám Sát",        Description = "Ép một người bất kỳ đi 2 lượt liên tiếp",         Icon = "🎯", Color = "#be123c" });
        }

        // Nope & Favor
        for (int i = 0; i < nopeCopies; i++)
            actionCards.Add(new CardModel { Type = CardType.Nope,  Name = "Chặn (Nope)", Description = "Huỷ bỏ một hành động vừa diễn ra (trừ Gỡ Bẫy/Bẫy Nổ).", Icon = "🛑", Color = "#ef4444" });
        for (int i = 0; i < favorCopies; i++)
            actionCards.Add(new CardModel { Type = CardType.Favor, Name = "Xin Xỏ",     Description = "Bắt 1 người chơi tự chọn và nộp cho bạn 1 lá bài.",         Icon = "🙏", Color = "#fcd34d" });

        Shuffle(actionCards);

        // Deal: 1 Defuse + 4 random action cards per player
        foreach (var player in room.Players)
        {
            player.IsAlive = true;
            var hand = new List<CardModel>
            {
                new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" }
            };
            for (int i = 0; i < 4 && actionCards.Count > 0; i++)
            {
                hand.Add(actionCards[0]);
                actionCards.RemoveAt(0);
            }
            state.PlayerHands[player.PlayerId] = hand;
        }

        // Build remaining deck with bombs + extra defuses
        var deck = new List<CardModel>(actionCards);

        // Always 4 Bombs
        int bombCount = 4;
        for (int i = 0; i < bombCount; i++)
            deck.Add(new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Nổ tung và loại người chơi khỏi bàn!", Icon = "💣", Color = "#dc2626" });

        // Total Defuses = N players * 2 (1 per player in hand + N extra in deck)
        int extraDefuses = playerCount;
        for (int i = 0; i < extraDefuses; i++)
            deck.Add(new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" });

        Shuffle(deck);
        state.Deck = deck;
    }

    private void Shuffle<T>(List<T> list)
    {
        int n = list.Count;
        while (n > 1)
        {
            n--;
            int k = _random.Next(n + 1);
            (list[k], list[n]) = (list[n], list[k]);
        }
    }
}
