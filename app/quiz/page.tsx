'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { questionsEasy, questionsMedium, questionsHard, QuestionItem } from '@/app/data/questions';
import MatrixBackground from '@/components/MatrixBackground';

// Constants: ปรับคะแนนพื้นฐานตามที่ขอ (20, 30, 40)
const DIFFICULTY_SETTINGS = {
  easy:   { time: 20, score: 20, label: "โหมดเริ่มต้น", sub: "EASY", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  medium: { time: 15, score: 30, label: "โหมดทั่วไป", sub: "NORMAL", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", glow: "shadow-yellow-500/20" },
  hard:   { time: 10, score: 40, label: "โหมดเซียน", sub: "HARD", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", glow: "shadow-rose-500/20" }
};
type ModeType = keyof typeof DIFFICULTY_SETTINGS;

export default function QuizPage() {
  const [gameState, setGameState] = useState<'bet' | 'playing' | 'end'>('bet');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [currentMode, setCurrentMode] = useState<ModeType>('easy');
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState(false);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [countdownToNext, setCountdownToNext] = useState(5);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 6 Ranks: ปรับเกณฑ์คะแนนใหม่ให้พอดีกับ Max Score 500
  const getRank = (score: number) => {
    if (score <= 100) return { title: "ลูกเจี๊ยบหลงทาง 🐥", desc: "โถ... เอ็นดูจัง ระวังโดนจับต้มซุปนะลูก รีบไปอ่านหนังสือเพิ่มด่วน!", color: "text-rose-400" };
    if (score <= 200) return { title: "นักแจก OTP 📲", desc: "ใจดีเกิ๊น! ใครขอรหัสอะไรก็ให้หมด ระวังเงินเกลี้ยงบัญชีนะจ๊ะ", color: "text-orange-400" };
    if (score <= 300) return { title: "ร.ป.ภ. กะดึก 🔦", desc: "ตาไวใช้ได้! เริ่มจับผิดเก่งแล้ว แต่บางทีก็แอบง่วงๆ บ้างนะเราอะ", color: "text-yellow-400" };
    if (score <= 380) return { title: "นักสืบโซเชียล 🧐", desc: "ส่องเก่ง! รู้ทันกลโกง มิจฉาชีพเห็นแล้วต้องถอย ปรบมือรัวๆ", color: "text-blue-400" };
    if (score <= 460) return { title: "ท่านศาสดาไอที 🤖", desc: "ชาบูๆ! เพื่อนๆ ต้องมากราบขอความรู้ ความปลอดภัยระดับเทพเจ้า", color: "text-purple-400" };
    return { title: "AI กลับชาติมาเกิด 👽", desc: "ฉลาดเกินมนุษย์! นายคือสกายเน็ตปลอมตัวมาใช่ไหม? ยอมแล้วจ้า", color: "text-emerald-400" };
  };

  const nextQuestion = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    
    setShowFeedback(false);
    
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(c => c + 1);
      setTimeLeft(DIFFICULTY_SETTINGS[currentMode].time); 
      setIsPaused(false);
    } else {
      setGameState('end');
    }
  }, [currentIdx, questions.length, currentMode]);

  const startGame = (mode: ModeType) => {
    setCurrentMode(mode);
    const settings = DIFFICULTY_SETTINGS[mode];
    setMaxTime(settings.time);
    setTimeLeft(settings.time);

    const questionPool = mode === 'easy' ? questionsEasy : mode === 'medium' ? questionsMedium : questionsHard;
    const selected = [...questionPool].sort(() => Math.random() - 0.5).slice(0, 10);

    const processed = selected.map(q => {
      const opts = q.options.map((opt, idx) => ({ opt, originalIndex: idx })).sort(() => Math.random() - 0.5);
      return { 
        ...q, 
        options: opts.map(o => o.opt), 
        ans: opts.findIndex(o => o.originalIndex === q.ans) 
      };
    });
    
    setQuestions(processed);
    setScore(0);
    setCurrentIdx(0);
    setGameState('playing');
    setIsPaused(false);
    setShowFeedback(false);
  };

  const handleAnswer = (choiceIndex: number) => {
    if (isPaused) return; 
    setIsPaused(true);

    const isCorrect = choiceIndex === questions[currentIdx].ans;
    const settings = DIFFICULTY_SETTINGS[currentMode];
    let earned = 0;

    setIsLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      earned = settings.score;
      // ✅ แก้ไข: โบนัสคงที่ 10 คะแนน ถ้าตอบทันครึ่งเวลาแรก
      if (timeLeft > maxTime / 2) {
        earned += 10; 
      }
      setScore(s => s + earned);
    }

    setLastEarnedPoints(earned);
    setShowFeedback(true);
    setCountdownToNext(5);

    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    autoNextTimerRef.current = setInterval(() => {
        setCountdownToNext((prev) => {
            if (prev <= 1) {
                if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => { 
        nextQuestion(); 
    }, 5000); 
  };

  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) { handleAnswer(-1); return 0; }
        return prev - 0.1;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, isPaused, currentIdx]); 

  useEffect(() => {
    return () => { 
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); 
        if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
    };
  }, []);

  const progressPercent = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0;
  const barGradient = timeLeft < maxTime * 0.3 ? 'from-rose-600 to-red-500' : timeLeft < maxTime * 0.6 ? 'from-yellow-500 to-orange-500' : 'from-emerald-500 to-green-400';
  const barGlow = timeLeft < maxTime * 0.3 ? 'shadow-rose-500/50' : timeLeft < maxTime * 0.6 ? 'shadow-yellow-500/50' : 'shadow-emerald-500/50';
  const playerRank = getRank(score);

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 bg-[#050505] font-sans overflow-hidden">
        
        {/* Background */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050505] to-[#050505]"></div>
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20 mix-blend-screen">
            <MatrixBackground />
        </div>

        {/* --- 1. MENU SCREEN: หน้าเลือกโหมด --- */}
        {gameState === 'bet' && (
            <div 
                className="relative z-10 w-full bg-zinc-900/40 backdrop-blur-xl rounded-[40px] p-8 text-center shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] animate-enter"
                style={{ maxWidth: '420px' }}
            >
                <div className="mb-10 relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse-slow"></div>
                    <div className="relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] text-7xl mb-2 animate-bounce">🎯</div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-wide leading-none drop-shadow-lg">เลือกระดับความยาก</h2>
                    <p className="text-emerald-400/80 text-[10px] mt-3 font-mono tracking-[0.2em] uppercase bg-emerald-500/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
                        Select Difficulty
                    </p>
                </div>
                
                <div className="space-y-4 mb-8">
                    {/* Easy */}
                    <button onClick={() => startGame('easy')} className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-emerald-900/30 hover:to-black transition-all active:scale-[0.98] border border-white/5 hover:border-emerald-500/50">
                        <div className="flex items-center gap-4 p-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all shadow-lg">🐣</div>
                            <div className="text-left">
                                <div className="text-white font-black text-lg tracking-wide group-hover:text-emerald-400 transition-colors">โหมดเริ่มต้น</div>
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 group-hover:text-zinc-300">20 วิ • ข้อละ 20(+10)</div>
                            </div>
                        </div>
                    </button>
                    
                    {/* Medium */}
                    <button onClick={() => startGame('medium')} className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-yellow-900/30 hover:to-black transition-all active:scale-[0.98] border border-white/5 hover:border-yellow-500/50">
                         <div className="flex items-center gap-4 p-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-all shadow-lg">😎</div>
                            <div className="text-left">
                                <div className="text-white font-black text-lg tracking-wide group-hover:text-yellow-400 transition-colors">โหมดทั่วไป</div>
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 group-hover:text-zinc-300">15 วิ • ข้อละ 30(+10)</div>
                            </div>
                        </div>
                    </button>

                    {/* Hard */}
                    <button onClick={() => startGame('hard')} className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 to-black hover:from-rose-900/30 hover:to-black transition-all active:scale-[0.98] border border-white/5 hover:border-rose-500/50">
                        <div className="flex items-center gap-4 p-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-2xl border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-black transition-all animate-pulse shadow-lg">🔥</div>
                            <div className="text-left">
                                <div className="text-white font-black text-lg tracking-wide group-hover:text-rose-400 transition-colors">โหมดเซียน</div>
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 group-hover:text-zinc-300">10 วิ • ข้อละ 40(+10)</div>
                            </div>
                        </div>
                    </button>
                </div>
                <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-mono tracking-widest transition-all border-b border-transparent hover:border-zinc-500 pb-1 group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> กลับสู่หน้าหลัก
                </Link>
            </div>
        )}

        {/* --- 2. PLAYING SCREEN: หน้าเล่นเกม --- */}
        {gameState === 'playing' && questions[currentIdx] && (
            <div 
                className="relative z-10 w-full 
                bg-gradient-to-b from-zinc-800/50 to-zinc-900/80 
                backdrop-blur-2xl 
                rounded-[32px] p-6 
                border border-cyan-500/20 
                shadow-[0_0_50px_-10px_rgba(6,182,212,0.2)] 
                animate-enter ring-1 ring-white/5"
                style={{ maxWidth: '700px' }} 
            >
                {/* --- Feedback Overlay (หน้าต่างแจ้งเตือน) --- */}
                {showFeedback && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-enter">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-[32px]"></div>
                        
                        <div className={`relative z-50 w-full max-w-md p-8 rounded-[30px] flex flex-col items-center gap-6 text-center transform transition-all border
                            ${isLastAnswerCorrect 
                                ? 'bg-zinc-900/95 border-emerald-500/30 shadow-[0_0_60px_-10px_rgba(16,185,129,0.4)]' 
                                : 'bg-zinc-900/95 border-rose-500/30 shadow-[0_0_60px_-10px_rgba(244,63,94,0.4)]'}
                        `}>
                            {/* Icon & Status */}
                            <div className="flex flex-col items-center gap-2">
                                <div className={`text-7xl drop-shadow-2xl ${isLastAnswerCorrect ? 'animate-bounce' : 'animate-shake'}`}>
                                    {isLastAnswerCorrect ? '✅' : '❌'}
                                </div>
                                <h2 className={`text-4xl font-black uppercase tracking-wider drop-shadow-lg ${isLastAnswerCorrect ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {isLastAnswerCorrect ? 'ถูกต้อง!' : 'ผิดแล้ว!'}
                                </h2>
                            </div>

                            {/* Score Badge */}
                            <div className={`px-6 py-2 rounded-full bg-black/60 shadow-inner border border-white/5`}>
                                <span className="text-3xl font-black font-mono tracking-tighter text-white">
                                    {isLastAnswerCorrect ? '+' : ''}{lastEarnedPoints}
                                </span>
                                <span className="text-xs font-bold text-zinc-400 ml-2 uppercase">คะแนน</span>
                            </div>
                            
                            {/* Advice Text */}
                            <div className="w-full bg-black/40 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${isLastAnswerCorrect ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-rose-500 shadow-[0_0_15px_#f43f5e]'}`}></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">💡</span>
                                    <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">เกร็ดความรู้</span>
                                </div>
                                <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                                    {questions[currentIdx].desc}
                                </p>
                            </div>

                            {/* Action Button */}
                            <div className="w-full space-y-3">
                                <button onClick={nextQuestion} 
                                    className={`w-full py-4 font-black text-lg rounded-xl transition active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 border border-white/10
                                    ${isLastAnswerCorrect 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' 
                                        : 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20'}
                                `}>
                                    <span>ข้อถัดไป</span>
                                    <span className="text-xl">➜</span>
                                </button>
                                <p className="text-[10px] text-zinc-500 font-mono tracking-widest animate-pulse">
                                    ไปต่ออัตโนมัติใน {countdownToNext} วินาที...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Game UI Header --- */}
                <div className="flex justify-between items-start mb-6 bg-zinc-800/40 p-4 rounded-2xl border border-white/5 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${DIFFICULTY_SETTINGS[currentMode].bg} ${DIFFICULTY_SETTINGS[currentMode].border} ${DIFFICULTY_SETTINGS[currentMode].glow} shadow-sm w-fit`}>
                            <span className={`w-2 h-2 rounded-full ${DIFFICULTY_SETTINGS[currentMode].bg.replace('/10','')} animate-pulse`}></span>
                            <span className={`text-xs font-black uppercase tracking-wider ${DIFFICULTY_SETTINGS[currentMode].color}`}>
                                {DIFFICULTY_SETTINGS[currentMode].label}
                            </span>
                        </div>
                         <div className="text-zinc-500 text-[10px] font-mono mt-1 tracking-widest">
                             ข้อที่ <span className="text-white font-bold">{currentIdx + 1}</span> / 10
                         </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block font-bold tracking-widest mb-1 font-mono">คะแนนรวม</span>
                        <div className="text-4xl font-black text-white font-mono leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {score}
                        </div>
                    </div>
                </div>

                {/* Timer Bar */}
                <div className="relative w-full h-2 bg-zinc-800/50 rounded-full mb-8 overflow-hidden border border-white/5 ring-1 ring-black">
                    <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-100 ease-linear bg-gradient-to-r ${barGradient} ${barGlow} shadow-sm`} 
                        style={{ width: `${progressPercent}%` }} 
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[2px] shadow-[0_0_10px_white]"></div>
                    </div>
                </div>

                {/* Question Text */}
                <div className="mb-6 relative min-h-[80px] flex items-center">
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-zinc-500/30 to-transparent"></div>
                    <div className="pl-6">
                        <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed relative">
                            <span className="text-zinc-600 font-mono mr-2 select-none text-base opacity-50">[Q]</span>
                            {questions[currentIdx].q}
                        </h2>
                    </div>
                </div>

                {/* Answers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questions[currentIdx].options.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(i)} disabled={isPaused}
                            className={`group relative p-5 rounded-xl text-left border transition-all active:scale-[0.98] overflow-hidden
                                ${isPaused ? 'opacity-50 cursor-not-allowed bg-black/40 border-white/5' : 
                                'bg-gradient-to-br from-zinc-800 to-zinc-900 border-white/10 hover:border-emerald-500/50 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]'}
                            `}
                        >
                            {!isPaused && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>}
                            
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 mt-0.5 transition-colors border
                                     ${isPaused ? 'bg-white/5 text-zinc-500 border-white/5' : 'bg-black text-emerald-400 border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500'}
                                `}>
                                    {['A','B','C','D'][i]}
                                </div>
                                <span className={`text-base font-medium leading-snug transition-colors ${isPaused ? 'text-zinc-400' : 'text-zinc-200 group-hover:text-white'}`}>
                                    {opt}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ✅ Quit Button (สวยๆ) */}
                <div className="mt-8 pt-6 border-t border-white/5">
                    <Link href="/" className="group w-full py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        <span className="w-5 h-5 rounded-full border border-rose-500/50 flex items-center justify-center text-[10px] text-rose-500 group-hover:bg-rose-500 group-hover:text-black transition-all">✕</span>
                        <span className="text-rose-500 font-bold text-xs tracking-widest group-hover:text-rose-400 transition-colors font-mono">ยกเลิกภารกิจ (QUIT)</span>
                    </Link>
                </div>
            </div>
        )}

        {/* --- 3. END SCREEN: จบเกม --- */}
        {gameState === 'end' && (
            <div 
                className="relative z-10 w-full bg-zinc-900/40 backdrop-blur-xl rounded-[40px] p-8 text-center shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] animate-enter"
                style={{ maxWidth: '420px' }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-emerald-500 shadow-[0_0_25px_#10b981]"></div>

                <div className="text-7xl mb-4 drop-shadow-lg animate-bounce mt-6">🏆</div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-1 drop-shadow-lg">จบเกม!</h2>
                <p className="text-zinc-500 text-[10px] mb-8 font-mono tracking-widest">{`/// MISSION COMPLETE ///`}</p>
                
                <div className="bg-black/40 border border-white/5 p-8 rounded-3xl mb-8 relative shadow-inner">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">คะแนนสุทธิ</p>
                    <p className={`text-6xl font-black font-mono tracking-tighter ${playerRank.color} drop-shadow-xl`}>
                        {score}
                    </p>
                    <div className="w-full h-px bg-white/5 my-4"></div>
                    <p className={`text-xl font-black ${playerRank.color}`}>{playerRank.title}</p>
                    <p className="text-xs text-zinc-500 mt-1 italic">&quot;{playerRank.desc}&quot;</p>
                </div>

                <div className="space-y-4">
                    <button onClick={() => setGameState('bet')} className="w-full py-4 bg-white text-black font-black text-base rounded-2xl hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:scale-[0.98]">
                        เล่นอีกครั้ง 🔄
                    </button>
                    <Link href="/" className="block w-full py-4 text-zinc-400 hover:text-white text-xs font-bold border border-white/10 rounded-2xl hover:bg-white/5 transition tracking-wider">
                        [ กลับหน้าหลัก ]
                    </Link>
                </div>
            </div>
        )}
    </div>
  );
}