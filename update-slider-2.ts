import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split('                {/* Client Stats Row */}\n                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">')
  .join('                {/* Client Stats Row */}\n                <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4">');

// Four items inside that we need to add snap-center shrink-0 w-full sm:w-auto
code = code.split('<div className="bg-white border border-[#1A1A1A]/10 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-[#1A1A1A]/30 hover:shadow-md transition-all">')
  .join('<div className="bg-white border border-[#1A1A1A]/10 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-[#1A1A1A]/30 hover:shadow-md transition-all min-w-[240px] sm:min-w-0 shrink-0 snap-center rounded-2xl sm:rounded-sm">');

fs.writeFileSync('src/App.tsx', code);
