class SignalRService {
    constructor() {
        this.connection = null;
        this.listeners = {};
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
            'ReceiveChatMessage', 'ReceiveEmojiReaction', 'ErrorNotification'
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
        return this.connection.invoke('CreateRoom', playerName, avatarUrl);
    }

    async joinRoom(roomCode, playerName, avatarUrl) {
        return this.connection.invoke('JoinRoom', roomCode, playerName, avatarUrl);
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
}

window.signalRService = new SignalRService();
