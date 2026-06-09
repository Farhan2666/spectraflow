'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  preset: any;
  bpm: number | null;
  time: number;
  width: number;
  height: number;
}

function renderBars(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { colors, sensitivity } = preset.config;
  const barCount = frequencyData.length;
  const barWidth = width / (barCount * 1.5);
  const gap = barWidth * 0.5;

  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < barCount; i++) {
    const value = (frequencyData[i] / 255) * height * 0.8;
    const colorIndex = Math.floor((i / barCount) * (colors.length - 1));
    const color = colors[colorIndex] || colors[0];
    const alpha = 0.6 + (frequencyData[i] / 255) * 0.4;

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    const x = i * (barWidth + gap);
    const y = height - value;

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, value, [barWidth / 2, barWidth / 2, 0, 0]);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function renderWave(opts: RenderOptions) {
  const { canvas, timeDomainData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { colors } = preset.config;
  const step = Math.floor(timeDomainData.length / width);

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();

  const midY = height / 2;
  ctx.moveTo(0, midY);

  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, timeDomainData.length - 1);
    const value = ((timeDomainData[idx] - 128) / 128) * height * 0.4;
    ctx.lineTo(i, midY + value);
  }

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  colors.forEach((color: string, i: number) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = colors[0];
  ctx.stroke();

  ctx.shadowBlur = 0;
}

function renderCircular(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { colors } = preset.config;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  const barCount = frequencyData.length;

  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2;
    const value = (frequencyData[i] / 255) * radius * 0.8;
    const colorIndex = Math.floor((i / barCount) * (colors.length - 1));
    const color = colors[colorIndex] || colors[0];

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + value);
    const y2 = centerY + Math.sin(angle) * (radius + value);

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7 + (frequencyData[i] / 255) * 0.3;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

const RENDERERS: Record<string, (opts: RenderOptions) => void> = {
  bars: renderBars,
  wave: renderWave,
  circular: renderCircular,
};

export function useVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const store = useStore();

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { frequencyData, timeDomainData, currentPreset, bpm, audioState } = store;

    if (audioState !== 'ready') return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width * dpr;
    const height = rect.height * dpr;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const renderFn = RENDERERS[currentPreset.config.waveformStyle] || renderBars;

    renderFn({
      canvas,
      frequencyData,
      timeDomainData,
      preset: currentPreset,
      bpm,
      time: performance.now(),
      width,
      height,
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, [store]);

  useEffect(() => {
    if (store.audioState === 'ready') {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [store.audioState, render]);

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

  return { canvasRef: setCanvasRef };
}
