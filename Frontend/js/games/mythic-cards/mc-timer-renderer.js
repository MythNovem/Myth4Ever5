/**
 * mc-timer-renderer.js
 * Responsible for rendering countdown banners (Exploding bomb timer, Nope window).
 * Single Responsibility: only handles time-based UI overlays.
 */
class MCTimerRenderer {
    constructor() {
        this.activeTimers = [];
    }

    /** Clear all running timers and hide banner container */
    clear() {
        this.activeTimers.forEach(t => clearInterval(t));
        this.activeTimers = [];
        const el = document.getElementById('action-banner-container');
        if (el) el.innerHTML = '';
    }

    /** Get or create the fixed banner container */
    _getBannerContainer() {
        let el = document.getElementById('action-banner-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'action-banner-container';
            document.body.appendChild(el);
        }
        return el;
    }

    render(state, myId) {
        if (!state) return;
        
        // Stop all previous running intervals before starting new banner render
        this.activeTimers.forEach(t => clearInterval(t));
        this.activeTimers = [];

        const bannerContainer = this._getBannerContainer();
        bannerContainer.innerHTML = '';

        const isExploding = state.isExploding ?? state.IsExploding;
        const explodeExpiryTime = state.explodeExpiryTime || state.ExplodeExpiryTime;
        const explodingPlayerId = state.explodingPlayerId || state.ExplodingPlayerId;

        // 1. Exploding Bomb Timer (priority)
        if (isExploding && explodeExpiryTime) {
            const totalDurationMs = 10000;
            const parsedExpiry = new Date(explodeExpiryTime).getTime();
            let durationLeft = parsedExpiry - Date.now();

            // Guard against client clock drift
            if (isNaN(durationLeft) || durationLeft <= 0 || durationLeft > totalDurationMs) {
                durationLeft = totalDurationMs;
            }

            const startTime = Date.now();
            const isMe = explodingPlayerId === myId;
            const playerObj = window.lobbyManager?.currentRoom?.players?.find(p => p.playerId === explodingPlayerId);
            const pName = isMe ? 'BẠN' : (playerObj?.playerName || 'Đối thủ');

            const banner = document.createElement('div');
            banner.className = 'action-banner exploding';
            banner.innerHTML = `
                <div class="banner-title">💣 BÁO ĐỘNG BẪY NỔ! 💣</div>
                <div class="banner-subtitle">${pName} đang phải gỡ bẫy! Nhanh lên!</div>
                <div class="progress-container"><div class="progress-bar" id="exploding-progress" style="width:100%"></div></div>
            `;
            bannerContainer.appendChild(banner);

            const id = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const left = durationLeft - elapsed;
                if (left <= 0) {
                    clearInterval(id);
                    window.signalRService.sendGameAction('resolve_exploding_timer', {});
                } else {
                    const bar = document.getElementById('exploding-progress');
                    if (bar) bar.style.width = `${Math.max(0, (left / totalDurationMs) * 100)}%`;
                }
            }, 50);
            this.activeTimers.push(id);
            return; // Prioritize bomb
        }

        // 2. Nope Window Timer
        const pending = state.currentPendingAction || state.CurrentPendingAction;
        const expiryStr = pending?.expiryTime || pending?.ExpiryTime;
        if (pending && expiryStr) {
            const totalDurationMs = 10000;
            const parsedExpiry = new Date(expiryStr).getTime();
            let durationLeft = parsedExpiry - Date.now();

            // Guard against client clock drift
            if (isNaN(durationLeft) || durationLeft <= 0 || durationLeft > totalDurationMs) {
                durationLeft = totalDurationMs;
            }

            const startTime = Date.now();
            const sourceId  = pending.sourcePlayerId || pending.SourcePlayerId;
            const nopeCount = pending.nopeCount !== undefined ? pending.nopeCount : (pending.NopeCount ?? 0);
            const cardNames = pending.cardNames || pending.CardNames || 'lá bài';
            const playerObj = window.lobbyManager?.currentRoom?.players?.find(p => p.playerId === sourceId);
            const pName     = sourceId === myId ? 'Bạn' : (playerObj?.playerName || 'Người chơi');
            const isNoped   = nopeCount % 2 !== 0;
            const barColor  = isNoped ? '#ef4444' : 'var(--gold-bright)';

            const banner = document.createElement('div');
            banner.className = 'action-banner';
            banner.innerHTML = `
                <div class="banner-title">⏱️ ${isNoped ? '🛑 ĐÃ BỊ CHẶN! 🛑' : 'ĐANG CHỜ PHẢN HỒI'}</div>
                <div class="banner-subtitle">
                    <strong>${pName}</strong> vừa đánh: <strong style="color:var(--gold-bright); font-size:14px;">${cardNames}</strong>.<br>
                    ${isNoped ? 'Hành động đang bị vô hiệu hoá!' : 'Còn vài giây để ném Chặn!'} (Đã Chặn: ${nopeCount} lần)
                </div>
                <div class="progress-container"><div class="progress-bar" id="nope-progress" style="width:100%; background:${barColor}"></div></div>
            `;
            bannerContainer.appendChild(banner);

            const id = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const left = durationLeft - elapsed;
                if (left <= 0) {
                    clearInterval(id);
                    window.signalRService.sendGameAction('resolve_pending_action', {});
                } else {
                    const bar = document.getElementById('nope-progress');
                    if (bar) bar.style.width = `${Math.max(0, (left / totalDurationMs) * 100)}%`;
                }
            }, 50);
            this.activeTimers.push(id);

                // Show action buttons (Nope / Pass) for non-source players
                if (sourceId !== myId) {
                    const playerHands = state.playerHands || state.PlayerHands || {};
                    const myHand = playerHands[myId] || [];
                    const nopeCard = myHand.find(c => c.type === 'Nope');

                    const btnWrap = document.createElement('div');
                    btnWrap.className = 'nope-btn-container';
                    btnWrap.style.display = 'flex';
                    btnWrap.style.gap = '8px';
                    btnWrap.style.marginTop = '8px';

                    let buttonsHtml = '';
                    if (nopeCard) {
                        buttonsHtml += `<button class="btn-nope" id="btn-do-nope">🛑 ĐÁNH CHẶN (NOPE)</button>`;
                    }
                    buttonsHtml += `<button class="btn btn-ghost" id="btn-pass-nope" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.3); font-size: 13px; padding: 6px 14px;">⏩ Bỏ Qua (Cho Qua)</button>`;

                    btnWrap.innerHTML = buttonsHtml;

                    const doNopeBtn = btnWrap.querySelector('#btn-do-nope');
                    if (doNopeBtn && nopeCard) {
                        doNopeBtn.addEventListener('click', () => {
                            window.signalRService.sendGameAction('play_card', { cardIds: [nopeCard.id] });
                            btnWrap.remove();
                        });
                    }

                    const passNopeBtn = btnWrap.querySelector('#btn-pass-nope');
                    if (passNopeBtn) {
                        passNopeBtn.addEventListener('click', () => {
                            window.signalRService.sendGameAction('resolve_pending_action', {});
                            btnWrap.remove();
                        });
                    }

                    bannerContainer.appendChild(btnWrap);
                }
            }
    }
}

window.mcTimerRenderer = new MCTimerRenderer();
