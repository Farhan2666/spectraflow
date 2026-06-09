'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { YouTubeInput } from './YouTubeInput';

interface LandingHeroProps {
  onYouTubeSubmit: (url: string) => void;
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
}

export function LandingHero({ onYouTubeSubmit, onFileUpload, isProcessing }: LandingHeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#5E60CE]/10 via-transparent to-[#FF2D75]/5 pointer-events-none" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5E60CE]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#FF2D75]/15 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 text-center max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1A24] border border-[#2A2A3E] mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse" />
          <span className="text-xs text-[#9090A8] font-mono">Real-time audio visualizer</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-[#E0E0E0]">Visualize Music,</span>
          <br />
          <span className="bg-gradient-to-r from-[#5E60CE] via-[#00F5FF] to-[#FF2D75] bg-clip-text text-transparent">
            Not Just Listen
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#9090A8] mb-12 max-w-2xl mx-auto leading-relaxed">
          Transform any YouTube link or audio file into stunning real-time visualizations.
          No install, no watermark — just pure audio artistry.
        </p>

        <YouTubeInput
          onSubmit={onYouTubeSubmit}
          onFileUpload={onFileUpload}
          isProcessing={isProcessing}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-8 mt-12 text-sm text-[#9090A8]"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            YouTube links supported
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            60fps rendering
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            No watermark
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <Link href="#how-it-works" className="flex flex-col items-center gap-2 text-[#9090A8] hover:text-[#E0E0E0] transition-colors">
          <span className="text-xs font-mono">Scroll to explore</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
