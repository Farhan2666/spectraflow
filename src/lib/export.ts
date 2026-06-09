import type { ExportFormat, ExportPlatform } from '@/types';

export async function exportVisualization(
  jobId: string,
  format: ExportFormat,
  durationSec: number
): Promise<{ downloadUrl: string }> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, format, durationSec }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Export failed');
  }

  return response.json();
}

export function getExportConfig(platform: ExportPlatform): { width: number; height: number; label: string } {
  const configs: Record<ExportPlatform, { width: number; height: number; label: string }> = {
    instagram: { width: 720, height: 1280, label: 'IG Reel (720x1280)' },
    tiktok: { width: 720, height: 1280, label: 'TikTok (720x1280)' },
    twitter: { width: 720, height: 720, label: 'Twitter/X (720x720)' },
    youtube: { width: 1280, height: 720, label: 'YouTube (720p)' },
  };
  return configs[platform];
}

export function generateEmbedCode(jobId: string): string {
  return `<iframe src="${window.location.origin}/embed/${jobId}" width="100%" height="480" frameborder="0" allow="autoplay"></iframe>`;
}

export function downloadAsFile(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
