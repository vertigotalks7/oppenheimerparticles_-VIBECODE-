"use client";

import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

type SimulationWarningProps = {
  onStart: () => void;
};

export default function SimulationWarning({ onStart }: SimulationWarningProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay the animation to ensure the component is mounted and styles are applied.
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100); // A short delay is enough.
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div
        className={`relative z-20 flex flex-col items-center text-center p-8 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg transition-all duration-700 ease-in-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-10 scale-95'
        }`}
      >
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-amber-200 drop-shadow-lg">
          Performance Warning
        </h1>
        <p className="mt-4 text-base text-amber-100/80 max-w-md">
          This interactive simulation is resource-intensive and may cause performance issues on some devices.
        </p>
        <Button
          onClick={onStart}
          className="mt-6 bg-amber-500/80 text-white hover:bg-amber-500"
        >
          Proceed to Simulation
        </Button>
      </div>
    </div>
  );
}
