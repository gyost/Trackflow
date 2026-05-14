import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldTable = `<div className="overflow-x-auto">
                 <table className="w-full text-sm text-left whitespace-nowrap">`;

const replaceTable = `               {/* Desktop Table */}
               <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-sm text-left whitespace-nowrap">`;

code = code.replace(oldTable, replaceTable);

const closeTable = `                   </tbody>
                 </table>
               </div>`;

const replaceCloseTable = `                   </tbody>
                 </table>
               </div>
               
               {/* Mobile Card Layout */}
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

code = code.replace(closeTable, replaceCloseTable);

fs.writeFileSync('src/App.tsx', code);
