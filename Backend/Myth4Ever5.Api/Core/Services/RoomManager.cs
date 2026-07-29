namespace Myth4Ever5.Api.Core.Services;

using System.Collections.Concurrent;
using Myth4Ever5.Api.Core.Models;

public class RoomManager
{
    private readonly ConcurrentDictionary<string, RoomModel> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _playerToRoom = new();
    private readonly Random _random = new();

    public RoomModel CreateRoom(string hostConnectionId, string hostPlayerName, string hostAvatarUrl)
    {
        string roomCode = GenerateUniqueRoomCode();
        var hostPlayer = new PlayerModel
        {
            ConnectionId = hostConnectionId,
            PlayerName = hostPlayerName,
            AvatarUrl = hostAvatarUrl,
            IsHost = true
        };

        var room = new RoomModel
        {
            RoomCode = roomCode,
            HostConnectionId = hostConnectionId,
            Players = new List<PlayerModel> { hostPlayer },
            SelectedGameTypeId = "mythic_cards"
        };

        _rooms[roomCode] = room;
        _playerToRoom[hostConnectionId] = roomCode;
        return room;
    }

    public (bool Success, string Message, RoomModel? Room) JoinRoom(string roomCode, string connectionId, string playerName, string avatarUrl)
    {
        roomCode = roomCode.Trim().ToUpper();
        if (!_rooms.TryGetValue(roomCode, out var room))
        {
            return (false, "Không tìm thấy phòng chơi!", null);
        }

        if (room.IsGameStarted)
        {
            return (false, "Phòng này đã bắt đầu game!", null);
        }

        if (room.Players.Count >= 4)
        {
            return (false, "Phòng đã đầy (tối đa 4 người)!", null);
        }

        var existingPlayer = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (existingPlayer == null)
        {
            var newPlayer = new PlayerModel
            {
                ConnectionId = connectionId,
                PlayerName = playerName,
                AvatarUrl = avatarUrl,
                IsHost = false
            };

            room.Players.Add(newPlayer);
            _playerToRoom[connectionId] = roomCode;
        }

        return (true, "Vào phòng thành công", room);
    }

    public (RoomModel? Room, PlayerModel? LeftPlayer) LeaveRoom(string connectionId)
    {
        if (_playerToRoom.TryRemove(connectionId, out var roomCode) && _rooms.TryGetValue(roomCode, out var room))
        {
            var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null)
            {
                room.Players.Remove(player);

                if (room.Players.Count == 0)
                {
                    _rooms.TryRemove(roomCode, out _);
                    return (null, player);
                }

                if (player.IsHost && room.Players.Count > 0)
                {
                    room.Players[0].IsHost = true;
                    room.HostConnectionId = room.Players[0].ConnectionId;
                }

                return (room, player);
            }
        }

        return (null, null);
    }

    public RoomModel? GetRoom(string roomCode)
    {
        _rooms.TryGetValue(roomCode.Trim().ToUpper(), out var room);
        return room;
    }

    public RoomModel? GetRoomByConnectionId(string connectionId)
    {
        if (_playerToRoom.TryGetValue(connectionId, out var roomCode))
        {
            return GetRoom(roomCode);
        }
        return null;
    }

    private string GenerateUniqueRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        string code;
        do
        {
            code = new string(Enumerable.Repeat(chars, 6).Select(s => s[_random.Next(s.Length)]).ToArray());
        } while (_rooms.ContainsKey(code));

        return code;
    }
}
