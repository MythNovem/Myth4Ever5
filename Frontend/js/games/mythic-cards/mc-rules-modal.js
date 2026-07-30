/**
 * mc-rules-modal.js
 * Shows the rules modal dialog for Mythic Cards.
 */
class MCRulesModal {
    show() {
        const modalContainer = document.getElementById('rules-modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-backdrop" id="rules-backdrop">
                <div class="modal-box" style="max-width: 500px; text-align: left;">
                    <div class="modal-title" style="color: var(--gold-bright); margin-bottom: 16px;">📜 LUẬT CHƠI (BẪY NỔ)</div>
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6; max-height: 60vh; overflow-y: auto; padding-right: 8px;">
                        <ul style="margin-left: 16px; margin-bottom: 12px;">
                            <li style="margin-bottom: 6px;"><b>Mục tiêu:</b> Là người sống sót cuối cùng bằng cách KHÔNG rút phải <b>Bẫy Nổ</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Lượt đi:</b> Đến lượt, bạn có thể đánh <b>vô số lá bài trên tay</b> (hoặc không đánh lá nào). Sau khi đánh bài xong, bạn kết thúc lượt bằng cách <b>rút 1 lá bài</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Bẫy Nổ (💣) - 4 lá:</b> Rút phải nó là chết. Trừ khi bạn có <b>Gỡ Bẫy</b>.</li>
                            <li style="margin-bottom: 6px;"><b>Gỡ Bẫy (🛡️) - Giới hạn:</b> Nếu rút phải Bẫy Nổ và dùng Gỡ Bẫy, bạn được quyền nhét lại quả Bẫy Nổ đó vào <b>bất kỳ vị trí nào</b> trong xấp bài để bẫy người khác.</li>
                            <li style="margin-bottom: 6px;"><b>Bỏ Lượt (⏭️) - 5 lá:</b> Chấm dứt lượt mà <b>không cần rút bài</b>. Nếu đang bị "Ép Lượt", lá này chỉ huỷ 1 lượt.</li>
                            <li style="margin-bottom: 6px;"><b>Ép Lượt (🔄) - 5 lá:</b> Chấm dứt ngay lượt của bạn và bắt <b>người tiếp theo đi 2 lượt</b> liên tiếp.</li>
                            <li style="margin-bottom: 6px;"><b>Nhìn Tương Lai (👁️) - 5 lá:</b> Xem bí mật 3 lá trên cùng của xấp bài rút.</li>
                            <li style="margin-bottom: 6px;"><b>Xáo Bài (🔀) - 5 lá:</b> Xáo trộn lại xấp bài rút.</li>
                            <li style="margin-bottom: 6px;"><b>Cướp Bài (🎁) - 5 lá:</b> Cho phép chọn và cướp 1 lá bất kỳ trên tay đối thủ.</li>
                            <li style="margin-bottom: 6px;"><b>Đổi Tương Lai (🔮) - 3 lá:</b> Xem 3 lá trên cùng và <b>sắp xếp lại</b> thứ tự.</li>
                            <li style="margin-bottom: 6px;"><b>Rút Đáy (⚓) - 3 lá:</b> Kết thúc lượt bằng cách <b>rút lá dưới cùng</b> của bộ bài.</li>
                            <li style="margin-bottom: 6px;"><b>Ám Sát (🎯) - 3 lá:</b> Ép một người chơi bất kỳ phải đi 2 lượt liên tiếp.</li>
                            <li style="margin-bottom: 6px;"><b>Bài Thường (🦊🐲🐺🧚🪨) - 40 lá:</b> Không có tác dụng đơn lẻ. Hãy dùng tính năng <b>chọn nhiều lá (Combo)</b> bằng cách click nhiều lá bài thường giống nhau để kích hoạt hiệu ứng đặc biệt (2 lá cướp bài, 3 lá xem bài).</li>
                        </ul>
                        
                        <div style="font-weight: bold; color: var(--gold-bright); margin: 16px 0 8px;">🎮 LUẬT COMBO BÀI THƯỜNG</div>
                        <p style="margin-bottom: 8px;">Bài thường (Cáo, Rồng, Sói, Tinh Linh, Golem) không có tác dụng khi đánh lẻ. Phải đánh theo bộ (Combo):</p>
                        <ul style="margin-left: 16px; margin-bottom: 12px;">
                            <li style="margin-bottom: 6px;"><b>Đôi (2 lá giống nhau):</b> Chọn 1 người chơi để <b>cướp ngẫu nhiên</b> 1 lá bài từ tay họ.</li>
                            <li style="margin-bottom: 6px;"><b>Ba (3 lá giống nhau):</b> Chọn 1 người chơi và <b>đòi đích danh 1 lá bài cụ thể</b>. Nếu họ có, họ buộc phải đưa cho bạn. Nếu không có, bạn mất trắng 3 lá!</li>
                            <li style="margin-bottom: 6px;"><b>Năm (5 lá khác nhau hoàn toàn):</b> Kích hoạt kỹ năng <b>Bới Rác</b>. Chọn 1 lá bất kỳ trong Chồng Bài Bỏ để lấy lại vào tay.</li>
                        </ul>
                        <div style="text-align:center;"><i>Càng về cuối, tỉ lệ bốc trúng bẫy càng cao! Chúc bạn may mắn.</i></div>
                    </div>
                    <button class="btn btn-primary" id="btn-close-rules" style="width: 100%; margin-top: 20px;">Đã Hiểu</button>
                </div>
            </div>
        `;

        document.getElementById('btn-close-rules')?.addEventListener('click', () => {
            modalContainer.innerHTML = '';
        });
        document.getElementById('rules-backdrop')?.addEventListener('click', (e) => {
            if (e.target.id === 'rules-backdrop') modalContainer.innerHTML = '';
        });
    }
}

window.mcRulesModal = new MCRulesModal();
