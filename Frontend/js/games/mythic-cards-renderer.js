class MythicCardsRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
        this.selectedCardIds = [];
        this.activeTimers = [];
        window.gameLoader.registerRenderer('mythic_cards', this);
    }

    init(initialData) {
        this.container = document.getElementById('game-container');
        this.container.style.display = 'flex';
        this.renderTableSkeleton();
        this.updateState(initialData);
    }

    renderTableSkeleton() {
        this.container.innerHTML = `
            <div style="width: 100%; display: flex; justify-content: flex-end; padding: 10px 24px 0; gap: 8px;">
                <button class="btn btn-ghost" id="btn-fullscreen" style="font-size: 13px; color: var(--emerald-bright); border-color: var(--emerald);">
                    ⛶ Toàn Màn Hình
                </button>
                <button class="btn btn-ghost" id="btn-surrender-game" style="font-size: 13px; color: var(--crimson-bright); border-color: var(--crimson);">
                    🏳️ Chịu Thua
                </button>
                <button class="btn btn-ghost" id="btn-show-rules" style="font-size: 13px; color: var(--gold-bright);">
                    📜 Luật Chơi
                </button>
            </div>
            
            <div class="card-table-wrap">
                <div class="card-table" id="card-table">
                    <!-- Seats rendered dynamically by updateState -->

                    <div class="table-center">
                        <div class="pile deck-pile" id="deck-pile">
                            <div class="deck-icon">🎴</div>
                            <div class="deck-count" id="deck-count">—</div>
                            <span class="pile-label">Bấm để rút</span>
                        </div>
                        <div class="pile discard-pile" id="discard-pile">
                            <div class="discard-top" id="discard-top-icon">✶</div>
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
            <div id="rules-modal-container"></div>
        `;

        document.getElementById('deck-pile')?.addEventListener('click', () => {
            if (!this.gameState) return;
            const myId = window.signalRService.getPlayerId();
            if (this.gameState.currentTurnPlayerId === myId) {
                if (window.soundFX) window.soundFX.play('draw');
                window.signalRService.sendGameAction('draw_card', {});
            } else {
                if (window.soundFX) window.soundFX.play('error');
                window.lobbyManager.showToast('Chưa đến lượt của bạn!', 'warning');
            }
        });

        document.getElementById('btn-show-rules')?.addEventListener('click', () => {
            this.showRulesModal();
        });

        document.getElementById('btn-surrender-game')?.addEventListener('click', async () => {
            if (confirm("Bạn có chắc chắn muốn chịu thua và rời phòng?")) {
                await window.signalRService.sendGameAction('surrender', {});
                await window.signalRService.leaveRoomExplicit();
                window.lobbyManager.clearRoomState();
            }
        });

        document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-fullscreen');
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    window.lobbyManager.showToast('Trình duyệt không hỗ trợ toàn màn hình.', 'warning');
                });
                btn.innerText = '⛶ Thu Nhỏ';
            } else {
                document.exitFullscreen();
                btn.innerText = '⛶ Toàn Màn Hình';
            }
        });
    }

    showRulesModal() {
        const modalContainer = document.getElementById('rules-modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-backdrop" id="rules-backdrop">
                <div class="modal-box" style="max-width: 500px; text-align: left;">
                    <div class="modal-title" style="color: var(--gold-bright); margin-bottom: 16px;">📜 LUẬT CHƠI (BẪY NỔ)</div>
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6; max-height: 60vh; overflow-y: auto; padding-right: 8px;">
                        <ul style="margin-left: 16px; margin-bottom: 12px;">
                            <li style="margin-bottom: 6px;"><b>Mục tiêu:</b> Là người sống sót cuối cùng bằng cách KHÔNG rút phải <b>Bẫy Nổ</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Lượt đi:</b> Đến lượt, bạn có thể đánh <b>vô số lá bài trên tay</b> (hoặc không đánh lá nào). Sau khi đánh bài xong, bạn kết thúc lượt bằng cách <b>rút 1 lá bài</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Bẫy Nổ (💣) - 4 lá:</b> Rút phải nó là chết. Trừ khi bạn có <b>Gỡ Bẫy</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Gỡ Bẫy (🛡️) - Giới hạn:</b> Nếu rút phải Bẫy Nổ và dùng Gỡ Bẫy, bạn được quyền nhét lại quả Bẫy Nổ đó vào <b>bất kỳ vị trí nào</b> trong xấp bài để bẫy người khác.</li>
                            <li style="margin-bottom: 6px;"><b>Bỏ Lượt (⏭️) - 5 lá:</b> Chấm dứt lượt mà <b>không cần rút bài</b>. Nếu đang bị "Ép Lượt", lá này chỉ huỷ 1 lượt.</li>
                            <li style="margin-bottom: 6px;"><b>Ép Lượt (🔄) - 5 lá:</b> Chấm dứt ngay lượt của bạn và bắt <b>người tiếp theo đi 2 lượt</b> liên tiếp.</li>
                            <li style="margin-bottom: 6px;"><b>Nhìn Tương Lai (👁️) - 5 lá:</b> Xem bí mật 3 lá trên cùng của xấp bài rút.</li>
                            <li style="margin-bottom: 6px;"><b>Xáo Bài (🔀) - 5 lá:</b> Xáo trộn lại xấp bài rút.</li>
                            <li style="margin-bottom: 6px;"><b>Cướp Bài (🎁) - 5 lá:</b> Cho phép chọn và cướp 1 lá bất kỳ trên tay đối thủ.</li>
                            <li style="margin-bottom: 6px;"><b>Đổi Tương Lai (🔮) - 3 lá:</b> Xem 3 lá trên cùng và <b>sắp xếp lại</b> thứ tự.</li>
                            <li style="margin-bottom: 6px;"><b>Rút Đáy (⚓) - 3 lá:</b> Kết thúc lượt bằng cách <b>rút lá dưới cùng</b> của bộ bài.</li>
                            <li style="margin-bottom: 6px;"><b>Ám Sát (🎯) - 3 lá:</b> Ép một người chơi bất kỳ phải đi 2 lượt liên tiếp.</li>
                            <li style="margin-bottom: 6px;"><b>Bài Thường (🦊🐲🐺🧚🪨) - 40 lá:</b> Không có tác dụng đơn lẻ. Hãy dùng tính năng <b>chọn nhiều lá (Combo)</b> bằng cách click nhiều lá bài thường giống nhau để kích hoạt hiệu ứng đặc biệt (2 lá cướp bài, 3 lá xem bài).</li>
                        </ul>
                        
                        <div style="font-weight: bold; color: var(--gold-bright); margin: 16px 0 8px;">🎮 LUẬT COMBO BÀI THƯỜNG</div>
                        <p style="margin-bottom: 8px;">Bài thường (Cáo, Rồng, Sói, Tinh Linh, Golem) không có tác dụng khi đánh lẻ. Phải đánh theo bộ (Combo):</p>
                        <ul style="margin-left: 16px; margin-bottom: 12px;">
                            <li style="margin-bottom: 6px;"><b>Đôi (2 lá giống nhau):</b> Chọn 1 người chơi để <b>cướp ngẫu nhiên</b> 1 lá bài từ tay họ.</li>
                            <li style="margin-bottom: 6px;"><b>Ba (3 lá giống nhau):</b> Chọn 1 người chơi và <b>đòi đích danh 1 lá bài cụ thể</b>. Nếu họ có, họ buộc phải đưa cho bạn. Nếu không có, bạn mất trắng 3 lá!</li>
                            <li style="margin-bottom: 6px;"><b>Năm (5 lá khác nhau hoàn toàn):</b> Kích hoạt kỹ năng <b>Bới Rác</b>. Chọn 1 lá bất kỳ trong Chồng Bài Bỏ để lấy lại vào tay.</li>
                        </ul>
                        <div style="text-align:center;"><i>Càng về cuối, tỉ lệ bốc trúng bẫy càng cao! Chúc bạn may mắn.</i></div>
                    </div>
                    <button class="btn btn-primary" id="btn-close-rules" style="width: 100%; margin-top: 20px;">Đã Hiểu</button>
                </div>
            </div>
        `;

        document.getElementById('btn-close-rules').addEventListener('click', () => {
            modalContainer.innerHTML = '';
        });
        document.getElementById('rules-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'rules-backdrop') modalContainer.innerHTML = '';
        });
    }

    handleAction(actionType, data) {
        // Handle multiple possible data shapes from backend:
        // 1. { roomState: {...} }  → wrapped format
        // 2. { deckCount: ..., ... } → flat state format
        // 3. { data: {...} } → nested data format
        let stateToUpdate = null;
        if (data && data.roomState) {
            stateToUpdate = data.roomState;
        } else if (data && data.deckCount !== undefined) {
            stateToUpdate = data;
        } else if (data && data.currentPendingAction !== undefined) {
            stateToUpdate = data;
        } else if (data && data.isExploding !== undefined) {
            stateToUpdate = data;
        }
        
        if (stateToUpdate) this.updateState(stateToUpdate);

        if (actionType === 'card_played' && data.extraData?.futureCards) {
            const myId = window.signalRService.getPlayerId();
            if (data.playerId === myId) {
                if (data.extraData.isAlter) {
                    this.showAlterFutureModal(data.extraData.futureCards);
                } else {
                    this.showFutureModal(data.extraData.futureCards);
                }
            }
        }
        
        if (actionType === 'future_rearranged') {
            const myId = window.signalRService.getPlayerId();
            if (data.playerId === myId) {
                window.lobbyManager.showToast('Bạn đã thay đổi tương lai thành công!', 'success');
                document.getElementById('card-modal-container').innerHTML = '';
            }
        }

        if (actionType === 'trap_defused_need_placement') {
            const myId = window.signalRService.getPlayerId();
            if (data.playerId === myId) {
                if (window.soundFX) window.soundFX.play('defuse');
                this.showDefusePlacementModal(data.deckCount);
            }
        }

        if (actionType === 'player_exploded') {
            if (window.soundFX) window.soundFX.play('explosion');
            document.getElementById('card-table')?.classList.add('shake');
            setTimeout(() => document.getElementById('card-table')?.classList.remove('shake'), 550);
        }
    }

    updateState(state) {
        this.gameState = state;
        
        // Clear old timers
        this.activeTimers.forEach(t => clearInterval(t));
        this.activeTimers = [];
        
        // Clear UI containers for banner
        let bannerContainer = document.getElementById('action-banner-container');
        if (!bannerContainer) {
            bannerContainer = document.createElement('div');
            bannerContainer.id = 'action-banner-container';
            document.body.appendChild(bannerContainer);
        }
        bannerContainer.innerHTML = '';

        // Deck & discard
        const deckCountEl = document.getElementById('deck-count');
        const discardCountEl = document.getElementById('discard-count');
        const discardTopEl = document.getElementById('discard-top-icon');
        if (deckCountEl) deckCountEl.textContent = state.deckCount;
        if (discardCountEl) discardCountEl.textContent = `${state.discardPile?.length ?? 0} lá`;
        if (discardTopEl && state.discardPile?.length > 0) {
            discardTopEl.textContent = state.discardPile[state.discardPile.length - 1].icon;
        }

        // 2. Ghế người chơi — động theo số người (2-4)
        const room = window.lobbyManager.currentRoom;
        if (!room) return;

        const myId = window.signalRService.getPlayerId();
        const myIndex = room.players.findIndex(p => p.playerId === myId);
        const otherPlayers = [];
        for (let i = 1; i < room.players.length; i++) {
            otherPlayers.push(room.players[(myIndex + i) % room.players.length]);
        }

        // Maintain selection
        if (state.playerHands && state.playerHands[myId]) {
            const handIds = state.playerHands[myId].map(c => c.id);
            this.selectedCardIds = this.selectedCardIds.filter(id => handIds.includes(id));
        } else {
            this.selectedCardIds = [];
        }

        this.renderDynamicSeats(room.players[myIndex], otherPlayers, state);
        this.renderMyHand(state, myId);

        const logsBox = document.getElementById('game-logs-box');
        if (logsBox && state.gameLogs) {
            logsBox.innerHTML = state.gameLogs
                .map(log => `<div class="log-line">${log}</div>`)
                .join('');
            logsBox.scrollTop = logsBox.scrollHeight;
        }

        this.renderTimers(state, myId);
        this.renderFavorTarget(state, myId);
    }

    // Ghế ngồi động: chính giữa dưới = bản thân, xung quanh = đối thủ
    // Vị trí ghế theo số đối thủ:
    //   1 đối thủ  (2 người): top-center
    //   2 đối thủ  (3 người): top-left, top-right
    //   3 đối thủ  (4 người): left-mid, top-center, right-mid
    renderDynamicSeats(myPlayer, opponents, state) {
        const table = document.getElementById('card-table');
        if (!table) return;

        // Xoá các ghế đối thủ cũ trước khi vẽ lại
        table.querySelectorAll('.player-seat:not(#seat-bottom-me)').forEach(el => el.remove());

        // Ghế bản thân (luôn ở dưới giữa)
        let meSeat = document.getElementById('seat-bottom-me');
        if (!meSeat) {
            meSeat = document.createElement('div');
            meSeat.id = 'seat-bottom-me';
            table.appendChild(meSeat);
        }
        this.fillSeat(meSeat, myPlayer, state, true, 'seat-bottom-me seat-me');

        // Định nghĩa vị trí ghế đối thủ theo số người
        const seatPositions = {
            1: ['seat-top-center'],
            2: ['seat-top-left', 'seat-top-right'],
            3: ['seat-left-mid', 'seat-top-center', 'seat-right-mid'],
        };

        const positions = seatPositions[opponents.length] || seatPositions[2];

        opponents.forEach((opp, i) => {
            const posClass = positions[i];
            const seat = document.createElement('div');
            seat.id = `seat-opp-${i}`;
            this.fillSeat(seat, opp, state, false, posClass);
            table.appendChild(seat);
        });
    }

    fillSeat(el, player, state, isMe, positionClass) {
        const isCurrentTurn = state.currentTurnPlayerId === player.playerId;
        const cardCount = state.playerCardCounts?.[player.playerId] ?? 0;

        el.className = [
            'player-seat',
            positionClass,
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
        const amIExploding = state.isExploding && state.explodingPlayerId === myId;

        container.innerHTML = myHand.map(card => {
            const isSelected = this.selectedCardIds.includes(card.id);
            const isDefuse = card.type.toLowerCase() === 'defuse';
            // When exploding, dim all non-Defuse cards
            const dimmed = amIExploding && !isDefuse ? 'style="opacity:0.35; pointer-events:none;"' : '';
            return `
                <div class="game-card card--${card.type.toLowerCase()} ${isSelected ? 'selected' : ''}"
                     data-card-id="${card.id}"
                     data-card-type="${card.type}"
                     title="${card.description}"
                     draggable="true" ${dimmed}>
                    <span class="card-type-label">${card.type}</span>
                    <span class="card-icon">${card.icon}</span>
                    <span class="card-name">${card.name}</span>
                    <span class="card-desc">${card.description}</span>
                </div>
            `;
        }).join('');

        // Lock deck when exploding
        const deckPile = document.getElementById('deck-pile');
        if (deckPile) {
            if (amIExploding) {
                deckPile.style.opacity = '0.4';
                deckPile.style.pointerEvents = 'none';
                deckPile.querySelector('.pile-label').textContent = '💣 Gỡ bẫy trước!';
            } else {
                deckPile.style.opacity = '';
                deckPile.style.pointerEvents = '';
                deckPile.querySelector('.pile-label').textContent = 'Bấm để rút';
            }
        }

        let draggedCard = null;

        container.querySelectorAll('.game-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                if (amIExploding && cardEl.getAttribute('data-card-type').toLowerCase() !== 'defuse') {
                    window.lobbyManager.showToast('Bạn đang dính Bẫy Nổ! Hãy dùng lá Gỡ Bẫy!', 'danger');
                    return;
                }
                if (!isMyTurn && !amIExploding) {
                    window.lobbyManager.showToast('Chưa đến lượt của bạn!', 'warning');
                    return;
                }
                const cardId = cardEl.getAttribute('data-card-id');
                this.toggleCardSelection(cardId);
            });


            cardEl.addEventListener('dragstart', (e) => {
                draggedCard = cardEl;
                setTimeout(() => cardEl.style.opacity = '0.5', 0);
            });

            cardEl.addEventListener('dragend', () => {
                if (draggedCard) draggedCard.style.opacity = '1';
                draggedCard = null;
            });
        });

        container.addEventListener('dragover', e => {
            e.preventDefault();
            if (!draggedCard) return;
            const afterElement = this.getDragAfterElement(container, e.clientX);
            if (afterElement == null) {
                container.appendChild(draggedCard);
            } else {
                container.insertBefore(draggedCard, afterElement);
            }
        });

        container.addEventListener('drop', e => {
            e.preventDefault();
            const newOrder = Array.from(container.querySelectorAll('.game-card')).map(el => el.getAttribute('data-card-id'));
            window.signalRService.sendGameAction('reorder_hand', { cardIds: newOrder });
        });

        this.renderPlayButton(isMyTurn);
    }

    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.game-card:not([style*="opacity: 0.5"])')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    toggleCardSelection(cardId) {
        if (this.selectedCardIds.includes(cardId)) {
            this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
        } else {
            this.selectedCardIds.push(cardId);
        }
        const myId = window.signalRService.getPlayerId();
        this.renderMyHand(this.gameState, myId);
    }

    renderPlayButton(isMyTurn) {
        const handArea = document.querySelector('.hand-area');
        if (!handArea) return;

        let playBtn = document.getElementById('btn-play-selected');
        if (this.selectedCardIds.length > 0 && isMyTurn) {
            if (!playBtn) {
                playBtn = document.createElement('button');
                playBtn.id = 'btn-play-selected';
                playBtn.className = 'btn btn-primary';
                playBtn.style.position = 'absolute';
                playBtn.style.bottom = '24px';
                playBtn.style.right = '32px';
                playBtn.style.width = 'auto';
                playBtn.style.zIndex = '100';
                playBtn.style.boxShadow = '0 0 20px rgba(123, 82, 214, 0.5)';
                playBtn.style.padding = '12px 24px';
                playBtn.style.fontSize = '14px';
                playBtn.addEventListener('click', () => this.playSelectedCards());
                document.getElementById('hand-area').style.position = 'relative';
                document.getElementById('hand-area').appendChild(playBtn);
            }
            playBtn.innerText = `Đánh ${this.selectedCardIds.length} lá đã chọn`;
            playBtn.style.display = 'block';
        } else {
            if (playBtn) playBtn.style.display = 'none';
        }
    }

    playSelectedCards() {
        if (this.selectedCardIds.length === 0) return;

        const myId = window.signalRService.getPlayerId();
        const hand = this.gameState.playerHands[myId] || [];
        const selectedCards = this.selectedCardIds.map(id => hand.find(c => c.id === id)).filter(c => c);

        const count = selectedCards.length;
        
        if (count === 1) {
            const card = selectedCards[0];
            if (card.type.startsWith('Normal')) {
                window.lobbyManager.showToast('Bài thường phải ghép bộ để đánh (2, 3, hoặc 5 lá)!', 'danger');
                return;
            }
            if (card.type === 'Steal') {
                this.showTargetPlayerModal(this.selectedCardIds, "Chọn mục tiêu cướp bài");
                return;
            }
            if (card.type === 'TargetedAttack') {
                this.showTargetPlayerModal(this.selectedCardIds, "🎯 Ám Sát: Chọn mục tiêu để Ép đi 2 lượt");
                return;
            }
            // Just normal single card
            if (window.soundFX) window.soundFX.play('play');
            window.signalRService.sendGameAction('play_card', { cardIds: this.selectedCardIds });
            this.selectedCardIds = [];
        } else if (count === 2) {
            const type1 = selectedCards[0].type;
            if (selectedCards[1].type !== type1) {
                window.lobbyManager.showToast('Combo 2 lá phải là 2 lá giống hệt nhau!', 'danger');
                return;
            }
            this.showTargetPlayerModal(this.selectedCardIds, "Combo 2 lá: Chọn mục tiêu Cướp Bài ngẫu nhiên");
        } else if (count === 3) {
            const type1 = selectedCards[0].type;
            if (selectedCards[1].type !== type1 || selectedCards[2].type !== type1) {
                window.lobbyManager.showToast('Combo 3 lá phải là 3 lá giống hệt nhau!', 'danger');
                return;
            }
            this.showTargetPlayerModal(this.selectedCardIds, "Combo 3 lá: Chọn mục tiêu để đòi 1 lá bài đích danh");
        } else if (count === 5) {
            const types = new Set(selectedCards.map(c => c.type));
            if (types.size !== 5) {
                window.lobbyManager.showToast('Combo 5 lá phải là 5 lá KHÁC NHAU!', 'danger');
                return;
            }
            this.showDiscardPileModal();
        } else {
            window.lobbyManager.showToast(`Không có combo cho ${count} lá bài!`, 'danger');
        }
    }

    showAlterFutureModal(top3Cards) {
        this.currentFutureCards = top3Cards.map(c => ({...c}));
        this.renderAlterFutureModal();
    }

    renderAlterFutureModal() {
        const top3Cards = this.currentFutureCards;
        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🔮 Đổi Tương Lai</div>
                    <div class="modal-subtitle">Sắp xếp lại 3 lá bài. Lá #1 sẽ được rút tiếp theo.</div>
                    <div class="future-cards-row" style="display: flex; gap: 8px; justify-content: center; margin: 16px 0;">
                        ${top3Cards.map((c, i) => `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div class="game-card card--${c.type.toLowerCase()}" style="cursor:default; margin:0;">
                                    <span class="card-type-label">#${i + 1}</span>
                                    <span class="card-icon">${c.icon}</span>
                                    <span class="card-name">${c.name}</span>
                                </div>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-ghost" style="padding: 4px 8px; min-width: unset;" ${i===0?'disabled':''} onclick="window.mythicCardsRenderer.swapFutureCards(${i}, ${i-1})">⬅️</button>
                                    <button class="btn btn-ghost" style="padding: 4px 8px; min-width: unset;" ${i===top3Cards.length-1?'disabled':''} onclick="window.mythicCardsRenderer.swapFutureCards(${i}, ${i+1})">➡️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary" onclick="window.mythicCardsRenderer.saveFutureOrder()" style="width: 100%;">
                        Lưu Thứ Tự
                    </button>
                </div>
            </div>
        `;
    }

    swapFutureCards(idxA, idxB) {
        const temp = this.currentFutureCards[idxA];
        this.currentFutureCards[idxA] = this.currentFutureCards[idxB];
        this.currentFutureCards[idxB] = temp;
        this.renderAlterFutureModal();
    }

    saveFutureOrder() {
        const newOrderIds = this.currentFutureCards.map(c => c.id);
        window.signalRService.sendGameAction('rearrange_future', { newOrderIds });
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

    showTargetPlayerModal(cardIds, titleText) {
        const room = window.lobbyManager.currentRoom;
        const myId = window.signalRService.getPlayerId();
        const targets = room.players.filter(p => p.playerId !== myId && p.isAlive);
        
        let extraHtml = '';
        if (cardIds.length === 3) {
            extraHtml = `
                <div style="margin: 16px 0; text-align: left;">
                    <label style="color: var(--lavender); font-size: 12px; margin-bottom: 4px; display: block;">Loại bài muốn cướp:</label>
                    <select id="target-card-type-select" class="input-field" style="width: 100%; color: var(--text-primary); background: var(--surface-2);">
                        <option value="Defuse">🛡️ Gỡ Bẫy</option>
                        <option value="Skip">⏭️ Bỏ Lượt</option>
                        <option value="Attack">🔄 Ép Lượt</option>
                        <option value="SeeFuture">👁️ Nhìn Tương Lai</option>
                        <option value="Shuffle">🔀 Xáo Bài</option>
                        <option value="Steal">🎁 Cướp Bài</option>
                        <option value="Normal1">🦊 Cáo Chín Đuôi</option>
                        <option value="Normal2">🐲 Rồng Con</option>
                        <option value="Normal3">🐺 Sói Băng</option>
                        <option value="Normal4">🧚 Tinh Linh</option>
                        <option value="Normal5">🪨 Golem Đá</option>
                    </select>
                </div>
            `;
        }

        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🎯 ${titleText}</div>
                    ${extraHtml}
                    <div class="target-player-grid" style="margin-top: 16px;">
                        ${targets.map(t => `
                            <button class="target-player-btn" data-target-id="${t.playerId}">
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

        document.querySelectorAll('.target-player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPlayerId = btn.getAttribute('data-target-id');
                const payload = { cardIds, targetPlayerId };
                if (cardIds.length === 3) {
                    payload.targetCardType = document.getElementById('target-card-type-select').value;
                }
                
                const isSteal = cardIds.length === 1 && this.gameState.playerHands[myId].find(c => c.id === cardIds[0])?.type === 'Steal';
                if (isSteal) {
                    this.showStealPickerModal(targetPlayerId, cardIds);
                } else {
                    if (window.soundFX) window.soundFX.play('play');
                    window.signalRService.sendGameAction('play_card', payload);
                    this.selectedCardIds = [];
                    document.getElementById('card-modal-container').innerHTML = '';
                }
            });
        });
    }

    showStealPickerModal(targetPlayerId, cardIds) {
        const room = window.lobbyManager.currentRoom;
        const target = room.players.find(p => p.playerId === targetPlayerId);
        const cardCount = this.gameState.playerCardCounts?.[targetPlayerId] ?? 0;
        
        if (cardCount === 0) {
            window.lobbyManager.showToast('Mục tiêu không có bài trên tay!', 'warning');
            return;
        }

        const cardsHtml = Array.from({length: cardCount}).map((_, i) => `
            <div class="game-card card--hidden" style="cursor: pointer; transform: scale(0.9); margin: -5px;" onclick="window.mythicCardsRenderer.executeSteal('${targetPlayerId}', ${i}, '${cardIds[0]}')">
                <span class="card-icon">🎴</span>
                <span class="card-name">Lá #${i + 1}</span>
            </div>
        `).join('');

        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box" style="max-width: 600px;">
                    <div class="modal-title">🎁 Đang cướp bài của ${target.playerName}</div>
                    <div class="modal-subtitle">Hãy chọn 1 lá bài đang úp để lấy đi.</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 20px 0;">
                        ${cardsHtml}
                    </div>
                    <button class="btn btn-ghost" onclick="document.getElementById('card-modal-container').innerHTML=''">
                        Huỷ
                    </button>
                </div>
            </div>
        `;
    }

    executeSteal(targetPlayerId, targetCardIndex, stealCardId) {
        window.signalRService.sendGameAction('play_card', {
            cardIds: [stealCardId],
            targetPlayerId: targetPlayerId,
            targetCardIndex: targetCardIndex
        });
        if (window.soundFX) window.soundFX.play('play');
        this.selectedCardIds = [];
        document.getElementById('card-modal-container').innerHTML = '';
    }

    showDiscardPileModal() {
        if (!this.gameState || !this.gameState.discardPile || this.gameState.discardPile.length === 0) {
            window.lobbyManager.showToast('Chồng bài bỏ hiện đang trống!', 'warning');
            return;
        }

        // Distinct cards in discard pile by type (or just show all, but showing all might be too much, usually players can pick any)
        // In Exploding Kittens, you can look through the discard pile and pick ANY card you want.
        const pile = this.gameState.discardPile.filter(c => c.type !== 'ExplodingTrap'); // Cannot revive an Exploding Trap normally (or maybe you can if you want to die?)

        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box" style="max-width: 600px;">
                    <div class="modal-title">♻️ Lấy lại bài (Combo 5 lá)</div>
                    <div class="modal-subtitle">Chọn 1 lá bài bất kỳ từ chồng bài đã đánh.</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; max-height: 50vh; overflow-y: auto; justify-content: center; margin-bottom: 20px; padding-right: 8px;">
                        ${pile.map(c => `
                            <div class="game-card card--${c.type.toLowerCase()}" style="transform: scale(0.85); margin: -10px;" data-discard-id="${c.id}">
                                <span class="card-type-label">${c.type}</span>
                                <span class="card-icon">${c.icon}</span>
                                <span class="card-name">${c.name}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-ghost" onclick="document.getElementById('card-modal-container').innerHTML=''">Huỷ</button>
                </div>
            </div>
        `;

        document.querySelectorAll('.game-card[data-discard-id]').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                const targetCardIdFromDiscard = cardEl.getAttribute('data-discard-id');
                window.signalRService.sendGameAction('play_card', {
                    cardIds: this.selectedCardIds,
                    targetCardIdFromDiscard: targetCardIdFromDiscard
                });
                this.selectedCardIds = [];
                document.getElementById('card-modal-container').innerHTML = '';
            });
        });
    }

    handleGameOver(winnerId, winnerName, summary) {
        this.activeTimers.forEach(t => clearInterval(t));
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

    renderTimers(state, myId) {
        const bannerContainer = document.getElementById('action-banner-container');
        if (!bannerContainer) return;

        // 1. Exploding Timer
        if (state.isExploding && state.explodeExpiryTime) {
            const expiryTime = new Date(state.explodeExpiryTime).getTime();
            const now = new Date().getTime();
            if (expiryTime > now) {
                const isMe = state.explodingPlayerId === myId;
                const pName = isMe ? "BẠN" : (window.lobbyManager.currentRoom.players.find(p => p.playerId === state.explodingPlayerId)?.playerName || "Ai đó");
                
                const banner = document.createElement('div');
                banner.className = 'action-banner exploding';
                banner.innerHTML = `
                    <div class="banner-title">💣 BÁO ĐỘNG BẪY NỔ! 💣</div>
                    <div class="banner-subtitle">${pName} đang phải gỡ bẫy! Nhanh lên!</div>
                    <div class="progress-container"><div class="progress-bar" id="exploding-progress" style="width: 100%"></div></div>
                `;
                bannerContainer.appendChild(banner);

                const timerId = setInterval(() => {
                    const timeLeft = expiryTime - new Date().getTime();
                    if (timeLeft <= 0) {
                        clearInterval(timerId);
                        window.signalRService.sendGameAction('resolve_exploding_timer', {});
                    } else {
                        const progress = document.getElementById('exploding-progress');
                        if (progress) progress.style.width = `${(timeLeft / 10000) * 100}%`;
                    }
                }, 50);
                this.activeTimers.push(timerId);
                return; // Prioritize explosion
            }
        }

        // 2. Pending Action (Nope Window)
        if (state.currentPendingAction && state.currentPendingAction.expiryTime) {
            const expiryTime = new Date(state.currentPendingAction.expiryTime).getTime();
            const now = new Date().getTime();
            if (expiryTime > now) {
                const actionSourceId = state.currentPendingAction.sourcePlayerId;
                const pName = actionSourceId === myId ? "Bạn" : (window.lobbyManager.currentRoom.players.find(p => p.playerId === actionSourceId)?.playerName || "Người chơi");
                const isNoped = state.currentPendingAction.nopeCount % 2 !== 0;

                const banner = document.createElement('div');
                banner.className = 'action-banner';
                banner.innerHTML = `
                    <div class="banner-title">⏱️ ${isNoped ? "🛑 ĐÃ BỊ CHẶN! 🛑" : "ĐANG CHỜ PHẢN HỒI"}</div>
                    <div class="banner-subtitle">${pName} vừa dùng bài. Còn vài giây để ném Chặn! (Nope: ${state.currentPendingAction.nopeCount})</div>
                    <div class="progress-container"><div class="progress-bar" id="nope-progress" style="width: 100%; background: ${isNoped ? '#ef4444' : 'var(--gold-bright)'}"></div></div>
                `;
                bannerContainer.appendChild(banner);

                const timerId = setInterval(() => {
                    const timeLeft = expiryTime - new Date().getTime();
                    if (timeLeft <= 0) {
                        clearInterval(timerId);
                        window.signalRService.sendGameAction('resolve_pending_action', {});
                    } else {
                        const progress = document.getElementById('nope-progress');
                        // 5 seconds timer
                        if (progress) progress.style.width = `${(timeLeft / 5000) * 100}%`;
                    }
                }, 50);
                this.activeTimers.push(timerId);

                // Check if I have a Nope card
                const myHand = state.playerHands[myId] || [];
                const nopeCard = myHand.find(c => c.type === 'Nope');
                if (nopeCard) {
                    const btnContainer = document.createElement('div');
                    btnContainer.className = 'nope-btn-container';
                    btnContainer.innerHTML = `<button class="btn-nope">🛑 ĐÁNH CHẶN (NOPE)</button>`;
                    btnContainer.querySelector('.btn-nope').addEventListener('click', () => {
                        window.signalRService.sendGameAction('play_card', { cardIds: [nopeCard.id] });
                        btnContainer.remove();
                    });
                    bannerContainer.appendChild(btnContainer);
                }
            }
        }
    }

    renderFavorTarget(state, myId) {
        if (!state.awaitingFavorResponse) return;

        // If I am the target
        if (state.pendingFavorTargetId === myId) {
            const sourceName = window.lobbyManager.currentRoom.players.find(p => p.playerId === state.pendingFavorSourceId)?.playerName || "Ai đó";
            const myHand = state.playerHands[myId] || [];

            document.getElementById('card-modal-container').innerHTML = `
                <div class="modal-backdrop" style="z-index: 10000; background: rgba(0,0,0,0.85);">
                    <div class="modal-box" style="max-width: 600px;">
                        <div class="modal-title">🙏 XIN XỎ!</div>
                        <div class="modal-subtitle"><strong>${sourceName}</strong> đang dùng thẻ Xin Xỏ lên bạn. Hãy nộp 1 lá bài bất kỳ!</div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
                            ${myHand.map(c => `
                                <div class="game-card card--${c.type.toLowerCase()}" style="transform: scale(0.9); margin: -5px; cursor: pointer" data-favor-id="${c.id}">
                                    <span class="card-type-label">${c.type}</span>
                                    <span class="card-icon">${c.icon}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            document.querySelectorAll('.game-card[data-favor-id]').forEach(el => {
                el.addEventListener('click', () => {
                    const cardId = el.getAttribute('data-favor-id');
                    window.signalRService.sendGameAction('give_favor_card', { cardId: cardId });
                    document.getElementById('card-modal-container').innerHTML = '';
                });
            });
        }
    }

    handleGameOver(winnerId, winnerName, summary) {
        // Clear all timers
        this.activeTimers.forEach(t => clearInterval(t));
        this.activeTimers = [];

        // Clear action banner container
        const bannerContainer = document.getElementById('action-banner-container');
        if (bannerContainer) bannerContainer.innerHTML = '';
        
        const myId = window.signalRService.getPlayerId();
        const isMe = winnerId === myId;
        const title = isMe ? "🏆 BẠN ĐÃ CHIẾN THẮNG! 🏆" : "💀 TRÒ CHƠI KẾT THÚC! 💀";
        const subtitle = isMe ? "Tuyệt vời! Bạn là người sống sót cuối cùng!" : `Người chiến thắng là: <strong>${winnerName}</strong>`;
        
        if (window.soundFX) window.soundFX.play(isMe ? 'victory' : 'explosion'); // optionally play sound

        document.getElementById('card-modal-container').innerHTML = `
            <div class="modal-backdrop" style="z-index: 10000; background: rgba(0,0,0,0.9);">
                <div class="modal-box" style="max-width: 500px; text-align: center; border: 2px solid var(--gold-bright);">
                    <div class="modal-title" style="font-size: 24px; color: ${isMe ? 'var(--gold-bright)' : 'var(--crimson-bright)'}; margin-bottom: 12px;">${title}</div>
                    <div class="modal-subtitle" style="font-size: 16px; margin-bottom: 24px;">${subtitle}</div>
                    <button class="btn btn-primary" id="btn-return-lobby" style="width: 100%; font-size: 16px; padding: 12px;">Quay lại phòng chờ</button>
                </div>
            </div>
        `;

        document.getElementById('btn-return-lobby').addEventListener('click', () => {
            document.getElementById('card-modal-container').innerHTML = '';
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('room-view').style.display = 'block';
            
            // Hiện lại header nếu bị ẩn
            const header = document.querySelector('.app-header');
            if (header) header.style.display = 'flex';
            
            // Xóa nội dung game cũ
            document.getElementById('game-container').innerHTML = '';
        });
    }
}

window.mythicCardsRenderer = new MythicCardsRenderer();
