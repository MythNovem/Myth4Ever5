namespace Myth4Ever5.Api.Games.HexaHive;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.HexaHive.Models;
using Myth4Ever5.Api.Games.HexaHive.Services;

public class HexaHiveEngine : IGameEngine
{
    public string GameTypeId => "hexahive";
    public string GameName => "🐝 HexaHive: Bug Tactics (Cờ Lục Giác)";
    public int MinPlayers => 2;
    public int MaxPlayers => 2;

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new HexaHiveState
        {
            TurnNumber = 1,
            CurrentTurnIndex = 0,
            IsExpansionEnabled = true
        };

        for (int i = 0; i < room.Players.Count; i++)
        {
            var p = room.Players[i];
            p.IsAlive = true;
            state.QueenPlaced[p.PlayerId] = false;

            var hand = CreateInitialHand(p.PlayerId, p.PlayerName, i, state.IsExpansionEnabled);
            state.UnplacedHands[p.PlayerId] = hand;
        }

        var startingPlayer = room.Players[0];
        state.GameLogs.Add($"🎮 Bắt đầu trận đấu HexaHive!");
        state.GameLogs.Add($"🎲 Lượt 1 thuộc về {startingPlayer.PlayerName} (Trắng/Tím).");

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not HexaHiveState state)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Game state không hợp lệ!" });

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        if (currentPlayer.PlayerId != playerId)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });

        switch (actionType)
        {
            case "place_piece":
                return HandlePlacePiece(room, state, playerId, currentPlayer, payload);

            case "move_piece":
                return HandleMovePiece(room, state, playerId, currentPlayer, payload);

            case "pass_turn":
                return HandlePassTurn(room, state, playerId, currentPlayer);

            case "surrender":
                return HandleSurrender(room, state, playerId, currentPlayer);

            default:
                return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ!" });
        }
    }

    private Task<GameActionResult> HandlePlacePiece(RoomModel room, HexaHiveState state, string playerId, PlayerModel currentPlayer, JsonElement payload)
    {
        if (!payload.TryGetProperty("pieceId", out var pIdProp) ||
            !payload.TryGetProperty("q", out var qProp) ||
            !payload.TryGetProperty("r", out var rProp))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Dữ liệu đặt quân thiếu thuộc tính!" });
        }

        string pieceId = pIdProp.GetString() ?? "";
        int targetQ = qProp.GetInt32();
        int targetR = rProp.GetInt32();
        var targetCoord = new HexCoord(targetQ, targetR);

        if (!state.UnplacedHands.TryGetValue(playerId, out var hand))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Không tìm thấy kho quân cờ!" });
        }

        var piece = hand.FirstOrDefault(p => p.Id == pieceId);
        if (piece == null)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Quân cờ không có trong kho!" });
        }

        // Turn 4 Queen Bee Enforcement: On 4th turn for this player, if Queen not placed, MUST place Queen Bee
        int playerTurnCount = (state.TurnNumber + 1) / 2;
        if (playerTurnCount >= 4 && !state.QueenPlaced[playerId] && piece.PieceType != "queen")
        {
            return Task.FromResult(new GameActionResult
            {
                Success = false,
                Message = "⚠️ Lượt thứ 4! Bạn BẮT BUỘC phải đặt 👑 Ong Chúa ra bàn cờ!"
            });
        }

        // Validate placement rules
        if (!HiveRulesEngine.IsValidPlacement(state, playerId, targetCoord))
        {
            return Task.FromResult(new GameActionResult
            {
                Success = false,
                Message = "Vị trí đặt quân không hợp lệ! (Phải tiếp xúc quân mình và KHÔNG chạm quân địch)."
            });
        }

        // Execute placement
        hand.Remove(piece);
        string key = targetCoord.ToString();
        if (!state.Board.ContainsKey(key)) state.Board[key] = new List<HivePiece>();

        piece.StackHeight = state.Board[key].Count;
        state.Board[key].Add(piece);

        if (piece.PieceType == "queen")
        {
            state.QueenPlaced[playerId] = true;
        }

        state.GameLogs.Add($"🔹 {currentPlayer.PlayerName} đặt {piece.GetIcon()} {piece.GetDisplayName()} tại ô ({targetQ}, {targetR}).");
        state.LastMovedPieceId = piece.Id;
        state.ImmobilePieceId = null;

        return CompleteTurn(room, state, "piece_placed");
    }

    private Task<GameActionResult> HandleMovePiece(RoomModel room, HexaHiveState state, string playerId, PlayerModel currentPlayer, JsonElement payload)
    {
        if (!payload.TryGetProperty("fromQ", out var fqProp) ||
            !payload.TryGetProperty("fromR", out var frProp) ||
            !payload.TryGetProperty("toQ", out var tqProp) ||
            !payload.TryGetProperty("toR", out var trProp))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Dữ liệu di chuyển thiếu tọa độ!" });
        }

        var fromCoord = new HexCoord(fqProp.GetInt32(), frProp.GetInt32());
        var toCoord = new HexCoord(tqProp.GetInt32(), trProp.GetInt32());

        var validMoves = HiveRulesEngine.GetValidMoves(state, playerId, fromCoord);
        if (!validMoves.Contains(toCoord))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Nước đi không hợp lệ!" });
        }

        string fromKey = fromCoord.ToString();
        string toKey = toCoord.ToString();

        var stack = state.Board[fromKey];
        var piece = stack[^1];
        stack.RemoveAt(stack.Count - 1);
        if (stack.Count == 0) state.Board.Remove(fromKey);

        if (!state.Board.ContainsKey(toKey)) state.Board[toKey] = new List<HivePiece>();
        piece.StackHeight = state.Board[toKey].Count;
        state.Board[toKey].Add(piece);

        state.GameLogs.Add($"🔹 {currentPlayer.PlayerName} di chuyển {piece.GetIcon()} {piece.GetDisplayName()} từ ({fromCoord.Q},{fromCoord.R}) ➔ ({toCoord.Q},{toCoord.R}).");
        state.LastMovedPieceId = piece.Id;
        state.ImmobilePieceId = null;

        return CompleteTurn(room, state, "piece_moved");
    }

    private Task<GameActionResult> HandlePassTurn(RoomModel room, HexaHiveState state, string playerId, PlayerModel currentPlayer)
    {
        state.GameLogs.Add($"⏩ {currentPlayer.PlayerName} không có nước đi hợp lệ và bỏ qua lượt.");
        return CompleteTurn(room, state, "turn_passed");
    }

    private Task<GameActionResult> CompleteTurn(RoomModel room, HexaHiveState state, string actionType)
    {
        // Check game over
        var (isGameOver, winnerId, winnerName, isDraw) = HiveRulesEngine.CheckGameOver(state, room.Players);

        if (isGameOver)
        {
            state.WinnerPlayerId = winnerId;
            state.WinnerName = winnerName;
            state.IsDraw = isDraw;

            if (isDraw)
            {
                state.GameLogs.Add($"🤝 TRẬN ĐẤU HÒA! Cả 2 Ong Chúa đều bị bao vây cùng lúc!");
            }
            else
            {
                state.GameLogs.Add($"🏆 TRẬN ĐẤU KẾT THÚC! Người chiến thắng: {winnerName}!");
            }

            return Task.FromResult(new GameActionResult
            {
                Success = true,
                ActionType = actionType,
                IsGameOver = true,
                WinnerId = winnerId,
                WinnerName = winnerName,
                Data = SanitizeStateForBroadcast(room, state)
            });
        }

        // Advance turn
        state.TurnNumber++;
        state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;

        return Task.FromResult(new GameActionResult
        {
            Success = true,
            ActionType = actionType,
            Data = SanitizeStateForBroadcast(room, state)
        });
    }

    private List<HivePiece> CreateInitialHand(string playerId, string playerName, int ownerIndex, bool enableExpansions)
    {
        var hand = new List<HivePiece>
        {
            new HivePiece { PieceType = "queen", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "ant", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "ant", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "ant", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "spider", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "spider", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "grasshopper", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "grasshopper", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "grasshopper", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "beetle", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex },
            new HivePiece { PieceType = "beetle", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex }
        };

        if (enableExpansions)
        {
            hand.Add(new HivePiece { PieceType = "ladybug", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex });
            hand.Add(new HivePiece { PieceType = "mosquito", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex });
            hand.Add(new HivePiece { PieceType = "pillbug", OwnerId = playerId, OwnerName = playerName, OwnerIndex = ownerIndex });
        }

        return hand;
    }

    private Task<GameActionResult> HandleSurrender(RoomModel room, HexaHiveState state, string playerId, PlayerModel currentPlayer)
    {
        var opponent = room.Players.FirstOrDefault(p => p.PlayerId != playerId);
        string winnerId = opponent?.PlayerId ?? "";
        string winnerName = opponent?.PlayerName ?? "Đối thủ";

        state.WinnerPlayerId = winnerId;
        state.WinnerName = winnerName;
        state.IsDraw = false;
        state.GameLogs.Add($"🏳️ {currentPlayer.PlayerName} đã xin đầu hàng! Chiến thắng thuộc về {winnerName}!");

        return Task.FromResult(new GameActionResult
        {
            Success = true,
            ActionType = "surrender",
            IsGameOver = true,
            WinnerId = winnerId,
            WinnerName = winnerName,
            Data = SanitizeStateForBroadcast(room, state)
        });
    }

    public object SanitizeStateForBroadcast(RoomModel room, object genericState)
    {
        if (genericState is not HexaHiveState state) return new { };

        var currentTurnPlayer = room.Players.ElementAtOrDefault(state.CurrentTurnIndex);

        return new
        {
            Board = state.Board,
            UnplacedHands = state.UnplacedHands,
            QueenPlaced = state.QueenPlaced,
            TurnNumber = state.TurnNumber,
            CurrentTurnPlayerId = currentTurnPlayer?.PlayerId ?? "",
            CurrentTurnPlayerName = currentTurnPlayer?.PlayerName ?? "",
            CurrentTurnIndex = state.CurrentTurnIndex,
            GameLogs = state.GameLogs.TakeLast(10).ToList(),
            WinnerPlayerId = state.WinnerPlayerId,
            WinnerName = state.WinnerName,
            IsDraw = state.IsDraw
        };
    }
}
