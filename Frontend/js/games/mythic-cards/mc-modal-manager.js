/**
 * mc-modal-manager.js
 * Manages all in-game modal dialogs:
 *   - See Future / Alter Future
 *   - Defuse placement slider
 *   - Target player picker
 *   - Steal card picker
 *   - Discard pile browser (5-card combo)
 *   - Favor response
 *   - Game over screen
 *
 * Single Responsibility: knows nothing about game rules or state transitions.
 * It shows UI and emits SignalR actions based on user input.
 */
class MCModalManager {
    constructor() {
        this._currentFutureCards = [];
        this._selectedCardIds = null; // Reference injected from hand renderer
    }

    /** Provide reference to hand renderer's selectedCardIds getter */
    bindHandRenderer(handRenderer) {
        this._handRenderer = handRenderer;
    }

    _container() { return document.getElementById('card-modal-container'); }

    clear() { const c = this._container(); if (c) c.innerHTML = ''; }

    // ─── See Future ─────────────────────────────────────────────────────────────
    showFutureModal(top3Cards) {
        this._container().innerHTML = `
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
                    <button class="btn btn-primary" onclick="document.getElementById('card-modal-container').innerHTML=''">Đóng</button>
                </div>
            </div>`;
    }

    // ─── Alter Future ───────────────────────────────────────────────────────────
    showAlterFutureModal(top3Cards) {
        this._currentFutureCards = top3Cards.map(c => ({...c}));
        this._renderAlterFuture();
    }

    _renderAlterFuture() {
        const cards = this._currentFutureCards;
        this._container().innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🔮 Đổi Tương Lai</div>
                    <div class="modal-subtitle">Sắp xếp lại 3 lá bài. Lá #1 sẽ được rút tiếp theo.</div>
                    <div class="future-cards-row" style="display:flex; gap:8px; justify-content:center; margin:16px 0;">
                        ${cards.map((c, i) => `
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                                <div class="game-card card--${c.type.toLowerCase()}" style="cursor:default; margin:0;">
                                    <span class="card-type-label">#${i + 1}</span>
                                    <span class="card-icon">${c.icon}</span>
                                    <span class="card-name">${c.name}</span>
                                </div>
                                <div style="display:flex; gap:4px;">
                                    <button class="btn btn-ghost" style="padding:4px 8px; min-width:unset;"
                                        ${i === 0 ? 'disabled' : ''} onclick="window.mcModalManager.swapFutureCards(${i},${i-1})">⬅️</button>
                                    <button class="btn btn-ghost" style="padding:4px 8px; min-width:unset;"
                                        ${i === cards.length-1 ? 'disabled' : ''} onclick="window.mcModalManager.swapFutureCards(${i},${i+1})">➡️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary" onclick="window.mcModalManager.saveFutureOrder()" style="width:100%;">Lưu Thứ Tự</button>
                </div>
            </div>`;
    }

    swapFutureCards(a, b) {
        [this._currentFutureCards[a], this._currentFutureCards[b]] = [this._currentFutureCards[b], this._currentFutureCards[a]];
        this._renderAlterFuture();
    }

    saveFutureOrder() {
        window.signalRService.sendGameAction('rearrange_future', { newOrderIds: this._currentFutureCards.map(c => c.id) });
    }

    // ─── Defuse Placement ────────────────────────────────────────────────────────
    showDefusePlacementModal(deckCount) {
        const mid = Math.floor(deckCount / 2);
        this._container().innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🛡 Giấu Bẫy Nổ</div>
                    <div class="modal-subtitle">Chọn vị trí để nhét lại Bẫy Nổ vào bộ bài.<br>0 = Đầu · ${deckCount} = Dưới cùng</div>
                    <input type="range" class="trap-slider" id="trap-slider" min="0" max="${deckCount}" value="${mid}">
                    <div class="slider-label" id="slider-val">Vị trí: ${mid}</div>
                    <button class="btn btn-primary" id="btn-confirm-insert">Xác Nhận</button>
                </div>
            </div>`;

        const slider = document.getElementById('trap-slider');
        slider?.addEventListener('input', e => document.getElementById('slider-val').textContent = `Vị trí: ${e.target.value}`);
        document.getElementById('btn-confirm-insert')?.addEventListener('click', () => {
            window.signalRService.sendGameAction('insert_trap', { insertIndex: parseInt(slider.value) });
            this.clear();
        });
    }

    // ─── Target Player ───────────────────────────────────────────────────────────
    showTargetPlayerModal(cardIds, titleText, gameState, myId) {
        const room    = window.lobbyManager.currentRoom;
        const targets = room.players.filter(p => p.playerId !== myId && p.isAlive);

        let extraHtml = '';
        if (cardIds.length === 3) {
            extraHtml = `
                <div style="margin:16px 0; text-align:left;">
                    <label style="color:var(--lavender); font-size:12px; margin-bottom:4px; display:block;">Loại bài muốn cướp:</label>
                    <select id="target-card-type-select" class="input-field" style="width:100%; color:var(--text-primary); background:var(--surface-2);">
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
                </div>`;
        }

        this._container().innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box">
                    <div class="modal-title">🎯 ${titleText}</div>
                    ${extraHtml}
                    <div class="target-player-grid" style="margin-top:16px;">
                        ${targets.map(t => `
                            <button class="target-player-btn" data-target-id="${t.playerId}">
                                <span class="avatar">${t.avatarUrl}</span>
                                <span class="name">${t.playerName}</span>
                            </button>`).join('')}
                    </div>
                    <button class="btn btn-ghost" onclick="window.mcModalManager.clear()">Huỷ</button>
                </div>
            </div>`;

        document.querySelectorAll('.target-player-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPlayerId = btn.getAttribute('data-target-id');
                const payload = { cardIds, targetPlayerId };
                if (cardIds.length === 3) payload.targetCardType = document.getElementById('target-card-type-select').value;

                // Check if it is a Steal card OR a 2-card combo (needs face-down card picker)
                const isSteal = (cardIds.length === 1 && gameState.playerHands[myId]?.find(c => c.id === cardIds[0])?.type === 'Steal') || cardIds.length === 2;
                if (isSteal) {
                    this.showStealPickerModal(targetPlayerId, cardIds, gameState);
                } else {
                    if (window.soundFX) window.soundFX.play('play');
                    window.signalRService.sendGameAction('play_card', payload);
                    if (this._handRenderer) this._handRenderer.clearSelection();
                    this.clear();
                }
            });
        });
    }

    // ─── Steal Picker ────────────────────────────────────────────────────────────
    showStealPickerModal(targetPlayerId, cardIds, gameState) {
        const room      = window.lobbyManager.currentRoom;
        const target    = room.players.find(p => p.playerId === targetPlayerId);
        const cardCount = gameState.playerCardCounts?.[targetPlayerId] ?? 0;

        if (cardCount === 0) { window.lobbyManager.showToast('Mục tiêu không có bài trên tay!', 'warning'); return; }

        const jsonCardIds = JSON.stringify(cardIds).replace(/"/g, '&quot;');
        const cardsHtml = Array.from({length: cardCount}).map((_, i) => `
            <div class="game-card card--hidden" style="cursor:pointer; transform:scale(0.9); margin:-5px;"
                 onclick="window.mcModalManager.executeSteal('${targetPlayerId}', ${i}, ${jsonCardIds})">
                <span class="card-icon">🎴</span>
                <span class="card-name">Lá #${i + 1}</span>
            </div>`).join('');

        this._container().innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box" style="max-width:600px;">
                    <div class="modal-title">🎁 Đang cướp bài của ${target.playerName}</div>
                    <div class="modal-subtitle">Hãy chọn 1 lá bài đang úp để lấy đi.</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:20px 0;">${cardsHtml}</div>
                    <button class="btn btn-ghost" onclick="window.mcModalManager.clear()">Huỷ</button>
                </div>
            </div>`;
    }

    executeSteal(targetPlayerId, targetCardIndex, cardIds) {
        const ids = Array.isArray(cardIds) ? cardIds : [cardIds];
        window.signalRService.sendGameAction('play_card', { cardIds: ids, targetPlayerId, targetCardIndex });
        if (window.soundFX) window.soundFX.play('play');
        if (this._handRenderer) this._handRenderer.clearSelection();
        this.clear();
    }

    // ─── Steal Result Popup / Animation ──────────────────────────────────────────
    showStealResultModal(stealInfo, myId) {
        if (!stealInfo) return;
        const robberId   = stealInfo.robberId || stealInfo.RobberId;
        const robberName = stealInfo.robberName || stealInfo.RobberName || 'Người chơi';
        const victimId   = stealInfo.victimId || stealInfo.VictimId;
        const victimName = stealInfo.victimName || stealInfo.VictimName || 'Đối thủ';
        const card       = stealInfo.stolenCard || stealInfo.StolenCard;

        if (!card) return;

        const isRobber = myId === robberId;
        const isVictim = myId === victimId;

        if (!isRobber && !isVictim) {
            window.lobbyManager.showToast(`🎁 ${robberName} vừa cướp 1 lá bài của ${victimName}!`, 'info');
            return;
        }

        const titleText = isRobber ? '🎁 CƯỚP BÀI THÀNH CÔNG!' : '💔 BẠN ĐÃ BỊ CƯỚP BÀI!';
        const subtitleText = isRobber
            ? `Bạn vừa cướp được từ <strong>${victimName}</strong>:`
            : `<strong>${robberName}</strong> vừa cướp mất lá bài này của bạn:`;
        const titleColor = isRobber ? 'var(--gold-bright)' : 'var(--crimson-bright)';
        const btnColor   = isRobber ? '' : 'background: var(--crimson-bright);';

        if (window.soundFX) window.soundFX.play(isRobber ? 'victory' : 'error');

        this._container().innerHTML = `
            <div class="modal-backdrop" style="z-index: 10000; animation: fadeIn 0.25s ease;">
                <div class="modal-box" style="text-align: center; border: 2px solid ${titleColor}; max-width: 420px;">
                    <div style="font-size: 44px; margin-bottom: 4px;">${isRobber ? '🎁' : '💔'}</div>
                    <div class="modal-title" style="color: ${titleColor}; font-size: 20px;">${titleText}</div>
                    <div class="modal-subtitle" style="margin: 8px 0 16px;">${subtitleText}</div>
                    <div class="game-card card--${card.type.toLowerCase()}" style="margin: 0 auto 20px; transform: scale(1.1); cursor: default;">
                        <span class="card-type-label">${card.type}</span>
                        <span class="card-icon">${card.icon}</span>
                        <span class="card-name">${card.name}</span>
                        <span class="card-desc">${card.description}</span>
                    </div>
                    <button class="btn btn-primary" onclick="window.mcModalManager.clear()" style="width: 100%; ${btnColor}">Đã Hiểu</button>
                </div>
            </div>`;
    }

    // ─── Favor Result Popup ──────────────────────────────────────────
    showFavorResultModal(favorData, myId) {
        if (!favorData) return;
        const sourceId   = favorData.sourcePlayerId || favorData.SourcePlayerId;
        const sourceName = favorData.sourceName || favorData.SourceName || 'Người chơi';
        const targetId   = favorData.targetPlayerId || favorData.TargetPlayerId;
        const targetName = favorData.targetName || favorData.TargetName || 'Đối thủ';
        const card       = favorData.givenCard || favorData.GivenCard;

        if (!card) return;

        const isSource = myId === sourceId;
        const isTarget = myId === targetId;

        if (!isSource && !isTarget) {
            window.lobbyManager.showToast(`🎁 ${targetName} vừa cho ${sourceName} 1 lá bài!`, 'info');
            return;
        }

        if (isSource) {
            const titleColor = 'var(--gold-bright)';
            if (window.soundFX) window.soundFX.play('victory');

            this._container().innerHTML = `
                <div class="modal-backdrop" style="z-index: 10000; animation: fadeIn 0.25s ease;">
                    <div class="modal-box" style="text-align: center; border: 2px solid ${titleColor}; max-width: 420px;">
                        <div style="font-size: 44px; margin-bottom: 4px;">🎁</div>
                        <div class="modal-title" style="color: ${titleColor}; font-size: 20px;">XIN BÀI THÀNH CÔNG!</div>
                        <div class="modal-subtitle" style="margin: 8px 0 16px;"><strong>${targetName}</strong> vừa nộp cho bạn lá bài này:</div>
                        <div class="game-card card--${card.type.toLowerCase()}" style="margin: 0 auto 20px; transform: scale(1.1); cursor: default;">
                            <span class="card-type-label">${card.type}</span>
                            <span class="card-icon">${card.icon}</span>
                            <span class="card-name">${card.name}</span>
                            <span class="card-desc">${card.description}</span>
                        </div>
                        <button class="btn btn-primary w-full" id="btn-close-favor-result">Tuyệt Mật & Nhận Bài</button>
                    </div>
                </div>
            `;
            document.getElementById('btn-close-favor-result')?.addEventListener('click', () => this.clear());
        }
    }

    // ─── Discard Browser (5-card combo) ─────────────────────────────────────────
    showDiscardPileModal(gameState) {
        if (!gameState?.discardPile?.length) {
            window.lobbyManager.showToast('Chồng bài bỏ hiện đang trống!', 'warning');
            return;
        }
        const pile = gameState.discardPile.filter(c => c.type !== 'ExplodingTrap');
        const selectedIds = this._handRenderer?.selectedCardIds ?? [];

        this._container().innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-box" style="max-width:600px;">
                    <div class="modal-title">♻️ Lấy lại bài (Combo 5 lá)</div>
                    <div class="modal-subtitle">Chọn 1 lá bài bất kỳ từ chồng bài đã đánh.</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; max-height:50vh; overflow-y:auto; justify-content:center; margin-bottom:20px; padding-right:8px;">
                        ${pile.map(c => `
                            <div class="game-card card--${c.type.toLowerCase()}" style="transform:scale(0.85); margin:-10px;" data-discard-id="${c.id}">
                                <span class="card-type-label">${c.type}</span>
                                <span class="card-icon">${c.icon}</span>
                                <span class="card-name">${c.name}</span>
                            </div>`).join('')}
                    </div>
                    <button class="btn btn-ghost" onclick="window.mcModalManager.clear()">Huỷ</button>
                </div>
            </div>`;

        document.querySelectorAll('.game-card[data-discard-id]').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                window.signalRService.sendGameAction('play_card', {
                    cardIds: selectedIds,
                    targetCardIdFromDiscard: cardEl.getAttribute('data-discard-id')
                });
                if (this._handRenderer) this._handRenderer.clearSelection();
                this.clear();
            });
        });
    }

    // ─── Favor Response ──────────────────────────────────────────────────────────
    showFavorModal(state, myId) {
        if (!state.awaitingFavorResponse || state.pendingFavorTargetId !== myId) return;
        const sourceName = window.lobbyManager.currentRoom?.players.find(p => p.playerId === state.pendingFavorSourceId)?.playerName || 'Ai đó';
        const myHand     = state.playerHands?.[myId] || [];

        this._container().innerHTML = `
            <div class="modal-backdrop" style="z-index:10000; background:rgba(0,0,0,0.85);">
                <div class="modal-box" style="max-width:600px;">
                    <div class="modal-title">🙏 XIN XỎ!</div>
                    <div class="modal-subtitle"><strong>${sourceName}</strong> đang dùng thẻ Xin Xỏ lên bạn. Hãy nộp 1 lá bài bất kỳ!</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:20px;">
                        ${myHand.map(c => `
                            <div class="game-card card--${c.type.toLowerCase()}" style="transform:scale(0.9); margin:-5px; cursor:pointer" data-favor-id="${c.id}">
                                <span class="card-type-label">${c.type}</span>
                                <span class="card-icon">${c.icon}</span>
                            </div>`).join('')}
                    </div>
                </div>
            </div>`;

        document.querySelectorAll('.game-card[data-favor-id]').forEach(el => {
            el.addEventListener('click', () => {
                window.signalRService.sendGameAction('give_favor_card', { cardId: el.getAttribute('data-favor-id') });
                this.clear();
            });
        });
    }

    // ─── Game Over ───────────────────────────────────────────────────────────────
    showGameOver(winnerId, winnerName) {
        const myId   = window.signalRService.getPlayerId();
        const isMe   = winnerId === myId;
        const title  = isMe ? '🏆 BẠN ĐÃ CHIẾN THẮNG! 🏆' : '💀 TRÒ CHƠI KẾT THÚC! 💀';
        const subtitle = isMe ? 'Tuyệt vời! Bạn là người sống sót cuối cùng!' : `Người chiến thắng là: <strong>${winnerName}</strong>`;
        const color  = isMe ? 'var(--gold-bright)' : 'var(--crimson-bright)';

        if (window.soundFX) window.soundFX.play(isMe ? 'victory' : 'explosion');

        this._container().innerHTML = `
            <div class="modal-backdrop" style="z-index:10000; background:rgba(0,0,0,0.9);">
                <div class="modal-box" style="max-width:500px; text-align:center; border:2px solid var(--gold-bright);">
                    <div class="modal-title" style="font-size:24px; color:${color}; margin-bottom:12px;">${title}</div>
                    <div class="modal-subtitle" style="font-size:16px; margin-bottom:24px;">${subtitle}</div>
                    <button class="btn btn-primary" id="btn-return-lobby" style="width:100%; font-size:16px; padding:12px;">Quay lại phòng chờ</button>
                </div>
            </div>`;

        document.getElementById('btn-return-lobby').addEventListener('click', () => {
            this.clear();
            if (window.mcTimerRenderer) window.mcTimerRenderer.clear();
            const bannerContainer = document.getElementById('action-banner-container');
            if (bannerContainer) bannerContainer.innerHTML = '';

            document.getElementById('game-container').style.display = 'none';
            document.getElementById('room-view').style.display       = 'block';
            const header = document.querySelector('.app-header');
            if (header) header.style.display = 'flex';
            document.getElementById('game-container').innerHTML = '';
        });
    }
}

window.mcModalManager = new MCModalManager();
