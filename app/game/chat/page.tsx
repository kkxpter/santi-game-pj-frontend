'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MatrixBg from '@/components/MatrixBg';
// ตรวจสอบ Path นี้ให้ถูกต้องตามโฟลเดอร์ของคุณ
import { playSound } from '@/app/lib/sound'; 
import { chatData, ChatScenario, Choice } from './data';

// Message Type for internal state
type Message = {
  type: 'scam' | 'user' | 'system' | 'slip' | 'data';
  text?: string;
  icon?: string;
};

export default function ChatGamePage() {
  const router = useRouter();
  
  // --- Game State ---
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<ChatScenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<[Choice, Choice] | null>(null);
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    title: string;
    desc: string;
    icon: string;
  } | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);

  const chatBoxRef = useRef<HTMLDivElement>(null);

  // --- Helper Functions ---

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      setTimeout(() => {
        chatBoxRef.current!.scrollTop = chatBoxRef.current!.scrollHeight;
      }, 50);
    }
  };

  // ✅ ประกาศฟังก์ชัน Logic ต่างๆ ก่อน (เพื่อให้ useEffect เรียกใช้ได้)

  const runChatSequence = async (msgs: string[]) => {
    setShowChoices(false);
    
    for (const msg of msgs) {
      await new Promise(r => setTimeout(r, 600)); // Wait before typing
      setIsTyping(true);
      scrollToBottom();
      
      await new Promise(r => setTimeout(r, 1200)); // Typing duration
      setIsTyping(false);
      
      setMessages(prev => [...prev, { type: 'scam', text: msg }]);
      playSound('click'); 
      scrollToBottom();
    }

    setTimeout(() => {
        setShowChoices(true);
        scrollToBottom();
    }, 500);
  };

  const loadScenario = (scenario: ChatScenario) => {
    setCurrentScenario(scenario);
    setMessages([]);
    setShowChoices(false);
    setCurrentChoices(scenario.choices);
    runChatSequence(scenario.msgs);
  };

  const goToNextScenario = useCallback(() => {
    setCurrentScenarioIdx(prev => {
        const next = prev + 1;
        if (next >= chatData.length) {
            setIsGameFinished(true);
            const saved = JSON.parse(localStorage.getItem('cyberStakes_played') || '{}');
            localStorage.setItem('cyberStakes_played', JSON.stringify({ ...saved, chat: (saved.chat || 0) + 1 }));
            return prev;
        }
        loadScenario(chatData[next]);
        return next;
    });
  }, []);

  const showFeedback = (choice: Choice, isWin: boolean) => {
    setFeedback({
        show: true,
        isCorrect: isWin,
        title: choice.memeTitle || (isWin ? "NICE!" : "OH NO!"),
        desc: choice.memeDesc || "",
        icon: choice.memeIcon || (isWin ? "😎" : "💀")
    });

    if (isWin) playSound('correct');
    else playSound('wrong');

    setTimeout(() => {
        setFeedback(null);
        goToNextScenario();
    }, 4500);
  };

  const handleWin = (choice: Choice) => {
    setMessages(prev => [...prev, { type: 'scam', text: choice.reaction }]);
    playSound('correct');
    scrollToBottom();
    setTimeout(() => showFeedback(choice, true), 1500);
  };

  const handleLoss = (choice: Choice) => {
    const lossType = choice.lossType || currentScenario?.lossType || 'money';
    
    setTimeout(() => {
        setMessages(prev => [...prev, { 
            type: lossType === 'money' ? 'slip' : 'data',
            text: lossType === 'money' ? 'โอนเงินสำเร็จ' : 'ส่งข้อมูลสำเร็จ',
            icon: lossType === 'money' ? '💸' : '📁'
        }]);
        playSound('wrong');
        scrollToBottom();

        setTimeout(() => {
            setMessages(prev => [...prev, { type: 'scam', text: choice.reaction }]);
            
            setTimeout(() => {
                setMessages(prev => [...prev, { type: 'system', text: "🚫 ผู้ใช้นี้ไม่สามารถติดต่อได้ (Blocked)" }]);
                playSound('wrong');
                scrollToBottom();
                setTimeout(() => showFeedback(choice, false), 2000);
            }, 1500);
        }, 1500);
    }, 500);
  };

  const handleChoice = (choice: Choice) => {
    setShowChoices(false);
    setMessages(prev => [...prev, { type: 'user', text: choice.text }]);
    playSound('click');
    scrollToBottom();

    setTimeout(() => {
        if (choice.isCorrect === false) {
            handleLoss(choice);
        } 
        else if (choice.next) {
            if (choice.reaction) {
                setMessages(prev => [...prev, { type: 'scam', text: choice.reaction }]);
                scrollToBottom();
            }
            setTimeout(() => {
                setCurrentChoices(choice.next!.choices);
                runChatSequence(choice.next!.msgs);
            }, 1000);
        } 
        else if (choice.isCorrect === true) {
            handleWin(choice);
        }
    }, 800);
  };

  // ✅ ย้าย useEffect มาไว้ตรงนี้! (หลังจากประกาศ loadScenario แล้ว)
  useEffect(() => {
    // Shuffle scenarios once on mount
    const shuffled = [...chatData].sort(() => Math.random() - 0.5);
    loadScenario(shuffled[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---

  if (isGameFinished) {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-black/90 p-4 relative z-50">
          <MatrixBg />
          <div className="bg-[#111] border border-white/20 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="text-8xl mb-6 animate-bounce">🎬</div>
            <h1 className="text-4xl font-black text-white mb-4">จบเกม!</h1>
            <p className="text-gray-400 mb-8">คุณผ่านครบทุกสถานการณ์แล้ว</p>
            <button onClick={() => { playSound('click'); window.location.reload(); }} className="w-full bg-white text-black font-bold py-3 rounded-xl mb-3 hover:bg-gray-200">เล่นใหม่</button>
            <button onClick={() => { playSound('click'); router.push('/'); }} className="w-full bg-transparent border border-white/30 text-white font-bold py-3 rounded-xl hover:bg-white/10">กลับหน้าหลัก</button>
          </div>
        </div>
    );
  }

  return (
    <div className="relative h-screen w-screen flex justify-center items-center bg-black overflow-hidden font-sans">
      <MatrixBg />

      <div className="relative w-full h-full max-w-md md:h-[800px] md:border-4 md:border-gray-800 md:rounded-[40px] bg-[#18181b] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-xl z-50 hidden md:flex justify-end items-center pr-3">
            <div className="w-2 h-2 rounded-full bg-[#1a1a1a] border border-[#333]"></div>
        </div>

        {/* Header */}
        <header className="bg-zinc-900/95 backdrop-blur-md p-4 pt-12 md:pt-4 border-b border-zinc-800 flex items-center gap-3 z-20 shrink-0">
            <button onClick={() => router.push('/')} className="text-2xl text-gray-400 hover:text-white">❮</button>
            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-green-500 flex items-center justify-center text-xl">
                {currentScenario?.avatar || "?"}
            </div>
            <div>
                <h3 className="text-white font-bold text-lg truncate w-48">{currentScenario?.name || "Loading..."}</h3>
                <p className="text-[10px] text-green-400 animate-pulse flex items-center gap-1">● Active Now</p>
            </div>
        </header>

        {/* Chat Box */}
        <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth pb-32">
            {messages.map((msg, i) => {
                if (msg.type === 'scam') {
                    return (
                        <div key={i} className="self-start max-w-[85%] p-3 rounded-2xl rounded-bl-sm bg-zinc-800 text-gray-200 animate-fade-in">
                            {msg.text}
                        </div>
                    );
                } else if (msg.type === 'user') {
                    return (
                        <div key={i} className="self-end max-w-[85%] p-3 rounded-2xl rounded-br-sm bg-green-500 text-black font-bold animate-fade-in shadow-lg shadow-green-500/10">
                            {msg.text}
                        </div>
                    );
                } else if (msg.type === 'system') {
                    return (
                        <div key={i} className="self-center bg-red-900/20 text-red-400 border border-red-900/50 text-xs px-3 py-1 rounded-full my-2">
                            {msg.text}
                        </div>
                    );
                } else if (msg.type === 'slip' || msg.type === 'data') {
                    return (
                        <div key={i} className={`self-end w-36 p-2 rounded-xl text-center border text-xs animate-pop-in mb-1 ${msg.type === 'slip' ? 'bg-white text-black border-gray-300' : 'bg-slate-900 text-sky-400 border-sky-600'}`}>
                            <div className="text-3xl mb-1">{msg.icon}</div>
                            {msg.text}
                        </div>
                    );
                }
            })}

            {isTyping && (
                <div className="self-start p-3 bg-zinc-800 rounded-2xl rounded-bl-sm flex gap-1 w-fit animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                </div>
            )}
        </div>

        {/* Choice Panel */}
        <div className={`absolute bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-zinc-700 p-5 transition-transform duration-500 rounded-t-3xl z-30 ${showChoices ? 'translate-y-0' : 'translate-y-full'}`}>
            <h2 className="text-sm font-bold text-green-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                <span className="animate-pulse">⚡</span> Response Required
            </h2>
            <div className="flex flex-col gap-3">
                {currentChoices?.map((choice, i) => (
                    <button 
                        key={i}
                        onClick={() => handleChoice(choice)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 active:scale-98 transition-all group text-left"
                    >
                        <span className="w-6 h-6 flex items-center justify-center bg-green-600 text-black font-bold text-xs rounded group-hover:bg-white transition-colors shrink-0">
                            {['A', 'B'][i]}
                        </span>
                        <span className="text-gray-200 text-sm group-hover:text-white">{choice.text}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Feedback Overlay */}
        {feedback && (
            <div className={`absolute inset-0 z-40 flex flex-col justify-center items-center text-center p-6 backdrop-blur-xl animate-fade-in ${feedback.isCorrect ? 'bg-green-900/90' : 'bg-red-900/90'}`}>
                <div className={`text-9xl mb-6 drop-shadow-2xl ${feedback.isCorrect ? 'animate-bounce' : 'animate-pulse grayscale'}`}>
                    {feedback.icon}
                </div>
                <h2 className={`text-4xl font-black mb-3 ${feedback.isCorrect ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-yellow-300' : 'text-red-500'}`}>
                    {feedback.title}
                </h2>
                <p className="text-gray-200 text-lg font-medium">{feedback.desc}</p>
            </div>
        )}

      </div>
    </div>
  );
}