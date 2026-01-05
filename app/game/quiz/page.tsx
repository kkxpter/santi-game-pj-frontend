'use client';

// ✅ บรรทัดนี้ช่วยยืนยันกับ Next.js ว่าหน้านี้เป็น Dynamic ไม่ต้อง Prerender แบบ Static
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { questionsEasy, questionsMedium, questionsHard, Question } from '@/app/lib/gameData';
import { playSound } from '@/app/lib/sound';

// ============================================================================
// 🎮 PART 1: GAME LOGIC (ตัวเกม - รับค่า diff มาทาง Props เท่านั้น)
// ============================================================================

interface GameQuestion extends Question {
  shuffledOptions: { text: string; isCorrect: boolean }[];
}

const RANK_INFO = [
  { title: "ตู้ ATM เดินได้", icon: "💸", desc: "กดปุ๊บ เงินไหลออกปั๊บ... สแกมเมอร์รักคุณที่สุด!", color: "from-gray-400 to-gray-600" },
  { title: "น้องหมูหวาน", icon: "🐷", desc: "หวานเจี๊ยบ... เคี้ยวง่าย อร่อยเหาะสำหรับโจร", color: "from-orange-400 to-red-400" },
  { title: "ผู้ประสบภัยไซเบอร์", icon: "🥺", desc: "สู้ชีวิตนะ... แต่โดนสแกมเมอร์สู้กลับ", color: "from-green-400 to-teal-500" },
  { title: "สายสืบโซเชียล", icon: "🧐", desc: "มีแววรุ่ง! จับโป๊ะได้เกือบหมด พลาดแค่นิดเดียว", color: "from-blue-400 to-cyan-400" },
  { title: "เทพเจ้าไอที", icon: "🔮", desc: "แสงสว่างแห่งวงการ! สแกมเมอร์เห็นต้องวิ่งหนี", color: "from-purple-400 to-pink-500" },
  { title: "บิดาแห่งการจับโป๊ะ", icon: "👑", desc: "จุดสูงสุดของห่วงโซ่อาหาร! ไม่มีใครหลอกคุณได้", color: "from-yellow-300 to-amber-500" },
];

const MOCK_PLAYERS = [
  { name: "CyberGod_X", score: 500, isMe: false },
  { name: "CyberNinja_99", score: 480, isMe: false },
  { name: "Somsak_Hacker", score: 420, isMe: false },
  { name: "Nong_Mind_IT", score: 350, isMe: false },
  { name: "Cat_Lover_22", score: 300, isMe: false },
  { name: "Unknown_User", score: 200, isMe: false },
  { name: "Click_Bait_Lover", score: 100, isMe: false },
  { name: "NoobMaster69", score: 50, isMe: false },
  { name: "Internet_Explorer", score: 10, isMe: false },
  { name: "Somchai_Jaidee", score: 5, isMe: false },
];

const getGameSettings = (diff: string) => {
  if (diff === 'medium') return { timeLimit: 15000, basePoints: 30, thresholds: [0, 80, 160, 240, 320, 380], diffLabel: "โหมดทั่วไป", diffColor: "bg-yellow-500" };
  if (diff === 'hard') return { timeLimit: 10000, basePoints: 40, thresholds: [0, 100, 200, 300, 400, 475], diffLabel: "โหมดเซียน", diffColor: "bg-red-500" };
  return { timeLimit: 20000, basePoints: 20, thresholds: [0, 60, 120, 180, 240, 280], diffLabel: "โหมดเริ่มต้น", diffColor: "bg-green-500" };
};

const generateQuestions = (diff: string): GameQuestion[] => {
  const pool = diff === 'hard' ? questionsHard : diff === 'medium' ? questionsMedium : questionsEasy;
  const safePool = pool || []; 
  const selectedQuestions = [...safePool].sort(() => Math.random() - 0.5).slice(0, 10);
  
  return selectedQuestions.map(q => {
    const opts = q.options.map((text, i) => ({ text, isCorrect: i === 0 }));
    return { ...q, shuffledOptions: opts.sort(() => Math.random() - 0.5) };
  });
};

// --- ตัว Component เกมหลัก (ไม่ยุ่งกับ URL เอง) ---
function QuizGame({ diff }: { diff: string }) {
  const router = useRouter();
  const settings = getGameSettings(diff);

  const [questions] = useState<GameQuestion[]>(() => generateQuestions(diff));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  const [totalTimeUsed, setTotalTimeUsed] = useState(0);
  const [feedback, setFeedback] = useState<{show: boolean, isCorrect: boolean, desc: string, amount: number, isBonus?: boolean} | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<{name: string, score: number, isMe: boolean}[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const myScoreRef = useRef<HTMLDivElement | null>(null);

  const finishGame = useCallback(() => {
    const endTime = Date.now();
    const duration = Math.floor((endTime - gameStartTimeRef.current) / 1000);
    setTotalTimeUsed(duration);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const newBoard = [...MOCK_PLAYERS, { name: "YOU (ผู้เล่น)", score: score, isMe: true }]
      .sort((a, b) => b.score - a.score);
    
    setFinalLeaderboard(newBoard);

    if (typeof window !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
        localStorage.setItem('cyberStakes_played', JSON.stringify({ ...saved, [diff]: (saved[diff] || 0) + 1 }));
    }
  }, [diff, score]);

  const getRank = (finalScore: number) => {
    for (let i = settings.thresholds.length - 1; i >= 0; i--) {
      if (finalScore >= settings.thresholds[i]) return RANK_INFO[i];
    }
    return RANK_INFO[0];
  };

  const goToNextQuestion = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    setFeedback(null);
    setTimerProgress(100);

    setCurrentIdx(prevIdx => {
      const nextIdx = prevIdx + 1;
      if (nextIdx >= questions.length) { 
        finishGame();
        return prevIdx;
      }
      return nextIdx;
    });
  }, [finishGame, questions.length]);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('wrong');
    setFeedback({
      show: true,
      isCorrect: false,
      desc: "หมดเวลา! ไวกว่านี้หน่อยวัยรุ่น",
      amount: 0
    });
    feedbackTimerRef.current = setTimeout(() => goToNextQuestion(), 3000); 
  }, [goToNextQuestion]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / settings.timeLimit);
      setTimerProgress(remaining * 100); 
      if (remaining <= 0) handleTimeout();
    }, 50);
  }, [settings.timeLimit, handleTimeout]);

  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (feedback) return; 
    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Date.now() - startTimeRef.current;
    const isBonus = timeUsed < (settings.timeLimit / 2);
    const earned = isCorrect ? settings.basePoints + (isBonus ? 10 : 0) : 0;

    let currentScore = score; 

    if (isCorrect) {
      playSound('correct');
      currentScore += earned;
      setScore(s => s + earned);
      setCorrectCount(c => c + 1);
    } else {
      playSound('wrong');
    }

    setFeedback({
      show: true,
      isCorrect,
      desc: questions[currentIdx]?.desc || "",
      amount: earned,
      isBonus: isCorrect && isBonus
    });

    feedbackTimerRef.current = setTimeout(() => {
        if (currentIdx + 1 >= questions.length) {
             const endTime = Date.now();
             const duration = Math.floor((endTime - gameStartTimeRef.current) / 1000);
             setTotalTimeUsed(duration);
             setIsFinished(true);
             if (timerRef.current) clearInterval(timerRef.current);
             
             const newBoard = [...MOCK_PLAYERS, { name: "YOU (ผู้เล่น)", score: currentScore, isMe: true }]
               .sort((a, b) => b.score - a.score);
             setFinalLeaderboard(newBoard);
        } else {
            goToNextQuestion();
        }
    }, 3000); 
  }, [feedback, settings.timeLimit, settings.basePoints, questions, currentIdx, goToNextQuestion, score]); 

  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !isFinished) {
      startTimer();
    }
  }, [currentIdx, questions, isFinished, startTimer]);

  useEffect(() => {
    if (isFinished && myScoreRef.current) {
        setTimeout(() => {
            myScoreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500); 
    }
  }, [isFinished, finalLeaderboard]);

  if (!questions || questions.length === 0) return <div className="text-white text-center mt-20">Loading...</div>;

  if (isFinished) {
    const myRank = getRank(score);
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900 p-4 relative z-50 overflow-hidden font-sans">
        {/* Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse-slow delay-1000"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
        </div>

        <div className="relative z-10 w-full max-w-6xl bg-[#0f0f11]/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 md:p-10 shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] animate-enter overflow-hidden flex flex-col md:flex-row h-[85vh]">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-${myRank.color.split(' ')[1].replace('to-', '')} to-transparent blur-sm`}></div>

            {/* Left Side: Report */}
            <div className="flex-none w-full md:w-[40%] flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-white/5 relative z-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-zinc-400 text-xs font-mono tracking-[0.2em] font-bold">MISSION REPORT</p>
                </div>
                
                <div className="relative mb-6 group transform scale-90 md:scale-100">
                    <div className={`absolute inset-0 bg-gradient-to-r ${myRank.color} blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-full`}></div>
                    <div className="text-[7rem] md:text-[9rem] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-bounce relative z-10 transform group-hover:scale-110 transition-transform duration-500">{myRank.icon}</div>
                </div>

                <h2 className={`text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${myRank.color} mb-3 leading-tight drop-shadow-sm`}>
                    {myRank.title}
                </h2>
                <p className="text-zinc-400 text-sm italic font-light mb-8 max-w-xs leading-relaxed">
                    &quot;{myRank.desc}&quot;
                </p>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Score</p>
                        <p className="text-2xl font-black text-white">{score}</p>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Accuracy</p>
                        <p className="text-2xl font-black text-white">{correctCount}/10</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Leaderboard */}
            <div className="flex-1 flex flex-col p-4 md:pl-8 h-full overflow-hidden">
                <div className="flex-none flex items-center justify-between mb-4">
                    <h3 className="text-xl md:text-2xl text-white font-black italic tracking-wide flex items-center gap-3">
                        <span className="text-2xl">🏆</span> LEADERBOARD
                    </h3>
                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-zinc-400 font-mono">GLOBAL RANKING</span>
                </div>

                <div className="flex-1 flex flex-col gap-2 mb-4 overflow-y-auto pr-2 custom-scrollbar relative">
                    {finalLeaderboard.map((player, index) => {
                        let cardStyle = "bg-[#18181b]/50 border-white/5 text-zinc-500 min-h-[48px] border-b border-white/5"; 
                        let rankDisplay = <span className="text-xs font-mono opacity-30">#{index + 1}</span>;
                        let nameStyle = "text-xs text-zinc-400 font-medium";
                        let scoreStyle = "text-zinc-500 text-xs";
                        let avatarColor = "bg-zinc-800 text-zinc-500 w-8 h-8 text-[10px]";

                        if (index === 0) {
                            cardStyle = "bg-gradient-to-r from-[#ffd700]/10 to-black/40 border-[#ffd700]/40 text-yellow-100 min-h-[96px] transform scale-[1.00] shadow-[0_10px_30px_-5px_rgba(255,215,0,0.15)] z-10 mb-2 rounded-2xl border";
                            rankDisplay = <span className="text-3xl">👑</span>;
                            nameStyle = "text-xl text-yellow-300 font-black tracking-wide";
                            scoreStyle = "text-yellow-400 text-2xl font-black";
                            avatarColor = "bg-yellow-500 text-black shadow-[0_0_15px_#ffd700] w-12 h-12 text-base";
                        } 
                        else if (index === 1) {
                            cardStyle = "bg-gradient-to-r from-slate-200/10 to-slate-400/5 border-slate-300/40 text-slate-100 min-h-[72px] z-0 shadow-[0_0_15px_rgba(226,232,240,0.1)] rounded-xl border";
                            rankDisplay = <span className="text-2xl">🥈</span>;
                            nameStyle = "text-base text-white font-bold";
                            scoreStyle = "text-white text-lg font-bold";
                            avatarColor = "bg-slate-300 text-slate-900 w-10 h-10 text-sm font-black";
                        } 
                        else if (index === 2) {
                            cardStyle = "bg-gradient-to-r from-orange-700/10 to-black/40 border-orange-700/30 text-orange-200 min-h-[72px] z-0 rounded-xl border";
                            rankDisplay = <span className="text-2xl">🥉</span>;
                            nameStyle = "text-base text-white font-bold";
                            scoreStyle = "text-white text-lg font-bold";
                            avatarColor = "bg-orange-600 text-white w-10 h-10 text-sm";
                        }

                        if (player.isMe) {
                            cardStyle += " ring-1 ring-emerald-500 border-emerald-500/50 bg-emerald-900/20 rounded-xl";
                            if (index > 2) {
                                nameStyle = "text-emerald-400 font-bold text-sm";
                                scoreStyle = "text-emerald-300 font-bold text-sm";
                            }
                        } else if (index > 2) {
                            cardStyle = "bg-transparent border-b border-white/5 hover:bg-white/5 min-h-[40px] px-2";
                        }

                        return (
                            <div 
                                key={index} 
                                ref={player.isMe ? myScoreRef : null}
                                className={`relative flex items-center px-4 transition-all duration-300 flex-shrink-0 ${cardStyle}`}
                            >
                                <div className="flex items-center gap-4 relative z-10 w-full">
                                    <div className={`w-8 flex justify-center font-black`}>{rankDisplay}</div>
                                    
                                    {(index < 3) && (
                                        <div className={`rounded-full flex items-center justify-center font-bold shrink-0 ${avatarColor}`}>
                                            {player.name.substring(0,2).toUpperCase()}
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <div className={`${nameStyle} flex items-center gap-2`}>
                                            {player.name}
                                            {player.isMe && (
                                                <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black tracking-wider shadow-[0_0_10px_#10b981]">YOU</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`font-mono ${scoreStyle}`}>
                                        {player.score}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-none flex gap-4 mt-auto">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex-1 py-4 bg-white hover:bg-zinc-200 text-black font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1 active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        <span>เล่นอีกครั้ง</span> 🔄
                    </button>
                    <button 
                        onClick={() => router.push('/')} 
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold rounded-2xl border border-white/10 transition-all active:scale-[0.98]"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Playing Screen
  const currentQ = questions[currentIdx];

  return (
    <div className="relative h-screen w-screen flex flex-col p-4 overflow-hidden bg-slate-900 font-sans">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      <div className={`relative z-10 flex flex-col h-full w-full max-w-3xl mx-auto transition-all duration-300 ${feedback ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <header className="relative bg-white/5 backdrop-blur-xl border border-white/10 flex justify-between items-center p-3 rounded-2xl mb-4 shadow-lg">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => { 
                        playSound('click'); 
                        if(confirm('ต้องการออกจากเกมใช่ไหม? คะแนนจะไม่ถูกบันทึกนะ')) router.push('/'); 
                    }}
                    className="w-9 h-9 bg-white/10 hover:bg-red-500/20 rounded-lg flex items-center justify-center text-white/70 hover:text-red-400 border border-white/10 hover:border-red-500/50 transition-all active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                </button>

                <div className="flex items-center gap-2 text-white font-bold text-lg">
                    <span className={`${settings.diffColor} text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm`}>
                        {settings.diffLabel}
                    </span>
                    <span className="text-white text-xl font-mono">{currentIdx + 1}<span className="text-white/40">/</span>{questions.length}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-blue-300 font-mono text-xl font-black bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
               <span>🏆</span> {score}
            </div>
        </header>

        <main className="relative flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-full h-3 bg-white/10 rounded-full mb-6 overflow-hidden border border-white/5">
                <div 
                    className={`h-full transition-all linear duration-100 ${diff === 'hard' ? 'bg-red-500 shadow-[0_0_10px_red]' : diff === 'medium' ? 'bg-yellow-400 shadow-[0_0_10px_orange]' : 'bg-green-500 shadow-[0_0_10px_lime]'}`} 
                    style={{ width: `${timerProgress}%` }}
                />
            </div>

            <div className="w-full p-8 min-h-[200px] flex items-center justify-center mb-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70"></div>
                <h2 className="text-2xl md:text-3xl font-bold text-center text-white leading-relaxed drop-shadow-md z-10">
                    {currentQ.q}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {currentQ.shuffledOptions.map((opt, i) => (
                <button 
                key={i}
                onClick={() => submitAnswer(opt.isCorrect)}
                className={`
                    relative w-full min-h-[85px] p-4 flex items-center gap-4 transition-all duration-200 cursor-pointer rounded-xl border
                    ${feedback && opt.isCorrect 
                        ? 'bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 shadow-lg'
                    }
                `}
                >
                <span className={`
                    w-10 h-10 flex items-center justify-center rounded-lg font-mono text-lg font-bold mr-3 transition-colors shrink-0
                    ${feedback && opt.isCorrect ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-400 group-hover:bg-white group-hover:text-black'}
                `}>
                    {['A','B','C','D'][i]}
                </span>
                <span className="text-left text-white font-bold text-lg leading-tight">{opt.text}</span>
                </button>
            ))}
            </div>
        </main>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
            <div className={`relative p-6 rounded-3xl border-2 text-center max-w-md w-full shadow-2xl transform transition-all animate-fade-in ${feedback.isCorrect ? 'border-green-500 bg-[#001a00]/90' : 'border-red-500 bg-[#1a0000]/90'}`}>
                <div className="text-6xl mb-3 animate-bounce">{feedback.isCorrect ? '🛡️' : '💸'}</div>
                <h2 className={`text-3xl font-black uppercase tracking-wide ${feedback.isCorrect ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'}`}>
                    {feedback.isCorrect ? 'ถูกต้อง!' : 'โดนหลอก!'}
                </h2>
                {feedback.isCorrect && (
                    <div className="flex flex-col items-center my-2">
                        <div className="text-white font-mono text-5xl font-black">+{feedback.amount}</div>
                        {feedback.isBonus && (
                            <span className="mt-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                                ⚡ Speed Bonus +10
                            </span>
                        )}
                    </div>
                )}
                <div className="bg-white/5 border-l-4 border-white/20 p-4 rounded-r-lg text-left mt-4 text-sm text-gray-200 leading-relaxed shadow-inner">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">💡 ความรู้เสริม</span>
                    {feedback.desc}
                </div>
                <button 
                    onClick={() => { playSound('click'); goToNextQuestion(); }}
                    className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white font-bold transition-all flex justify-center items-center gap-2 group cursor-pointer"
                >
                    ข้อต่อไป <span className="group-hover:translate-x-1 transition-transform"></span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 🎮 PART 3: PAGE COMPONENT (ตัวรับ URL และ Wrapper)
// ============================================================================
// เราแยก Component นี้ออกมาเพื่อห่อ Suspense ให้ถูกต้องตามหลัก Next.js
// ตัวนี้จะดึง params แล้วส่งต่อให้ QuizGame

function QuizParamWrapper() {
  const searchParams = useSearchParams();
  const diff = searchParams.get('diff') || 'easy';

  return <QuizGame diff={diff} />;
}

// นี่คือ Default Export ที่ Next.js จะเรียกใช้
export default function QuizPage() {
  return (
    // ✅ หัวใจสำคัญ: Suspense ต้องห่อ Component ที่ใช้ useSearchParams
    <Suspense fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white font-bold text-xl animate-pulse">
            Loading Game...
        </div>
    }>
        <QuizParamWrapper />
    </Suspense>
  );
}