/**
 * MythicRacerRenderer — Canvas 2D Engine for Game #4: Mythic Racer: Nitro Party 2D
 */
class MythicRacerRenderer {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.room = null;
        this.state = null;
        this.myPlayerId = '';
        this.isGameOverModalShown = false;
        this.gameLoopTimer = null;

        // Input state
        this.inputs = {
            steerLeft: false,
            steerRight: false,
            accelerate: false,
            reverse: false
        };

        this.boundResize = this.onResize.bind(this);
        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);

        this.skidMarks = []; // Tire skid trails

        if (window.gameLoader) {
            window.gameLoader.registerRenderer('mythic_racer', this);
        }
    }

    init(initialData) {
        this.isGameOverModalShown = false;
        this.skidMarks = [];

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

        const chatBar = document.querySelector('.chat-bar');
        if (chatBar) chatBar.style.display = 'none';

        appContainer.innerHTML = `
            <div id="racer-container" style="width: 100%; height: 100vh; display: flex; flex-direction: column; background: #070510; color: #fff; overflow: hidden; position: absolute; inset: 0;">
                <!-- TOP HEADER BAR -->
                <div class="racer-header glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: rgba(23, 20, 41, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(239, 68, 68, 0.3); z-index: 100;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-weight: 800; color: #ef4444; font-size: 16px;">🏎️ Mythic Racer: Nitro Party 2D</span>
                        <span id="racer-lap-badge" style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 700;">LAP 1/3</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div id="racer-rank-badge" style="font-size: 16px; font-weight: 800; color: #fbbf24;">🥇 1st Place</div>
                        <div id="racer-item-slot" style="background: rgba(255,255,255,0.08); border: 2px solid #fbbf24; border-radius: 12px; padding: 4px 16px; font-size: 20px; cursor: pointer;" title="Bấm SPACE để dùng vật phẩm">🎁 Trống</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="btn-racer-fullscreen" class="btn btn-ghost" style="font-size: 13px; color: #fbbf24; border-color: #fbbf24;">🖥️ Toàn Màn Hình</button>
                        <button id="btn-racer-leave" class="btn btn-ghost" style="font-size: 13px; color: #ef4444; border-color: #ef4444;">🚪 Rời Phòng</button>
                    </div>
                </div>

                <!-- MAIN WORKSPACE -->
                <div style="flex: 1; display: flex; position: relative; overflow: hidden;">
                    <!-- CANVAS WORKSPACE -->
                    <div class="canvas-wrapper" style="flex: 1; position: relative; background: #0b1509;">
                        <canvas id="racer-canvas" style="width: 100%; height: 100%; display: block;"></canvas>

                        <!-- MINIMAP OVERLAY -->
                        <canvas id="racer-minimap" width="220" height="140" style="position: absolute; top: 16px; right: 16px; background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 12px; backdrop-filter: blur(8px); z-index: 20;"></canvas>

                        <!-- TOUCH CONTROLS FOR MOBILE -->
                        <div id="racer-touch-controls" style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; pointer-events: none; z-index: 30;">
                            <div style="display: flex; gap: 12px; pointer-events: auto;">
                                <button id="btn-touch-left" class="btn btn-ghost" style="width: 60px; height: 60px; font-size: 24px; border-radius: 50%; background: rgba(23, 20, 41, 0.8);">◀️</button>
                                <button id="btn-touch-right" class="btn btn-ghost" style="width: 60px; height: 60px; font-size: 24px; border-radius: 50%; background: rgba(23, 20, 41, 0.8);">▶️</button>
                            </div>
                            <div style="display: flex; gap: 12px; pointer-events: auto;">
                                <button id="btn-touch-item" class="btn btn-primary" style="width: 65px; height: 65px; font-size: 26px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #d97706);">🚀</button>
                                <button id="btn-touch-brake" class="btn btn-ghost" style="width: 60px; height: 60px; font-size: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.4);">🛑</button>
                                <button id="btn-touch-gas" class="btn btn-primary" style="width: 70px; height: 70px; font-size: 28px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #15803d);">🏎️</button>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT LOGS PANEL -->
                    <div class="racer-logs-panel glass-card" style="width: 250px; background: rgba(23, 20, 41, 0.85); backdrop-filter: blur(10px); border-left: 1px solid rgba(239, 68, 68, 0.2); padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 10;">
                        <h3 style="font-size: 14px; color: #ef4444; margin: 0;">📜 Nhật Ký Đuổi Bắt</h3>
                        <div id="racer-logs" style="flex: 1; overflow-y: auto; font-size: 12px; color: #fca5a5; display: flex; flex-direction: column; gap: 6px;"></div>
                    </div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('racer-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.onResize();
        }

        window.removeEventListener('resize', this.boundResize);
        window.addEventListener('resize', this.boundResize);

        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        this.bindEvents();
        this.startLoopTimer();
        this.updateState(state);
    }

    startLoopTimer() {
        if (this.gameLoopTimer) clearInterval(this.gameLoopTimer);

        // 20Hz Tick loop (Every 50ms) to drive countdown & physics engine
        this.gameLoopTimer = setInterval(() => {
            if (window.signalRService) {
                const isAnyInput = this.inputs.steerLeft || this.inputs.steerRight || this.inputs.accelerate || this.inputs.reverse;
                const isCountdown = this.state?.isCountdown ?? this.state?.IsCountdown ?? false;
                const isGameOver = this.state?.isGameOver ?? this.state?.IsGameOver ?? false;

                if (!isGameOver && (isAnyInput || isCountdown)) {
                    window.signalRService.sendGameAction(isAnyInput ? 'update_input' : 'tick', this.inputs);
                }
            }
        }, 50);
    }

    updateState(state) {
        if (!state) return;
        this.state = state;

        if (window.signalRService) {
            this.myPlayerId = window.signalRService.getPlayerId();
        }

        this.updateHeaderUI();
        this.updateLogsUI();
        this.draw();

        const isGameOver = state.isGameOver || state.IsGameOver;
        if (isGameOver && !this.isGameOverModalShown) {
            this.showGameOverModal(state);
        }
    }

    updateHeaderUI() {
        const lapBadge = document.getElementById('racer-lap-badge');
        const rankBadge = document.getElementById('racer-rank-badge');
        const itemSlot = document.getElementById('racer-item-slot');

        const cars = this.state?.cars || this.state?.Cars || {};
        const myCar = cars[this.myPlayerId];

        if (myCar) {
            const lap = myCar.currentLap || myCar.CurrentLap || 1;
            const totalLaps = this.state?.totalLaps || this.state?.TotalLaps || 3;
            if (lapBadge) lapBadge.textContent = `LAP ${Math.min(lap, totalLaps)}/${totalLaps}`;

            const item = myCar.currentItem || myCar.CurrentItem;
            const itemIcons = {
                nitro: '⚡ Nitro',
                shield: '🛡️ Khiên',
                banana: '🍌 Chuối',
                bomb: '💣 Bom',
                rocket: '🚀 Tên Lửa'
            };
            if (itemSlot) itemSlot.textContent = item ? itemIcons[item] || '🎁 Vật Phẩm' : '🎁 Trống';

            // Calculate current rank position
            const sortedCars = Object.values(cars).sort((a, b) => {
                const lapA = a.currentLap || a.CurrentLap || 1;
                const lapB = b.currentLap || b.CurrentLap || 1;
                const chkA = a.lastPassedCheckpoint || a.LastPassedCheckpoint || 0;
                const chkB = b.lastPassedCheckpoint || b.LastPassedCheckpoint || 0;
                return (lapB * 10 + chkB) - (lapA * 10 + chkA);
            });

            const myRank = sortedCars.findIndex(c => (c.playerId || c.PlayerId) === this.myPlayerId) + 1;
            const rankBadges = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'];
            if (rankBadge) rankBadge.textContent = rankBadges[myRank - 1] || `${myRank}th`;
        }
    }

    updateLogsUI() {
        const logsContainer = document.getElementById('racer-logs');
        const logs = this.state?.raceLogs || this.state?.RaceLogs || [];
        if (!logsContainer || !logs) return;

        logsContainer.innerHTML = logs.map(log => `<div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);">${log}</div>`).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    bindEvents() {
        document.getElementById('btn-racer-fullscreen')?.addEventListener('click', () => {
            const elem = document.getElementById('racer-container') || document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) elem.requestFullscreen();
                else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
            setTimeout(() => this.onResize(), 100);
        });

        document.getElementById('btn-racer-leave')?.addEventListener('click', async () => {
            if (confirm('🚪 Bạn có chắc chắn muốn Rời Phòng đua xe không?')) {
                if (window.soundFX) window.soundFX.play('click');
                if (window.signalRService) await window.signalRService.leaveRoomExplicit();
                this.clear();
                if (window.lobbyManager) window.lobbyManager.clearRoomState();
            }
        });

        document.getElementById('racer-item-slot')?.addEventListener('click', () => {
            this.triggerUseItem();
        });

        // Mobile touch controls listeners
        const bindTouch = (btnId, keyName) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.inputs[keyName] = true; this.sendInputs(); });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.inputs[keyName] = false; this.sendInputs(); });
            btn.addEventListener('mousedown', () => { this.inputs[keyName] = true; this.sendInputs(); });
            btn.addEventListener('mouseup', () => { this.inputs[keyName] = false; this.sendInputs(); });
        };

        bindTouch('btn-touch-left', 'steerLeft');
        bindTouch('btn-touch-right', 'steerRight');
        bindTouch('btn-touch-gas', 'accelerate');
        bindTouch('btn-touch-brake', 'reverse');

        document.getElementById('btn-touch-item')?.addEventListener('click', () => {
            this.triggerUseItem();
        });
    }

    onKeyDown(e) {
        let changed = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { this.inputs.steerLeft = true; changed = true; }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { this.inputs.steerRight = true; changed = true; }
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { this.inputs.accelerate = true; changed = true; }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { this.inputs.reverse = true; changed = true; }
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Shift' || e.key === 'e' || e.key === 'E') {
            this.triggerUseItem();
        }

        if (changed) this.sendInputs();
    }

    onKeyUp(e) {
        let changed = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { this.inputs.steerLeft = false; changed = true; }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { this.inputs.steerRight = false; changed = true; }
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { this.inputs.accelerate = false; changed = true; }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { this.inputs.reverse = false; changed = true; }

        if (changed) this.sendInputs();
    }

    sendInputs() {
        if (window.signalRService) {
            window.signalRService.sendGameAction('update_input', this.inputs);
        }
    }

    triggerUseItem() {
        if (window.soundFX) window.soundFX.play('play');
        if (window.signalRService) {
            window.signalRService.sendGameAction('use_item', {});
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

        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;

        // Clear Background (Night Grand Prix Dark Theme)
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(0, 0, canvasW, canvasH);

        const track = this.state?.track || this.state?.Track;
        if (!track || !track.waypoints) return;

        const trackW = track.canvasWidth || track.CanvasWidth || 1400;
        const trackH = track.canvasHeight || track.CanvasHeight || 900;

        // Dynamic aspect ratio scaling & centering (Fits 100% on any screen size)
        const scale = Math.min(canvasW / trackW, canvasH / trackH);
        const offsetX = (canvasW - trackW * scale) / 2;
        const offsetY = (canvasH - trackH * scale) / 2;

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        const waypoints = track.waypoints || track.Waypoints || [];
        const trackWidth = track.trackWidth || track.TrackWidth || 95;

        // 1. Draw F1 Night Track Road
        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Outer Neon Red Rumble Curb Border
        this.ctx.beginPath();
        waypoints.forEach((pt, idx) => {
            if (idx === 0) this.ctx.moveTo(pt.x || pt.X, pt.y || pt.Y);
            else this.ctx.lineTo(pt.x || pt.X, pt.y || pt.Y);
        });
        this.ctx.closePath();
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = trackWidth + 14;
        this.ctx.stroke();

        // Asphalt Road Base (Dark Slate Gray)
        this.ctx.strokeStyle = '#151c28';
        this.ctx.lineWidth = trackWidth;
        this.ctx.stroke();

        // Glowing Yellow Edge Side Lines
        this.ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        this.ctx.lineWidth = trackWidth - 4;
        this.ctx.stroke();

        // Inner Asphalt Core
        this.ctx.strokeStyle = '#151c28';
        this.ctx.lineWidth = trackWidth - 10;
        this.ctx.stroke();

        // White Center Dashline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([16, 16]);
        this.ctx.stroke();
        this.ctx.restore();

        // 2. Draw Finish Checkered Line at Waypoint #0 (Spanning full track width)
        if (waypoints.length > 0) {
            const startPt = waypoints[0];
            const pX = startPt.x || startPt.X;
            const pY = startPt.y || startPt.Y;

            this.ctx.save();
            const sqSize = 12;
            const rows = Math.floor(trackWidth / sqSize);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < 2; c++) {
                    const isWhite = (r + c) % 2 === 0;
                    this.ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
                    this.ctx.fillRect(pX - 12 + c * sqSize, pY - trackWidth / 2 + r * sqSize, sqSize, sqSize);
                }
            }
            this.ctx.restore();
        }

        // 3. Draw Tire Skid Marks
        this.skidMarks.forEach(sm => {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(sm.x, sm.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 4. Draw Item Boxes 🎁
        const itemBoxes = this.state?.itemBoxes || this.state?.ItemBoxes || [];
        itemBoxes.forEach(box => {
            const isActive = box.isActive ?? box.IsActive ?? true;
            if (!isActive) return;

            const bX = box.x || box.X;
            const bY = box.y || box.Y;

            this.ctx.save();
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.shadowBlur = 16;
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.beginPath();
            this.ctx.arc(bX, bY, 18, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.font = 'bold 18px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🎁', bX, bY);
            this.ctx.restore();
        });

        // 5. Draw Dropped Items (Bananas 🍌 & Bombs 💣)
        const droppedItems = this.state?.droppedItems || this.state?.DroppedItems || [];
        droppedItems.forEach(item => {
            const iX = item.x || item.X;
            const iY = item.y || item.Y;
            const iType = item.itemType || item.ItemType;

            this.ctx.save();
            this.ctx.shadowColor = iType === 'banana' ? '#fde047' : '#ef4444';
            this.ctx.shadowBlur = 10;
            this.ctx.font = '24px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(iType === 'banana' ? '🍌' : '💣', iX, iY);
            this.ctx.restore();
        });

        // 6. Draw Rockets 🚀
        const rockets = this.state?.rockets || this.state?.Rockets || [];
        rockets.forEach(rocket => {
            const rX = rocket.x || rocket.X;
            const rY = rocket.y || rocket.Y;
            const rAngle = rocket.angle || rocket.Angle || 0;

            this.ctx.save();
            this.ctx.translate(rX, rY);
            this.ctx.rotate(rAngle);
            this.ctx.shadowColor = '#ef4444';
            this.ctx.shadowBlur = 12;
            this.ctx.font = '24px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🚀', 0, 0);
            this.ctx.restore();
        });

        // 7. Draw Cars 🏎️ (Detailed F1 Racing Car Graphics)
        const cars = this.state?.cars || this.state?.Cars || {};
        Object.values(cars).forEach(car => {
            const cX = car.x || car.X;
            const cY = car.y || car.Y;
            const cAngle = car.angle || car.Angle || 0;
            const cColor = car.color || car.Color || '#ef4444';
            const isShielded = car.isShielded || car.IsShielded;
            const nitroTimer = car.nitroTimer || car.NitroTimer || 0;
            const pId = car.playerId || car.PlayerId;

            // Skid trail when moving fast
            if (Math.abs(car.speed || car.Speed || 0) > 4) {
                this.skidMarks.push({ x: cX, y: cY });
                if (this.skidMarks.length > 150) this.skidMarks.shift();
            }

            this.ctx.save();
            this.ctx.translate(cX, cY);
            this.ctx.rotate(cAngle);

            // Shield Energy Aura 🛡️
            if (isShielded) {
                this.ctx.shadowColor = '#38bdf8';
                this.ctx.shadowBlur = 16;
                this.ctx.strokeStyle = '#38bdf8';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 28, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Dual Nitro Flames ⚡
            if (nitroTimer > 0) {
                this.ctx.fillStyle = '#f97316';
                this.ctx.shadowColor = '#f97316';
                this.ctx.shadowBlur = 14;
                this.ctx.beginPath();
                this.ctx.moveTo(-20, -5);
                this.ctx.lineTo(-34, 0);
                this.ctx.lineTo(-20, 5);
                this.ctx.closePath();
                this.ctx.fill();
            }

            // 4 Black Rubber Tires
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(10, -14, 10, 5);  // Front Right
            this.ctx.fillRect(10, 9, 10, 5);   // Front Left
            this.ctx.fillRect(-18, -14, 11, 6); // Rear Right
            this.ctx.fillRect(-18, 8, 11, 6);  // Rear Left

            // F1 Main Aerodynamic Body Chassis
            this.ctx.fillStyle = cColor;
            this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
            this.ctx.shadowBlur = 10;

            // Front Nose Cone
            this.ctx.beginPath();
            this.ctx.moveTo(22, 0);
            this.ctx.lineTo(8, -7);
            this.ctx.lineTo(-16, -9);
            this.ctx.lineTo(-18, 9);
            this.ctx.lineTo(8, 7);
            this.ctx.closePath();
            this.ctx.fill();

            // Front Spoiler Wing
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(18, -12, 4, 24);

            // Rear Spoiler Wing
            this.ctx.fillStyle = cColor;
            this.ctx.fillRect(-22, -11, 5, 22);

            // Cockpit & Driver Helmet 🏎️
            this.ctx.fillStyle = '#020617';
            this.ctx.fillRect(-4, -5, 12, 10);
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.beginPath();
            this.ctx.arc(2, 0, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Headlights Glowing LED
            this.ctx.fillStyle = '#fef08a';
            this.ctx.shadowColor = '#fef08a';
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(20, -6, 3, 3);
            this.ctx.fillRect(20, 3, 3, 3);

            this.ctx.restore();

            // Player Name Badge & Rank Badge above car
            this.ctx.fillStyle = (pId === this.myPlayerId) ? '#fbbf24' : '#ffffff';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
            this.ctx.shadowBlur = 6;
            this.ctx.fillText(car.playerName || car.PlayerName || 'Tay đua', cX, cY - 26);
        });

        // 8. Draw Countdown Banner 3.. 2.. 1.. GO!
        const isCountdown = this.state?.isCountdown ?? this.state?.IsCountdown ?? false;
        const countdownTimer = Math.ceil(this.state?.countdownTimer ?? this.state?.CountdownTimer ?? 0);
        if (isCountdown) {
            this.ctx.save();
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 80px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
            this.ctx.shadowBlur = 24;
            const text = countdownTimer > 0 ? `${countdownTimer}` : '🟢 GÓC GA XUẤT PHÁT!';
            this.ctx.fillText(text, trackW / 2, trackH / 2);
            this.ctx.restore();
        }

        this.ctx.restore();

        // 9. Render Minimap
        this.drawMinimap();
    }

    drawMinimap() {
        const minimapCanvas = document.getElementById('racer-minimap');
        if (!minimapCanvas) return;

        const mCtx = minimapCanvas.getContext('2d');
        if (!mCtx) return;

        mCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        const track = this.state?.track || this.state?.Track;
        if (!track || !track.waypoints) return;

        const waypoints = track.waypoints || track.Waypoints || [];
        const scaleX = minimapCanvas.width / (track.canvasWidth || track.CanvasWidth || 1400);
        const scaleY = minimapCanvas.height / (track.canvasHeight || track.CanvasHeight || 900);

        // Draw track outline on minimap
        mCtx.save();
        mCtx.beginPath();
        waypoints.forEach((pt, idx) => {
            const mX = (pt.x || pt.X) * scaleX;
            const mY = (pt.y || pt.Y) * scaleY;
            if (idx === 0) mCtx.moveTo(mX, mY);
            else mCtx.lineTo(mX, mY);
        });
        mCtx.closePath();
        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        mCtx.lineWidth = 8;
        mCtx.stroke();
        mCtx.restore();

        // Draw cars on minimap
        const cars = this.state?.cars || this.state?.Cars || {};
        Object.values(cars).forEach(car => {
            const mX = (car.x || car.X) * scaleX;
            const mY = (car.y || car.Y) * scaleY;
            const cColor = car.color || car.Color || '#ef4444';

            mCtx.fillStyle = cColor;
            mCtx.beginPath();
            mCtx.arc(mX, mY, 4, 0, Math.PI * 2);
            mCtx.fill();
        });
    }

    showGameOverModal(state) {
        if (this.isGameOverModalShown) return;
        this.isGameOverModalShown = true;

        if (this.gameLoopTimer) {
            clearInterval(this.gameLoopTimer);
            this.gameLoopTimer = null;
        }

        if (window.soundFX) window.soundFX.play('defuse');

        const winnerName = state.winnerName || state.WinnerName || 'CHIẾN THẮNG';
        const winnerId = state.winnerPlayerId || state.WinnerPlayerId;
        const isMeWinner = winnerId === this.myPlayerId;

        const modalId = 'racer-gameover-popup';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHTML = `
            <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.4s ease;">
                <div style="background: linear-gradient(135deg, rgba(23, 20, 41, 0.98), rgba(15, 10, 35, 0.98)); border: 2px solid #ef4444; border-radius: 20px; width: 90%; max-width: 480px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="font-size: 64px; line-height: 1;">${isMeWinner ? '🏆' : '🏎️'}</div>
                    <h2 style="font-size: 24px; color: #fbbf24; margin: 0; font-weight: 800;">${isMeWinner ? 'CHÚC MỪNG VÔ ĐỊCH!' : 'KẾT THÚC ĐƯỜNG ĐUA'}</h2>
                    <p style="font-size: 15px; color: #e2e8f0; margin: 0; line-height: 1.5;">Chúc mừng Tay Đua <strong>${winnerName}</strong> đã xuất sắc cán đích 3 vòng đua đầu tiên!</p>
                    
                    <div style="display: flex; gap: 12px; margin-top: 16px; width: 100%;">
                        <button id="btn-racer-inspect" class="btn btn-ghost" style="flex: 1; padding: 12px; font-size: 14px; border-color: #8b5cf6; color: #a78bfa;">👀 Xem Đường Đua</button>
                        <button id="btn-racer-lobby" class="btn btn-primary" style="flex: 1; padding: 12px; font-size: 14px; background: linear-gradient(135deg, #ef4444, #dc2626);">🏠 Về Phòng Chờ</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('btn-racer-inspect')?.addEventListener('click', () => {
            const popup = document.getElementById(modalId);
            if (popup) popup.style.display = 'none';

            if (!document.getElementById('btn-reopen-racer')) {
                const reopenBtn = document.createElement('button');
                reopenBtn.id = 'btn-reopen-racer';
                reopenBtn.className = 'btn btn-primary';
                reopenBtn.innerHTML = '🏆 Xem Kết Quả';
                reopenBtn.style.cssText = 'position: fixed; top: 70px; right: 20px; z-index: 9999; padding: 10px 18px; font-size: 13px; box-shadow: 0 4px 20px rgba(0,0,0,0.6);';
                reopenBtn.addEventListener('click', () => {
                    if (popup) popup.style.display = 'flex';
                });
                document.body.appendChild(reopenBtn);
            }
        });

        document.getElementById('btn-racer-lobby')?.addEventListener('click', () => {
            const popup = document.getElementById(modalId);
            if (popup) popup.remove();
            const reopenBtn = document.getElementById('btn-reopen-racer');
            if (reopenBtn) reopenBtn.remove();

            this.clear();
            if (window.lobbyManager && window.lobbyManager.currentRoom) {
                document.getElementById('room-view').style.display = 'block';
                window.lobbyManager.renderRoomState(window.lobbyManager.currentRoom);
            }
        });
    }

    clear() {
        this.isGameOverModalShown = false;
        this.skidMarks = [];

        if (this.gameLoopTimer) {
            clearInterval(this.gameLoopTimer);
            this.gameLoopTimer = null;
        }

        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        const reopenBtn = document.getElementById('btn-reopen-racer');
        if (reopenBtn) reopenBtn.remove();
        const popup = document.getElementById('racer-gameover-popup');
        if (popup) popup.remove();

        const chatBar = document.querySelector('.chat-bar');
        if (chatBar) chatBar.style.display = '';

        const appContainer = document.getElementById('game-container');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.style.display = 'none';
        }
    }
}

window.mythicRacerRenderer = new MythicRacerRenderer();
