'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/app/lib/sound';
import { chatData, ChatScenario, Choice } from './data';

type Message = {
  type: 'scam' | 'user' | 'system' | 'slip' | 'data';
  text?: string;
  icon?: string;
};

export default function ChatGamePage() {
  const router = useRouter();
  
  // --- State ---
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<ChatScenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<[Choice, Choice] | null>(null);
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; title: string; desc: string; icon: string; } | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);

  // Refs
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const hasLoaded = useRef(false);

  // Helper Functions
  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      setTimeout(() => {
        chatBoxRef.current!.scrollTop = chatBoxRef.current!.scrollHeight;
      }, 50);
    }
  };

  const runChatSequence = async (msgs: string[]) => {
    const currentRunId = ++runIdRef.current;
    setShowChoices(false);
    
    for (const msg of msgs) {
      await new Promise(r => setTimeout(r, 600)); 
      if (runIdRef.current !== currentRunId) return;

      setIsTyping(true);
      scrollToBottom();

      await new Promise(r => setTimeout(r, 1200)); 
      if (runIdRef.current !== currentRunId) return;

      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'scam', text: msg }]);
      playSound('click'); 
      scrollToBottom();
    }

    setTimeout(() => { 
        if (runIdRef.current !== currentRunId) return;
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
    if (isWin) playSound('correct'); else playSound('wrong');
    setTimeout(() => { setFeedback(null); goToNextScenario(); }, 4500);
  };

  const handleWin = (choice: Choice) => {
    setMessages(prev => [...prev, { type: 'scam', text: choice.reaction }]);
    playSound('correct');
    scrollToBottom();
    setTimeout(() => showFeedback(choice, true), 1500);
  };

  const handleLoss = (choice: Choice) => {
    const lossType = choice.lossType || currentScenario?.lossType || 'money';
    const currentRunId = runIdRef.current;

    setTimeout(() => {
        if (runIdRef.current !== currentRunId) return;
        setMessages(prev => [...prev, { 
            type: lossType === 'money' ? 'slip' : 'data',
            text: lossType === 'money' ? 'โอนเงินสำเร็จ' : 'ส่งข้อมูลสำเร็จ',
            icon: lossType === 'money' ? '💸' : '📁'
        }]);
        playSound('wrong');
        scrollToBottom();
        setTimeout(() => {
            if (runIdRef.current !== currentRunId) return;
            setMessages(prev => [...prev, { type: 'scam', text: choice.reaction }]);
            setTimeout(() => {
                if (runIdRef.current !== currentRunId) return;
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
        if (choice.isCorrect === false) handleLoss(choice);
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
        else if (choice.isCorrect === true) handleWin(choice);
    }, 800);
  };

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    const shuffled = [...chatData].sort(() => Math.random() - 0.5);
    loadScenario(shuffled[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Components ---

  const ChoiceButtons = () => (
    <div className="flex flex-col gap-3 w-full">
        {currentChoices?.map((choice, i) => (
            <button 
                key={i}
                onClick={() => handleChoice(choice)}
                className="group relative w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:border-white/30 hover:shadow-lg active:scale-[0.99] text-left"
            >
                {/* Icon Box */}
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg shrink-0 shadow-inner transition-colors ${i === 0 ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white' : 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400 group-hover:from-purple-500 group-hover:to-purple-600 group-hover:text-white'}`}>
                    {['A', 'B'][i]}
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm font-medium group-hover:text-white leading-snug">
                        {choice.text}
                    </p>
                </div>
            </button>
        ))}
    </div>
  );

  // --- Render ---

  if (isGameFinished) {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 p-4 relative z-50 overflow-hidden font-sans">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
             {/* ... background animations ... */}
          </div>
          <div className="relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] text-center max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="text-8xl mb-6 animate-bounce drop-shadow-xl">🎬</div>
            <h1 className="text-4xl font-black text-white mb-4 drop-shadow-md">จบเกม!</h1>
            <button onClick={() => { playSound('click'); window.location.reload(); }} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl mb-3 shadow-lg transition-transform hover:scale-105">เล่นใหม่</button>
            <button onClick={() => { playSound('click'); router.push('/'); }} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 rounded-xl transition-all">กลับหน้าหลัก</button>
          </div>
        </div>
    );
  }

  return (
    <div className="relative h-screen w-screen flex justify-center items-center bg-slate-900 overflow-hidden font-sans">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow mix-blend-screen"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-600/20 blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* Main Wrapper */}
      <div className="relative z-10 flex items-center justify-center">

        {/* --- Phone Frame (Center) --- */}
        <div className="relative z-20 w-[320px] h-[600px] md:h-[650px] md:border-[8px] md:border-gray-800 md:rounded-[40px] bg-gray-900/90 flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-white/10 shrink-0">
            {/* ... Dynamic Island, Header, Chat Box (เหมือนเดิม) ... */}
            
            {/* Dynamic Island */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-50 hidden md:flex justify-end items-center pr-3 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] border border-[#333]"></div>
            </div>

            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl p-3 pt-4 md:pt-8 border-b border-white/5 flex items-center gap-3 z-20 shrink-0 shadow-sm">
                <button onClick={() => { if(confirm('ออกจากเกม?')) router.push('/'); }} className="text-xl text-gray-400 hover:text-white transition-colors">❮</button>
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-white/10 flex items-center justify-center text-xl shadow-inner">
                        {currentScenario?.avatar || "?"}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full ring-2 ring-gray-900"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">{currentScenario?.name || "Loading..."}</h3>
                    <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">Active Now</p>
                </div>
            </header>

            {/* Chat Box */}
            <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scroll-smooth pb-32 bg-gradient-to-b from-transparent to-black/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {messages.map((msg, i) => {
                    if (msg.type === 'scam') {
                        return (
                            <div key={i} className="self-start max-w-[85%] animate-fade-in-up">
                                <div className="bg-white/10 backdrop-blur-md text-gray-100 p-2.5 px-3 rounded-2xl rounded-tl-sm shadow-sm border border-white/5 text-xs leading-relaxed">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    } else if (msg.type === 'user') {
                        return (
                            <div key={i} className="self-end max-w-[85%] animate-fade-in-up">
                                <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-2.5 px-3 rounded-2xl rounded-tr-sm shadow-md text-xs leading-relaxed font-medium">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    } else if (msg.type === 'system') {
                        return (
                            <div key={i} className="self-center bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-3 py-1 rounded-full my-2 animate-fade-in">
                                {msg.text}
                            </div>
                        );
                    } else if (msg.type === 'slip' || msg.type === 'data') {
                        return (
                            <div key={i} className={`self-end w-32 p-2 rounded-xl text-center border text-xs animate-pop-in mb-1 shadow-lg ${msg.type === 'slip' ? 'bg-white text-black border-gray-200' : 'bg-slate-800 text-blue-400 border-blue-500/30'}`}>
                                <div className="text-3xl mb-1">{msg.icon}</div>
                                <div className="font-bold text-[10px]">{msg.text}</div>
                                <div className="text-[8px] opacity-60 mt-1">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                        );
                    }
                })}

                {isTyping && (
                    <div className="self-start p-3 bg-white/10 rounded-2xl rounded-tl-sm flex gap-1 w-fit animate-fade-in border border-white/5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                )}
            </div>

            {/* --- MOBILE CHOICE PANEL (Bottom) --- */}
            <div className={`md:hidden absolute bottom-0 left-0 w-full bg-gray-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-6 transition-transform duration-500 rounded-t-[1.5rem] z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${showChoices ? 'translate-y-0' : 'translate-y-full'}`}>
                <h2 className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Choose Response
                </h2>
                <ChoiceButtons />
            </div>

            {/* Feedback Overlay */}
            {feedback && (
                <div className="absolute inset-0 z-40 flex flex-col justify-center items-center text-center p-6 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className={`relative p-6 rounded-[2rem] border max-w-[280px] w-full shadow-2xl transform transition-all ${feedback.isCorrect ? 'bg-green-950/90 border-green-500/50' : 'bg-red-950/90 border-red-500/50'}`}>
                        <div className={`text-6xl mb-4 drop-shadow-2xl ${feedback.isCorrect ? 'animate-bounce' : 'animate-pulse grayscale'}`}>
                            {feedback.icon}
                        </div>
                        <h2 className={`text-2xl font-black mb-2 uppercase tracking-wide ${feedback.isCorrect ? 'text-green-400 drop-shadow-md' : 'text-red-500 drop-shadow-md'}`}>
                            {feedback.title}
                        </h2>
                        <p className="text-gray-300 text-xs font-medium leading-relaxed">{feedback.desc}</p>
                    </div>
                </div>
            )}
        </div>

        {/* --- DESKTOP CHOICE PANEL (Side) --- */}
        {/* ✅ Wrapper ใหญ่ที่จัดตำแหน่งแบบ Absolute */}
        <div className={`hidden md:flex flex-col gap-4 absolute left-[calc(50%+190px)] top-1/2 -translate-y-1/2 w-[400px] z-10 transition-all duration-500 ${showChoices ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
            
            {/* 1. ข้อความอยู่นอกกล่อง */}
            <div className="text-white font-black text-3xl leading-tight drop-shadow-xl pl-2">
                คุณจะเลือกตอบอย่างไร?
            </div>

            {/* 2. กล่องใสใส่ปุ่ม */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                <ChoiceButtons />
            </div>

        </div>

      </div>
    </div>
  );
}