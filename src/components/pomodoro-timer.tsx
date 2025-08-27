
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, Play, Pause, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import * as Tone from 'tone';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function PomodoroTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);

  const synth = useRef<Tone.Synth | null>(null);

  useEffect(() => {
    synth.current = new Tone.Synth().toDestination();
  }, []);

  const playStartSound = useCallback(() => {
    if (synth.current) {
      synth.current.triggerAttackRelease("C5", "8n", Tone.now());
    }
  }, []);

  const playEndSound = useCallback(() => {
    if (synth.current) {
      synth.current.triggerAttackRelease("G5", "8n", Tone.now());
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      playEndSound();
      setIsActive(false);
      const newIsWorkSession = !isWorkSession;
      setIsWorkSession(newIsWorkSession);
      setTimeRemaining((newIsWorkSession ? WORK_MINUTES : BREAK_MINUTES) * 60);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeRemaining, isWorkSession, playEndSound]);

  const toggleTimer = () => {
    if (timeRemaining === 0) return;
    setIsActive(!isActive);
    if (!isActive) {
        playStartSound();
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsWorkSession(true);
    setTimeRemaining(WORK_MINUTES * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <div
        className={`fixed top-4 right-4 z-30 transition-all duration-500 ease-in-out ${
          isExpanded ? 'w-24 h-10' : 'w-10 h-10 hover:w-24'
        } bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer border border-white/10 shadow-lg group`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center text-white transition-opacity duration-300">
          <Timer className={`h-5 w-5 ${isExpanded ? 'opacity-0' : 'group-hover:opacity-0'}`} />
          <span
            className={`absolute text-sm font-medium transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isExpanded ? 'Close' : 'Timer'}
          </span>
        </div>
      </div>

      <div
        className={`relative z-20 flex flex-col items-center justify-center text-center p-8 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg transition-all duration-700 ease-in-out ${
          isExpanded
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <h2 className="text-2xl font-bold text-cyan-200/90 mb-2">
          {isWorkSession ? 'Work Session' : 'Break Time'}
        </h2>
        <p className="text-7xl font-mono text-white tracking-widest">
          {formatTime(timeRemaining)}
        </p>
        <div className="flex space-x-4 mt-6">
          <Button onClick={toggleTimer} variant="outline" size="icon" className="bg-white/10 text-white hover:bg-white/20">
            {isActive ? <Pause /> : <Play />}
          </Button>
          <Button onClick={resetTimer} variant="outline" size="icon" className="bg-white/10 text-white hover:bg-white/20">
            <RefreshCw />
          </Button>
        </div>
      </div>
    </>
  );
}
