import { NextRequest, NextResponse } from 'next/server';

// ─── Primary: @distube/ytdl-core (direct YouTube extraction) ───
// ─── Fallback: Piped API instances ─────────────────────────────────

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://piped-api.privacy.com.de',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
  'https://pipedapi.drgns.space',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.darkness.services',
  'https://pipedapi.orangenet.cc',
  'https://api.piped.private.coffee',
  'https://pipedapi.owo.si',
  'https://pipedapi.ducks.party',
  'https://piped-api.codespace.cz',
];

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

async function tryYtdl(videoId: string): Promise<{ streamUrl: string; contentType: string } | null> {
  try {
    // Dynamic import to avoid bundling issues
    const ytdl = await import('@distube/ytdl-core');
    const info = await ytdl.default.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

    // Get best audio-only format
    const audioFormats = ytdl.default.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length > 0) {
      // Sort by bitrate, pick best
      const best = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
      if (best.url) {
        console.log(`[ytdl] Found audio format: ${best.mimeType}, bitrate: ${best.audioBitrate}`);
        return {
          streamUrl: best.url,
          contentType: best.mimeType || 'audio/webm',
        };
      }
    }

    // Fallback: any format with audio
    const anyWithAudio = info.formats.filter(f => f.hasAudio);
    if (anyWithAudio.length > 0) {
      const best = anyWithAudio.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
      if (best.url) {
        console.log(`[ytdl] Fallback format: ${best.mimeType}, bitrate: ${best.audioBitrate}`);
        return {
          streamUrl: best.url,
          contentType: best.mimeType || 'audio/mp4',
        };
      }
    }

    console.log('[ytdl] No audio formats found');
    return null;
  } catch (err: any) {
    console.error('[ytdl] Extraction failed:', err?.message || err);
    return null;
  }
}

async function tryPiped(videoId: string): Promise<{ streamUrl: string; contentType: string } | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[Piped] Trying: ${instance}`);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();

      if (data.audioStreams && data.audioStreams.length > 0) {
        const bestAudio = data.audioStreams.reduce((best: any, current: any) => {
          return (current.bitrate || 0) > (best.bitrate || 0) ? current : best;
        }, data.audioStreams[0]);
        return { streamUrl: bestAudio.url, contentType: bestAudio.mimeType || 'audio/mp4' };
      }

      if (data.videoStreams && data.videoStreams.length > 0) {
        const muxed = data.videoStreams.find((v: any) => v.quality === '360p' && v.mimeType === 'video/mp4') ||
                      data.videoStreams.find((v: any) => v.mimeType === 'video/mp4');
        if (muxed) {
          return { streamUrl: muxed.url, contentType: muxed.mimeType || 'video/mp4' };
        }
      }
    } catch (err) {
      console.error(`[Piped] ${instance} failed:`, err);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ message: 'Missing URL parameter' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ message: 'Invalid YouTube URL' }, { status: 400 });
  }

  // Try ytdl-core first (most reliable), then fall back to Piped
  let result = await tryYtdl(videoId);
  if (!result) {
    console.log('[proxy-audio] ytdl failed, trying Piped instances...');
    result = await tryPiped(videoId);
  }

  if (!result) {
    return NextResponse.json({ message: 'Could not extract audio stream from YouTube. All extraction methods failed.' }, { status: 502 });
  }

  try {
    const streamResponse = await fetch(result.streamUrl);

    if (!streamResponse.ok || !streamResponse.body) {
      return NextResponse.json({ message: 'Failed to fetch stream source' }, { status: 502 });
    }

    return new Response(streamResponse.body, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        ...(streamResponse.headers.get('content-length')
          ? { 'Content-Length': streamResponse.headers.get('content-length')! }
          : {}),
      },
    });
  } catch (error: any) {
    console.error('Streaming proxy failed:', error);
    return NextResponse.json({ message: 'Proxy streaming error' }, { status: 500 });
  }
}
