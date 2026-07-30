/**
 * mc-hand-renderer.js
 * Responsible for rendering the player's hand cards, selection, drag-drop reorder,
 * and play button. Knows nothing about game rules — only UI concerns.
 */
class MCHandRenderer {
    constructor() {
        this.selectedCardIds = [];
        this._onPlayCards = null; // Callback set by main renderer
    }

    /** Bind a callback when player wants to play selected cards */
    onPlayCards(callback) { this._onPlayCards = callback; }

    render(state, myId) {
        const container = document.getElementById('my-hand-container');
        if (!container || !state.playerHands) return;

        const myHand    = state.playerHands[myId] || [];
        const isMyTurn  = state.currentTurnPlayerId === myId;
        const amIExploding = state.isExploding && state.explodingPlayerId === myId;

        // Sync selection with current hand
        const handIds = myHand.map(c => c.id);
        this.selectedCardIds = this.selectedCardIds.filter(id => handIds.includes(id));

        // Render card HTML
        container.innerHTML = myHand.map(card => {
            const isSelected = this.selectedCardIds.includes(card.id);
            const isDefuse   = card.type.toLowerCase() === 'defuse';
            const dimmed     = amIExploding && !isDefuse ? 'style="opacity:0.35; pointer-events:none;"' : '';
            return `
                <div class="game-card card--${card.type.toLowerCase()} ${isSelected ? 'selected' : ''}"
                     data-card-id="${card.id}"
                     data-card-type="${card.type}"
                     title="${card.description}"
                     draggable="true" ${dimmed}>
                    <span class="card-type-label">${card.type}</span>
                    <span class="card-icon">${card.icon}</span>
                    <span class="card-name">${card.name}</span>
                    <span class="card-desc">${card.description}</span>
                </div>
            `;
        }).join('');

        // Lock / unlock deck pile
        const deckPile = document.getElementById('deck-pile');
        if (deckPile) {
            deckPile.style.opacity       = amIExploding ? '0.4' : '';
            deckPile.style.pointerEvents = amIExploding ? 'none' : '';
            const label = deckPile.querySelector('.pile-label');
            if (label) label.textContent = amIExploding ? '💣 Gỡ bẫy trước!' : 'Bấm để rút';
        }

        // Attach click events
        let draggedCard = null;
        container.querySelectorAll('.game-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                if (amIExploding && cardEl.getAttribute('data-card-type').toLowerCase() !== 'defuse') {
                    window.lobbyManager.showToast('Bạn đang dính Bẫy Nổ! Hãy dùng lá Gỡ Bẫy!', 'danger');
                    return;
                }
                if (!isMyTurn && !amIExploding) {
                    window.lobbyManager.showToast('Chưa đến lượt của bạn!', 'warning');
                    return;
                }
                this.toggleCardSelection(cardEl.getAttribute('data-card-id'), state, myId);
            });

            cardEl.addEventListener('dragstart', () => {
                this._draggedCard = cardEl;
                setTimeout(() => cardEl.style.opacity = '0.5', 0);
            });
            cardEl.addEventListener('dragend', () => {
                if (this._draggedCard) this._draggedCard.style.opacity = '1';
                this._draggedCard = null;
            });
        });

        // Drag-to-reorder (attached once to avoid duplicate listener spam)
        if (!container.dataset.dragBound) {
            container.dataset.dragBound = 'true';
            container.addEventListener('dragover', e => {
                e.preventDefault();
                if (!this._draggedCard) return;
                const after = this._getDragAfterElement(container, e.clientX);
                if (after == null) container.appendChild(this._draggedCard);
                else container.insertBefore(this._draggedCard, after);
            });

            container.addEventListener('drop', e => {
                e.preventDefault();
                const newOrder = Array.from(container.querySelectorAll('.game-card'))
                    .map(el => el.getAttribute('data-card-id'))
                    .filter(id => id);
                if (newOrder.length > 0) {
                    window.signalRService.sendGameAction('reorder_hand', { cardIds: newOrder });
                }
            });
        }

        // Bind sort button click
        const sortBtn = document.getElementById('btn-sort-hand');
        if (sortBtn) {
            sortBtn.onclick = () => this.sortHand(state, myId);
        }

        this._renderPlayButton(isMyTurn);
    }

    sortHand(state, myId) {
        if (!state || !state.playerHands) return;
        const myHand = state.playerHands[myId] || [];
        if (myHand.length <= 1) return;

        // Group identical/same-type cards together
        const sortedHand = [...myHand].sort((a, b) => {
            const typeA = (a.type || '').toLowerCase();
            const typeB = (b.type || '').toLowerCase();
            const typeComp = typeA.localeCompare(typeB);
            if (typeComp !== 0) return typeComp;

            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const sortedIds = sortedHand.map(card => card.id);
        if (window.signalRService) {
            window.signalRService.sendGameAction('reorder_hand', { cardIds: sortedIds });
        }
    }

    toggleCardSelection(cardId, state, myId) {
        if (this.selectedCardIds.includes(cardId)) {
            this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
        } else {
            this.selectedCardIds.push(cardId);
        }
        this.render(state, myId);
    }

    clearSelection() { this.selectedCardIds = []; }

    _renderPlayButton(isMyTurn) {
        const handArea = document.getElementById('hand-area');
        if (!handArea) return;

        let btn = document.getElementById('btn-play-selected');
        if (this.selectedCardIds.length > 0 && isMyTurn) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'btn-play-selected';
                btn.className = 'btn btn-primary';
                Object.assign(btn.style, { position: 'absolute', bottom: '24px', right: '32px',
                    width: 'auto', zIndex: '100', padding: '12px 24px', fontSize: '14px',
                    boxShadow: '0 0 20px rgba(123, 82, 214, 0.5)' });
                btn.addEventListener('click', () => this._onPlayCards && this._onPlayCards(this.selectedCardIds));
                handArea.style.position = 'relative';
                handArea.appendChild(btn);
            }
            btn.innerText = `Đánh ${this.selectedCardIds.length} lá đã chọn`;
            btn.style.display = 'block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    _getDragAfterElement(container, x) {
        return [...container.querySelectorAll('.game-card:not([style*="opacity: 0.5"])')].reduce((closest, child) => {
            const offset = x - child.getBoundingClientRect().left - child.getBoundingClientRect().width / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

window.mcHandRenderer = new MCHandRenderer();
