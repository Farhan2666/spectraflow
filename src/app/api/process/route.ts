import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url } = body;

    if (type === 'youtube') {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;
      if (!youtubeRegex.test(url)) {
        return NextResponse.json(
          { message: 'Invalid YouTube link. Please check and try again.' },
          { status: 400 }
        );
      }

      const jobId = crypto.randomUUID();
      return NextResponse.json({
        jobId,
        info: {
          title: 'YouTube Audio',
          duration: 180,
          thumbnail: '',
          author: 'YouTube',
        },
      });
    }

    if (type === 'upload') {
      const jobId = crypto.randomUUID();
      return NextResponse.json({
        jobId,
        info: {
          title: body.fileName || 'Uploaded Audio',
          duration: 0,
          thumbnail: '',
          author: 'Local',
        },
      });
    }

    return NextResponse.json({ message: 'Invalid request type' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { message: 'Audio extraction failed. Switch to audio upload.' },
      { status: 500 }
    );
  }
}
