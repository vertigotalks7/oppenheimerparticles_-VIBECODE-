"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = (e: Event) => {
      // This error is expected if the audio file is not found,
      // so we can safely ignore it in the console.
    };

    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('pause', onPause);
    audioElement.addEventListener('error', onError);

    // Initial state check in case of browser state inconsistencies
    setIsPlaying(!audioElement.paused);

    return () => {
      audioElement.removeEventListener('play', onPlay);
      audioElement.removeEventListener('pause', onPause);
      audioElement.removeEventListener('error', onError);
    };
  }, []);

  const togglePlayPause = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(error => {
          console.error("Error attempting to play audio:", error);
        });
      } else {
        audioElement.pause();
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/background-music.mp3" loop playsInline />
      
      <Button 
        onClick={togglePlayPause} 
        variant="outline" 
        size="icon" 
        className="bg-black/50 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 shadow-lg"
        aria-label={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
    </>
  );
}
