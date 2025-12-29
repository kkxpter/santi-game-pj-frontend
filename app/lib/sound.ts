export const playSound = (type: 'click' | 'correct' | 'wrong' | 'smash' | 'hit') => {
    if (typeof window === 'undefined') return;
    try {
        // ✅ แก้ไข 1: เปลี่ยนชื่อตัวแปรจาก AudioContext เป็น AudioContextClass
        // เพื่อไม่ให้ซ้ำกับ Global Type ด้านขวา (typeof AudioContext)
        const AudioContextClass = window.AudioContext || 
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        
        if (!AudioContextClass) return;
        
        // ✅ แก้ไข 2: ใช้ชื่อใหม่ตอนสร้าง instance
        const ctx = new AudioContextClass();
        
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const masterVolume = 0.5;

        // ... (โค้ดส่วนที่เหลือเหมือนเดิม) ...
        g.gain.setValueAtTime(masterVolume, ctx.currentTime);
        
        if (type === 'click') {
            o.type = 'sine'; o.frequency.value = 800;
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.1);
        } else if (type === 'correct') {
            o.type = 'sine'; o.frequency.value = 1200;
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.1);
            setTimeout(() => {
                const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
                o2.type = 'sine'; o2.frequency.value = 1800;
                g2.gain.setValueAtTime(masterVolume, ctx.currentTime);
                g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                o2.connect(g2); g2.connect(ctx.destination);
                o2.start(); o2.stop(ctx.currentTime + 0.2);
            }, 100);
        } else if (type === 'wrong' || type === 'hit') {
            o.type = 'sawtooth'; o.frequency.value = 150;
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.3);
        } else if (type === 'smash') {
            o.type = 'square'; o.frequency.value = 400;
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.1);
        }
    } catch (e) { console.error(e); }
};