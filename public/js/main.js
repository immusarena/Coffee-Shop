import * as THREE from 'three';
import { SceneSetup } from './SceneSetup.js';
import { WorldBuilder } from './WorldBuilder.js';
import { PlayerManager } from './PlayerManager.js';
import { CustomerManager } from './CustomerManager.js';
import { CoffeeMachine } from './CoffeeMachine.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { NetworkManager } from './NetworkManager.js';

class Game {
  constructor() {
    this.sceneSetup = new SceneSetup();
    this.world = new WorldBuilder(this.sceneSetup.scene);
    this.players = new PlayerManager(this.sceneSetup.scene);
    this.customers = new CustomerManager(this.sceneSetup.scene);
    this.machines = new CoffeeMachine(this.sceneSetup.scene);
    this.ui = new UIManager();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.network = new NetworkManager();

    this.playerId = null;
    this.myPlayer = null;
    this.isRunning = false;
    this.interactables = [];

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;

    this._init();
  }

  _init() {
    this.network.onConnect = (id) => {
      this.playerId = id;
    };

    this.network.onRoomJoined = (data) => {
      this.playerId = data.playerId;
      this.ui.showHUD(data.roomId);
      this.isRunning = true;

      // Spawn myself
      const myData = data.state.players.find(p => p.id === this.playerId);
      if (myData) {
        this.myPlayer = this.players.createPlayer(this.playerId, myData);
        this.ui.setPlayerName(myData.name);
      }

      // Spawn others
      data.state.players.forEach(p => {
        if (p.id !== this.playerId) {
          this.players.createPlayer(p.id, p);
        }
      });

      // Spawn customers
      data.state.customers.forEach(c => {
        this.customers.spawn(c);
      });

      // Build world interactables
      this.interactables = this.world.getInteractables();
    };

    this.network.onPlayerJoined = (data) => {
      if (data.id !== this.playerId) {
        this.players.createPlayer(data.id, data);
      }
    };

    this.network.onPlayerLeft = (data) => {
      this.players.removePlayer(data.id);
    };

    this.network.onPlayerMoved = (data) => {
      this.players.updatePosition(data.id, data.x, data.z, data.rotation);
    };

    this.network.onGameState = (state) => {
      if (!state) return;

      // Update customers
      this.customers.sync(state.customers);

      // Update machines
      this.machines.sync(state.machines);

      // Update UI
      this.ui.updateScore(state.score);
      this.ui.updateMoney(state.money);
      this.ui.updateTimer(state.timeRemaining);
      this.ui.updateInventory(state.inventory);
      this.ui.updateCombo(state.combo);
      this.ui.updatePhase(state.dayPhase);

      if (state.players) {
        state.players.forEach(p => {
          if (p.id !== this.playerId) {
            this.players.updatePosition(p.id, p.x, p.z, p.rotation);
            this.players.updateHolding(p.id, p.holding);
          } else if (this.myPlayer) {
            this.myPlayer.holding = p.holding;
            this.ui.updateHolding(p.holding);
          }
        });
      }

      // Game over
      if (!state.isRunning && state.completedOrders > 0) {
        this.ui.showGameOver(state);
      }
    };

    this.network.onInteractionResult = (result) => {
      this.audio.play('interact');
      if (result.type === 'serve') {
        this.audio.play('serve');
        this.ui.showCombo(result.combo);
      }
    };

    this.network.onGameStarted = () => {
      this.ui.hideStartOverlay();
      this.audio.play('start');
    };

    // Input handlers
    this.input.onKeyDown = (key) => {
      if (!this.isRunning) return;

      switch (key) {
        case 'e':
          this._interact();
          break;
        case 'f':
          this._serve();
          break;
        case 'q':
          this._drop();
          break;
        case 'r':
          this.network.emit('player:ready');
          break;
      }
    };

    // Movement loop
    setInterval(() => {
      if (!this.isRunning || !this.myPlayer) return;

      const move = this.input.getMovement();
      if (move.x !== 0 || move.z !== 0) {
        const speed = 0.06;
        let newX = this.myPlayer.x + move.x * speed;
        let newZ = this.myPlayer.z + move.z * speed;

        // World bounds
        newX = Math.max(-7.5, Math.min(7.5, newX));
        newZ = Math.max(-5.5, Math.min(5.5, newZ));

        this.myPlayer.x = newX;
        this.myPlayer.z = newZ;
        this.myPlayer.rotation = move.rotation;

        this.players.updatePosition(this.playerId, newX, newZ, move.rotation);
        this.network.emit('player:move', { x: newX, z: newZ, rotation: move.rotation });
      }
    }, 1000 / 60);

    // Render loop
    this._animate();

    // Setup DOM events
    this.ui.onJoinGame = (name, code, avatar) => {
      this.network.emit('room:join', {
        roomId: code,
        playerName: name,
        avatarIndex: avatar,
      }, (response) => {
        if (response.error) {
          this.ui.showError(response.error);
        }
      });
    };

    this.ui.onStartGame = () => {
      this.network.emit('game:start');
    };

    this.ui.onPlayAgain = () => {
      location.reload();
    };
  }

  _interact() {
    if (!this.myPlayer) return;

    // Check proximity to interactables
    const pos = new THREE.Vector3(this.myPlayer.x, 0, this.myPlayer.z);

    // Check machines
    for (const machine of this.world.machines) {
      const dist = pos.distanceTo(machine.position);
      if (dist < 1.8) {
        this.network.emit('player:interact', {
          action: 'use_machine',
          targetId: machine.userData.id,
        });
        return;
      }
    }

    // Check ingredient stations
    for (const station of this.world.ingredientStations) {
      const dist = pos.distanceTo(station.position);
      if (dist < 1.5) {
        this.network.emit('player:interact', {
          action: 'pickup_ingredient',
          targetId: station.userData.id,
        });
        return;
      }
    }

    // Check trash
    const trashPos = new THREE.Vector3(-5, 0, -3);
    if (pos.distanceTo(trashPos) < 1.5) {
      this.network.emit('player:interact', {
        action: 'trash',
      });
    }
  }

  _serve() {
    if (!this.myPlayer) return;
    this.network.emit('player:interact', { action: 'serve' });
  }

  _drop() {
    if (!this.myPlayer) return;
    this.network.emit('player:interact', { action: 'trash' });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    // Follow camera
    if (this.myPlayer) {
      const target = new THREE.Vector3(
        this.myPlayer.x,
        4.5,
        this.myPlayer.z + 5
      );
      this.sceneSetup.camera.position.lerp(target, 0.08);
      this.sceneSetup.camera.lookAt(this.myPlayer.x, 0, this.myPlayer.z);
    }

    // Update machine animations
    this.machines.update();

    // Update customer animations
    this.customers.update();

    // Update player animations
    this.players.update();

    this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
  }
}

// Start when ready
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
