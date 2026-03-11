import { createContext, useContext, ReactNode, useRef, useEffect, useState } from 'react';

interface AudioContextType {
  audioElement: HTMLAudioElement;
  currentSongId: string | null;
  setCurrentSong: (songId: string | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!audioElementRef.current) {
      const audio = new Audio();
      audio.preload = 'none';
      audioElementRef.current = audio;
    }

    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
    };
  }, []);

  const setCurrentSong = (songId: string | null) => {
    setCurrentSongId(songId);
  };

  if (!audioElementRef.current) {
    audioElementRef.current = new Audio();
  }

  return (
    <AudioContext.Provider value={{ 
      audioElement: audioElementRef.current, 
      currentSongId,
      setCurrentSong 
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }
  return context;
}
