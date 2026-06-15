import * as THREE from 'three';

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
  }

  createPlayer(id, data) {
    if (this.players.has(id)) return;

    const group = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: data.color || 0x4285F4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8), bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDAB9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), headMat);
    head.position.y = 0.78;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.position.y = 0.85;
    group.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    [-0.07, 0.07].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(x, 0.78, 0.15);
      group.add(eye);
    });

    // Name tag
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(0, 0, 256, 64, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data.name || 'Barista', 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.scale.set(1.0, 0.25, 1);
    sprite.position.y = 1.3;
    group.add(sprite);

    // Holding indicator
    const holdMat = new THREE.MeshStandardMaterial({ color: 0x00FF00 });
    const hold = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), holdMat);
    hold.position.set(0, 0.7, 0.3);
    hold.visible = false;
    group.add(hold);

    group.position.set(data.x || 0, 0, data.z || 0);
    group.rotation.y = data.rotation || 0;
    this.scene.add(group);

    this.players.set(id, { group, bodyMat, hold, name: data.name, x: data.x, z: data.z, holding: null });
    return this.players.get(id);
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) {
      this.scene.remove(p.group);
      this.players.delete(id);
    }
  }

  updatePosition(id, x, z, rotation) {
    const p = this.players.get(id);
    if (!p) return;
    p.group.position.set(x, 0, z);
    p.group.rotation.y = rotation;
    p.x = x; p.z = z;
  }

  updateHolding(id, item) {
    const p = this.players.get(id);
    if (!p) return;
    p.hold.visible = !!item;
    p.hold.material.color.setHex(item ? 0xFFD700 : 0x00FF00);
    p.holding = item;
  }

  update() {
    // Idle bob animation
    this.players.forEach(p => {
      p.group.position.y = Math.sin(Date.now() * 0.002) * 0.01;
    });
  }
}
