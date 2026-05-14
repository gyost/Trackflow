import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const detailModalOld = '<div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 lg:p-8">\\n          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => setIsTrackingDetailModalOpen(false)} />\\n          <div className="relative bg-white pt-8 sm:pt-6 sm:border border-[#1A1A1A]/10 w-full sm:max-w-5xl h-[100dvh] sm:h-full max-h-[100dvh] sm:max-h-[90vh] shadow-xl sm:shadow-2xl flex flex-col animate-in zoom-in-95 sm:zoom-in-100 duration-300 sm:rounded-sm overflow-hidden">';

const detailModalNew = '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 lg:p-8 pt-10">\\n          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => setIsTrackingDetailModalOpen(false)} />\\n          <div className="relative bg-[#F7F6F2] pt-8 sm:pt-0 sm:border border-[#1A1A1A]/10 w-full sm:max-w-5xl h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[90vh] shadow-xl sm:shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-100 duration-300 overflow-hidden mt-auto sm:mt-0 rounded-t-3xl sm:rounded-sm">\\n            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>';

code = code.replace(detailModalOld, detailModalNew);

// In the header, change pt-6 to pt-4 to give space for the handle
code = code.replace(
  '<div className="px-6 md:px-8 py-6 border-b border-[#1A1A1A]/10 shrink-0 flex justify-between items-start bg-[#F7F6F2]">',
  '<div className="px-6 md:px-8 py-6 pt-4 sm:pt-6 border-b border-[#1A1A1A]/10 shrink-0 flex justify-between items-start bg-[#F7F6F2] relative">'
);

fs.writeFileSync('src/App.tsx', code);
