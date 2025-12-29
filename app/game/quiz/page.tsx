'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MatrixBg from '@/components/MatrixBg';
import { questionsEasy, questionsMedium, questionsHard, Question } from '@/app/lib/gameData';
import { playSound } from '@/app/lib/sound';

interface GameQuestion extends Question {
  shuffledOptions: { text: string; isCorrect: boolean }[];
}

// 🏆 ข้อมูลแรงค์ (ชื่อ, ไอคอน, สี) - ตัด percent ออก เพราะจะไปเช็คคะแนนดิบแทน
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

  // --- ⚙️ Settings & Score Thresholds ---
  let timeLimit = 20000;
  let basePoints = 20;
  
  // กำหนดเกณฑ์คะแนนขั้นต่ำของแต่ละแรงค์ (เรียงจาก น้อย -> มาก: 0 ถึง 5)
  // [Rank 0, Rank 1, Rank 2, Rank 3, Rank 4, Rank 5]
  let thresholds: number[] = []; 

  if (diff === 'medium') {
    timeLimit = 15000;
    basePoints = 30; // Max 400
    // เกณฑ์คะแนนสำหรับ Normal (เต็ม 400)
    thresholds = [0, 80, 160, 240, 320, 380];
  } else if (diff === 'hard') {
    timeLimit = 10000;
    basePoints = 40; // Max 500
    // เกณฑ์คะแนนสำหรับ Hard (เต็ม 500)
    thresholds = [0, 100, 200, 300, 400, 475];
  } else {
    // Easy (Default)
    timeLimit = 20000; 
    basePoints = 20; // Max 300
    // เกณฑ์คะแนนสำหรับ Easy (เต็ม 300)
    thresholds = [0, 60, 120, 180, 240, 280];
  }

  // คำนวณคะแนนเต็มเพื่อใช้แสดงผล (Max Score)
  const maxPossibleScore = 10 * (basePoints + 10);

  // --- State ---
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  
  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [feedback, setFeedback] = useState<{show: boolean, isCorrect: boolean, desc: string, amount: number, isBonus?: boolean} | null>(null);

  // --- Functions ---

  const finishGame = useCallback(() => {
    setIsFinished(true);
    const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
    localStorage.setItem('cyberStakes_played', JSON.stringify({ ...saved, normal: (saved.normal || 0) + 1 }));
  }, []);

  // 🏆 ฟังก์ชันคำนวณแรงค์จากคะแนนดิบ
  const getRank = (finalScore: number) => {
    // วนลูปเช็คจากแรงค์สูงสุดลงมา
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (finalScore >= thresholds[i]) {
        return RANK_INFO[i];
      }
    }
    return RANK_INFO[0]; // กันเหนียว (ต่ำสุด)
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
    feedbackTimerRef.current = setTimeout(() => {
        goToNextQuestion();
    }, 5000); 
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
      
      if (remaining <= 0) {
        handleTimeout();
      }
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
    feedbackTimerRef.current = setTimeout(() => {
        goToNextQuestion();
    }, 5000); 
  }, [feedback, timeLimit, basePoints, questions, currentIdx, goToNextQuestion]); 


  // --- Effects ---
  useEffect(() => {
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
  }, [diff]);

  useEffect(() => {
    if (questions.length > 0 && !isFinished) {
        startQuestion();
    }
  }, [currentIdx, questions, isFinished, startQuestion]);

  // --- Render ---

  // หน้าจบเกม (แสดงแรงค์)
  if (isFinished) {
    const myRank = getRank(score); // ✅ ใช้ฟังก์ชัน getRank แบบใหม่

    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-black/90 p-4 relative z-50">
        <MatrixBg />
        <div className="bg-[#111] border border-white/20 p-8 rounded-3xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(0,255,100,0.2)] z-50 animate-fade-in relative overflow-hidden">
          
          {/* แสงพื้นหลังตามสีแรงค์ */}
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${myRank.color}`}></div>
          <div className={`absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r ${myRank.color} rounded-full blur-[80px] opacity-20`}></div>

          {/* Icon Rank */}
          <div className="text-8xl mb-4 animate-bounce drop-shadow-2xl">{myRank.icon}</div>
          
          {/* ชื่อแรงค์ */}
          <h2 className={`text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r ${myRank.color}`}>
            {myRank.title}
          </h2>
          
          {/* คำนิยามกวนๆ */}
          <p className="text-gray-400 text-xs italic mb-6">{myRank.desc}</p>
          
          {/* กล่องคะแนน */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 flex justify-between items-center">
            <div className="text-left">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">SCORE</p>
                <p className="text-white text-3xl font-mono font-black">{score}</p>
            </div>
            <div className="text-right">
                 <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">MAX</p>
                 <p className="text-gray-400 text-xl font-mono font-bold">/{maxPossibleScore}</p>
            </div>
          </div>

          <button onClick={() => { playSound('click'); router.push('/'); }} className="w-full bg-white hover:bg-green-400 hover:text-white text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg">
            เล่นใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  if (!currentQ || questions.length === 0) {
    return <div className="text-white text-center mt-20 animate-pulse text-xl font-bold">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col p-4 overflow-hidden">
      <MatrixBg />
      
      <header className="glass-panel flex justify-between items-center p-3 rounded-2xl mb-4 z-10 w-full max-w-3xl mx-auto">
        <div className="text-white font-bold text-lg flex items-center gap-2">
            <span className="bg-white/10 px-2 py-0.5 rounded text-sm">Level</span> 
            {currentIdx + 1}/{questions.length}
        </div>
        <div className="flex items-center gap-2 text-blue-300 font-mono text-xl font-black bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30">
          <span>🏆</span> {score}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-3xl mx-auto relative">
        <div className="w-full h-3 bg-gray-800 rounded-full mb-6 overflow-hidden border border-gray-700 shadow-inner">
          <div 
            className={`h-full transition-all linear duration-100 ${diff === 'hard' ? 'bg-red-500 shadow-[0_0_10px_red]' : diff === 'medium' ? 'bg-yellow-400 shadow-[0_0_10px_orange]' : 'bg-green-500 shadow-[0_0_10px_lime]'}`} 
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        <div className="cyber-panel w-full p-6 md:p-10 min-h-[200px] flex items-center justify-center mb-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-50"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white leading-relaxed drop-shadow-md z-10">
                {currentQ.q}
            </h2>
        </div>

        {feedback && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 rounded-3xl animate-fade-in">
             <div className={`relative p-6 rounded-3xl border-2 text-center max-w-md w-full shadow-2xl transform transition-all ${feedback.isCorrect ? 'border-green-500 bg-[#001a00]' : 'border-red-500 bg-[#1a0000]'}`}>
                
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
                  className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white font-bold transition-all flex justify-center items-center gap-2 group"
                >
                    ข้อต่อไป <span className="group-hover:translate-x-1 transition-transform"></span>
                </button>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {currentQ.shuffledOptions.map((opt, i) => (
             <button 
               key={i}
               disabled={feedback !== null}
               onClick={() => submitAnswer(opt.isCorrect)}
               className={`
                 btn-control min-h-[85px] group
                 ${feedback && opt.isCorrect ? '!bg-green-900/80 !border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}
                 ${feedback && !opt.isCorrect && feedback.show ? 'opacity-40 grayscale' : ''}
               `}
             >
               <span className={`
                 w-10 h-10 flex items-center justify-center rounded-lg font-mono text-lg font-bold mr-3 transition-colors
                 ${feedback && opt.isCorrect ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-400 group-hover:bg-green-500 group-hover:text-black'}
               `}>
                 {['A','B','C','D'][i]}
               </span>
               <span className="text-left text-white font-bold text-lg leading-tight">{opt.text}</span>
             </button>
          ))}
        </div>
      </main>
    </div>
  );
}