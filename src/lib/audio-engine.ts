import type { SpectralProfile } from '@/types';

export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export function createAnalyserNode(ctx: AudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  return analyser;
}

export function connectAudioSource(
  ctx: AudioContext,
  analyser: AnalyserNode,
  source: MediaElementAudioSourceNode | AudioBufferSourceNode
) {
  source.connect(analyser);
  analyser.connect(ctx.destination);
}

export function getFrequencyData(analyser: AnalyserNode): Uint8Array {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

export function getTimeDomainData(analyser: AnalyserNode): Uint8Array {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  return dataArray;
}

export function normalizeFrequencyData(data: Uint8Array): number[] {
  return Array.from(data).map((val) => val / 255);
}

export function detectBpm(timeDomainData: Uint8Array, sampleRate: number): number {
  const buffer = Array.from(timeDomainData);
  const peaks: number[] = [];
  const threshold = 0.9;
  let isPeak = false;

  for (let i = 0; i < buffer.length - 1; i++) {
    const normalized = buffer[i] / 128;
    if (normalized > threshold && !isPeak && normalized > buffer[i - 1] / 128) {
      peaks.push(i);
      isPeak = true;
    }
    if (normalized < threshold) {
      isPeak = false;
    }
  }

  if (peaks.length < 2) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round((60 * sampleRate) / avgInterval / 256);

  return Math.min(Math.max(bpm, 60), 200);
}

export function analyzeSpectrum(frequencyData: Uint8Array): SpectralProfile {
  const totalBins = frequencyData.length;
  const bassEnd = Math.floor(totalBins * 0.25);
  const midEnd = Math.floor(totalBins * 0.65);

  const bassAvg = Array.from(frequencyData.slice(0, bassEnd)).reduce((a, b) => a + b, 0) / bassEnd;
  const midAvg = Array.from(frequencyData.slice(bassEnd, midEnd)).reduce((a, b) => a + b, 0) / (midEnd - bassEnd);
  const trebleAvg = Array.from(frequencyData.slice(midEnd)).reduce((a, b) => a + b, 0) / (totalBins - midEnd);

  return {
    bass: Number((bassAvg / 255).toFixed(2)),
    mid: Number((midAvg / 255).toFixed(2)),
    treble: Number((trebleAvg / 255).toFixed(2)),
  };
}

export function validateYouTubeUrl(url: string): boolean {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
  return pattern.test(url);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
