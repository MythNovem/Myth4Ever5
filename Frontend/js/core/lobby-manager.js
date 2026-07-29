class LobbyManager {
    constructor() {
        this.selectedAvatar = '🧙‍♂️';
        this.currentRoom = null;
        this.initDOM();
    }

    initDOM() {
        // Avatar selection
        document.querySelectorAll('.avatar-option').forEach(el => {
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('active'));
                el.classList.add('active');
                this.selectedAvatar = el.innerText.trim();
            });
        });

        // Create Room Button
        document.getElementById('btn-create-room')?.addEventListener('click', async () => {
            const nameInput = document.getElementById('player-name-input').value.trim();
            if (!nameInput) {
                this.showToast('Vui lòng nhập Tên người chơi!', 'warning');
                return;
            }
            await window.signalRService.createRoom(nameInput, this.selectedAvatar);
        });

        // Join Room Button
        document.getElementById('btn-join-room')?.addEventListener('click', async () => {
            const nameInput = document.getElementById('player-name-input').value.trim();
            const codeInput = document.getElementById('room-code-input').value.trim();
            if (!nameInput) {
                this.showToast('Vui lòng nhập Tên người chơi!', 'warning');
                return;
            }
            if (!codeInput) {
                this.showToast('Vui lòng nhập Mã Phòng!', 'warning');
                return;
            }
            await window.signalRService.joinRoom(codeInput, nameInput, this.selectedAvatar);
        });

        // Start Game Button
        document.getElementById('btn-start-game')?.addEventListener('click', async () => {
            await window.signalRService.startGame();
        });

        // Chat Send
        document.getElementById('btn-send-chat')?.addEventListener('click', () => this.sendChat());
        document.getElementById('chat-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });

        // Emoji Reactions
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.getAttribute('data-emoji');
                if (emoji) window.signalRService.sendEmojiReaction(emoji);
            });
        });
    }

    sendChat() {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (msg) {
            window.signalRService.sendChatMessage(msg);
            input.value = '';
        }
    }

    renderRoomState(room) {
        this.currentRoom = room;
        document.getElementById('display-room-code').innerText = room.roomCode;
        
        // Show Room view, hide Lobby view
        document.getElementById('lobby-view').style.display = 'none';
        document.getElementById('room-view').style.display = 'block';

        const myConnectionId = window.signalRService.getConnectionId();
        const isHost = room.hostConnectionId === myConnectionId;

        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.style.display = isHost ? 'block' : 'none';
            startBtn.disabled = room.players.length < 3;
            startBtn.innerText = room.players.length < 3 
                ? `Đang chờ đủ 3 người (${room.players.length}/3)...` 
                : '🎮 BẮT ĐẦU GAME NGAY!';
        }

        // Render player list in room lobby
        const playerListContainer = document.getElementById('room-player-list');
        if (playerListContainer) {
            playerListContainer.innerHTML = room.players.map(p => `
                <div class="player-card glass-panel" style="padding: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="font-size: 28px;">${p.avatarUrl}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700;">${p.playerName} ${p.isHost ? '👑 (Chủ phòng)' : ''}</div>
                        <div style="font-size: 12px; color: #94a3b8;">${p.connectionId === myConnectionId ? '(Bạn)' : 'Sẵn sàng'}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3500);
    }

    spawnFloatingEmoji(emoji, senderName) {
        const el = document.createElement('div');
        el.className = 'floating-emoji';
        el.innerText = emoji;
        el.style.left = `${Math.random() * 60 + 20}%`;
        el.style.bottom = '100px';
        document.body.appendChild(el);

        setTimeout(() => el.remove(), 2500);
    }

    appendChatMessage(senderName, senderAvatar, message, time) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const msgEl = document.createElement('div');
        msgEl.style.marginBottom = '8px';
        msgEl.innerHTML = `<span style="font-size: 14px;">${senderAvatar} <strong>${senderName}</strong> <small style="color: #64748b;">${time}</small>: ${message}</span>`;
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    }
}

window.lobbyManager = new LobbyManager();
