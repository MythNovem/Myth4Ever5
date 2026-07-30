namespace Myth4Ever5.Api.Games.MythicCards;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicCards.Models;

public class MythicCardsEngine : IGameEngine
{
    public string GameTypeId => "mythic_cards";
    public string GameName => "Mythic Cards: Trap & Survive";
    public int MinPlayers => 2;
    public int MaxPlayers => 4;

    private readonly Random _random = new();

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new MythicCardsState();

        // 1. Tạo các lá bài Action cơ bản
        var actionCards = new List<CardModel>();
        for (int i = 0; i < 5; i++) // 5 lá mỗi loại Action cơ bản
        {
            actionCards.Add(new CardModel { Type = CardType.Skip, Name = "Bỏ Lượt", Description = "Bỏ qua lượt hiện tại không cần rút bài", Icon = "⏭️", Color = "#3b82f6" });
            actionCards.Add(new CardModel { Type = CardType.Attack, Name = "Ép Lượt", Description = "Bỏ lượt & ép đối thủ kế tiếp đi 2 lượt", Icon = "🔄", Color = "#ef4444" });
            actionCards.Add(new CardModel { Type = CardType.SeeFuture, Name = "Nhìn Tương Lai", Description = "Xem 3 lá bài đầu tiên của bộ bài", Icon = "👁️", Color = "#8b5cf6" });
            actionCards.Add(new CardModel { Type = CardType.Shuffle, Name = "Xáo Bài", Description = "Xáo trộn ngẫu nhiên bộ bài rút", Icon = "🔀", Color = "#10b981" });
            actionCards.Add(new CardModel { Type = CardType.Steal, Name = "Cướp Bài", Description = "Cướp 1 lá ngẫu nhiên trên tay đối thủ", Icon = "🎁", Color = "#f59e0b" });
        }

        // Tăng số lượng Bài Thường lên 8 bản sao để dễ ghép combo
        for (int i = 0; i < 8; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Normal1, Name = "Cáo Chín Đuôi", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🦊", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal2, Name = "Rồng Con", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐲", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal3, Name = "Sói Băng", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🐺", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal4, Name = "Tinh Linh", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🧚", Color = "#78716c" });
            actionCards.Add(new CardModel { Type = CardType.Normal5, Name = "Golem Đá", Description = "Bài thường. Ghép bộ để tạo Combo.", Icon = "🪨", Color = "#78716c" });
        }

        // Các Bài Phép Mở Rộng (3 lá mỗi loại)
        for (int i = 0; i < 3; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.AlterFuture, Name = "Đổi Tương Lai", Description = "Xem và tự do sắp xếp lại 3 lá đầu tiên", Icon = "🔮", Color = "#c084fc" });
            actionCards.Add(new CardModel { Type = CardType.DrawBottom, Name = "Rút Đáy", Description = "Kết thúc lượt bằng cách rút lá dưới cùng", Icon = "⚓", Color = "#0284c7" });
            actionCards.Add(new CardModel { Type = CardType.TargetedAttack, Name = "Ám Sát", Description = "Ép một người bất kỳ đi 2 lượt liên tiếp", Icon = "🎯", Color = "#be123c" });
        }

        // Nope (Chặn) và Favor (Xin Xỏ)
        for (int i = 0; i < 5; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Nope, Name = "Chặn (Nope)", Description = "Huỷ bỏ một hành động vừa diễn ra (trừ Gỡ Bẫy/Bẫy Nổ).", Icon = "🛑", Color = "#ef4444" });
        }
        for (int i = 0; i < 4; i++)
        {
            actionCards.Add(new CardModel { Type = CardType.Favor, Name = "Xin Xỏ", Description = "Bắt 1 người chơi tự chọn và nộp cho bạn 1 lá bài.", Icon = "🙏", Color = "#fcd34d" });
        }

        // Xáo trộn các lá Action để chia
        ShuffleList(actionCards);

        // 2. Phát cho mỗi người chơi 1 lá Defuse + 4 lá Action ngẫu nhiên
        foreach (var player in room.Players)
        {
            player.IsAlive = true;
            var hand = new List<CardModel>
            {
                new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" }
            };

            for (int i = 0; i < 4; i++)
            {
                if (actionCards.Count > 0)
                {
                    hand.Add(actionCards[0]);
                    actionCards.RemoveAt(0);
                }
            }

            state.PlayerHands[player.PlayerId] = hand;
        }

        // 3. Đưa Bẫy Nổ (PlayerCount - 1 = 2) và các lá Defuse còn lại vào Deck chung
        var remainingDeck = new List<CardModel>(actionCards);
        
        // Thêm 4 lá Bẫy Nổ mặc định theo yêu cầu
        for (int i = 0; i < 4; i++)
        {
            remainingDeck.Add(new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Nổ tung và loại người chơi khỏi bàn!", Icon = "💣", Color = "#dc2626" });
        }

        // Thêm lá Defuse vào nọc để tổng số Defuse trong game = 8
        // (mỗi người đã có 1 trên tay, nọc thêm đủ để tổng = 8)
        int extraDefuses = 8 - room.Players.Count;
        for (int i = 0; i < extraDefuses; i++)
        {
            remainingDeck.Add(new CardModel { Type = CardType.Defuse, Name = "Gỡ Bẫy", Description = "Cứu bạn khi rút phải Bẫy Nổ", Icon = "🛡️", Color = "#06b6d4" });
        }

        ShuffleList(remainingDeck);
        state.Deck = remainingDeck;

        state.CurrentTurnIndex = _random.Next(0, room.Players.Count);
        state.TurnsToTake = 1;
        state.GameLogs.Add($"Bắt đầu game! Người chơi {room.Players[state.CurrentTurnIndex].PlayerName} đi trước.");

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not MythicCardsState state)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Game state không hợp lệ" });
        }

        if (!state.PlayerHands.TryGetValue(playerId, out var myHand))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Không tìm thấy tay bài của bạn" });
        }

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        
        bool isMyTurn = currentPlayer.PlayerId == playerId;
        bool isAllowedOutOfTurn = actionType == "insert_trap" || actionType == "surrender" || actionType == "reorder_hand" || actionType == "resolve_pending_action" || actionType == "resolve_exploding_timer" || actionType == "play_card";

        if (!isMyTurn && !isAllowedOutOfTurn)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });
        }

        if (!currentPlayer.IsAlive)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Bạn đã bị loại!" });
        }

        switch (actionType)
        {
            case "play_card":
                return Task.FromResult(HandlePlayCard(room, state, playerId, payload));

            case "draw_card":
                // Khi đang dính bom, không được rút bài — phải gỡ bẫy trước
                if (state.IsExploding && state.ExplodingPlayerId == playerId)
                {
                    return Task.FromResult(new GameActionResult { Success = false, Message = "Bạn đang dính Bẫy Nổ! Hãy dùng lá Gỡ Bẫy trước!" });
                }
                return Task.FromResult(HandleDrawCard(room, state, playerId));

            case "insert_trap":
                return Task.FromResult(HandleInsertTrap(room, state, playerId, payload));

            case "reorder_hand":
                return Task.FromResult(HandleReorderHand(room, state, playerId, payload));

            case "rearrange_future":
                return Task.FromResult(HandleRearrangeFuture(room, state, playerId, payload));

            case "surrender":
                return Task.FromResult(HandleSurrender(room, state, playerId));

            case "resolve_pending_action":
                return Task.FromResult(HandleResolvePendingAction(room, state, playerId));
            
            case "resolve_exploding_timer":
                return Task.FromResult(HandleResolveExplodingTimer(room, state, playerId));
                
            case "give_favor_card":
                return Task.FromResult(HandleGiveFavorCard(room, state, playerId, payload));

            default:
                return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ" });
        }
    }

    private GameActionResult HandleResolvePendingAction(RoomModel room, MythicCardsState state, string playerId)
    {
        var pending = state.CurrentPendingAction;
        if (pending == null) return new GameActionResult { Success = false, Message = "Không có hành động chờ xử lý" };

        bool isCancelled = pending.NopeCount % 2 != 0;
        state.CurrentPendingAction = null; // Clear it

        if (isCancelled)
        {
            state.GameLogs.Add("🛑 Hành động đã bị huỷ bỏ bởi Chặn (Nope)!");
            return new GameActionResult { Success = true, ActionType = "action_noped", Data = SanitizeStateForBroadcast(room, state) };
        }

        // Khôi phục lại action ban đầu
        state.GameLogs.Add("✅ Hành động được thông qua.");
        var payload = pending.Payload;
        
        // Cần truyền đúng cardsToPlay, do bài đã bị remove, ta phải mock lại từ payload
        if (!payload.TryGetProperty("cardIds", out var cardIdsProp)) return new GameActionResult { Success = false, Message = "Lỗi payload" };
        
        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        var cardsToPlay = new List<CardModel>();
        foreach (var id in cardIds)
        {
            // Bài đã nằm trong discard pile
            var c = state.DiscardPile.FirstOrDefault(x => x.Id == id);
            if (c != null) cardsToPlay.Add(c);
        }

        if (cardsToPlay.Count == 1)
        {
            return ExecuteSingleCardEffect(room, state, pending.SourcePlayerId, cardsToPlay[0], payload);
        }
        else if (cardsToPlay.Count > 1)
        {
            return ExecuteComboEffect(room, state, pending.SourcePlayerId, cardsToPlay, payload);
        }

        return new GameActionResult { Success = true, ActionType = "action_resolved", Data = SanitizeStateForBroadcast(room, state) };
    }

    private GameActionResult HandleResolveExplodingTimer(RoomModel room, MythicCardsState state, string playerId)
    {
        if (!state.IsExploding || state.ExplodingPlayerId == null)
        {
            return new GameActionResult { Success = false, Message = "Không hợp lệ" };
        }

        var victimId = state.ExplodingPlayerId;
        var player = room.Players.FirstOrDefault(p => p.PlayerId == victimId);
        if (player == null) return new GameActionResult { Success = false, Message = "Lỗi" };

        player.IsAlive = false;
        
        state.IsExploding = false;
        state.ExplodingPlayerId = null;
        state.ExplodeExpiryTime = null;
        
        state.GameLogs.Add($"💥 BÙM! {player.PlayerName} đã nổ tung vì không gỡ bẫy kịp thời!");

        var victimHand = state.PlayerHands[victimId];
        state.DiscardPile.AddRange(victimHand);
        state.PlayerHands[victimId].Clear();

        return CheckGameOverOrContinue(room, state, "player_exploded", new { playerId = victimId });
    }

    private GameActionResult HandleGiveFavorCard(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.AwaitingFavorResponse || state.PendingFavorTargetId != playerId)
        {
            return new GameActionResult { Success = false, Message = "Không có ai xin xỏ bạn cả!" };
        }

        if (!payload.TryGetProperty("cardId", out var cardIdProp))
        {
            return new GameActionResult { Success = false, Message = "Chưa chọn bài" };
        }
        string cardId = cardIdProp.GetString() ?? "";
        
        var hand = state.PlayerHands[playerId];
        var card = hand.FirstOrDefault(c => c.Id == cardId);
        if (card == null) return new GameActionResult { Success = false, Message = "Lá bài không tồn tại trên tay" };

        var sourceId = state.PendingFavorSourceId!;
        var sourceHand = state.PlayerHands[sourceId];
        
        hand.Remove(card);
        sourceHand.Add(card);

        state.AwaitingFavorResponse = false;
        state.PendingFavorSourceId = null;
        state.PendingFavorTargetId = null;

        var targetName = room.Players.First(p => p.PlayerId == playerId).PlayerName;
        var sourceName = room.Players.First(p => p.PlayerId == sourceId).PlayerName;

        state.GameLogs.Add($"{targetName} đã cho {sourceName} 1 lá bài theo yêu cầu Xin Xỏ.");

        return new GameActionResult { Success = true, ActionType = "favor_resolved", Data = SanitizeStateForBroadcast(room, state) };
    }

    private GameActionResult HandleSurrender(RoomModel room, MythicCardsState state, string playerId)
    {
        var victim = room.Players.First(p => p.PlayerId == playerId);
        victim.IsAlive = false;

        var victimHand = state.PlayerHands[playerId];
        state.DiscardPile.AddRange(victimHand);
        victimHand.Clear();

        state.GameLogs.Add($"🏳️ {victim.PlayerName} đã đầu hàng và rời phòng!");
        
        // Nếu là lượt của người này thì chuyển qua người kế tiếp
        if (room.Players[state.CurrentTurnIndex].PlayerId == playerId)
        {
            AdvanceTurn(room, state);
        }
        else
        {
            // Nếu người đầu hàng không phải người đang đi, ta có thể cần cập nhật index để trỏ đúng vào người đang đi (nếu danh sách thu hẹp lại thì khác, nhưng mảng không đổi)
            // Tuy nhiên mảng Players không thay đổi, IsAlive = false thôi, nên CurrentTurnIndex vẫn trỏ đúng người.
        }

        return CheckGameOverOrContinue(room, state, "player_surrendered", new { surrenderedPlayerId = playerId });
    }

    private GameActionResult HandleReorderHand(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (payload.TryGetProperty("cardIds", out var cardIdsProp))
        {
            var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
            var hand = state.PlayerHands[playerId];
            
            if (cardIds.Count == hand.Count)
            {
                var newHand = new List<CardModel>();
                foreach (var id in cardIds)
                {
                    var card = hand.FirstOrDefault(c => c.Id == id);
                    if (card != null) newHand.Add(card);
                }
                if (newHand.Count == hand.Count)
                {
                    state.PlayerHands[playerId] = newHand;
                    return new GameActionResult { Success = true, ActionType = "reorder_hand", Data = SanitizeStateForBroadcast(room, state) };
                }
            }
        }
        return new GameActionResult { Success = false, Message = "Invalid reorder payload" };
    }

    private GameActionResult HandlePlayCard(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (state.AwaitingDefusePlacement)
        {
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };
        }

        if (!payload.TryGetProperty("cardIds", out var cardIdsProp))
        {
            return new GameActionResult { Success = false, Message = "Thiếu cardIds" };
        }

        var cardIds = cardIdsProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        if (cardIds.Count == 0)
        {
            return new GameActionResult { Success = false, Message = "Chưa chọn lá bài nào" };
        }

        var hand = state.PlayerHands[playerId];
        var cardsToPlay = new List<CardModel>();

        foreach (var id in cardIds)
        {
            var c = hand.FirstOrDefault(x => x.Id == id);
            if (c == null) return new GameActionResult { Success = false, Message = "Lá bài không tồn tại trên tay" };
            cardsToPlay.Add(c);
        }

        if (cardsToPlay.Any(c => c.Type == CardType.ExplodingTrap))
        {
            return new GameActionResult { Success = false, Message = "Không thể tự ý đánh Bẫy Nổ!" };
        }
        
        if (cardsToPlay.Any(c => c.Type == CardType.Defuse) && !state.IsExploding)
        {
            return new GameActionResult { Success = false, Message = "Chỉ được dùng Gỡ Bẫy khi đang dính bom!" };
        }

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        bool isNope = cardsToPlay.Count == 1 && cardsToPlay[0].Type == CardType.Nope;
        
        if (currentPlayer.PlayerId != playerId && !isNope)
        {
            return new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn, chỉ có thể đánh Chặn (Nope)!" };
        }

        if (isNope)
        {
            if (state.CurrentPendingAction == null)
            {
                return new GameActionResult { Success = false, Message = "Không có hành động nào đang chờ để Chặn!" };
            }

            // Không thể tự chặn bài của chính mình
            if (state.CurrentPendingAction.SourcePlayerId == playerId)
            {
                return new GameActionResult { Success = false, Message = "Bạn không thể tự chặn bài của chính mình!" };
            }
            
            var card = cardsToPlay[0];
            hand.Remove(card);
            state.DiscardPile.Add(card);
            
            state.CurrentPendingAction.NopeCount++;
            state.CurrentPendingAction.ExpiryTime = DateTime.UtcNow.AddSeconds(5); // Extend timer
            
            string nopeType = state.CurrentPendingAction.NopeCount % 2 == 1 ? "🛑 CHẶN (NOPE)!" : "✅ YUP! (CHẶN LẠI CHẶN)";
            state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã ném {nopeType}");
            
            return new GameActionResult { Success = true, ActionType = "play_card", Data = SanitizeStateForBroadcast(room, state) };
        }

        if (state.CurrentPendingAction != null)
        {
            return new GameActionResult { Success = false, Message = "Đang chờ phân xử hành động trước đó!" };
        }

        // Handle Defuse
        if (cardsToPlay.Count == 1 && cardsToPlay[0].Type == CardType.Defuse)
        {
            if (!state.IsExploding || state.ExplodingPlayerId != playerId)
            {
                return new GameActionResult { Success = false, Message = "Bạn không bị nổ, không thể gỡ bẫy!" };
            }

            var card = cardsToPlay[0];
            hand.Remove(card);
            state.DiscardPile.Add(card);

            // Tìm lá bẫy nổ trong tay và ném ra discard luôn (hoặc để tí insert trap)
            // Trong game gốc, gỡ bẫy xong thì nhét lại bẫy nổ. Ta đã add bẫy nổ vào tay lúc rút.
            var trap = hand.FirstOrDefault(c => c.Type == CardType.ExplodingTrap);
            if (trap != null) hand.Remove(trap); // Sẽ được insert lại sau
            
            state.IsExploding = false;
            state.ExplodingPlayerId = null;
            state.ExplodeExpiryTime = null;
            
            state.AwaitingDefusePlacement = true;
            state.PendingDefusePlayerId = playerId;
            state.GameLogs.Add($"🛡️ {room.Players.First(p => p.PlayerId == playerId).PlayerName} đã dùng Gỡ Bẫy kịp thời!");
            
            return new GameActionResult
            {
                Success = true,
                ActionType = "trap_defused_need_placement",
                Data = new
                {
                    PlayerId = playerId,
                    PlayerName = room.Players.First(p => p.PlayerId == playerId).PlayerName,
                    DeckCount = state.Deck.Count,
                    RoomState = SanitizeStateForBroadcast(room, state)
                }
            };
        }

        if (cardsToPlay.Count == 1)
        {
            var card = cardsToPlay[0];
            if (IsNormalCard(card.Type))
            {
                return new GameActionResult { Success = false, Message = "Bài thường phải đánh theo bộ, không được đánh lẻ!" };
            }
        }
        else
        {
            bool isPair = cardsToPlay.Count == 2 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
            bool isThree = cardsToPlay.Count == 3 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
            bool isFiveDiff = cardsToPlay.Count == 5 && cardsToPlay.Select(c => c.Type).Distinct().Count() == 5;

            if (!isPair && !isThree && !isFiveDiff)
            {
                return new GameActionResult { Success = false, Message = "Combo không hợp lệ! Chỉ được đánh 2 lá giống nhau, 3 lá giống nhau, hoặc 5 lá khác nhau." };
            }
        }

        foreach (var c in cardsToPlay)
            {
                hand.Remove(c);
                state.DiscardPile.Add(c);
            }

            string playerMsg = $"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã sử dụng {string.Join(", ", cardsToPlay.Select(c => c.Name))}";
            state.GameLogs.Add(playerMsg);

            // Ghi vào PendingAction thay vì thực thi ngay
            state.CurrentPendingAction = new PendingAction
            {
                SourcePlayerId = playerId,
                ActionType = "play_card",
                Payload = payload,
                ExpiryTime = DateTime.UtcNow.AddSeconds(5),
                NopeCount = 0
            };

            return new GameActionResult { Success = true, ActionType = "play_card", Data = SanitizeStateForBroadcast(room, state) };
    }

    private bool IsNormalCard(CardType type)
    {
        return type == CardType.Normal1 || type == CardType.Normal2 || type == CardType.Normal3 || type == CardType.Normal4 || type == CardType.Normal5;
    }

    private GameActionResult ExecuteSingleCardEffect(RoomModel room, MythicCardsState state, string playerId, CardModel card, JsonElement payload)
    {
        var hand = state.PlayerHands[playerId];
        object? extraData = null;

        switch (card.Type)
        {
            case CardType.Skip:
                state.TurnsToTake--;
                if (state.TurnsToTake <= 0)
                {
                    AdvanceTurn(room, state);
                }
                break;

            case CardType.Attack:
                // Kết thúc lượt hiện tại ngay lập tức, người tiếp theo chịu 2 lượt
                AdvanceTurn(room, state);
                state.TurnsToTake = 2;
                break;

            case CardType.SeeFuture:
                var top3 = state.Deck.Take(3).ToList();
                extraData = new { FutureCards = top3 };
                break;

            case CardType.Shuffle:
                ShuffleList(state.Deck);
                break;

            case CardType.Steal:
                string targetId = "";
                if (payload.TryGetProperty("targetPlayerId", out var targetProp))
                {
                    targetId = targetProp.GetString() ?? "";
                }
                
                int targetCardIndex = -1;
                if (payload.TryGetProperty("targetCardIndex", out var targetIndexProp) && targetIndexProp.ValueKind == JsonValueKind.Number)
                {
                    targetCardIndex = targetIndexProp.GetInt32();
                }

                var aliveTargets = room.Players.Where(p => p.PlayerId != playerId && p.IsAlive && state.PlayerHands[p.PlayerId].Count > 0).ToList();
                if (aliveTargets.Count > 0)
                {
                    var target = aliveTargets.FirstOrDefault(p => p.PlayerId == targetId) ?? aliveTargets[_random.Next(aliveTargets.Count)];
                    var targetHand = state.PlayerHands[target.PlayerId];
                    
                    int stealIndex = targetCardIndex;
                    if (stealIndex < 0 || stealIndex >= targetHand.Count)
                    {
                        stealIndex = _random.Next(targetHand.Count);
                    }
                    
                    var stolenCard = targetHand[stealIndex];
                    targetHand.RemoveAt(stealIndex);
                    hand.Add(stolenCard);
                    state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã cướp lá bài thứ {stealIndex + 1} của {target.PlayerName}!");
                }
                break;
            case CardType.TargetedAttack:
                string taTargetId = payload.TryGetProperty("targetPlayerId", out var taProp) ? taProp.GetString() ?? "" : "";
                var taTargetIndex = room.Players.FindIndex(p => p.PlayerId == taTargetId && p.IsAlive);
                if (taTargetIndex >= 0)
                {
                    state.CurrentTurnIndex = taTargetIndex;
                    state.TurnsToTake = 2;
                    state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã 🎯 Ám Sát {room.Players[taTargetIndex].PlayerName}, bắt phải đi 2 lượt!");
                }
                else
                {
                    AdvanceTurn(room, state);
                    state.TurnsToTake = 2;
                }
                break;

            case CardType.DrawBottom:
                if (state.Deck.Count > 0)
                {
                    var bottomCard = state.Deck.Last();
                    state.Deck.RemoveAt(state.Deck.Count - 1);
                    var player = room.Players.First(p => p.PlayerId == playerId);
                    return ProcessDrawnCard(room, state, playerId, bottomCard, player, hand, isFromBottom: true);
                }
                break;

            case CardType.AlterFuture:
                var top3Alter = state.Deck.Take(3).ToList();
                extraData = new { FutureCards = top3Alter, IsAlter = true };
                break;
            case CardType.Favor:
                string favorTargetId = "";
                if (payload.TryGetProperty("targetPlayerId", out var ftProp)) favorTargetId = ftProp.GetString() ?? "";
                var fTarget = room.Players.FirstOrDefault(p => p.PlayerId == favorTargetId && p.IsAlive && p.PlayerId != playerId);
                if (fTarget != null && state.PlayerHands[fTarget.PlayerId].Count > 0)
                {
                    state.AwaitingFavorResponse = true;
                    state.PendingFavorSourceId = playerId;
                    state.PendingFavorTargetId = fTarget.PlayerId;
                    state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã Xin Xỏ {fTarget.PlayerName}. Đang chờ chọn bài...");
                }
                else
                {
                    state.GameLogs.Add($"{room.Players.First(p => p.PlayerId == playerId).PlayerName} đã Xin Xỏ nhưng mục tiêu không hợp lệ hoặc hết bài!");
                }
                break;
        }

        return CheckGameOverOrContinue(room, state, "card_played", new
        {
            PlayerId = playerId,
            Card = card,
            ExtraData = extraData,
            RoomState = SanitizeStateForBroadcast(room, state)
        });
    }

    private GameActionResult ExecuteComboEffect(RoomModel room, MythicCardsState state, string playerId, List<CardModel> cardsToPlay, JsonElement payload)
    {
        int count = cardsToPlay.Count;
        var hand = state.PlayerHands[playerId];
        var player = room.Players.First(p => p.PlayerId == playerId);
        
        bool isPair = count == 2 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isThree = count == 3 && cardsToPlay.All(c => c.Type == cardsToPlay[0].Type);
        bool isFiveDiff = count == 5 && cardsToPlay.Select(c => c.Type).Distinct().Count() == 5;

        if (!isPair && !isThree && !isFiveDiff)
        {
            return new GameActionResult { Success = false, Message = "Combo không hợp lệ! Chỉ được đánh 2 lá giống nhau, 3 lá giống nhau, hoặc 5 lá khác nhau." };
        }

        object? extraData = null;

        if (isPair || isThree)
        {
            string targetId = "";
            if (payload.TryGetProperty("targetPlayerId", out var targetProp))
            {
                targetId = targetProp.GetString() ?? "";
            }

            var target = room.Players.FirstOrDefault(p => p.PlayerId == targetId && p.IsAlive && p.PlayerId != playerId);
            if (target == null)
            {
                return new GameActionResult { Success = false, Message = "Mục tiêu không hợp lệ hoặc đã bị loại!" };
            }

            var targetHand = state.PlayerHands[target.PlayerId];

            if (isPair)
            {
                if (targetHand.Count > 0)
                {
                    var stolenCard = targetHand[_random.Next(targetHand.Count)];
                    targetHand.Remove(stolenCard);
                    hand.Add(stolenCard);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá cướp 1 lá bài của {target.PlayerName}!");
                }
                else
                {
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 2 lá nhắm vào {target.PlayerName} nhưng họ không còn bài!");
                }
            }
            else if (isThree)
            {
                string targetCardTypeStr = "";
                if (payload.TryGetProperty("targetCardType", out var typeProp))
                {
                    targetCardTypeStr = typeProp.GetString() ?? "";
                }

                if (!Enum.TryParse<CardType>(targetCardTypeStr, out var requestedType))
                {
                    return new GameActionResult { Success = false, Message = "Loại bài yêu cầu không hợp lệ!" };
                }

                var cardToGive = targetHand.FirstOrDefault(c => c.Type == requestedType);
                if (cardToGive != null)
                {
                    targetHand.Remove(cardToGive);
                    hand.Add(cardToGive);
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} và THÀNH CÔNG!");
                }
                else
                {
                    state.GameLogs.Add($"{player.PlayerName} dùng Combo 3 lá đòi lá {requestedType} từ {target.PlayerName} nhưng THẤT BẠI (không có)!");
                }
            }
        }
        else if (isFiveDiff)
        {
            string targetCardIdFromDiscard = "";
            if (payload.TryGetProperty("targetCardIdFromDiscard", out var discardProp))
            {
                targetCardIdFromDiscard = discardProp.GetString() ?? "";
            }

            var cardToRevive = state.DiscardPile.FirstOrDefault(c => c.Id == targetCardIdFromDiscard);
            if (cardToRevive == null)
            {
                return new GameActionResult { Success = false, Message = "Lá bài muốn lấy không có trong Discard Pile!" };
            }

            state.DiscardPile.Remove(cardToRevive);
            hand.Add(cardToRevive);
            state.GameLogs.Add($"{player.PlayerName} dùng Combo 5 lá khác nhau bới rác lấy lại lá {cardToRevive.Name}!");
        }

        // Bỏ các lá bài đã dùng vào Discard Pile
        foreach (var c in cardsToPlay)
        {
            hand.Remove(c);
            state.DiscardPile.Add(c);
        }

        return CheckGameOverOrContinue(room, state, "combo_played", new
        {
            PlayerId = playerId,
            ComboSize = count,
            ExtraData = extraData,
            RoomState = SanitizeStateForBroadcast(room, state)
        });
    }

    private GameActionResult HandleDrawCard(RoomModel room, MythicCardsState state, string playerId)
    {
        if (state.AwaitingDefusePlacement)
        {
            return new GameActionResult { Success = false, Message = "Đang chờ người chơi chọn vị trí giấu Bẫy!" };
        }

        if (state.Deck.Count == 0)
        {
            return new GameActionResult { Success = false, Message = "Bộ bài rút đã hết!" };
        }

        var drawnCard = state.Deck[0];
        state.Deck.RemoveAt(0);

        var player = room.Players.First(p => p.PlayerId == playerId);
        var hand = state.PlayerHands[playerId];

        return ProcessDrawnCard(room, state, playerId, drawnCard, player, hand, isFromBottom: false);
    }

    private GameActionResult ProcessDrawnCard(RoomModel room, MythicCardsState state, string playerId, CardModel drawnCard, PlayerModel player, List<CardModel> hand, bool isFromBottom)
    {
        if (drawnCard.Type == CardType.ExplodingTrap)
        {
            state.IsExploding = true;
            state.ExplodingPlayerId = playerId;
            state.ExplodeExpiryTime = DateTime.UtcNow.AddSeconds(10);
            
            hand.Add(drawnCard);
            state.GameLogs.Add($"💣 BÁO ĐỘNG! {player.PlayerName} rút phải BẪY NỔ {(isFromBottom ? "từ dưới đáy" : "")}! Có 10 giây để Gỡ Bẫy!");

            return new GameActionResult
            {
                Success = true,
                ActionType = "player_is_exploding",
                Data = SanitizeStateForBroadcast(room, state)
            };
        }
        else
        {
            hand.Add(drawnCard);
            state.GameLogs.Add($"{player.PlayerName} đã rút 1 lá bài {(isFromBottom ? "từ dưới đáy" : "")}.");
            state.TurnsToTake--;

            if (state.TurnsToTake <= 0)
            {
                AdvanceTurn(room, state);
            }

            return new GameActionResult
            {
                Success = true,
                ActionType = "card_drawn",
                Data = new
                {
                    PlayerId = playerId,
                    DrawnCardType = drawnCard.Type.ToString(),
                    RoomState = SanitizeStateForBroadcast(room, state)
                }
            };
        }
    }

    private GameActionResult HandleInsertTrap(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!state.AwaitingDefusePlacement || state.PendingDefusePlayerId != playerId)
        {
            return new GameActionResult { Success = false, Message = "Không ở trong trạng thái nhét Bẫy" };
        }

        int insertIndex = 0;
        if (payload.TryGetProperty("insertIndex", out var idxProp))
        {
            insertIndex = idxProp.GetInt32();
        }

        var insertCard = state.DiscardPile.FirstOrDefault(c => c.Type == CardType.ExplodingTrap) 
                         ?? new CardModel { Type = CardType.ExplodingTrap, Name = "Bẫy Nổ", Description = "Rút phải là TOANG!", Icon = "💣", Color = "#ef4444" };
        
        state.DiscardPile.Remove(insertCard);
        
        if (insertIndex > state.Deck.Count) insertIndex = state.Deck.Count;
        if (insertIndex < 0) insertIndex = 0;
        
        state.Deck.Insert(insertIndex, insertCard);
        
        state.AwaitingDefusePlacement = false;
        state.PendingDefusePlayerId = null;

        var player = room.Players.First(p => p.PlayerId == playerId);
        state.GameLogs.Add($"🛡️ {player.PlayerName} đã giấu lại Bẫy Nổ vào bộ bài!");

        state.TurnsToTake--;
        if (state.TurnsToTake <= 0)
        {
            AdvanceTurn(room, state);
        }

        return new GameActionResult
        {
            Success = true,
            ActionType = "trap_reinserted",
            Data = new
            {
                PlayerId = playerId,
                InsertIndex = insertIndex,
                RoomState = SanitizeStateForBroadcast(room, state)
            }
        };
    }

    private GameActionResult HandleRearrangeFuture(RoomModel room, MythicCardsState state, string playerId, JsonElement payload)
    {
        if (!payload.TryGetProperty("newOrderIds", out var newOrderProp))
        {
            return new GameActionResult { Success = false, Message = "Thiếu newOrderIds" };
        }

        var newOrderIds = newOrderProp.EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        if (newOrderIds.Count != Math.Min(3, state.Deck.Count))
        {
            return new GameActionResult { Success = false, Message = "Số lượng bài sắp xếp không hợp lệ" };
        }

        var topCards = state.Deck.Take(newOrderIds.Count).ToList();
        var newTopCards = new List<CardModel>();

        foreach (var id in newOrderIds)
        {
            var card = topCards.FirstOrDefault(c => c.Id == id);
            if (card == null) return new GameActionResult { Success = false, Message = "Có ID không nằm trong top 3" };
            newTopCards.Add(card);
        }

        // Replace the top cards in the deck
        for (int i = 0; i < newTopCards.Count; i++)
        {
            state.Deck[i] = newTopCards[i];
        }

        var player = room.Players.First(p => p.PlayerId == playerId);
        state.GameLogs.Add($"🔮 {player.PlayerName} đã dùng phép Đổi Tương Lai thay đổi trật tự bộ bài!");

        return new GameActionResult
        {
            Success = true,
            ActionType = "future_rearranged",
            Data = new
            {
                PlayerId = playerId,
                RoomState = SanitizeStateForBroadcast(room, state)
            }
        };
    }

    private void AdvanceTurn(RoomModel room, MythicCardsState state)
    {
        int aliveCount = room.Players.Count(p => p.IsAlive);
        if (aliveCount <= 1) return;

        do
        {
            state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;
        } while (!room.Players[state.CurrentTurnIndex].IsAlive);

        state.TurnsToTake = 1;
    }

    private GameActionResult CheckGameOverOrContinue(RoomModel room, MythicCardsState state, string actionType, object data)
    {
        var alivePlayers = room.Players.Where(p => p.IsAlive).ToList();
        if (alivePlayers.Count <= 1)
        {
            var winner = alivePlayers.FirstOrDefault();
            return new GameActionResult
            {
                Success = true,
                ActionType = actionType,
                IsGameOver = true,
                WinnerId = winner?.PlayerId,
                WinnerName = winner?.PlayerName,
                Data = data
            };
        }

        return new GameActionResult
        {
            Success = true,
            ActionType = actionType,
            Data = data
        };
    }

    public object SanitizeStateForBroadcast(RoomModel room, object genericState)
    {
        var state = genericState as MythicCardsState;
        if (state == null) return new { };
        return new
        {
            DeckCount = state.Deck.Count,
            DiscardPile = state.DiscardPile,
            CurrentTurnPlayerId = room.Players[state.CurrentTurnIndex].PlayerId,
            CurrentTurnPlayerName = room.Players[state.CurrentTurnIndex].PlayerName,
            TurnsToTake = state.TurnsToTake,
            AwaitingDefusePlacement = state.AwaitingDefusePlacement,
            PendingDefusePlayerId = state.PendingDefusePlayerId,
            GameLogs = state.GameLogs.TakeLast(10).ToList(),
            PlayerCardCounts = state.PlayerHands.ToDictionary(k => k.Key, v => v.Value.Count),
            PlayerHands = state.PlayerHands, // Client JS sẽ lọc hoặc hiển thị theo connection ID của mình
            
            // Online Mechanics States
            IsExploding = state.IsExploding,
            ExplodingPlayerId = state.ExplodingPlayerId,
            ExplodeExpiryTime = state.ExplodeExpiryTime,
            AwaitingFavorResponse = state.AwaitingFavorResponse,
            PendingFavorSourceId = state.PendingFavorSourceId,
            PendingFavorTargetId = state.PendingFavorTargetId,
            CurrentPendingAction = state.CurrentPendingAction
        };
    }

    private void ShuffleList<T>(List<T> list)
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
