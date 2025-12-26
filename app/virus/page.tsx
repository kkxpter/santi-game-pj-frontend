'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ตั้งค่าเกม
const GRID_SIZE = 16; // 4x4
const TOTAL_DURATION = 60; // 60 วินาที
const PHASE_2_THRESHOLD = 40; // เหลือ 40 วิ เข้า Phase 2

type EntityType = 'empty' | 'virus' | 'bomb' | 'file';

interface Cell {
  id: number;
  type: EntityType;
}

export default function VirusGamePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<Cell[]>(Array.from({ length: GRID_SIZE }, (_, i) => ({ id: i, type: 'empty' })));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION);
  const [hp, setHp] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  
  const isPhase2 = timeLeft <= PHASE_2_THRESHOLD;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnerRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------------
  // 1. ฟังก์ชันจบเกม
  // ----------------------------------------------------------
  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameOver(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnerRef.current) clearInterval(spawnerRef.current);
  }, []);

  // ----------------------------------------------------------
  // 2. ฟังก์ชันเกิดของ (Spawn)
  // ----------------------------------------------------------
  const spawnEntity = useCallback((turboMode: boolean) => {
    setGrid((currentGrid) => {
      const emptyIndices = currentGrid
        .map((cell, idx) => (cell.type === 'empty' ? idx : -1))
        .filter((idx) => idx !== -1);

      if (emptyIndices.length === 0) return currentGrid;

      const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      
      const rand = Math.random();
      let newType: EntityType = 'virus';
      if (rand > 0.85) newType = 'bomb'; 
      else if (rand > 0.75) newType = 'file';

      const newGrid = [...currentGrid];
      newGrid[randomIdx] = { ...newGrid[randomIdx], type: newType };
      
      const lifeTime = turboMode ? 900 : 1200;

      setTimeout(() => {
        setGrid((g) => {
            const temp = [...g];
            // เช็คว่ายังเป็นตัวเดิมอยู่ไหม
            if (temp[randomIdx].type === newType) {
                temp[randomIdx] = { ...temp[randomIdx], type: 'empty' };
                // เลือดลดถ้าปล่อยไวรัสหลุด
                if (newType === 'virus') setHp(h => Math.max(0, h - 10));
            }
            return temp;
        });
      }, lifeTime);

      return newGrid;
    });
  }, []); 

  // ----------------------------------------------------------
  // 3. เริ่มเกม
  // ----------------------------------------------------------
  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setHp(100);
    setTimeLeft(TOTAL_DURATION);
    setGameOver(false);
    setGrid(Array.from({ length: GRID_SIZE }, (_, i) => ({ id: i, type: 'empty' })));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
  };

  // ----------------------------------------------------------
  // 4. Game Loop (Spawn ของ)
  // ----------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) return;

    if (spawnerRef.current) clearInterval(spawnerRef.current);

    const spawnSpeed = isPhase2 ? 350 : 700;

    spawnerRef.current = setInterval(() => {
      spawnEntity(isPhase2);
    }, spawnSpeed);

    return () => {
        if (spawnerRef.current) clearInterval(spawnerRef.current);
    };
  }, [isPlaying, isPhase2, spawnEntity]);

  // ----------------------------------------------------------
  // 5. Watcher: เช็คเงื่อนไขแพ้ (เวลาหมด หรือ เลือดหมด)
  // ----------------------------------------------------------
  useEffect(() => {
    if (isPlaying) {
        if (timeLeft <= 0 || hp <= 0) {
            const timer = setTimeout(() => {
                endGame();
            }, 0);
            return () => clearTimeout(timer);
        }
    }
  }, [timeLeft, hp, isPlaying, endGame]);

  // ฟังก์ชันเคลียร์ช่อง
  const clearCell = (index: number) => {
    setGrid(prev => {
        const newG = [...prev];
        newG[index] = { ...newG[index], type: 'empty' };
        return newG;
    });
  };

  // ฟังก์ชันกดตี
  const handleHit = (index: number) => {
    if (!isPlaying) return;

    const cell = grid[index];
    
    if (cell.type === 'virus') {
        setScore(s => s + 10);
        clearCell(index);
    } else if (cell.type === 'bomb') {
        // 🔥 แก้ไข: กดระเบิด = เลือดเหลือ 0 ทันที (จบเกม)
        setHp(0);
        // ไม่ต้อง clearCell ก็ได้เพราะเกมจบเลย แต่ถ้าจะใส่ก็ได้ครับ
    } else if (cell.type === 'file') {
        setScore(s => Math.max(0, s - 20));
        setHp(h => Math.max(0, h - 20));
        clearCell(index);
    }
  };

  // Cleanup เมื่อออกจากหน้าเว็บ
  useEffect(() => {
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (spawnerRef.current) clearInterval(spawnerRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      
      {/* HUD */}
      <div className="w-full max-w-sm mb-4 flex justify-between items-end relative z-20">
          <div className="bg-black/60 p-3 rounded-xl border border-white/10 backdrop-blur-md">
              <p className="text-[10px] text-gray-400 font-bold tracking-widest">SYSTEM HP</p>
              <div className="w-32 h-3 bg-gray-800 rounded-full mt-1 overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-300 ${hp > 50 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} 
                    style={{ width: `${hp}%` }}
                  ></div>
              </div>
          </div>
          
          {isPlaying && isPhase2 && (
             <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-600/90 px-4 py-1 rounded text-white text-xs font-black animate-pulse shadow-lg border border-red-400 whitespace-nowrap">
                ⚠ WARNING: SPEED UP!
             </div>
          )}

          <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold tracking-widest">TIME LEFT</p>
              <p className={`text-4xl font-black font-mono leading-none ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</p>
          </div>
      </div>

      {/* GAME GRID */}
      <div className={`relative bg-black/40 p-4 rounded-2xl border backdrop-blur-sm shadow-2xl transition-colors duration-500
          ${isPhase2 && isPlaying ? 'border-red-500/30 shadow-red-900/20' : 'border-white/10'}
      `}>
         {!isPlaying && !gameOver && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
                 <h1 className="text-3xl font-black text-white mb-2 text-center uppercase">Virus<br/><span className="text-red-500">Smasher</span></h1>
                 <p className="text-gray-400 text-sm mb-6 text-center">Phase 1: Normal (20s)<br/>Phase 2: <span className="text-red-400 font-bold">Turbo (40s)</span></p>
                 <button onClick={startGame} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition hover:scale-105">START MISSION</button>
             </div>
         )}
         
         {gameOver && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 rounded-2xl animate-fade-in">
                 <div className="text-6xl mb-2">💥</div>
                 <h2 className="text-2xl font-bold text-white mb-1">SYSTEM TERMINATED</h2>
                 <p className="text-green-400 font-mono text-xl mb-6">Final Score: {score}</p>
                 <div className="flex gap-2">
                    <button onClick={startGame} className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:scale-105 transition">Retry</button>
                    <Link href="/" className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10">Menu</Link>
                 </div>
             </div>
         )}

         <div className="grid grid-cols-4 gap-2 w-full max-w-[320px]">
            {grid.map((cell) => (
                <button
                    key={cell.id}
                    onMouseDown={() => handleHit(cell.id)}
                    className={`
                        w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center text-3xl transition-all duration-75 active:scale-90 relative overflow-hidden
                        ${cell.type === 'empty' ? 'bg-white/5' : ''}
                        ${cell.type === 'virus' ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse' : ''}
                        ${cell.type === 'bomb' ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' : ''}
                        ${cell.type === 'file' ? 'bg-blue-500/20 border-2 border-blue-500' : ''}
                    `}
                >
                    {cell.type === 'virus' && '🦠'}
                    {cell.type === 'bomb' && '💣'}
                    {cell.type === 'file' && '📁'}
                </button>
            ))}
         </div>
      </div>

      <div className="mt-6 flex gap-4 text-xs font-mono text-gray-500">
          <div className="flex items-center gap-1"><span className="text-lg">🦠</span> -10 HP</div>
          <div className="flex items-center gap-1"><span className="text-lg">📁</span> -20 HP</div>
          <div className="flex items-center gap-1 text-red-500 font-bold"><span className="text-lg">💣</span> GAME OVER</div>
      </div>
    </div>
  );
}