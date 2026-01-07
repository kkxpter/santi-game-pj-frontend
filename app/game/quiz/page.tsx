import { Suspense } from 'react';
import QuizClient from './QuizClient';

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <QuizClient />
    </Suspense>
  );
}
