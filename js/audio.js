// Retro 8-bit Web Audio API Synthesizer (SFX + Chiptune BGM)
(function () {
  "use strict";

  class RetroAudio {
    constructor() {
      this.ctx = null;
      this.sfxEnabled = true;
      this.musicEnabled = true;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.currentTheme = 0;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    playTone(freq, duration, type = "square", volume = 0.12, slideTo = null, delay = 0) {
      if (!this.sfxEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    playNoise(duration = 0.15, volume = 0.14) {
      if (!this.sfxEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    }

    jump() {
      this.playTone(230, 0.16, "square", 0.1, 620);
    }

    laser(upgraded = false) {
      if (upgraded) {
        this.playTone(980, 0.11, "sawtooth", 0.09, 240);
        this.playTone(1320, 0.08, "square", 0.06, 440, 0.02);
      } else {
        this.playTone(840, 0.1, "square", 0.09, 220);
      }
    }

    star() {
      this.playTone(987.77, 0.07, "square", 0.09);
      this.playTone(1318.51, 0.14, "square", 0.09, null, 0.06);
    }

    bump() {
      this.playTone(140, 0.09, "triangle", 0.14, 75);
    }

    powerup() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, i) => {
        this.playTone(n, 0.09, "square", 0.09, null, i * 0.055);
      });
    }

    bark() {
      // Cute 8-bit schnauzer "Arf! Arf!"
      this.playTone(340, 0.06, "sawtooth", 0.08, 520);
      this.playTone(380, 0.07, "sawtooth", 0.08, 220, 0.09);
    }

    hitEnemy() {
      this.playTone(320, 0.07, "square", 0.1, 140);
    }

    explode() {
      this.playNoise(0.22, 0.16);
      this.playTone(170, 0.18, "sawtooth", 0.1, 45);
    }

    hurt() {
      this.playTone(310, 0.12, "sawtooth", 0.14, 110);
      this.playTone(210, 0.2, "square", 0.12, 70, 0.08);
    }

    levelClear() {
      const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      const times = [0, 0.1, 0.2, 0.3, 0.45, 0.57, 0.72];
      melody.forEach((n, i) => {
        this.playTone(n, i === melody.length - 1 ? 0.35 : 0.11, "square", 0.1, null, times[i]);
      });
    }

    gameOver() {
      const melody = [493.88, 440, 392, 349.23, 293.66];
      melody.forEach((n, i) => {
        this.playTone(n, i === melody.length - 1 ? 0.42 : 0.16, "triangle", 0.14, null, i * 0.16);
      });
    }

    // Simple 8-bit chiptune loop per planet
    startMusic(themeIndex = 0) {
      this.currentTheme = themeIndex;
      this.stopMusic();
      if (!this.musicEnabled) return;
      this.ensureContext();

      // Catchy NES-style arpeggio + bassline patterns (in Hz, 0 = rest)
      const patterns = [
        // Planet 1: Crater Moon (bright heroic C major / A minor)
        {
          tempoMs: 165,
          lead: [523, 659, 784, 659, 880, 784, 659, 523, 587, 698, 880, 698, 784, 659, 587, 494],
          bass: [131, 0, 196, 0, 110, 0, 165, 0, 147, 0, 220, 0, 196, 0, 147, 0]
        },
        // Planet 2: Crimson Mars (driving D minor space adventure)
        {
          tempoMs: 150,
          lead: [587, 0, 698, 880, 784, 698, 659, 587, 523, 659, 784, 659, 698, 587, 523, 440],
          bass: [147, 147, 220, 0, 131, 131, 196, 0, 117, 117, 175, 0, 131, 0, 110, 0]
        },
        // Planet 3: Crystal Nebula (mysterious cosmic E minor)
        {
          tempoMs: 142,
          lead: [659, 784, 988, 784, 880, 784, 659, 587, 659, 880, 988, 1175, 988, 880, 784, 659],
          bass: [165, 0, 247, 0, 147, 0, 220, 0, 131, 0, 196, 0, 147, 165, 196, 247]
        }
      ];

      const pat = patterns[themeIndex % patterns.length];
      this.bgmStep = 0;

      this.bgmTimer = window.setInterval(() => {
        if (!this.musicEnabled || !this.ctx || this.ctx.state !== "running") return;
        const step = this.bgmStep % pat.lead.length;
        const leadNote = pat.lead[step];
        const bassNote = pat.bass[step];

        if (leadNote > 0) {
          this.playMusicNote(leadNote, 0.11, "square", 0.032);
        }
        if (bassNote > 0) {
          this.playMusicNote(bassNote, 0.13, "triangle", 0.048);
        }
        this.bgmStep++;
      }, pat.tempoMs);
    }

    playMusicNote(freq, duration, type, volume) {
      const ctx = this.ctx;
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    stopMusic() {
      if (this.bgmTimer !== null) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  window.RetroAudio = new RetroAudio();
})();
