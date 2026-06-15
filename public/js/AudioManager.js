export class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._generateSounds();
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  _generateSounds() {
    this.sounds.interact = this._createTone(440, 0.08, 'sine', 0.3);
    this.sounds.serve = this._createTone(660, 0.15, 'sine', 0.3);
    this.sounds.start = this._createTone(523, 0.1, 'sine', 0.2, [
      { freq: 659, time: 0.1 }, { freq: 784, time: 0.2 },
    ]);
  }

  _createTone(baseFreq, duration, type, volume, harmonics) {
    return { baseFreq, duration, type, volume, harmonics };
  }

  play(name) {
    if (!this.ctx || !this.sounds[name]) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const s = this.sounds[name];
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(s.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + s.duration);

    const osc = this.ctx.createOscillator();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.baseFreq, this.ctx.currentTime);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + s.duration);

    if (s.harmonics) {
      s.harmonics.forEach(h => {
        const g2 = this.ctx.createGain();
        g2.connect(this.ctx.destination);
        g2.gain.setValueAtTime(s.volume * 0.5, this.ctx.currentTime + h.time);
        g2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + h.time + s.duration);
        const o2 = this.ctx.createOscillator();
        o2.type = s.type;
        o2.frequency.setValueAtTime(h.freq, this.ctx.currentTime + h.time);
        o2.connect(g2);
        o2.start(this.ctx.currentTime + h.time);
        o2.stop(this.ctx.currentTime + h.time + s.duration);
      });
    }
  }
}
