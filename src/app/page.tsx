'use client';

import { useCallback, useState } from 'react';
import { LandingHero } from '@/components/LandingHero';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleYouTubeSubmit = useCallback((url: string) => {
    setIsProcessing(true);
    sessionStorage.setItem('spectraflow-source', JSON.stringify({ type: 'youtube', url }));
    router.push('/visualize');
  }, [router]);

  const handleFileUpload = useCallback((file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      sessionStorage.setItem('spectraflow-source', JSON.stringify({ type: 'upload', dataUrl, name: file.name }));
      router.push('/visualize');
    };
    reader.readAsDataURL(file);
  }, [router]);

  return (
    <>
      <LandingHero
        onYouTubeSubmit={handleYouTubeSubmit}
        onFileUpload={handleFileUpload}
        isProcessing={isProcessing}
      />

      <section id="how-it-works" className="py-24 px-4 bg-[#0F0F12]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#E0E0E0] mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Drop Link',
                desc: 'Paste any YouTube URL or upload an audio file. We handle the rest.',
                color: '#5E60CE',
              },
              {
                step: '02',
                title: 'Customize Visuals',
                desc: 'Choose from presets tuned for bass, vocals, or EDM. Adjust in real-time.',
                color: '#00F5FF',
              },
              {
                step: '03',
                title: 'Export & Share',
                desc: 'Download MP4, GIF, or get an embed code — ready for any platform.',
                color: '#FF2D75',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl bg-[#1A1A24] border border-[#2A2A3E] hover:border-[#3A3A5E] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  <span className="text-sm font-mono font-bold">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#E0E0E0] mb-2">{item.title}</h3>
                <p className="text-sm text-[#9090A8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-[#2A2A3E]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#5E60CE] to-[#FF2D75] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13" />
              </svg>
            </div>
            <span className="text-sm font-bold text-[#E0E0E0]">SpectraFlow</span>
          </div>
          <p className="text-xs text-[#9090A8] font-mono">
            &copy; 2026 SpectraFlow. Visualize Music, Not Just Listen.
          </p>
        </div>
      </footer>
    </>
  );
}
