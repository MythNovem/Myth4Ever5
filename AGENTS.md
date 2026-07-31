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
    └── HexaHive/                         # Game Cờ Lục Giác HexaHive: Bug Tactics (1v1 / Vs Bot AI)
        ├── HexaHiveEngine.cs             # Engine chính điều phối trận đấu Cờ Lục Giác
        ├── Models/                       # HexCoord (Tọa độ Axial), HivePiece (8 quân cờ), HexaHiveState
        └── Services/                     # HiveRulesEngine (BFS Graph Articulation Points) & HiveAiEngine (Bot AI)

Frontend (Vanilla JS ES6 Modules + Glassmorphism CSS + HTML5 Canvas 2D)
├── js/
│   ├── core/
│   │   ├── lobby-manager.js              # Quản lý phòng chờ, chọn Game, Đuổi người chơi, Thêm Bot AI
│   │   ├── signalr-service.js            # Wrapper kết nối WebSocket với SignalR Hub
│   │   └── sound-fx.js                   # Web Audio API sound generator
│   └── games/
│       ├── mythic-cards-renderer.js      # Controller cho Mythic Cards
│       ├── number-bomb-renderer.js       # Controller cho Game Bom Số
        └── hexahive-renderer.js          # Controller Canvas 2D cho HexaHive (Pan, Zoom, Glassmorphic GameOver Modal)
        └── hexahive/
            └── hexahive-rules-modal.js   # Modal Hướng dẫn luật chơi 3 Tab & 24 thế cờ chiến thuật
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
  }
  ```
- **Lưu ý**: `Program.cs` sẽ **TỰ ĐỘNG** phát hiện và đăng ký Engine mới nhờ Reflection:
  `typeof(Program).Assembly.GetTypes().Where(t => typeof(IGameEngine)...)`
  Agent **KHÔNG** cần phải sửa `Program.cs` hay `PartyHub.cs`.

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

### 🐝 HexaHive Bug Tactics & Bộ Não AI Bot
- **One-Hive Rule**: Sử dụng thuật toán BFS đồ thị phát hiện **Articulation Points**. Không được phép di chuyển quân cờ nếu làm đứt gãy tổ ong thành 2 khối rời rạc.
- **Freedom to Slide Rule**: Căn cổng trượt vật lý trên mặt đất. Quân cờ không thể di chuyển qua cổng kẹt giữa 2 ô liền kề đã có quân.
- **Pillbug Freeze Rule**: Quân cờ vừa bị dịch chuyển ở lượt trước được gán `ImmobilePieceId` và không thể di chuyển 2 lần liên tiếp.
- **Bộ Não Bot AI (`HiveAiEngine.cs`)**: Đấu đơn 1v1 với máy, tự động đánh giá điểm số khai cuộc, bảo vệ Ong Chúa 👑 và tấn công dứt điểm.

### Cửa Sổ Phản Hồi Chặn (Nope Window - 5s Countdown)
- Khi người chơi đánh 1 lá bài có thể bị Chặn trong Mythic Cards, Backend tạo `PendingAction`.
- Frontend (`mc-timer-renderer.js`) hiển thị banner đếm ngược 5 giây công khai lá bài đang đánh.
- Người chơi khác có thể ném lá **🛑 Chặn (Nope)** hoặc bấm **⏩ Bỏ Qua (Cho Qua)**.

---

## ⚠️ 4. Quy Tắc Lập Trình Bắt Buộc Dành Cho AI Agent (Strict Rules)

1. **Quy Tắc Git Commit**:
   - **TUYỆT ĐỐI KHÔNG** tự động thực hiện lệnh `git commit`. Chỉ chạy commit khi người dùng đưa ra câu lệnh yêu cầu rõ ràng.
2. **Chuẩn Hóa Serialization JSON**:
   - SignalR Backend sử dụng `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`.
   - Khi truy cập thuộc tính JSON ở Frontend hoặc C# Payload, luôn hỗ trợ cả 2 dạng casing fallback: `data.cardNames || data.CardNames` hoặc `state.immobilePieceId || state.ImmobilePieceId`.
3. **Địa Chỉ Lắng Nghe IP (Docker/Linux)**:
   - Trong `Program.cs`, luôn dùng `builder.WebHost.UseUrls($"http://0.0.0.0:{port}")` để tránh lỗi IPv6 socket crash trên container Linux/Render.
4. **Giữ Sạch DOM Khi Rời Phòng**:
   - Khi trở về Lobby hoặc rời phòng, luôn gọi `hexahiveRenderer.clear()` / `mcTimerRenderer.clear()` và xóa nội dung container `#game-container` & `#action-banner-container` để tránh đọng lại đếm ngược hoặc modal của ván trước.
