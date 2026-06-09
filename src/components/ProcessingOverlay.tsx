'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProcessingOverlayProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
}

export function ProcessingOverlay({ isVisible, progress, message }: ProcessingOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F12]/90 backdrop-blur-sm"
    >
      <div className="relative max-w-md w-full mx-4 p-8 rounded-2xl bg-[#1A1A24] border border-[#2A2A3E]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <svg className="w-16 h-16 text-[#2A2A3E] rotate-[-90deg]" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" />
              <motion.circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={175.93}
                animate={{ strokeDashoffset: 175.93 - (175.93 * (progress || 0)) / 100 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5E60CE" />
                  <stop offset="100%" stopColor="#00F5FF" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-mono text-[#E0E0E0]">
              {progress || 0}%
            </span>
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-[#E0E0E0] mb-1">Processing Your Audio</p>
            <p className="text-sm text-[#9090A8] font-mono">
              {message || 'Optimizing frequencies...'}
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="h-1 rounded-full bg-[#2A2A3E] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#5E60CE] to-[#00F5FF]"
                animate={{ width: `${progress || 0}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#9090A8] font-mono">
              <span>Extracting</span>
              <span>Analyzing</span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
