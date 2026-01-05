'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/app/lib/sound'; 

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'bet'>('home');
  const [stats, setStats] = useState({ normal: 0, virus: 0, chat: 0 });
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false); // ใช้เช็คว่าโหลดหน้าเสร็จหรือยัง

  useEffect(() => {
    setMounted(true);
    
    // 🛡️ SECURITY CHECK: ตรวจสอบ Token
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('user_name');
    
    if (!token) {
      router.replace('/login'); // ใช้ replace แทน push เพื่อไม่ให้กด back กลับมาได้
    } else {
        setUserName(name || 'Player');
        
        // โหลดสถิติ
        try {
            const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
            setStats({ 
                normal: saved.normal || 0, 
                virus: saved.virus || 0,
                chat: saved.chat || 0 
            });
        } catch (e) {
            console.error("Error loading stats:", e);
            // ถ้า error ให้ใช้ค่าเริ่มต้น
            setStats({ normal: 0, virus: 0, chat: 0 });
        }
    }
  }, [router]);

  const handleStart = (mode: string) => {
    playSound('click');
    if (mode === 'normal') setView('bet'); 
    else if (mode === 'virus') router.push('/game/virus'); 
    else if (mode === 'chat') router.push('/game/chat');
  };

  const selectDifficulty = (diff: string) => {
    playSound('click');
    router.push(`/game/quiz?diff=${diff}`); 
  };

  const handleLogout = () => {
      playSound('click');
      localStorage.removeItem('token');
      localStorage.removeItem('user_name');
      router.push('/login');
  };

  // ป้องกันการแสดงผลเพี้ยนก่อนโหลดเสร็จ (Hydration Mismatch)
  if (!mounted) return null;

  return (
    <main className="relative w-screen h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-slate-900 font-sans">
      
      {/* ==================== ✨ Background ✨ ==================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* ปุ่ม Logout */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 animate-fade-in">
        <span className="text-white/70 text-sm hidden sm:inline">สวัสดี, <span className="text-purple-400 font-bold">{userName}</span></span>
        <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
        >
            LOGOUT
        </button>
      </div>

      {/* --- VIEW 1: HOME MENU --- */}
      {view === 'home' && (
        <div className="relative w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 animate-fade-in z-10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-70"></div>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8 relative">
            <div className="relative w-24 h-24 mb-4">
               <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-spin-slow"></div>
               <div className="absolute inset-2 rounded-full border border-blue-400/30 border-dashed animate-[spin_10s_linear_infinite_reverse]"></div>
               <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full backdrop-blur-sm shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  <span className="text-5xl animate-bounce drop-shadow-[0_0_10px_rgba(167,139,250,0.8)]">👾</span>
               </div>
            </div>
            
            <h1 className="text-4xl font-black text-white uppercase tracking-wider text-center leading-none">
              เดิมพัน<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-sm">ไซเบอร์</span>
            </h1>
            <p className="text-xs text-gray-300 mt-2 font-bold tracking-widest opacity-80">โตไปไม่โดนหลอก 🤪</p>
          </div>

          {/* Menu */}
          <div className="flex flex-col gap-3 relative z-10">
            {/* Quiz */}
            <MenuButton 
                onClick={() => handleStart('normal')} 
                icon="🧠" 
                title="ตอบคำถามวัดกึ๋น" 
                subtitle={`ชนะไปแล้ว: ${stats.normal} รอบ`} 
                color="green" 
            />
            {/* Virus */}
            <MenuButton 
                onClick={() => handleStart('virus')} 
                icon="🔨" 
                title="ทุบไวรัสวัดนิ้ว" 
                subtitle="โหมดแอคชั่น: มันส์มาก!" 
                color="red" 
            />
            {/* Chat */}
            <MenuButton 
                onClick={() => handleStart('chat')} 
                icon="💬" 
                title="แชทปั่นแก๊งคอล" 
                subtitle={`ชนะไปแล้ว: ${stats.chat} รอบ`} 
                color="blue" 
            />
          </div>
        </div>
      )}

      {/* --- VIEW 2: DIFFICULTY SELECTOR --- */}
      {view === 'bet' && (
        <div className="relative w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/15 rounded-[2rem] p-8 animate-fade-in z-10 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1">เลือกความตึง</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto rounded-full"></div>
          </div>
          
          <div className="flex flex-col gap-4">
             <DiffButton onClick={() => selectDifficulty('easy')} icon="👶" title="อนุบาลหัดเดิน" desc="เวลา 20 วิ • ชิลๆ" color="green" />
             <DiffButton onClick={() => selectDifficulty('medium')} icon="🧑‍🦱" title="มนุษย์เดินดิน" desc="เวลา 15 วิ • เริ่มตึง" color="yellow" />
             <DiffButton onClick={() => selectDifficulty('hard')} icon="⚡" title="เทพเจ้าสายฟ้า" desc="เวลา 10 วิ • กระพริบตาคือตุย" color="red" />
          </div>

          <button 
            onClick={() => { playSound('click'); setView('home'); }} 
            className="w-full mt-8 py-3 text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-white flex justify-center items-center gap-2 transition-all opacity-70 hover:opacity-100"
          >
            <span>←</span> กลับหน้าหลัก
          </button>
        </div>
      )}
    </main>
  );
}

// --- Components ย่อยเพื่อลดความซ้ำซ้อนของโค้ด ---

function MenuButton({ onClick, icon, title, subtitle, color }: any) {
    const colors: any = {
        green: "hover:border-green-400/50 hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] text-green-300 bg-green-500/20 border-green-500/30",
        red: "hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(248,113,113,0.2)] text-red-300 bg-red-500/20 border-red-500/30",
        blue: "hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(96,165,250,0.2)] text-blue-300 bg-blue-500/20 border-blue-500/30"
    };

    return (
        <button onClick={onClick} className={`relative group w-full p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 overflow-hidden ${colors[color].split(' ').slice(0, 2).join(' ')}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 ${colors[color].split(' ').slice(2).join(' ')}`}>
                    {icon}
                </div>
                <div className="text-left flex-1">
                    <div className={`font-bold text-white text-lg group-hover:text-${color}-300 transition-colors`}>{title}</div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 group-hover:text-gray-200">
                        {subtitle}
                    </div>
                </div>
                <div className={`text-${color}-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 font-bold text-xl`}>→</div>
            </div>
        </button>
    );
}

function DiffButton({ onClick, icon, title, desc, color }: any) {
    const colors: any = {
        green: "bg-green-500 hover:bg-green-900/20 hover:border-green-400/30 text-green-300",
        yellow: "bg-yellow-500 hover:bg-yellow-900/20 hover:border-yellow-400/30 text-yellow-300",
        red: "bg-red-500 hover:bg-red-900/20 hover:border-red-400/30 text-red-300"
    };

    return (
        <button onClick={onClick} className={`relative group w-full p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 overflow-hidden ${colors[color].split(' ').slice(1).join(' ')}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors[color].split(' ')[0]} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex items-center gap-4">
                <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all duration-300 scale-90 group-hover:scale-110">{icon}</span>
                <div className="text-left">
                    <div className={`font-bold text-white text-lg group-hover:text-${color}-300 transition-colors`}>{title}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-gray-200">{desc}</div>
                </div>
            </div>
        </button>
    );
}