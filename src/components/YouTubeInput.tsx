'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
}

export function YouTubeInput({ onSubmit, onFileUpload, isProcessing }: YouTubeInputProps) {
  const [url, setUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUrlFocused, setIsUrlFocused] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  }, [url, onSubmit]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a)$/i))) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex items-center gap-3 p-2 rounded-2xl border-2 border-dashed transition-all duration-300',
            isDragOver
              ? 'border-[#5E60CE] bg-[#5E60CE]/5 shadow-lg shadow-[#5E60CE]/20'
              : isUrlFocused
              ? 'border-[#5E60CE] bg-[#1A1A24]/80'
              : 'border-[#2A2A3E] bg-[#1A1A24]/50 hover:border-[#3A3A5E]'
          )}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#5E60CE]/10 shrink-0">
            <svg className="w-5 h-5 text-[#5E60CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsUrlFocused(true)}
            onBlur={() => setIsUrlFocused(false)}
            placeholder="Paste YouTube link or drag audio file"
            className="flex-1 bg-transparent text-[#E0E0E0] placeholder-[#9090A8] text-sm font-mono outline-none py-3"
            disabled={isProcessing}
          />

          <div className="flex items-center gap-2 pr-1">
            <label className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#2A2A3E] hover:bg-[#3A3A5E] cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-[#9090A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={handleFileChange} className="hidden" />
            </label>

            <motion.button
              type="submit"
              disabled={!url.trim() || isProcessing}
              whileHover={{ scale: url.trim() && !isProcessing ? 1.02 : 1 }}
              whileTap={{ scale: url.trim() && !isProcessing ? 0.98 : 1 }}
              className={cn(
                'px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                url.trim() && !isProcessing
                  ? 'bg-gradient-to-r from-[#5E60CE] to-[#FF2D75] text-white shadow-lg shadow-[#5E60CE]/30'
                  : 'bg-[#2A2A3E] text-[#9090A8] cursor-not-allowed'
              )}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing
                </span>
              ) : (
                'Visualize Now'
              )}
            </motion.button>
          </div>
        </div>

        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-8 left-0 right-0 text-center"
          >
            <span className="text-xs text-[#00F5FF] font-mono">Drop your audio file here</span>
          </motion.div>
        )}
      </form>
    </div>
  );
}
