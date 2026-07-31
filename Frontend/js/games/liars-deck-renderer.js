/**
 * liars-deck-renderer.js
 * Vintage Liar's Bar Style Renderer for Game #4: Liar's Deck.
 * Supports standalone metallic revolver pistol facing vertically upwards, shot counter badge "Đã bắn 0/6", and manual click-to-shoot.
 */
class LiarsDeckRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
        this.selectedCardIds = new Set();
        window.gameLoader.registerRenderer('liars_deck', this);
    }

    init(initialData) {
        this.container = document.getElementById('game-container');
        if (this.container) {
            this.container.style.display = 'flex';
        }
        this.selectedCardIds.clear();
        this.renderTableSkeleton();
        this.updateState(initialData);
    }

    renderTableSkeleton() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="ld-container">
                <!-- Header Bar -->
                <div class="ld-header-bar">
                    <div class="ld-logo">
                        🃏 LIAR'S DECK
                    </div>
                    <button class="btn btn-ghost" id="btn-leave-ld" style="font-size: 12px; color: var(--crimson-bright); border-color: var(--crimson);">
                        🏳️ Rời Bàn
                    </button>
                </div>

                <!-- Arena with Circular Wooden Bar Table -->
                <div class="ld-arena" id="ld-arena">
                    <!-- Clean Wooden Circle Table -->
                    <div class="ld-poker-table">
                        <div class="ld-table-badge">
                            <div class="ld-table-badge-title" id="ld-table-rank-title">👑 BÀN KING</div>
                        </div>

                        <!-- Center Cards Stack -->
                        <div class="ld-table-pile-container">
                            <div class="ld-table-pile-card">🎴</div>
                            <div class="ld-table-pile-badge" id="ld-pile-badge">0 lá bài trên bàn</div>
                        </div>

                        <div class="ld-status-text" id="ld-turn-status">Lượt đi: —</div>
                    </div>

                    <!-- Dynamic Radial Seats rendered around table -->
                    <div id="ld-seats-wrapper"></div>
                </div>

                <!-- Player Hand & Controls Section -->
                <div class="ld-hand-container">
                    <div class="ld-hand-title" id="ld-hand-subtitle">Bài Trên Tay Bạn (Chọn 1 - 3 lá)</div>
                    <div class="ld-hand-cards" id="ld-hand-cards"></div>

                    <div class="ld-controls-bar">
                        <button class="btn-play-cards" id="btn-ld-play" disabled>
                            🃏 Đánh Bài (0 lá)
                        </button>
                        <button class="btn-challenge" id="btn-ld-challenge" disabled>
                            🚨 TỐ DỐI TRÁO!
                        </button>
                    </div>
                </div>

                <!-- Floating Game Logs -->
                <div class="ld-logs-drawer" id="ld-logs-drawer"></div>
            </div>

            <div id="ld-modal-container"></div>
        `;

        // Event Listeners
        document.getElementById('btn-leave-ld')?.addEventListener('click', async () => {
            if (confirm("Bạn có chắc muốn rời khỏi bàn chơi?")) {
                await window.signalRService.sendGameAction('surrender', {});
                await window.signalRService.leaveRoomExplicit();
                window.lobbyManager.clearRoomState();
            }
        });

        document.getElementById('btn-ld-play')?.addEventListener('click', () => this.submitPlayCards());
        document.getElementById('btn-ld-challenge')?.addEventListener('click', () => this.submitChallenge());
    }

    submitPlayCards() {
        if (this.selectedCardIds.size === 0) return;
        const cardIds = Array.from(this.selectedCardIds);
        window.signalRService.sendGameAction('play_cards', { cardIds: cardIds });
        this.selectedCardIds.clear();
    }

    submitChallenge() {
        if (!confirm("Bạn có chắc chắn muốn TỐ người chơi vừa rồi dối tráo?")) return;
        window.signalRService.sendGameAction('challenge', {});
    }

    triggerGunShoot() {
        window.signalRService.sendGameAction('trigger_gun', {});
    }

    handleAction(actionType, data) {
        if (data) this.updateState(data);

        if (actionType === 'cards_played') {
            if (window.soundFX) window.soundFX.play('card');
        } else if (actionType === 'challenge_revealed') {
            if (window.soundFX) window.soundFX.play('click');
        } else if (actionType === 'gun_fired' && data && data.lastChallengeResult) {
            const res = data.lastChallengeResult;
            if (res.didGunFire) {
                if (window.soundFX) window.soundFX.play('explosion');
            } else {
                if (window.soundFX) window.soundFX.play('click');
            }
            this.showChallengeModal(res);
        }
    }

    updateState(state) {
        this.gameState = state;
        const myId = window.signalRService.getPlayerId();
        const isMyTurn = state.currentTurnPlayerId === myId;
        const mustShootId = state.pendingShootPlayerId;

        // 1. Update Table Rank Title
        const rankTitleEl = document.getElementById('ld-table-rank-title');
        if (rankTitleEl) {
            rankTitleEl.textContent = state.tableRankName || state.tableRank || 'BÀN KING';
        }

        // 2. Update Center Table Cards Badge
        const pileBadgeEl = document.getElementById('ld-pile-badge');
        if (pileBadgeEl) {
            pileBadgeEl.textContent = `${state.tablePileCount || 0} lá bài trên bàn`;
        }

        // 3. Update Turn Status inside Table Felt
        const statusEl = document.getElementById('ld-turn-status');
        if (statusEl) {
            if (mustShootId) {
                if (mustShootId === myId) {
                    statusEl.innerHTML = `<span style="color:var(--crimson-bright); font-weight:bold; font-size:14px; animation:pulse 1s infinite;">💥 BẠN THUA TỐ! Click khẩu súng bên phải tên mình để bóp cò!</span>`;
                } else {
                    const shooterObj = state.players.find(p => p.playerId === mustShootId);
                    statusEl.innerHTML = `<span style="color:var(--gold-bright); font-weight:bold;">⏳ Đang chờ <strong>${shooterObj ? shooterObj.playerName : 'đối thủ'}</strong> bóp cò súng...</span>`;
                }
            } else if (isMyTurn) {
                statusEl.innerHTML = `<span style="color:var(--emerald-bright); font-weight:bold;">👉 ĐẾN LƯỢT BẠN! Chọn 1-3 lá bài để Đánh hoặc bấm Tố.</span>`;
            } else {
                statusEl.innerHTML = `Đang chờ <strong>${state.currentTurnPlayerName}</strong> hành động...`;
            }
        }

        // 4. Render Radial Seats around Circular Table with Vertical Standalone Revolver
        const seatsWrapper = document.getElementById('ld-seats-wrapper');
        if (seatsWrapper && state.players) {
            const players = state.players;
            const totalPlayers = players.length;
            let myIndex = players.findIndex(p => p.playerId === myId);
            if (myIndex === -1) myIndex = 0;

            seatsWrapper.innerHTML = players.map((p, i) => {
                const relIndex = (i - myIndex + totalPlayers) % totalPlayers;
                const posClass = this.getSeatPosClass(relIndex, totalPlayers);
                const isCurrent = p.playerId === state.currentTurnPlayerId;
                const isMe = p.playerId === myId;
                const isPendingShooter = p.playerId === mustShootId;

                return `
                    <div class="ld-seat ${posClass} ${isCurrent ? 'active-turn' : ''} ${!p.isAlive ? 'dead' : ''}">
                        <!-- Seat Player Box (Left) -->
                        <div class="ld-seat-box">
                            <div class="ld-seat-avatar">${p.isAlive ? (p.avatarUrl || '👤') : '💀'}</div>
                            <div class="ld-seat-info">
                                <div class="ld-seat-name">${p.playerName} ${isMe ? '(Bạn)' : ''}</div>
                                <div class="ld-seat-cards-count">🎴 ${p.cardsCount} lá bài</div>
                            </div>
                        </div>

                        <!-- Standalone Vertical Revolver Pistol (Right) -->
                        <div class="ld-standalone-revolver ${isPendingShooter && isMe ? 'must-shoot' : ''}" 
                             id="gun-btn-${p.playerId}" 
                             title="${isPendingShooter && isMe ? 'Click để tự bóp cò súng!' : `Khẩu Súng Lục Ổ Xoay — Đã bắn ${p.totalShotsFired}/6 phát`}">
                            
                            ${this.getRevolverSvgHtml()}

                            <div class="ld-revolver-counter-badge">
                                <span class="ld-shot-text">Đã bắn</span>
                                <span class="ld-shot-num">${p.totalShotsFired}/6</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Click listener for side gun when must shoot
            if (mustShootId && mustShootId === myId) {
                const gunBtn = document.getElementById(`gun-btn-${myId}`);
                gunBtn?.addEventListener('click', () => {
                    if (this.isShooting) return;
                    this.isShooting = true;
                    gunBtn.classList.add('shooting-anim');
                    setTimeout(() => {
                        this.triggerGunShoot();
                        this.isShooting = false;
                    }, 350);
                });
            }
        }

        // 5. Render Hand Cards in Fan Layout
        const cardsRowEl = document.getElementById('ld-hand-cards');
        if (cardsRowEl) {
            let myHand = [];
            if (state.hands) {
                myHand = state.hands[myId] || state.hands[myId.toLowerCase()] || [];
            }

            // Prune invalid selected card IDs
            const validIds = new Set(myHand.map(c => c.id || c.Id));
            for (let id of this.selectedCardIds) {
                if (!validIds.has(id)) this.selectedCardIds.delete(id);
            }

            if (myHand.length === 0) {
                cardsRowEl.innerHTML = `<div style="font-size: 13px; color: rgba(255,255,255,0.5); padding: 12px;">(Bạn không có lá bài nào trên tay)</div>`;
            } else {
                const totalCards = myHand.length;
                cardsRowEl.innerHTML = myHand.map((card, idx) => {
                    const cardId = card.id || card.Id;
                    const rawRank = card.rank !== undefined ? card.rank : card.Rank;
                    const rankName = this.normalizeRank(rawRank);
                    const isSelected = this.selectedCardIds.has(cardId);

                    // Calculate fan rotation angle (-12deg to +12deg)
                    let rotateDeg = 0;
                    if (totalCards > 1) {
                        const mid = (totalCards - 1) / 2;
                        rotateDeg = (idx - mid) * 6;
                    }

                    return this.renderVintageCardHtml(cardId, rankName, isSelected, rotateDeg);
                }).join('');
            }

            // Card Click Listeners
            cardsRowEl.querySelectorAll('.ld-card').forEach(cardEl => {
                cardEl.addEventListener('click', () => {
                    if (mustShootId) {
                        window.lobbyManager.showToast('Bạn phải BÓP CÒ SÚNG trước khi đánh bài!', 'warning');
                        return;
                    }
                    const cid = cardEl.getAttribute('data-id');
                    if (this.selectedCardIds.has(cid)) {
                        this.selectedCardIds.delete(cid);
                    } else {
                        if (this.selectedCardIds.size >= 3) {
                            window.lobbyManager.showToast('Bạn chỉ được chọn tối đa 3 lá bài!', 'warning');
                            return;
                        }
                        this.selectedCardIds.add(cid);
                    }
                    this.updateState(this.gameState);
                });
            });
        }

        // 6. Action Button Controls
        const btnPlay = document.getElementById('btn-ld-play');
        const btnChallenge = document.getElementById('btn-ld-challenge');

        if (btnPlay) {
            const count = this.selectedCardIds.size;
            btnPlay.textContent = `🃏 Đánh Bài (${count} lá)`;
            btnPlay.disabled = !isMyTurn || count === 0 || count > 3 || Boolean(mustShootId);
        }

        if (btnChallenge) {
            const canChallenge = state.lastClaim && state.lastClaim.canChallenge && state.lastClaim.playerId !== myId;
            btnChallenge.disabled = !isMyTurn || !canChallenge || Boolean(mustShootId);
        }

        // 7. Update Game Logs
        const logsDrawer = document.getElementById('ld-logs-drawer');
        if (logsDrawer && state.gameLogs) {
            logsDrawer.innerHTML = state.gameLogs.map(log => `<div style="margin-bottom: 2px;">${log}</div>`).join('');
            logsDrawer.scrollTop = logsDrawer.scrollHeight;
        }
    }

    getRevolverSvgHtml() {
        return `
            <svg class="ld-revolver-svg" viewBox="0 0 100 60">
                <!-- Gun Barrel -->
                <rect x="5" y="14" width="45" height="10" rx="2" fill="url(#metalGrad)" stroke="#111" stroke-width="1"/>
                <path d="M 8 14 L 12 9 L 14 14 Z" fill="#333"/>
                <!-- Revolver Cylinder -->
                <rect x="50" y="11" width="22" height="16" rx="3" fill="url(#cylinderGrad)" stroke="#111" stroke-width="1"/>
                <line x1="50" y1="19" x2="72" y2="19" stroke="#111" stroke-width="1.5"/>
                <!-- Gun Frame -->
                <path d="M 45 24 L 72 24 L 72 32 L 60 38 L 45 28 Z" fill="url(#metalGrad)"/>
                <!-- Trigger Guard & Trigger -->
                <path d="M 52 24 Q 46 36 60 35 L 60 28" fill="none" stroke="#555" stroke-width="2"/>
                <path d="M 56 25 Q 53 30 58 31" fill="none" stroke="#aaa" stroke-width="1.5"/>
                <!-- Hammer -->
                <path d="M 72 13 L 78 10 L 75 16 Z" fill="#555"/>
                <!-- Wood Handle Grip -->
                <path d="M 68 28 L 88 52 Q 80 58 65 52 L 58 35 Z" fill="url(#woodGrad)" stroke="#2b180d" stroke-width="1.5"/>
                <circle cx="76" cy="42" r="2" fill="#d4af37"/>
                <defs>
                    <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#777777"/>
                        <stop offset="50%" stop-color="#333333"/>
                        <stop offset="100%" stop-color="#1a1a1a"/>
                    </linearGradient>
                    <linearGradient id="cylinderGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#444444"/>
                        <stop offset="50%" stop-color="#888888"/>
                        <stop offset="100%" stop-color="#222222"/>
                    </linearGradient>
                    <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#964b00"/>
                        <stop offset="50%" stop-color="#5c2e0b"/>
                        <stop offset="100%" stop-color="#2d1705"/>
                    </linearGradient>
                </defs>
            </svg>
        `;
    }

    renderVintageCardHtml(cardId, rankName, isSelected, rotateDeg) {
        const firstLetter = rankName[0];
        const icon = this.getCardIcon(rankName);

        // Convert rank word (K-I-N-G, Q-U-E-E-N, etc.) into vertical letters stack
        const lettersHtml = rankName.split('').map(l => `<span class="ld-corner-letter">${l}</span>`).join('');

        const transformStyle = isSelected
            ? `transform: translateY(-30px) rotate(0deg) scale(1.1);`
            : `transform: rotate(${rotateDeg}deg);`;

        return `
            <div class="ld-card ${isSelected ? 'selected' : ''}" data-id="${cardId}" data-rank="${rankName}" style="${transformStyle}">
                <!-- Top-Left Corner -->
                <div class="ld-card-corner top-left">
                    <span class="ld-corner-rank">${firstLetter}</span>
                    <div class="ld-corner-vertical-letters">${lettersHtml}</div>
                </div>

                <!-- Center Main Illustration Emblem (Clean without text) -->
                <div class="ld-card-center-emblem">
                    <div class="ld-emblem-icon">${icon}</div>
                </div>

                <!-- Bottom-Right Corner (Inverted) -->
                <div class="ld-card-corner bottom-right">
                    <span class="ld-corner-rank">${firstLetter}</span>
                    <div class="ld-corner-vertical-letters">${lettersHtml}</div>
                </div>
            </div>
        `;
    }

    normalizeRank(rank) {
        if (rank === 0 || rank === '0' || rank === 'King' || rank === 'king') return 'King';
        if (rank === 1 || rank === '1' || rank === 'Queen' || rank === 'queen') return 'Queen';
        if (rank === 2 || rank === '2' || rank === 'Ace' || rank === 'ace') return 'Ace';
        if (rank === 3 || rank === '3' || rank === 'Joker' || rank === 'joker') return 'Joker';
        return String(rank || 'King');
    }

    getSeatPosClass(relIndex, totalPlayers) {
        if (totalPlayers === 2) {
            return relIndex === 0 ? 'pos-bottom' : 'pos-top';
        }
        if (totalPlayers === 3) {
            if (relIndex === 0) return 'pos-bottom';
            if (relIndex === 1) return 'pos-top-right';
            return 'pos-top-left';
        }
        // 4 Players
        if (relIndex === 0) return 'pos-bottom';
        if (relIndex === 1) return 'pos-right';
        if (relIndex === 2) return 'pos-top';
        return 'pos-left';
    }

    getCardIcon(rank) {
        switch (rank) {
            case 'King': return '👑';
            case 'Queen': return '👸';
            case 'Ace': return '🅰️';
            case 'Joker': return '🃏';
            default: return '🎴';
        }
    }

    showChallengeModal(result) {
        const modalContainer = document.getElementById('ld-modal-container');
        if (!modalContainer) return;

        const revealedCardsHtml = result.revealedCards.map(c => {
            const rankName = this.normalizeRank(c.rank || c.Rank);
            return this.renderVintageCardHtml(c.id || c.Id, rankName, false, 0);
        }).join('');

        modalContainer.innerHTML = `
            <div class="ld-roulette-modal">
                <div class="ld-roulette-box">
                    <div style="font-size: 36px;">🚨</div>
                    <div style="font-size: 20px; font-weight: 800; color: var(--gold-bright);">KẾT QUẢ CÒ QUAY NGA</div>
                    
                    <div style="font-size: 14px; color: #fff;">
                        <strong>${result.shooterName}</strong> đã tự bóp cò khẩu súng rulo!
                    </div>

                    <div style="font-size: 12px; color: var(--gold-bright); margin-top: 4px;">CÁC LÁ BÀI BỊ TỐ:</div>
                    <div style="display: flex; gap: 8px; justify-content: center; margin: 8px 0; min-height: 175px;">${revealedCardsHtml}</div>

                    <div style="font-size: 15px; font-weight: bold; color: ${result.wasLying ? 'var(--crimson-bright)' : 'var(--emerald-bright)'};">
                        ${result.wasLying ? `❌ ${result.claimantName} đã nói dối!` : `✅ ${result.claimantName} đã nói thật (hoặc dùng Joker)!`}
                    </div>

                    <div class="ld-gun-result-banner ${result.didGunFire ? 'bang' : 'blank'}">
                        ${result.didGunFire ? `💥 BANG! Súng của ${result.shooterName} NỔ TUNG!` : `💨 CLICK! Súng của ${result.shooterName} KHÔNG NỔ (Blank)!`}
                    </div>

                    <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px;">
                        ${result.didGunFire ? `${result.shooterName} bị xử thua và loại khỏi ván chơi.` : `${result.shooterName} sống sót và chuyển sang khoang đạn tiếp theo.`}
                    </div>

                    <button class="btn btn-primary" id="btn-close-ld-modal" style="width: 100%; margin-top: 12px; font-size: 15px; padding: 12px;">
                        Tiếp tục ván đấu
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-close-ld-modal')?.addEventListener('click', () => {
            modalContainer.innerHTML = '';
        });
    }

    handleGameOver(winnerId, winnerName, summary) {
        const myId = window.signalRService.getPlayerId();
        const isMe = winnerId === myId;
        const modalContainer = document.getElementById('ld-modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-backdrop" style="z-index: 10000; background: rgba(0,0,0,0.9);">
                <div class="modal-box" style="max-width: 480px; text-align: center; border: 2px solid var(--gold-bright);">
                    <div style="font-size: 48px; margin-bottom: 8px;">${isMe ? '🏆👑' : '💀🔫'}</div>
                    <div class="modal-title" style="font-size: 24px; color: ${isMe ? 'var(--gold-bright)' : 'var(--crimson-bright)'};">
                        ${isMe ? 'BẠN LÀ NGƯỜI SỐNG SÓT DUY NHẤT!' : 'GAME OVER!'}
                    </div>
                    <div style="margin: 16px 0; color: var(--text-secondary); font-size: 16px;">
                        Người chiến thắng trò chơi là: <strong style="color: var(--gold-bright);">${winnerName}</strong>
                    </div>
                    <button class="btn btn-primary" id="btn-ld-return" style="width: 100%; font-size: 16px; padding: 12px;">
                        Quay lại phòng chờ
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-ld-return')?.addEventListener('click', () => {
            modalContainer.innerHTML = '';
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('room-view').style.display = 'block';
            document.getElementById('game-container').innerHTML = '';
        });
    }
}

window.liarsDeckRenderer = new LiarsDeckRenderer();
