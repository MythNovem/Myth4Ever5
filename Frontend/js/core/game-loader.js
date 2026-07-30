class GameLoader {
    constructor() {
        this.renderers = {};
        this.activeRenderer = null;
    }

    registerRenderer(gameTypeId, rendererInstance) {
        this.renderers[gameTypeId] = rendererInstance;
    }

    loadGame(gameTypeId, initialData) {
        document.getElementById('room-view').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';

        // Ẩn Header để có không gian rộng rãi (trang riêng)
        const header = document.querySelector('.app-header');
        if (header) header.style.display = 'none';

        // Không ẩn chat panel nữa, để người chơi có thể chat trong game
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) chatPanel.style.display = 'flex';

        const renderer = this.renderers[gameTypeId];
        if (renderer) {
            this.activeRenderer = renderer;
            renderer.init(initialData);
        } else {
            console.error(`Không tìm thấy Game Renderer cho gameTypeId: ${gameTypeId}`);
        }
    }

    handleAction(actionType, data) {
        if (this.activeRenderer && typeof this.activeRenderer.handleAction === 'function') {
            this.activeRenderer.handleAction(actionType, data);
        }
    }

    handleGameOver(winnerId, winnerName, summary) {
        if (this.activeRenderer && typeof this.activeRenderer.handleGameOver === 'function') {
            this.activeRenderer.handleGameOver(winnerId, winnerName, summary);
        }
    }
}

window.gameLoader = new GameLoader();
