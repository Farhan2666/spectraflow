'use client';

import { createContext, useContext, useRef, useCallback, useEffect, ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import {
  createAudioContext,
  createAnalyserNode,
  getFrequencyData,
  getTimeDomainData,
  analyzeSpectrum,
  detectBpm,
  validateYouTubeUrl,
} from '@/lib/audio-engine';

interface AudioEngineContextValue {
  processYouTubeLink: (url: string) => Promise<void>;
  processFileUpload: (file: File) => Promise<void>;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const animationRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const initContext = useCallback(() => {
    if (!store.audioContext) {
      const ctx = createAudioContext();
      const analyser = createAnalyserNode(ctx);
      store.setAudioContext(ctx);
      store.setAnalyserNode(analyser);
    }
  }, [store]);

  const startAnalyzing = useCallback(() => {
    const analyser = store.analyserNode;
    if (!analyser) return;

    const analyze = () => {
      const freqData = getFrequencyData(analyser);
      const timeData = getTimeDomainData(analyser);

      store.setFrequencyData(freqData);
      store.setTimeDomainData(timeData);

      const profile = analyzeSpectrum(freqData);
      store.setSpectralProfile(profile);

      if (store.audioContext?.sampleRate) {
        const bpm = detectBpm(timeData, store.audioContext.sampleRate);
        store.setBpm(bpm);
      }

      if (audioElementRef.current) {
        store.setCurrentTime(audioElementRef.current.currentTime);
      }

      animationRef.current = requestAnimationFrame(analyze);
    };

    animationRef.current = requestAnimationFrame(analyze);
  }, [store]);

  const processYouTubeLink = useCallback(async (url: string) => {
    if (!validateYouTubeUrl(url)) {
      store.setError('Invalid YouTube link. Please check and try again.');
      return;
    }

    store.setSource('youtube', url);
    store.setAudioState('processing');

    try {
      const audioUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
      initContext();

      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.crossOrigin = 'anonymous';

      audio.oncanplaythrough = () => {
        if (store.audioContext && store.analyserNode) {
          const source = store.audioContext.createMediaElementSource(audio);
          source.connect(store.analyserNode);
          store.analyserNode.connect(store.audioContext.destination);
          store.audioContext.resume();
          audio.play();
          store.setIsPlaying(true);
          store.setDuration(audio.duration);
          store.setAudioState('ready');
          startAnalyzing();
        }
      };

      audio.onerror = () => {
        store.setAudioState('error');
        store.setError('Failed to load audio. Try uploading the file instead.');
      };
    } catch {
      store.setAudioState('error');
      store.setError('Audio processing failed. Switch to audio upload.');
    }
  }, [initContext, startAnalyzing, store]);

  const processFileUpload = useCallback(async (file: File) => {
    store.setSource('upload', file.name);
    store.setAudioState('processing');

    try {
      const url = URL.createObjectURL(file);
      initContext();

      const audio = new Audio(url);
      audioElementRef.current = audio;
      audio.crossOrigin = 'anonymous';

      audio.oncanplaythrough = () => {
        if (store.audioContext && store.analyserNode) {
          const source = store.audioContext.createMediaElementSource(audio);
          source.connect(store.analyserNode);
          store.analyserNode.connect(store.audioContext.destination);
          store.audioContext.resume();
          audio.play();
          store.setIsPlaying(true);
          store.setDuration(audio.duration);
          store.setAudioState('ready');
          startAnalyzing();
        }
      };

      audio.onerror = () => {
        store.setAudioState('error');
        store.setError('Failed to process audio file.');
      };
    } catch {
      store.setAudioState('error');
      store.setError('Audio format not supported.');
    }
  }, [initContext, startAnalyzing, store]);

  const togglePlayPause = useCallback(() => {
    if (audioElementRef.current) {
      if (store.isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play();
      }
      store.setIsPlaying(!store.isPlaying);
    }
  }, [store]);

  const seekTo = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = vol;
    }
    store.setVolume(vol);
  }, [store]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  return (
    <AudioEngineContext.Provider
      value={{ processYouTubeLink, processFileUpload, togglePlayPause, seekTo, setVolume }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) {
    throw new Error('useAudioEngine must be used within an AudioProvider');
  }
  return ctx;
}
