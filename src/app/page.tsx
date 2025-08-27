"use client";

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import SimulationWarning from '@/components/simulation-warning';

const QuantaVis = dynamic(() => import('@/components/quanta-vis'), {
  ssr: false,
});

const PomodoroTimer = dynamic(() => import('@/components/pomodoro-timer'), {
  ssr: false,
});


export default function Home() {
  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const [simulationStarted, setSimulationStarted] = useState(false);

  if (!simulationStarted) {
    return <SimulationWarning onStart={() => setSimulationStarted(true)} />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <QuantaVis />

      <div
        className={`fixed top-4 left-4 z-30 transition-all duration-500 ease-in-out ${
          isTitleVisible
            ? 'w-24 h-10'
            : 'w-10 h-10 hover:w-24'
        } bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer border border-white/10 shadow-lg group`}
        onClick={() => setIsTitleVisible(!isTitleVisible)}
      >
        <div className="flex items-center justify-center text-white transition-opacity duration-300">
          <Sparkles className={`h-5 w-5 ${isTitleVisible ? 'opacity-0' : 'group-hover:opacity-0'}`} />
          <span
            className={`absolute text-sm font-medium transition-opacity duration-300 ${
              isTitleVisible
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isTitleVisible ? 'Close' : 'Details'}
          </span>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <PomodoroTimer />
      </Suspense>

      <div
        className={`relative z-20 flex flex-col items-center text-center p-8 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg transition-all duration-700 ease-in-out ${
          isTitleVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-cyan-300 drop-shadow-lg">
          QuantaVis
        </h1>
        <p className="mt-4 text-lg text-cyan-100/80 max-w-2xl">
          An interactive particle simulation inspired by the quantum world. Move your mouse to interact with the particles. Click and drag to create streaks of light.
        </p>
      </div>
    </main>
  );
}
