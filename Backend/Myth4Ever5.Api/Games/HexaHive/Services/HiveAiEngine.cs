namespace Myth4Ever5.Api.Games.HexaHive.Services;

using Myth4Ever5.Api.Core.Models;
using Myth4Ever5.Api.Games.HexaHive.Models;

public static class HiveAiEngine
{
    public class BotActionChoice
    {
        public string ActionType { get; set; } = "pass_turn"; // place_piece, move_piece, pass_turn
        public string PieceId { get; set; } = string.Empty;
        public HexCoord FromCoord { get; set; }
        public HexCoord TargetCoord { get; set; }
        public int Score { get; set; } = 0;
    }

    public static BotActionChoice CalculateBestMove(HexaHiveState state, string botPlayerId, List<PlayerModel> players)
    {
        var possibleActions = new List<BotActionChoice>();

        var botHand = state.UnplacedHands.TryGetValue(botPlayerId, out var hand) ? hand : new List<HivePiece>();
        bool queenPlaced = state.QueenPlaced.TryGetValue(botPlayerId, out var qp) && qp;
        int playerTurnCount = (state.TurnNumber + 1) / 2;

        HexCoord? oppQueenCoord = null;
        HexCoord? myQueenCoord = null;
        foreach (var (key, stack) in state.Board)
        {
            if (stack.Count == 0) continue;
            var coord = HexCoord.Parse(key);
            var top = stack[^1];
            if (top.PieceType == "queen")
            {
                if (top.OwnerId != botPlayerId) oppQueenCoord = coord;
                else myQueenCoord = coord;
            }
        }

        // 1. Evaluate Placement Actions
        if (botHand.Count > 0)
        {
            // If turn 4 and queen not placed, MUST place queen
            List<HivePiece> candidatePieces;
            if (playerTurnCount >= 4 && !queenPlaced)
            {
                candidatePieces = botHand.Where(p => p.PieceType == "queen").ToList();
            }
            else if (playerTurnCount == 1 && !queenPlaced)
            {
                // Varied opening: 40% chance Queen, 60% chance Spider/Ant/Beetle
                var rand = new Random();
                if (rand.Next(100) < 40)
                {
                    candidatePieces = botHand.Where(p => p.PieceType == "queen").ToList();
                }
                else
                {
                    candidatePieces = botHand.Where(p => p.PieceType != "queen").GroupBy(p => p.PieceType).Select(g => g.First()).ToList();
                }
            }
            else
            {
                candidatePieces = botHand.GroupBy(p => p.PieceType).Select(g => g.First()).ToList();
            }

            foreach (var piece in candidatePieces)
            {
                var validPlacements = GetValidPlacements(state, botPlayerId);
                foreach (var target in validPlacements)
                {
                    int score = EvaluatePlacementScore(state, botPlayerId, piece, target, oppQueenCoord, myQueenCoord, queenPlaced, playerTurnCount, botHand.Count);
                    possibleActions.Add(new BotActionChoice
                    {
                        ActionType = "place_piece",
                        PieceId = piece.Id,
                        TargetCoord = target,
                        Score = score
                    });
                }
            }
        }

        // 2. Evaluate Movement Actions (Only allowed if Queen is placed)
        if (queenPlaced)
        {
            foreach (var (key, stack) in state.Board)
            {
                if (stack.Count == 0) continue;
                var fromCoord = HexCoord.Parse(key);
                var topPiece = stack[^1];

                if (topPiece.OwnerId == botPlayerId)
                {
                    var validMoves = HiveRulesEngine.GetValidMoves(state, botPlayerId, fromCoord);
                    foreach (var target in validMoves)
                    {
                        int score = EvaluateMoveScore(state, botPlayerId, topPiece, fromCoord, target, oppQueenCoord, myQueenCoord, botHand.Count);
                        possibleActions.Add(new BotActionChoice
                        {
                            ActionType = "move_piece",
                            PieceId = topPiece.Id,
                            FromCoord = fromCoord,
                            TargetCoord = target,
                            Score = score
                        });
                    }
                }
            }
        }

        if (possibleActions.Count == 0)
        {
            return new BotActionChoice { ActionType = "pass_turn" };
        }

        int maxScore = possibleActions.Max(a => a.Score);
        var bestActions = possibleActions.Where(a => a.Score == maxScore).ToList();
        var random = new Random();
        return bestActions[random.Next(bestActions.Count)];
    }

    private static List<HexCoord> GetValidPlacements(HexaHiveState state, string botPlayerId)
    {
        var valid = new List<HexCoord>();
        var board = state.Board;
        var keys = board.Keys.ToList();

        if (keys.Count == 0)
        {
            valid.Add(new HexCoord(0, 0));
            return valid;
        }

        if (keys.Count == 1)
        {
            var center = new HexCoord(0, 0);
            return center.GetNeighbors().Where(n => !board.ContainsKey(n.ToString())).ToList();
        }

        var candidates = new HashSet<HexCoord>();
        foreach (var key in keys)
        {
            if (board[key].Count > 0)
            {
                var coord = HexCoord.Parse(key);
                foreach (var n in coord.GetNeighbors())
                {
                    if (!board.ContainsKey(n.ToString()) || board[n.ToString()].Count == 0)
                    {
                        candidates.Add(n);
                    }
                }
            }
        }

        foreach (var cand in candidates)
        {
            if (HiveRulesEngine.IsValidPlacement(state, botPlayerId, cand))
            {
                valid.Add(cand);
            }
        }

        return valid;
    }

    private static int EvaluatePlacementScore(HexaHiveState state, string botPlayerId, HivePiece piece, HexCoord target, HexCoord? oppQueen, HexCoord? myQueen, bool queenPlaced, int turnCount, int remainingHandCount)
    {
        // Deployment bonus: Prefer bringing new pieces onto the board!
        int score = 2500;

        if (piece.PieceType == "queen")
        {
            if (!queenPlaced)
            {
                score += 2000;
                if (turnCount >= 3) score += 5000;
                if (turnCount >= 4) score += 50000; // Mandatory
            }
        }

        if (oppQueen.HasValue)
        {
            int dist = target.DistanceTo(oppQueen.Value);
            score += (12 - dist) * 150;

            if (dist == 1)
            {
                score += 4000; // Place directly next to enemy Queen
            }
        }

        if (piece.PieceType == "ant") score += 600;
        if (piece.PieceType == "beetle") score += 800;
        if (piece.PieceType == "grasshopper") score += 500;
        if (piece.PieceType == "pillbug") score += 400;

        return score;
    }

    private static int EvaluateMoveScore(HexaHiveState state, string botPlayerId, HivePiece piece, HexCoord from, HexCoord target, HexCoord? oppQueen, HexCoord? myQueen, int remainingHandCount)
    {
        int score = 500;

        if (oppQueen.HasValue)
        {
            int oldDist = from.DistanceTo(oppQueen.Value);
            int newDist = target.DistanceTo(oppQueen.Value);

            // Checkmate Win Check
            int oppSurroundedCount = oppQueen.Value.GetNeighbors().Count(n => HiveRulesEngine.GetTopPiece(state, n) != null || n == target);
            if (oppSurroundedCount == 6)
            {
                return 100000; // Immediate win!
            }

            // Beetle pinning on enemy Queen
            if (piece.PieceType == "beetle" && target == oppQueen.Value)
            {
                return 20000; // Pin enemy queen!
            }

            // Filling a new surround spot next to enemy queen
            if (newDist == 1 && oldDist > 1)
            {
                score += 4000;
            }

            if (newDist < oldDist)
            {
                score += (oldDist - newDist) * 100;
            }
        }

        // Defending own Queen
        if (myQueen.HasValue)
        {
            int myQueenSurrounded = myQueen.Value.GetNeighbors().Count(n => HiveRulesEngine.GetTopPiece(state, n) != null);
            if (myQueenSurrounded >= 3)
            {
                int distToMyQueen = target.DistanceTo(myQueen.Value);
                if (distToMyQueen == 1)
                {
                    score += 3000; // Shield own queen
                }
            }
        }

        // If bot still has many unplaced pieces in hand, penalize purely walking around without attacking
        if (remainingHandCount > 3 && score < 3000)
        {
            score -= 1500; // Force placing new pieces from hand instead of walking 1 piece
        }

        return score;
    }
}
