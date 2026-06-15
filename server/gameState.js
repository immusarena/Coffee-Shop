class GameState {
  constructor() {
    this.rooms = new Map(); // roomId -> { players, orders, coffeeMachines, etc. }
  }

  createRoom(roomId) {
    const room = {
      id: roomId,
      players: new Map(),
      orders: [],
      coffeeMachines: [
        { id: 'machine1', x: 4, z: 4, busy: false, progress: 0 },
        { id: 'machine2', x: 6, z: 4, busy: false, progress: 0 },
      ],
      ingredients: {
        beans: 10,
        milk: 10,
        sugar: 10,
        cups: 20,
      },
      score: 0,
      customerQueue: [],
      customerSpawnTimer: 0,
      gameRunning: false,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  addPlayer(roomId, playerId, playerName) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const player = {
      id: playerId,
      name: playerName,
      x: 2 + room.players.size * 2,
      z: 2,
      rotation: 0,
      carrying: null, // 'cup', 'beans', 'milk'
      color: this.getNextPlayerColor(room.players.size),
      isReady: false,
    };
    room.players.set(playerId, player);
    return player;
  }

  getNextPlayerColor(index) {
    const colors = [0x4285F4, 0xEA4335, 0x34A853, 0xFBBC05, 0x8E44AD, 0x1ABC9C];
    return colors[index % colors.length];
  }

  removePlayer(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.players.delete(playerId);
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  updatePlayerPosition(roomId, playerId, x, z, rotation) {
    const room = this.getRoom(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    player.x = x;
    player.z = z;
    player.rotation = rotation;
  }

  spawnCustomer(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return;

    const drinks = ['Espresso', 'Latte', 'Cappuccino', 'Americano', 'Mocha'];
    const customer = {
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      order: drinks[Math.floor(Math.random() * drinks.length)],
      patience: 30, // seconds
      x: -2,
      z: 5 + Math.random() * 4,
      impatient: false,
    };
    room.customerQueue.push(customer);
  }

  startGame(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    room.gameRunning = true;
    room.score = 0;
    room.orders = [];
    room.customerQueue = [];
    room.ingredients = { beans: 10, milk: 10, sugar: 10, cups: 20 };
    return true;
  }

  tick(deltaSec) {
    for (const room of this.rooms.values()) {
      if (!room.gameRunning) continue;

      // Spawn customers periodically
      room.customerSpawnTimer += deltaSec;
      if (room.customerSpawnTimer > 5 && room.customerQueue.length < 5) {
        this.spawnCustomer(room.id);
        room.customerSpawnTimer = 0;
      }

      // Tick customer patience
      for (let i = room.customerQueue.length - 1; i >= 0; i--) {
        const customer = room.customerQueue[i];
        customer.patience -= deltaSec;
        if (customer.patience <= 0) {
          room.customerQueue.splice(i, 1);
        }
      }

      // Tick coffee machines
      for (const machine of room.coffeeMachines) {
        if (machine.busy) {
          machine.progress += deltaSec;
          if (machine.progress >= 3) {
            machine.busy = false;
            machine.progress = 0;
          }
        }
      }
    }
  }

  serveOrder(roomId, playerId, coffeeType) {
    const room = this.getRoom(roomId);
    if (!room) return false;

    // Find a customer who ordered this
    const idx = room.customerQueue.findIndex(c => c.order === coffeeType);
    if (idx === -1) return false;

    room.customerQueue.splice(idx, 1);
    room.score += 10;
    return true;
  }

  getSerializedState(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    return {
      players: Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, x: p.x, z: p.z,
        rotation: p.rotation, carrying: p.carrying, color: p.color,
      })),
      orders: room.orders,
      coffeeMachines: room.coffeeMachines,
      ingredients: room.ingredients,
      score: room.score,
      customerQueue: room.customerQueue,
      gameRunning: room.gameRunning,
    };
  }
}

module.exports = GameState;
