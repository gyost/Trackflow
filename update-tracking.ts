import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Modernize tracking view header
let trackViewHeaderOld = `<div className="bg-[#F7F6F2] border-b border-[#1A1A1A]/10 px-4 sm:px-8 py-6 sm:py-10 flex flex-col lg:flex-row gap-6 sm:gap-10 lg:items-end justify-between">`;
let trackViewHeaderNew = `<div className="bg-[#F7F6F2] border-b border-[#1A1A1A]/5 px-4 sm:px-8 py-4 sm:py-10 flex flex-col lg:flex-row gap-6 sm:gap-10 lg:items-end justify-between pt-6 sm:pt-10">`;
code = code.replace(trackViewHeaderOld, trackViewHeaderNew);

// Make the metric cards Apple style
let trackMetricsOld = `<div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 w-[calc(100vw-32px)] sm:w-full">
             <div className="flex gap-4 sm:gap-8 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} onClick={() => setFilterStatus(filterStatus === item.status ? 'all' : item.status)} className={\`shrink-0 snap-center cursor-pointer transition-opacity \${filterStatus !== 'all' && filterStatus !== item.status ? 'opacity-30' : 'opacity-100'}\`}>`;

let trackMetricsNew = `<div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4 -mb-4 w-[calc(100vw-32px)] sm:w-full -mx-4 sm:mx-0 px-4 sm:px-0">
             <div className="flex gap-4 sm:gap-6 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} onClick={() => setFilterStatus(filterStatus === item.status ? 'all' : item.status)} className={\`bg-white/60 backdrop-blur-md rounded-2xl p-4 min-w-[120px] shrink-0 snap-start cursor-pointer hover:shadow-sm transition-all \${filterStatus === item.status ? 'shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-[#1A1A1A]/10 opacity-100 scale-105' : filterStatus !== 'all' ? 'opacity-30 border border-transparent scale-95' : 'opacity-100 border border-[#1A1A1A]/5'}\`}>`;

code = code.replace(trackMetricsOld, trackMetricsNew);

// Increase readability of tracking title
code = code.replace('<h2 className="text-3xl sm:text-4xl font-serif italic tracking-tight mb-4">项目跟踪</h2>', '<h2 className="text-3xl sm:text-4xl font-serif italic tracking-tight mb-4 text-[#1A1A1A]">项目跟踪</h2>');

// Adjust the search bar format
let searchOld = `<input 
              placeholder="搜索客户、产品、负责人..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-transparent border-b border-[#1A1A1A]/30 py-2 text-[13px] w-full outline-none focus:border-[#1A1A1A] transition-colors placeholder:opacity-50" 
            />`;
let searchNew = `<div className="flex items-center bg-black/5 rounded-xl px-3 py-2 w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                placeholder="搜索项目与客户..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="bg-transparent border-none text-[14px] w-full outline-none px-2 placeholder:text-[#1A1A1A]/30 text-[#1A1A1A] font-medium" 
              />
            </div>`;
code = code.replace(searchOld, searchNew);

// Remove the relative enclosing for search bar so we can have rounded corners cleanly without affecting flex width heavily
code = code.replace(
  '<div className="relative w-full xl:w-[320px]">\n            <div className="flex items-center',
  '<div className="w-full xl:w-[320px]">\n            <div className="flex items-center'
);

// We should fix the mobile card padding of project tracking view
code = code.replace(
  '<div className="md:hidden flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]">',
  '<div className="md:hidden flex flex-col gap-4 pb-[calc(120px+env(safe-area-inset-bottom))]">'
);

// Tweak the tracking view fab to have larger shadow standard Apple
code = code.replace(
  'bg-blue-600 text-white w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.3)] flex items-center justify-center active:scale-95 transition-transform',
  'bg-zinc-800 text-white w-14 h-14 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center active:scale-95 transition-transform'
);

fs.writeFileSync('src/App.tsx', code);
