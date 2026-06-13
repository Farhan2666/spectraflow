import { NextRequest, NextResponse } from 'next/server';

// ─── Method 1: @distube/ytdl-core (direct YouTube extraction) ───
// ─── Method 2: Piped API instances ────────────────────────────────
// ─── Method 3: Invidious API instances (most reliable) ────────────

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

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://inv.nadeko.net',
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://iv.ggtyler.dev',
  'https://invidious.privacydev.net',
  'https://vid.puffyan.us',
  'https://invidious.fdn.fr',
];

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

// ─── Method 1: ytdl-core ──────────────────────────────────────────
async function tryYtdl(videoId: string): Promise<{ streamUrl: string; contentType: string } | null> {
  try {
    const ytdl = await import('@distube/ytdl-core');
    const info = await ytdl.default.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const audioFormats = ytdl.default.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length > 0) {
      const best = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
      if (best.url) {
        console.log(`[ytdl] Found: ${best.mimeType}, ${best.audioBitrate}kbps`);
        return { streamUrl: best.url, contentType: best.mimeType || 'audio/webm' };
      }
    }
    const anyWithAudio = info.formats.filter(f => f.hasAudio);
    if (anyWithAudio.length > 0) {
      const best = anyWithAudio.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
      if (best.url) {
        console.log(`[ytdl] Fallback: ${best.mimeType}, ${best.audioBitrate}kbps`);
        return { streamUrl: best.url, contentType: best.mimeType || 'audio/mp4' };
      }
    }
    return null;
  } catch (err: any) {
    console.error('[ytdl] Failed:', err?.message || err);
    return null;
  }
}

// ─── Method 2: Piped ──────────────────────────────────────────────
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
        const best = data.audioStreams.reduce((best: any, cur: any) =>
          (cur.bitrate || 0) > (best.bitrate || 0) ? cur : best, data.audioStreams[0]);
        return { streamUrl: best.url, contentType: best.mimeType || 'audio/mp4' };
      }
      if (data.videoStreams && data.videoStreams.length > 0) {
        const muxed = data.videoStreams.find((v: any) => v.quality === '360p' && v.mimeType === 'video/mp4') ||
                      data.videoStreams.find((v: any) => v.mimeType === 'video/mp4');
        if (muxed) return { streamUrl: muxed.url, contentType: muxed.mimeType || 'video/mp4' };
      }
    } catch (err) {
      console.error(`[Piped] ${instance} failed`);
    }
  }
  return null;
}

// ─── Method 3: Invidious ──────────────────────────────────────────
async function tryInvidious(videoId: string): Promise<{ streamUrl: string; contentType: string } | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      console.log(`[Invidious] Trying: ${instance}`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.log(`[Invidious] ${instance} returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      
      // adaptiveFormats has separate audio/video streams
      if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
        const audioFormats = data.adaptiveFormats.filter((f: any) =>
          f.type && f.type.includes('audio'));
        if (audioFormats.length > 0) {
          // Sort by bitrate, pick best
          const best = audioFormats.sort((a: any, b: any) =>
            (b.bitrate || 0) - (a.bitrate || 0))[0];
          if (best.url) {
            console.log(`[Invidious] ${instance}: ${best.type}, ${best.bitrate}bps`);
            return { streamUrl: best.url, contentType: best.type || 'audio/mp4' };
          }
        }
      }
      
      // Fallback: formatStreams (muxed video+audio)
      if (data.formatStreams && data.formatStreams.length > 0) {
        const best = data.formatStreams[0];
        if (best.url) {
          console.log(`[Invidious] ${instance}: muxed ${best.type}`);
          return { streamUrl: best.url, contentType: best.type || 'video/mp4' };
        }
      }
    } catch (err: any) {
      console.error(`[Invidious] ${instance} failed:`, err?.message?.substring(0, 50));
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

  // Try all methods in order: ytdl → Invidious → Piped
  let result = await tryYtdl(videoId);
  if (!result) {
    console.log('[proxy] ytdl failed, trying Invidious...');
    result = await tryInvidious(videoId);
  }
  if (!result) {
    console.log('[proxy] Invidious failed, trying Piped...');
    result = await tryPiped(videoId);
  }

  if (!result) {
    return NextResponse.json({
      message: 'Could not extract audio from YouTube. All extraction methods failed. Please try uploading the audio file directly.',
    }, { status: 502 });
  }

  try {
    const streamResponse = await fetch(result.streamUrl);

    if (!streamResponse.ok || !streamResponse.body) {
      return NextResponse.json({ message: 'Failed to fetch audio stream' }, { status: 502 });
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
