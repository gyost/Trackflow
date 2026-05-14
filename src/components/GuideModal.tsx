import React from 'react';

interface GuideModalProps {
  onClose: () => void;
  content: string;
}

export default function GuideModal({ onClose, content }: GuideModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-20 overflow-y-auto">
      <div className="bg-white max-w-2xl w-full mx-4 mb-20 p-8 border border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] relative selection:bg-[#1A1A1A] selection:text-white">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 className="text-2xl font-serif italic mb-8 border-b border-[#1A1A1A]/20 pb-4">系统使用说明</h2>

        <div className="prose prose-sm max-w-none prose-black text-sm opacity-90 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: content }} />

        <div className="mt-10 border-t border-[#1A1A1A]/20 pt-6 text-center">
          <button 
            onClick={onClose}
            className="bg-[#1A1A1A] text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
