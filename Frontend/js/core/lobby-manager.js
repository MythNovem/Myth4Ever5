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

        // Leave Room Button
        document.getElementById('btn-leave-room')?.addEventListener('click', async () => {
            if (confirm("Bạn có chắc chắn muốn rời phòng?")) {
                await window.signalRService.leaveRoomExplicit();
                this.clearRoomState();
            }
        });
    }

    clearRoomState() {
        this.currentRoom = null;
        localStorage.removeItem('myth_room_code');
        document.getElementById('btn-leave-room').style.display = 'none';
        
        // Hide all screens, show lobby
        document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
        document.getElementById('lobby-view').style.display = 'flex';
        
        // Reset game container
        const gc = document.getElementById('game-container');
        if (gc) gc.innerHTML = '';
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
        localStorage.setItem('myth_room_code', room.roomCode);
        
        document.getElementById('display-room-code').innerText = room.roomCode;
        
        // Show Leave button
        document.getElementById('btn-leave-room').style.display = 'block';
        
        // Show Room view, hide Lobby view
        document.getElementById('lobby-view').style.display = 'none';
        document.getElementById('room-view').style.display = 'block';

        const myPlayerId = window.signalRService.getPlayerId();
        const isHost = room.hostConnectionId === room.players.find(p => p.playerId === myPlayerId)?.connectionId;

        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.style.display = isHost ? 'block' : 'none';
            startBtn.disabled = room.players.length < 2;
            startBtn.innerText = room.players.length < 2
                ? `Đang chờ thêm người (${room.players.length}/4)...`
                : `🎮 Bắt Đầu Game (${room.players.length} người)`;
        }

        const playerListContainer = document.getElementById('room-player-list');
        if (playerListContainer) {
            playerListContainer.innerHTML = room.players.map(p => {
                const isMe = p.playerId === myPlayerId;
                const offlineStyle = p.isConnected ? '' : 'opacity: 0.5; filter: grayscale(1);';
                const offlineText = p.isConnected ? '' : ' <span style="color:var(--crimson-bright); font-size:10px;">(Offline)</span>';
                return `
                <div class="player-row" style="${offlineStyle}">
                    <div class="player-avatar">${p.avatarUrl}</div>
                    <div class="player-info">
                        <div class="player-name-text">${p.playerName}${offlineText}</div>
                        <div class="player-badge">
                            ${p.isHost ? '<span class="crown-badge">👑 Chủ phòng</span>' : ''}
                            ${isMe ? '<span style="font-size:11px; color:var(--text-muted);"> · Bạn</span>' : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
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
        msgEl.className = 'chat-message';
        msgEl.innerHTML = `${senderAvatar} <span class="sender">${senderName}</span><span class="time">${time}</span> ${message}`;
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    }
}

window.lobbyManager = new LobbyManager();
