import type { YouTubeInfo } from '@/types';

const YT_DLP_API = process.env.NEXT_PUBLIC_YT_DLP_API || '/api/process';

export async function extractYouTubeAudio(url: string): Promise<{ jobId: string; info: YouTubeInfo }> {
  const response = await fetch(YT_DLP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'youtube', url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to extract audio');
  }

  return response.json();
}

export async function uploadAudioFile(file: File): Promise<{ jobId: string; info: YouTubeInfo }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'upload', fileSize: file.size, fileName: file.name }),
  });

  if (!response.ok) {
    throw new Error('Failed to upload audio');
  }

  return response.json();
}

export function createWebSocketConnection(channelId: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/v1/realtime/${channelId}`;
  return new WebSocket(wsUrl);
}
