# 🎮 Myth4Ever5 - Multi-Game Board Game Platform

[![NET 9](https://img.shields.io/badge/.NET-9.0-purple.svg)](https://dotnet.microsoft.com/)
[![SignalR](https://img.shields.io/badge/SignalR-Realtime-orange.svg)](https://dotnet.microsoft.com/apps/aspnet/signalr)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/Deploy-Render-emerald.svg)](https://render.com/)

Nền tảng Board Game trực tuyến đa trò chơi (Multi-Game Online Platform) thời gian thực được xây dựng trên nền tảng **.NET 9 ASP.NET Core SignalR** (Backend) và **Vanilla JavaScript + Modern CSS Glassmorphic + HTML5 Canvas 2D** (Frontend).

---

## 🌟 Trò Chơi Nổi Bật (Featured Games)

### 1. 🐝 HexaHive: Bug Tactics (Cờ Lục Giác Côn Trùng) (1v1 / Solo Vs Bot AI) ⭐ NEW!
Trò chơi cờ chiến thuật Lục Giác đấu trí đỉnh cao (inspired by Hive - Gen42 Games)! Không cần bàn cờ cố định, di chuyển các quân côn trùng để bao vây **Ong Chúa 👑** đối thủ.
- **8 Loại quân cờ độc nhất**: *Ong Chúa 👑*, *Kiến 🐜*, *Nhện 🕷️*, *Châu Chấu 🦗*, *Bọ Cánh Cứng 🪲*, *Bọ Rùa 🐞*, *Muỗi 🦟*, *Bọ Cuộn 🛡️*.
- **Bộ Não Bot AI Grandmaster**: Hỗ trợ chế độ chơi đơn solo 1v1 với máy.
- **Đồ họa Canvas 2D**: Phóng to, thu nhỏ, kéo thả bàn cờ mượt mà.
- **Modal Kết Thúc Thủy Tinh**: Hỗ trợ tính năng `👀 Xem Bàn Cờ` để ngắm thế trận dứt điểm cuối ván.
- **Bảng 24 Thế Cờ Chiến Thuật**: Tích hợp sẵn hướng dẫn 24 khái niệm đỉnh cao (True Pin, Double Beetle Attack, Ant Farm, Choking the Queen...).

### 2. 🎴 Mythic Cards (Mèo Ma Quái / Exploding Kittens) (2 - 4 người)
Trò chơi thẻ bài chiến thuật sinh tồn đầy gay cấn! Rút bài, đặt bẫy, ném bài **Chặn (Nope)** và dùng đủ mọi thủ đoạn để không bị **Bão Mộc (Bẫy Nổ)** thổi bay.
- **Thẻ bài đặc biệt**: *Bão Mộc 💣*, *Giải Bẫy 🛠️*, *Chặn (Nope) 🛑*, *Ép Lượt 🔄*, *Nhìn Tương Lai 👁️*, *Thay Đổi Tương Lai 🔮*, *Tráo Bài 🔀*, *Rút Đáy ⏬*, *Xin Xỏ 🙏*, *Cướp Bài 🎁*, *🎯 Ám Sát*, *Combo 2/3/5 lá bài thường*.
- **Cửa sổ phản hồi Chặn (Nope)**: Đếm ngược 5 giây công khai tên lá bài, cho phép đối thủ ném Chặn hoặc bấm **⏩ Bỏ Qua (Cho Qua)** để tăng tốc độ chơi.

### 3. 💣 Bom Số (Secret Number Bomb) (2 - 8 người)
Trò chơi đoán số đấu trí hồi hộp! Quả bom bí mật nằm ẩn trong khoảng **1 - 100**. Người chơi lần lượt chọn số để bóp chặt khoảng an toàn. Ai đoán trúng số Bom sẽ bị phát nổ và loại khỏi cuộc chơi!

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

```mermaid
graph TD
    Client[Web Browser / Client] <-->|SignalR WebSocket / JSON| Hub[PartyHub.cs]
    Hub <--> RM[RoomManager.cs]
    Hub <--> Factory[GameEngineFactory.cs]
    Factory <--> Engine1[HexaHiveEngine.cs]
    Factory <--> Engine2[MythicCardsEngine.cs]
    Factory <--> Engine3[NumberBombEngine.cs]
    Engine1 <--> AI[HiveAiEngine.cs]
    Engine1 <--> Rules[HiveRulesEngine.cs]
```

- **Backend (.NET 9 C#)**:
  - **Clean Architecture & SOLID**: Áp dụng Handler Pattern và Engine Auto-Discovery qua Reflection.
  - **Bot AI Engine**: Bộ não Bot AI Grandmaster tính toán điểm số nước đi thông minh.
  - **SignalR WebSockets**: Đồng bộ trạng thái game (State Synchronization) thời gian thực.
- **Frontend (Vanilla JS + Custom CSS + Canvas 2D)**:
  - **Design System**: Giao diện Dark Purple Glassmorphism hiện đại, hiệu ứng neon, mượt mà.
  - **Modular Renderers**: Tách nhỏ giao diện thành các submodule chuyên biệt (`hexahive-renderer`, `mythic-cards-renderer`, `number-bomb-renderer`).
  - **SoundFX Engine**: Hệ thống hiệu ứng âm thanh Web Audio API sinh động.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Setup)

### Yêu Cầu Tiền Đề:
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)

### Các Bước Khởi Chạy:
1. **Clone repository**:
   ```bash
   git clone https://github.com/MythNovem/Myth4Ever5.git
   cd Myth4Ever5
   ```

2. **Chạy Backend**:
   ```bash
   cd Backend/Myth4Ever5.Api
   dotnet run
   ```

3. **Truy cập ứng dụng**:
   Mở trình duyệt và truy cập: `http://localhost:5000` (hoặc cổng hiển thị trong Terminal).

---

## 📂 Cấu Trúc Thư Mục (Directory Structure)

```text
Myth4Ever5/
├── Backend/
│   └── Myth4Ever5.Api/
│       ├── Core/
│       │   ├── Hubs/             # SignalR PartyHub.cs
│       │   ├── Interfaces/       # IGameEngine.cs
│       │   ├── Models/           # RoomModel.cs, PlayerModel.cs
│       │   └── Services/         # RoomManager.cs, GameEngineFactory.cs
│       └── Games/
│           ├── HexaHive/         # Game Engine #1 (Cờ Lục Giác & Bot AI Engine)
│           ├── MythicCards/      # Game Engine #2 & Handlers
│           └── NumberBomb/       # Game Engine #3
├── Frontend/
│   ├── css/                      # Custom Glassmorphism Stylesheet
│   ├── js/
│   │   ├── core/                 # lobby-manager, signalr-service, sound-fx
│   │   └── games/                # Game renderers (hexahive, mythic-cards, number-bomb)
│   └── index.html                # Main SPA Layout
├── AGENTS.md                     # Tài liệu hướng dẫn dành cho AI Agent
├── DEVELOPER_GUIDE.md            # Tài liệu chi tiết dành cho Developer
├── Dockerfile                    # Multi-stage Docker build script
└── README.md                     # Tài liệu tổng quan dự án
```

---
asd
## 📝 Giấy Phép (License)
Dự án được phân phối dưới giấy phép [MIT License](LICENSE).