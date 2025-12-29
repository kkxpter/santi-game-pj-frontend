'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MatrixBg from '@/components/MatrixBg';
// ตรวจสอบ path ให้ตรงกับเครื่องคุณ (เช่น @/lib/sound หรือ @/app/lib/sound)
import { playSound } from '@/app/lib/sound'; 

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'bet'>('home');
  
  // ✅ แก้ไข 1: เพิ่ม chat: 0 ลงไปในค่าเริ่มต้น
  const [stats, setStats] = useState({ normal: 0, virus: 0, chat: 0 });

  // โหลดสถิติ
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
    
    // ✅ แก้ไข 2: อ่านค่า chat จาก localStorage ด้วย
    setStats({ 
      normal: saved.normal || 0, 
      virus: saved.virus || 0,
      chat: saved.chat || 0 
    });
  }, []);

  const handleStart = (mode: string) => {
    playSound('click');
    if (mode === 'normal') {
      setView('bet'); 
    } else if (mode === 'virus') {
      router.push('/game/virus'); 
    } else if (mode === 'chat') {  // ✅ เพิ่มโหมด Chat
      router.push('/game/chat');
    }
  };

  const selectDifficulty = (diff: string) => {
    playSound('click');
    router.push(`/game/quiz?diff=${diff}`); 
  };

  return (
    <main className="relative w-screen h-screen flex flex-col items-center justify-center p-4">
      <MatrixBg />
      
      {/* --- VIEW 1: หน้าเลือกเกม (HOME) --- */}
      {view === 'home' && (
        <div className="relative w-full max-w-sm bg-black/70 backdrop-blur-xl border border-white/15 rounded-3xl p-6 animate-fade-in z-10 hud-card">
          
          {/* Logo Animation */}
          <div className="flex justify-center mb-5 relative">
            <div className="w-20 h-20 rounded-full border border-green-500/30 flex items-center justify-center bg-green-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="absolute inset-0 border-t-2 border-green-400 rounded-full animate-spin-slow"></div>
              <div className="text-4xl animate-pulse relative z-10">👾</div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-wide leading-none text-shadow-green">
              เดิมพัน<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">ไซเบอร์</span>
            </h1>
          </div>

          <div className="flex flex-col gap-3">
            {/* 1. ปุ่มโหมด Quiz */}
            <button onClick={() => handleStart('normal')} className="btn-menu-sleek green group">
              <div className="flex items-center gap-3">
                <div className="icon-box">🧠</div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-green-400 transition-colors">โหมดตอบคำถาม</div>
                  <div className="text-[10px] text-gray-400 font-mono">เล่นจบ: <span className="text-green-400 font-bold">{stats.normal}</span> รอบ</div>
                </div>
              </div>
              <div className="text-green-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">→</div>
            </button>

            {/* 2. ปุ่มโหมด Virus */}
            <button onClick={() => handleStart('virus')} className="btn-menu-sleek red group">
              <div className="flex items-center gap-3">
                <div className="icon-box text-red-400 border-red-500/30">🔨</div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-red-400 transition-colors">Virus Smasher</div>
                  <div className="text-[10px] text-gray-400 font-mono">Action Mode</div>
                </div>
              </div>
              <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">→</div>
            </button>

            {/* 3. ปุ่มโหมด Chat (เพิ่มใหม่) */}
            <button onClick={() => handleStart('chat')} className="btn-menu-sleek blue group">
                <div className="flex items-center gap-3">
                    <div className="icon-box text-blue-400 border-blue-500/30">💬</div>
                    <div className="text-left">
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Chat Defender</div>
                        {/* ตอนนี้ stats.chat จะไม่ Error แล้ว */}
                        <div className="text-[10px] text-gray-400 font-mono">เล่นจบ: <span className="text-blue-400 font-bold">{stats.chat}</span> รอบ</div>
                    </div>
                </div>
                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">→</div>
            </button>

          </div>
        </div>
      )}

      {/* --- VIEW 2: หน้าเลือกระดับความยาก (BET) --- */}
      {view === 'bet' && (
        <div className="relative w-full max-w-sm bg-black/70 backdrop-blur-xl border border-white/15 rounded-3xl p-6 animate-fade-in z-10 hud-card">
          <h2 className="text-2xl font-black text-white text-center mb-6 uppercase tracking-wider">ระดับความยาก</h2>
          
          <div className="flex flex-col gap-3">
             <button onClick={() => selectDifficulty('easy')} className="btn-menu-sleek green justify-start gap-4 h-20 px-4 group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🟢</span>
                <div className="text-left">
                    <div className="font-bold text-white text-lg group-hover:text-green-400 transition-colors">มือใหม่ (Easy)</div>
                    <div className="text-xs text-gray-400 font-mono">⏳ 20 วินาที | 20 คะแนน</div>
                </div>
             </button>

             <button onClick={() => selectDifficulty('medium')} className="btn-menu-sleek text-yellow-500 border-yellow-500/30 justify-start gap-4 h-20 px-4 hover:border-yellow-500 group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🟡</span>
                <div className="text-left">
                    <div className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">ทั่วไป (Normal)</div>
                    <div className="text-xs text-gray-400 font-mono">⏳ 15 วินาที | 30 คะแนน</div>
                </div>
             </button>

             <button onClick={() => selectDifficulty('hard')} className="btn-menu-sleek text-red-500 border-red-500/30 justify-start gap-4 h-20 px-4 hover:border-red-500 group">
                <span className="text-2xl animate-pulse group-hover:scale-110 transition-transform">🔴</span>
                <div className="text-left">
                    <div className="font-bold text-white text-lg group-hover:text-red-400 transition-colors">มหาเทพ (Hard)</div>
                    <div className="text-xs text-gray-400 font-mono">⏳ 10 วินาที | 40 คะแนน</div>
                </div>
             </button>
          </div>

          <button 
            onClick={() => { playSound('click'); setView('home'); }} 
            className="w-full mt-6 text-xs text-gray-500 hover:text-white flex justify-center items-center gap-1 transition-colors"
          >
            <span>←</span> กลับหน้าหลัก
          </button>
        </div>
      )}
    </main>
  );
}