import { NextRequest, NextResponse } from 'next/server';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',          // Official (US/IN/NL/CA/GB/FR CDN)
  'https://pipedapi-libre.kavin.rocks',    // Official libre (NL)
  'https://pipedapi.leptons.xyz',          // AT, CDN
  'https://pipedapi.nosebs.ru',            // FI, CDN
  'https://piped-api.privacy.com.de',      // DE
  'https://pipedapi.adminforge.de',        // DE
  'https://api.piped.yt',                  // DE
  'https://pipedapi.drgns.space',          // US
  'https://pipedapi.reallyaweso.me',       // DE
  'https://pipedapi.darkness.services',    // US
  'https://pipedapi.orangenet.cc',         // SI
  'https://api.piped.private.coffee',      // AT
  'https://pipedapi.owo.si',               // DE
  'https://pipedapi.ducks.party',          // NL
  'https://piped-api.codespace.cz',        // CZ
];

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
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

  let streamUrl: string | null = null;
  let contentType = 'audio/mp4';

  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`Trying Piped instance: ${instance} for video: ${videoId}`);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000), // 8s timeout per instance
      });

      if (!res.ok) continue;

      const data = await res.json();
      
      // Try to get audio stream
      if (data.audioStreams && data.audioStreams.length > 0) {
        // Find best audio format
        const bestAudio = data.audioStreams.reduce((best: any, current: any) => {
          return (current.bitrate || 0) > (best.bitrate || 0) ? current : best;
        }, data.audioStreams[0]);
        
        streamUrl = bestAudio.url;
        contentType = bestAudio.mimeType || 'audio/mp4';
      } 
      // Fallback to muxed 360p video stream if audioStreams is empty
      else if (data.videoStreams && data.videoStreams.length > 0) {
        const muxed = data.videoStreams.find((v: any) => v.quality === '360p' && v.mimeType === 'video/mp4') || 
                      data.videoStreams.find((v: any) => v.mimeType === 'video/mp4');
        if (muxed) {
          streamUrl = muxed.url;
          contentType = muxed.mimeType || 'video/mp4';
        }
      }

      if (streamUrl) {
        console.log(`Successfully resolved stream: ${streamUrl}`);
        break;
      }
    } catch (err) {
      console.error(`Error querying Piped instance ${instance}:`, err);
    }
  }

  if (!streamUrl) {
    return NextResponse.json({ message: 'Could not extract audio stream from YouTube' }, { status: 502 });
  }

  try {
    // Fetch the stream from the resolved URL
    const streamResponse = await fetch(streamUrl);

    if (!streamResponse.ok || !streamResponse.body) {
      return NextResponse.json({ message: 'Failed to fetch stream source' }, { status: 502 });
    }

    return new Response(streamResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
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
