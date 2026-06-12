'use client';

import { create } from 'zustand';
import type { VisualizationState, Preset, PresetConfig, SpectralProfile, AudioState } from '@/types';

const DEFAULT_PRESET: Preset = {
  id: 'bass-heavy',
  name: 'Bass Heavy',
  isPublic: true,
  config: {
    colors: ['#5E60CE', '#FF2D75', '#00F5FF', '#E0E0E0'],
    sensitivity: { bass: 1.0, mid: 0.5, treble: 0.3 },
    particleCount: 100,
    waveformStyle: 'bars',
    smoothing: 0.8,
  },
};

const PRESETS: Record<string, Preset> = {
  'bass-heavy': {
    id: 'bass-heavy',
    name: 'Bass Heavy',
    isPublic: true,
    config: {
      colors: ['#5E60CE', '#FF2D75', '#00F5FF', '#E0E0E0'],
      sensitivity: { bass: 1.0, mid: 0.5, treble: 0.3 },
      particleCount: 80,
      waveformStyle: 'bars',
      smoothing: 0.8,
    },
  },
  'vocal-focused': {
    id: 'vocal-focused',
    name: 'Vocal Focused',
    isPublic: true,
    config: {
      colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#E0E0E0'],
      sensitivity: { bass: 0.3, mid: 1.0, treble: 0.7 },
      particleCount: 60,
      waveformStyle: 'wave',
      smoothing: 0.6,
    },
  },
  'nebula': {
    id: 'nebula',
    name: 'Nebula',
    isPublic: true,
    config: {
      colors: ['#5E60CE', '#FF2D75', '#00F5FF', '#FFE66D'],
      sensitivity: { bass: 0.6, mid: 0.7, treble: 0.5 },
      particleCount: 100,
      waveformStyle: 'nebula',
      smoothing: 0.75,
    },
  },
  'oscilloscope': {
    id: 'oscilloscope',
    name: 'Scope',
    isPublic: true,
    config: {
      colors: ['#00F5FF', '#FF2D75', '#FFE66D', '#5E60CE'],
      sensitivity: { bass: 0.5, mid: 0.8, treble: 0.6 },
      particleCount: 0,
      waveformStyle: 'oscilloscope',
      smoothing: 0.6,
    },
  },
  'vinyl': {
    id: 'vinyl',
    name: 'Vinyl',
    isPublic: true,
    config: {
      colors: ['#FF2D75', '#FFE66D', '#00F5FF', '#5E60CE'],
      sensitivity: { bass: 0.8, mid: 0.6, treble: 0.5 },
      particleCount: 0,
      waveformStyle: 'vinyl',
      smoothing: 0.85,
    },
  },
  'edm': {
    id: 'edm',
    name: 'EDM',
    isPublic: true,
    config: {
      colors: ['#00F5FF', '#FF2D75', '#FFE66D', '#5E60CE'],
      sensitivity: { bass: 0.7, mid: 0.6, treble: 1.0 },
      particleCount: 150,
      waveformStyle: 'circular',
      smoothing: 0.5,
    },
  },
};

interface AppState extends VisualizationState {
  audioElement: HTMLAudioElement | null;
  setAudioElement: (el: HTMLAudioElement | null) => void;
  setSource: (type: 'youtube' | 'upload', url: string | null) => void;
  setAudioState: (state: AudioState) => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setAnalyserNode: (node: AnalyserNode | null) => void;
  setFrequencyData: (data: Uint8Array) => void;
  setTimeDomainData: (data: Uint8Array) => void;
  setBpm: (bpm: number | null) => void;
  setSpectralProfile: (profile: SpectralProfile | null) => void;
  setCurrentPreset: (preset: Preset) => void;
  updatePresetConfig: (config: Partial<PresetConfig>) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (vol: number) => void;
  setDuration: (dur: number) => void;
  setCurrentTime: (time: number) => void;
  setError: (err: string | null) => void;
  setVinylLabelImage: (img: string | null) => void;
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
  exportWidth: number | null;
  exportHeight: number | null;
  setExportDimensions: (width: number | null, height: number | null) => void;
  reset: () => void;
  getAvailablePresets: () => Preset[];
}

export const useStore = create<AppState>((set, get) => ({
  audioElement: null,
  audioState: 'idle',
  sourceType: null,
  sourceUrl: null,
  audioContext: null,
  analyserNode: null,
  frequencyData: new Uint8Array(128),
  timeDomainData: new Uint8Array(128),
  bpm: null,
  spectralProfile: null,
  currentPreset: DEFAULT_PRESET,
  isPlaying: false,
  volume: 0.7,
  duration: 0,
  currentTime: 0,
  error: null,
  vinylLabelImage: null,
  isExporting: false,
  exportWidth: null,
  exportHeight: null,

  setAudioElement: (audioElement) => set({ audioElement }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setExportDimensions: (width, height) => set({ exportWidth: width, exportHeight: height }),
  setSource: (type, url) => set({ sourceType: type, sourceUrl: url }),
  setAudioState: (audioState) => set({ audioState }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyserNode: (analyserNode) => set({ analyserNode }),
  setFrequencyData: (frequencyData) => set({ frequencyData }),
  setTimeDomainData: (timeDomainData) => set({ timeDomainData }),
  setBpm: (bpm) => set({ bpm }),
  setSpectralProfile: (spectralProfile) => set({ spectralProfile }),
  setCurrentPreset: (preset) => set({ currentPreset: preset }),

  updatePresetConfig: (partial) => {
    const current = get().currentPreset;
    set({
      currentPreset: {
        ...current,
        config: { ...current.config, ...partial },
      },
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setDuration: (duration) => set({ duration }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setError: (error) => set({ error }),
  setVinylLabelImage: (vinylLabelImage) => set({ vinylLabelImage }),

  reset: () =>
    set({
      audioElement: null,
      audioState: 'idle',
      sourceType: null,
      sourceUrl: null,
      audioContext: null,
      analyserNode: null,
      frequencyData: new Uint8Array(128),
      timeDomainData: new Uint8Array(128),
      bpm: null,
      spectralProfile: null,
      currentPreset: DEFAULT_PRESET,
      isPlaying: false,
      volume: 0.7,
      duration: 0,
      currentTime: 0,
      error: null,
      vinylLabelImage: null,
      isExporting: false,
      exportWidth: null,
      exportHeight: null,
    }),

  getAvailablePresets: () => Object.values(PRESETS),
}));
