/**
 * number-bomb-renderer.js
 * Frontend renderer for Game #2: Number Bomb (Bom Số 1-100).
 * Demonstrates how a new game renderer registers into GameLoader seamlessly.
 */
class NumberBombRenderer {
    constructor() {
        this.container = null;
        this.gameState = null;
        window.gameLoader.registerRenderer('number_bomb', this);
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
                <button class="btn btn-ghost" id="btn-leave-nb" style="font-size: 13px; color: var(--crimson-bright); border-color: var(--crimson);">
                    🏳️ Rời Game
                </button>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; animation: pulse 2s infinite;">💣</div>
                    <h2 style="color: var(--gold-bright); font-size: 24px; margin-top: 8px;">BOM SỐ 1 - 100</h2>
                    <p style="color: var(--text-secondary); font-size: 14px;">Đoán số trong khoảng an toàn. Ai chạm trúng số bom 💣 sẽ nổ tung!</p>
                </div>

                <!-- Range Display Card -->
                <div style="background: var(--surface-1); border: 2px solid var(--border-dim); border-radius: 16px; padding: 24px 48px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 320px;">
                    <div style="font-size: 12px; color: var(--lavender); text-transform: uppercase; letter-spacing: 1px;">Khoảng An Toàn Hiện Tại</div>
                    <div style="font-size: 40px; font-weight: 800; color: var(--emerald-bright); margin: 12px 0;" id="nb-range-display">
                        1 ─── 💣 ─── 100
                    </div>
                    <div style="font-size: 14px; color: var(--gold-bright);" id="nb-turn-display">
                        Lượt đi: —
                    </div>
                </div>

                <!-- Input & Guess Controls -->
                <div id="nb-controls" style="display: flex; gap: 12px; width: 100%; max-width: 360px;">
                    <input type="number" id="nb-input-number" class="input-field" placeholder="Nhập số đoán..." style="font-size: 18px; text-align: center;" />
                    <button class="btn btn-primary" id="btn-nb-guess" style="min-width: 110px; font-size: 16px;">Đoán!</button>
                </div>

                <!-- Game Logs Bar -->
                <div style="width: 100%; max-width: 520px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-dim); border-radius: 12px; padding: 12px; max-height: 140px; overflow-y: auto;" id="nb-logs-box">
                </div>
            </div>
            
            <div id="nb-modal-container"></div>
        `;

        document.getElementById('btn-nb-guess')?.addEventListener('click', () => this.submitGuess());
        document.getElementById('nb-input-number')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.submitGuess();
        });

        document.getElementById('btn-leave-nb')?.addEventListener('click', async () => {
            if (confirm("Bạn có chắc muốn rời game?")) {
                await window.signalRService.sendGameAction('surrender', {});
                await window.signalRService.leaveRoomExplicit();
                window.lobbyManager.clearRoomState();
            }
        });
    }

    submitGuess() {
        const input = document.getElementById('nb-input-number');
        if (!input) return;
        const val = parseInt(input.value);
        if (isNaN(val)) {
            window.lobbyManager.showToast('Vui lòng nhập một số nguyên!', 'warning');
            return;
        }
        window.signalRService.sendGameAction('guess_number', { number: val });
        input.value = '';
    }

    handleAction(actionType, data) {
        if (data) this.updateState(data);

        if (actionType === 'bomb_exploded') {
            if (window.soundFX) window.soundFX.play('explosion');
            const container = document.getElementById('game-container');
            if (container) {
                container.classList.add('shake');
                setTimeout(() => container.classList.remove('shake'), 600);
            }
        }
    }

    updateState(state) {
        this.gameState = state;

        const rangeEl = document.getElementById('nb-range-display');
        const turnEl  = document.getElementById('nb-turn-display');
        const logsEl  = document.getElementById('nb-logs-box');
        const myId    = window.signalRService.getPlayerId();

        if (rangeEl) {
            rangeEl.textContent = `${state.minRange} ─── 💣 ─── ${state.maxRange}`;
        }

        if (turnEl) {
            const isMyTurn = state.currentTurnPlayerId === myId;
            turnEl.innerHTML = isMyTurn
                ? `<span style="color:var(--emerald-bright); font-weight:bold;">👉 ĐẾN LƯỢT BẠN! (Nhập số từ ${state.minRange + 1} đến ${state.maxRange - 1})</span>`
                : `Đang chờ <strong>${state.currentTurnPlayerName}</strong> đoán...`;
        }

        if (logsEl && state.gameLogs) {
            logsEl.innerHTML = state.gameLogs.map(l => `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">${l}</div>`).join('');
            logsEl.scrollTop = logsEl.scrollHeight;
        }
    }

    handleGameOver(winnerId, winnerName, summary) {
        const myId = window.signalRService.getPlayerId();
        const isMe = winnerId === myId;
        const secretNum = summary.secretBombNumber ?? summary.SecretBombNumber ?? '??';

        const modalContainer = document.getElementById('nb-modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-backdrop" style="z-index: 10000; background: rgba(0,0,0,0.9);">
                <div class="modal-box" style="max-width: 480px; text-align: center; border: 2px solid var(--gold-bright);">
                    <div style="font-size: 48px; margin-bottom: 8px;">💥💣💥</div>
                    <div class="modal-title" style="font-size: 24px; color: ${isMe ? 'var(--gold-bright)' : 'var(--crimson-bright)'};">
                        ${isMe ? '🏆 BẠN SỐNG SÓT CHIẾN THẮNG!' : '💀 BOM ĐÃ NỔ!'}
                    </div>
                    <div style="margin: 16px 0; color: var(--text-secondary);">
                        Số bom bí mật chính là: <strong style="color: var(--crimson-bright); font-size: 24px;">[ ${secretNum} ]</strong><br>
                        Người chiến thắng là: <strong style="color: var(--gold-bright);">${winnerName}</strong>
                    </div>
                    <button class="btn btn-primary" id="btn-nb-return" style="width: 100%; font-size: 16px; padding: 12px;">
                        Quay lại phòng chờ
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-nb-return')?.addEventListener('click', () => {
            modalContainer.innerHTML = '';
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('room-view').style.display = 'block';
            document.getElementById('game-container').innerHTML = '';
        });
    }
}

window.numberBombRenderer = new NumberBombRenderer();
