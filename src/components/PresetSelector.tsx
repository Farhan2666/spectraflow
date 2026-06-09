'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { VinylLabelUpload } from './VinylLabelUpload';

const STYLES = [
  { id: 'bars', label: 'Bars' },
  { id: 'bars-reflective', label: 'Mirror' },
  { id: 'wave', label: 'Wave' },
  { id: 'glow-wave', label: 'Aurora' },
  { id: 'circular', label: 'Orbital' },
  { id: 'particles', label: 'Sparks' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'oscilloscope', label: 'Scope' },
  { id: 'vinyl', label: 'Vinyl' },
] as const;

const STYLE_ICONS: Record<string, React.ReactNode> = {
  bars: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
      <rect x="1" y="11" width="3" height="10" rx="1.5"/>
      <rect x="6" y="7" width="3" height="14" rx="1.5"/>
      <rect x="11" y="3" width="3" height="18" rx="1.5"/>
      <rect x="16" y="8" width="3" height="13" rx="1.5"/>
    </svg>
  ),
  'bars-reflective': (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
      <rect x="1" y="6" width="3" height="5" rx="1.5"/>
      <rect x="6" y="3" width="3" height="8" rx="1.5"/>
      <rect x="11" y="1" width="3" height="10" rx="1.5"/>
      <rect x="16" y="4" width="3" height="7" rx="1.5"/>
      <rect x="1" y="12" width="3" height="3" rx="1.5" opacity="0.35"/>
      <rect x="6" y="12" width="3" height="5" rx="1.5" opacity="0.35"/>
      <rect x="11" y="12" width="3" height="7" rx="1.5" opacity="0.35"/>
      <rect x="16" y="12" width="3" height="4" rx="1.5" opacity="0.35"/>
    </svg>
  ),
  wave: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 11 Q4 4 7 11 Q10 18 13 11 Q16 4 19 11 Q21 7 22 11"/>
    </svg>
  ),
  'glow-wave': (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M1 11 Q4 4 7 11 Q10 18 13 11 Q16 4 19 11" strokeWidth="3.5" opacity="0.25"/>
      <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11" strokeWidth="1.5"/>
    </svg>
  ),
  circular: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="6"/>
      <line x1="11" y1="2" x2="11" y2="0.5"/>
      <line x1="17" y1="5.5" x2="18.5" y2="3.8"/>
      <line x1="20" y1="11" x2="21.5" y2="11"/>
      <line x1="17" y1="16.5" x2="18.5" y2="18.2"/>
      <line x1="11" y1="19.5" x2="11" y2="21.5"/>
      <line x1="5" y1="16.5" x2="3.5" y2="18.2"/>
      <line x1="2" y1="11" x2="0.5" y2="11"/>
      <line x1="5" y1="5.5" x2="3.5" y2="3.8"/>
    </svg>
  ),
  particles: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
      <circle cx="11" cy="11" r="3"/>
      <circle cx="3" cy="5" r="1.5" opacity="0.7"/>
      <circle cx="19" cy="4" r="1.2" opacity="0.65"/>
      <circle cx="17" cy="17" r="1.8" opacity="0.8"/>
      <circle cx="4" cy="18" r="1.2" opacity="0.5"/>
      <circle cx="20" cy="13" r="1" opacity="0.45"/>
      <circle cx="7" cy="2" r="1" opacity="0.55"/>
      <circle cx="15" cy="7" r="0.8" opacity="0.4"/>
    </svg>
  ),
  nebula: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="0.5" opacity="0.55"/>
      <circle cx="11" cy="11" r="2.5" stroke="currentColor" strokeWidth="0.5" opacity="0.7"/>
      <circle cx="4" cy="4" r="0.9" fill="currentColor" opacity="0.75"/>
      <circle cx="18" cy="5" r="0.7" fill="currentColor" opacity="0.6"/>
      <circle cx="16" cy="18" r="0.8" fill="currentColor" opacity="0.55"/>
      <circle cx="3" cy="16" r="0.7" fill="currentColor" opacity="0.65"/>
      <circle cx="11" cy="11" r="1.5" fill="currentColor" opacity="0.9"/>
    </svg>
  ),
  oscilloscope: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="1" width="20" height="20" rx="2.5" strokeWidth="1" opacity="0.4"/>
      <line x1="11" y1="1" x2="11" y2="21" strokeWidth="0.5" opacity="0.25"/>
      <line x1="1" y1="11" x2="21" y2="11" strokeWidth="0.5" opacity="0.25"/>
      <path d="M4 11 C5.5 6 7.5 16 9.5 11 C11.5 6 13.5 16 15.5 11 C17 6 18.5 11 18.5 11"/>
    </svg>
  ),
  vinyl: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
      <circle cx="11" cy="11" r="3.5" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
      <circle cx="11" cy="11" r="2" fill="currentColor" opacity="0.8"/>
      <circle cx="11" cy="11" r="0.8" fill="currentColor"/>
      {/* Tonearm */}
      <line x1="19" y1="4" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.9"/>
      <circle cx="19" cy="4" r="1.5" fill="currentColor" opacity="0.8"/>
    </svg>
  ),
};

export function PresetSelector() {
  const { currentPreset, setCurrentPreset, updatePresetConfig, getAvailablePresets, bpm } = useStore();
  const presets = getAvailablePresets();

  return (
    <div className="space-y-4">
      {/* Style header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider">Style</h3>
        {bpm && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D75] animate-pulse" />
            <span className="text-xs font-mono text-[#FF2D75]">{bpm} BPM</span>
          </div>
        )}
      </div>

      {/* Style grid */}
      <div className="grid grid-cols-3 gap-2">
        {STYLES.map((style) => {
          const isActive = currentPreset.config.waveformStyle === style.id;
          return (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => updatePresetConfig({ waveformStyle: style.id as any })}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200',
                isActive
                  ? 'border-[#5E60CE] bg-[#5E60CE]/15 text-[#E0E0E0] shadow-[0_0_14px_rgba(94,96,206,0.25)]'
                  : 'border-[#2A2A3E] bg-[#1A1A24]/50 text-[#9090A8] hover:border-[#3A3A5E] hover:text-[#C0C0D8]'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="styleIndicator"
                  className="absolute inset-0 rounded-xl bg-[#5E60CE]/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative text-current">{STYLE_ICONS[style.id]}</span>
              <span className="relative text-[9px] font-mono leading-none">{style.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Vinyl label upload — only shows when vinyl is selected */}
      <VinylLabelUpload />

      {/* Presets */}
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

      {/* Sensitivity */}
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
                  type="range" min="0" max="1" step="0.01"
                  value={currentPreset.config.sensitivity[band]}
                  onChange={(e) => updatePresetConfig({ sensitivity: { ...currentPreset.config.sensitivity, [band]: parseFloat(e.target.value) } })}
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
