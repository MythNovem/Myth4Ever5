namespace Myth4Ever5.Api.Games.MythicRacer;

using System.Text.Json;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.MythicRacer.Models;
using Myth4Ever5.Api.Games.MythicRacer.Services;

public class MythicRacerEngine : IGameEngine
{
    public string GameTypeId => "mythic_racer";
    public string GameName => "🏎️ Mythic Racer: Nitro Party (Đua Xe 2D)";
    public int MinPlayers => 2;
    public int MaxPlayers => 4;

    public object SanitizeStateForBroadcast(RoomModel room, object state)
    {
        return state;
    }

    private static readonly string[] CarColors = new[] { "#ef4444", "#3b82f6", "#22c55e", "#eab308" };

    public Task<object> StartGameAsync(RoomModel room)
    {
        var track = TrackRegistry.GetTrack("f1_monaco");

        var state = new MythicRacerState
        {
            SelectedTrackId = track.TrackId,
            Track = track,
            TotalLaps = 3,
            IsCountdown = true,
            CountdownTimer = 3.0f,
            IsGameOver = false
        };

        // Initialize Item Boxes on track
        for (int i = 0; i < track.ItemBoxLocations.Count; i++)
        {
            var loc = track.ItemBoxLocations[i];
            state.ItemBoxes.Add(new ItemBoxModel
            {
                Id = i + 1,
                X = loc.X,
                Y = loc.Y,
                IsActive = true
            });
        }

        // Initialize Cars for players
        for (int i = 0; i < room.Players.Count; i++)
        {
            var player = room.Players[i];
            var spawnPoint = track.GridStartPositions[i % track.GridStartPositions.Count];

            var car = new CarModel
            {
                PlayerId = player.PlayerId,
                PlayerName = player.PlayerName,
                Color = CarColors[i % CarColors.Length],
                X = spawnPoint.Position.X,
                Y = spawnPoint.Position.Y,
                Angle = spawnPoint.Angle,
                Speed = 0,
                MaxSpeed = 8.5f,
                CurrentLap = 1,
                LastPassedCheckpoint = -1
            };

            state.Cars[player.PlayerId] = car;
        }

        state.RaceLogs.Add("🚦 Đèn tín hiệu xuất phát chớp tắt... CHUẨN BỊ!");
        room.GameState = state;

        return Task.FromResult<object>(state);
    }

    public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload)
    {
        if (room.GameState is not MythicRacerState state)
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Trạng thái game chưa khởi tạo!" });
        }

        if (!state.Cars.TryGetValue(playerId, out var car))
        {
            return Task.FromResult(new GameActionResult { Success = false, Message = "Không tìm thấy tay đua!" });
        }

        switch (actionType)
        {
            case "update_input":
                if (payload.ValueKind == JsonValueKind.Object)
                {
                    if (payload.TryGetProperty("steerLeft", out var sl)) car.SteerLeft = sl.GetBoolean();
                    if (payload.TryGetProperty("steerRight", out var sr)) car.SteerRight = sr.GetBoolean();
                    if (payload.TryGetProperty("accelerate", out var acc)) car.Accelerate = acc.GetBoolean();
                    if (payload.TryGetProperty("reverse", out var rev)) car.Reverse = rev.GetBoolean();
                }

                // Tick physics step
                RacePhysicsEngine.UpdatePhysics(state, 0.05f); // 20Hz update tick

                return Task.FromResult(new GameActionResult
                {
                    Success = true,
                    ActionType = "race_tick",
                    IsGameOver = state.IsGameOver,
                    WinnerId = state.WinnerPlayerId,
                    WinnerName = state.WinnerName,
                    Data = state
                });

            case "use_item":
                RacePhysicsEngine.TriggerItemAction(state, playerId);
                RacePhysicsEngine.UpdatePhysics(state, 0.05f);

                return Task.FromResult(new GameActionResult
                {
                    Success = true,
                    ActionType = "item_used",
                    IsGameOver = state.IsGameOver,
                    WinnerId = state.WinnerPlayerId,
                    WinnerName = state.WinnerName,
                    Data = state
                });

            case "tick":
                RacePhysicsEngine.UpdatePhysics(state, 0.05f);

                return Task.FromResult(new GameActionResult
                {
                    Success = true,
                    ActionType = "race_tick",
                    IsGameOver = state.IsGameOver,
                    WinnerId = state.WinnerPlayerId,
                    WinnerName = state.WinnerName,
                    Data = state
                });

            default:
                return Task.FromResult(new GameActionResult { Success = false, Message = "Hành động không hợp lệ!" });
        }
    }
}
