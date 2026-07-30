namespace Myth4Ever5.Api.Core.Interfaces;

using System.Text.Json;
using Myth4Ever5.Api.Core.Models;

/// <summary>
/// Interface for individual action handlers within a game engine.
/// Each handler is responsible for exactly one action type (Single Responsibility).
/// New actions can be added without modifying the engine (Open/Closed).
/// </summary>
public interface IGameActionHandler<TState>
{
    string ActionType { get; }
    GameActionResult Handle(RoomModel room, TState state, string playerId, JsonElement payload);
}
