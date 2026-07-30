namespace Myth4Ever5.Api.Games.NumberBomb;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.NumberBomb.Models;

/// <summary>
/// Number Bomb (Bom Số 1-100) — A fast-paced party minigame.
/// Demonstrates how adding a new game requires ZERO edits to Core framework!
/// </summary>
public class NumberBombEngine : IGameEngine
{
    public string GameTypeId => "number_bomb";
    public string GameName   => "💣 Bom Số (Secret Bomb 1-100)";
    public int MinPlayers    => 2;
    public int MaxPlayers    => 8;

    private readonly Random _random = new();

    public Task<object> StartGameAsync(RoomModel room)
    {
        var state = new NumberBombState
        {
            SecretBombNumber = _random.Next(2, 100), // Random secret between 2 and 99
            MinRange = 1,
            MaxRange = 100,
            CurrentTurnIndex = _random.Next(0, room.Players.Count)
        };

        foreach (var p in room.Players) p.IsAlive = true;

        var startingPlayer = room.Players[state.CurrentTurnIndex];
        state.GameLogs.Add($"🎮 Bắt đầu trò chơi Bom Số! Số bí mật nằm trong khoảng 1 đến 100.");
        state.GameLogs.Add($"🎲 Lượt đầu tiên thuộc về {startingPlayer.PlayerName}.");

        room.GameState = state;
        return Task.FromResult<object>(SanitizeStateForBroadcast(room, state));
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not NumberBombState state)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Game state không hợp lệ" });

        if (actionType != "guess_number")
            return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ" });

        var currentPlayer = room.Players[state.CurrentTurnIndex];
        if (currentPlayer.PlayerId != playerId)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Chưa đến lượt của bạn!" });

        if (!payload.TryGetProperty("number", out var numProp) || numProp.ValueKind != JsonValueKind.Number)
            return Task.FromResult(new GameActionResult { Success = false, Message = "Vui lòng nhập một số hợp lệ!" });

        int guess = numProp.GetInt32();

        if (guess <= state.MinRange || guess >= state.MaxRange)
        {
            return Task.FromResult(new GameActionResult
            {
                Success = false,
                Message = $"Số đoán phải nằm TRONG KHỎANG ({state.MinRange} < N < {state.MaxRange})!"
            });
        }

        // Check if hit the bomb
        if (guess == state.SecretBombNumber)
        {
            currentPlayer.IsAlive = false;
            state.IsExploding = true;
            state.ExplodedPlayerId = playerId;

            state.GameLogs.Add($"💥 BÙM!!! {currentPlayer.PlayerName} đã đoán đúng số bí mật [{guess}] và bị NỔ TUNG!");

            // Determine winner (the alive survivor)
            var survivors = room.Players.Where(p => p.IsAlive).ToList();
            var winner = survivors.FirstOrDefault() ?? room.Players.FirstOrDefault(p => p.PlayerId != playerId);

            state.WinnerPlayerId = winner?.PlayerId;

            return Task.FromResult(new GameActionResult
            {
                Success = true,
                ActionType = "bomb_exploded",
                IsGameOver = true,
                WinnerId = winner?.PlayerId,
                WinnerName = winner?.PlayerName,
                Data = SanitizeStateForBroadcast(room, state)
            });
        }

        // Adjust range
        if (guess < state.SecretBombNumber)
        {
            state.MinRange = guess;
            state.GameLogs.Add($"🔹 {currentPlayer.PlayerName} đoán {guess} ➔ Khoảng an toàn mới: {state.MinRange} ... {state.MaxRange}");
        }
        else
        {
            state.MaxRange = guess;
            state.GameLogs.Add($"🔹 {currentPlayer.PlayerName} đoán {guess} ➔ Khoảng an toàn mới: {state.MinRange} ... {state.MaxRange}");
        }

        // Advance turn
        do
        {
            state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % room.Players.Count;
        } while (!room.Players[state.CurrentTurnIndex].IsAlive);

        return Task.FromResult(new GameActionResult
        {
            Success = true,
            ActionType = "number_guessed",
            Data = SanitizeStateForBroadcast(room, state)
        });
    }

    public object SanitizeStateForBroadcast(RoomModel room, object genericState)
    {
        if (genericState is not NumberBombState state) return new { };

        return new
        {
            MinRange = state.MinRange,
            MaxRange = state.MaxRange,
            CurrentTurnPlayerId = room.Players[state.CurrentTurnIndex].PlayerId,
            CurrentTurnPlayerName = room.Players[state.CurrentTurnIndex].PlayerName,
            GameLogs = state.GameLogs.TakeLast(10).ToList(),
            ExplodedPlayerId = state.ExplodedPlayerId,
            WinnerPlayerId = state.WinnerPlayerId,
            // Only reveal secret number if game is over
            SecretBombNumber = state.ExplodedPlayerId != null ? (int?)state.SecretBombNumber : null
        };
    }
}
