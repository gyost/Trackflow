import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldHeader = `<div className="flex items-center gap-4">
                  <h2 className="text-xl sm:text-2xl font-serif italic text-[#1A1A1A]">全局综合数据看板</h2>
                  <span className="text-[10px] font-mono tracking-widest bg-black text-white px-2 py-1">DATABOARD . V1</span>
                </div>`;
const newHeader = `<div className="flex flex-col gap-1">
                  <h2 className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">全局看板</h2>
                  <p className="text-[11px] font-sans text-[#1A1A1A]/50 uppercase tracking-widest hidden sm:block">DATABOARD . V1</p>
                </div>`;
code = code.replace(oldHeader, newHeader);

code = code.replace(
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-6 gap-2 sm:gap-0 border-b border-[#1A1A1A]/20 pb-4">',
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-6 gap-2 sm:gap-0 sm:border-b border-[#1A1A1A]/20 pb-2 sm:pb-4 px-4 sm:px-0 mt-4 sm:mt-0">'
);

code = code.replace(
  '<div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4">',
  '<div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-4 -mx-4 sm:mx-0">'
);

code = code.replace(
  '<div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4">',
  '<div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-4 -mx-4 sm:mx-0">'
);

const cardClass1 = `"bg-white/80 backdrop-blur-md border border-black/5 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[300px] sm:min-w-0 w-full shrink-0 snap-center rounded-[24px] sm:rounded-2xl"`;

code = code.replace(/className="bg-white border border-\[#1A1A1A\]\/10 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-\[#1A1A1A\]\/20 transition-all min-w-\[280px\] sm:min-w-0 w-full shrink-0 snap-center rounded-2xl sm:rounded-none"/g, 
  `className=${cardClass1}`);

const cardClass2 = `"bg-white/80 backdrop-blur-md border border-black/5 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[260px] sm:min-w-0 shrink-0 snap-center rounded-[24px] sm:rounded-2xl"`;

code = code.replace(/className="bg-white border border-\[#1A1A1A\]\/10 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-\[#1A1A1A\]\/30 hover:shadow-md transition-all min-w-\[240px\] sm:min-w-0 shrink-0 snap-center rounded-2xl sm:rounded-sm"/g, 
  `className=${cardClass2}`);

code = code.replace(/<span className="text-\[10px\] uppercase tracking-widest font-bold opacity-60 text-\[#1A1A1A\] relative z-10 w-\[85%\] leading-tight">/g, '<span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 w-[85%] leading-tight">');
code = code.replace(/<span className="text-\[10px\] uppercase tracking-widest font-bold opacity-60 text-\[#1A1A1A\] relative z-10 leading-tight">/g, '<span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 leading-tight">');
code = code.replace(/<span className="text-\[10px\] uppercase tracking-widest opacity-60 text-\[#1A1A1A\]">/g, '<span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A]">');
code = code.replace(/<span className="text-\[10px\] uppercase tracking-widest font-bold opacity-80 text-\[#1A1A1A\]">/g, '<span className="text-[12px] sm:text-[10px] font-semibold opacity-80 text-[#1A1A1A]">');

// Main section layout fixing for mobile
const sectOld = '<section className={`${currentView === \\\'tracking\\\' ? \\\'lg:col-span-12 p-0\\\' : \\\'lg:col-span-9 p-4 sm:p-6 lg:p-8\\\'} flex flex-col border-b border-[#1A1A1A] lg:border-b-0 h-auto lg:h-full lg:overflow-y-auto bg-[#F7F6F2] ${currentView === \\\'dashboard\\\' ? \\\'order-1 lg:order-2\\\' : \\\'\\\'}`}>';
const sectNew = '<section className={`${currentView === \\\'tracking\\\' ? \\\'lg:col-span-12 p-0\\\' : \\\'lg:col-span-9 p-0 sm:p-6 lg:p-8 pt-4 sm:pt-6\\\'} flex flex-col sm:border-b border-[#1A1A1A]/10 lg:border-b-0 h-[100dvh] lg:h-full overflow-y-auto lg:overflow-y-auto bg-[#F7F6F2] ${currentView === \\\'dashboard\\\' ? \\\'order-1 lg:order-2 pb-32 sm:pb-6\\\' : \\\'pb-24 sm:pb-6\\\'}`}>';
code = code.replace(sectOld, sectNew);

code = code.replace(/className="bg-white border border-\[#1A1A1A\]\/10 p-6 shadow-sm hover:shadow-md transition-shadow"/g, 'className="bg-white/80 backdrop-blur-md border border-black/5 p-6 rounded-[24px] sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]"');
code = code.replace(/className="bg-white border border-\[#1A1A1A\]\/10 p-6 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow"/g, 'className="bg-white/80 backdrop-blur-md border border-black/5 p-6 lg:col-span-2 rounded-[24px] sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]"');
code = code.replace('<div className="grid grid-cols-1 lg:grid-cols-2 gap-10">', '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 px-4 sm:px-0 mb-8 sm:mb-0">');

fs.writeFileSync('src/App.tsx', code);
