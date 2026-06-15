export class UIManager {
  constructor() {
    this.lobby = document.getElementById('lobby');
    this.hud = document.getElementById('hud');
    this.startOverlay = document.getElementById('startOverlay');
    this.gameOver = document.getElementById('gameOver');

    this._setupLobby();
  }

  _setupLobby() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('active'));
        el.classList.add('active');
      });
    });

    // Buttons
    document.getElementById('joinBtn').addEventListener('click', () => {
      const name = document.getElementById('joinName').value.trim() || 'Barista';
      const code = document.getElementById('joinCode').value.trim() || 'default';
      const avatar = parseInt(document.querySelector('#joinAvatar .active')?.dataset.idx || '0');
      if (this.onJoinGame) this.onJoinGame(name, code, avatar);
    });

    document.getElementById('createBtn').addEventListener('click', () => {
      const name = document.getElementById('createName').value.trim() || 'Barista';
      const room = document.getElementById('createRoom').value.trim() || `shop_${Date.now()}`;
      this.hideLobby();
      if (this.onJoinGame) this.onJoinGame(name, room, 0);
    });

    document.getElementById('startBtn').addEventListener('click', () => {
      if (this.onStartGame) this.onStartGame();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      if (this.onPlayAgain) this.onPlayAgain();
    });
  }

  set onJoinGame(fn) { this._onJoinGame = fn; }
  set onStartGame(fn) { this._onStartGame = fn; }
  set onPlayAgain(fn) { this._onPlayAgain = fn; }

  hideLobby() { this.lobby.style.display = 'none'; }
  showHUD(roomId) {
    this.hud.classList.remove('hidden');
    document.getElementById('roomDisplay').textContent = roomId;
  }

  showError(msg) {
    document.getElementById('lobbyError').textContent = msg;
  }

  updateScore(score) {
    document.getElementById('scoreDisplay').textContent = score;
  }

  updateMoney(money) {
    document.getElementById('moneyDisplay').textContent = `$${money}`;
  }

  updateTimer(seconds) {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.floor(Math.max(0, seconds) % 60);
    document.getElementById('timerDisplay').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateInventory(inv) {
    if (!inv) return;
    document.getElementById('invBeans').textContent = inv.beans;
    document.getElementById('invMilk').textContent = inv.milk;
    document.getElementById('invSugar').textContent = inv.sugar;
    document.getElementById('invCups').textContent = inv.cups;
  }

  updateCombo(combo) {
    if (combo > 1) {
      const el = document.getElementById('comboPopup');
      el.textContent = `🔥 x${combo} Combo!`;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 1000);
    }
  }

  updatePhase(phase) {
    const icons = { morning: '🌅', afternoon: '☀️', evening: '🌆' };
    document.getElementById('phaseIcon').textContent = icons[phase] || '☀️';
    document.getElementById('phaseDisplay').textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
  }

  updateHolding(holding) {
    const el = document.getElementById('holdingDisplay');
    const item = document.getElementById('holdingItem');
    if (holding) {
      const names = { beans: '🫘 Beans', milk: '🥛 Milk', sugar: '🍬 Sugar', coffee: '☕ Coffee' };
      item.textContent = names[holding.type] || holding.type;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  setPlayerName(name) {
    // Used for overlay
  }

  showStartOverlay(readyList) {
    this.startOverlay.classList.remove('hidden');
    const list = document.getElementById('readyList');
    list.innerHTML = readyList.map(p =>
      `<div class="ready-row">
        <span>${p.name}</span>
        <span class="ready-status ${p.ready ? 'ready' : 'not-ready'}">${p.ready ? '✅ Ready' : '⏳ Waiting'}</span>
      </div>`
    ).join('');
  }

  hideStartOverlay() {
    this.startOverlay.classList.add('hidden');
  }

  showGameOver(state) {
    this.gameOver.classList.remove('hidden');
    document.getElementById('finalScore').textContent = state.score;
    document.getElementById('finalMoney').textContent = `$${state.money}`;
    document.getElementById('finalServed').textContent = state.completedOrders;
    document.getElementById('finalCombo').textContent = state.combo;
  }
}
