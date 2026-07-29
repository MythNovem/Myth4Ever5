class MythicCardsRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
    }

    init(initialData) {
        this.container = document.getElementById('game-container');
        this.container.style.display = 'flex';
        this.renderTableSkeleton();
        this.updateState(initialData);
        window.gameLoader.registerRenderer('mythic_cards', this);
    }

    renderTableSkeleton() {
        this.container.innerHTML = `
            <div class="card-table-wrap">
                <div class="card-table" id="card-table">
                    <div class="player-seat seat-top-left" id="seat-top-left"></div>
                    <div class="player-seat seat-top-right" id="seat-top-right"></div>
                    <div class="player-seat seat-bottom-me" id="seat-bottom-me"></div>

                    <div class="table-center">
                        <div class="pile deck-pile" id="deck-pile">
                            <div class="deck-icon">🎴</div>
                            <div class="deck-count" id="deck-count">—</div>
                            <span class="pile-label">Bấm để rút</span>
                        </div>
                        <div class="pile discard-pile" id="discard-pile">
                            <div class="discard-top" id="discard-top-icon">✦</div>
                            <div class="discard-count" id="discard-count">0 lá</div>
                            <span class="pile-label">Đã đánh</span>
                        </div>
                    </div>
                </div>

                <div class="game-log-bar" id="game-logs-box"></div>
            </div>

            <div class="hand-area" id="hand-area">
                <span class="hand-label">Bài trên tay</span>
                <div class="hand-cards" id="my-hand-container"></div>
            </div>

            <div id="card-modal-container"></div>
        `;

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
        if (data.roomState) this.updateState(data.roomState);

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
            document.getElementById('card-table')?.classList.add('shake');
            setTimeout(() => document.getElementById('card-table')?.classList.remove('shake'), 550);
        }
    }

    updateState(state) {
        this.gameState = state;

        // Deck & discard
        const deckCountEl = document.getElementById('deck-count');
        const discardCountEl = document.getElementById('discard-count');
        const discardTopEl = document.getElementById('discard-top-icon');
        if (deckCountEl) deckCountEl.textContent = state.deckCount;
        if (discardCountEl) discardCountEl.textContent = `${state.discardPile?.length ?? 0} lá`;
        if (discardTopEl && state.discardPile?.length > 0) {
            discardTopEl.textContent = state.discardPile[state.discardPile.length - 1].icon;
        }

        const room = window.lobbyManager.currentRoom;
        if (!room) return;

        const myId = window.signalRService.getConnectionId();
        const myIndex = room.players.findIndex(p => p.connectionId === myId);
        const otherPlayers = [];
        for (let i = 1; i < room.players.length; i++) {
            otherPlayers.push(room.players[(myIndex + i) % room.players.length]);
        }

        this.renderSeat('seat-bottom-me', room.players[myIndex], state, true);
        if (otherPlayers[0]) this.renderSeat('seat-top-left', otherPlayers[0], state, false);
        if (otherPlayers[1]) this.renderSeat('seat-top-right', otherPlayers[1], state, false);

        this.renderMyHand(state, myId);

        const logsBox = document.getElementById('game-logs-box');
        if (logsBox && state.gameLogs) {
            logsBox.innerHTML = state.gameLogs
                .map(log => `<div class="log-line">${log}</div>`)
                .join('');
            logsBox.scrollTop = logsBox.scrollHeight;
        }
    }

    renderSeat(seatId, player, state, isMe) {
        const el = document.getElementById(seatId);
        if (!el || !player) return;

        const isCurrentTurn = state.currentTurnPlayerId === player.connectionId;
        const cardCount = state.playerCardCounts?.[player.connectionId] ?? 0;

        el.className = [
            'player-seat',
            seatId === 'seat-bottom-me' ? 'seat-bottom-me seat-me' : seatId === 'seat-top-left' ? 'seat-top-left' : 'seat-top-right',
            isCurrentTurn ? 'is-turn' : '',
            !player.isAlive ? 'is-dead' : ''
        ].join(' ').trim();

        el.innerHTML = `
            <div class="seat-avatar">${player.avatarUrl}</div>
            <div class="seat-name">${player.playerName}${isMe ? ' · Bạn' : ''}</div>
            <div class="seat-card-count">${player.isAlive ? `${cardCount} lá` : '💀'}</div>
            ${isCurrentTurn && state.turnsToTake > 1 ? `<div class="seat-turn-count">${state.turnsToTake} lượt</div>` : ''}
        `;
    }

    renderMyHand(state, myId) {
        const container = document.getElementById('my-hand-container');
        if (!container || !state.playerHands) return;

        const myHand = state.playerHands[myId] || [];
        const isMyTurn = state.currentTurnPlayerId === myId;

        container.innerHTML = myHand.map(card => `
            <div class="game-card card--${card.type.toLowerCase()}"
                 data-card-id="${card.id}"
                 data-card-type="${card.type}"
                 title="${card.description}">
                <span class="card-type-label">${card.type}</span>
                <span class="card-icon">${card.icon}</span>
                <span class="card-name">${card.name}</span>
                <span class="card-desc">${card.description}</span>
            </div>
        `).join('');

        container.querySelectorAll('.game-card').forEach(cardEl => {
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
        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">👁 3 Lá Bài Tiếp Theo</div>
                    <div class="modal-subtitle">Chỉ bạn nhìn thấy. Không ai khác biết.</div>
                    <div class="future-cards-row">
                        ${top3Cards.map((c, i) => `
                            <div class="game-card card--${c.type.toLowerCase()}" style="cursor:default;">
                                <span class="card-type-label">#${i + 1}</span>
                                <span class="card-icon">${c.icon}</span>
                                <span class="card-name">${c.name}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary"
                            onclick="document.getElementById('card-modal-container').innerHTML=''">
                        Đóng
                    </button>
                </div>
            </div>
        `;
    }

    showDefusePlacementModal(deckCount) {
        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🛡 Giấu Bẫy Nổ</div>
                    <div class="modal-subtitle">
                        Chọn vị trí để nhét lại Bẫy Nổ vào bộ bài.<br>
                        0 = Đầu bộ bài · ${deckCount} = Dưới cùng
                    </div>
                    <input type="range" class="trap-slider" id="trap-slider"
                           min="0" max="${deckCount}" value="${Math.floor(deckCount / 2)}">
                    <div class="slider-label" id="slider-val">Vị trí: ${Math.floor(deckCount / 2)}</div>
                    <button class="btn btn-primary" id="btn-confirm-insert">Xác Nhận</button>
                </div>
            </div>
        `;

        const slider = document.getElementById('trap-slider');
        slider?.addEventListener('input', e => {
            document.getElementById('slider-val').textContent = `Vị trí: ${e.target.value}`;
        });

        document.getElementById('btn-confirm-insert')?.addEventListener('click', () => {
            window.signalRService.sendGameAction('insert_trap', { insertIndex: parseInt(slider.value) });
            document.getElementById('card-modal-container').innerHTML = '';
        });
    }

    showStealTargetModal(cardId) {
        const room = window.lobbyManager.currentRoom;
        const myId = window.signalRService.getConnectionId();
        const targets = room.players.filter(p => p.connectionId !== myId && p.isAlive);

        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🎁 Chọn Đối Thủ</div>
                    <div class="modal-subtitle">Bạn sẽ cướp 1 lá bài ngẫu nhiên từ tay họ.</div>
                    <div class="target-player-grid">
                        ${targets.map(t => `
                            <button class="target-player-btn"
                                onclick="window.signalRService.sendGameAction('play_card',
                                    {cardId:'${cardId}',targetPlayerId:'${t.connectionId}'});
                                 document.getElementById('card-modal-container').innerHTML='';">
                                <span class="avatar">${t.avatarUrl}</span>
                                <span class="name">${t.playerName}</span>
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-ghost" onclick="document.getElementById('card-modal-container').innerHTML=''">
                        Huỷ
                    </button>
                </div>
            </div>
        `;
    }

    handleGameOver(winnerId, winnerName, summary) {
        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box gameover-modal">
                    <div class="gameover-trophy">🏆</div>
                    <div class="gameover-title">Chiến Thắng!</div>
                    <div class="gameover-winner">
                        <strong style="color:var(--lavender);">${winnerName}</strong>
                        là người duy nhất sống sót.
                    </div>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Quay Về Sảnh
                    </button>
                </div>
            </div>
        `;
    }
}

window.mythicCardsRenderer = new MythicCardsRenderer();
