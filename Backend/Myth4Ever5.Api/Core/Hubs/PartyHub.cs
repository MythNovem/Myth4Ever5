namespace Myth4Ever5.Api.Core.Hubs;

using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Core.Services;
using Myth4Ever5.Api.Games.HexaHive.Models;
using Myth4Ever5.Api.Games.HexaHive.Services;

public class PartyHub : Hub<IPartyClient>
{
    private readonly RoomManager _roomManager;
    private readonly GameEngineFactory _engineFactory;

    public PartyHub(RoomManager roomManager, GameEngineFactory engineFactory)
    {
        _roomManager = roomManager;
        _engineFactory = engineFactory;
    }

    public async Task CreateRoom(string playerId, string playerName, string avatarUrl)
    {
        var room = _roomManager.CreateRoom(playerId, Context.ConnectionId, playerName, avatarUrl);
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);

        await Clients.Caller.RoomStateUpdated(room);
    }

    public async Task JoinRoom(string roomCode, string playerId, string playerName, string avatarUrl)
    {
        var existingRoom = _roomManager.GetRoom(roomCode);
        int maxPlayers = 4;
        if (existingRoom != null)
        {
            var engine = _engineFactory.GetEngine(existingRoom.SelectedGameTypeId);
            if (engine != null) maxPlayers = engine.MaxPlayers;
        }

        var result = _roomManager.JoinRoom(roomCode, playerId, Context.ConnectionId, playerName, avatarUrl, maxPlayers);
        if (!result.Success || result.Room == null)
        {
            await Clients.Caller.ErrorNotification(result.Message);
            return;
        }

        var room = result.Room;
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);

        var newPlayer = room.Players.First(p => p.PlayerId == playerId);
        await Clients.Group(room.RoomCode).PlayerJoined(newPlayer, room.Players);
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
    }

    public async Task RejoinRoom(string roomCode, string playerId)
    {
        var room = _roomManager.GetRoom(roomCode);
        if (room == null)
        {
            await Clients.Caller.ErrorNotification("Không tìm thấy phòng chơi!");
            return;
        }

        var existingPlayer = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (existingPlayer == null)
        {
            await Clients.Caller.ErrorNotification("Bạn không thuộc phòng này!");
            return;
        }

        existingPlayer.ConnectionId = Context.ConnectionId;
        existingPlayer.IsConnected = true;
        
        if (existingPlayer.IsHost)
        {
            room.HostConnectionId = Context.ConnectionId;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        
        if (room.IsGameStarted)
        {
            var engine = _engineFactory.GetEngine(room.SelectedGameTypeId);
            if (engine != null)
            {
                var sanitizedState = engine.SanitizeStateForBroadcast(room, room.GameState!);
                await Clients.Caller.GameStarted(engine.GameTypeId, sanitizedState);
            }
        }
    }

    public async Task SelectGame(string gameTypeId)
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null)
        {
            await Clients.Caller.ErrorNotification("Không tìm thấy phòng chơi!");
            return;
        }

        if (room.HostConnectionId != Context.ConnectionId)
        {
            await Clients.Caller.ErrorNotification("Chỉ có Chủ phòng mới có quyền chọn Game!");
            return;
        }

        var engine = _engineFactory.GetEngine(gameTypeId);
        if (engine == null)
        {
            await Clients.Caller.ErrorNotification("Game không hợp lệ!");
            return;
        }

        room.SelectedGameTypeId = gameTypeId;
        if (gameTypeId != "hexahive")
        {
            var botPlayers = room.Players.Where(p => p.IsBot).ToList();
            foreach (var bot in botPlayers)
            {
                _roomManager.KickPlayer(room.RoomCode, room.HostConnectionId, bot.PlayerId);
            }
        }
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
    }

    public async Task ToggleReady()
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null || room.IsGameStarted) return;

        var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (player == null || player.IsHost) return;

        player.IsReady = !player.IsReady;
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);
    }

    public async Task AddBot()
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null || room.IsGameStarted) return;

        if (room.SelectedGameTypeId != "hexahive")
        {
            await Clients.Caller.ErrorNotification("🤖 Bot AI hiện tại chỉ hỗ trợ trò chơi 🐝 HexaHive: Bug Tactics!");
            return;
        }

        var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (player == null || !player.IsHost) return;

        var engine = _engineFactory.GetEngine(room.SelectedGameTypeId);
        int maxPlayers = engine?.MaxPlayers ?? 4;

        var result = _roomManager.AddBotPlayer(room.RoomCode, maxPlayers);
        if (result.Success)
        {
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
        else
        {
            await Clients.Caller.ErrorNotification(result.Message);
        }
    }

    public async Task KickPlayer(string targetPlayerId)
    {
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null) return;

        var result = _roomManager.KickPlayer(room.RoomCode, Context.ConnectionId, targetPlayerId);
        if (result.Success && result.KickedPlayer != null)
        {
            var kicked = result.KickedPlayer;
            if (!kicked.IsBot && !string.IsNullOrEmpty(kicked.ConnectionId))
            {
                await Clients.Client(kicked.ConnectionId).PlayerKicked("Bạn đã bị Chủ phòng mời ra khỏi phòng!");
                await Groups.RemoveFromGroupAsync(kicked.ConnectionId, room.RoomCode);
            }

            await Clients.Group(room.RoomCode).PlayerLeft(kicked.ConnectionId, room.Players);
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
        else
        {
            await Clients.Caller.ErrorNotification(result.Message);
        }
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

        var unready = room.Players.Where(p => !p.IsHost && !p.IsReady).ToList();
        if (unready.Count > 0)
        {
            var names = string.Join(", ", unready.Select(p => p.PlayerName));
            await Clients.Caller.ErrorNotification($"Vẫn còn người chơi chưa Sẵn sàng: {names}!");
            return;
        }

        room.IsGameStarted = true;
        var initialData = await engine.StartGameAsync(room);

        await Clients.Group(room.RoomCode).GameStarted(engine.GameTypeId, initialData);
        await Clients.Group(room.RoomCode).RoomStateUpdated(room);

        if (room.GameState is HexaHiveState hState)
        {
            var startingP = room.Players[hState.CurrentTurnIndex];
            if (startingP.IsBot)
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(800);
                    await ProcessBotTurnAsync(room);
                });
            }
        }
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

        var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (player == null) return;

        var result = await engine.ProcessActionAsync(room, player.PlayerId, actionType, payload);
        if (!result.Success)
        {
            await Clients.Caller.ErrorNotification(result.Message);
            return;
        }

        await Clients.Group(room.RoomCode).GameActionBroadcast(result.ActionType, result.Data ?? new { });

        if (result.IsGameOver)
        {
            room.IsGameStarted = false;
            foreach (var p in room.Players.Where(p => !p.IsHost && !p.IsBot)) p.IsReady = false;
            await Clients.Group(room.RoomCode).GameOver(result.WinnerId ?? "", result.WinnerName ?? "Vô danh", result.Data ?? new { });
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
        else if (room.GameState is HexaHiveState hState)
        {
            var nextP = room.Players[hState.CurrentTurnIndex];
            if (nextP.IsBot)
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(800);
                    await ProcessBotTurnAsync(room);
                });
            }
        }
    }

    private async Task ProcessBotTurnAsync(RoomModel room)
    {
        if (!room.IsGameStarted || room.GameState is not HexaHiveState state) return;

        var botPlayer = room.Players[state.CurrentTurnIndex];
        if (!botPlayer.IsBot) return;

        var choice = HiveAiEngine.CalculateBestMove(state, botPlayer.PlayerId, room.Players);

        JsonElement payload;
        if (choice.ActionType == "place_piece")
        {
            payload = JsonSerializer.SerializeToElement(new { pieceId = choice.PieceId, q = choice.TargetCoord.Q, r = choice.TargetCoord.R });
        }
        else if (choice.ActionType == "move_piece")
        {
            payload = JsonSerializer.SerializeToElement(new { fromQ = choice.FromCoord.Q, fromR = choice.FromCoord.R, toQ = choice.TargetCoord.Q, toR = choice.TargetCoord.R });
        }
        else
        {
            payload = JsonSerializer.SerializeToElement(new { });
        }

        var engine = _engineFactory.GetEngine(room.SelectedGameTypeId);
        if (engine == null) return;

        var result = await engine.ProcessActionAsync(room, botPlayer.PlayerId, choice.ActionType, payload);
        if (!result.Success) return;

        await Clients.Group(room.RoomCode).GameActionBroadcast(result.ActionType, result.Data ?? new { });

        if (result.IsGameOver)
        {
            room.IsGameStarted = false;
            foreach (var p in room.Players.Where(p => !p.IsHost && !p.IsBot)) p.IsReady = false;
            await Clients.Group(room.RoomCode).GameOver(result.WinnerId ?? "", result.WinnerName ?? "Vô danh", result.Data ?? new { });
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
        else
        {
            if (room.Players[state.CurrentTurnIndex].IsBot)
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(800);
                    await ProcessBotTurnAsync(room);
                });
            }
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

    public async Task LeaveRoomExplicit(string playerId)
    {
        var (room, leftPlayer) = _roomManager.LeaveRoomExplicit(playerId);
        if (room != null && leftPlayer != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomCode);
            await Clients.Group(room.RoomCode).PlayerLeft(leftPlayer.ConnectionId, room.Players);
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _roomManager.HandleDisconnect(Context.ConnectionId);
        
        var room = _roomManager.GetRoomByConnectionId(Context.ConnectionId);
        if (room != null)
        {
            await Clients.Group(room.RoomCode).RoomStateUpdated(room);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
