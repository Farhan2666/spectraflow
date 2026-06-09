'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { exportVisualization, getExportConfig, generateEmbedCode, downloadAsFile } from '@/lib/export';
import { useStore } from '@/store/useStore';
import type { ExportFormat, ExportPlatform } from '@/types';

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
  const { audioState } = useStore();
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('instagram');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mp4');
  const [duration, setDuration] = useState(15);
  const [isExporting, setIsExporting] = useState(false);
  const [embedCode, setEmbedCode] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportVisualization('demo-job', selectedFormat, duration);
      if (selectedFormat === 'embed') {
        setEmbedCode(generateEmbedCode('demo-job'));
      } else {
        downloadAsFile(result.downloadUrl, `spectraflow-visualization.${selectedFormat}`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    setIsExporting(false);
  }, [selectedFormat, duration]);

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
        <div>
          <p className="text-[10px] font-mono text-[#9090A8] mb-2">
            Duration: {duration}s <span className="text-[#9090A8]/50">(max 15s free)</span>
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
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            isExporting
              ? 'bg-[#2A2A3E] text-[#9090A8]'
              : 'bg-gradient-to-r from-[#5E60CE] to-[#FF2D75] text-white shadow-lg shadow-[#5E60CE]/30'
          )}
        >
          {isExporting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exporting...
            </span>
          ) : (
            `Download ${selectedFormat.toUpperCase()}`
          )}
        </motion.button>
      )}
    </div>
  );
}
