# 🤖 AI Agent Guidelines & Codebase Context (`AGENTS.md`)

Tài liệu này cung cấp toàn bộ quy chuẩn kiến trúc, luồng dữ liệu và quy tắc lập trình dành cho các **AI Coding Agent** (như Antigravity, Claude, ChatGPT, Cursor...) khi đọc, bảo trì hoặc phát triển thêm tính năng cho repository **Myth4Ever5**.

---

## 🏛️ 1. Mô Hình Kiến Trúc Dự Án (Architecture Map)

Dự án áp dụng mô hình **Single Page Application (SPA) + SignalR WebSockets Real-time** theo định hướng đa trò chơi (Multi-Game Platform).

```text
Backend (C# .NET 9)
├── Core/
│   ├── Hubs/PartyHub.cs                  # WebSocket entry point (Host & Player Actions, AddBot, KickPlayer)
│   ├── Services/RoomManager.cs           # Quản lý phòng, session người chơi, trạng thái Ready Check, Kick, AddBot
│   ├── Services/GameEngineFactory.cs     # Tự động phát hiện & đăng ký Game Engines via Reflection
│   └── Interfaces/IGameEngine.cs         # Contract chung cho mọi trò chơi
└── Games/
    ├── MythicCards/                      # Game Mèo Ma Quái (2-4 người)
    │   ├── MythicCardsEngine.cs          # Master Orchestration
    │   ├── Models/MythicCardsState.cs    # Game State (Deck, Hands, DiscardPile, PendingAction)
    │   ├── Services/                     # MythicCardsDeckBuilder & Context
    │   └── Handlers/                     # Card Effect Handlers
    ├── NumberBomb/                       # Game Bom Số 1-100 (2-8 người)
    │   └── NumberBombEngine.cs           # Engine đoán số độc lập
    ├── HexaHive/                         # Game Cờ Lục Giác HexaHive: Bug Tactics (1v1 / Vs Bot AI)
    │   ├── HexaHiveEngine.cs             # Engine chính điều phối trận đấu Cờ Lục Giác
    │   ├── Models/                       # HexCoord (Tọa độ Axial), HivePiece, HexaHiveState
    │   └── Services/                     # HiveRulesEngine & HiveAiEngine (Bot AI)
    └── MythicRacer/                      # Game Đua Xe F1 Mythic Racer 2D (2-4 người) ⭐ NEW!
        ├── MythicRacerEngine.cs          # Engine điều phối trận đua xe 2D
        ├── Models/                       # CarModel, TrackDefinition, ItemBoxModel, MythicRacerState
        └── Services/                     # RacePhysicsEngine & TrackRegistry (Kho bản đồ F1)

Frontend (Vanilla JS ES6 Modules + Glassmorphism CSS + HTML5 Canvas 2D)
├── js/
│   ├── core/
│   │   ├── lobby-manager.js              # Quản lý phòng chờ, chọn Game, Đuổi người chơi, Thêm Bot AI
│   │   ├── signalr-service.js            # Wrapper kết nối WebSocket với SignalR Hub
│   │   └── sound-fx.js                   # Web Audio API sound generator
│   └── games/
│       ├── mythic-cards-renderer.js      # Controller cho Mythic Cards
│       ├── number-bomb-renderer.js       # Controller cho Game Bom Số
        ├── hexahive-renderer.js          # Controller Canvas 2D cho HexaHive
        └── mythic-racer-renderer.js      # Controller Canvas 2D cho Mythic Racer 2D (F1 Track, Skid marks, Nitro, Minimap)
```

---

## 🔑 2. Hướng Dẫn Thêm Game Mới Dành Cho AI Agent (Adding a New Game)

Để thêm 1 trò chơi mới vào hệ thống mà **KHÔNG** làm vỡ code cũ, AI Agent chỉ cần tuân thủ 3 bước:

### Bước 1: Tạo Backend Engine (`Games/YourNewGame/YourNewGameEngine.cs`)
- Thực thi interface `IGameEngine`:
  ```csharp
  public class YourNewGameEngine : IGameEngine
  {
      public string GameTypeId => "your_new_game";
      public string GameName => "Tên Trò Chơi Mới";
      public int MinPlayers => 2;
      public int MaxPlayers => 4;

      public Task<object> StartGameAsync(RoomModel room) { ... }
      public Task<GameActionResult> ProcessActionAsync(RoomModel room, string playerId, string actionType, JsonElement payload) { ... }
      public object SanitizeStateForBroadcast(RoomModel room, object state) { return state; }
  }
  ```
- **Lưu ý**: `Program.cs` sẽ **TỰ ĐỘNG** phát hiện và đăng ký Engine mới nhờ Reflection. Agent **KHÔNG** cần phải sửa `Program.cs` hay `PartyHub.cs`.

### Bước 2: Tạo Frontend Renderer (`js/games/your-new-game-renderer.js`)
- Tạo class `YourNewGameRenderer`:
  ```javascript
  export class YourNewGameRenderer {
      renderTable(room, state) { ... }
      updateState(state) { ... }
      handleAction(actionType, data) { ... }
      clear() { ... }
  }
  ```

### Bước 3: Đăng Ký Ở Lobby & UI (`index.html` & `lobby-manager.js`)
- Thêm option vào `<select id="select-game-type">` trong `index.html`.
- Nhận event `GameStarted` trong `lobby-manager.js` để gọi Renderer tương ứng.

---

## ⚡ 3. Các Trạng Thái & Cơ Chế Quan Trọng (Key Game Mechanics)

### 🏎️ Mythic Racer: Nitro Party 2D
- **TrackRegistry**: Quản lý bản đồ F1 Grand Prix với khúc cua Hairpins 180°, S-Bends, Checkpoints & lề cỏ làm chậm.
- **RacePhysicsEngine**: Gia tốc xe, góc bẻ lái, ma sát, va chạm tường, và phạt giảm tốc 55% khi phi ra lề cỏ.
- **5 Vật phẩm Mario Kart**: Tên lửa đuổi 🚀, Vỏ chuối 360° 🍌, Nitro boost ⚡, Khiên giáp 🛡️, Bom bán kính 💣.
- **Điều khiển song song**: Bàn Phím PC (`Arrow Keys` / `WASD` + `Space`) & Cảm ứng Mobile.

---

## ⚠️ 4. Quy Tắc Lập Trình Bắt Buộc Dành Cho AI Agent (Strict Rules)

1. **Quy Tắc Git Commit**:
   - **TUYỆT ĐỐI KHÔNG** tự động thực hiện lệnh `git commit`. Chỉ chạy commit khi người dùng đưa ra câu lệnh yêu cầu rõ ràng.
2. **Chuẩn Hóa Serialization JSON**:
   - SignalR Backend sử dụng `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`. Always support camelCase & PascalCase fallbacks.
3. **Giữ Sạch DOM Khi Rời Phòng**:
   - Khi trở về Lobby hoặc rời phòng, luôn gọi `mythicRacerRenderer.clear()` / `hexahiveRenderer.clear()` / `mcTimerRenderer.clear()` để tránh đọng DOM.
