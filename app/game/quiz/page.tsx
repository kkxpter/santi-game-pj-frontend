'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// ⚡ หัวใจสำคัญ: สั่งให้โหลดคอมโพเนนต์เกมเฉพาะฝั่ง Client เท่านั้น (ssr: false)
const QuizGameLoader = dynamic(() => import('./QuizClient'), {
  ssr: false, 
});

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center text-white font-mono animate-pulse">
          INITIALIZING QUIZ SYSTEM...
        </div>
      }>
        <QuizGameLoader />
      </Suspense>
    </div>
  );
}