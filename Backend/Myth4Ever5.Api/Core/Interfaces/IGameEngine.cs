namespace Myth4Ever5.Api.Core.Interfaces;

using System.Text.Json;
using Myth4Ever5.Api.Core.Models;

public interface IGameEngine
{
    string GameTypeId { get; }
    string GameName { get; }
    int MinPlayers { get; }
    int MaxPlayers { get; }

    Task<object> StartGameAsync(RoomModel room);
    Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload);
    object SanitizeStateForBroadcast(RoomModel room, object state);
}
