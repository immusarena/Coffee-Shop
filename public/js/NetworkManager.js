export class NetworkManager {
  constructor() {
    this.socket = io();
    this._setupListeners();
  }

  set onConnect(fn) { this._onConnect = fn; }
  set onRoomJoined(fn) { this._onRoomJoined = fn; }
  set onPlayerJoined(fn) { this._onPlayerJoined = fn; }
  set onPlayerLeft(fn) { this._onPlayerLeft = fn; }
  set onPlayerMoved(fn) { this._onPlayerMoved = fn; }
  set onGameState(fn) { this._onGameState = fn; }
  set onInteractionResult(fn) { this._onInteractionResult = fn; }
  set onGameStarted(fn) { this._onGameStarted = fn; }

  _setupListeners() {
    this.socket.on('connect', () => {
      if (this._onConnect) this._onConnect(this.socket.id);
    });

    this.socket.on('room:joined', (data) => {
      if (this._onRoomJoined) this._onRoomJoined(data);
    });

    this.socket.on('player:joined', (data) => {
      if (this._onPlayerJoined) this._onPlayerJoined(data);
    });

    this.socket.on('player:left', (data) => {
      if (this._onPlayerLeft) this._onPlayerLeft(data);
    });

    this.socket.on('player:moved', (data) => {
      if (this._onPlayerMoved) this._onPlayerMoved(data);
    });

    this.socket.on('game:tick', (state) => {
      if (this._onGameState) this._onGameState(state);
    });

    this.socket.on('interaction:result', (data) => {
      if (this._onInteractionResult) this._onInteractionResult(data);
    });

    this.socket.on('game:started', (data) => {
      if (this._onGameStarted) this._onGameStarted(data);
    });
  }

  emit(event, data, callback) {
    this.socket.emit(event, data, callback);
  }
}
