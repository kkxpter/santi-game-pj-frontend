// app/utils/sound.ts
'use client';

class SoundSystem {
  ctx: AudioContext | null = null;

  init() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        // ✅ แก้ไข: บอก Type ให้ชัดเจนแทนการใช้ any
        // เราบอกว่า window อาจจะมี webkitAudioContext ที่เป็น Class เหมือน AudioContext
        const AudioContextClass = window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  play(freq: number, type: OscillatorType) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  }
}

export const SoundSys = new SoundSystem();