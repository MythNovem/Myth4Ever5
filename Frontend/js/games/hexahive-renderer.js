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
        this.isGameOverModalShown = false;

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
        this.isGameOverModalShown = false;
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
                    <div class="header-right" style="display: flex; gap: 8px;">
                        <button id="btn-hexahive-rules" class="btn btn-ghost" style="font-size: 13px;">❓ Luật Chơi</button>
                        <button id="btn-hexahive-surrender" class="btn btn-ghost" style="font-size: 13px; color: #f43f5e; border-color: #f43f5e;">🏳️ Đầu Hàng</button>
                        <button id="btn-hexahive-leave" class="btn btn-ghost" style="font-size: 13px; color: #a78bfa; border-color: #8b5cf6;">🚪 Rời Phòng</button>
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

        if ((winnerId || isDraw) && !this.isGameOverModalShown) {
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
            passBtn.classList.add('hidden');
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

    checkOneHiveRule(fromCoord) {
        const board = this.state?.board || this.state?.Board;
        if (!board) return true;

        const fromKey = `${fromCoord.q},${fromCoord.r}`;
        const stack = board[fromKey];
        if (!stack || stack.length === 0) return true;

        if (stack.length > 1) return true;

        const activeKeys = Object.keys(board).filter(k => k !== fromKey && board[k] && board[k].length > 0);
        if (activeKeys.length <= 1) return true;

        const activeSet = new Set(activeKeys);
        const startKey = activeKeys[0];
        const visited = new Set([startKey]);
        const queue = [startKey];

        while (queue.length > 0) {
            const currKey = queue.shift();
            const [cq, cr] = currKey.split(',').map(Number);
            this.getHexNeighbors({ q: cq, r: cr }).forEach(n => {
                const nKey = `${n.q},${n.r}`;
                if (activeSet.has(nKey) && !visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push(nKey);
                }
            });
        }

        return visited.size === activeKeys.length;
    }

    canSlideGround(fromCoord, toCoord) {
        const board = this.state?.board || this.state?.Board;
        if (!board) return true;

        const fromNeighbors = this.getHexNeighbors(fromCoord);
        const common = fromNeighbors.filter(n => Math.abs(n.q - toCoord.q) <= 1 && Math.abs(n.r - toCoord.r) <= 1 && Math.abs((-n.q - n.r) - (-toCoord.q - toCoord.r)) <= 1);

        if (common.length < 2) return true;

        const s1 = board[`${common[0].q},${common[0].r}`];
        const s2 = board[`${common[1].q},${common[1].r}`];

        const n1Occ = s1 && s1.length > 0;
        const n2Occ = s2 && s2.length > 0;

        return !(n1Occ && n2Occ);
    }

    calculateValidMovesForSelectedPiece(fromCoord) {
        this.validTargetCoords = [];
        const board = this.state?.board || this.state?.Board;
        const queenPlacedDict = this.state?.queenPlaced || this.state?.QueenPlaced || {};
        const queenPlaced = queenPlacedDict[this.myPlayerId] ?? false;

        if (!queenPlaced) {
            alert('⚠️ Bạn phải đặt 👑 Ong Chúa ra bàn cờ trước khi di chuyển bất kỳ quân nào!');
            return;
        }

        if (!this.checkOneHiveRule(fromCoord)) {
            alert('⚠️ Quân cờ này đang liên kết tổ ong (One-Hive Rule)! Rút ra sẽ làm đứt gãy tổ ong nên không được di chuyển.');
            return;
        }

        if (!board || !fromCoord) return;
        const fromKey = `${fromCoord.q},${fromCoord.r}`;
        const stack = board[fromKey];
        if (!stack || stack.length === 0) return;

        const piece = stack[stack.length - 1];
        const pType = piece.pieceType || piece.PieceType;
        const pieceId = piece.id || piece.Id;

        const immobilePieceId = this.state?.immobilePieceId || this.state?.ImmobilePieceId;
        if (immobilePieceId && pieceId === immobilePieceId) {
            alert('⚠️ Quân cờ này vừa bị dịch chuyển (Pillbug Warp) ở lượt trước! Theo luật cờ Hive, quân cờ không được phép di chuyển 2 lần liên tiếp.');
            return;
        }

        const hasAdj = (c) => {
            return this.getHexNeighbors(c).some(n => {
                if (n.q === fromCoord.q && n.r === fromCoord.r) return false;
                const s = board[`${n.q},${n.r}`];
                return s && s.length > 0;
            });
        };

        const neighbors = this.getHexNeighbors(fromCoord);

        if (pType === 'queen' || pType === 'pillbug') {
            neighbors.forEach(n => {
                const s = board[`${n.q},${n.r}`];
                if ((!s || s.length === 0) && hasAdj(n) && this.canSlideGround(fromCoord, n)) {
                    this.validTargetCoords.push(n);
                }
            });
        } else if (pType === 'beetle') {
            neighbors.forEach(n => {
                const s = board[`${n.q},${n.r}`];
                if ((s && s.length > 0) || (hasAdj(n) && this.canSlideGround(fromCoord, n))) {
                    this.validTargetCoords.push(n);
                }
            });
        } else if (pType === 'grasshopper') {
            const dirs = [
                { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
            ];
            dirs.forEach(dir => {
                let curr = { q: fromCoord.q + dir.q, r: fromCoord.r + dir.r };
                let dist = 0;
                while (board[`${curr.q},${curr.r}`]?.length > 0) {
                    curr = { q: curr.q + dir.q, r: curr.r + dir.r };
                    dist++;
                }
                if (dist > 0) {
                    this.validTargetCoords.push(curr);
                }
            });
        } else if (pType === 'ant') {
            const visited = new Set([fromKey]);
            const queue = [fromCoord];

            while (queue.length > 0) {
                const curr = queue.shift();
                this.getHexNeighbors(curr).forEach(n => {
                    const key = `${n.q},${n.r}`;
                    if (visited.has(key)) return;
                    const s = board[key];
                    if (!s || s.length === 0) {
                        if (hasAdj(n) && this.canSlideGround(curr, n)) {
                            visited.add(key);
                            this.validTargetCoords.push(n);
                            queue.push(n);
                        }
                    }
                });
            }
        } else if (pType === 'spider') {
            const DFS = (curr, step, path) => {
                if (step === 3) {
                    if (!this.validTargetCoords.some(c => c.q === curr.q && c.r === curr.r)) {
                        this.validTargetCoords.push(curr);
                    }
                    return;
                }
                this.getHexNeighbors(curr).forEach(n => {
                    const key = `${n.q},${n.r}`;
                    if (path.has(key)) return;
                    const s = board[key];
                    if (!s || s.length === 0) {
                        if (hasAdj(n) && this.canSlideGround(curr, n)) {
                            path.add(key);
                            DFS(n, step + 1, path);
                            path.delete(key);
                        }
                    }
                });
            };
            DFS(fromCoord, 0, new Set([fromKey]));
        } else if (pType === 'ladybug') {
            const step1Coords = neighbors.filter(n => board[`${n.q},${n.r}`]?.length > 0);
            step1Coords.forEach(s1 => {
                const step2Coords = this.getHexNeighbors(s1).filter(n => !(n.q === fromCoord.q && n.r === fromCoord.r) && board[`${n.q},${n.r}`]?.length > 0);
                step2Coords.forEach(s2 => {
                    const step3Coords = this.getHexNeighbors(s2).filter(n => !(n.q === s1.q && n.r === s1.r) && (!board[`${n.q},${n.r}`] || board[`${n.q},${n.r}`].length === 0));
                    step3Coords.forEach(s3 => {
                        if (!this.validTargetCoords.some(c => c.q === s3.q && c.r === s3.r)) {
                            this.validTargetCoords.push(s3);
                        }
                    });
                });
            });
        } else if (pType === 'mosquito') {
            const adjacentTypes = new Set();
            neighbors.forEach(n => {
                const s = board[`${n.q},${n.r}`];
                if (s && s.length > 0) {
                    const top = s[s.length - 1];
                    const t = top.pieceType || top.PieceType;
                    if (t) adjacentTypes.add(t);
                }
            });

            if (adjacentTypes.has('ant')) {
                const visited = new Set([fromKey]);
                const queue = [fromCoord];
                while (queue.length > 0) {
                    const curr = queue.shift();
                    this.getHexNeighbors(curr).forEach(n => {
                        const key = `${n.q},${n.r}`;
                        if (visited.has(key)) return;
                        const s = board[key];
                        if (!s || s.length === 0) {
                            if (hasAdj(n) && this.canSlideGround(curr, n)) {
                                visited.add(key);
                                if (!this.validTargetCoords.some(c => c.q === n.q && c.r === n.r)) this.validTargetCoords.push(n);
                                queue.push(n);
                            }
                        }
                    });
                }
            }
            if (adjacentTypes.has('beetle')) {
                neighbors.forEach(n => {
                    const s = board[`${n.q},${n.r}`];
                    if ((s && s.length > 0) || (hasAdj(n) && this.canSlideGround(fromCoord, n))) {
                        if (!this.validTargetCoords.some(c => c.q === n.q && c.r === n.r)) this.validTargetCoords.push(n);
                    }
                });
            }
            if (adjacentTypes.has('grasshopper')) {
                const dirs = [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }];
                dirs.forEach(dir => {
                    let curr = { q: fromCoord.q + dir.q, r: fromCoord.r + dir.r };
                    let dist = 0;
                    while (board[`${curr.q},${curr.r}`]?.length > 0) {
                        curr = { q: curr.q + dir.q, r: curr.r + dir.r };
                        dist++;
                    }
                    if (dist > 0 && !this.validTargetCoords.some(c => c.q === curr.q && c.r === curr.r)) {
                        this.validTargetCoords.push(curr);
                    }
                });
            }
            if (adjacentTypes.has('queen') || adjacentTypes.has('pillbug')) {
                neighbors.forEach(n => {
                    const s = board[`${n.q},${n.r}`];
                    if ((!s || s.length === 0) && hasAdj(n) && this.canSlideGround(fromCoord, n)) {
                        if (!this.validTargetCoords.some(c => c.q === n.q && c.r === n.r)) this.validTargetCoords.push(n);
                    }
                });
            }
        } else {
            neighbors.forEach(n => {
                if (hasAdj(n) && this.canSlideGround(fromCoord, n)) this.validTargetCoords.push(n);
            });
        }
    }

    bindEvents() {
        document.getElementById('btn-hexahive-rules')?.addEventListener('click', () => {
            if (window.soundFX) window.soundFX.play('play');
            if (this.rulesModal) this.rulesModal.show();
        });

        document.getElementById('btn-hexahive-surrender')?.addEventListener('click', () => {
            if (confirm('🏳️ Bạn có chắc chắn muốn xin Đầu Hàng không?')) {
                if (window.soundFX) window.soundFX.play('defuse');
                if (window.signalRService) window.signalRService.sendGameAction('surrender', {});
            }
        });

        document.getElementById('btn-hexahive-leave')?.addEventListener('click', async () => {
            if (confirm('🚪 Bạn có chắc chắn muốn Rời Phòng trở về Trang Chủ không?')) {
                if (window.soundFX) window.soundFX.play('click');
                if (window.signalRService) await window.signalRService.leaveRoomExplicit();
                this.clear();
                if (window.lobbyManager) {
                    window.lobbyManager.clearRoomState();
                }
            }
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
                this.calculateValidMovesForSelectedPiece(hexCoord);
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
        if (this.isGameOverModalShown) return;
        this.isGameOverModalShown = true;

        if (window.soundFX) window.soundFX.play('defuse');
        const isDraw = state.isDraw || state.IsDraw;
        const winnerName = state.winnerName || state.WinnerName || 'CHIẾN THẮNG';
        const winnerId = state.winnerPlayerId || state.WinnerPlayerId;

        const isMeWinner = winnerId === this.myPlayerId;
        let icon = isDraw ? '🤝' : (isMeWinner ? '🏆' : '👑');
        let title = isDraw ? 'TRẬN ĐẤU HÒA!' : (isMeWinner ? 'CHIẾN THẮNG RỰC RỠ!' : 'KẾT THÚC VÁN ĐẤU');
        let subMsg = isDraw
            ? 'Cả 2 Ong Chúa đều bị bao vây cùng lúc!'
            : `Chúc mừng <strong>${winnerName}</strong> đã xuất sắc bao vây Ong Chúa đối thủ!`;

        // Create overlay modal
        const modalId = 'hexahive-gameover-popup';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHTML = `
            <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.4s ease;">
                <div style="background: linear-gradient(135deg, rgba(23, 20, 41, 0.98), rgba(15, 10, 35, 0.98)); border: 2px solid #fbbf24; border-radius: 20px; width: 90%; max-width: 480px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="font-size: 64px; line-height: 1;">${icon}</div>
                    <h2 style="font-size: 24px; color: #fbbf24; margin: 0; font-weight: 800;">${title}</h2>
                    <p style="font-size: 15px; color: #e2e8f0; margin: 0; line-height: 1.5;">${subMsg}</p>
                    
                    <div style="display: flex; gap: 12px; margin-top: 16px; width: 100%;">
                        <button id="btn-gameover-inspect" class="btn btn-ghost" style="flex: 1; padding: 12px; font-size: 14px; border-color: #8b5cf6; color: #a78bfa;">👀 Xem Bàn Cờ</button>
                        <button id="btn-gameover-lobby" class="btn btn-primary" style="flex: 1; padding: 12px; font-size: 14px; background: linear-gradient(135deg, #8b5cf6, #6d28d9);">🏠 Về Phòng Chờ</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind Inspect button
        document.getElementById('btn-gameover-inspect')?.addEventListener('click', () => {
            const popup = document.getElementById(modalId);
            if (popup) popup.style.display = 'none';

            // Show floating reopen button
            if (!document.getElementById('btn-reopen-gameover')) {
                const reopenBtn = document.createElement('button');
                reopenBtn.id = 'btn-reopen-gameover';
                reopenBtn.className = 'btn btn-primary';
                reopenBtn.innerHTML = '🏆 Xem Kết Quả';
                reopenBtn.style.cssText = 'position: fixed; top: 70px; right: 20px; z-index: 9999; padding: 10px 18px; font-size: 13px; box-shadow: 0 4px 20px rgba(0,0,0,0.6);';
                reopenBtn.addEventListener('click', () => {
                    if (popup) popup.style.display = 'flex';
                });
                document.body.appendChild(reopenBtn);
            }
        });

        // Bind Return to Lobby button
        document.getElementById('btn-gameover-lobby')?.addEventListener('click', async () => {
            const popup = document.getElementById(modalId);
            if (popup) popup.remove();
            const reopenBtn = document.getElementById('btn-reopen-gameover');
            if (reopenBtn) reopenBtn.remove();

            this.clear();
            if (window.lobbyManager && window.lobbyManager.currentRoom) {
                document.getElementById('room-view').style.display = 'block';
                window.lobbyManager.renderRoomState(window.lobbyManager.currentRoom);
            } else if (window.lobbyManager) {
                window.lobbyManager.clearRoomState();
            }
        });
    }

    clear() {
        this.isGameOverModalShown = false;
        const reopenBtn = document.getElementById('btn-reopen-gameover');
        if (reopenBtn) reopenBtn.remove();
        const popup = document.getElementById('hexahive-gameover-popup');
        if (popup) popup.remove();

        window.removeEventListener('resize', this.boundResize);
        const appContainer = document.getElementById('game-container');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.style.display = 'none';
        }
    }
}

window.hexahiveRenderer = new HexaHiveRenderer();
