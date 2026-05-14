import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldMetrics = `{/* Global Metrics Inline */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-6 sm:gap-12 text-left lg:text-right w-full lg:w-auto">
           <div>
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">客户总数</div>
              <div className="text-3xl sm:text-4xl font-serif italic">{filtered.length}</div>
           </div>
           {statusCounts.map(item => (
              <div key={item.status}>
                  <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2 flex items-center lg:justify-end gap-1.5">
                     {statusLabels[item.status]}
                     <span className={\`w-1.5 h-1.5 rounded-full \${statusColors[item.status]}\`}></span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-serif italic">{item.count}</div>
              </div>
           ))}
           <div className="col-span-2 sm:col-span-1 pt-6 sm:pt-0 border-t sm:border-t-0 lg:pl-12 lg:border-l border-[#1A1A1A]/10">
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">已达成转化</div>
              <div className="text-3xl sm:text-4xl font-serif italic">¥{totalAmount.toLocaleString()}</div>
           </div>
        </div>`;

const newMetrics = `{/* Global Metrics Inline */}
        <div className="flex flex-col lg:items-end w-full lg:w-auto">
           <div className="flex flex-wrap lg:flex-nowrap items-baseline gap-6 sm:gap-12 text-left lg:text-right w-full lg:w-auto mb-6 lg:mb-10">
             <div>
                <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">客户总数</div>
                <div className="text-4xl sm:text-5xl font-serif italic">{filtered.length}</div>
             </div>
             <div className="flex-1 lg:flex-none pt-4 sm:pt-0 lg:pl-12 lg:border-l border-[#1A1A1A]/10">
                <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-2">已达成转化</div>
                <div className="text-4xl sm:text-5xl font-serif italic text-emerald-700">¥{totalAmount.toLocaleString()}</div>
             </div>
           </div>
           
           <div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 w-[calc(100vw-32px)] sm:w-full">
             <div className="flex gap-4 sm:gap-8 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} className="shrink-0 snap-center">
                      <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1.5 flex items-center lg:justify-end gap-1.5">
                         {statusLabels[item.status]}
                         <span className={\`w-1.5 h-1.5 rounded-full \${statusColors[item.status]}\`}></span>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif italic">{item.count}</div>
                  </div>
               ))}
             </div>
           </div>
        </div>`;

code = code.replace(oldMetrics, newMetrics);
fs.writeFileSync('src/App.tsx', code);
