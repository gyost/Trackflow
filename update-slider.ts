import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Change grid to a horizontally scrollable container on mobile
code = code.split('<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">')
  .join('<div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4">');

// We have 4 cards inside those blocks that all start with:
// <div className="bg-white border border-[#1A1A1A]/10 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-[#1A1A1A]/20 transition-all">
code = code.split('className="bg-white border border-[#1A1A1A]/10 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-[#1A1A1A]/20 transition-all"')
  .join('className="bg-white border border-[#1A1A1A]/10 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-[#1A1A1A]/20 transition-all min-w-[280px] sm:min-w-0 w-full shrink-0 snap-center rounded-2xl sm:rounded-none"');

fs.writeFileSync('src/App.tsx', code);
