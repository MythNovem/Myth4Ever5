/**
 * mythic-cards-renderer.js
 * Main orchestrator for Mythic Cards frontend UI.
 * Delegates rendering, hands, timers, and modals to specialized sub-modules.
 */
class MythicCardsRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
        window.gameLoader.registerRenderer('mythic_cards', this);

        // Bind play button action from HandRenderer
        if (window.mcHandRenderer && window.mcModalManager) {
            window.mcModalManager.bindHandRenderer(window.mcHandRenderer);
            window.mcHandRenderer.onPlayCards((selectedIds) => this.playSelectedCards(selectedIds));
        }
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

                <div class="game-log-bar" id="game-logs-box">
                    <div style="font-size:11px; font-weight:bold; color:var(--gold-bright); margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid var(--border-dim); display:flex; justify-content:space-between; align-items:center;">
                        <span>📜 Nhật Ký Trận Đấu</span>
                    </div>
                    <div id="game-logs-content"></div>
                </div>
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
            if (window.mcRulesModal) window.mcRulesModal.show();
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
                document.documentElement.requestFullscreen().catch(() => {
                    window.lobbyManager.showToast('Trình duyệt không hỗ trợ toàn màn hình.', 'warning');
                });
                btn.innerText = '⛶ Thu Nhỏ';
            } else {
                document.exitFullscreen();
                btn.innerText = '⛶ Toàn Màn Hình';
            }
        });
    }

    handleAction(actionType, data) {
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

        const myId = window.signalRService.getPlayerId();

        if (actionType === 'card_played' && data.extraData?.futureCards) {
            if (data.playerId === myId) {
                if (data.extraData.isAlter) {
                    window.mcModalManager.showAlterFutureModal(data.extraData.futureCards);
                } else {
                    window.mcModalManager.showFutureModal(data.extraData.futureCards);
                }
            }
        }
        
        if (actionType === 'future_rearranged') {
            if (data.playerId === myId) {
                window.lobbyManager.showToast('Bạn đã thay đổi tương lai thành công!', 'success');
                window.mcModalManager.clear();
            }
        }

        if (actionType === 'trap_defused_need_placement') {
            if (data.playerId === myId) {
                if (window.soundFX) window.soundFX.play('defuse');
                window.mcModalManager.showDefusePlacementModal(data.deckCount);
            }
        }

        if (actionType === 'card_stolen' || data.stealInfo || data.StealInfo) {
            const stealInfo = data.stealInfo || data.StealInfo || data.extraData?.stealInfo || data.extraData?.StealInfo;
            if (stealInfo && window.mcModalManager) {
                window.mcModalManager.showStealResultModal(stealInfo, myId);
            }
        }

        if (actionType === 'player_exploded') {
            if (window.soundFX) window.soundFX.play('explosion');
            const table = document.getElementById('card-table');
            if (table) {
                table.classList.add('shake');
                setTimeout(() => table.classList.remove('shake'), 550);
            }
        }
    }

    updateState(state) {
        if (!state) return;
        this.gameState = state;

        if (window.mcTimerRenderer) window.mcTimerRenderer.clear();

        // Deck & Discard counts
        const deckCount      = state.deckCount ?? state.DeckCount;
        const discardPile    = state.discardPile || state.DiscardPile || [];
        const gameLogs       = state.gameLogs || state.GameLogs || [];
        const deckCountEl    = document.getElementById('deck-count');
        const discardCountEl = document.getElementById('discard-count');
        const discardTopEl   = document.getElementById('discard-top-icon');

        if (deckCountEl && deckCount !== undefined) deckCountEl.textContent = deckCount;
        if (discardCountEl) discardCountEl.textContent = `${discardPile.length} lá`;
        if (discardTopEl && discardPile.length > 0) {
            discardTopEl.textContent = discardPile[discardPile.length - 1].icon;
        }

        const myId = window.signalRService.getPlayerId();
        const room = window.lobbyManager.currentRoom;

        // Render seats only if room data is available
        if (room && room.players) {
            const myIndex = room.players.findIndex(p => p.playerId === myId);
            if (myIndex >= 0) {
                const otherPlayers = [];
                for (let i = 1; i < room.players.length; i++) {
                    otherPlayers.push(room.players[(myIndex + i) % room.players.length]);
                }
                if (window.mcSeatRenderer) {
                    window.mcSeatRenderer.renderDynamicSeats(room.players[myIndex], otherPlayers, state);
                }
            }
        }

        // Hand
        if (window.mcHandRenderer) {
            window.mcHandRenderer.render(state, myId);
        }

        // Game logs
        const logsBox = document.getElementById('game-logs-box');
        const logsContent = document.getElementById('game-logs-content') || logsBox;
        if (logsContent && gameLogs) {
            logsContent.innerHTML = gameLogs.map(log => `<div class="log-line">${log}</div>`).join('');
            if (logsBox) logsBox.scrollTop = logsBox.scrollHeight;
        }

        // Timers & Favor (Always runs for ALL clients, host & guest!)
        if (window.mcTimerRenderer) window.mcTimerRenderer.render(state, myId);
        if (window.mcModalManager) window.mcModalManager.showFavorModal(state, myId);
    }

    playSelectedCards(selectedCardIds) {
        if (!selectedCardIds || selectedCardIds.length === 0) return;

        const myId = window.signalRService.getPlayerId();
        const hand = this.gameState.playerHands[myId] || [];
        const selectedCards = selectedCardIds.map(id => hand.find(c => c.id === id)).filter(c => c);
        const count = selectedCards.length;

        if (count === 1) {
            const card = selectedCards[0];
            if (card.type.startsWith('Normal')) {
                window.lobbyManager.showToast('Bài thường phải ghép bộ để đánh (2, 3, hoặc 5 lá)!', 'danger');
                return;
            }
            if (card.type === 'Steal') {
                window.mcModalManager.showTargetPlayerModal(selectedCardIds, "Chọn mục tiêu cướp bài", this.gameState, myId);
                return;
            }
            if (card.type === 'TargetedAttack') {
                window.mcModalManager.showTargetPlayerModal(selectedCardIds, "🎯 Ám Sát: Chọn mục tiêu để Ép đi 2 lượt", this.gameState, myId);
                return;
            }
            if (card.type === 'Favor') {
                window.mcModalManager.showTargetPlayerModal(selectedCardIds, "🙏 Xin Xỏ: Chọn mục tiêu để đòi 1 lá bài", this.gameState, myId);
                return;
            }
            if (window.soundFX) window.soundFX.play('play');
            window.signalRService.sendGameAction('play_card', { cardIds: selectedCardIds });
            window.mcHandRenderer.clearSelection();
        } else if (count === 2) {
            if (selectedCards[0].type !== selectedCards[1].type) {
                window.lobbyManager.showToast('Combo 2 lá phải là 2 lá giống hệt nhau!', 'danger');
                return;
            }
            window.mcModalManager.showTargetPlayerModal(selectedCardIds, "Combo 2 lá: Chọn mục tiêu Cướp Bài ngẫu nhiên", this.gameState, myId);
        } else if (count === 3) {
            const type1 = selectedCards[0].type;
            if (selectedCards[1].type !== type1 || selectedCards[2].type !== type1) {
                window.lobbyManager.showToast('Combo 3 lá phải là 3 lá giống hệt nhau!', 'danger');
                return;
            }
            window.mcModalManager.showTargetPlayerModal(selectedCardIds, "Combo 3 lá: Chọn mục tiêu để đòi 1 lá bài đích danh", this.gameState, myId);
        } else if (count === 5) {
            const types = new Set(selectedCards.map(c => c.type));
            if (types.size !== 5) {
                window.lobbyManager.showToast('Combo 5 lá phải là 5 lá KHÁC NHAU!', 'danger');
                return;
            }
            window.mcModalManager.showDiscardPileModal(this.gameState);
        } else {
            window.lobbyManager.showToast(`Không có combo cho ${count} lá bài!`, 'danger');
        }
    }

    handleAction(actionType, data) {
        const myId = window.signalRService.getPlayerId();
        if (actionType === 'card_stolen' && window.mcModalManager) {
            window.mcModalManager.showStealResultModal(data, myId);
        } else if (actionType === 'favor_resolved' && window.mcModalManager) {
            window.mcModalManager.showFavorResultModal(data, myId);
        }
    }

    handleGameOver(winnerId, winnerName, summary) {
        if (window.mcTimerRenderer) window.mcTimerRenderer.clear();
        if (window.mcModalManager) window.mcModalManager.showGameOver(winnerId, winnerName);
    }
}

window.mythicCardsRenderer = new MythicCardsRenderer();
