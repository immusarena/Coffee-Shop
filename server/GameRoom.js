const { v4: uuidv4 } = require('uuid');

const RECIPES = {
  espresso: { name: 'Espresso', beans: 1, milk: 0, sugar: 0, time: 3, color: 0x3E2723, icon: '☕' },
  latte: { name: 'Latte', beans: 1, milk: 2, sugar: 0, time: 4, color: 0xD7CCC8, icon: '🥛' },
  cappuccino: { name: 'Cappuccino', beans: 1, milk: 1, sugar: 1, time: 4, color: 0xBCAAA4, icon: '🧋' },
  mocha: { name: 'Mocha', beans: 1, milk: 1, sugar: 1, time: 5, color: 0x4E342E, icon: '🍫' },
  americano: { name: 'Americano', beans: 1, milk: 0, sugar: 0, time: 2, color: 0x5D4037, icon: '💧' },
};

const AVATAR_COLORS = [
  0x4285F4, 0xEA4335, 0x34A853, 0xFBBC05,
  0x8E44AD, 0x1ABC9C, 0xE67E22, 0x2C3E50,
];

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.stations = this._createStations();
    this.customers = [];
    this.orders = [];
    this.score = 0;
    this.combo = 0;
    this.isRunning = false;
    this.timeRemaining = 0;
    this.timeLimit = 180; // 3 minutes
    this.customerSpawnTimer = 0;
    this.customerSpawnInterval = 4;
    this.dayPhase = 'morning'; // morning, afternoon, evening
    this.dayTimer = 0;
    this.inventory = { beans: 30, milk: 30, sugar: 30, cups: 50 };
    this.money = 0;
    this.completedOrders = 0;
    this.failedOrders = 0;
  }

  _createStations() {
    return {
      // Coffee machines
      machines: [
        { id: 'machine_0', x: 3.5, z: 4.5, busy: false, progress: 0, recipe: null, time: 0 },
        { id: 'machine_1', x: 5.5, z: 4.5, busy: false, progress: 0, recipe: null, time: 0 },
      ],
      // Ingredient stations
      ingredientStations: [
        { id: 'beans', x: -4, z: 4, type: 'beans', count: 10 },
        { id: 'milk', x: -4, z: 3, type: 'milk', count: 10 },
        { id: 'sugar', x: -4, z: 2, type: 'sugar', count: 10 },
      ],
      // Serving counter
      servingCounter: { id: 'counter', x: 5, z: 2.5 },
      // Trash
      trash: { id: 'trash', x: -5, z: -3 },
    };
  }

  get playerCount() { return this.players.size; }

  addPlayer(socketId, name, avatarIndex) {
    if (this.players.size >= 8) return null;

    const color = AVATAR_COLORS[this.players.size % AVATAR_COLORS.length];
    const spawnX = 1 + (this.players.size % 4) * 1.5;
    const spawnZ = 1 + Math.floor(this.players.size / 4) * 1.5;

    const player = {
      id: socketId,
      name,
      avatar: avatarIndex,
      color,
      x: spawnX,
      z: spawnZ,
      rotation: 0,
      holding: null, // { type: 'beans'|'milk'|'sugar'|'cup'|'espresso'|etc. }
      state: 'idle', // idle, walking, working
      isReady: false,
      stats: { served: 0, failed: 0, made: 0 },
    };

    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  updatePlayerPosition(socketId, x, z, rotation) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.x = x;
    player.z = z;
    player.rotation = rotation;
    player.state = 'walking';
  }

  startGame() {
    this.isRunning = true;
    this.timeRemaining = this.timeLimit;
    this.score = 0;
    this.money = 0;
    this.combo = 0;
    this.completedOrders = 0;
    this.failedOrders = 0;
    this.customers = [];
    this.inventory = { beans: 30, milk: 30, sugar: 30, cups: 50 };
    this.dayPhase = 'morning';
    this.dayTimer = 0;
    this.customerSpawnTimer = 0;

    // Spawn initial customers
    for (let i = 0; i < 2; i++) {
      this._spawnCustomer();
    }
  }

  _spawnCustomer() {
    const recipeKeys = Object.keys(RECIPES);
    const recipe = RECIPES[recipeKeys[Math.floor(Math.random() * recipeKeys.length)]];
    
    const customer = {
      id: uuidv4(),
      order: recipe,
      patience: 25 + Math.random() * 15, // 25-40 seconds
      maxPatience: 25 + Math.random() * 15,
      x: -3 + Math.random() * 2,
      z: -3 + Math.random() * 2,
      state: 'waiting', // waiting, impatient, leaving
      tipMultiplier: 1.0,
      arrivalTime: Date.now(),
    };

    this.customers.push(customer);
  }

  handleInteraction(socketId, data) {
    const player = this.players.get(socketId);
    if (!player) return null;

    const { action, targetId, recipe } = data;

    switch (action) {
      case 'pickup_ingredient': {
        const station = this.stations.ingredientStations.find(s => s.id === targetId);
        if (!station || station.count <= 0) return null;
        
        if (player.holding) return { type: 'error', message: 'Already holding something' };
        
        station.count--;
        player.holding = { type: station.type };
        
        return {
          type: 'pickup',
          playerId: socketId,
          item: station.type,
          stationId: targetId,
          stationCount: station.count,
        };
      }

      case 'use_machine': {
        const machine = this.stations.machines.find(m => m.id === targetId);
        if (!machine || machine.busy) return null;
        
        // Check if player is holding beans or cup
        if (!player.holding || (player.holding.type !== 'beans' && player.holding.type !== 'cup')) {
          return { type: 'error', message: 'Need beans or cup for machine' };
        }

        const recipeKey = recipe || 'espresso';
        const recipeData = RECIPES[recipeKey];
        if (!recipeData) return { type: 'error', message: 'Unknown recipe' };

        // Use inventory
        if (this.inventory.beans < recipeData.beans) {
          return { type: 'error', message: 'Not enough beans!' };
        }
        if (this.inventory.milk < recipeData.milk) {
          return { type: 'error', message: 'Not enough milk!' };
        }
        if (this.inventory.cups < 1) {
          return { type: 'error', message: 'No cups left!' };
        }

        this.inventory.beans -= recipeData.beans;
        this.inventory.milk -= recipeData.milk;
        this.inventory.sugar -= recipeData.sugar;
        this.inventory.cups -= 1;

        machine.busy = true;
        machine.progress = 0;
        machine.recipe = recipeKey;
        machine.time = recipeData.time;
        player.holding = null;
        player.state = 'working';

        return {
          type: 'machine_start',
          playerId: socketId,
          machineId: targetId,
          recipe: recipeKey,
          time: recipeData.time,
          inventory: { ...this.inventory },
        };
      }

      case 'collect_machine': {
        const machine = this.stations.machines.find(m => m.id === targetId);
        if (!machine || !machine.busy || machine.progress < machine.time) return null;

        if (player.holding) return { type: 'error', message: 'Hands full!' };

        const recipeData = RECIPES[machine.recipe];
        player.holding = { type: 'coffee', recipe: machine.recipe };
        machine.busy = false;
        machine.progress = 0;
        machine.recipe = null;

        return {
          type: 'collect',
          playerId: socketId,
          machineId: targetId,
          recipe: player.holding.recipe,
        };
      }

      case 'serve': {
        if (!player.holding || player.holding.type !== 'coffee') {
          return { type: 'error', message: 'Not holding coffee!' };
        }

        // Find matching customer
        const customerIdx = this.customers.findIndex(
          c => c.order.name === RECIPES[player.holding.recipe]?.name
        );

        if (customerIdx === -1) {
          return { type: 'error', message: 'No customer wants this!' };
        }

        const customer = this.customers[customerIdx];
        const timeBonus = Math.max(0, Math.floor(customer.patience / customer.maxPatience * 50));
        const basePoints = 100;
        const comboMultiplier = 1 + (this.combo * 0.1);
        const points = Math.floor((basePoints + timeBonus) * comboMultiplier);

        this.score += points;
        this.money += 5 + Math.floor(timeBonus / 10);
        this.combo++;
        this.completedOrders++;
        player.holding = null;
        player.stats.served++;

        this.customers.splice(customerIdx, 1);

        return {
          type: 'serve',
          playerId: socketId,
          points,
          combo: this.combo,
          score: this.score,
          money: this.money,
          recipe: customer.order.name,
          customerId: customer.id,
        };
      }

      case 'trash': {
        if (!player.holding) return null;
        player.holding = null;
        return { type: 'trash', playerId: socketId };
      }

      default:
        return null;
    }
  }

  tick(delta) {
    if (!this.isRunning) return;

    // Timer
    this.timeRemaining -= delta;
    if (this.timeRemaining <= 0) {
      this.isRunning = false;
      return;
    }

    // Day phase cycle (every 60s)
    this.dayTimer += delta;
    if (this.dayTimer > 60) {
      this.dayTimer = 0;
      const phases = ['morning', 'afternoon', 'evening'];
      const idx = phases.indexOf(this.dayPhase);
      this.dayPhase = phases[(idx + 1) % phases.length];
      this.customerSpawnInterval = this.dayPhase === 'morning' ? 3 : 
                                   this.dayPhase === 'afternoon' ? 2.5 : 4;
    }

    // Spawn customers
    this.customerSpawnTimer += delta;
    if (this.customerSpawnTimer >= this.customerSpawnInterval && this.customers.length < 6) {
      this._spawnCustomer();
      this.customerSpawnTimer = 0;
    }

    // Update customer patience
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const customer = this.customers[i];
      customer.patience -= delta;

      if (customer.patience < 5) {
        customer.state = 'impatient';
        customer.tipMultiplier = 0.5;
      }

      if (customer.patience <= 0) {
        this.combo = 0;
        this.failedOrders++;
        this.customers.splice(i, 1);
      }
    }

    // Update coffee machines
    for (const machine of this.stations.machines) {
      if (machine.busy) {
        machine.progress += delta;
      }
    }

    // Idle players
    for (const player of this.players.values()) {
      player.state = 'idle';
    }
  }

  getState() {
    const playerData = [];
    for (const player of this.players.values()) {
      playerData.push({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        color: player.color,
        x: player.x,
        z: player.z,
        rotation: player.rotation,
        holding: player.holding,
        state: player.state,
        stats: player.stats,
      });
    }

    return {
      roomId: this.id,
      players: playerData,
      customers: this.customers.map(c => ({
        id: c.id,
        order: c.order,
        patience: c.patience,
        maxPatience: c.maxPatience,
        x: c.x,
        z: c.z,
        state: c.state,
      })),
      machines: this.stations.machines,
      ingredientStations: this.stations.ingredientStations,
      inventory: this.inventory,
      score: this.score,
      money: this.money,
      combo: this.combo,
      completedOrders: this.completedOrders,
      failedOrders: this.failedOrders,
      timeRemaining: this.timeRemaining,
      isRunning: this.isRunning,
      dayPhase: this.dayPhase,
    };
  }
}

module.exports = GameRoom;
