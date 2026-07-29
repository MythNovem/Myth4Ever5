class MythicCardsRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
    }

    init(initialData) {
        this.container = document.getElementById('game-container');
        this.renderTableSkeleton();
        this.updateState(initialData);

        // Đăng ký với GameLoader
        window.gameLoader.registerRenderer('mythic_cards', this);
    }

    renderTableSkeleton() {
        this.container.innerHTML = `
            <div class="card-table" id="card-table">
                <!-- 3 vị trí người chơi -->
                <div class="player-slot top-left" id="seat-top-left"></div>
                <div class="player-slot top-right" id="seat-top-right"></div>
                <div class="player-slot bottom-center" id="seat-bottom-center"></div>

                <!-- Trung tâm bàn bài -->
                <div class="table-center">
                    <div class="deck-pile" id="deck-pile">
                        <span style="font-size: 32px;">🎴</span>
                        <div class="pile-count" id="deck-count">0</div>
                        <div class="pile-label">Bấm để Rút</div>
                    </div>
                    <div class="discard-pile" id="discard-pile">
                        <span style="font-size: 32px;" id="discard-top-icon">🗑️</span>
                        <div class="pile-count" id="discard-count">0</div>
                        <div class="pile-label">Đã đánh</div>
                    </div>
                </div>
            </div>

            <!-- Bàn tay người chơi (Hand) -->
            <div class="hand-container" id="my-hand-container"></div>

            <!-- Game Logs -->
            <div class="glass-panel" style="max-width: 800px; margin: 16px auto; padding: 12px; height: 100px; overflow-y: auto;" id="game-logs-box"></div>

            <!-- Modal Container -->
            <div id="card-modal-container"></div>
        `;

        // Gán event bấm vào Bộ bài để rút bài
        document.getElementById('deck-pile')?.addEventListener('click', () => {
            if (!this.gameState) return;
            const myId = window.signalRService.getConnectionId();
            if (this.gameState.currentTurnPlayerId === myId) {
                window.signalRService.sendGameAction('draw_card', {});
            } else {
                window.lobbyManager.showToast('Chưa đến lượt của bạn!', 'warning');
            }
        });
    }

    handleAction(actionType, data) {
        if (data.roomState) {
            this.updateState(data.roomState);
        }

        if (actionType === 'card_played' && data.extraData?.futureCards) {
            this.showFutureModal(data.extraData.futureCards);
        }

        if (actionType === 'trap_defused_need_placement') {
            const myId = window.signalRService.getConnectionId();
            if (data.playerId === myId) {
                this.showDefusePlacementModal(data.deckCount);
            }
        }

        if (actionType === 'player_exploded') {
            document.getElementById('card-table')?.classList.add('shake-screen');
            setTimeout(() => document.getElementById('card-table')?.classList.remove('shake-screen'), 600);
        }
    }

    updateState(state) {
        this.gameState = state;

        // 1. Cập nhật Deck Count & Discard Count
        document.getElementById('deck-count').innerText = state.deckCount;
        document.getElementById('discard-count').innerText = state.discardPile ? state.discardPile.length : 0;
        
        if (state.discardPile && state.discardPile.length > 0) {
            const topDiscard = state.discardPile[state.discardPile.length - 1];
            document.getElementById('discard-top-icon').innerText = topDiscard.icon;
        }

        // 2. Cập nhật Vị trí 3 Người chơi trên bàn
        const room = window.lobbyManager.currentRoom;
        if (!room) return;

        const myId = window.signalRService.getConnectionId();
        const myIndex = room.players.findIndex(p => p.connectionId === myId);
        
        // Sắp xếp người chơi sao cho bản thân luôn ở seat-bottom-center
        const otherPlayers = [];
        for (let i = 1; i < room.players.length; i++) {
            const idx = (myIndex + i) % room.players.length;
            otherPlayers.push(room.players[idx]);
        }

        // Seat Bottom Center (Bản thân)
        const myPlayerObj = room.players[myIndex];
        this.renderPlayerSeat('seat-bottom-center', myPlayerObj, state, true);

        // Seat Top Left (Đối thủ 1)
        if (otherPlayers[0]) {
            this.renderPlayerSeat('seat-top-left', otherPlayers[0], state, false);
        }

        // Seat Top Right (Đối thủ 2)
        if (otherPlayers[1]) {
            this.renderPlayerSeat('seat-top-right', otherPlayers[1], state, false);
        }

        // 3. Render Bài trên tay bản thân (My Hand)
        this.renderMyHand(state, myId);

        // 4. Render Game Logs
        const logsBox = document.getElementById('game-logs-box');
        if (logsBox && state.gameLogs) {
            logsBox.innerHTML = state.gameLogs.map(log => `<div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">• ${log}</div>`).join('');
            logsBox.scrollTop = logsBox.scrollHeight;
        }
    }

    renderPlayerSeat(seatId, player, state, isMe) {
        const seatEl = document.getElementById(seatId);
        if (!seatEl || !player) return;

        const isCurrentTurn = state.currentTurnPlayerId === player.connectionId;
        const cardCount = state.playerCardCounts ? (state.playerCardCounts[player.connectionId] || 0) : 0;

        seatEl.className = `player-slot ${seatId.replace('seat-', '')} ${isCurrentTurn ? 'active-turn' : ''} ${!player.isAlive ? 'dead' : ''}`;
        seatEl.innerHTML = `
            <div class="player-avatar-badge">${player.avatarUrl}</div>
            <div class="player-name">${player.playerName} ${isMe ? '(Bạn)' : ''}</div>
            <div class="player-card-count">${player.isAlive ? `🎴 ${cardCount} lá` : '💀 Đã loại'}</div>
            ${isCurrentTurn ? `<div style="font-size: 11px; color: #38bdf8; font-weight: 700;">Lượt đi (${state.turnsToTake} lượt)</div>` : ''}
        `;
    }

    renderMyHand(state, myId) {
        const handContainer = document.getElementById('my-hand-container');
        if (!handContainer || !state.playerHands) return;

        const myHand = state.playerHands[myId] || [];
        const isMyTurn = state.currentTurnPlayerId === myId;

        handContainer.innerHTML = myHand.map(card => `
            <div class="game-card card-${card.type.toLowerCase()}" data-card-id="${card.id}" data-card-type="${card.type}">
                <div style="font-size: 11px; font-weight: 700; color: ${card.color};">${card.name}</div>
                <div class="card-icon">${card.icon}</div>
                <div class="card-desc">${card.description}</div>
            </div>
        `).join('');

        // Thêm sự kiện click đánh bài
        handContainer.querySelectorAll('.game-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                if (!isMyTurn) {
                    window.lobbyManager.showToast('Chưa đến lượt của bạn!', 'warning');
                    return;
                }
                const cardId = cardEl.getAttribute('data-card-id');
                const cardType = cardEl.getAttribute('data-card-type');

                if (cardType === 'Steal') {
                    this.showStealTargetModal(cardId);
                } else {
                    window.signalRService.sendGameAction('play_card', { cardId });
                }
            });
        });
    }

    showFutureModal(top3Cards) {
        const modalContainer = document.getElementById('card-modal-container');
        modalContainer.innerHTML = `
            <div class="game-modal-backdrop">
                <div class="game-modal glass-panel">
                    <h2 style="margin-bottom: 16px;">👁️ 3 Lá Bài Tiếp Theo</h2>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
                        ${top3Cards.map((c, idx) => `
                            <div class="game-card card-${c.type.toLowerCase()}" style="transform: none;">
                                <div style="font-size: 11px; font-weight: 700; color: ${c.color};">Top ${idx + 1}: ${c.name}</div>
                                <div class="card-icon">${c.icon}</div>
                                <div class="card-desc">${c.description}</div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-primary" onclick="document.getElementById('card-modal-container').innerHTML = ''">Đóng</button>
                </div>
            </div>
        `;
    }

    showDefusePlacementModal(deckCount) {
        const modalContainer = document.getElementById('card-modal-container');
        modalContainer.innerHTML = `
            <div class="game-modal-backdrop">
                <div class="game-modal glass-panel">
                    <h2 style="color: #06b6d4; margin-bottom: 12px;">🛡️ Giấu Bài Bẫy Nổ</h2>
                    <p style="margin-bottom: 16px; color: #94a3b8;">Chọn vị trí bạn muốn giấu lá Bẫy Nổ lại vào bộ bài (0 = Đầu bộ bài, ${deckCount} = Dưới cùng):</p>
                    <input type="range" id="trap-slider" min="0" max="${deckCount}" value="0" style="width: 100%; margin-bottom: 12px;">
                    <div style="font-size: 20px; font-weight: 800; margin-bottom: 20px;" id="slider-val">Vị trí: 0 (Đầu bộ bài)</div>
                    <button class="btn-primary" id="btn-confirm-insert">Xác Nhận Giấu Bẫy</button>
                </div>
            </div>
        `;

        const slider = document.getElementById('trap-slider');
        slider?.addEventListener('input', (e) => {
            document.getElementById('slider-val').innerText = `Vị trí: ${e.target.value} ${e.target.value == 0 ? '(Đầu bộ bài)' : ''}`;
        });

        document.getElementById('btn-confirm-insert')?.addEventListener('click', () => {
            const idx = parseInt(slider.value);
            window.signalRService.sendGameAction('insert_trap', { insertIndex: idx });
            modalContainer.innerHTML = '';
        });
    }

    showStealTargetModal(cardId) {
        const room = window.lobbyManager.currentRoom;
        const myId = window.signalRService.getConnectionId();
        const targets = room.players.filter(p => p.connectionId !== myId && p.isAlive);

        const modalContainer = document.getElementById('card-modal-container');
        modalContainer.innerHTML = `
            <div class="game-modal-backdrop">
                <div class="game-modal glass-panel">
                    <h2 style="color: #f59e0b; margin-bottom: 16px;">🎁 Chọn Đối Thủ Để Cướp Bài</h2>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
                        ${targets.map(t => `
                            <button class="btn-secondary" onclick="window.signalRService.sendGameAction('play_card', { cardId: '${cardId}', targetPlayerId: '${t.connectionId}' }); document.getElementById('card-modal-container').innerHTML = '';">
                                <span style="font-size: 24px;">${t.avatarUrl}</span><br>
                                <strong>${t.playerName}</strong>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    handleGameOver(winnerId, winnerName, summary) {
        const modalContainer = document.getElementById('card-modal-container');
        modalContainer.innerHTML = `
            <div class="game-modal-backdrop">
                <div class="game-modal glass-panel" style="border-color: #f59e0b;">
                    <h1 style="font-size: 40px; margin-bottom: 12px;">🏆 CHIẾN THẮNG!</h1>
                    <p style="font-size: 20px; font-weight: 700; color: #38bdf8; margin-bottom: 20px;">Người chơi [${winnerName}] là người duy nhất sống sót!</p>
                    <button class="btn-primary" onclick="location.reload()">Về Sảnh Chờ</button>
                </div>
            </div>
        `;
    }
}

window.mythicCardsRenderer = new MythicCardsRenderer();
