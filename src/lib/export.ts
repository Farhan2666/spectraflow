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
    instagram: { width: 1080, height: 1920, label: 'IG Reel (9:16)' },
    tiktok: { width: 1080, height: 1920, label: 'TikTok (9:16)' },
    twitter: { width: 1080, height: 1080, label: 'Twitter/X (1:1)' },
    youtube: { width: 1920, height: 1080, label: 'YouTube (16:9)' },
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
