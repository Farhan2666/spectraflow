'use client';

import { useVisualizer } from '@/hooks/useVisualizer';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

export function SpectrumCanvas() {
  const { canvasRef } = useVisualizer();
  const audioState = useStore((state) => state.audioState);
  const currentPreset = useStore((state) => state.currentPreset);
  const error = useStore((state) => state.error);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-[#0F0F12] border border-[#2A2A3E]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {audioState === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A24] border border-[#2A2A3E] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5E60CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-sm text-[#9090A8] font-mono">Waiting for audio...</p>
        </div>
      )}

      {audioState === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-[#5E60CE] to-[#00F5FF] rounded-full"
                  animate={{
                    height: [8, 24, 8],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-[#9090A8] font-mono">Analyzing audio...</span>
          </div>
        </div>
      )}

      {audioState === 'ready' && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-2 select-none pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end h-3">
              <style>{`
                @keyframes miniVisualizerBounce {
                  0% { transform: scaleY(0.3); }
                  100% { transform: scaleY(1); }
                }
              `}</style>
              {[0.6, 0.9, 0.4, 0.8, 0.5].map((speed, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-[#00F5FF] rounded-full origin-bottom"
                  style={{
                    height: '100%',
                    width: '2px',
                    opacity: 0.7,
                    animation: `miniVisualizerBounce ${0.4 + speed * 0.4}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-[#9090A8] font-mono">
              {currentPreset.config.waveformStyle}
            </span>
          </div>
          <span className="text-[10px] text-[#9090A8] font-mono">
            60fps
          </span>
        </div>
      )}

      {audioState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          <svg className="w-10 h-10 text-[#FF4757] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-[#FF4757] font-mono text-center">Processing failed</p>
          {error && (
            <p className="text-xs text-[#9090A8] font-mono text-center max-w-sm">{error}</p>
          )}
          <a
            href="/"
            className="mt-2 px-4 py-2 rounded-lg text-xs font-mono bg-[#2A2A3E] text-[#E0E0E0] hover:bg-[#3A3A5E] transition-colors"
          >
            Try Again
          </a>
        </div>
      )}
    </div>
  );
}
