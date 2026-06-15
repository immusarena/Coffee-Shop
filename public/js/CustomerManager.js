import * as THREE from 'three';

export class CustomerManager {
  constructor(scene) {
    this.scene = scene;
    this.customers = new Map();
  }

  spawn(data) {
    if (this.customers.has(data.id)) return;

    const group = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: this._randomColor() });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8), bodyMat);
    body.position.y = 0.25;
    group.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDAB9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headMat);
    head.position.y = 0.6;
    group.add(head);

    // Order bubble
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(0, 0, 128, 64, 10); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data.order?.icon || '☕', 64, 24);
    ctx.font = '12px Inter, Arial';
    ctx.fillText(data.order?.name || 'Order', 64, 50);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.scale.set(0.6, 0.3, 1);
    sprite.position.y = 1.1;
    group.add(sprite);

    // Patience bar
    const bgBar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    bgBar.position.y = 0.95;
    group.add(bgBar);
    const fillBar = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.03), new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
    fillBar.position.set(0, 0.95, -0.001);
    group.add(fillBar);

    group.position.set(data.x || 0, 0, data.z || 0);
    this.scene.add(group);

    this.customers.set(data.id, { group, fillBar, sprite, data });
  }

  sync(customers) {
    const ids = new Set(customers.map(c => c.id));
    // Remove stale
    this.customers.forEach((_, id) => {
      if (!ids.has(id)) this.remove(id);
    });
    // Update/Add
    customers.forEach(c => {
      if (!this.customers.has(c.id)) {
        this.spawn(c);
      } else {
        const entry = this.customers.get(c.id);
        entry.group.position.set(c.x, 0, c.z);
        entry.data = c;
        const ratio = Math.max(0, c.patience / c.maxPatience);
        entry.fillBar.scale.x = ratio;
        entry.fillBar.material.color.setHex(
          ratio > 0.5 ? 0x00FF00 : ratio > 0.25 ? 0xFFAA00 : 0xFF0000
        );
      }
    });
  }

  remove(id) {
    const entry = this.customers.get(id);
    if (entry) {
      this.scene.remove(entry.group);
      this.customers.delete(id);
    }
  }

  update() {
    this.customers.forEach(entry => {
      entry.group.position.y = Math.sin(Date.now() * 0.0015 + entry.data.id.length) * 0.02;
    });
  }

  _randomColor() {
    const colors = [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA, 0x00ACC1];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
