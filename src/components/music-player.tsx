"use client";

import { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);

      return () => {
        if (audioElement) {
          audioElement.removeEventListener('play', handlePlay);
          audioElement.removeEventListener('pause', handlePause);
        }
      };
    }
  }, []);

  const togglePlayPause = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {/* The audio element is not visible */}
      <audio ref={audioRef} src="/videoplayback.m4a" loop playsInline />
      
      <Button 
        onClick={togglePlayPause} 
        variant="outline" 
        size="icon" 
        className="bg-black/50 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 shadow-lg"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
    </div>
  );
}
