// app/lib/sound.ts

export const playSound = (type: 'click' | 'correct' | 'wrong' | 'smash' | 'hit') => {
  // 1. ป้องกันการรันบน Server (Next.js SSR)
  if (typeof window === 'undefined') return;

  try {
    // 2. จัดการเรื่อง Type ของ AudioContext (รองรับ Safari/Webkit และ Chrome)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    // 3. สร้าง Context
    const ctx = new AudioContextClass();
    
    // 4. สร้างตัวกำเนิดเสียง (Oscillator) และตัวคุมความดัง (Gain)
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const masterVolume = 0.3; // ปรับความดังมาตรฐาน (0.0 - 1.0)

    // ตั้งค่าความดังเริ่มต้น
    g.gain.setValueAtTime(masterVolume, ctx.currentTime);

    // เชื่อมต่อ: Oscillator -> Gain -> Speaker
    o.connect(g);
    g.connect(ctx.destination);

    // --- เริ่มแยกเสียงตาม Type ---
    if (type === 'click') {
      // เสียงคลิก: สั้นๆ ความถี่กลางๆ
      o.type = 'sine';
      o.frequency.setValueAtTime(800, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      o.start();
      o.stop(ctx.currentTime + 0.1);

    } else if (type === 'correct') {
      // เสียงถูก: ปิ๊ง-ปิ๊ง (2 จังหวะ)
      o.type = 'sine';
      o.frequency.setValueAtTime(1200, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      o.start();
      o.stop(ctx.currentTime + 0.1);

      // จังหวะที่ 2 (High pitch)
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(1800, ctx.currentTime);
        g2.gain.setValueAtTime(masterVolume, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.start();
        o2.stop(ctx.currentTime + 0.2);
      }, 100);

    } else if (type === 'wrong' || type === 'hit') {
      // เสียงผิด/โดนชน: เสียงต่ำ แตกๆ (Sawtooth)
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, ctx.currentTime);
      // ทำให้เสียงค่อยๆ ลดลงแบบหางเสียงยาวนิดนึง
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o.start();
      o.stop(ctx.currentTime + 0.3);

    } else if (type === 'smash') {
      // เสียงทุบ: เสียงเหลี่ยม (Square) หนักแน่น
      o.type = 'square';
      o.frequency.setValueAtTime(400, ctx.currentTime);
      // ลดเสียงลงอย่างรวดเร็ว (Impact)
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    }

  } catch (e) {
    console.error("Audio Error:", e);
  }
};