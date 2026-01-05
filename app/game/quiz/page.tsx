'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { questionsEasy, questionsMedium, questionsHard, Question } from '@/app/lib/gameData';
import { playSound } from '@/app/lib/sound';

// --- Interfaces ---
interface GameQuestion extends Question {
  shuffledOptions: { text: string; isCorrect: boolean }[];
}

// --- Data ---
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

// --- Helpers ---
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

// ==========================================
// 🎮 1. QuizGameContent: ส่วนประมวลผลหลัก
// ==========================================
function QuizGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const diff = searchParams.get('diff') || 'easy';
  const settings = getGameSettings(diff);

  // States
  const [questions] = useState<GameQuestion[]>(() => generateQuestions(diff));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  const [feedback, setFeedback] = useState<{show: boolean, isCorrect: boolean, desc: string, amount: number, isBonus?: boolean} | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<{name: string, score: number, isMe: boolean}[]>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);

  // Logic: จบเกม
  const finishGame = useCallback(() => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const newBoard = [...MOCK_PLAYERS, { name: "YOU (ผู้เล่น)", score: score, isMe: true }]
      .sort((a, b) => b.score - a.score);
    setFinalLeaderboard(newBoard);
  }, [score]);

  // Logic: ไปข้อถัดไป
  const goToNextQuestion = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(null);
    setTimerProgress(100);

    if (currentIdx + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  }, [currentIdx, questions.length, finishGame]);

  // Logic: หมดเวลา
  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('wrong');
    setFeedback({ show: true, isCorrect: false, desc: "หมดเวลา! ไวกว่านี้หน่อยวัยรุ่น", amount: 0 });
    feedbackTimerRef.current = setTimeout(goToNextQuestion, 3000); 
  }, [goToNextQuestion]);

  // Logic: เริ่มจับเวลา
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

  // Logic: ตอบคำถาม
  const submitAnswer = (isCorrect: boolean) => {
    if (feedback) return; 
    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Date.now() - startTimeRef.current;
    const isBonus = timeUsed < (settings.timeLimit / 2);
    const earned = isCorrect ? settings.basePoints + (isBonus ? 10 : 0) : 0;

    if (isCorrect) {
      playSound('correct');
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

    feedbackTimerRef.current = setTimeout(goToNextQuestion, 3000); 
  };

  // Effects
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !isFinished && !feedback) {
      startTimer();
    }
  }, [currentIdx, isFinished, feedback, questions.length, startTimer]);

  if (!questions.length) return null;

  // --- View: สรุปผล ---
  if (isFinished) {
    const myRank = RANK_INFO.slice().reverse().find((r, i) => score >= settings.thresholds[RANK_INFO.length - 1 - i]) || RANK_INFO[0];

    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900 p-4 font-sans overflow-hidden">
        <div className="relative z-10 w-full max-w-6xl bg-[#0f0f11]/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 md:p-10 shadow-2xl flex flex-col md:flex-row h-[85vh]">
          <div className="flex-none w-full md:w-[40%] flex flex-col items-center justify-center text-center p-4">
            <h2 className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${myRank.color} mb-3`}>{myRank.title}</h2>
            <div className="text-[8rem] my-4">{myRank.icon}</div>
            <p className="text-white/70 italic mb-6">"{myRank.desc}"</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-xs text-zinc-500 uppercase">Score</p>
                <p className="text-2xl font-bold text-white">{score}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-xs text-zinc-500 uppercase">Accuracy</p>
                <p className="text-2xl font-bold text-white">{correctCount}/10</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="mt-8 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">เล่นอีกครั้ง</button>
            <button onClick={() => router.push('/')} className="mt-2 w-full py-4 text-white/50 font-bold hover:text-white">กลับหน้าหลัก</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h3 className="text-white font-bold mb-4 tracking-widest">🏆 LEADERBOARD</h3>
            {finalLeaderboard.map((p, i) => (
              <div key={i} className={`p-3 mb-2 rounded-xl flex justify-between items-center ${p.isMe ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-white/5'}`}>
                <span className="text-white font-medium">{i + 1}. {p.name} {p.isMe && "(YOU)"}</span>
                <span className="text-emerald-400 font-mono font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- View: หน้าเล่นเกม ---
  const currentQ = questions[currentIdx];

  return (
    <div className="relative h-screen w-screen flex flex-col p-4 bg-slate-900 font-sans overflow-hidden">
      <div className={`relative z-10 flex flex-col h-full w-full max-w-3xl mx-auto transition-all ${feedback ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <header className="flex justify-between items-center p-4 rounded-2xl mb-6 bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-white font-bold flex items-center gap-3">
            <span className={`${settings.diffColor} text-black text-[10px] font-black px-2 py-1 rounded uppercase`}>{settings.diffLabel}</span>
            <span className="text-lg">{currentIdx + 1} / {questions.length}</span>
          </div>
          <div className="text-blue-400 font-mono text-2xl font-black">🏆 {score}</div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full h-3 bg-white/10 rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all linear duration-100" style={{ width: `${timerProgress}%` }} />
          </div>
          <div className="w-full p-10 bg-white/5 border border-white/10 rounded-[2.5rem] mb-8 text-center shadow-xl">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">{currentQ.q}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {currentQ.shuffledOptions.map((opt, i) => (
              <button key={i} onClick={() => submitAnswer(opt.isCorrect)} className="p-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-lg hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 transition-all text-left flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-mono">{String.fromCharCode(65 + i)}</span>
                {opt.text}
              </button>
            ))}
          </div>
        </main>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`p-8 rounded-[2rem] border-2 max-w-md w-full text-center shadow-2xl ${feedback.isCorrect ? 'border-green-500 bg-green-950/90' : 'border-red-500 bg-red-950/90'}`}>
            <div className="text-7xl mb-4 animate-bounce">{feedback.isCorrect ? '🛡️' : '💸'}</div>
            <h2 className={`text-3xl font-black mb-2 ${feedback.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{feedback.isCorrect ? 'ถูกต้อง!' : 'โดนหลอก!'}</h2>
            {feedback.isCorrect && <div className="text-4xl font-mono font-black text-white mb-4">+{feedback.amount}</div>}
            <div className="bg-white/5 p-4 rounded-xl text-white/90 text-sm leading-relaxed mb-6 text-left border-l-4 border-white/20">
              <span className="block text-[10px] uppercase font-bold text-white/50 mb-1">💡 ความรู้เพิ่มเติม</span>
              {feedback.desc}
            </div>
            <button onClick={goToNextQuestion} className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors">ข้อต่อไป</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 🚀 2. QuizPage: หน้าหลักที่ Export พร้อม Suspense
// ==========================================
export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="font-black tracking-[0.3em] uppercase text-sm animate-pulse text-blue-400">Loading Cyber System...</p>
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}