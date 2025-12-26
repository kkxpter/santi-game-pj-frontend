import Link from 'next/link';
import MatrixBackground from '@/components/MatrixBackground';

export default function Home() {
  return (
    // Container หลัก: พื้นหลังดำสนิท
    <div className="relative w-full min-h-screen flex flex-col justify-center items-center p-4 font-sans overflow-hidden bg-[#050505]">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050505] to-[#050505]"></div>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
         <MatrixBackground />
      </div>

      {/* ✅ Main Card: กล่องกระจกรมดำ + แสงเรืองรอง (ไม่มีขอบแข็ง) */}
      <div 
        className="relative z-10 w-full bg-zinc-900/40 backdrop-blur-xl rounded-[40px] p-8 shadow-[0_0_80px_-20px_rgba(16,185,129,0.4)] animate-enter"
        style={{ width: '100%', maxWidth: '380px' }} 
      >
        
        {/* --- Logo Section --- */}
        <div className="flex justify-center mb-8 relative">
          {/* แสงฟุ้งหลังโลโก้ */}
          <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full animate-pulse-slow"></div>
          
          <div className="w-28 h-28 rounded-full bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center relative shadow-2xl z-10 p-1">
             <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center border border-emerald-500/30">
                <div className="text-6xl animate-bounce drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">👾</div>
             </div>
          </div>
        </div>

        {/* --- Title Section --- */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white uppercase tracking-wider mb-2 leading-none drop-shadow-lg">
            เดิมพัน<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 animate-pulse">ไซเบอร์</span>
          </h1>
          <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400 font-mono tracking-[0.2em] uppercase">Cyber Security Game</p>
          </div>
        </div>

        {/* --- Menu Buttons --- */}
        <div className="flex flex-col gap-4">
          
          {/* 1. Quiz Mode (Green Theme) */}
          <Link href="/quiz" className="group relative w-full p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-emerald-900/20 hover:to-zinc-900 border border-white/5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] hover:-translate-y-1">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all">🧠</div>
                <div className="text-left flex-1">
                    <div className="font-bold text-white text-lg group-hover:text-emerald-400 transition">โหมดตอบคำถาม</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300">Quiz Challenge</div>
                </div>
                <div className="text-zinc-600 group-hover:text-emerald-400 text-xl transition-transform group-hover:translate-x-1">➜</div>
            </div>
          </Link>

          {/* 2. Virus Smasher (Red Theme) */}
          <Link href="/virus" className="group relative w-full p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-rose-900/20 hover:to-zinc-900 border border-white/5 hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.3)] hover:-translate-y-1">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-2xl border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-black transition-all">🔨</div>
                <div className="text-left flex-1">
                    <div className="font-bold text-white text-lg group-hover:text-rose-400 transition">ทุบไวรัส</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300">Virus Smasher</div>
                </div>
                <div className="text-zinc-600 group-hover:text-rose-400 text-xl transition-transform group-hover:translate-x-1">➜</div>
            </div>
          </Link>

          {/* 3. Chat Defender (Blue Theme) */}
          <Link href="/chat" className="group relative w-full p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-blue-900/20 hover:to-zinc-900 border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] hover:-translate-y-1">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all">💬</div>
                <div className="text-left flex-1">
                    <div className="font-bold text-white text-lg group-hover:text-blue-400 transition">แชทลวงโลก</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300">Chat Defender</div>
                </div>
                <div className="text-zinc-600 group-hover:text-blue-400 text-xl transition-transform group-hover:translate-x-1">➜</div>
            </div>
          </Link>

        </div>

        {/* Footer Credit */}
        <div className="mt-8 text-center">
            <p className="text-[10px] text-zinc-600 font-mono tracking-widest">SECURE CONNECTION • v1.0</p>
        </div>

      </div>
    </div>
  );
}