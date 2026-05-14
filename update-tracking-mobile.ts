import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldCards = `{/* Mobile Card Layout */}
               <div className="md:hidden flex flex-col gap-4 pb-20">
                 {filtered.map((t, i) => (
                   <div key={t.id} className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-transform" onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))}>
                     {/* Header */}
                     <div className="flex justify-between items-start">
                       <div className="pr-12">
                         <div className="text-[10px] font-mono opacity-50 mb-1">#{i + 1} &middot; {t.lastFollowupDate || '无跟进记录'}</div>
                         <h3 className="font-bold text-[15px] text-[#1A1A1A] leading-tight flex items-center">
                           <span className="truncate">{t.customerName}</span>
                         </h3>
                       </div>
                       
                       {/* Status pill in absolute top right */}
                       <div className="absolute top-5 right-5">
                          <span className={\`px-2.5 py-1 rounded-full text-[10px] font-bold border 
                            \${t.status === 'followup' ? 'border-amber-400 text-amber-600 bg-amber-50' : 
                              t.status === 'implementing' ? 'border-blue-400 text-blue-600 bg-blue-50' : 
                              t.status === 'accepting' ? 'border-green-400 text-green-600 bg-green-50' : 
                              t.status === 'quoted' ? 'border-purple-400 text-purple-600 bg-purple-50' : 
                              t.status === 'archived' ? 'border-stone-400 text-stone-600 bg-stone-50' :
                              'border-gray-300 text-gray-500 bg-gray-50'}\`}
                          >
                             {statusLabels[t.status]}
                          </span>
                       </div>
                     </div>
                     
                     {/* Information Grid */}
                     <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-[#1A1A1A]/5 pt-4">
                       <div>
                         <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-0.5">产品/意向</div>
                         <div className="text-[11px] font-semibold">{t.product || '—'}</div>
                       </div>
                       <div>
                         <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-0.5">联系人</div>
                         <div className="text-[11px] font-semibold">{t.contactName || '—'}</div>
                       </div>
                       <div>
                         <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-0.5">负责人</div>
                         <div className="text-[11px] font-semibold">{(t.cityManager || t.projectManager) ? \`\${t.cityManager || ''} \${t.projectManager || ''}\`.trim() : '—'}</div>
                       </div>
                       <div>
                         <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-0.5">预期/达成</div>
                         <div className="text-[11px] font-mono font-bold">
                           <span className="opacity-60">{t.expectedContractAmount > 0 ? (t.expectedContractAmount / 10000).toFixed(0) : '0'}</span>
                           <span className="opacity-40 mx-1">/</span>
                           <span className="text-emerald-600">{t.actualContractAmount > 0 ? (t.actualContractAmount / 10000).toFixed(0) : '0'}万</span>
                         </div>
                       </div>
                     </div>
                     
                     {/* Actions (Stop propagation to prevent card click) */}
                     <div className="flex gap-2 mt-2 pt-4 border-t border-[#1A1A1A]/5" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleAction(t.id, 'followup', () => onAddFollowup(t))}
                          disabled={t.status === 'terminated' || t.status === 'archived'}
                          className="flex-1 bg-[#1A1A1A] text-white py-2.5 rounded-xl text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform disabled:opacity-30 flex justify-center items-center"
                        >
                          写跟进
                        </button>
                        <button 
                          onClick={() => handleAction(t.id, 'edit', () => onEdit(t))}
                          disabled={t.status === 'terminated' || t.status === 'archived'}
                          className="flex-1 bg-[#1A1A1A]/5 text-[#1A1A1A] py-2.5 rounded-xl text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform disabled:opacity-30 flex justify-center items-center"
                        >
                          修改
                        </button>
                     </div>
                   </div>
                 ))}
               </div>`;

const newCards = `{/* Mobile Card Layout */}
               <div className="md:hidden flex flex-col gap-4 pb-20">
                 {filtered.map((t, i) => (
                   <div key={t.id} className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-[24px] p-5 flex flex-col gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden active:scale-[0.98] transition-transform" onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))}>
                     {/* Header */}
                     <div className="flex flex-col gap-1.5 pr-14">
                        <div className="flex items-center gap-2">
                           <span className={\`w-2 h-2 rounded-full \${statusColors[t.status]}\`}></span>
                           <span className="text-[10px] font-mono tracking-widest opacity-50 uppercase">{statusLabels[t.status]}</span>
                        </div>
                        <h3 className="font-bold text-[17px] text-[#1A1A1A] leading-snug">
                          {t.customerName}
                        </h3>
                     </div>
                       
                     {/* Call Action in absolute top right */}
                     {t.contactPhone && (
                       <button onClick={(e) => { e.stopPropagation(); window.location.href = \`tel:\${t.contactPhone}\`; }} className="absolute top-5 right-5 w-10 h-10 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 rounded-full flex items-center justify-center transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#1A1A1A]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                       </button>
                     )}
                     
                     {/* Metrics Ribbon */}
                     <div className="flex bg-[#1A1A1A]/[0.03] rounded-2xl p-4 gap-4">
                        <div className="flex-1">
                           <div className="text-[10px] opacity-40 mb-1 font-bold tracking-widest">预期 (万)</div>
                           <div className="font-mono text-lg font-medium opacity-80">{t.expectedContractAmount > 0 ? (t.expectedContractAmount / 10000).toFixed(0) : '0'}</div>
                        </div>
                        <div className="w-[1px] bg-black/5"></div>
                        <div className="flex-1">
                           <div className="text-[10px] opacity-40 mb-1 font-bold tracking-widest">达成 (万)</div>
                           <div className="font-mono text-lg font-bold text-emerald-600">{t.actualContractAmount > 0 ? (t.actualContractAmount / 10000).toFixed(0) : '0'}</div>
                        </div>
                     </div>
                     
                     {/* Footer Info */}
                     <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                           <span className="text-[11px] font-mono font-medium">{t.lastFollowupDate || '无记录'}</span>
                        </div>
                        <div className="text-[11px] font-bold opacity-60">
                           {(t.cityManager || t.projectManager) ? \`\${t.cityManager || ''} \${t.projectManager || ''}\`.trim() : '未指派'}
                        </div>
                     </div>
                     
                     {/* Floating Actions */}
                     <div className="absolute bottom-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                       {/* This could be hidden on touch devices and mostly rely on clicking the card. But let's show subtle action buttons. */}
                     </div>
                   </div>
                 ))}
               </div>`;

code = code.replace(oldCards, newCards);

fs.writeFileSync('src/App.tsx', code);
