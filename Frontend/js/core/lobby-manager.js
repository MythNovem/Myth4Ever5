class LobbyManager {
    constructor() {
        this.selectedAvatar = '🧙‍♂️';
        this.currentRoom = null;
        this.initDOM();
        this.initSignalREvents();
    }

    initSignalREvents() {
        if (window.signalRService) {
            window.signalRService.on('PlayerKicked', (reason) => {
                alert(`🚫 ${reason}`);
                this.clearRoomState();
            });
        }
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

        // Add Bot Button (Host)
        document.getElementById('btn-add-bot')?.addEventListener('click', async () => {
            await window.signalRService.addBot();
        });

        // Start Game Button
        document.getElementById('btn-start-game')?.addEventListener('click', async () => {
            await window.signalRService.startGame();
        });

        // Toggle Ready Button (Non-host)
        document.getElementById('btn-toggle-ready')?.addEventListener('click', async () => {
            await window.signalRService.toggleReady();
        });

        // Game Selection Change (Host)
        document.getElementById('select-game-type')?.addEventListener('change', async (e) => {
            await window.signalRService.selectGame(e.target.value);
        });

        // Chat Send
        document.getElementById('btn-send-chat')?.addEventListener('click', () => this.sendChat());
        document.getElementById('chat-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });

        // Toggle Chat Panel
        document.getElementById('btn-toggle-chat')?.addEventListener('click', () => {
            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel) {
                chatPanel.classList.toggle('collapsed');
                const unreadDot = document.getElementById('unread-chat-dot');
                if (unreadDot) unreadDot.style.display = 'none';
            }
        });

        // Emoji Reaction Buttons
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const emoji = e.target.innerText;
                await window.signalRService.sendEmojiReaction(emoji);
            });
        });

        // Leave Room Button
        document.getElementById('btn-leave-room')?.addEventListener('click', async () => {
            const isGameStarted = this.currentRoom && this.currentRoom.isGameStarted;
            const confirmMsg = isGameStarted 
                ? "Bạn có chắc chắn muốn rời phòng? Hành động này sẽ tính là chịu thua trong ván đang chơi!"
                : "Bạn có chắc chắn muốn rời phòng?";
                
            if (confirm(confirmMsg)) {
                if (isGameStarted) {
                    await window.signalRService.sendGameAction('surrender', {});
                }
                await window.signalRService.leaveRoomExplicit();
                this.clearRoomState();
            }
        });
    }

    clearRoomState() {
        if (window.mcTimerRenderer) window.mcTimerRenderer.clear();
        const bannerContainer = document.getElementById('action-banner-container');
        if (bannerContainer) bannerContainer.innerHTML = '';

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
        if (room.isGameStarted) {
            document.getElementById('room-view').style.display = 'none';
        } else {
            const hasGameOverActive = document.getElementById('hexahive-gameover-popup') || document.getElementById('btn-reopen-gameover') || document.getElementById('racer-gameover-popup') || document.getElementById('btn-reopen-racer');
            if (!hasGameOverActive) {
                document.getElementById('room-view').style.display = 'block';
                if (window.mcTimerRenderer) window.mcTimerRenderer.clear();
                if (window.hexahiveRenderer) window.hexahiveRenderer.clear();
                if (window.mythicRacerRenderer) window.mythicRacerRenderer.clear();
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    gameContainer.innerHTML = '';
                    gameContainer.style.display = 'none';
                }
                const bannerContainer = document.getElementById('action-banner-container');
                if (bannerContainer) bannerContainer.innerHTML = '';
            }
        }

        const myPlayerId = window.signalRService.getPlayerId();
        const mePlayer   = room.players.find(p => p.playerId === myPlayerId);
        const isHost     = room.hostConnectionId === mePlayer?.connectionId || mePlayer?.isHost;

        const gameSelect = document.getElementById('select-game-type');
        if (gameSelect) {
            gameSelect.value = room.selectedGameTypeId || 'mythic_cards';
            gameSelect.disabled = !isHost;
        }

        const gameMaxPlayers = {
            'mythic_cards': 4,
            'number_bomb': 8,
            'hexahive': 2,
            'mythic_racer': 4
        };
        const selectedGame = room.selectedGameTypeId || 'mythic_cards';
        const maxPlayers = gameMaxPlayers[selectedGame] || 4;

        const startBtn = document.getElementById('btn-start-game');
        const readyBtn = document.getElementById('btn-toggle-ready');
        const addBotBtn = document.getElementById('btn-add-bot');

        const nonHostPlayers = room.players.filter(p => !p.isHost);
        const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);

        const isHexaHive = selectedGame === 'hexahive';
        if (addBotBtn) {
            addBotBtn.style.display = (isHost && isHexaHive && room.players.length < maxPlayers && !room.isGameStarted) ? 'block' : 'none';
        }

        if (isHost) {
            if (readyBtn) readyBtn.style.display = 'none';
            if (startBtn) {
                startBtn.style.display = 'block';
                startBtn.disabled = room.players.length < 2 || !allReady;

                if (room.players.length < 2) {
                    startBtn.innerText = `Đang chờ thêm người (${room.players.length}/${maxPlayers})...`;
                } else if (!allReady) {
                    const unreadyCount = nonHostPlayers.filter(p => !p.isReady).length;
                    startBtn.innerText = `⏳ Chờ người chơi Sẵn Sàng (${unreadyCount} người chưa sẵn sàng)...`;
                } else {
                    startBtn.innerText = `🎮 Bắt Đầu Game (${room.players.length}/${maxPlayers} người)`;
                }
            }
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (readyBtn) {
                readyBtn.style.display = 'block';
                const isReady = mePlayer?.isReady ?? false;
                readyBtn.innerText = isReady ? '❌ Hủy Sẵn Sàng' : '✅ Sẵn Sàng';
                readyBtn.style.color = isReady ? 'var(--crimson-bright)' : 'var(--emerald-bright)';
                readyBtn.style.borderColor = isReady ? 'var(--crimson)' : 'var(--emerald)';
            }
        }

        const playerListContainer = document.getElementById('room-player-list');
        if (playerListContainer) {
            playerListContainer.innerHTML = room.players.map(p => {
                const isMe = p.playerId === myPlayerId;
                const offlineStyle = p.isConnected ? '' : 'opacity: 0.5; filter: grayscale(1);';
                const offlineText = p.isConnected ? '' : ' <span style="color:var(--crimson-bright); font-size:10px;">(Offline)</span>';

                let badge = '';
                if (p.isHost) {
                    badge = '<span class="crown-badge">👑 Chủ phòng</span>';
                } else if (p.isReady) {
                    badge = '<span style="color:var(--emerald-bright); font-size:11px; font-weight:bold;">✅ Sẵn sàng</span>';
                } else {
                    badge = '<span style="color:var(--text-muted); font-size:11px;">⏳ Chưa sẵn sàng</span>';
                }

                let kickBtnHtml = '';
                if (isHost && !p.isHost) {
                    kickBtnHtml = `<button class="btn-kick-player" data-player-id="${p.playerId}" title="Đuổi người chơi" style="background: none; border: 1px solid var(--crimson); color: var(--crimson-bright); border-radius: 6px; padding: 2px 8px; font-size: 11px; cursor: pointer; margin-left: 8px;">❌ Đuổi</button>`;
                }

                return `
                <div class="player-row" style="${offlineStyle}">
                    <div class="player-avatar">${p.avatarUrl}</div>
                    <div class="player-info" style="flex: 1; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div class="player-name-text">${p.playerName}${offlineText}</div>
                            <div class="player-badge">
                                ${badge}
                                ${isMe ? '<span style="font-size:11px; color:var(--text-muted);"> · Bạn</span>' : ''}
                            </div>
                        </div>
                        ${kickBtnHtml}
                    </div>
                </div>`;
            }).join('');

            playerListContainer.querySelectorAll('.btn-kick-player').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetId = e.currentTarget.dataset.playerId;
                    if (confirm('🚫 Bạn có chắc chắn muốn đuổi người chơi này ra khỏi phòng không?')) {
                        await window.signalRService.kickPlayer(targetId);
                    }
                });
            });
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

        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.classList.contains('collapsed')) {
            const unreadDot = document.getElementById('unread-chat-dot');
            if (unreadDot) unreadDot.style.display = 'inline';
        }
    }
}

window.lobbyManager = new LobbyManager();
