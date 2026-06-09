'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getExportConfig, generateEmbedCode } from '@/lib/export';
import { useStore } from '@/store/useStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import type { ExportFormat, ExportPlatform } from '@/types';

const PLATFORMS: { id: ExportPlatform; label: string; icon: string }[] = [
  { id: 'instagram', label: 'IG Reel', icon: '\u25fb' },
  { id: 'tiktok', label: 'TikTok', icon: '\u266a' },
  { id: 'twitter', label: 'X/Twitter', icon: '\u25c9' },
  { id: 'youtube', label: 'YouTube', icon: '\u25b6' },
];

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'mp4', label: 'MP4' },
  { id: 'gif', label: 'GIF' },
  { id: 'embed', label: 'Embed' },
];

export function ExportPanel() {
  const { audioState } = useStore();
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
      alert('Visualizer canvas not found! Make sure the visualizer is active.');
      return;
    }

    const storeState = useStore.getState();
    const ctx = storeState.audioContext;
    const analyser = storeState.analyserNode;
    if (!ctx || !analyser) {
      alert('Audio is not ready. Please play a song first, then try again.');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    let audioStreamNode: MediaStreamAudioDestinationNode | null = null;
    const chunks: Blob[] = [];

    try {
      // 1. Tap audio output without disturbing existing connections
      audioStreamNode = ctx.createMediaStreamDestination();
      analyser.connect(audioStreamNode);

      // 2. Capture the live canvas at 30 FPS (at current display resolution)
      const canvasStream = (canvas as any).captureStream(30) as MediaStream;
      if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
        throw new Error('canvas.captureStream() failed. Please use Chrome or Edge browser.');
      }

      // 3. Merge canvas video track + audio track into one stream
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStreamNode.stream.getAudioTracks(),
      ]);

      // 4. Use the best supported WebM codec (MP4 is unreliable in Chrome/Edge MediaRecorder)
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find(t => MediaRecorder.isTypeSupported(t));

      if (!mimeType) {
        throw new Error('Your browser does not support video recording. Please use Chrome or Edge.');
      }
      console.log('[SpectraFlow Export] Recording with mimeType:', mimeType);

      // 5. If Full Song mode, seek back to 0 before starting
      if (useFullSong) {
        seekTo(0);
        await new Promise(r => setTimeout(r, 400)); // give time for audio to seek + buffer
      }

      // 6. Ensure audio is playing
      const wasPlaying = useStore.getState().isPlaying;
      if (!wasPlaying) {
        togglePlayPause();
        await new Promise(r => setTimeout(r, 300));
      }

      // 7. Start MediaRecorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(500); // request data chunks every 500ms
      const recordingStart = Date.now();

      // 8. Resolve export duration
      const songDurationSec = useStore.getState().duration || 0;
      const exportDurationMs = (useFullSong && songDurationSec > 1)
        ? Math.ceil(songDurationSec * 1000) + 500 // add 500ms tail buffer
        : duration * 1000;

      console.log('[SpectraFlow Export] Recording for', exportDurationMs, 'ms');

      // 9. Timer loop: update progress bar, stop recorder when done
      await new Promise<void>((resolve) => {
        const tick = setInterval(() => {
          const elapsed = Date.now() - recordingStart;
          setProgress(Math.min(Math.round((elapsed / exportDurationMs) * 100), 99));
          if (elapsed >= exportDurationMs) {
            clearInterval(tick);
            recorder.stop();
            resolve();
          }
        }, 150);
      });

      // 10. Wait for the final ondataavailable + onstop events
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const actualMs = Date.now() - recordingStart;
      console.log('[SpectraFlow Export] Actual recording duration:', actualMs, 'ms');

      // 11. Restore audio state
      if (!wasPlaying) togglePlayPause();

      // 12. Disconnect the tapped audio node (safe - doesn't affect main graph)
      try { analyser.disconnect(audioStreamNode); } catch (_) {}

      // 13. Inject correct WebM duration metadata into the blob
      setProgress(99);
      const rawBlob = new Blob(chunks, { type: mimeType });
      console.log('[SpectraFlow Export] Raw blob size:', rawBlob.size, 'bytes');

      let finalBlob = rawBlob;
      try {
        // Dynamic import avoids SSR issues with this CommonJS library
        const fixMod = await import('fix-webm-duration');
        const fixFn = (fixMod.default ?? fixMod) as (b: Blob, d: number) => Promise<Blob>;
        if (typeof fixFn === 'function') {
          finalBlob = await fixFn(rawBlob, actualMs);
          console.log('[SpectraFlow Export] Duration metadata fixed. Final size:', finalBlob.size, 'bytes');
        }
      } catch (fixErr) {
        console.warn('[SpectraFlow Export] Could not fix WebM duration metadata (non-fatal):', fixErr);
      }

      // 14. Trigger browser download
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'spectraflow-visualization.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setProgress(100);
      setTimeout(() => { setIsExporting(false); setProgress(0); }, 1000);

    } catch (err: any) {
      console.error('[SpectraFlow Export] Error:', err);
      alert('Export failed: ' + (err?.message ?? String(err)));
      if (audioStreamNode && analyser) {
        try { analyser.disconnect(audioStreamNode); } catch (_) {}
      }
      setIsExporting(false);
      setProgress(0);
    }
  }, [selectedFormat, duration, useFullSong, togglePlayPause, seekTo]);

  if (audioState !== 'ready') return null;

  const config = getExportConfig(selectedPlatform);

  return (
    <div className="p-4 rounded-2xl bg-[#1A1A24]/50 border border-[#2A2A3E] space-y-4">
      <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider">Export</h3>

      {/* Platform selector */}
      <div>
        <p className="text-[10px] font-mono text-[#9090A8] mb-2">Platform</p>
        <div className="flex gap-1.5 flex-wrap">
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

      {/* Format selector */}
      <div>
        <p className="text-[10px] font-mono text-[#9090A8] mb-2">Format</p>
        <div className="flex gap-1.5">
          {FORMATS.map((fmt) => (
            <motion.button
              key={fmt.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedFormat(fmt.id); setEmbedCode(null); }}
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

      {/* Duration controls */}
      {selectedFormat !== 'embed' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-[#9090A8]">
              Duration: {useFullSong ? 'Full Song' : `${duration}s`}
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useFullSong}
                onChange={(e) => setUseFullSong(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#5E60CE] cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#9090A8]">Full Song</span>
            </label>
          </div>

          {!useFullSong && (
            <>
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
              <div className="flex justify-between">
                <span className="text-[10px] text-[#9090A8] font-mono">3s</span>
                <span className="text-[10px] text-[#9090A8] font-mono">{config.width}×{config.height}</span>
                <span className="text-[10px] text-[#9090A8] font-mono">60s</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Embed code OR download button */}
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
              'Download Video'
            )}
          </motion.button>

          {isExporting && (
            <>
              <div className="relative h-1 rounded-full bg-[#2A2A3E] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E60CE] to-[#00F5FF]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
              <p className="text-[10px] font-mono text-[#9090A8] text-center">
                🎬 Recording visualizer + audio... please wait
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
