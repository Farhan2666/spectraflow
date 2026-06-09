export type SourceType = 'youtube' | 'upload';

export type AudioState = 'idle' | 'processing' | 'ready' | 'error';

export type PresetName = 'bass-heavy' | 'vocal-focused' | 'edm' | 'custom';

export type ExportFormat = 'mp4' | 'gif' | 'embed';

export type ExportPlatform = 'instagram' | 'tiktok' | 'twitter' | 'youtube';

export type Tier = 'guest' | 'free' | 'premium';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface SpectralProfile {
  bass: number;
  mid: number;
  treble: number;
}

export interface PresetConfig {
  colors: string[];
  sensitivity: {
    bass: number;
    mid: number;
    treble: number;
  };
  particleCount: number;
  waveformStyle: 'bars' | 'wave' | 'circular' | 'particle';
  smoothing: number;
}

export interface Preset {
  id: string;
  name: string;
  config: PresetConfig;
  isPublic: boolean;
}

export interface Job {
  id: string;
  userId?: string;
  sourceType: SourceType;
  sourceUrl?: string;
  status: JobStatus;
  bpm?: number;
  spectralProfile?: SpectralProfile;
  previewUrl?: string;
  createdAt: string;
}

export interface YouTubeInfo {
  title: string;
  duration: number;
  thumbnail: string;
  author: string;
}

export interface VisualizationState {
  audioState: AudioState;
  sourceType: SourceType | null;
  sourceUrl: string | null;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bpm: number | null;
  spectralProfile: SpectralProfile | null;
  currentPreset: Preset;
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  error: string | null;
}
