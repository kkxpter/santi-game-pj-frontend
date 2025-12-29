'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// import MatrixBg from '@/components/MatrixBg'; // ❌ เอาออกตามธีมใหม่
import { questionsEasy, questionsMedium, questionsHard, Question } from '@/app/lib/gameData';
import { playSound } from '@/app/lib/sound';

interface GameQuestion extends Question {
  shuffledOptions: { text: string; isCorrect: boolean }[];
}

// 🏆 Rank Data
const RANK_INFO = [
  { title: "ตู้ ATM เดินได้", icon: "💸", desc: "กดปุ๊บ เงินไหลออกปั๊บ... สแกมเมอร์รักคุณที่สุด!", color: "from-gray-400 to-gray-600" },
  { title: "น้องหมูหวาน", icon: "🐷", desc: "หวานเจี๊ยบ... เคี้ยวง่าย อร่อยเหาะสำหรับโจร", color: "from-orange-400 to-red-400" },
  { title: "ผู้ประสบภัยไซเบอร์", icon: "🥺", desc: "สู้ชีวิตนะ... แต่โดนสแกมเมอร์สู้กลับ", color: "from-green-400 to-teal-500" },
  { title: "สายสืบโซเชียล", icon: "🧐", desc: "มีแววรุ่ง! จับโป๊ะได้เกือบหมด พลาดแค่นิดเดียว", color: "from-blue-400 to-cyan-400" },
  { title: "เทพเจ้าไอที", icon: "🔮", desc: "แสงสว่างแห่งวงการ! สแกมเมอร์เห็นต้องวิ่งหนี", color: "from-purple-400 to-pink-500" },
  { title: "บิดาแห่งการจับโป๊ะ", icon: "👑", desc: "จุดสูงสุดของห่วงโซ่อาหาร! ไม่มีใครหลอกคุณได้", color: "from-yellow-300 to-amber-500" },
];

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const diff = searchParams.get('diff') || 'easy';

  // --- ⚙️ Settings ---
  let timeLimit = 20000;
  let basePoints = 20;
  let thresholds: number[] = []; 

  if (diff === 'medium') {
    timeLimit = 15000; basePoints = 30;
    thresholds = [0, 80, 160, 240, 320, 380];
  } else if (diff === 'hard') {
    timeLimit = 10000; basePoints = 40;
    thresholds = [0, 100, 200, 300, 400, 475];
  } else {
    timeLimit = 20000; basePoints = 20;
    thresholds = [0, 60, 120, 180, 240, 280];
  }

  const maxPossibleScore = 10 * (basePoints + 10);

  // --- State ---
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  
  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const [totalTimeUsed, setTotalTimeUsed] = useState(0);

  const [feedback, setFeedback] = useState<{show: boolean, isCorrect: boolean, desc: string, amount: number, isBonus?: boolean} | null>(null);

  // --- Functions ---

  const finishGame = useCallback(() => {
    const endTime = Date.now();
    const duration = Math.floor((endTime - gameStartTimeRef.current) / 1000);
    setTotalTimeUsed(duration);

    setIsFinished(true);
    const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
    localStorage.setItem('cyberStakes_played', JSON.stringify({ ...saved, normal: (saved.normal || 0) + 1 }));
  }, []);

  const getRank = (finalScore: number) => {
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (finalScore >= thresholds[i]) return RANK_INFO[i];
    }
    return RANK_INFO[0];
  };

  const goToNextQuestion = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    setFeedback(null);

    setCurrentIdx(prevIdx => {
        const nextIdx = prevIdx + 1;
        if (nextIdx >= 10) { 
            finishGame();
            return prevIdx;
        }
        return nextIdx;
    });
  }, [finishGame]);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('wrong');
    setFeedback({
        show: true,
        isCorrect: false,
        desc: "หมดเวลา! ไวกว่านี้หน่อยวัยรุ่น",
        amount: 0
    });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => goToNextQuestion(), 5000); 
  }, [goToNextQuestion]);

  const startQuestion = useCallback(() => {
    setTimerProgress(100);
    setFeedback(null);
    startTimeRef.current = Date.now();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / timeLimit);
      setTimerProgress(remaining * 100);
      if (remaining <= 0) handleTimeout();
    }, 50);
  }, [timeLimit, handleTimeout]);

  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (feedback) return; 
    if (timerRef.current) clearInterval(timerRef.current);

    const timeUsed = Date.now() - startTimeRef.current;
    const isBonus = timeUsed < (timeLimit / 2);
    const earned = isCorrect ? basePoints + (isBonus ? 10 : 0) : 0;

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

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => goToNextQuestion(), 5000); 
  }, [feedback, timeLimit, basePoints, questions, currentIdx, goToNextQuestion]); 

  // --- Effects ---
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    const pool = diff === 'hard' ? questionsHard : diff === 'medium' ? questionsMedium : questionsEasy;
    const selectedQuestions = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    const preparedQuestions: GameQuestion[] = selectedQuestions.map(q => {
        const opts = q.options.map((text, i) => ({ text, isCorrect: i === 0 }));
        return {
            ...q,
            shuffledOptions: opts.sort(() => Math.random() - 0.5)
        };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setQuestions(preparedQuestions);
    setCurrentIdx(0);
    setScore(0);
    setCorrectCount(0);
  }, [diff]);

  useEffect(() => {
    if (questions.length > 0 && !isFinished) {
        startQuestion();
    }
  }, [currentIdx, questions, isFinished, startQuestion]);

  // --- Render ---

  // หน้าจบเกม
  if (isFinished) {
    const myRank = getRank(score);

    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 p-4 relative z-50 overflow-hidden font-sans">
        
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
        </div>

        <div className="relative w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 animate-fade-in z-10 shadow-2xl overflow-hidden">
          
          {/* Rank Color Line */}
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${myRank.color}`}></div>
          
          <div className="text-8xl mb-4 animate-bounce drop-shadow-2xl text-center">{myRank.icon}</div>
          <h2 className={`text-2xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r ${myRank.color}`}>
            {myRank.title}
          </h2>
          <p className="text-gray-300 text-xs italic mb-6 text-center">{myRank.desc}</p>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
             <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">SCORE</p>
                <div className="flex items-end justify-center gap-1">
                    <span className="text-white text-2xl font-black">{score}</span>
                    <span className="text-gray-500 text-xs mb-1">/{maxPossibleScore}</span>
                </div>
             </div>
             <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">ACCURACY</p>
                <div className="flex items-end justify-center gap-1">
                    <span className={`text-2xl font-black ${correctCount >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>{correctCount}</span>
                    <span className="text-gray-500 text-xs mb-1">/10 ข้อ</span>
                </div>
             </div>
             <div className="bg-white/5 rounded-xl p-3 border border-white/10 col-span-2 text-center">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">TOTAL TIME</p>
                <p className="text-blue-300 text-xl font-mono font-black">{totalTimeUsed} วินาที</p>
             </div>
          </div>

          <button onClick={() => { playSound('click'); router.push('/'); }} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  if (!currentQ || questions.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white font-bold animate-pulse">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col p-4 overflow-hidden bg-slate-900 font-sans">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* Back Button */}
      <button 
        onClick={() => { 
            playSound('click'); 
            if(confirm('ต้องการออกจากเกมใช่ไหม? คะแนนจะไม่ถูกบันทึกนะ')) router.push('/'); 
        }}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-red-500/20 hover:border-red-500 transition-all hover:scale-110"
      >
        ✕
      </button>

      {/* ✅ Game Content Wrapper */}
      {/* ส่วนนี้จะถูกครอบไว้ ถ้ามี feedback จะถูกฟรีซและทำให้จางลงทันที */}
      <div className={`relative z-10 flex flex-col h-full w-full max-w-3xl mx-auto transition-all duration-300 ${feedback ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        
        {/* Header */}
        <header className="relative bg-white/5 backdrop-blur-xl border border-white/10 flex justify-between items-center p-3 rounded-2xl mb-4 pl-16 shadow-lg">
            <div className="text-white font-bold text-lg flex items-center gap-2">
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs tracking-wider">LEVEL</span> 
                {currentIdx + 1}/{questions.length}
            </div>
            <div className="flex items-center gap-2 text-blue-300 font-mono text-xl font-black bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30">
            <span>🏆</span> {score}
            </div>
        </header>

        {/* Game Area */}
        <main className="relative flex-1 flex flex-col items-center justify-center w-full">
            
            {/* Timer Bar */}
            <div className="w-full h-3 bg-white/10 rounded-full mb-6 overflow-hidden border border-white/5">
            <div 
                className={`h-full transition-all linear duration-100 ${diff === 'hard' ? 'bg-red-500 shadow-[0_0_10px_red]' : diff === 'medium' ? 'bg-yellow-400 shadow-[0_0_10px_orange]' : 'bg-green-500 shadow-[0_0_10px_lime]'}`} 
                style={{ width: `${timerProgress}%` }}
            />
            </div>

            {/* Question Card */}
            <div className="w-full p-8 min-h-[200px] flex items-center justify-center mb-6 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70"></div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-center text-white leading-relaxed drop-shadow-md z-10">
                    {currentQ.q}
                </h2>
            </div>

            {/* Answer Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {currentQ.shuffledOptions.map((opt, i) => (
                <button 
                key={i}
                // disabled={feedback !== null} // ไม่ต้องใช้แล้วเพราะเรา block ที่ wrapper ใหญ่แทน
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

      {/* ✅ Feedback Overlay (อยู่นอก Wrapper เพื่อไม่ให้โดนจางลง) */}
      {feedback && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            {/* Dim Layer (เพิ่มความมืดอีกชั้น) */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

            {/* Modal Card */}
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