'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MatrixBg from '@/components/MatrixBg';
import { playSound } from '@/app/lib/sound';

type CellState = 'empty' | 'virus' | 'bomb' | 'file' | 'exploding';

export default function VirusPage() {
  const router = useRouter();
  
  // Game State
  const [grid, setGrid] = useState<CellState[]>(Array(16).fill('empty'));
  const [hp, setHp] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [isGameActive, setIsGameActive] = useState(true);
  const [phase, setPhase] = useState(1);

  // Refs for loop management
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            setIsGameActive(false);
            return 0;
        }
        // Phase 2 Trigger
        if (prev === 21) setPhase(2); 
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameActive]);

  // Spawning Loop
  useEffect(() => {
    if (!isGameActive || timeLeft <= 0) return;

    const spawnRate = phase === 1 ? 900 : 400; // Turbo mode in phase 2

    const spawn = () => {
      setGrid(prevGrid => {
        const emptyIndices = prevGrid.map((c, i) => c === 'empty' ? i : -1).filter(i => i !== -1);
        if (emptyIndices.length === 0) return prevGrid;

        const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const newGrid = [...prevGrid];
        
        // Probabilities: 10% Bomb, 60% Virus, 30% File
        const r = Math.random();
        let type: CellState = 'virus';
        if (r > 0.9) type = 'bomb';
        else if (r < 0.3) type = 'file';

        newGrid[randIdx] = type;

        // Auto-remove logic
        setTimeout(() => {
             setGrid(currentGrid => {
                 if (currentGrid[randIdx] === type) { // Still same entity
                     const nextGrid = [...currentGrid];
                     nextGrid[randIdx] = 'empty';
                     // Penalty for missing virus
                     if (type === 'virus') {
                         setHp(h => Math.max(0, h - 25));
                         setCombo(0);
                     }
                     return nextGrid;
                 }
                 return currentGrid;
             });
        }, phase === 2 ? 800 : 1200);

        return newGrid;
      });

      loopRef.current = setTimeout(spawn, spawnRate);
    };

    spawn();
    return () => { if (loopRef.current) clearTimeout(loopRef.current); };
  }, [isGameActive, phase, timeLeft]); // Re-run when phase changes

  // Click Handler
  const handleHit = (index: number) => {
    if (!isGameActive) return;
    const type = grid[index];
    if (type === 'empty' || type === 'exploding') return;

    const newGrid = [...grid];

    if (type === 'virus') {
        playSound('smash');
        newGrid[index] = 'empty';
        const points = 10 + Math.min(10, combo);
        setScore(s => s + points);
        setCombo(c => c + 1);
    } else if (type === 'bomb') {
        playSound('wrong');
        newGrid[index] = 'exploding';
        setHp(0); // Instant Die
        setTimeout(() => setIsGameActive(false), 500);
    } else if (type === 'file') {
        playSound('wrong');
        newGrid[index] = 'exploding';
        setHp(h => Math.max(0, h - 30));
        setCombo(0);
        setTimeout(() => {
            setGrid(g => { const n = [...g]; n[index] = 'empty'; return n; });
        }, 300);
    }
    
    setGrid(newGrid);
  };

  // End Screen Logic
  if (!isGameActive || hp <= 0) {
     return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-black/90 p-4 relative z-50">
            <MatrixBg />
            <div className="bg-[#111] border border-red-500/50 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl z-50">
                <div className="text-6xl mb-4">{hp <= 0 ? '💥' : '🛡️'}</div>
                <h1 className="text-3xl font-black text-white mb-2">{hp <= 0 ? 'SYSTEM CRASHED' : 'SURVIVED'}</h1>
                <div className="text-white text-5xl font-mono font-bold mb-6">{score}</div>
                <button onClick={() => { playSound('click'); router.push('/'); }} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:scale-105 transition">กลับหน้าหลัก</button>
            </div>
        </div>
     );
  }

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center p-4 overflow-hidden">
       <MatrixBg />
       
       <div className="z-10 w-full max-w-[360px] flex flex-col gap-4">
          {/* Header Stats */}
          <div className="flex justify-between items-end bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
             <div>
                <div className="text-[10px] text-gray-400 tracking-widest">TIMER</div>
                <div className={`text-4xl font-black font-mono ${phase === 2 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
             </div>
             <div className="text-right">
                <div className="text-[10px] text-blue-400 tracking-widest">COMBO</div>
                <div className="text-2xl font-black italic text-blue-300">x{combo}</div>
             </div>
          </div>

          {/* HP Bar */}
          <div className="w-full bg-gray-900 h-4 rounded-full overflow-hidden border border-gray-700 relative">
             <div className={`h-full transition-all duration-300 ${hp < 30 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500'}`} style={{ width: `${hp}%` }} />
          </div>
          
          {/* Grid */}
          <div className="virus-grid">
             {grid.map((cell, i) => (
                <div 
                  key={i} 
                  className={`virus-cell ${cell === 'virus' ? 'has-virus' : cell === 'bomb' ? 'has-bomb' : cell === 'file' ? 'has-file' : ''} ${cell === 'exploding' ? 'bg-red-500 animate-pulse' : ''}`}
                  onMouseDown={() => handleHit(i)}
                  onTouchStart={(e) => { e.preventDefault(); handleHit(i); }}
                >
                    {cell === 'virus' ? '🦠' : cell === 'bomb' ? '💣' : cell === 'file' ? '📁' : cell === 'exploding' ? '💥' : ''}
                </div>
             ))}
          </div>

          {/* Phase Alert */}
          {phase === 2 && timeLeft > 18 && (
             <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <h1 className="text-6xl font-black text-red-600 animate-bounce drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">WARNING!!</h1>
             </div>
          )}
       </div>
    </div>
  );
}