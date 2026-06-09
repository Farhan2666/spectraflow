'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';

export function VinylLabelUpload() {
  const { vinylLabelImage, setVinylLabelImage, currentPreset } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isVinyl = currentPreset.config.waveformStyle === 'vinyl';

  if (!isVinyl) return null;

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setVinylLabelImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="pt-1 pb-2">
          <h3 className="text-xs font-mono text-[#9090A8] uppercase tracking-wider mb-3">
            Vinyl Label
          </h3>

          {/* Preview + Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2 p-3 ${
              isDragging
                ? 'border-[#FF2D75] bg-[#FF2D75]/10'
                : vinylLabelImage
                  ? 'border-[#5E60CE]/50 bg-[#5E60CE]/5 hover:border-[#5E60CE]'
                  : 'border-[#2A2A3E] bg-[#1A1A24]/30 hover:border-[#3A3A5E]'
            }`}
            style={{ minHeight: '80px' }}
          >
            {vinylLabelImage ? (
              <div className="flex items-center gap-3 w-full">
                {/* Mini vinyl preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#5E60CE]/50 shadow-[0_0_15px_rgba(94,96,206,0.3)]">
                    <img src={vinylLabelImage} alt="Label" className="w-full h-full object-cover" />
                  </div>
                  {/* Spindle hole overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#0a0a0a] border border-white/20" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-[#E0E0E0] truncate">Custom label active</p>
                  <p className="text-[9px] font-mono text-[#9090A8] mt-0.5">Click to change image</p>
                </div>
              </div>
            ) : (
              <>
                {/* Vinyl icon placeholder */}
                <div className="relative">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="16" stroke="#3A3A5E" strokeWidth="1.5"/>
                    <circle cx="18" cy="18" r="10" stroke="#2A2A4E" strokeWidth="1"/>
                    <circle cx="18" cy="18" r="5" stroke="#3A3A5E" strokeWidth="1"/>
                    <circle cx="18" cy="18" r="2" fill="#2A2A3E"/>
                    <text x="18" y="22" textAnchor="middle" fill="#5E60CE" fontSize="10" fontFamily="monospace">+</text>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-mono text-[#9090A8]">
                    {isDragging ? 'Drop image here' : 'Upload label image'}
                  </p>
                  <p className="text-[9px] font-mono text-[#5E5E78] mt-0.5">JPG, PNG, GIF, WebP</p>
                </div>
              </>
            )}
          </div>

          {/* Remove button */}
          {vinylLabelImage && (
            <motion.button
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => { e.stopPropagation(); setVinylLabelImage(null); }}
              className="mt-2 w-full py-1.5 rounded-lg border border-[#2A2A3E] bg-[#1A1A24]/50 text-[9px] font-mono text-[#9090A8] hover:border-[#FF2D75]/50 hover:text-[#FF2D75] transition-all duration-200"
            >
              Remove label image
            </motion.button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
