namespace Myth4Ever5.Api.Core.Services;

using System.Collections.Concurrent;
using Myth4Ever5.Api.Core.Models;

public class RoomManager
{
    private readonly ConcurrentDictionary<string, RoomModel> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _playerToRoom = new();
    private readonly Random _random = new();

    public RoomModel CreateRoom(string playerId, string hostConnectionId, string hostPlayerName, string hostAvatarUrl)
    {
        string roomCode = GenerateUniqueRoomCode();
        var hostPlayer = new PlayerModel
        {
            PlayerId = playerId,
            ConnectionId = hostConnectionId,
            PlayerName = hostPlayerName,
            AvatarUrl = hostAvatarUrl,
            IsHost = true,
            IsConnected = true
        };

        var room = new RoomModel
        {
            RoomCode = roomCode,
            HostConnectionId = hostConnectionId,
            Players = new List<PlayerModel> { hostPlayer },
            SelectedGameTypeId = "mythic_cards"
        };

        _rooms[roomCode] = room;
        _playerToRoom[playerId] = roomCode;
        return room;
    }

    public (bool Success, string Message, RoomModel? Room) JoinRoom(string roomCode, string playerId, string connectionId, string playerName, string avatarUrl)
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

        var existingPlayer = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (existingPlayer == null)
        {
            var newPlayer = new PlayerModel
            {
                PlayerId = playerId,
                ConnectionId = connectionId,
                PlayerName = playerName,
                AvatarUrl = avatarUrl,
                IsHost = false,
                IsConnected = true
            };

            room.Players.Add(newPlayer);
            _playerToRoom[playerId] = roomCode;
        }
        else
        {
            existingPlayer.ConnectionId = connectionId;
            existingPlayer.PlayerName = playerName; // Update name/avatar on rejoin if changed
            existingPlayer.AvatarUrl = avatarUrl;
            existingPlayer.IsConnected = true;
        }

        return (true, "Vào phòng thành công", room);
    }

    public void HandleDisconnect(string connectionId)
    {
        var room = GetRoomByConnectionId(connectionId);
        if (room != null)
        {
            var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null)
            {
                player.IsConnected = false;
            }
        }
    }

    public (RoomModel? Room, PlayerModel? LeftPlayer) LeaveRoomExplicit(string playerId)
    {
        if (_playerToRoom.TryRemove(playerId, out var roomCode) && _rooms.TryGetValue(roomCode, out var room))
        {
            var player = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
            if (player != null)
            {
                if (room.IsGameStarted)
                {
                    player.IsConnected = false;
                }
                else
                {
                    room.Players.Remove(player);
                }

                if (room.Players.Count(p => p.IsConnected) == 0)
                {
                    _rooms.TryRemove(roomCode, out _);
                    return (null, player);
                }

                if (player.IsHost && room.Players.Count > 0)
                {
                    var nextHost = room.Players.FirstOrDefault(p => p.IsConnected);
                    if (nextHost != null)
                    {
                        nextHost.IsHost = true;
                        room.HostConnectionId = nextHost.ConnectionId;
                    }
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
        return _rooms.Values.FirstOrDefault(r => r.Players.Any(p => p.ConnectionId == connectionId));
    }

    public RoomModel? GetRoomByPlayerId(string playerId)
    {
        if (_playerToRoom.TryGetValue(playerId, out var roomCode))
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
