'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const STYLES = [
  { id: 'bars', label: 'Bars', icon: '⊞' },
  { id: 'wave', label: 'Wave', icon: '∿' },
  { id: 'circular', label: 'Circular', icon: '◎' },
] as const;

export function PresetSelector() {
  const { currentPreset, setCurrentPreset, updatePresetConfig, getAvailablePresets, bpm } = useStore();
  const presets = getAvailablePresets();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider">Style</h3>
        {bpm && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D75] animate-pulse" />
            <span className="text-xs font-mono text-[#FF2D75]">{bpm} BPM</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {STYLES.map((style) => (
          <motion.button
            key={style.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updatePresetConfig({ waveformStyle: style.id as any })}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200',
              currentPreset.config.waveformStyle === style.id
                ? 'border-[#5E60CE] bg-[#5E60CE]/10 text-[#E0E0E0]'
                : 'border-[#2A2A3E] bg-[#1A1A24]/50 text-[#9090A8] hover:border-[#3A3A5E]'
            )}
          >
            <span className="text-lg">{style.icon}</span>
            <span className="text-[10px] font-mono">{style.label}</span>
          </motion.button>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider mb-3">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPreset(preset)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-200',
                currentPreset.id === preset.id
                  ? 'border-[#5E60CE] bg-[#5E60CE]/15 text-[#E0E0E0]'
                  : 'border-[#2A2A3E] bg-[#1A1A24]/30 text-[#9090A8] hover:border-[#3A3A5E]'
              )}
            >
              {preset.name}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider mb-3">Sensitivity</h3>
        <div className="space-y-3">
          {(['bass', 'mid', 'treble'] as const).map((band) => (
            <div key={band} className="flex items-center gap-3">
              <span className="w-12 text-[10px] font-mono text-[#9090A8] uppercase">{band}</span>
              <div className="flex-1 relative h-1.5 rounded-full bg-[#2A2A3E]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E60CE] to-[#00F5FF]"
                  style={{ width: `${currentPreset.config.sensitivity[band] * 100}%` }}
                  layout
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentPreset.config.sensitivity[band]}
                  onChange={(e) =>
                    updatePresetConfig({
                      sensitivity: {
                        ...currentPreset.config.sensitivity,
                        [band]: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-[#9090A8]">
                {Math.round(currentPreset.config.sensitivity[band] * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
