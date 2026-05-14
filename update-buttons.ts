import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldMetrics2 = `           <div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 w-[calc(100vw-32px)] sm:w-full">
             <div className="flex gap-4 sm:gap-8 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} className="shrink-0 snap-center">`;

const newMetrics2 = `           <div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 w-[calc(100vw-32px)] sm:w-full">
             <div className="flex gap-4 sm:gap-8 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} onClick={() => setFilterStatus(filterStatus === item.status ? 'all' : item.status)} className={\`shrink-0 snap-center cursor-pointer transition-opacity \${filterStatus !== 'all' && filterStatus !== item.status ? 'opacity-30' : 'opacity-100'}\`}>`;

code = code.replace(oldMetrics2, newMetrics2);

// Make the Add Project button floating on mobile!
const oldButtons = `             <div className="flex items-center gap-2 w-full xl:w-auto">
             
             <button onClick={() => {
                if (filtered.length === 0) return;`;

const newButtons = `             <div className="flex items-center gap-2 w-full xl:w-auto">
             
             {/* Desktop Add Project Button */}
             <button onClick={onAdd} className="hidden sm:flex bg-[#1A1A1A] text-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-colors shrink-0 items-center gap-2">
               <span className="text-sm leading-none">+</span> 新增项目
             </button>

             {/* Mobile Add Project FAB */}
             <button onClick={onAdd} className="sm:hidden fixed bottom-24 right-4 z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.3)] flex items-center justify-center active:scale-95 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
             
             <button onClick={() => {
                if (filtered.length === 0) return;`;

code = code.replace(oldButtons, newButtons);

// Hide Export button on mobile
const exportButton = `className="bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] px-4 py-2 text-[11px] font-bold hover:bg-[#1A1A1A]/5 transition-colors shrink-0 flex items-center gap-1 ml-2">
               导出数据
             </button>`;

const replaceExportButton = `className="hidden sm:flex bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] px-4 py-2 text-[11px] font-bold hover:bg-[#1A1A1A]/5 transition-colors shrink-0 items-center gap-1 ml-2">
               导出数据
             </button>`;

code = code.replace(exportButton, replaceExportButton);

// Remove the old inline desktop Add project button
const oldAddButton = `             <button onClick={onAdd} className="bg-[#1A1A1A] text-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-colors shrink-0 flex items-center gap-2 ml-2">
               <span className="text-sm leading-none">+</span> 新增项目
             </button>`;

code = code.replace(oldAddButton, '');

fs.writeFileSync('src/App.tsx', code);
