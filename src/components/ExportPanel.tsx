'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getExportConfig, generateEmbedCode } from '@/lib/export';
import { useStore } from '@/store/useStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import type { ExportFormat, ExportPlatform } from '@/types';
import fixWebmDuration from 'fix-webm-duration';

const PLATFORMS: { id: ExportPlatform; label: string; icon: string }[] = [
  { id: 'instagram', label: 'IG Reel', icon: '◻' },
  { id: 'tiktok', label: 'TikTok', icon: '♪' },
  { id: 'twitter', label: 'X/Twitter', icon: '◉' },
  { id: 'youtube', label: 'YouTube', icon: '▶' },
];

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'mp4', label: 'MP4' },
  { id: 'gif', label: 'GIF' },
  { id: 'embed', label: 'Embed' },
];

export function ExportPanel() {
  const { audioState, audioElement } = useStore();
  const { togglePlayPause, seekTo } = useAudioEngine();
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('instagram');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mp4');
  const [duration, setDuration] = useState(15);
  const [useFullSong, setUseFullSong] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [embedCode, setEmbedCode] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (selectedFormat === 'embed') {
      setEmbedCode(generateEmbedCode('demo-job'));
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Visualizer canvas not found!');
      return;
    }

    const storeState = useStore.getState();
    const ctx = storeState.audioContext;
    const analyser = storeState.analyserNode;
    if (!ctx || !analyser) {
      alert('Audio context not ready! Please play audio first.');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    let audioStreamNode: MediaStreamAudioDestinationNode | null = null;
    const chunks: Blob[] = [];

    try {
      // 1. Tap audio output WITHOUT disturbing existing connections
      audioStreamNode = ctx.createMediaStreamDestination();
      analyser.connect(audioStreamNode);

      // 2. Capture canvas stream at 30 FPS
      const canvasStream = (canvas as any).captureStream(30) as MediaStream;
      if (!canvasStream) {
        throw new Error('Canvas captureStream not supported in this browser.');
      }

      // 3. Combine canvas video + tapped audio
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      audioStreamNode.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));

      // 4. Pick best supported mimeType — WEBM only (mp4 not reliable in Chrome)
      const webmTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = webmTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      if (!mimeType) {
        throw new Error('No supported video format found. Please use Chrome or Edge.');
      }
      console.log('[SpectraFlow Export] Using mimeType:', mimeType);

      // 5. Set up recorder
      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 });
      let recorderError: string | null = null;
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onerror = () => { recorderError = 'MediaRecorder error'; };

      // 6. Seek to start and ensure audio is playing
      seekTo(0);
      await new Promise(r => setTimeout(r, 300)); // wait for seek

      const wasPlaying = storeState.isPlaying;
      if (!wasPlaying) {
        togglePlayPause();
        await new Promise(r => setTimeout(r, 200));
      }

      recorder.start(250); // collect data every 250ms

      // 7. Progress tracking + auto-stop
      const startTime = Date.now();
      const exportDurationMs = duration * 1000;

      // For Full Song: listen for audio 'ended' event
      let audioEnded = false;
      const onAudioEnded = () => { audioEnded = true; };
      if (audioElement && useFullSong) {
        audioElement.addEventListener('ended', onAudioEnded);
      }

      await new Promise<void>((resolve) => {
        // Set up onstop handler BEFORE any stop can happen
        recorder.onstop = () => resolve();

        const tick = setInterval(() => {
          const elapsed = Date.now() - startTime;

          // Full Song mode: stop when audio ends
          if (useFullSong && audioEnded) {
            clearInterval(tick);
            recorder.stop();
            setProgress(100);
            return;
          }

          // Timer mode: stop after duration
          if (!useFullSong && elapsed >= exportDurationMs) {
            clearInterval(tick);
            recorder.stop();
            return;
          }

          const targetMs = useFullSong ? (audioElement?.duration || 60) * 1000 : exportDurationMs;
          const pct = Math.min(Math.round((elapsed / targetMs) * 100), 99);
          setProgress(pct);
        }, 100);
      });

      if (recorderError) throw new Error(recorderError);

      // 8. Clean up audio ended listener
      if (audioElement && useFullSong) {
        audioElement.removeEventListener('ended', onAudioEnded);
      }

      // 9. Restore audio state
      if (!wasPlaying) {
        togglePlayPause();
      }

      // 10. Disconnect tap node (doesn't affect main graph)
      try { analyser.disconnect(audioStreamNode); } catch {}

      // 11. Build blob and fix WebM duration
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      let blob = new Blob(chunks, { type: mimeType });

      if (ext === 'webm' && blob.size > 0) {
        try {
          const fixedBlob = await fixWebmDuration(blob, (Date.now() - startTime) / 1000);
          if (fixedBlob.size >= blob.size) {
            blob = fixedBlob;
          }
        } catch (e) {
          console.warn('[SpectraFlow Export] fix-webm-duration failed:', e);
        }
      }

      // 12. Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spectraflow-visualization.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
      }, 800);

    } catch (err: any) {
      console.error('[SpectraFlow Export] Failed:', err);
      alert('Export failed: ' + (err?.message || String(err)));
      try { if (audioStreamNode && analyser) analyser.disconnect(audioStreamNode); } catch {}
      setIsExporting(false);
      setProgress(0);
    }
  }, [selectedFormat, duration, useFullSong, togglePlayPause, seekTo, audioElement]);


  if (audioState !== 'ready') return null;

  const config = getExportConfig(selectedPlatform);

  return (
    <div className="p-4 rounded-2xl bg-[#1A1A24]/50 border border-[#2A2A3E] space-y-4">
      <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider">Export</h3>

      <div>
        <p className="text-[10px] font-mono text-[#9090A8] mb-2">Platform</p>
        <div className="flex gap-1.5">
          {PLATFORMS.map((platform) => (
            <motion.button
              key={platform.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlatform(platform.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all',
                selectedPlatform === platform.id
                  ? 'border-[#5E60CE] bg-[#5E60CE]/10 text-[#E0E0E0]'
                  : 'border-[#2A2A3E] text-[#9090A8] hover:border-[#3A3A5E]'
              )}
            >
              <span>{platform.icon}</span>
              <span>{platform.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-mono text-[#9090A8] mb-2">Format</p>
        <div className="flex gap-1.5">
          {FORMATS.map((fmt) => (
            <motion.button
              key={fmt.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedFormat(fmt.id);
                setEmbedCode(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                selectedFormat === fmt.id
                  ? 'border-[#5E60CE] bg-[#5E60CE]/10 text-[#E0E0E0]'
                  : 'border-[#2A2A3E] text-[#9090A8] hover:border-[#3A3A5E]'
              )}
            >
              {fmt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {selectedFormat !== 'embed' && (
        <div className="space-y-3">
          {/* Full Song toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useFullSong}
              onChange={(e) => setUseFullSong(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#2A2A3E] bg-[#1A1A24] text-[#5E60CE] focus:ring-[#5E60CE]"
            />
            <span className="text-[10px] font-mono text-[#E0E0E0]">Full Song</span>
            <span className="text-[10px] font-mono text-[#9090A8]/50">(records entire track)</span>
          </label>

          {/* Duration slider (hidden when Full Song is on) */}
          {!useFullSong && (
            <div>
              <p className="text-[10px] font-mono text-[#9090A8] mb-2">
                Duration: {duration}s
              </p>
              <div className="relative h-1.5 rounded-full bg-[#2A2A3E]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E60CE] to-[#FF2D75]"
                  style={{ width: `${(duration / 60) * 100}%` }}
                />
                <input
                  type="range"
                  min={3}
                  max={60}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#9090A8] font-mono">3s</span>
                <span className="text-[10px] text-[#9090A8] font-mono">{config.width}x{config.height}</span>
                <span className="text-[10px] text-[#9090A8] font-mono">60s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {embedCode ? (
        <div className="space-y-2">
          <div className="p-2 rounded-lg bg-[#0F0F12] border border-[#2A2A3E]">
            <code className="text-[10px] font-mono text-[#00F5FF] break-all">{embedCode}</code>
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigator.clipboard.writeText(embedCode)}
            className="w-full py-2 rounded-xl text-xs font-mono bg-[#2A2A3E] text-[#E0E0E0] hover:bg-[#3A3A5E] transition-colors"
          >
            Copy Embed Code
          </motion.button>
        </div>
      ) : (
        <div className="space-y-2">
          <motion.button
            whileHover={isExporting ? {} : { scale: 1.01 }}
            whileTap={isExporting ? {} : { scale: 0.99 }}
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isExporting
                ? 'bg-[#2A2A3E] text-[#9090A8] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#5E60CE] to-[#FF2D75] text-white shadow-lg shadow-[#5E60CE]/30'
            )}
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Recording... {progress}%
              </span>
            ) : (
              `Download ${selectedFormat === 'mp4' ? 'Video' : selectedFormat.toUpperCase()}`
            )}
          </motion.button>
          {isExporting && (
            <div className="relative h-1 rounded-full bg-[#2A2A3E] overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E60CE] to-[#00F5FF]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
          {isExporting && (
            <p className="text-[10px] font-mono text-[#9090A8] text-center">
              🎬 Recording your visualizer... audio is playing
            </p>
          )}
        </div>
      )}
    </div>
  );
}
