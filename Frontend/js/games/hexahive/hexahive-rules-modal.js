/**
 * HexaHive Rules Modal — Interactive 3-Tab Guide for Beginners
 */
class HexaHiveRulesModal {
    constructor() {
        this.activeTab = 'tab-intro';
        this.initDOM();
    }

    initDOM() {
        if (document.getElementById('hexahive-rules-modal')) return;

        const modalHTML = `
        <div id="hexahive-rules-modal" class="modal-overlay hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; display: none; align-items: center; justify-content: center;">
            <div class="glass-modal hexahive-rules-dialog" style="background: rgba(23, 20, 41, 0.95); border: 2px solid #8b5cf6; border-radius: 16px; width: 90%; max-width: 640px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.8);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(139, 92, 246, 0.3);">
                    <h2 style="font-size: 18px; color: #fbbf24; margin: 0;">🐝 Hướng Dẫn Luật Chơi MythicHive: Bug Tactics</h2>
                    <button class="btn-close-modal" id="btn-close-hexahive-rules" style="background: none; border: none; font-size: 24px; color: #fff; cursor: pointer;">&times;</button>
                </div>

                <div class="rules-tabs" style="display: flex; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                    <button class="tab-btn active" data-tab="tab-intro" style="flex: 1; padding: 12px; background: none; border: none; color: #fbbf24; font-weight: 600; cursor: pointer; border-bottom: 2px solid #8b5cf6;">🔰 1. Nhập Môn</button>
                    <button class="tab-btn" data-tab="tab-pieces" style="flex: 1; padding: 12px; background: none; border: none; color: #a78bfa; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;">🐜 2. 8 Quân Cờ</button>
                    <button class="tab-btn" data-tab="tab-strategy" style="flex: 1; padding: 12px; background: none; border: none; color: #a78bfa; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;">💡 3. Mẹo Đấu Trí</button>
                </div>

                <div class="modal-body rules-content" style="padding: 20px; overflow-y: auto; flex: 1; font-size: 13px; color: #e2e8f0; line-height: 1.6;">
                    <!-- TAB 1: INTRO -->
                    <div id="tab-intro" class="tab-pane" style="display: block;">
                        <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid #8b5cf6; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                            <h3 style="color: #fbbf24; margin: 0 0 6px 0; font-size: 15px;">🎯 Mục Tiêu Tối Thượng:</h3>
                            <p style="margin: 0;">Bao vây hoàn toàn <strong>6 ô xung quanh 👑 Ong Chúa của đối thủ</strong> bằng bất kỳ quân cờ nào (của bạn hoặc của đối thủ).</p>
                        </div>

                        <h3 style="color: #a78bfa; margin-bottom: 10px;">✨ 3 Quy Tắc Vàng Cần Phải Nhớ:</h3>
                        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
                            <li>
                                <strong>1. Đặt Ong Chúa Đúng Hạn:</strong> 
                                Bạn phải đặt 👑 Ong Chúa ra bàn cờ trước hoặc tại <strong>Lượt thứ 4</strong>. <em>Chưa đặt Ong Chúa thì chưa được phép di chuyển bất kỳ quân nào!</em>
                            </li>
                            <li>
                                <strong>2. Quy Tắc 1-Tổ-Ong (One-Hive Rule):</strong> 
                                Bàn cờ phải luôn tạo thành <strong>1 khối liên thông duy nhất</strong>. Không nước đi nào được phép làm đứt gãy tổ ong thành 2 phần!
                            </li>
                            <li>
                                <strong>3. Quy Tắc Đặt Quân Mới:</strong> 
                                Quân cờ mới đặt ra từ kho phải tiếp xúc với ít nhất 1 quân mình và <strong>KHÔNG ĐƯỢC CHẠM</strong> bất kỳ quân đối thủ nào (trừ lượt đặt đầu tiên của trận).
                            </li>
                        </ul>
                    </div>

                    <!-- TAB 2: PIECES -->
                    <div id="tab-pieces" class="tab-pane" style="display: none;">
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">👑</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Ong Chúa (Queen Bee - x1)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Di chuyển 1 ô xung quanh viền. Tâm điểm bảo vệ và tấn công.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🐜</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Kiến Chiến Binh (Soldier Ant - x3)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Di chuyển tự do bao nhiêu ô tùy thích xung quanh viền ngoài tổ ong.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🕷️</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Nhện Sát Thủ (Spider - x2)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Di chuyển chính xác 3 bước xung quanh viền tổ ong theo 1 chiều.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🦗</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Châu Chấu (Grasshopper - x3)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Nhảy thẳng qua hàng quân cờ đang nối liền đến ô trống đầu tiên.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🪲</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Bọ Cánh Cứng (Beetle - x2)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Di chuyển 1 ô. Có thể trèo lên trên lưng quân khác để đè và khóa quân bên dưới!</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🐞</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Bọ Rùa (Ladybug - x1)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Di chuyển chính xác 3 bước: 2 bước trên lưng quân khác + 1 bước hạ xuống đất.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🦟</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Muỗi (Mosquito - x1)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Coppy kỹ năng di chuyển của bất kỳ quân cờ nào mà nó đang tiếp xúc kề bên.</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                                <span style="font-size: 28px;">🛡️</span>
                                <div>
                                    <h4 style="margin: 0; color: #fbbf24;">Bọ Cuộn / Mối (Pillbug - x1)</h4>
                                    <p style="margin: 2px 0 0 0; color: #cbd5e1;">Có thể bốc 1 quân kề bên (mình/đối thủ) quăng sang ô trống kế bên để giải cứu Ong Chúa.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: STRATEGY -->
                    <div id="tab-strategy" class="tab-pane" style="display: none;">
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border-left: 3px solid #fbbf24;">
                                <h4 style="margin: 0 0 4px 0; color: #fbbf24;">🎯 THẾ CỜ & KHÁI NIỆM CHIẾN THUẬT ĐỈNH CAO (HIVE MASTER STRATEGIES)</h4>
                                <p style="margin: 0; font-size: 13px; color: #e2e8f0;">Hệ thống game HexaHive đã hỗ trợ & thực thi toàn bộ 24 thế cờ nâng cao chuẩn quốc tế:</p>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">1. True Pin (Khóa Cương Quyết):</strong> Bắt quân đối thủ đứng yên vì nếu di chuyển sẽ vi phạm One-Hive Rule.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">2. False Pin (Khóa Ảo):</strong> Tưởng như bị gài nhưng khi gài thêm quân khác thì quân đó tự do di chuyển.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">3. Double Beetle Attack:</strong> Dùng 2 Bọ Cánh Cứng 🪲 trèo đè liên tiếp đè nát Ong Chúa.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">4. Ant Farm (Nông Trại Kiến):</strong> Đóng chiếm viền ngoài bằng 2-3 Kiến 🐜 để làm chủ hoàn toàn bàn cờ.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">5. Direct Drop:</strong> Đặt quân mới áp sát ngay Ong Chúa đối phương để tạo sức ép tức thì.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">6. Proximity Pillbug Attack:</strong> Dùng Bọ Cuộn 🛡️ áp sát quăng quân vệ sĩ của đối thủ đi chỗ khác.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">7. Choking the Queen:</strong> Bao vây siết chặt 5/6 ô xung quanh Ong Chúa để dứt điểm.
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                                    <strong style="color: #fbbf24;">8. Mosquito Shutdown:</strong> Rút Muỗi 🦟 khỏi vị trí tiếp xúc quân nguy hiểm để triệt hạ sức mạnh đối thủ.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid rgba(139, 92, 246, 0.3); display: flex; justify-content: flex-end;">
                    <button id="btn-got-it-rules" class="btn btn-primary" style="width: auto; padding: 10px 24px;">Đã Hiểu! Đóng Hướng Dẫn 🚀</button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind tab switching with explicit inline style display control
        document.querySelectorAll('#hexahive-rules-modal .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;

                // Reset all tab buttons
                document.querySelectorAll('#hexahive-rules-modal .tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = '#a78bfa';
                });

                // Hide all tab content panes with inline style
                document.querySelectorAll('#hexahive-rules-modal .tab-pane').forEach(p => {
                    p.style.display = 'none';
                });

                // Activate clicked tab button
                e.currentTarget.classList.add('active');
                e.currentTarget.style.borderBottomColor = '#8b5cf6';
                e.currentTarget.style.color = '#fbbf24';

                // Display targeted content pane
                const targetEl = document.getElementById(targetTab);
                if (targetEl) {
                    targetEl.style.display = 'block';
                }
            });
        });

        // Bind close buttons
        document.getElementById('btn-close-hexahive-rules')?.addEventListener('click', () => this.hide());
        document.getElementById('btn-got-it-rules')?.addEventListener('click', () => this.hide());
    }

    show() {
        const modal = document.getElementById('hexahive-rules-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    }

    hide() {
        const modal = document.getElementById('hexahive-rules-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }
}

window.HexaHiveRulesModal = HexaHiveRulesModal;
