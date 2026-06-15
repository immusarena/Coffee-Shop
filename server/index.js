const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const GameState = require('./gameState');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.static('public'));

const gameState = new GameState();

// Game tick loop — 20 ticks per second
const TICK_RATE = 20;
const TICK_INTERVAL = 1000 / TICK_RATE;

setInterval(() => {
  gameState.tick(1 / TICK_RATE);

  // Broadcast state to all rooms
  for (const [roomId, room] of gameState.rooms) {
    const serialized = gameState.getSerializedState(roomId);
    if (serialized) {
      io.to(roomId).emit('gameState', serialized);
    }
  }
}, TICK_INTERVAL);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  let currentRoom = null;
  let currentPlayerId = null;

  // Join/create room
  socket.on('joinRoom', ({ roomId, playerName }) => {
    // Leave previous room
    if (currentRoom) {
      gameState.removePlayer(currentRoom, currentPlayerId);
      socket.leave(currentRoom);
      io.to(currentRoom).emit('playerLeft', { playerId: currentPlayerId });
    }

    // Ensure room exists
    if (!gameState.getRoom(roomId)) {
      gameState.createRoom(roomId);
    }

    currentRoom = roomId;
    currentPlayerId = socket.id;

    socket.join(roomId);

    const player = gameState.addPlayer(roomId, socket.id, playerName || 'Barista');
    if (!player) {
      socket.emit('error', 'Could not join room');
      return;
    }

    console.log(`${player.name} joined room ${roomId}`);

    // Notify everyone
    io.to(roomId).emit('playerJoined', {
      playerId: socket.id,
      player: { id: player.id, name: player.name, color: player.color },
    });

    // Send current state
    socket.emit('roomJoined', {
      roomId,
      playerId: socket.id,
      state: gameState.getSerializedState(roomId),
    });
  });

  // Player movement
  socket.on('playerMove', ({ x, z, rotation }) => {
    if (currentRoom) {
      gameState.updatePlayerPosition(currentRoom, socket.id, x, z, rotation);
      socket.to(currentRoom).emit('playerMoved', {
        playerId: socket.id, x, z, rotation,
      });
    }
  });

  // Player action — interact with object
  socket.on('playerAction', ({ action, data }) => {
    if (!currentRoom) return;

    switch (action) {
      case 'startCoffee':
        // Start coffee machine
        const room = gameState.getRoom(currentRoom);
        const machine = room?.coffeeMachines.find(m => m.id === data.machineId);
        if (machine && !machine.busy) {
          machine.busy = true;
          machine.progress = 0;
          io.to(currentRoom).emit('machineStarted', { machineId: data.machineId, playerId: socket.id });
        }
        break;

      case 'serve':
        const served = gameState.serveOrder(currentRoom, socket.id, data.coffeeType);
        if (served) {
          io.to(currentRoom).emit('orderServed', { playerId: socket.id, coffeeType: data.coffeeType });
        }
        break;

      case 'pickup':
        socket.to(currentRoom).emit('playerPickedUp', {
          playerId: socket.id, item: data.item,
        });
        break;

      case 'drop':
        socket.to(currentRoom).emit('playerDropped', {
          playerId: socket.id, item: data.item,
        });
        break;
    }
  });

  // Start game
  socket.on('startGame', () => {
    if (currentRoom) {
      const started = gameState.startGame(currentRoom);
      if (started) {
        io.to(currentRoom).emit('gameStarted');
      }
    }
  });

  // Player ready toggle
  socket.on('toggleReady', () => {
    if (currentRoom) {
      const room = gameState.getRoom(currentRoom);
      const player = room?.players.get(socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(currentRoom).emit('playerReady', {
          playerId: socket.id, isReady: player.isReady,
        });
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoom) {
      gameState.removePlayer(currentRoom, socket.id);
      io.to(currentRoom).emit('playerLeft', { playerId: socket.id });
      socket.leave(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Coffee Shop Game server running on port ${PORT}`);
});
