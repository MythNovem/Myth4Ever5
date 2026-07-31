namespace Myth4Ever5.Api.Core.Interfaces;

using Myth4Ever5.Api.Core.Models;

public interface IPartyClient
{
    Task PlayerJoined(PlayerModel newPlayer, List<PlayerModel> roomPlayers);
    Task PlayerLeft(string connectionId, List<PlayerModel> remainingPlayers);
    Task RoomStateUpdated(RoomModel room);
    Task GameStarted(string gameTypeId, object initialGameState);
    Task GameActionBroadcast(string actionType, object data);
    Task GameOver(string winnerId, string winnerName, object summary);
    Task ReceiveChatMessage(string senderId, string senderName, string senderAvatar, string message, string timestamp);
    Task ReceiveEmojiReaction(string senderId, string senderName, string emoji);
    Task PlayerKicked(string reason);
    Task ErrorNotification(string errorMessage);
}
