namespace Myth4Ever5.Api.Games.MythicRacer.Services;

using Myth4Ever5.Api.Games.MythicRacer.Models;

public static class RacePhysicsEngine
{
    public static void UpdatePhysics(MythicRacerState state, float deltaTime)
    {
        if (state.IsGameOver) return;

        // 1. Countdown state
        if (state.IsCountdown)
        {
            state.CountdownTimer -= deltaTime;
            if (state.CountdownTimer <= 0)
            {
                state.IsCountdown = false;
                state.CountdownTimer = 0;
            }
            return;
        }

        var track = state.Track;

        // 2. Update Item Box Respawns
        foreach (var box in state.ItemBoxes)
        {
            if (!box.IsActive)
            {
                box.RespawnTimer -= deltaTime;
                if (box.RespawnTimer <= 0)
                {
                    box.IsActive = true;
                    box.RespawnTimer = 0;
                }
            }
        }

        // 3. Update Rockets
        for (int i = state.Rockets.Count - 1; i >= 0; i--)
        {
            var rocket = state.Rockets[i];
            rocket.Lifetime -= deltaTime;

            if (rocket.Lifetime <= 0 || !state.Cars.TryGetValue(rocket.TargetPlayerId, out var targetCar))
            {
                state.Rockets.RemoveAt(i);
                continue;
            }

            // Move rocket towards target car
            float dx = targetCar.X - rocket.X;
            float dy = targetCar.Y - rocket.Y;
            float targetAngle = MathF.Atan2(dy, dx);
            rocket.Angle = targetAngle;

            rocket.X += MathF.Cos(rocket.Angle) * rocket.Speed;
            rocket.Y += MathF.Sin(rocket.Angle) * rocket.Speed;

            // Hit target check
            float distToTarget = MathF.Sqrt(dx * dx + dy * dy);
            if (distToTarget < 32f)
            {
                if (targetCar.IsShielded)
                {
                    targetCar.IsShielded = false;
                    targetCar.ShieldTimer = 0;
                }
                else
                {
                    targetCar.HitStunTimer = 1.2f;
                    targetCar.Speed = -2f;
                }
                state.RaceLogs.Add($"💥 Tên lửa đuổi nổ tung xe của {targetCar.PlayerName}!");
                state.Rockets.RemoveAt(i);
            }
        }

        // 4. Update Cars Physics
        foreach (var (playerId, car) in state.Cars)
        {
            if (car.IsFinished) continue;

            // Handle Timers & Status Effects
            if (car.ShieldTimer > 0)
            {
                car.ShieldTimer -= deltaTime;
                if (car.ShieldTimer <= 0) car.IsShielded = false;
            }

            if (car.NitroTimer > 0)
            {
                car.NitroTimer -= deltaTime;
            }

            if (car.SpinoutTimer > 0)
            {
                car.SpinoutTimer -= deltaTime;
                car.Angle += 12f * deltaTime; // 360 spin
                car.Speed = 0;
                continue;
            }

            if (car.HitStunTimer > 0)
            {
                car.HitStunTimer -= deltaTime;
                car.Speed = 0;
                continue;
            }

            // Steering Angle
            if (car.SteerLeft) car.Angle -= 3.2f * deltaTime;
            if (car.SteerRight) car.Angle += 3.2f * deltaTime;

            // Max Speed calculation (Nitro / Grass Off-road)
            float maxSpeed = car.MaxSpeed;
            if (car.NitroTimer > 0)
            {
                maxSpeed = 14.0f; // Nitro speed!
            }

            bool offRoad = IsOffRoad(car.X, car.Y, track);
            if (offRoad && car.NitroTimer <= 0)
            {
                maxSpeed *= 0.20f; // Stricter 80% speed penalty on grass!
                car.Speed *= 0.88f; // Immediate friction deceleration on off-road
            }

            // Acceleration & Friction
            if (car.Accelerate)
            {
                car.Speed = MathF.Min(maxSpeed, car.Speed + 14f * deltaTime);
            }
            else if (car.Reverse)
            {
                car.Speed = MathF.Max(-3.5f, car.Speed - 8f * deltaTime);
            }
            else
            {
                car.Speed *= MathF.Pow(0.82f, deltaTime * 60f); // Friction
            }

            // Move Car Position
            car.X += MathF.Cos(car.Angle) * car.Speed;
            car.Y += MathF.Sin(car.Angle) * car.Speed;

            // Keep in Canvas Bounds
            car.X = Math.Clamp(car.X, 30, track.CanvasWidth - 30);
            car.Y = Math.Clamp(car.Y, 30, track.CanvasHeight - 30);

            // Item Box Collision
            if (string.IsNullOrEmpty(car.CurrentItem))
            {
                foreach (var box in state.ItemBoxes)
                {
                    if (box.IsActive && Distance(car.X, car.Y, box.X, box.Y) < 38f)
                    {
                        box.IsActive = false;
                        box.RespawnTimer = 5.0f;
                        car.CurrentItem = GetRandomItem();
                        state.RaceLogs.Add($"🎁 {car.PlayerName} nhặt được {GetItemDisplayName(car.CurrentItem)}!");
                        break;
                    }
                }
            }

            // Dropped Items (Banana / Bomb) Collision
            for (int i = state.DroppedItems.Count - 1; i >= 0; i--)
            {
                var item = state.DroppedItems[i];

                // Bomb is a trap for opponents; owner is immune to own bomb
                if (item.ItemType == "bomb" && item.OwnerId == car.PlayerId) continue;

                if (Distance(car.X, car.Y, item.X, item.Y) < item.Radius + 15f)
                {
                    if (car.IsShielded)
                    {
                        car.IsShielded = false;
                        car.ShieldTimer = 0;
                    }
                    else if (item.ItemType == "banana")
                    {
                        car.SpinoutTimer = 1.0f;
                        state.RaceLogs.Add($"🍌 {car.PlayerName} cán vỏ chuối bị xoay 360°!");
                    }
                    else if (item.ItemType == "bomb")
                    {
                        car.HitStunTimer = 1.2f;
                        state.RaceLogs.Add($"💣 {car.PlayerName} dẫm phải quả bom nổ tung!");
                    }

                    state.DroppedItems.RemoveAt(i);
                }
            }

            // Checkpoint & Lap Progress
            CheckLapProgress(car, state);
        }

        // Check Game Over (When all players or 1st player finishes)
        if (state.Cars.Values.All(c => c.IsFinished) || (state.Cars.Values.Any(c => c.IsFinished) && state.Cars.Values.Count(c => c.IsFinished) == state.Cars.Count))
        {
            state.IsGameOver = true;
            var winner = state.Cars.Values.OrderBy(c => c.FinishedRank).FirstOrDefault();
            if (winner != null)
            {
                state.WinnerPlayerId = winner.PlayerId;
                state.WinnerName = winner.PlayerName;
            }
        }
    }

    public static void TriggerItemAction(MythicRacerState state, string playerId)
    {
        if (!state.Cars.TryGetValue(playerId, out var car) || string.IsNullOrEmpty(car.CurrentItem)) return;

        string item = car.CurrentItem;
        car.CurrentItem = string.Empty; // Consumed

        switch (item)
        {
            case "nitro":
                car.NitroTimer = 2.5f;
                state.RaceLogs.Add($"⚡ {car.PlayerName} xịt Nitro bứt tốc!");
                break;
            case "shield":
                car.IsShielded = true;
                car.ShieldTimer = 4.5f;
                state.RaceLogs.Add($"🛡️ {car.PlayerName} bật Khiên Giáp bảo vệ!");
                break;
            case "banana":
                float dropX = car.X - MathF.Cos(car.Angle) * 35f;
                float dropY = car.Y - MathF.Sin(car.Angle) * 35f;
                state.DroppedItems.Add(new DroppedItemModel { ItemType = "banana", OwnerId = playerId, X = dropX, Y = dropY });
                state.RaceLogs.Add($"🍌 {car.PlayerName} thả Vỏ Chuối sau lưng!");
                break;
            case "bomb":
                float bDropX = car.X - MathF.Cos(car.Angle) * 50f;
                float bDropY = car.Y - MathF.Sin(car.Angle) * 50f;
                state.DroppedItems.Add(new DroppedItemModel { ItemType = "bomb", OwnerId = playerId, X = bDropX, Y = bDropY, Radius = 35f });
                state.RaceLogs.Add($"💣 {car.PlayerName} đặt Quả Bom Bán Kính!");
                break;
            case "rocket":
                // Find car ahead of this player in rank/position
                var target = state.Cars.Values
                    .Where(c => c.PlayerId != playerId && !c.IsFinished)
                    .OrderByDescending(c => c.CurrentLap * 10 + c.LastPassedCheckpoint)
                    .FirstOrDefault();

                if (target != null)
                {
                    state.Rockets.Add(new RocketModel
                    {
                        OwnerId = playerId,
                        TargetPlayerId = target.PlayerId,
                        X = car.X,
                        Y = car.Y,
                        Angle = car.Angle
                    });
                    state.RaceLogs.Add($"🚀 {car.PlayerName} phóng Tên Lửa Đuổi nhắm vào {target.PlayerName}!");
                }
                break;
        }
    }

    private static void CheckLapProgress(CarModel car, MythicRacerState state)
    {
        var checkpoints = state.Track.Checkpoints;
        if (checkpoints.Count == 0) return;

        // Next checkpoint required in order
        int requiredNextIdx = (car.LastPassedCheckpoint + 1) % checkpoints.Count;

        // Special case for initial start line: car starts before checkpoint 0
        if (car.LastPassedCheckpoint == -1)
        {
            requiredNextIdx = 1; // First target is checkpoint 1
            car.LastPassedCheckpoint = 0; // Mark start line as passed
        }

        var nextCheckpoint = checkpoints[requiredNextIdx];
        float distToNext = Distance(car.X, car.Y, nextCheckpoint.Center.X, nextCheckpoint.Center.Y);

        if (distToNext <= nextCheckpoint.Radius)
        {
            // Successfully passed next required checkpoint in order
            car.LastPassedCheckpoint = requiredNextIdx;

            // When returning to Checkpoint 0 after completing all other checkpoints -> Lap completed!
            if (requiredNextIdx == 0)
            {
                car.CurrentLap++;
                state.RaceLogs.Add($"🏁 {car.PlayerName} đã hoàn thành Vòng {car.CurrentLap - 1}/{state.TotalLaps}!");

                if (car.CurrentLap > state.TotalLaps)
                {
                    car.IsFinished = true;
                    if (!state.RaceRankings.Contains(car.PlayerId))
                    {
                        state.RaceRankings.Add(car.PlayerId);
                    }
                    car.FinishedRank = state.RaceRankings.Count;
                    car.FinishedTime = DateTime.UtcNow;
                    state.RaceLogs.Add($"🏆 {car.PlayerName} đã CÁN ĐÍCH ở vị trí thứ #{car.FinishedRank}!");
                }
            }
        }
    }

    private static bool IsOffRoad(float x, float y, TrackDefinition track)
    {
        if (track.Waypoints.Count < 2) return false;

        float minDistanceSq = float.MaxValue;
        for (int i = 0; i < track.Waypoints.Count; i++)
        {
            var p1 = track.Waypoints[i];
            var p2 = track.Waypoints[(i + 1) % track.Waypoints.Count];
            float distSq = DistanceToSegmentSquared(x, y, p1.X, p1.Y, p2.X, p2.Y);
            if (distSq < minDistanceSq) minDistanceSq = distSq;
        }

        float halfWidth = track.TrackWidth / 2f;
        return minDistanceSq > (halfWidth * halfWidth);
    }

    private static float DistanceToSegmentSquared(float px, float py, float x1, float y1, float x2, float y2)
    {
        float l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 == 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
        float t = Math.Max(0, Math.Min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
        float projX = x1 + t * (x2 - x1);
        float projY = y1 + t * (y2 - y1);
        return (px - projX) * (px - projX) + (py - projY) * (py - projY);
    }

    private static float Distance(float x1, float y1, float x2, float y2)
    {
        float dx = x1 - x2;
        float dy = y1 - y2;
        return MathF.Sqrt(dx * dx + dy * dy);
    }

    private static string GetRandomItem()
    {
        var items = new[] { "nitro", "shield", "banana", "bomb", "rocket" };
        var rand = new Random();
        return items[rand.Next(items.Length)];
    }

    private static string GetItemDisplayName(string item)
    {
        return item switch
        {
            "nitro" => "⚡ Nitro Thần Tốc",
            "shield" => "🛡️ Khiên Giáp",
            "banana" => "🍌 Vỏ Chuối",
            "bomb" => "💣 Bom Bán Kính",
            "rocket" => "🚀 Tên Lửa Đuổi",
            _ => "🎁 Vật Phẩm"
        };
    }
}
