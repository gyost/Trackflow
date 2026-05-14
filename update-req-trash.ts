import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const rbbContainerOld = `<div className="relative bg-white pt-8 sm:pt-6 border border-[#1A1A1A]/10 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">`;

const rbbContainerNew = `<div className="relative bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-3xl h-[100dvh] sm:h-[80vh] max-h-[100dvh] sm:max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-sm">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>`;
            
code = code.replace(rbbContainerOld, rbbContainerNew);

const rbbHeaderOld = `<div className="flex justify-between items-center px-8 py-6 border-b border-[#1A1A1A]/5">`;
const rbbHeaderNew = `<div className="flex justify-between items-center px-6 sm:px-8 py-5 pt-8 sm:pt-6 border-b border-[#1A1A1A]/5 bg-black/[0.02]">`;

code = code.replace(rbbHeaderOld, rbbHeaderNew);

// the trash body padding
code = code.replace('<div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">', '<div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-white/50">');

fs.writeFileSync('src/App.tsx', code);
