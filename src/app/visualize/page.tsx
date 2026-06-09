'use client';

import dynamic from 'next/dynamic';
import { AudioProvider } from '@/hooks/useAudioEngine';

const AudioVisualizer = dynamic(
  () => import('@/components/AudioVisualizer').then((m) => ({ default: m.AudioVisualizer })),
  { ssr: false }
);

export default function VisualizePage() {
  return (
    <AudioProvider>
      <AudioVisualizer />
    </AudioProvider>
  );
}
