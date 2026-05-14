import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Modernize the Requirements View Header
const oldReqHeader = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 p-6 border border-[#1A1A1A]/10">`;

const newReqHeader = `
                  {/* Desktop Header */}
                  <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 p-6 border border-[#1A1A1A]/10">`;

code = code.replace(oldReqHeader, newReqHeader);

const oldMobileHeaderClose = `                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 border-b border-[#1A1A1A]/10 px-2 overflow-x-auto whitespace-nowrap custom-scrollbar">`;

const newMobileHeaderClose = `                  </div>
                  
                  {/* Mobile Header Native Apple Style */}
                  <div className="sm:hidden px-4 pt-2 pb-4 flex flex-col gap-4">
                    <div>
                      <h2 className="text-3xl font-serif italic mb-1 text-[#1A1A1A]">需求池</h2>
                      <p className="text-[11px] opacity-50 uppercase tracking-widest">规划业务及技术需求</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <select 
                         value={reqAssigneeFilter}
                         onChange={(e) => setReqAssigneeFilter(e.target.value)}
                         className="flex-1 bg-white/80 backdrop-blur-md border border-black/5 rounded-xl py-2.5 px-3 text-[13px] font-medium outline-none text-[#1A1A1A]"
                       >
                         <option value="">筛选负责人</option>
                         {members.filter(m => m.department === 'rnd').map(m => (
                           <option key={m.id} value={m.id}>{m.name}</option>
                         ))}
                       </select>
                       <button 
                         onClick={() => setIsRequirementRecycleBinOpen(true)}
                         className="bg-white/80 backdrop-blur-md border border-black/5 w-11 h-11 rounded-xl flex items-center justify-center text-[#1A1A1A]/60"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                    </div>
                  </div>
                  
                  {/* Floating Action Button for Mobile Add Requirement */}
                  <button onClick={() => {
                        setEditingRequirementId(null);
                        setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                        setIsRequirementModalOpen(true);
                      }} 
                      className="sm:hidden fixed bottom-[calc(85px+env(safe-area-inset-bottom))] right-4 z-40 bg-zinc-800 text-white w-14 h-14 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center active:scale-95 transition-transform"
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>

                  <div className="flex items-center gap-4 sm:gap-6 border-b border-[#1A1A1A]/10 px-4 sm:px-2 overflow-x-auto whitespace-nowrap hide-scrollbar-on-mobile snap-x snap-mandatory">`;

code = code.replace(oldMobileHeaderClose, newMobileHeaderClose);

// Modernize Requirement Board Columns
const oldColumns = `<div className="flex xl:grid xl:grid-cols-6 gap-4 sm:gap-6 min-w-[max-content] xl:min-w-0 pb-4">
                  {(['backlog', 'reviewing', 'approved', 'rejected', 'planned', 'completed'] as RequirementStatus[]).map((status) => (
                    <div key={status} className="flex flex-col gap-4 w-[280px] sm:w-[320px] xl:w-auto shrink-0 snap-start">`;
                    
const newColumns = `<div className="flex xl:grid xl:grid-cols-6 gap-4 sm:gap-6 pb-4 px-4 sm:px-0">
                  {(['backlog', 'reviewing', 'approved', 'rejected', 'planned', 'completed'] as RequirementStatus[]).map((status) => (
                    <div key={status} className="flex flex-col gap-4 w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-center sm:snap-start">`;

code = code.replace(oldColumns, newColumns);

// Update Requirement Cards
const oldReqCard = `                            className={\`p-4 hover:shadow-md transition-all group relative overflow-hidden border-t border-r border-b border-[#1A1A1A]/10 border-l-4 cursor-pointer \${
                              req.status === 'backlog' ? 'bg-white border-l-gray-300' :
                              req.status === 'reviewing' ? 'bg-blue-50/30 border-l-blue-400' :
                              req.status === 'approved' ? 'bg-emerald-50/30 border-l-emerald-400' :
                              req.status === 'rejected' ? 'bg-rose-50/30 border-l-rose-400' :
                              req.status === 'planned' ? 'bg-indigo-50/30 border-l-indigo-500' :
                              'bg-slate-50/50 border-l-slate-800 opacity-80'
                            }\`}
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-2 relative z-10">`;

const newReqCard = `                            className={\`p-5 hover:shadow-md transition-transform active:scale-[0.98] group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-black/5 cursor-pointer shadow-[0_2px_10px_rgb(0,0,0,0.02)] \${
                              req.status === 'backlog' ? 'border-l-4 border-l-gray-300' :
                              req.status === 'reviewing' ? 'border-l-4 border-l-blue-400' :
                              req.status === 'approved' ? 'border-l-4 border-l-emerald-400' :
                              req.status === 'rejected' ? 'border-l-4 border-l-rose-400' :
                              req.status === 'planned' ? 'border-l-4 border-l-indigo-500' :
                              'border-l-4 border-l-slate-800 opacity-80'
                            }\`}
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-3 relative z-10">`;

code = code.replace(oldReqCard, newReqCard);

const oldReqCardTitle = `<h3 className="font-bold text-[#1A1A1A] leading-tight group-hover:text-amber-700 transition-colors mb-4 relative z-10">
                              {req.title}
                            </h3>`;

const newReqCardTitle = `<h3 className="font-bold text-[15px] sm:text-[14px] text-[#1A1A1A] leading-snug group-hover:text-amber-700 transition-colors mb-4 relative z-10">
                              {req.title}
                            </h3>`;

code = code.replace(oldReqCardTitle, newReqCardTitle);

const oldReqCardFooter = `<div className="flex items-center justify-between mt-auto pt-4 border-t border-[#1A1A1A]/10 relative z-10">`;

const newReqCardFooter = `<div className="flex items-center justify-between mt-auto pt-3 border-t border-black/5 relative z-10">`;
code = code.replace(oldReqCardFooter, newReqCardFooter);

// We need to also add some padding to the container for mobile
code = code.replace(
  '<div className="pt-4 pb-8 overflow-x-auto custom-scrollbar hide-scrollbar-on-mobile snap-x snap-mandatory">',
  '<div className="pt-4 pb-8 -mx-4 sm:mx-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth">'
);

// We should hide the unneeded border bottom on mobile for tabs
code = code.replace(
  '<div className="flex items-center gap-4 sm:gap-6 border-b border-[#1A1A1A]/10 px-4 sm:px-2 overflow-x-auto whitespace-nowrap hide-scrollbar-on-mobile snap-x snap-mandatory">',
  '<div className="flex items-center gap-4 sm:gap-6 sm:border-b border-[#1A1A1A]/10 px-4 sm:px-2 overflow-x-auto whitespace-nowrap hide-scrollbar-on-mobile snap-x snap-mandatory">'
);

fs.writeFileSync('src/App.tsx', code);
