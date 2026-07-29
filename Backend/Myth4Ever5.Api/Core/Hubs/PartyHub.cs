namespace Myth4Ever5.Api.Core.Hubs;

using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Core.Services;

public class PartyHub : Hub<IPartyClient>
{
    private readonly RoomManager _roomManager;
    private readonly GameEngineFactory _engineFactory;

    public PartyHub(RoomManager roomManager, GameEngineFactory engineFactory)
    {
        _roomManager = roomManager;
        _engineFactory = engineFactory;
    }

    public async Task CreateRoom(string playerName, string avatarUrl)
    {
        var room = _roomManager.CreateRoom(Context.ConnectionId, playerName, avatarUrl);
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);

        await Clients.Caller.RoomStateUpdated(room);
    }

    public async Task JoinRoom(string roomCode, string playerName, string avatarUrl)
    {
        var result = _roomManager.JoinRoom(roomCode, Context.ConnectionId, playerName, avatarUrl);
        if (!result.Success || result.Room == null)
        {
            await Clients.Caller.ErrorNotification(result.Message);
            return;
        }

        var room = result.Room;
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);

        var newPlayer = room.Players.First(p => p.ConnectionId == Context.ConnectionId);
        await Clients.Group(room.RoomCode).PlayerJoined(newPlayer, room.Players);
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
    }

    public async Task StartGame()
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null)
        {
            await Clients.Caller.ErrorNotification("Không tìm thấy phòng chơi!");
            return;
        }

        if (room.HostConnectionId != Context.ConnectionId)
        {
            await Clients.Caller.ErrorNotification("Chỉ có Chủ phòng mới có quyền Bắt đầu Game!");
            return;
        }

        var engine = _engineFactory.GetEngine(room.SelectedGameTypeId);
        if (engine == null)
        {
            await Clients.Caller.ErrorNotification("Loại game này chưa được hỗ trợ!");
            return;
        }

        if (room.Players.Count < engine.MinPlayers)
        {
            await Clients.Caller.ErrorNotification($"Cần tối thiểu {engine.MinPlayers} người chơi để bắt đầu game này!");
            return;
        }

        room.IsGameStarted = true;
        var initialData = await engine.StartGameAsync(room);

        await Clients.Group(room.RoomCode).GameStarted(engine.GameTypeId, initialData);
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
    }

    public async Task SendGameAction(string actionType, JsonElement payload)
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null || !room.IsGameStarted)
        {
            await Clients.Caller.ErrorNotification("Phòng chưa bắt đầu game!");
            return;
        }

        var engine = _engineFactory.GetEngine(room.SelectedGameTypeId);
        if (engine == null)
        {
            await Clients.Caller.ErrorNotification("Loại game không hợp lệ!");
            return;
        }

        var result = await engine.ProcessActionAsync(room, Context.ConnectionId, actionType, payload);
        if (!result.Success)
        {
            await Clients.Caller.ErrorNotification(result.Message);
            return;
        }

        await Clients.Group(room.RoomCode).GameActionBroadcast(result.ActionType, result.Data ?? new { });

        if (result.IsGameOver)
        {
            room.IsGameStarted = false;
            await Clients.Group(room.RoomCode).GameOver(result.WinnerId ?? "", result.WinnerName ?? "Vô danh", result.Data ?? new { });
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
    }

    public async Task SendChatMessage(string message)
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null) return;

        var sender = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (sender == null) return;

        string timestamp = DateTime.Now.ToString("HH:mm");
        await Clients.Group(room.RoomCode).ReceiveChatMessage(sender.ConnectionId, sender.PlayerName, sender.AvatarUrl, message, timestamp);
    }

    public async Task SendEmojiReaction(string emoji)
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null) return;

        var sender = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (sender == null) return;

        await Clients.Group(room.RoomCode).ReceiveEmojiReaction(sender.ConnectionId, sender.PlayerName, emoji);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (room, leftPlayer) = _roomManager.LeaveRoom(Context.ConnectionId);
        if (room != null && leftPlayer != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomCode);
            await Clients.Group(room.RoomCode).PlayerLeft(Context.ConnectionId, room.Players);
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
