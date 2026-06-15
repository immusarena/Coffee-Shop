export class InputManager {
  constructor() {
    this.keys = {};
    this._setup();
  }

  _setup() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      if (this.onKeyDown) this.onKeyDown(key);
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  set onKeyDown(fn) { this._onKeyDown = fn; }

  getMovement() {
    let dx = 0, dz = 0;
    if (this.keys['w']) dz = -1;
    if (this.keys['s']) dz = 1;
    if (this.keys['a']) dx = -1;
    if (this.keys['d']) dx = 1;

    if (dx === 0 && dz === 0) return { x: 0, z: 0, rotation: 0 };

    const len = Math.sqrt(dx * dx + dz * dz);
    dx /= len;
    dz /= len;

    return {
      x: dx,
      z: dz,
      rotation: Math.atan2(dx, dz),
    };
  }
}
