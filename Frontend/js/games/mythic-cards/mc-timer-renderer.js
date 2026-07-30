/**
 * mc-timer-renderer.js
 * Responsible for rendering countdown banners (Exploding bomb timer, Nope window).
 * Single Responsibility: only handles time-based UI overlays.
 */
class MCTimerRenderer {
    constructor() {
        this.activeTimers = [];
    }

    /** Clear all running timers */
    clear() {
        this.activeTimers.forEach(t => clearInterval(t));
        this.activeTimers = [];
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
        const bannerContainer = this._getBannerContainer();
        bannerContainer.innerHTML = '';

        const isExploding = state.isExploding ?? state.IsExploding;
        const explodeExpiryTime = state.explodeExpiryTime || state.ExplodeExpiryTime;
        const explodingPlayerId = state.explodingPlayerId || state.ExplodingPlayerId;

        // 1. Exploding Bomb Timer (priority)
        if (isExploding && explodeExpiryTime) {
            const expiryTime = new Date(explodeExpiryTime).getTime();
            if (expiryTime > Date.now()) {
                const isMe  = explodingPlayerId === myId;
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
                    const left = expiryTime - Date.now();
                    if (left <= 0) {
                        clearInterval(id);
                        window.signalRService.sendGameAction('resolve_exploding_timer', {});
                    } else {
                        const bar = document.getElementById('exploding-progress');
                        if (bar) bar.style.width = `${(left / 10000) * 100}%`;
                    }
                }, 50);
                this.activeTimers.push(id);
                return; // Prioritize bomb
            }
        }

        // 2. Nope Window Timer
        const pending = state.currentPendingAction || state.CurrentPendingAction;
        const expiryStr = pending?.expiryTime || pending?.ExpiryTime;
        if (pending && expiryStr) {
            const expiryTime = new Date(expiryStr).getTime();
            if (expiryTime > Date.now()) {
                const sourceId  = pending.sourcePlayerId || pending.SourcePlayerId;
                const nopeCount = pending.nopeCount !== undefined ? pending.nopeCount : (pending.NopeCount ?? 0);
                const playerObj = window.lobbyManager?.currentRoom?.players?.find(p => p.playerId === sourceId);
                const pName     = sourceId === myId ? 'Bạn' : (playerObj?.playerName || 'Người chơi');
                const isNoped   = nopeCount % 2 !== 0;
                const barColor  = isNoped ? '#ef4444' : 'var(--gold-bright)';

                const banner = document.createElement('div');
                banner.className = 'action-banner';
                banner.innerHTML = `
                    <div class="banner-title">⏱️ ${isNoped ? '🛑 ĐÃ BỊ CHẶN! 🛑' : 'ĐANG CHỜ PHẢN HỒI'}</div>
                    <div class="banner-subtitle">${pName} vừa dùng bài. Còn vài giây để ném Chặn! (Nope: ${nopeCount})</div>
                    <div class="progress-container"><div class="progress-bar" id="nope-progress" style="width:100%; background:${barColor}"></div></div>
                `;
                bannerContainer.appendChild(banner);

                const id = setInterval(() => {
                    const left = expiryTime - Date.now();
                    if (left <= 0) {
                        clearInterval(id);
                        window.signalRService.sendGameAction('resolve_pending_action', {});
                    } else {
                        const bar = document.getElementById('nope-progress');
                        if (bar) bar.style.width = `${(left / 5000) * 100}%`;
                    }
                }, 50);
                this.activeTimers.push(id);

                // Show Nope button if player has one
                const playerHands = state.playerHands || state.PlayerHands || {};
                const myHand = playerHands[myId] || [];
                const nopeCard = myHand.find(c => c.type === 'Nope');
                // Only non-source players can Nope
                if (nopeCard && sourceId !== myId) {
                    const btnWrap = document.createElement('div');
                    btnWrap.className = 'nope-btn-container';
                    btnWrap.innerHTML = `<button class="btn-nope">🛑 ĐÁNH CHẶN (NOPE)</button>`;
                    btnWrap.querySelector('.btn-nope').addEventListener('click', () => {
                        window.signalRService.sendGameAction('play_card', { cardIds: [nopeCard.id] });
                        btnWrap.remove();
                    });
                    bannerContainer.appendChild(btnWrap);
                }
            }
        }
    }
}

window.mcTimerRenderer = new MCTimerRenderer();
