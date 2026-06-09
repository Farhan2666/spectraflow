import { NextRequest, NextResponse } from 'next/server';

const PRESETS = [
  {
    id: 'bass-heavy',
    name: 'Bass Heavy',
    config: {
      colors: ['#5E60CE', '#FF2D75', '#00F5FF', '#E0E0E0'],
      sensitivity: { bass: 1.0, mid: 0.5, treble: 0.3 },
      particleCount: 80,
      waveformStyle: 'bars',
      smoothing: 0.8,
    },
  },
  {
    id: 'vocal-focused',
    name: 'Vocal Focused',
    config: {
      colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#E0E0E0'],
      sensitivity: { bass: 0.3, mid: 1.0, treble: 0.7 },
      particleCount: 60,
      waveformStyle: 'wave',
      smoothing: 0.6,
    },
  },
  {
    id: 'edm',
    name: 'EDM',
    config: {
      colors: ['#00F5FF', '#FF2D75', '#FFE66D', '#5E60CE'],
      sensitivity: { bass: 0.7, mid: 0.6, treble: 1.0 },
      particleCount: 150,
      waveformStyle: 'circular',
      smoothing: 0.5,
    },
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bpm = searchParams.get('bpm');
  const spectrum = searchParams.get('spectrum');

  let matchedPresets = PRESETS;

  if (bpm) {
    const bpmNum = parseInt(bpm);
    if (bpmNum < 100) {
      matchedPresets = matchedPresets.filter((p) => p.id !== 'edm');
    }
  }

  return NextResponse.json({ presets: matchedPresets });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      id: crypto.randomUUID(),
      ...body,
      isPublic: false,
      usedCount: 0,
    });
  } catch {
    return NextResponse.json({ message: 'Invalid preset data' }, { status: 400 });
  }
}
