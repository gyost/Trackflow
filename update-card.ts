import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldHeader = `<div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                          {status === 'backlog' ? '待评审' : 
                           status === 'reviewing' ? '评审中' : 
                           status === 'approved' ? '评审通过' : 
                           status === 'rejected' ? '已驳回' : 
                           status === 'planned' ? '已排期' : '已完成'}
                        </span>
                        <span className="text-[10px] font-mono opacity-40">{displayRequirements.filter(r => r.status === status).length}</span>
                      </div>`;

const newHeader = `<div className="flex items-center justify-between px-2 sm:px-1 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={\`w-2 h-2 rounded-full \${
                              status === 'backlog' ? 'bg-gray-400' :
                              status === 'reviewing' ? 'bg-blue-400' :
                              status === 'approved' ? 'bg-emerald-400' :
                              status === 'rejected' ? 'bg-rose-400' :
                              status === 'planned' ? 'bg-indigo-500' :
                              'bg-slate-800'
                          }\`}></div>
                          <span className="text-[14px] sm:text-[10px] font-bold uppercase sm:tracking-widest text-[#1A1A1A] sm:opacity-60">
                            {status === 'backlog' ? '待评审' : 
                             status === 'reviewing' ? '评审中' : 
                             status === 'approved' ? '评审通过' : 
                             status === 'rejected' ? '已驳回' : 
                             status === 'planned' ? '已排期' : '已完成'}
                          </span>
                        </div>
                        <div className="bg-black/5 px-2 py-0.5 rounded-full text-[12px] sm:text-[10px] font-mono font-medium text-[#1A1A1A]/60">
                           {displayRequirements.filter(r => r.status === status).length}
                        </div>
                      </div>`;

code = code.replace(oldHeader, newHeader);

// Adjust gap of cards container
const oldCardContainer = `<div className="flex flex-col gap-3 min-h-[200px]">`;
const newCardContainer = `<div className="flex flex-col gap-3 sm:gap-3 min-h-[200px]">`;
// Not much to change here, gap-3 is fine. Wait, maybe gap-4 on mobile? We'll leave it as gap-3.

// Check the card content
const oldCardTags = `<div className="flex gap-1.5 flex-wrap">
                                <span className={\`text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase \${
                                  req.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-200' : 
                                  req.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                                  'bg-gray-50 text-gray-500 border border-gray-200'
                                }\`}>
                                  {req.priority === 'high' ? 'P0' : req.priority === 'medium' ? 'P1' : 'P2'}
                                </span>
                                {req.source === 'customer' && <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-[#1A1A1A]/5 text-[#1A1A1A]/60 border border-[#1A1A1A]/10">客户客户</span>}
                                {req.source === 'internal' && <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200">内部业务</span>}
                                {req.source === 'tech' && <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-purple-50 text-purple-600 border border-purple-200">技术维护</span>}
                              </div>`;

const newCardTags = `<div className="flex gap-1.5 flex-wrap">
                                <span className={\`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase \${
                                  req.priority === 'high' ? 'bg-red-50 text-red-600' : 
                                  req.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 
                                  'bg-gray-50 text-gray-500'
                                }\`}>
                                  {req.priority === 'high' ? 'P0' : req.priority === 'medium' ? 'P1' : 'P2'}
                                </span>
                                {req.source === 'customer' && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-black/5 text-[#1A1A1A]/60">客户提出</span>}
                                {req.source === 'internal' && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-blue-50 text-blue-600">内部业务</span>}
                                {req.source === 'tech' && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-purple-50 text-purple-600">技术架构</span>}
                              </div>`;

code = code.replace(oldCardTags, newCardTags);

fs.writeFileSync('src/App.tsx', code);
