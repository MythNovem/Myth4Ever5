# 🤖 AI Agent Guidelines & Codebase Context (`AGENTS.md`)

Tài liệu này cung cấp toàn bộ quy chuẩn kiến trúc, luồng dữ liệu và quy tắc lập trình dành cho các **AI Coding Agent** (như Antigravity, Claude, ChatGPT, Cursor...) khi đọc, bảo trì hoặc phát triển thêm tính năng cho repository **Myth4Ever5**.

---

## 🏛️ 1. Mô Hình Kiến Trúc Dự Án (Architecture Map)

Dự án áp dụng mô hình **Single Page Application (SPA) + SignalR WebSockets Real-time** theo định hướng đa trò chơi (Multi-Game Platform).

```text
Backend (C# .NET 9)
├── Core/
│   ├── Hubs/PartyHub.cs                  # WebSocket entry point (Host & Player Actions)
│   ├── Services/RoomManager.cs           # Quản lý phòng, session người chơi, trạng thái Ready Check
│   ├── Services/GameEngineFactory.cs     # Tự động phát hiện & đăng ký Game Engines via Reflection
│   └── Interfaces/IGameEngine.cs         # Contract chung cho mọi trò chơi
└── Games/
    ├── MythicCards/                      # Game Mèo Ma Quái
    │   ├── MythicCardsEngine.cs          # Master Orchestration
    │   ├── Models/MythicCardsState.cs    # Game State (Deck, Hands, DiscardPile, PendingAction)
    │   ├── Services/                     # MythicCardsDeckBuilder & Context
    │   └── Handlers/                     # Card Effect Handlers (Draw, Play, Single, Combo, Exploding, Resolve)
    └── NumberBomb/                       # Game Bom Số (1-100)
        └── NumberBombEngine.cs           # Engine đoán số độc lập

Frontend (Vanilla JS ES6 Modules + Glassmorphism CSS)
├── js/
│   ├── core/
│   │   ├── lobby-manager.js              # Quản lý phòng chờ, tạo/vào phòng, Ready Check, chọn Game
│   │   ├── signalr-service.js            # Wrapper kết nối WebSocket với SignalR Hub
│   │   └── sound-fx.js                   # Web Audio API sound generator
│   └── games/
│       ├── mythic-cards-renderer.js      # Main Controller cho Mythic Cards
│       ├── mythic-cards/                 # Submodule renderers
│       │   ├── mc-seat-renderer.js       # Vẽ vị trí người chơi quanh bàn
│       │   ├── mc-hand-renderer.js       # Vẽ bài trên tay & quản lý chọn card/combo
│       │   ├── mc-timer-renderer.js      # Banner đếm ngược 5s cửa sổ Chặn (Nope) + Bom nổ
│       │   ├── mc-modal-manager.js       # Quản lý Modals (Cướp bài, Xin bài, Tương lai, Thắng/Thua)
│       │   └── mc-rules-modal.js         # Modal bảng luật chơi
│       └── number-bomb-renderer.js       # Controller & UI cho Game Bom Số
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

### Cửa Sổ Phản Hồi Chặn (Nope Window - 5s Countdown)
- Khi người chơi đánh 1 lá bài có thể bị Chặn, Backend tạo `PendingAction`:
  ```csharp
  state.CurrentPendingAction = new PendingAction {
      SourcePlayerId = playerId,
      ActionType = "play_card",
      Payload = payload,
      ExpiryTime = DateTime.UtcNow.AddSeconds(5),
      NopeCount = 0,
      CardNames = "Nhìn Tương Lai 👁️"
  };
  ```
- Frontend (`mc-timer-renderer.js`) hiển thị banner đếm ngược 5 giây công khai lá bài đang đánh.
- Người chơi khác có thể:
  1. Bấm **🛑 ĐÁNH CHẶN (NOPE)** (nếu có lá Nope).
  2. Bấm **⏩ Bỏ Qua (Cho Qua)** ➔ Gửi action `resolve_pending_action` lên server để thực thi hiệu ứng ngay mà không cần chờ đếm ngược.

### Quy Trình Xin Bài (Favor 🙏)
- Đánh lá Xin Xỏ bắt buộc phải kèm `targetPlayerId`.
- Khi cửa sổ Chặn trôi qua mà không bị Chặn, server chuyển sang trạng thái:
  `state.AwaitingFavorResponse = true;`
- Frontend đối thủ tự động bật `showFavorModal` ép đối thủ chọn 1 lá bài nộp cho người xin bài.

---

## ⚠️ 4. Quy Tắc Lập Trình Bắt Buộc Dành Cho AI Agent (Strict Rules)

1. **Quy Tắc Git Commit**:
   - **TUYỆT ĐỐI KHÔNG** tự động thực hiện lệnh `git commit`. Chỉ chạy commit khi người dùng đưa ra câu lệnh yêu cầu rõ ràng.
2. **Chuẩn Hóa Serialization JSON**:
   - SignalR Backend sử dụng `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`.
   - Khi truy cập thuộc tính JSON ở Frontend hoặc C# Payload, luôn hỗ trợ cả 2 dạng casing fallback: `data.cardNames || data.CardNames`.
3. **Địa Chỉ Lắng Nghe IP (Docker/Linux)**:
   - Trong `Program.cs`, luôn dùng `builder.WebHost.UseUrls($"http://0.0.0.0:{port}")` để tránh lỗi IPv6 socket crash trên container Linux/Render.
4. **Giữ Sạch DOM Khi Rời Phòng**:
   - Khi trở về Lobby hoặc rời phòng, luôn gọi `mcTimerRenderer.clear()` và xóa nội dung container `#action-banner-container` để tránh đọng lại đếm ngược hoặc modal của ván trước.
