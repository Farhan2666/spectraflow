'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useAudioEngine } from '@/hooks/useAudioEngine';

export function ControlPanel() {
  const { isPlaying, volume, currentTime, duration, audioState } = useStore();
  const { togglePlayPause, seekTo, setVolume } = useAudioEngine();

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (audioState !== 'ready') return null;

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-[#1A1A24]/50 border border-[#2A2A3E]">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#5E60CE] to-[#FF2D75] flex items-center justify-center shrink-0"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            {isPlaying ? (
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </motion.button>

        <div className="flex-1">
          <div className="relative h-1.5 rounded-full bg-[#2A2A3E] group cursor-pointer">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E60CE] to-[#00F5FF]"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-[#9090A8]">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-mono text-[#9090A8]">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg className="w-3.5 h-3.5 text-[#9090A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
        <div className="flex-1 relative h-1.5 rounded-full bg-[#2A2A3E]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-[#9090A8]"
            style={{ width: `${volume * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <svg className="w-3.5 h-3.5 text-[#9090A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      </div>
    </div>
  );
}
