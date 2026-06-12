'use client';

import { useState, useCallback, useEffect } from 'react';
import { SpectrumCanvas } from './SpectrumCanvas';
import { ControlPanel } from './ControlPanel';
import { PresetSelector } from './PresetSelector';
import { ExportPanel } from './ExportPanel';
import { ProcessingOverlay } from './ProcessingOverlay';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function AudioVisualizer() {
  const { processYouTubeLink, processFileUpload, processDataUrl } = useAudioEngine();
  const { audioState, sourceUrl, sourceType, bpm, reset } = useStore();
  const [progress, setProgress] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleYouTubeSubmit = useCallback(async (url: string) => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 300);
    try {
      await processYouTubeLink(url);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } catch (e) {
      clearInterval(interval);
      setProgress(0);
      console.error('[SpectraFlow] YouTube processing failed:', e);
    }
  }, [processYouTubeLink]);

  const handleFileUpload = useCallback(async (file: File) => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 20, 85));
    }, 200);
    try {
      await processFileUpload(file);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } catch (e) {
      clearInterval(interval);
      setProgress(0);
      console.error('[SpectraFlow] File upload processing failed:', e);
    }
  }, [processFileUpload]);

  useEffect(() => {
    if (audioState === 'idle') {
      const stored = sessionStorage.getItem('spectraflow-source');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.type === 'youtube' && parsed.url) {
            handleYouTubeSubmit(parsed.url);
          } else if (parsed.type === 'upload' && parsed.dataUrl) {
            setProgress(0);
            const interval = setInterval(() => {
              setProgress((p) => Math.min(p + Math.random() * 20, 85));
            }, 200);
            processDataUrl(parsed.dataUrl, parsed.name || 'Uploaded Audio')
              .then(() => {
                clearInterval(interval);
                setProgress(100);
                setTimeout(() => setProgress(0), 500);
              })
              .catch((e) => {
                clearInterval(interval);
                setProgress(0);
                console.error('[SpectraFlow] Stored audio processing failed:', e);
              });
          }
        } catch (e) {
          console.error('Failed to load stored audio source', e);
        }
      }
    }
  }, [audioState, handleYouTubeSubmit, processDataUrl]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F12]">
      <ProcessingOverlay isVisible={audioState === 'processing'} progress={progress} />

      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A3E]">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5E60CE] to-[#FF2D75] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#E0E0E0]">SpectraFlow</span>
          </a>
          {bpm && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF2D75]/10 border border-[#FF2D75]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D75] animate-pulse" />
              <span className="text-xs font-mono text-[#FF2D75]">{bpm} BPM</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {audioState === 'ready' && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                showSidebar
                  ? 'border-[#5E60CE] text-[#5E60CE]'
                  : 'border-[#2A2A3E] text-[#9090A8] hover:border-[#3A3A5E]'
              )}
            >
              {showSidebar ? 'Hide Controls' : 'Show Controls'}
            </button>
          )}
          <a
            href="/"
            onClick={() => reset()}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-[#2A2A3E] text-[#9090A8] hover:border-[#3A3A5E] transition-all"
          >
            New Project
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        <div className="flex-1 min-h-0">
          {audioState !== 'idle' ? (
            <SpectrumCanvas />
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center gap-6 p-8 rounded-2xl bg-[#1A1A24]/30 border border-[#2A2A3E]">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-bold text-[#E0E0E0] mb-2">Start Your Visualization</h2>
                <p className="text-sm text-[#9090A8] mb-6">
                  Paste a YouTube link or upload an audio file to begin.
                </p>
                <div className="flex gap-3 justify-center">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1A24] border border-[#2A2A3E]">
                    <svg className="w-4 h-4 text-[#5E60CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span className="text-xs font-mono text-[#9090A8]">YouTube</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1A24] border border-[#2A2A3E]">
                    <svg className="w-4 h-4 text-[#FF2D75]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-mono text-[#9090A8]">Upload</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {audioState === 'ready' && showSidebar && (
          <div className="w-full lg:w-80 shrink-0 space-y-4 overflow-y-auto no-scrollbar max-h-[calc(100vh-8rem)]">
            <ControlPanel />
            <PresetSelector />
            <ExportPanel />
          </div>
        )}
      </main>
    </div>
  );
}
