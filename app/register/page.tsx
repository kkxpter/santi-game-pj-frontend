'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

const Icons = {
  User: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Phone: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Lock: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  Map: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
};

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    username: '', email: '', password: '', confirmPassword: '', 
    birthDay: '', birthMonth: '', birthYear: '',
    phone: '', address: ''
  });
  const [error, setError] = useState('');

  // Refs
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // กรองให้พิมพ์ได้แค่ตัวเลข
    if (['phone', 'birthDay', 'birthMonth', 'birthYear'].includes(name)) {
        if (!/^\d*$/.test(value)) return;
    }

    // Auto Focus Logic
    if (name === 'birthDay' && value.length === 2) {
        monthRef.current?.focus();
    }
    if (name === 'birthMonth' && value.length === 2) {
        yearRef.current?.focus();
    }

    setFormData({ ...formData, [name]: value });
  };

  // ✅ FIX 1: แก้ Type ให้รองรับ null (RefObject<HTMLInputElement | null>)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, prevRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
        prevRef.current?.focus();
    }
  };

  // ค้นหาฟังก์ชัน handleRegister แล้วแทนที่ด้วยโค้ดนี้ครับ
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Validation (เหมือนเดิม) ---
    if (formData.password !== formData.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (formData.password.length < 4) { setError('รหัสผ่านสั้นเกินไป'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return; }
    if (formData.phone.length !== 10) { setError('เบอร์โทรศัพท์ต้องมี 10 หลัก'); return; }

    // แปลงวันเกิด
    const day = parseInt(formData.birthDay);
    const month = parseInt(formData.birthMonth);
    const yearBE = parseInt(formData.birthYear);
    const yearAD = yearBE - 543;

    // ตรวจสอบความถูกต้องของวันที่ (Validation Logic เดิมของคุณ)
    const birthDateObj = new Date(yearAD, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDateObj.getFullYear() !== yearAD || birthDateObj.getMonth() !== month - 1 || birthDateObj.getDate() !== day) {
        setError('วันที่ระบุไม่มีจริงในปฏิทิน'); return;
    }
    if (birthDateObj > today) { setError('วันเกิดห้ามเกินวันนี้นะ'); return; }

    // คำนวณอายุ
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) { age--; }
    if (age < 10) { setError('ขออภัย ผู้ใช้งานต้องมีอายุ 10 ปีขึ้นไป'); return; }

    setIsLoading(true);

    try {
      // ✅ เตรียมข้อมูลสำหรับส่งให้ Backend (Format วันที่ต้องเป็น YYYY-MM-DD)
      const payload = {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          birthdate: `${yearAD}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` // แปลงเป็น YYYY-MM-DD
      };

      // ✅ ยิง API ไปที่ Backend Port 4000
      const res = await fetch('http://localhost:4000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
          throw new Error(data.error || 'สมัครสมาชิกไม่สำเร็จ');
      }
      
      console.log('Register Success:', data);
      alert('สมัครสมาชิกเรียบร้อย! กรุณาเข้าสู่ระบบ'); // แจ้งเตือนหน่อย
      router.push('/login');

    } catch (err) {
      setError((err as Error).message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsLoading(false);
    }
  };

//

  return (
    <main className="relative w-screen h-screen flex flex-col items-center justify-center p-4 bg-slate-900 font-sans overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* Card Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-enter">
        
        {/* Header */}
        <div className="text-center mb-6 flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-3xl shadow-inner border border-white/10 animate-bounce">
                📝
            </div>
            <div className="text-left">
                <h1 className="text-2xl font-black text-white uppercase tracking-wider leading-none">สมัครสมาชิก</h1>
                <p className="text-xs text-gray-400 font-bold tracking-wider mt-1">ลงทะเบียนเข้าสู่ระบบ SATI</p>
            </div>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
            
            {/* Row 1: Username & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-blue-400 transition-colors uppercase tracking-wider">ชื่อผู้ใช้</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors"><Icons.User /></div>
                        <input type="text" name="username" required value={formData.username} onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                            placeholder="ตั้งชื่อผู้ใช้" autoComplete="off"
                        />
                    </div>
                </div>
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-blue-400 transition-colors uppercase tracking-wider">อีเมล</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors"><Icons.Mail /></div>
                        <input type="email" name="email" required value={formData.email} onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                            placeholder="example@mail.com"
                        />
                    </div>
                </div>
            </div>

            {/* Row 2: เบอร์โทร & วันเกิด */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-yellow-400 transition-colors uppercase tracking-wider">เบอร์โทรศัพท์</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors"><Icons.Phone /></div>
                        <input 
                            type="tel" name="phone" required value={formData.phone} onChange={handleChange} maxLength={10}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-gray-600"
                            placeholder="08xxxxxxxx"
                        />
                    </div>
                </div>
                
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-yellow-400 transition-colors uppercase tracking-wider">วันเดือนปีเกิด (พ.ศ.)</label>
                    
                    <div className="relative flex items-center w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 transition-all focus-within:border-yellow-500 focus-within:ring-1 focus-within:ring-yellow-500">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors pointer-events-none">
                            <Icons.Calendar />
                        </div>

                        <div className="flex items-center gap-1 pl-6 w-full text-white text-sm">
                            <input 
                                ref={dayRef}
                                type="tel" name="birthDay" placeholder="วว" maxLength={2} required
                                value={formData.birthDay} onChange={handleChange} 
                                className="w-[3ch] bg-transparent text-center focus:outline-none placeholder-gray-600"
                            />
                            <span className="text-gray-500">/</span>
                            
                            <input 
                                ref={monthRef}
                                type="tel" name="birthMonth" placeholder="ดด" maxLength={2} required
                                value={formData.birthMonth} onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, dayRef)} 
                                className="w-[3ch] bg-transparent text-center focus:outline-none placeholder-gray-600"
                            />
                            <span className="text-gray-500">/</span>
                            
                            <input 
                                ref={yearRef}
                                type="tel" name="birthYear" placeholder="ปปปป" maxLength={4} required
                                value={formData.birthYear} onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, monthRef)}
                                className="w-[5ch] bg-transparent text-center focus:outline-none placeholder-gray-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: ที่อยู่ */}
            <div className="group relative">
                <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-pink-400 transition-colors uppercase tracking-wider">ที่อยู่</label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors"><Icons.Map /></div>
                    <input type="text" name="address" required value={formData.address} onChange={handleChange}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all placeholder-gray-600"
                        placeholder="บ้านเลขที่, ถนน, ตำบล..."
                    />
                </div>
            </div>

            {/* Row 4: รหัสผ่าน */}
            <div className="grid grid-cols-2 gap-3">
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-purple-400 transition-colors uppercase tracking-wider">รหัสผ่าน</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"><Icons.Lock /></div>
                        <input type="password" name="password" required value={formData.password} onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-gray-600"
                            placeholder="••••••"
                        />
                    </div>
                </div>
                <div className="group relative">
                    <label className="text-[10px] text-gray-400 font-bold ml-2 mb-1 block group-focus-within:text-green-400 transition-colors uppercase tracking-wider">ยืนยันรหัสผ่าน</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors"><Icons.Lock /></div>
                        <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-gray-600"
                            placeholder="••••••"
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-xl border border-red-500/20 animate-pulse font-bold flex items-center justify-center gap-2">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* Action Area */}
            <div className="mt-4 flex flex-col gap-3">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold tracking-widest uppercase hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg border border-white/10"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-xs">กำลังบันทึกข้อมูล...</span>
                        </div>
                    ) : (
                        <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                            ลงทะเบียน <span className="text-lg">🚀</span>
                        </span>
                    )}
                </button>

                <div className="text-center text-xs text-gray-400 font-bold tracking-wide">
                    มีบัญชีอยู่แล้ว? 
                    <Link href="/login" className="text-emerald-400 ml-2 hover:text-emerald-300 underline decoration-dashed underline-offset-4 transition-colors">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        </form>
      </div>
    </main>
  );
}