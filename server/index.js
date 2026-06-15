const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./GameRoom');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 1000,
  pingTimeout: 5000,
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Game state
const gameRooms = new Map(); // roomId -> GameRoom
const playerRoomMap = new Map(); // socketId -> roomId

// Game tick — 30 FPS authoritative server
const TICK_RATE = 30;
const TICK_MS = 1000 / TICK_RATE;

setInterval(() => {
  for (const [roomId, room] of gameRooms) {
    if (room.isRunning) {
      room.tick(1 / TICK_RATE);
      const state = room.getState();
      io.to(roomId).emit('game:tick', state);
    }
  }
}, TICK_MS);

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  socket.on('room:join', (data, callback) => {
    try {
      const { roomId, playerName, avatarIndex } = data;
      const cleanRoomId = (roomId || '').trim().toLowerCase() || 'default';
      const name = (playerName || '').trim() || `Barista_${Math.floor(Math.random() * 1000)}`;
      const avatar = avatarIndex || Math.floor(Math.random() * 8);

      // Leave any existing room
      leaveCurrentRoom(socket);

      // Get or create room
      let room = gameRooms.get(cleanRoomId);
      if (!room) {
        room = new GameRoom(cleanRoomId);
        gameRooms.set(cleanRoomId, room);
        console.log(`[+] Room created: ${cleanRoomId}`);
      }

      // Add player
      const player = room.addPlayer(socket.id, name, avatar);
      if (!player) {
        if (callback) callback({ error: 'Room is full' });
        return;
      }

      socket.join(cleanRoomId);
      playerRoomMap.set(socket.id, cleanRoomId);

      // Notify others
      socket.to(cleanRoomId).emit('player:joined', {
        id: socket.id,
        name: player.name,
        avatar: player.avatar,
        color: player.color,
      });

      console.log(`[+] ${name} joined room ${cleanRoomId}`);

      // Send full state to new player
      if (callback) {
        callback({
          success: true,
          playerId: socket.id,
          roomId: cleanRoomId,
          state: room.getState(),
        });
      }
    } catch (err) {
      console.error('Join error:', err);
      if (callback) callback({ error: 'Failed to join room' });
    }
  });

  socket.on('player:move', (data) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = gameRooms.get(roomId);
    if (!room) return;

    room.updatePlayerPosition(socket.id, data.x, data.z, data.rotation);
    socket.to(roomId).emit('player:moved', {
      id: socket.id, x: data.x, z: data.z, rotation: data.rotation,
    });
  });

  socket.on('player:interact', (data) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = gameRooms.get(roomId);
    if (!room) return;

    const result = room.handleInteraction(socket.id, data);
    if (result) {
      io.to(roomId).emit('interaction:result', result);
    }
  });

  socket.on('game:start', () => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = gameRooms.get(roomId);
    if (!room) return;

    room.startGame();
    io.to(roomId).emit('game:started', { timeLimit: room.timeLimit });
  });

  socket.on('player:chat', (data) => {
    const roomId = playerRoomMap.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit('chat:message', {
      id: socket.id,
      name: playerRoomMap.get(socket.id)
        ? gameRooms.get(roomId)?.getPlayer(socket.id)?.name
        : 'Unknown',
      message: data.message,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    leaveCurrentRoom(socket);
  });
});

function leaveCurrentRoom(socket) {
  const roomId = playerRoomMap.get(socket.id);
  if (!roomId) return;

  const room = gameRooms.get(roomId);
  if (room) {
    room.removePlayer(socket.id);
    socket.to(roomId).emit('player:left', { id: socket.id });

    // Clean up empty rooms after 5 minutes
    if (room.playerCount === 0) {
      setTimeout(() => {
        if (room.playerCount === 0) {
          gameRooms.delete(roomId);
          console.log(`[-] Room deleted: ${roomId}`);
        }
      }, 5 * 60 * 1000);
    }
  }

  socket.leave(roomId);
  playerRoomMap.delete(socket.id);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`☕ Professional Coffee Shop Game running on port ${PORT}`);
  console.log(`   Open http://localhost:${PORT}`);
});
