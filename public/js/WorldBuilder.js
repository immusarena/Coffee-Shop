import * as THREE from 'three';

export class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
    this.machines = [];
    this.ingredientStations = [];
    this._build();
  }

  _build() {
    this._createFloor();
    this._createWalls();
    this._createCounter();
    this._createCoffeeMachines();
    this._createIngredientStations();
    this._createTables();
    this._createDecoration();
    this._createTrash();
    this._createCeilingLights();
  }

  _createFloor() {
    const geo = new THREE.PlaneGeometry(18, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Tile pattern
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x9B8365,
      roughness: 0.8,
      metalness: 0.0,
    });
    for (let x = -8; x < 8; x += 2) {
      for (let z = -6; z < 6; z += 2) {
        if ((Math.floor(x) + Math.floor(z)) % 4 === 0) {
          const tile = new THREE.Mesh(
            new THREE.PlaneGeometry(1.85, 1.85),
            tileMat
          );
          tile.rotation.x = -Math.PI / 2;
          tile.position.set(x + 0.5, 0.02, z + 0.5);
          this.scene.add(tile);
        }
      }
    }
  }

  _createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xF5DEB3,
      roughness: 0.8,
    });

    const wallData = [
      { x: 0, z: -7, w: 18, h: 4, ry: 0 },
      { x: 0, z: 7, w: 18, h: 4, ry: 0 },
      { x: -9, z: 0, w: 14, h: 4, ry: Math.PI / 2 },
      { x: 9, z: 0, w: 14, h: 4, ry: Math.PI / 2 },
    ];

    wallData.forEach(w => {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(w.w, w.h),
        wallMat
      );
      wall.position.set(w.x, 2, w.z);
      wall.rotation.y = w.ry;
      this.scene.add(wall);
    });

    // Wall trim (bottom)
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41 });
    wallData.forEach(w => {
      const trim = new THREE.Mesh(
        new THREE.PlaneGeometry(w.w, 0.15),
        trimMat
      );
      trim.position.set(w.x, 0.075, w.z);
      trim.rotation.y = w.ry;
      trim.position.y = 0.075;
      this.scene.add(trim);
    });
  }

  _createCounter() {
    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.6,
      metalness: 0.2,
    });

    // Main L-shaped counter
    const counter1 = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.7, 0.9),
      counterMat
    );
    counter1.position.set(4.5, 0.35, 5);
    counter1.castShadow = true;
    counter1.receiveShadow = true;
    this.scene.add(counter1);

    const counter2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.7, 2.5),
      counterMat
    );
    counter2.position.set(7, 0.35, 3.5);
    counter2.castShadow = true;
    counter2.receiveShadow = true;
    this.scene.add(counter2);

    // Counter top
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      roughness: 0.3,
      metalness: 0.1,
    });
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.08, 1.1),
      topMat
    );
    top.position.set(4.5, 0.74, 5);
    this.scene.add(top);

    const top2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 2.7),
      topMat
    );
    top2.position.set(7, 0.74, 3.5);
    this.scene.add(top2);

    // Counter front panel
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0x4E342E,
      roughness: 0.7,
    });
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 0.6),
      frontMat
    );
    front.position.set(4.5, 0.35, 5.46);
    this.scene.add(front);
  }

  _createCoffeeMachines() {
    const machinePositions = [
      { x: 3.5, z: 4.5, id: 'machine_0' },
      { x: 5.5, z: 4.5, id: 'machine_1' },
    ];

    machinePositions.forEach((pos, i) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0.74, pos.z);

      // Base body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x2C2C2C : 0x333333,
        roughness: 0.3,
        metalness: 0.6,
      });
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.7),
        bodyMat
      );
      body.position.y = 0.25;
      body.castShadow = true;
      group.add(body);

      // Top dome
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        roughness: 0.2,
        metalness: 0.8,
      });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
      );
      dome.position.y = 0.55;
      dome.scale.x = 1.2;
      dome.scale.z = 1.2;
      group.add(dome);

      // Dispenser spout
      const spoutMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.2,
      });
      const spout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.1, 6),
        spoutMat
      );
      spout.position.set(0, 0.1, 0.35);
      group.add(spout);

      // Status indicator light
      const indicatorMat = new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.5,
      });
      const indicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        indicatorMat
      );
      indicator.position.set(0.3, 0.45, 0.3);
      group.add(indicator);

      // Button
      const btnMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.4,
      });
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12),
        btnMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.35, 0.35);
      group.add(btn);

      // Steam vent (decorative bars)
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
      for (let v = 0; v < 3; v++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.01, 0.01),
          ventMat
        );
        bar.position.set(-0.15 + v * 0.15, 0.5, 0);
        group.add(bar);
      }

      // User data for interaction
      group.userData = { id: pos.id, type: 'machine' };

      this.scene.add(group);
      this.machines.push(group);
    });
  }

  _createIngredientStations() {
    const stations = [
      { x: -4.5, z: 4, id: 'beans', label: '🫘 Beans', color: 0x3E2723 },
      { x: -4.5, z: 3, id: 'milk', label: '🥛 Milk', color: 0xECEFF1 },
      { x: -4.5, z: 2, id: 'sugar', label: '🍬 Sugar', color: 0xFFFFFF },
    ];

    stations.forEach(s => {
      const group = new THREE.Group();
      group.position.set(s.x, 0, s.z);

      // Shelf
      const shelfMat = new THREE.MeshStandardMaterial({
        color: 0x6D4C41,
        roughness: 0.7,
      });
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.08, 0.6),
        shelfMat
      );
      shelf.position.y = 0.7;
      shelf.castShadow = true;
      group.add(shelf);

      // Container
      const containerMat = new THREE.MeshStandardMaterial({
        color: s.color,
        roughness: 0.4,
      });
      const container = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.18, 0.25, 16),
        containerMat
      );
      container.position.y = 0.85;
      container.castShadow = true;
      group.add(container);

      // Lid
      const lidMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.7,
        roughness: 0.3,
      });
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16),
        lidMat
      );
      lid.position.y = 0.98;
      group.add(lid);

      // Label sprite
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 128, 48);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, 64, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.6, 0.25, 1);
      sprite.position.y = 1.1;
      group.add(sprite);

      // User data
      group.userData = { id: s.id, type: 'ing
