'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function QuizClient() {
  const searchParams = useSearchParams();
  const diff = searchParams?.get('diff') || 'easy';

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Quiz (placeholder)</h1>
        <p className="mt-2 text-sm text-zinc-300">Difficulty: {diff}</p>
      </div>
    </div>
  );
}
