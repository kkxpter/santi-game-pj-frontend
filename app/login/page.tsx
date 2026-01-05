'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; //test
import Link from 'next/link';
import React from 'react'; 
// import { playSound } from '@/app/lib/sound'; // ⚠️ ถ้ายังไม่มีไฟล์เสียง ให้ปิดบรรทัดนี้ไว้ก่อนไม่งั้นจะ Error หาไฟล์ไม่เจอ

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // playSound('click'); // ⚠️ เปิดใช้เมื่อมีไฟล์เสียง
    setError('');
    setIsLoading(true);

    try {
      // --- จำลองโหลด ---
      await new Promise(resolve => setTimeout(resolve, 1500));

      // --- Login สำเร็จ ---
      localStorage.setItem('isLoggedIn', 'true');
      router.push('/'); 
      
    } catch (err) { 
      // ✅ วิธีแก้ที่ 2: ไม่ใช้ any ตรงหัวข้อ แต่มาแปลงข้างในแทน (ผ่านทุกกฎ)
      const errorMessage = (err as Error).message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
      
      console.log(errorMessage); 
      setError(errorMessage);
      setIsLoading(false); // คืนค่าปุ่มให้กดได้ใหม่
    }
  };

  return (
    <main className="relative w-screen h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-slate-900 font-sans">
      
      {/* Background Code (เหมือนเดิม) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      <div className="relative w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 animate-fade-in z-10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
        
        {/* Decorative Lines */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-70"></div>

        <div className="text-center mb-8">
            <div className="text-6xl mb-2 animate-bounce drop-shadow-[0_0_10px_rgba(167,139,250,0.8)]">🔐</div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">เข้าสู่ระบบ</h1>
            <p className="text-xs text-gray-400 mt-2 font-bold tracking-widest opacity-80">(โหมดทดสอบ: กดปุ่มเข้าได้เลย)</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="group">
                <label className="text-xs text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-blue-400 transition-colors">USERNAME</label>
                <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
            </div>

            <div className="group">
                <label className="text-xs text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-purple-400 transition-colors">PASSWORD</label>
                <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
            </div>

            {error && (
                <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20 animate-pulse">
                    ⚠️ {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="mt-4 relative w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold tracking-widest uppercase hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>กำลังเชื่อมต่อ...</span>
                    </div>
                ) : (
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        เข้าเล่นเลย <span className="text-lg">🚀</span>
                    </span>
                )}
                {!isLoading && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>}
            </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-gray-400 font-bold tracking-wide">
            <div>
                ยังไม่มีไอดี? 
                {/* ถ้าจะใช้ playSound ให้เอาคอมเมนต์ออก */}
                <Link href="/register" /* onClick={() => playSound('click')} */ className="text-blue-400 ml-2 hover:text-blue-300 underline decoration-dashed underline-offset-4 transition-colors">
                    สมัครสมาชิก
                </Link>
            </div>
            
            <button 
                onClick={() => { /* playSound('click'); */ router.push('/'); }}
                className="text-gray-500 hover:text-white transition-colors flex items-center gap-1"
            >
                <span>←</span> กลับหน้าหลัก
            </button>
        </div>

      </div>
    </main>
  );
}