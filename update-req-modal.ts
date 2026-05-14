import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldModalContainer = `<div className="relative bg-white pt-8 sm:pt-6 border border-[#1A1A1A]/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">`;

const newModalContainer = `<div className="relative bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-sm">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>`;

code = code.replace(oldModalContainer, newModalContainer);

const oldModalHeader = `<div className="flex justify-between items-center px-8 py-5 border-b border-[#1A1A1A]/5 bg-black/[0.02]">`;
const newModalHeader = `<div className="flex justify-between items-center px-6 sm:px-8 py-5 pt-8 sm:pt-5 border-b border-[#1A1A1A]/5 bg-black/[0.02] shrink-0">`;

code = code.replace(oldModalHeader, newModalHeader);

// In the tracking detail modal we have `pt-8 sm:pt-0 sm:border border-[#1A1A1A]/10 w-full sm:max-w-5xl h-[100dvh] sm:h-[90vh]`. This is fine.

fs.writeFileSync('src/App.tsx', code);
