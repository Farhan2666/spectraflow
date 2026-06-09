import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, durationSec } = body;

    if (durationSec > 15) {
      return NextResponse.json(
        { message: 'File too large for free tier. Upgrade for longer exports.' },
        { status: 403 }
      );
    }

    const supportedFormats = ['mp4', 'gif', 'embed'];
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        { message: 'Unsupported export format' },
        { status: 400 }
      );
    }

    const downloadUrl = `/api/download/${crypto.randomUUID()}.${format}`;

    return NextResponse.json({
      downloadUrl,
      format,
      durationSec,
    });
  } catch {
    return NextResponse.json(
      { message: 'Export failed. Reduce duration or quality.' },
      { status: 500 }
    );
  }
}
