import * as THREE from 'three';

export class CoffeeMachine {
  constructor(scene) {
    this.scene = scene;
    this.machines = new Map();
  }

  sync(machines) {
    machines.forEach(m => {
      this.machines.set(m.id, m);
    });
  }

  update() {
    this.machines.forEach(m => {
      // Find the indicator light objects and update them
      // This is handled by the main loop reading from this state
    });
  }
}
