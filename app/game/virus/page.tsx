'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/app/lib/sound';

type CellState = 'empty' | 'virus' | 'bomb' | 'file' | 'exploding' | 'boss';
type GameState = 'tutorial' | 'playing' | 'gameover';

export default function VirusPage() {
  const router = useRouter();
  
  // --- State ---
  const [view, setView] = useState<GameState>('tutorial');
  const [grid, setGrid] = useState<CellState[]>(Array(16).fill('empty'));
  const [hp, setHp] = useState(200);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);
  
  // Effect States
  const [isShaking, setIsShaking] = useState(false);
  const [bossHp, setBossHp] = useState(0);

  // ✅ Phase Logic (20s per phase)
  let phase = 1;
  if (survivalTime >= 40) phase = 3;
  else if (survivalTime >= 20) phase = 2;

  // Refs
  const loopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bossTimerRef = useRef<number>(0);

  // CSS Animation
  const shakeStyle = `
    @keyframes shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        10% { transform: translate(-1px, -2px) rotate(-1deg); }
        20% { transform: translate(-3px, 0px) rotate(1deg); }
        30% { transform: translate(3px, 2px) rotate(0deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 2px) rotate(-1deg); }
        60% { transform: translate(-3px, 1px) rotate(0deg); }
        70% { transform: translate(3px, 1px) rotate(-1deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        90% { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
    }
    .animate-shake {
        animation: shake 0.5s;
        animation-iteration-count: 1;
    }
  `;

  const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
  };

  // 1. Timer
  useEffect(() => {
    if (view !== 'playing') return;
    timerRef.current = setInterval(() => setSurvivalTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  // 2. Spawn Loop
  useEffect(() => {
    if (view !== 'playing') return;

    let spawnRate = 1000;
    let disappearRate = 1500;

    if (phase === 2) { spawnRate = 600; disappearRate = 1000; } 
    else if (phase === 3) { spawnRate = 350; disappearRate = 700; }

    const spawn = () => {
      setGrid(prevGrid => {
        const isBossActive = prevGrid.includes('boss');
        bossTimerRef.current += spawnRate;

        const emptyIndices = prevGrid.map((c, i) => c === 'empty' ? i : -1).filter(i => i !== -1);
        if (emptyIndices.length === 0) return prevGrid;

        const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const newGrid = [...prevGrid];
        
        const r = Math.random();
        let type: CellState = 'virus';
        let currentDisappearRate = disappearRate;

        // Boss Logic
        if (!isBossActive && bossTimerRef.current > 20000 && r > 0.7) {
            type = 'boss';
            setBossHp(5);
            bossTimerRef.current = 0;
            currentDisappearRate = 4000;
        } 
        else {
            // ✅ ปรับอัตราการเกิดของระเบิดให้น้อยลง (Rare)
            if (phase === 3) {
                if (r > 0.95) type = 'bomb'; // 5% (Phase 3)
                else if (r < 0.25) type = 'file'; // 25%
            } else {
                if (r > 0.97) type = 'bomb'; // 3% (Phase 1-2) - นานๆ มาที
                else if (r < 0.2) type = 'file'; // 20%
            }
        }

        newGrid[randIdx] = type;

        setTimeout(() => {
             setGrid(currentGrid => {
                 if (currentGrid[randIdx] === type) { 
                     const nextGrid = [...currentGrid];
                     nextGrid[randIdx] = 'empty';
                     
                     if (type === 'virus') {
                         setHp(h => Math.max(0, h - 10));
                         setCombo(0);
                     } else if (type === 'boss') {
                         triggerShake();
                         playSound('wrong');
                         setHp(h => Math.max(0, h - 100));
                         setCombo(0);
                     }

                     if (hp <= 0) setView('gameover');
                     return nextGrid;
                 }
                 return currentGrid;
             });
        }, currentDisappearRate);

        return newGrid;
      });

      loopRef.current = setTimeout(spawn, spawnRate);
    };

    spawn();
    return () => { if (loopRef.current) clearTimeout(loopRef.current); };
  }, [view, phase, hp]);

  // 3. Click Handler
  const handleHit = (index: number) => {
    if (view !== 'playing') return;
    const type = grid[index];
    if (type === 'empty' || type === 'exploding') return;

    const newGrid = [...grid];

    if (type === 'boss') {
        if (bossHp > 1) {
            playSound('click');
            setBossHp(prev => prev - 1);
        } else {
            playSound('smash');
            newGrid[index] = 'empty';
            setScore(s => s + 500);
            setHp(h => Math.min(200, h + 30));
            setBossHp(0);
        }
    } else if (type === 'virus') {
        playSound('smash');
        newGrid[index] = 'empty';
        const points = 10 + Math.min(20, combo);
        setScore(s => s + points);
        setCombo(c => c + 1);
    } else if (type === 'bomb') {
        // ✅ ระเบิด: Game Over ทันที
        triggerShake(); 
        playSound('wrong');
        newGrid[index] = 'exploding';
        setHp(0); // เลือดเป็น 0
        setView('gameover'); // ตัดจบเกม
    } else if (type === 'file') {
        // ✅ ไฟล์: เลือดลด 30
        triggerShake(); 
        playSound('wrong');
        newGrid[index] = 'exploding';
        setHp(h => Math.max(0, h - 30));
        setCombo(0);
        setTimeout(() => {
            setGrid(g => { const n = [...g]; n[index] = 'empty'; return n; });
        }, 300);
    }

    if (hp <= 0 && type !== 'bomb') setView('gameover'); // Check death for non-bomb causes
    setGrid(newGrid);
  };

  const startGame = () => {
      playSound('click');
      setHp(200);
      setScore(0);
      setCombo(0);
      setSurvivalTime(0);
      setBossHp(0);
      bossTimerRef.current = 0;
      setGrid(Array(16).fill('empty'));
      setView('playing');
  };

  return (
    <div className={`relative h-screen w-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-slate-900 font-sans transition-all ${isShaking ? 'animate-shake' : ''}`}>
       <style>{shakeStyle}</style>

       {/* Background */}
       <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
       </div>

       <button 
        onClick={() => { 
            playSound('click'); 
            if(view === 'playing') {
                if(confirm('จบเกมเลยไหม?')) router.push('/'); 
            } else {
                router.push('/');
            }
        }}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-red-500/20 hover:border-red-500 transition-all hover:scale-110 cursor-pointer"
      >
        ✕
      </button>

       {/* --- 1. TUTORIAL SCREEN --- */}
       {view === 'tutorial' && (
           <div className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl text-center animate-fade-in">
               <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6 uppercase tracking-wider">
                   คู่มือปราบไวรัส
               </h1>
               
               <div className="flex flex-col gap-3 mb-6">
                   <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                       <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">🦠</div>
                       <div className="text-left"><div className="text-white font-bold">ไวรัส</div><div className="text-gray-400 text-[10px]">ต้องรีบกด! หลุดแล้วเลือดลด</div></div>
                   </div>
                   {/* ✅ แก้ไขคำอธิบายระเบิด */}
                   <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                       <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-2xl animate-pulse">💣</div>
                       <div className="text-left"><div className="text-white font-bold">ระเบิด</div><div className="text-red-400 text-[10px] font-bold">ห้ามกดเด็ดขาด! GAME OVER ทันที</div></div>
                   </div>
                   {/* ✅ แก้ไขคำอธิบายไฟล์ */}
                   <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                       <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-2xl">📁</div>
                       <div className="text-left"><div className="text-white font-bold">ไฟล์งาน</div><div className="text-gray-400 text-[10px]">ห้ามกด! เลือดลด -30</div></div>
                   </div>
                   <div className="flex items-center gap-3 bg-purple-500/20 p-2 rounded-xl border border-purple-500/50 animate-pulse">
                       <div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-500 flex items-center justify-center text-3xl drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">👾</div>
                       <div className="text-left"><div className="text-purple-300 font-bold">บอสไวรัส!</div><div className="text-purple-200 text-[10px]">กด 5 ที! ฆ่าได้เลือดเด้ง</div></div>
                   </div>
               </div>

               <div className="text-center text-gray-400 text-xs mb-6 bg-black/20 p-3 rounded-lg">
                   <p className="text-yellow-400">ระดับความยากเพิ่มทุก 20 วินาที!</p>
               </div>

               <button 
                   onClick={startGame} 
                   className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
               >
                   พร้อมแล้ว ลุย!
               </button>
           </div>
       )}

       {/* --- 2. GAMEPLAY SCREEN --- */}
       {view === 'playing' && (
        <div className="relative z-10 w-full max-w-[380px] flex flex-col gap-4 animate-fade-in">
            
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                <div>
                    <div className="text-[10px] text-gray-400 tracking-widest font-bold">TIME</div>
                    <div className="text-2xl font-mono text-white">{survivalTime}s</div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-purple-400 tracking-widest font-bold mb-1">THREAT LEVEL</div>
                    <div className="flex gap-1">
                        <div className={`w-8 h-2 rounded-full transition-colors ${phase >= 1 ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-gray-700'}`}></div>
                        <div className={`w-8 h-2 rounded-full transition-colors ${phase >= 2 ? 'bg-yellow-500 shadow-[0_0_10px_orange]' : 'bg-gray-700'}`}></div>
                        <div className={`w-8 h-2 rounded-full transition-colors ${phase >= 3 ? 'bg-red-500 shadow-[0_0_10px_red] animate-pulse' : 'bg-gray-700'}`}></div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] text-blue-400 tracking-widest font-bold">SCORE</div>
                    <div className="text-2xl font-black text-blue-300">{score}</div>
                </div>
            </div>

            <div className="relative w-full">
                <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                    <span>SYSTEM HEALTH</span>
                    <span>{hp}/200</span>
                </div>
                <div className="w-full bg-white/5 h-6 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:10%_100%] z-10 pointer-events-none"></div>
                    <div 
                        className={`h-full transition-all duration-300 ${hp < 50 ? 'bg-red-500 shadow-[0_0_20px_red] animate-pulse' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`} 
                        style={{ width: `${(hp / 200) * 100}%` }} 
                    />
                </div>
            </div>
            
            <div className={`p-4 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-2xl transition-all duration-500 ${phase === 3 ? 'border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : ''}`}>
                <div className="grid grid-cols-4 gap-2">
                    {grid.map((cell, i) => (
                        <div 
                            key={i} 
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-4xl cursor-pointer transition-all duration-100 select-none border relative overflow-hidden
                                ${cell === 'empty' ? 'bg-white/5 border-white/5 hover:bg-white/10' : ''}
                                ${cell === 'virus' ? 'bg-red-500/20 border-red-500/50 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}
                                ${cell === 'bomb' ? 'bg-orange-500/20 border-orange-500/50 animate-pulse' : ''}
                                ${cell === 'file' ? 'bg-blue-500/20 border-blue-500/50' : ''}
                                ${cell === 'exploding' ? 'bg-red-600 border-red-600 animate-ping' : ''}
                                ${cell === 'boss' ? 'bg-purple-900/80 border-purple-500 animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]' : ''}
                            `}
                            onMouseDown={() => handleHit(i)}
                            onTouchStart={(e) => { e.preventDefault(); handleHit(i); }}
                        >
                            {cell === 'virus' ? '🦠' : cell === 'bomb' ? '💣' : cell === 'file' ? '📁' : cell === 'exploding' ? '💥' : ''}
                            {cell === 'boss' && (
                                <>
                                    <span className="text-5xl">👾</span>
                                    <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-400 transition-all" style={{ width: `${(bossHp / 5) * 100}%` }}></div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {phase === 3 && (
                <div className="text-center animate-pulse text-red-500 font-bold tracking-widest text-sm">
                    ⚠️ DANGER LEVEL MAX! SPEED INCREASED! ⚠️
                </div>
            )}
        </div>
       )}

       {/* --- 3. GAMEOVER SCREEN --- */}
       {view === 'gameover' && (
            <div className="relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] text-center max-w-sm w-full shadow-2xl animate-fade-in">
                <div className="text-8xl mb-4 animate-bounce drop-shadow-xl">💥</div>
                <h1 className="text-3xl font-black mb-2 uppercase tracking-wide text-red-500 drop-shadow-md">
                    SYSTEM CRASHED
                </h1>
                
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">เวลาที่รอด</p>
                    <div className="text-white text-4xl font-mono font-black mb-2">{survivalTime} วินาที</div>
                    <div className="w-full h-px bg-white/10 my-2"></div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">คะแนนรวม</p>
                    <div className="text-blue-300 text-5xl font-mono font-black">{score}</div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => { playSound('click'); router.push('/'); }} 
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
                    >
                        กลับหน้าหลัก
                    </button>
                    <button 
                        onClick={startGame} 
                        className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg hover:scale-105"
                    >
                        เล่นใหม่
                    </button>
                </div>
            </div>
       )}
    </div>
  );
}