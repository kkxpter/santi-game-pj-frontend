'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // ✅ ส่ง Username/Password ไปตรวจที่ Backend
      const res = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      // ✅ [จุดที่แก้] บันทึกข้อมูลลง LocalStorage โดยใช้ key ชื่อ 'user'
      // เพื่อให้ตรงกับหน้า QuizGame ที่รออ่าน key ชื่อ 'user' อยู่
      localStorage.setItem('user', JSON.stringify(data.user));
      
      router.push('/');

    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <main className="relative w-screen h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-900 font-sans">
      
      {/* Background Theme */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🔐</div>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest">เข้าสู่ระบบ</h1>
          <p className="text-purple-300 text-sm mt-2">ยืนยันตัวตนเพื่อเดิมพันไซเบอร์</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-500"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center font-bold animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg uppercase tracking-widest hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'กำลังโหลด...' : 'LOGIN เข้าเกม'}
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            ยังไม่มีบัญชีใช่ไหม?{' '}
            <Link 
              href="/register" 
              className="text-purple-400 font-bold hover:text-purple-300 hover:underline transition-all"
            >
              สมัครสมาชิกใหม่
            </Link>
          </p> 
        </div>

      </div>
    </main>
  );
}