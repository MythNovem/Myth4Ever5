/**
 * HexaHiveRenderer — Renderer for Game #3: HexaHive / MythicHive: Bug Tactics
 */
class HexaHiveRenderer {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.rulesModal = null;

        this.room = null;
        this.state = null;
        this.myPlayerId = '';

        // Viewport camera
        this.hexRadius = 38;
        this.cameraX = 0;
        this.cameraY = 0;
        this.isDraggingBg = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Selection & Highlight state
        this.selectedHandPiece = null;
        this.selectedBoardCoord = null;
        this.validTargetCoords = [];

        this.boundResize = this.onResize.bind(this);

        if (window.gameLoader) {
            window.gameLoader.registerRenderer('hexahive', this);
        }
    }

    init(initialData) {
        if (!this.rulesModal && window.HexaHiveRulesModal) {
            this.rulesModal = new window.HexaHiveRulesModal();
        }

        if (window.signalRService) {
            this.myPlayerId = window.signalRService.getPlayerId();
        }

        this.container = document.getElementById('game-container');
        if (this.container) {
            this.container.style.display = 'flex';
            this.container.style.width = '100vw';
            this.container.style.height = '100vh';
        }

        this.renderTable(null, initialData);
    }

    handleAction(actionType, data) {
        if (data) this.updateState(data);
    }

    handleGameOver(winnerId, winnerName, summary) {
        if (summary) this.updateState(summary);
    }

    renderTable(room, state) {
        this.room = room;
        this.state = state;

        const appContainer = document.getElementById('game-container');
        if (!appContainer) return;

        appContainer.innerHTML = `
            <div id="hexahive-container" class="hexahive-layout" style="width: 100%; height: 100vh; display: flex; flex-direction: column; background: #0d0b18; color: #fff; overflow: hidden; position: absolute; inset: 0;">
                <!-- TOP HEADER BAR -->
                <div class="hexahive-header glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: rgba(23, 20, 41, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(139, 92, 246, 0.3); z-index: 100;">
                    <div class="header-left" style="display: flex; align-items: center; gap: 12px;">
                        <span class="game-badge" style="font-weight: 700; color: #fbbf24; font-size: 16px;">🐝 MythicHive: Bug Tactics</span>
                        <span id="turn-badge" class="turn-badge" style="background: rgba(139, 92, 246, 0.3); padding: 4px 10px; border-radius: 8px; font-size: 13px;">Lượt 1</span>
                    </div>
                    <div class="header-center">
                        <div id="turn-status-msg" class="turn-status" style="font-size: 15px; font-weight: 600;">Đang chờ...</div>
                    </div>
                    <div class="header-right" style="display: flex; gap: 10px;">
                        <button id="btn-hexahive-rules" class="btn btn-ghost" style="font-size: 13px;">❓ Hướng Dẫn Luật</button>
                        <button id="btn-hexahive-pass" class="btn btn-ghost hidden" style="font-size: 13px; color: #ef4444; border-color: #ef4444;">⏩ Bỏ Qua Lượt</button>
                    </div>
                </div>

                <!-- MAIN WORKSPACE -->
                <div class="hexahive-workspace" style="flex: 1; display: flex; position: relative; overflow: hidden;">
                    <!-- LEFT HAND PANEL -->
                    <div id="hexahive-hand-panel" class="hexahive-hand-panel glass-card" style="width: 280px; background: rgba(23, 20, 41, 0.85); backdrop-filter: blur(10px); border-right: 1px solid rgba(139, 92, 246, 0.2); padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 10;">
                        <h3 style="font-size: 14px; color: #fbbf24; margin: 0;">🎒 Kho Quân Cờ Của Bạn</h3>
                        <div id="hand-pieces-list" class="hand-pieces-list" style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1;"></div>
                    </div>

                    <!-- CANVAS HEX BOARD -->
                    <div class="canvas-wrapper" style="flex: 1; position: relative; background: #070510;">
                        <canvas id="hexahive-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
                        <div id="canvas-controls" class="canvas-controls" style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 8px; z-index: 20;">
                            <button id="btn-zoom-in" class="btn btn-ghost" title="Phóng to" style="width: 40px; height: 40px; font-size: 18px; padding: 0;">+</button>
                            <button id="btn-zoom-out" class="btn btn-ghost" title="Thu nhỏ" style="width: 40px; height: 40px; font-size: 18px; padding: 0;">-</button>
                            <button id="btn-reset-cam" class="btn btn-ghost" title="Căn giữa bàn cờ" style="width: 40px; height: 40px; font-size: 18px; padding: 0;">🎯</button>
                        </div>
                    </div>

                    <!-- RIGHT LOGS PANEL -->
                    <div class="hexahive-logs-panel glass-card" style="width: 260px; background: rgba(23, 20, 41, 0.85); backdrop-filter: blur(10px); border-left: 1px solid rgba(139, 92, 246, 0.2); padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 10;">
                        <h3 style="font-size: 14px; color: #fbbf24; margin: 0;">📜 Nhật Ký Trận Đấu</h3>
                        <div id="hexahive-logs" class="logs-content" style="flex: 1; overflow-y: auto; font-size: 12px; color: #a78bfa; display: flex; flex-direction: column; gap: 6px;"></div>
                    </div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('hexahive-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.onResize();
        }

        window.removeEventListener('resize', this.boundResize);
        window.addEventListener('resize', this.boundResize);

        this.bindEvents();
        this.updateState(state);

        if (this.canvas) {
            this.cameraX = this.canvas.width / 2;
            this.cameraY = this.canvas.height / 2;
        }
        this.draw();
    }

    updateState(state) {
        if (!state) return;
        this.state = state;

        if (window.signalRService) {
            this.myPlayerId = window.signalRService.getPlayerId();
        }

        const currentTurnPlayerId = state.currentTurnPlayerId || state.CurrentTurnPlayerId || '';
        const isMyTurn = currentTurnPlayerId === this.myPlayerId;

        if (!isMyTurn) {
            this.selectedHandPiece = null;
            this.selectedBoardCoord = null;
            this.validTargetCoords = [];
        }

        this.updateHeaderUI();
        this.updateHandUI();
        this.updateLogsUI();
        this.draw();

        const winnerId = state.winnerPlayerId || state.WinnerPlayerId;
        const isDraw = state.isDraw || state.IsDraw;

        if (winnerId || isDraw) {
            this.showGameOverModal(state);
        }
    }

    updateHeaderUI() {
        const turnBadge = document.getElementById('turn-badge');
        const statusMsg = document.getElementById('turn-status-msg');
        const passBtn = document.getElementById('btn-hexahive-pass');

        const turnNum = this.state?.turnNumber ?? this.state?.TurnNumber ?? 1;
        if (turnBadge) turnBadge.textContent = `Lượt ${turnNum}`;

        const currentTurnPlayerId = this.state?.currentTurnPlayerId || this.state?.CurrentTurnPlayerId || '';
        const currentTurnPlayerName = this.state?.currentTurnPlayerName || this.state?.CurrentTurnPlayerName || '';
        const isMyTurn = currentTurnPlayerId === this.myPlayerId;

        if (statusMsg) {
            statusMsg.textContent = isMyTurn
                ? `👉 ĐẾN LƯỢT BẠN! Chọn quân để đặt hoặc di chuyển.`
                : `⏳ Đang chờ ${currentTurnPlayerName || 'đối thủ'} suy nghĩ...`;
            statusMsg.style.color = isMyTurn ? '#22c55e' : '#a78bfa';
        }

        if (passBtn) {
            passBtn.classList.toggle('hidden', !isMyTurn);
        }
    }

    updateHandUI() {
        const handList = document.getElementById('hand-pieces-list');
        if (!handList) return;

        const unplacedHands = this.state?.unplacedHands || this.state?.UnplacedHands || {};
        const myHand = unplacedHands[this.myPlayerId] || [];

        const currentTurnPlayerId = this.state?.currentTurnPlayerId || this.state?.CurrentTurnPlayerId || '';
        const isMyTurn = currentTurnPlayerId === this.myPlayerId;

        const groups = {};
        myHand.forEach(p => {
            const pType = p.pieceType || p.PieceType || '';
            if (!groups[pType]) groups[pType] = [];
            groups[pType].push(p);
        });

        const pieceIcons = {
            queen: '👑', ant: '🐜', spider: '🕷️', grasshopper: '🦗',
            beetle: '🪲', ladybug: '🐞', mosquito: '🦟', pillbug: '🛡️'
        };

        const pieceNames = {
            queen: 'Ong Chúa', ant: 'Kiến', spider: 'Nhện', grasshopper: 'Châu Chấu',
            beetle: 'Bọ Cánh Cứng', ladybug: 'Bọ Rùa', mosquito: 'Muỗi', pillbug: 'Bọ Cuộn'
        };

        handList.innerHTML = Object.keys(pieceIcons).map(type => {
            const count = groups[type]?.length || 0;
            const selectedType = this.selectedHandPiece ? (this.selectedHandPiece.pieceType || this.selectedHandPiece.PieceType) : null;
            const isSelected = selectedType === type;
            const disabled = count === 0 || !isMyTurn;

            return `
                <button class="btn btn-ghost ${isSelected ? 'selected' : ''}"
                        style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 13px; ${isSelected ? 'border-color: #fbbf24; background: rgba(251, 191, 36, 0.15);' : ''} ${disabled ? 'opacity: 0.4; cursor: not-allowed;' : ''}"
                        data-type="${type}" ${disabled ? 'disabled' : ''}>
                    <span style="font-size: 18px;">${pieceIcons[type]}</span>
                    <span style="flex: 1; text-align: left; margin-left: 8px;">${pieceNames[type]}</span>
                    <span style="font-weight: 700; color: #fbbf24;">x${count}</span>
                </button>
            `;
        }).join('');

        handList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                const group = groups[type];
                if (!group || group.length === 0 || !isMyTurn) return;

                if (window.soundFX) window.soundFX.play('play');
                this.selectedBoardCoord = null;
                this.selectedHandPiece = group[0];
                this.calculateValidPlacements();
                this.updateHandUI();
                this.draw();
            });
        });
    }

    updateLogsUI() {
        const logsContainer = document.getElementById('hexahive-logs');
        const logs = this.state?.gameLogs || this.state?.GameLogs || [];
        if (!logsContainer || !logs) return;

        logsContainer.innerHTML = logs.map(log => `<div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);">${log}</div>`).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    calculateValidPlacements() {
        this.validTargetCoords = [];
        const board = this.state?.board || this.state?.Board;
        if (!this.selectedHandPiece || !board) return;

        const keys = Object.keys(board);

        if (keys.length === 0) {
            this.validTargetCoords.push({ q: 0, r: 0 });
            return;
        }

        if (keys.length === 1) {
            const neighbors = this.getHexNeighbors({ q: 0, r: 0 });
            this.validTargetCoords = neighbors.filter(n => !board[`${n.q},${n.r}`]);
            return;
        }

        const candidates = new Set();
        keys.forEach(k => {
            const stack = board[k];
            if (stack && stack.length > 0) {
                const parts = k.split(',');
                const coord = { q: parseInt(parts[0]), r: parseInt(parts[1]) };
                this.getHexNeighbors(coord).forEach(n => {
                    if (!board[`${n.q},${n.r}`]) {
                        candidates.add(`${n.q},${n.r}`);
                    }
                });
            }
        });

        candidates.forEach(candKey => {
            const parts = candKey.split(',');
            const cand = { q: parseInt(parts[0]), r: parseInt(parts[1]) };

            let touchesFriendly = false;
            let touchesEnemy = false;

            this.getHexNeighbors(cand).forEach(n => {
                const stack = board[`${n.q},${n.r}`];
                if (stack && stack.length > 0) {
                    const topPiece = stack[stack.length - 1];
                    const ownerId = topPiece.ownerId || topPiece.OwnerId;
                    if (ownerId === this.myPlayerId) touchesFriendly = true;
                    else touchesEnemy = true;
                }
            });

            if (touchesFriendly && !touchesEnemy) {
                this.validTargetCoords.push(cand);
            }
        });
    }

    bindEvents() {
        document.getElementById('btn-hexahive-rules')?.addEventListener('click', () => {
            if (window.soundFX) window.soundFX.play('play');
            if (this.rulesModal) this.rulesModal.show();
        });

        document.getElementById('btn-hexahive-pass')?.addEventListener('click', () => {
            if (window.signalRService) window.signalRService.sendGameAction('pass_turn', {});
        });

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
            this.hexRadius = Math.min(70, this.hexRadius + 6);
            this.draw();
        });

        document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
            this.hexRadius = Math.max(20, this.hexRadius - 6);
            this.draw();
        });

        document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
            if (this.canvas) {
                this.cameraX = this.canvas.width / 2;
                this.cameraY = this.canvas.height / 2;
            }
            this.draw();
        });

        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => {
                this.isDraggingBg = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
            });

            window.addEventListener('mousemove', (e) => {
                if (this.isDraggingBg) {
                    const dx = e.clientX - this.dragStartX;
                    const dy = e.clientY - this.dragStartY;
                    this.cameraX += dx;
                    this.cameraY += dy;
                    this.dragStartX = e.clientX;
                    this.dragStartY = e.clientY;
                    this.draw();
                }
            });

            window.addEventListener('mouseup', () => {
                this.isDraggingBg = false;
            });

            this.canvas.addEventListener('click', (e) => {
                this.handleCanvasClick(e);
            });
        }
    }

    handleCanvasClick(e) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const hexCoord = this.pixelToHex(mouseX, mouseY);
        const hexKey = `${hexCoord.q},${hexCoord.r}`;

        const currentTurnPlayerId = this.state?.currentTurnPlayerId || this.state?.CurrentTurnPlayerId || '';
        const isMyTurn = currentTurnPlayerId === this.myPlayerId;

        if (!isMyTurn) return;

        const isTargetValid = this.validTargetCoords.some(c => c.q === hexCoord.q && c.r === hexCoord.r);

        if (this.selectedHandPiece && isTargetValid) {
            if (window.soundFX) window.soundFX.play('play');
            const pieceId = this.selectedHandPiece.id || this.selectedHandPiece.Id;
            if (window.signalRService) {
                window.signalRService.sendGameAction('place_piece', {
                    pieceId: pieceId,
                    q: hexCoord.q,
                    r: hexCoord.r
                });
            }
            this.selectedHandPiece = null;
            this.validTargetCoords = [];
            return;
        }

        if (this.selectedBoardCoord && isTargetValid) {
            if (window.soundFX) window.soundFX.play('play');
            if (window.signalRService) {
                window.signalRService.sendGameAction('move_piece', {
                    fromQ: this.selectedBoardCoord.q,
                    fromR: this.selectedBoardCoord.r,
                    toQ: hexCoord.q,
                    toR: hexCoord.r
                });
            }
            this.selectedBoardCoord = null;
            this.validTargetCoords = [];
            return;
        }

        const board = this.state?.board || this.state?.Board;
        const stack = board?.[hexKey];
        if (stack && stack.length > 0) {
            const topPiece = stack[stack.length - 1];
            const ownerId = topPiece.ownerId || topPiece.OwnerId;
            if (ownerId === this.myPlayerId) {
                if (window.soundFX) window.soundFX.play('draw');
                this.selectedHandPiece = null;
                this.selectedBoardCoord = hexCoord;
                this.validTargetCoords = [];
                this.updateHandUI();
                this.draw();
            }
        }
    }

    onResize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
        }
        this.draw();
    }

    draw() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackgroundGrid();

        const board = this.state?.board || this.state?.Board;
        if (!board) return;

        this.validTargetCoords.forEach(coord => {
            const { x, y } = this.hexToPixel(coord.q, coord.r);
            this.drawHexagon(x, y, this.hexRadius, 'rgba(34, 197, 94, 0.4)', '#22c55e', 3);
        });

        Object.entries(board).forEach(([key, stack]) => {
            if (!stack || stack.length === 0) return;

            const [q, r] = key.split(',').map(Number);
            const { x, y } = this.hexToPixel(q, r);

            const topPiece = stack[stack.length - 1];
            const isSelected = this.selectedBoardCoord?.q === q && this.selectedBoardCoord?.r === r;
            const ownerId = topPiece.ownerId || topPiece.OwnerId;
            const isMyPiece = ownerId === this.myPlayerId;

            const fillColor = isMyPiece ? '#4f46e5' : '#e11d48';
            const strokeColor = isSelected ? '#fbbf24' : '#ffffff';

            this.drawHexagon(x, y, this.hexRadius - 2, fillColor, strokeColor, isSelected ? 4 : 2);

            const pType = topPiece.pieceType || topPiece.PieceType;
            this.ctx.font = `${this.hexRadius * 0.8}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(pType ? this.getPieceIcon(pType) : '❓', x, y);

            if (stack.length > 1) {
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.beginPath();
                this.ctx.arc(x + this.hexRadius * 0.6, y - this.hexRadius * 0.6, 10, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#000000';
                this.ctx.font = 'bold 11px sans-serif';
                this.ctx.fillText(`x${stack.length}`, x + this.hexRadius * 0.6, y - this.hexRadius * 0.6);
            }
        });
    }

    drawBackgroundGrid() {
        if (!this.ctx) return;
        for (let q = -10; q <= 10; q++) {
            for (let r = -10; r <= 10; r++) {
                const { x, y } = this.hexToPixel(q, r);
                this.drawHexagon(x, y, this.hexRadius, 'transparent', 'rgba(255, 255, 255, 0.04)', 1);
            }
        }
    }

    drawHexagon(x, y, radius, fillColor, strokeColor, lineWidth) {
        this.ctx.save();
        this.ctx.beginPath();

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + radius * Math.cos(angle);
            const hy = y + radius * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(hx, hy);
            else this.ctx.lineTo(hx, hy);
        }
        this.ctx.closePath();

        if (fillColor !== 'transparent') {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        this.ctx.restore();
    }

    hexToPixel(q, r) {
        const x = this.hexRadius * (3 / 2 * q) + this.cameraX;
        const y = this.hexRadius * (Math.sqrt(3) * (r + q / 2)) + this.cameraY;
        return { x, y };
    }

    pixelToHex(x, y) {
        const ptX = x - this.cameraX;
        const ptY = y - this.cameraY;

        const q = (2 / 3 * ptX) / this.hexRadius;
        const r = (-1 / 3 * ptX + Math.sqrt(3) / 3 * ptY) / this.hexRadius;

        return this.hexRound(q, r);
    }

    hexRound(q, r) {
        let s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);

        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }

        return { q: rq, r: rr };
    }

    getHexNeighbors(c) {
        return [
            { q: c.q + 1, r: c.r },
            { q: c.q + 1, r: c.r - 1 },
            { q: c.q, r: c.r - 1 },
            { q: c.q - 1, r: c.r },
            { q: c.q - 1, r: c.r + 1 },
            { q: c.q, r: c.r + 1 }
        ];
    }

    getPieceIcon(type) {
        const icons = {
            queen: '👑', ant: '🐜', spider: '🕷️', grasshopper: '🦗',
            beetle: '🪲', ladybug: '🐞', mosquito: '🦟', pillbug: '🛡️'
        };
        return icons[type] || '❓';
    }

    showGameOverModal(state) {
        if (window.soundFX) window.soundFX.play('defuse');
        const isDraw = state.isDraw || state.IsDraw;
        const winnerName = state.winnerName || state.WinnerName || 'CHIẾN THẮNG';
        const msg = isDraw
            ? '🤝 TRẬN ĐẤU HÒA! Cả 2 Ong Chúa đều bị bao vây cùng lúc!'
            : `🏆 CHÚC MỪNG ${winnerName} THẮNG TRẬN!`;

        alert(msg);
    }

    clear() {
        window.removeEventListener('resize', this.boundResize);
        const appContainer = document.getElementById('game-container');
        if (appContainer) appContainer.innerHTML = '';
    }
}

window.hexahiveRenderer = new HexaHiveRenderer();
