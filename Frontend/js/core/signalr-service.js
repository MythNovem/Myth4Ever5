class SignalRService {
    constructor() {
        this.connection = null;
        this.listeners = {};
        this.playerId = this.getOrCreatePlayerId();
    }

    getOrCreatePlayerId() {
        let id = localStorage.getItem('myth_player_id');
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('myth_player_id', id);
        }
        return id;
    }

    async init(hubUrl = 'http://localhost:5000/hubs/party') {
        if (typeof signalR === 'undefined') {
            console.error('SignalR script chưa được nạp!');
            return false;
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.registerServerEvents();

        try {
            await this.connection.start();
            console.log('✅ Đã kết nối SignalR Hub thành công!');
            return true;
        } catch (err) {
            console.error('❌ Lỗi kết nối SignalR:', err);
            return false;
        }
    }

    registerServerEvents() {
        const events = [
            'PlayerJoined', 'PlayerLeft', 'RoomStateUpdated', 
            'GameStarted', 'GameActionBroadcast', 'GameOver', 
            'ReceiveChatMessage', 'ReceiveEmojiReaction', 'PlayerKicked', 'ErrorNotification'
        ];

        events.forEach(eventName => {
            this.connection.on(eventName, (...args) => {
                if (this.listeners[eventName]) {
                    this.listeners[eventName].forEach(callback => callback(...args));
                }
            });
        });
    }

    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    async createRoom(playerName, avatarUrl) {
        return this.connection.invoke('CreateRoom', this.playerId, playerName, avatarUrl);
    }

    async joinRoom(roomCode, playerName, avatarUrl) {
        return this.connection.invoke('JoinRoom', roomCode, this.playerId, playerName, avatarUrl);
    }

    async rejoinRoom(roomCode) {
        return this.connection.invoke('RejoinRoom', roomCode, this.playerId);
    }

    async leaveRoomExplicit() {
        return this.connection.invoke('LeaveRoomExplicit', this.playerId);
    }

    async selectGame(gameTypeId) {
        return this.connection.invoke('SelectGame', gameTypeId);
    }

    async toggleReady() {
        return this.connection.invoke('ToggleReady');
    }

    async addBot() {
        return this.connection.invoke('AddBot');
    }

    async kickPlayer(targetPlayerId) {
        return this.connection.invoke('KickPlayer', targetPlayerId);
    }

    async startGame() {
        return this.connection.invoke('StartGame');
    }

    async sendGameAction(actionType, payload) {
        return this.connection.invoke('SendGameAction', actionType, payload);
    }

    async sendChatMessage(message) {
        return this.connection.invoke('SendChatMessage', message);
    }

    async sendEmojiReaction(emoji) {
        return this.connection.invoke('SendEmojiReaction', emoji);
    }

    getConnectionId() {
        return this.connection ? this.connection.connectionId : null;
    }

    getPlayerId() {
        return this.playerId;
    }
}

window.signalRService = new SignalRService();
