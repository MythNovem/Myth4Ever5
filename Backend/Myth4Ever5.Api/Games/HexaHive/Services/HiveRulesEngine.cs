namespace Myth4Ever5.Api.Games.HexaHive.Services;

using Myth4Ever5.Api.Games.HexaHive.Models;

public class HiveRulesEngine
{
    /// <summary>
    /// Checks if the hive remains a single connected graph if top piece at `from` is removed.
    /// </summary>
    public static bool CheckOneHiveRule(HexaHiveState state, HexCoord from)
    {
        if (!state.Board.TryGetValue(from.ToString(), out var stack) || stack.Count == 0)
            return true;

        // If there are other pieces on the stack below the top piece, removing the top piece does not disconnect position `from`
        if (stack.Count > 1)
            return true;

        // Get all active occupied hex positions except `from`
        var activeCoords = state.Board
            .Where(kvp => kvp.Key != from.ToString() && kvp.Value.Count > 0)
            .Select(kvp => HexCoord.Parse(kvp.Key))
            .ToHashSet();

        if (activeCoords.Count <= 1)
            return true;

        // Run BFS starting from any active coordinate
        var start = activeCoords.First();
        var visited = new HashSet<HexCoord> { start };
        var queue = new Queue<HexCoord>();
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            var curr = queue.Dequeue();
            foreach (var neighbor in curr.GetNeighbors())
            {
                if (activeCoords.Contains(neighbor) && visited.Add(neighbor))
                {
                    queue.Enqueue(neighbor);
                }
            }
        }

        return visited.Count == activeCoords.Count;
    }

    /// <summary>
    /// Checks Freedom to Slide between adjacent hexes `from` and `to` on ground level.
    /// </summary>
    public static bool CanSlideGround(HexaHiveState state, HexCoord from, HexCoord to)
    {
        var commonNeighbors = from.GetNeighbors().Where(n => n.DistanceTo(to) == 1).ToList();
        if (commonNeighbors.Count != 2) return false;

        bool n1Occupied = GetTopPiece(state, commonNeighbors[0]) != null;
        bool n2Occupied = GetTopPiece(state, commonNeighbors[1]) != null;

        // Cannot slide if both common neighbors are occupied (gate blocked)
        return !(n1Occupied && n2Occupied);
    }

    /// <summary>
    /// Gets top piece at given coord, or null if empty.
    /// </summary>
    public static HivePiece? GetTopPiece(HexaHiveState state, HexCoord coord)
    {
        if (state.Board.TryGetValue(coord.ToString(), out var stack) && stack.Count > 0)
        {
            return stack[^1];
        }
        return null;
    }

    /// <summary>
    /// Validates placement of a new piece.
    /// </summary>
    public static bool IsValidPlacement(HexaHiveState state, string playerId, HexCoord target)
    {
        // Must be an empty hex
        if (GetTopPiece(state, target) != null) return false;

        int totalBoardPieces = state.Board.Values.Sum(s => s.Count);

        // First turn of game
        if (totalBoardPieces == 0)
        {
            return target == new HexCoord(0, 0);
        }

        // Second turn of game (Player 2's first piece)
        if (totalBoardPieces == 1)
        {
            return target.DistanceTo(new HexCoord(0, 0)) == 1;
        }

        // Subsequent turns: must touch at least 1 friendly piece and NO enemy piece
        bool touchesFriendly = false;
        bool touchesEnemy = false;

        foreach (var neighbor in target.GetNeighbors())
        {
            var topPiece = GetTopPiece(state, neighbor);
            if (topPiece != null)
            {
                if (topPiece.OwnerId == playerId) touchesFriendly = true;
                else touchesEnemy = true;
            }
        }

        return touchesFriendly && !touchesEnemy;
    }

    /// <summary>
    /// Calculates all valid move destinations for a piece currently at `from`.
    /// </summary>
    public static List<HexCoord> GetValidMoves(HexaHiveState state, string playerId, HexCoord from)
    {
        var validMoves = new List<HexCoord>();

        // Player must have placed Queen Bee before moving any piece on board
        if (!state.QueenPlaced.TryGetValue(playerId, out bool queenPlaced) || !queenPlaced)
        {
            return validMoves;
        }

        var piece = GetTopPiece(state, from);
        if (piece == null || piece.OwnerId != playerId) return validMoves;

        // Check immobile restriction (from Pillbug ability)
        if (state.ImmobilePieceId != null && piece.Id == state.ImmobilePieceId) return validMoves;

        // Check One-Hive Rule
        if (!CheckOneHiveRule(state, from)) return validMoves;

        int stackHeight = state.Board[from.ToString()].Count;

        // If piece is on top of hive (>1 height), it acts as Beetle (or Mosquito on top)
        if (stackHeight > 1)
        {
            GetBeetleMoves(state, from, validMoves);
            return validMoves;
        }

        switch (piece.PieceType)
        {
            case "queen":
                GetQueenMoves(state, from, validMoves);
                break;
            case "ant":
                GetAntMoves(state, from, validMoves);
                break;
            case "spider":
                GetSpiderMoves(state, from, validMoves);
                break;
            case "grasshopper":
                GetGrasshopperMoves(state, from, validMoves);
                break;
            case "beetle":
                GetBeetleMoves(state, from, validMoves);
                break;
            case "ladybug":
                GetLadybugMoves(state, from, validMoves);
                break;
            case "mosquito":
                GetMosquitoMoves(state, playerId, from, validMoves);
                break;
            case "pillbug":
                GetQueenMoves(state, from, validMoves); // Moves 1 step like Queen
                break;
        }

        return validMoves;
    }

    private static void GetQueenMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        foreach (var neighbor in from.GetNeighbors())
        {
            if (GetTopPiece(state, neighbor) == null)
            {
                // Must touch at least one other piece on board after move
                if (HasAdjacentPiecesExcluding(state, neighbor, from))
                {
                    if (CanSlideGround(state, from, neighbor))
                    {
                        moves.Add(neighbor);
                    }
                }
            }
        }
    }

    private static void GetAntMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        var visited = new HashSet<HexCoord> { from };
        var queue = new Queue<HexCoord>();
        queue.Enqueue(from);

        while (queue.Count > 0)
        {
            var curr = queue.Dequeue();
            foreach (var neighbor in curr.GetNeighbors())
            {
                if (visited.Contains(neighbor)) continue;
                if (GetTopPiece(state, neighbor) != null) continue; // Must be empty ground

                // Must be connected to the rest of the hive
                if (HasAdjacentPiecesExcluding(state, neighbor, from))
                {
                    if (CanSlideGround(state, curr, neighbor))
                    {
                        visited.Add(neighbor);
                        moves.Add(neighbor);
                        queue.Enqueue(neighbor);
                    }
                }
            }
        }
    }

    private static void GetSpiderMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        // Spider must move EXACTLY 3 steps along perimeter without backtracking
        void DFS(HexCoord curr, int step, HashSet<HexCoord> path)
        {
            if (step == 3)
            {
                if (!moves.Contains(curr)) moves.Add(curr);
                return;
            }

            foreach (var neighbor in curr.GetNeighbors())
            {
                if (path.Contains(neighbor)) continue;
                if (GetTopPiece(state, neighbor) != null) continue;

                if (HasAdjacentPiecesExcluding(state, neighbor, from))
                {
                    if (CanSlideGround(state, curr, neighbor))
                    {
                        path.Add(neighbor);
                        DFS(neighbor, step + 1, path);
                        path.Remove(neighbor);
                    }
                }
            }
        }

        DFS(from, 0, new HashSet<HexCoord> { from });
    }

    private static void GetGrasshopperMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        foreach (var dir in HexCoord.Directions)
        {
            var curr = from + dir;
            int distance = 0;

            // Must jump over at least 1 piece
            while (GetTopPiece(state, curr) != null)
            {
                curr += dir;
                distance++;
            }

            if (distance > 0)
            {
                moves.Add(curr);
            }
        }
    }

    private static void GetBeetleMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        foreach (var neighbor in from.GetNeighbors())
        {
            bool neighborOccupied = GetTopPiece(state, neighbor) != null;
            bool fromStacked = state.Board[from.ToString()].Count > 1;

            if (neighborOccupied || fromStacked)
            {
                // Climbing up, moving on top, or stepping down does not require ground slide
                moves.Add(neighbor);
            }
            else
            {
                // Ground to ground move
                if (HasAdjacentPiecesExcluding(state, neighbor, from))
                {
                    if (CanSlideGround(state, from, neighbor))
                    {
                        moves.Add(neighbor);
                    }
                }
            }
        }
    }

    private static void GetLadybugMoves(HexaHiveState state, HexCoord from, List<HexCoord> moves)
    {
        // Step 1: Must climb onto top of adjacent occupied hex
        var step1Coords = from.GetNeighbors().Where(n => GetTopPiece(state, n) != null).ToList();

        foreach (var s1 in step1Coords)
        {
            // Step 2: Move on top of another adjacent occupied hex (different from s1)
            var step2Coords = s1.GetNeighbors().Where(n => n != from && GetTopPiece(state, n) != null).ToList();

            foreach (var s2 in step2Coords)
            {
                // Step 3: Step down to an empty ground hex
                var step3Coords = s2.GetNeighbors().Where(n => n != s1 && GetTopPiece(state, n) == null).ToList();

                foreach (var s3 in step3Coords)
                {
                    if (!moves.Contains(s3)) moves.Add(s3);
                }
            }
        }
    }

    private static void GetMosquitoMoves(HexaHiveState state, string playerId, HexCoord from, List<HexCoord> moves)
    {
        var adjacentPieces = from.GetNeighbors()
            .Select(n => GetTopPiece(state, n))
            .Where(p => p != null)
            .Select(p => p!.PieceType)
            .Distinct()
            .ToList();

        foreach (var pieceType in adjacentPieces)
        {
            switch (pieceType)
            {
                case "queen": GetQueenMoves(state, from, moves); break;
                case "ant": GetAntMoves(state, from, moves); break;
                case "spider": GetSpiderMoves(state, from, moves); break;
                case "grasshopper": GetGrasshopperMoves(state, from, moves); break;
                case "beetle": GetBeetleMoves(state, from, moves); break;
                case "ladybug": GetLadybugMoves(state, from, moves); break;
                case "pillbug": GetQueenMoves(state, from, moves); break;
            }
        }
    }

    private static bool HasAdjacentPiecesExcluding(HexaHiveState state, HexCoord coord, HexCoord exclude)
    {
        foreach (var neighbor in coord.GetNeighbors())
        {
            if (neighbor == exclude) continue;
            if (GetTopPiece(state, neighbor) != null) return true;
        }
        return false;
    }

    /// <summary>
    /// Evaluates if game is over (Queen Bee surrounded).
    /// </summary>
    public static (bool IsGameOver, string? WinnerId, string? WinnerName, bool IsDraw) CheckGameOver(HexaHiveState state, List<Core.Models.PlayerModel> players)
    {
        HexCoord? p0Queen = null;
        HexCoord? p1Queen = null;

        foreach (var (key, stack) in state.Board)
        {
            if (stack.Count == 0) continue;
            var coord = HexCoord.Parse(key);
            foreach (var p in stack)
            {
                if (p.PieceType == "queen")
                {
                    if (p.OwnerIndex == 0) p0Queen = coord;
                    else if (p.OwnerIndex == 1) p1Queen = coord;
                }
            }
        }

        bool p0Surrounded = p0Queen.HasValue && p0Queen.Value.GetNeighbors().All(n => GetTopPiece(state, n) != null);
        bool p1Surrounded = p1Queen.HasValue && p1Queen.Value.GetNeighbors().All(n => GetTopPiece(state, n) != null);

        if (p0Surrounded && p1Surrounded)
        {
            return (true, null, null, true); // Draw
        }

        if (p0Surrounded)
        {
            var winner = players.ElementAtOrDefault(1);
            return (true, winner?.PlayerId, winner?.PlayerName, false);
        }

        if (p1Surrounded)
        {
            var winner = players.ElementAtOrDefault(0);
            return (true, winner?.PlayerId, winner?.PlayerName, false);
        }

        return (false, null, null, false);
    }
}
