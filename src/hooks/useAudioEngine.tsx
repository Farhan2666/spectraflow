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
  processDataUrl: (dataUrl: string, name: string) => Promise<void>;
  togglePlayPause: () => void;
  seekTo: (time: number) => Promise<void>;
  setVolume: (vol: number) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const animationRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const initContext = useCallback(() => {
    const currentState = useStore.getState();
    if (!currentState.audioContext) {
      const ctx = createAudioContext();
      const analyser = createAnalyserNode(ctx);
      currentState.setAudioContext(ctx);
      currentState.setAnalyserNode(analyser);
    }
  }, []);

  const startAnalyzing = useCallback(() => {
    const analyze = () => {
      const liveState = useStore.getState();
      const liveAnalyser = liveState.analyserNode;
      if (!liveAnalyser) return;

      const freqData = getFrequencyData(liveAnalyser);
      const timeData = getTimeDomainData(liveAnalyser);

      liveState.setFrequencyData(freqData);
      liveState.setTimeDomainData(timeData);

      const profile = analyzeSpectrum(freqData);
      liveState.setSpectralProfile(profile);

      if (liveState.audioContext?.sampleRate) {
        const bpm = detectBpm(timeData, liveState.audioContext.sampleRate);
        liveState.setBpm(bpm);
      }

      if (audioElementRef.current) {
        liveState.setCurrentTime(audioElementRef.current.currentTime);
      }

      animationRef.current = requestAnimationFrame(analyze);
    };

    animationRef.current = requestAnimationFrame(analyze);
  }, []);

  const processYouTubeLink = useCallback((url: string) => {
    const currentState = useStore.getState();
    if (!validateYouTubeUrl(url)) {
      currentState.setError('Invalid YouTube link. Please check and try again.');
      return Promise.reject(new Error('Invalid URL'));
    }

    // Explicitly pause and clean up previous audio to prevent double playback
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      } catch (err) {
        console.error('Error cleaning up previous audio:', err);
      }
      audioElementRef.current = null;
    }

    currentState.setSource('youtube', url);
    currentState.setAudioState('processing');

    return new Promise<void>((resolve, reject) => {
      try {
        const audioUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
        initContext();

        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;
        audio.crossOrigin = 'anonymous';

        audio.oncanplay = () => {
          audio.oncanplay = null; // prevent double-fire
          const liveState = useStore.getState();
          const liveCtx = liveState.audioContext;
          const liveAnalyser = liveState.analyserNode;
          liveState.setAudioElement(audio);

          if (liveCtx && liveAnalyser) {
            try {
              const source = liveCtx.createMediaElementSource(audio);
              source.connect(liveAnalyser);
              liveAnalyser.connect(liveCtx.destination);
              liveCtx.resume();
              audio.play();
              liveState.setIsPlaying(true);
              liveState.setDuration(audio.duration);
              liveState.setAudioState('ready');
              startAnalyzing();
              resolve();
            } catch (e: any) {
              liveState.setAudioState('error');
              liveState.setError('Failed to configure audio context.');
              reject(e);
            }
          } else {
            resolve();
          }
        };

        audio.onerror = () => {
          const liveState = useStore.getState();
          liveState.setAudioState('error');
          liveState.setError('Failed to load audio. Try uploading the file instead.');
          reject(new Error('Audio load error'));
        };

        // Timeout: if audio doesn't load within 30s, reject
        setTimeout(() => {
          if (audio.readyState < 3) {
            const liveState = useStore.getState();
            if (liveState.audioState === 'processing') {
              liveState.setAudioState('error');
              liveState.setError('Audio loading timed out. The YouTube proxy may be unavailable. Try uploading the file instead.');
              reject(new Error('Audio load timeout'));
            }
          }
        }, 30000);
      } catch (e: any) {
        const liveState = useStore.getState();
        liveState.setAudioState('error');
        liveState.setError('Audio processing failed. Switch to audio upload.');
        reject(e);
      }
    });
  }, [initContext, startAnalyzing]);

  const processFileUpload = useCallback((file: File) => {
    const currentState = useStore.getState();

    // Explicitly pause and clean up previous audio to prevent double playback
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      } catch (err) {
        console.error('Error cleaning up previous audio:', err);
      }
      audioElementRef.current = null;
    }

    currentState.setSource('upload', file.name);
    currentState.setAudioState('processing');

    return new Promise<void>((resolve, reject) => {
      try {
        const url = URL.createObjectURL(file);
        initContext();

        const audio = new Audio(url);
        audioElementRef.current = audio;
        audio.crossOrigin = 'anonymous';

        audio.oncanplay = () => {
          audio.oncanplay = null; // prevent double-fire
          const liveState = useStore.getState();
          const liveCtx = liveState.audioContext;
          const liveAnalyser = liveState.analyserNode;
          liveState.setAudioElement(audio);

          if (liveCtx && liveAnalyser) {
            try {
              const source = liveCtx.createMediaElementSource(audio);
              source.connect(liveAnalyser);
              liveAnalyser.connect(liveCtx.destination);
              liveCtx.resume();
              audio.play();
              liveState.setIsPlaying(true);
              liveState.setDuration(audio.duration);
              liveState.setAudioState('ready');
              startAnalyzing();
              resolve();
            } catch (e: any) {
              liveState.setAudioState('error');
              liveState.setError('Failed to configure audio context.');
              reject(e);
            }
          } else {
            resolve();
          }
        };

        audio.onerror = () => {
          const liveState = useStore.getState();
          liveState.setAudioState('error');
          liveState.setError('Failed to process audio file.');
          reject(new Error('Audio process error'));
        };
      } catch (e: any) {
        const liveState = useStore.getState();
        liveState.setAudioState('error');
        liveState.setError('Audio format not supported.');
        reject(e);
      }
    });
  }, [initContext, startAnalyzing]);

  const processDataUrl = useCallback((dataUrl: string, name: string) => {
    const currentState = useStore.getState();

    // Explicitly pause and clean up previous audio to prevent double playback
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      } catch (err) {
        console.error('Error cleaning up previous audio:', err);
      }
      audioElementRef.current = null;
    }

    currentState.setSource('upload', name);
    currentState.setAudioState('processing');

    return new Promise<void>((resolve, reject) => {
      try {
        initContext();

        const audio = new Audio(dataUrl);
        audioElementRef.current = audio;
        audio.crossOrigin = 'anonymous';

        audio.oncanplay = () => {
          audio.oncanplay = null; // prevent double-fire
          const liveState = useStore.getState();
          const liveCtx = liveState.audioContext;
          const liveAnalyser = liveState.analyserNode;
          liveState.setAudioElement(audio);

          if (liveCtx && liveAnalyser) {
            try {
              const source = liveCtx.createMediaElementSource(audio);
              source.connect(liveAnalyser);
              liveAnalyser.connect(liveCtx.destination);
              liveCtx.resume();
              audio.play();
              liveState.setIsPlaying(true);
              liveState.setDuration(audio.duration);
              liveState.setAudioState('ready');
              startAnalyzing();
              resolve();
            } catch (e: any) {
              liveState.setAudioState('error');
              liveState.setError('Failed to configure audio context.');
              reject(e);
            }
          } else {
            resolve();
          }
        };

        audio.onerror = () => {
          const liveState = useStore.getState();
          liveState.setAudioState('error');
          liveState.setError('Failed to process audio file.');
          reject(new Error('Audio process error'));
        };
      } catch (e: any) {
        const liveState = useStore.getState();
        liveState.setAudioState('error');
        liveState.setError('Audio format not supported.');
        reject(e);
      }
    });
  }, [initContext, startAnalyzing]);

  const togglePlayPause = useCallback(() => {
    const liveState = useStore.getState();
    if (audioElementRef.current) {
      if (liveState.isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play();
      }
      liveState.setIsPlaying(!liveState.isPlaying);
    }
  }, []);

  const seekTo = useCallback((time: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      const audio = audioElementRef.current;
      if (!audio) { resolve(); return; }
      const onSeeked = () => { audio.removeEventListener('seeked', onSeeked); resolve(); };
      audio.addEventListener('seeked', onSeeked);
      audio.currentTime = time;
      // Safety timeout in case seeked event never fires
      setTimeout(() => { audio.removeEventListener('seeked', onSeeked); resolve(); }, 2000);
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    const liveState = useStore.getState();
    if (audioElementRef.current) {
      audioElementRef.current.volume = vol;
    }
    liveState.setVolume(vol);
  }, []);

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
      value={{ processYouTubeLink, processFileUpload, processDataUrl, togglePlayPause, seekTo, setVolume }}
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
