// ===== SETUP =====
const socket = io();

// DOM refs
const lobby = document.getElementById('lobby');
const joinBtn = document.getElementById('joinBtn');
const roomCode = document.getElementById('roomCode');
const playerName = document.getElementById('playerName');
const lobbyStatus = document.getElementById('lobby-status');
const hud = document.getElementById('hud');
const roomDisplay = document.getElementById('roomDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const beansCount = document.getElementById('beansCount');
const milkCount = document.getElementById('milkCount');
const sugarCount = document.getElementById('sugarCount');
const cupsCount = document.getElementById('cupsCount');
const customerCount = document.getElementById('customerCount');

// ===== THREE.JS SETUP =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 40);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// ===== GAME WORLD =====
const worldObjects = {};

function buildShop() {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor checkered tiles
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.7 });
  for (let i = 0; i < 16; i += 2) {
    for (let j = 0; j < 12; j += 2) {
      if ((i + j) % 4 === 0) continue;
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(i - 7, 0.01, j - 5);
      scene.add(tile);
    }
  }

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
  const wallPositions = [
    { x: 0, z: -6, rx: 0, w: 16, h: 3.5 },
    { x: 0, z: 6, rx: 0, w: 16, h: 3.5 },
    { x: -8, z: 0, rx: Math.PI / 2, w: 12, h: 3.5 },
    { x: 8, z: 0, rx: Math.PI / 2, w: 12, h: 3.5 },
  ];
  wallPositions.forEach(w => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.h), wallMat);
    wall.position.set(w.x, 1.75, w.z);
    wall.rotation.y = w.rx;
    scene.add(wall);
  });

  // Counter
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 1), counterMat);
  counter.position.set(5, 0.4, 5);
  counter.castShadow = true;
  scene.add(counter);
  worldObjects.counter = counter;

  // Coffee machines on counter
  const machineMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.5 });

  for (let i = 0; i < 2; i++) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), machineMat);
    base.position.set(4 + i * 2, 0.9, 5);
    base.castShadow = true;
    scene.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), metalMat);
    top.position.set(4 + i * 2, 1.4, 5);
    top.castShadow = true;
    scene.add(top);

    const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.08), 
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    indicator.position.set(4 + i * 2, 1.7, 5);
    scene.add(indicator);

    worldObjects[`machine_${i}`] = { base, top, indicator, id: `machine${i + 1}` };
  }

  // Tables & chairs
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  for (let i = 0; i < 3; i++) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6), tableMat);
    table.position.set(0 + i * 2.5 - 2, 0.3, -2 + (i % 2) * 2);
    table.castShadow = true;
    scene.add(table);
  }

  // Beans shelf
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0xA0522D });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.8), shelfMat);
  shelf.position.set(-6, 1.5, 3);
  scene.add(shelf);

  // Bean bags on shelf
  const beanMat = new THREE.MeshStandardMaterial({ color: 0x4A3728 });
  for (let i = 0; i < 3; i++) {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), beanMat);
    bag.position.set(-6 + i * 0.5 - 0.5, 1.8, 3);
    scene.add(bag);
  }
}

// ===== PLAYERS =====
const players = {};

function createPlayerMesh(id, color, name) {
  const group = new THREE.Group();

  // Body
  const bodyMat = new THREE.MeshStandardMaterial({ color: color });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8), bodyMat);
  body.position.y = 0.4;
  body.castShadow = true;
  group.add(body);

  // Head
  const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDBB4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), headMat);
  head.position.y = 0.9;
  head.castShadow = true;
  group.add(head);

  // Name tag
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.2, 0.3, 1);
  sprite.position.y = 1.4;
  group.add(sprite);

  // Carrying indicator
  const carryMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const carry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), carryMat);
  carry.position.y = 0.8;
  carry.position.z = 0.3;
  carry.visible = false;
  group.add(carry);

  group.position.set(0, 0, 0);
  scene.add(group);

  players[id] = { group, bodyMat, carry };
}

function removePlayerMesh(id) {
  if (players[id]) {
    scene.remove(players[id].group);
    delete players[id];
  }
}

function updatePlayerMesh(id, data) {
  const p = players[id];
  if (!p) return;
  p.group.position.set(data.x || 0, 0, data.z || 0);
  p.group.rotation.y = data.rotation || 0;
  p.carry.visible = !!data.carrying;
}

// ===== CUSTOMERS =====
const customers = {};

function spawnCustomerMesh(customer) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6),
    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
  );
  body.position.y = 0.3;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15),
    new THREE.MeshStandardMaterial({ color: 0xFFDBB4 })
  );
  head.position.y = 0.7;
  group.add(head);

  // Order bubble
  const orderMat = new THREE.SpriteMaterial({
    map: createTextTexture(customer.order, '#fff', '#333'),
  });
  const orderSprite = new THREE.Sprite(orderMat);
  orderSprite.scale.set(0.8, 0.3, 1);
  orderSprite.position.y = 1.2;
  group.add(orderSprite);

  // Patience bar background
  const bgBar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  );
  bgBar.position.y = 1.05;
  group.add(bgBar);

  // Patience bar fill
  const fillBar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  fillBar.position.y = 1.05;
  fillBar.position.z = -0.01;
  group.add(fillBar);

  group.position.set(customer.x, 0, customer.z);
  scene.add(group);

  customers[customer.id] = { group, orderSprite, fillBar };
}

function updateCustomerMesh(id, data) {
  const c = customers[id];
  if (!c) {
    spawnCustomerMesh(data);
    return;
  }
  c.group.position.set(data.x, 0, data.z);
  // Update patience bar
  const ratio = Math.max(0, data.patience / 30);
  c.fillBar.scale.x = ratio;
  c.fillBar.material.color.setHex(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000);
}

function removeCustomerMesh(id) {
  if (customers[id]) {
    scene.remove(customers[id].group);
    delete customers[id];
  }
}

function createTextTexture(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  return new THREE.CanvasTexture(canvas);
}

// ===== INPUT =====
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ===== GAME STATE =====
let myId = null;
let myRoom = null;
let isInGame = false;
let sendMoveInterval = null;

// ===== JOIN LOBBY =====
joinBtn.addEventListener('click', () => {
  const name = playerName.value || 'Barista';
  const room = roomCode.value || 'room123';
  lobbyStatus.textContent = 'Connecting...';
  
  socket.emit('joinRoom', {
    roomId: room,
    playerName: name,
  });
});

// ===== SOCKET EVENTS =====
socket.on('roomJoined', (data) => {
  myId = data.playerId;
  myRoom = data.roomId;
  roomDisplay.textContent = data.roomId;

  lobby.style.display = 'none';
  hud.style.display = 'flex';
  isInGame = true;

  // Start movement loop
  if (sendMoveInterval) clearInterval(sendMoveInterval);
  sendMoveInterval = setInterval(() => {
    if (!isInGame || !myId) return;
    let dx = 0, dz = 0;
    if (keys['w']) dz = -1;
    if (keys['s']) dz = 1;
    if (keys['a']) dx = -1;
    if (keys['d']) dx = 1;

    if (dx !== 0 || dz !== 0) {
      // Normalize
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
      const speed = 0.08;
      const current = players[myId]?.group.position;
      if (!current) return;

      let newX = current.x + dx * speed;
      let newZ = current.z + dz * speed;
      // Clamp to shop bounds
      newX = Math.max(-7, Math.min(7, newX));
      newZ = Math.max(-5, Math.min(5, newZ));

      const rotation = Math.atan2(dx, dz);
      players[myId].group.position.set(newX, 0, newZ);
      players[myId].group.rotation.y = rotation;

      socket.emit('playerMove', { x: newX, z: newZ, rotation });
    }
  }, 50);

  // Build world if not built
  if (Object.keys(worldObjects).length === 0) {
    buildShop();
  }

  // Populate existing players
  if (data.state && data.state.players) {
    data.state.players.forEach(p => {
      if (p.id !== myId) {
        createPlayerMesh(p.id, p.color, p.name);
        updatePlayerMesh(p.id, p);
      }
    });
  }

  // Spawn self
  if (data.state) {
    const me = data.state.players.find(p => p.id === myId);
    if (me) {
      createPlayerMesh(myId, me.color, me.name);
      updatePlayerMesh(myId, me);
    }
  }

  // Spawn customers
  if (data.state && data.state.customerQueue) {
    data.state.customerQueue.forEach(c => spawnCustomerMesh(c));
  }
});

socket.on('playerJoined', (data) => {
  if (data.playerId !== myId) {
    createPlayerMesh(data.playerId, data.player.color, data.player.name);
  }
});

socket.on('playerLeft', (data) => {
  removePlayerMesh(data.playerId);
});

socket.on('playerMoved', (data) => {
  updatePlayerMesh(data.playerId, data);
});

socket.on('gameState', (state) => {
  if (!state) return;

  // Update score
  scoreDisplay.textContent = state.score;
  beansCount.textContent = state.ingredients?.beans || 0;
  milkCount.textContent = state.ingredients?.milk || 0;
  sugarCount.textContent = state.ingredients?.sugar || 0;
  cupsCount.textContent = state.ingredients?.cups || 0;
  customerCount.textContent = state.customerQueue?.length || 0;

  // Update other players
  state.players?.forEach(p => {
    if (p.id !== myId) {
      if (!players[p.id]) {
        createPlayerMesh(p.id, p.color, p.name);
      }
      updatePlayerMesh(p.id, p);
    }
  });

  // Update coffee machine indicators
  state.coffeeMachines?.forEach(m => {
    const obj = worldObjects[`machine_${parseInt(m.id.slice(-1)) - 1}`];
    if (obj) {
      obj.indicator.material.color.setHex(m.busy ? 0xff0000 : 0x00ff00);
    }
  });

  // Update customers
  const currentCustomerIds = new Set(state.customerQueue?.map(c => c.id) || []);
  Object.keys(customers).forEach(id => {
    if (!currentCustomerIds.has(id)) {
      removeCustomerMesh(id);
    }
  });
  state.customerQueue?.forEach(c => {
    updateCustomerMesh(c.id, c);
  });
});

socket.on('machineStarted', (data) => {
  // Visual feedback
  const idx = parseInt(data.machineId.slice(-1)) - 1;
  const obj = worldObjects[`machine_${idx}`];
  if (obj) {
    obj.indicator.material.color.setHex(0xff0000);
  }
});

// ===== INTERACT =====
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'e' && isInGame) {
    // Interact: check proximity to machines
    const myPos = players[myId]?.group.position;
    if (!myPos) return;
    
    for (let i = 0; i < 2; i++) {
      const mPos = new THREE.Vector3(4 + i * 2, 0, 5);
      const dist = myPos.distanceTo(mPos);
      if (dist < 1.5) {
        socket.emit('playerAction', {
          action: 'startCoffee',
          data: { machineId: `machine${i + 1}` },
        });
        break;
      }
    }
  }

  if (key === 'f' && isInGame) {
    // Serve: check proximity to customers
    const myPos = players[myId]?.group.position;
    if (!myPos) return;
    
    // For simplicity, serve a random order type
    // In a full game you'd check what the player is carrying
    socket.emit('playerAction', {
      action: 'serve',
      data: { coffeeType: 'Espresso' },
    });
  }
});

// ===== RENDER LOOP ====
function animate() {
  requestAnimationFrame(animate);

  // Camera follows player
  if (players[myId]) {
    const pos = players[myId].group.position;
    camera.position.lerp(new THREE.Vector3(pos.x, 5, pos.z + 6), 0.1);
    camera.lookAt(pos.x, 0, pos.z);
  }

  renderer.render(scene, camera);
}
animate();

// ===== RESIZE =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
