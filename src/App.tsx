/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  isSameWeek, 
  parseISO,
  getISOWeek
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { HelpCircle, LayoutDashboard, Target, TrendingUp, Code2, ClipboardList, User, Settings, LogOut, Search } from 'lucide-react';
import { mockProjects, mockPlans as initialPlans, mockTasks as initialTasks, mockOutcomes as initialOutcomes, mockMembers, mockGroups, mockRequirements as initialRequirements } from './mockData';
import { Plan, Task, Outcome, Group, Member, Project, Status, Priority, Requirement, RequirementStatus, RequirementHistory, ReleaseGoal, ProjectTracking, TrackingStatus, FollowupRecord } from './types';
import { generateId } from './lib/utils';
import SettingsModal from './components/SettingsModal';
import RichTextEditor from './components/RichTextEditor';
import Login from './components/Login';
import AccountSetupModal from './components/AccountSetupModal';
import { apiService } from './services/apiService';

import GuideModal from './components/GuideModal';
import ProfileModal from './components/ProfileModal';

const TaskProgressInput = React.memo(({ task, onUpdate }: { task: Task, onUpdate: (val: number) => void }) => {
  const [localVal, setLocalVal] = useState(task.progress.toString());
  
  useEffect(() => {
    if (task.progress.toString() !== localVal && localVal !== '') {
      setLocalVal(task.progress.toString());
    }
  }, [task.progress]);

  return (
    <div 
      className="flex items-center gap-0.5 shrink-0 bg-[#EBE9E4] px-1 py-0.5 border border-[#1A1A1A]/10"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <input 
        type="number" 
        value={localVal}
        min="0"
        max="100"
        onFocus={(e) => e.target.select()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setLocalVal(e.target.value);
          if (e.target.value === '') {
            onUpdate(0);
          } else {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 0;
            if (val > 100) val = 100;
            if (val < 0) val = 0;
            onUpdate(val);
          }
        }}
        onBlur={() => {
          if (localVal === '') {
            setLocalVal('0');
            onUpdate(0);
          }
        }}
        className="w-7 text-[10px] font-mono opacity-80 bg-transparent outline-none border-b border-transparent hover:border-[#1A1A1A]/30 focus:border-[#1A1A1A]/50 text-right hide-number-arrows"
      />
      <span className="text-[10px] font-mono opacity-80">%</span>
    </div>
  );
});

const ProjectTrackingView = ({ 
  trackings, onDelete, onEdit, onAdd, 
  filterStatus, setFilterStatus, searchTerm, setSearchTerm,
  statusColors, statusLabels,
  year, month, setYear, setMonth,
  onAddFollowup, onViewDetails, onStatusChange, annualTargetProfit
}: { 
  trackings: ProjectTracking[], onDelete: (id: string) => void, onEdit: (t: ProjectTracking) => void, onAdd: () => void,
  filterStatus: 'all' | TrackingStatus, setFilterStatus: (s: 'all' | TrackingStatus) => void,
  searchTerm: string, setSearchTerm: (t: string) => void,
  statusColors: Record<TrackingStatus, string>, statusLabels: Record<TrackingStatus, string>,
  year: number, month: number, setYear: (y: number) => void, setMonth: (m: number) => void,
  onAddFollowup: (t: ProjectTracking) => void, onViewDetails: (t: ProjectTracking) => void,
  onStatusChange: (id: string, status: TrackingStatus) => void,
  annualTargetProfit: number
}) => {
  const monthTrackings = trackings.filter(t => {
    const d = new Date(t.updatedAt);
    return d.getFullYear() === year && (month === 0 || (d.getMonth() + 1) === month);
  });

  const filtered = monthTrackings.filter(t => {
    return (filterStatus === 'all' || t.status === filterStatus) && 
           (t.customerName.includes(searchTerm) || 
            t.product.includes(searchTerm) || 
            (t.cityManager && t.cityManager.includes(searchTerm)) || 
            (t.projectManager && t.projectManager.includes(searchTerm)));
  });
  
  const totalAmount = monthTrackings.reduce((acc, curr) => acc + curr.actualContractAmount, 0);
  const statusCounts = (Object.keys(statusLabels) as TrackingStatus[]).map(s => ({
      status: s,
      count: monthTrackings.filter(t => t.status === s).length
  }));

  const [loadingAction, setLoadingAction] = React.useState<{id: string, type: string} | null>(null);

  const handleAction = async (id: string, type: string, actionFn: () => void) => {
    setLoadingAction({ id, type });
    // Simulate a small network delay for obvious loading feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    actionFn();
    setLoadingAction(null);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#F7F6F2] text-[#1A1A1A] overflow-hidden">
      {/* Sleek Header & Metric Row */}
      <div className="bg-[#F7F6F2] border-b border-[#1A1A1A]/5 px-4 sm:px-8 py-4 sm:py-10 flex flex-col lg:flex-row gap-6 sm:gap-10 lg:items-end justify-between pt-6 sm:pt-10">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif italic tracking-tight mb-4 text-[#1A1A1A]">项目跟踪</h2>
          <div className="flex gap-4 text-xs font-mono uppercase tracking-widest opacity-60">
             <div className="flex items-center gap-2 border-b border-[#1A1A1A]/20 pb-1 cursor-pointer hover:opacity-100 transition-opacity">
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-transparent outline-none cursor-pointer appearance-none">
                    {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} {month === 0 ? '年' : '/'}</option>)}
                </select>
             </div>
             <div className="flex items-center gap-2 border-b border-[#1A1A1A]/20 pb-1 cursor-pointer hover:opacity-100 transition-opacity">
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-transparent outline-none cursor-pointer appearance-none">
                    <option value={0}>全年</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}月</option>)}
                </select>
             </div>
          </div>
        </div>

        {/* Global Metrics Inline */}
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
           
           <div className="flex overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-4 -mb-4 w-[calc(100vw-32px)] sm:w-full -mx-4 sm:mx-0 px-4 sm:px-0">
             <div className="flex gap-4 sm:gap-6 shrink-0 pb-2">
               {statusCounts.map(item => (
                  <div key={item.status} onClick={() => setFilterStatus(filterStatus === item.status ? 'all' : item.status)} className={`bg-white/60 backdrop-blur-md rounded-2xl p-4 min-w-[120px] shrink-0 snap-start cursor-pointer hover:shadow-sm transition-all ${filterStatus === item.status ? 'shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-[#1A1A1A]/10 opacity-100 scale-105' : filterStatus !== 'all' ? 'opacity-30 border border-transparent scale-95' : 'opacity-100 border border-[#1A1A1A]/5'}`}>
                      <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1.5 flex items-center lg:justify-end gap-1.5">
                         {statusLabels[item.status]}
                         <span className={`w-1.5 h-1.5 rounded-full ${statusColors[item.status]}`}></span>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif italic">{item.count}</div>
                  </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col min-h-0">
        {/* Tool Bar */}
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 items-start xl:items-center justify-between shrink-0">
          <div className="w-full xl:w-[320px]">
            <div className="flex items-center bg-black/5 rounded-xl px-3 py-2 w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                placeholder="搜索项目与客户..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="bg-transparent border-none text-[14px] w-full outline-none px-2 placeholder:text-[#1A1A1A]/30 text-[#1A1A1A] font-medium" 
              />
            </div>
          </div>
          
          <div className="flex flex-col xl:flex-row xl:flex-wrap items-start xl:items-center gap-4 sm:gap-6 text-[11px] sm:text-[13px] w-full xl:w-auto mt-2 xl:mt-0">
             
             {/* Swipeable Tabs for mobile */}
             <div className="hidden xl:flex w-full xl:w-auto overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory pb-2 -mb-2 gap-4 sm:gap-6 shrink-0">
               <button 
                 onClick={() => setFilterStatus('all')}
                 className={`font-bold whitespace-nowrap shrink-0 snap-start transition-colors ${filterStatus === 'all' ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/80 pb-1'}`}
               >
                 全部 ({monthTrackings.length})
               </button>
               {Object.keys(statusLabels).map(s => {
                 const st = s as TrackingStatus;
                 const count = monthTrackings.filter(t => t.status === st).length;
                 return (
                   <button 
                     key={st}
                     onClick={() => setFilterStatus(st)}
                     className={`font-bold whitespace-nowrap shrink-0 snap-start transition-colors ${filterStatus === st ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-1' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/80 pb-1'}`}
                   >
                     {statusLabels[st]} ({count})
                   </button>
                 );
               })}
             </div>
             
             <div className="hidden xl:block w-[1px] h-4 bg-[#1A1A1A]/20 ml-2"></div>
             
             <div className="flex items-center gap-2 w-full xl:w-auto">
             
             {/* Desktop Add Project Button */}
             <button onClick={onAdd} className="hidden sm:flex bg-[#1A1A1A] text-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-colors shrink-0 items-center gap-2">
               <span className="text-sm leading-none">+</span> 新增项目
             </button>

             {/* Mobile Add Project FAB */}
             <button onClick={onAdd} className="sm:hidden fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-4 z-40 bg-zinc-800 text-white w-14 h-14 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center active:scale-95 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
             
             <button onClick={() => {
                if (filtered.length === 0) return;
                const headers = ['客户名称', '状态', '合作意向/产品', '市场负责人', '项目负责人', '预期(万)', '已达成(万)', '最近跟进', '联系人', '联系电话'];
                const rows = filtered.map((t) => [
                  t.customerName || '',
                  statusLabels[t.status] || '',
                  t.product || '',
                  t.cityManager || '',
                  t.projectManager || '',
                  (t.expectedContractAmount > 0 ? (t.expectedContractAmount / 10000).toFixed(2) : '0'),
                  (t.actualContractAmount > 0 ? (t.actualContractAmount / 10000).toFixed(2) : '0'),
                  t.lastFollowupDate || '',
                  t.contactName || '',
                  t.contactPhone || ''
                ]);
                const csvContent = [
                  headers.join(','),
                  ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))
                ].join('\n');
                const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const d = new Date();
                link.setAttribute('download', `项目跟踪导出_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
             }} className="hidden sm:flex bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] px-4 py-2 text-[11px] font-bold hover:bg-[#1A1A1A]/5 transition-colors shrink-0 items-center gap-1 ml-2">
               导出数据
             </button>


             </div>
          </div>
        </div>

        {/* Data List Wrapper (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-12 h-12 border border-[#1A1A1A]/10 rounded-full flex items-center justify-center text-2xl font-serif italic opacity-20 mb-4">0</div>
               <div className="text-xs uppercase tracking-widest opacity-40">暂无符合条件的项目记录</div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
                              {/* Desktop Table */}
               <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-sm text-left whitespace-nowrap">
                   <thead className="sticky top-0 bg-[#F7F6F2] z-10">
                     <tr className="border-b-2 border-[#1A1A1A]/20 text-xs font-bold text-[#1A1A1A] h-12">
                       <th className="px-4 font-bold">#</th>
                       <th className="px-4 font-bold">客户名称</th>
                       <th className="px-4 font-bold text-center">状态</th>
                       <th className="px-4 font-bold">合作意向/产品</th>
                       <th className="px-4 font-bold">市场负责人</th>
                       <th className="px-4 font-bold">项目负责人</th>
                       <th className="px-4 font-bold text-right">预期合同额</th>
                       <th className="px-4 font-bold text-right">已达成（万）</th>
                       <th className="px-4 font-bold">最近跟进</th>
                       <th className="px-4 font-bold">客户联系人</th>
                       <th className="px-4 font-bold text-center">操作</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filtered.map((t, i) => (
                       <tr key={t.id} className="border-b border-[#1A1A1A]/5 hover:bg-[#F7F6F2] transition-colors group h-14">
                         <td className="px-4 text-xs opacity-80">{i + 1}</td>
                         <td className="px-4 font-medium">{t.customerName}</td>
                         <td className="px-4 text-center">
                            <select 
                              value={t.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onStatusChange(t.id, e.target.value as TrackingStatus)}
                              disabled={t.status === 'terminated' || t.status === 'archived'}
                              className={`appearance-none bg-transparent outline-none cursor-pointer inline-flex items-center justify-center px-3 py-1 rounded-full border text-[11px] font-medium min-w-[80px] text-center
                                ${t.status === 'followup' ? 'border-amber-400 text-amber-600' : 
                                  t.status === 'implementing' ? 'border-blue-400 text-blue-600' : 
                                  t.status === 'accepting' ? 'border-green-400 text-green-600' : 
                                  t.status === 'quoted' ? 'border-purple-400 text-purple-600' : 
                                  t.status === 'archived' ? 'border-stone-400 text-stone-600' :
                                  'border-gray-300 text-gray-500'}
                                ${t.status === 'terminated' || t.status === 'archived' ? 'cursor-not-allowed opacity-80' : ''}  
                              `}
                            >
                              {Object.entries(statusLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                         </td>
                         <td className="px-4 text-sm opacity-90">{t.product}</td>
                         <td className="px-4 text-sm opacity-90">{t.cityManager}</td>
                         <td className="px-4 text-sm opacity-90">{t.projectManager}</td>
                         <td className="px-4 text-sm font-mono opacity-80 text-right">
                           {t.expectedContractAmount > 0 ? t.expectedContractAmount.toLocaleString() : '—'}
                         </td>
                         <td className="px-4 text-sm font-mono text-emerald-600 text-right">
                           {t.actualContractAmount > 0 ? (t.actualContractAmount / 10000).toFixed(2) : '—'}
                         </td>
                         <td className="px-4 text-sm font-mono opacity-80">{t.lastFollowupDate || '—'}</td>
                         <td className="px-4 text-sm opacity-90">{t.contactName}</td>
                         <td className="px-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleAction(t.id, 'followup', () => onAddFollowup(t))} 
                             disabled={loadingAction !== null || t.status === 'terminated' || t.status === 'archived'}
                             className={`inline-flex items-center justify-center ${t.status === 'terminated' || t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium mr-2 transition-all disabled:opacity-50 min-w-[56px]`}
                           >
                             {loadingAction?.id === t.id && loadingAction?.type === 'followup' ? (
                               <span className="w-3 h-3 border-[1.5px] border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                             ) : null}
                             跟进
                           </button>
                           <button 
                             onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))} 
                             disabled={loadingAction !== null}
                             className={`inline-flex items-center justify-center bg-gray-50 text-[#1A1A1A] hover:bg-gray-200 active:scale-95 px-2.5 py-1.5 rounded text-[11px] font-medium mr-2 transition-all disabled:opacity-50 min-w-[56px]`}
                           >
                             {loadingAction?.id === t.id && loadingAction?.type === 'details' ? (
                               <span className="w-3 h-3 border-[1.5px] border-[#1A1A1A] border-t-transparent rounded-full animate-spin mr-1"></span>
                             ) : null}
                             详情
                           </button>
                           <button 
                             onClick={() => handleAction(t.id, 'edit', () => onEdit(t))} 
                             disabled={loadingAction !== null || t.status === 'terminated' || t.status === 'archived'}
                             className={`inline-flex items-center justify-center ${t.status === 'terminated' || t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-[#1A1A1A] hover:bg-gray-200 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium mr-2 transition-all disabled:opacity-50 min-w-[56px]`}
                           >
                             {loadingAction?.id === t.id && loadingAction?.type === 'edit' ? (
                               <span className="w-3 h-3 border-[1.5px] border-[#1A1A1A] border-t-transparent rounded-full animate-spin mr-1"></span>
                             ) : null}
                             修改
                           </button>
                           <button 
                             onClick={() => handleAction(t.id, 'delete', () => onDelete(t.id))} 
                             disabled={loadingAction !== null || t.status === 'terminated' || t.status === 'archived'}
                             className={`inline-flex items-center justify-center ${t.status === 'terminated' || t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium transition-all disabled:opacity-50 min-w-[56px]`}
                           >
                             {loadingAction?.id === t.id && loadingAction?.type === 'delete' ? (
                               <span className="w-3 h-3 border-[1.5px] border-red-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                             ) : null}
                             作废
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* Mobile Card Layout */}
               <div className="md:hidden flex flex-col gap-4 pb-[calc(120px+env(safe-area-inset-bottom))]">
                 {filtered.map((t, i) => (
                   <div key={t.id} className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-[24px] p-5 flex flex-col gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden active:scale-[0.98] transition-transform" onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))}>
                     {/* Header */}
                     <div className="flex flex-col gap-1.5 pr-14">
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${statusColors[t.status]}`}></span>
                           <span className="text-[10px] font-mono tracking-widest opacity-50 uppercase">{statusLabels[t.status]}</span>
                        </div>
                        <h3 className="font-bold text-[17px] text-[#1A1A1A] leading-snug">
                          {t.customerName}
                        </h3>
                     </div>
                       
                     {/* Call Action in absolute top right */}
                     {t.contactPhone && (
                       <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${t.contactPhone}`; }} className="absolute top-5 right-5 w-10 h-10 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 rounded-full flex items-center justify-center transition-colors">
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
                           {(t.cityManager || t.projectManager) ? `${t.cityManager || ''} ${t.projectManager || ''}`.trim() : '未指派'}
                        </div>
                     </div>
                     
                     {/* Floating Actions */}
                     <div className="absolute bottom-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                       {/* This could be hidden on touch devices and mostly rely on clicking the card. But let's show subtle action buttons. */}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [outcomes, setOutcomes] = useState<Outcome[]>(initialOutcomes);
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [releaseGoals, setReleaseGoals] = useState<ReleaseGoal[]>([]);
  const [projectTrackings, setProjectTrackings] = useState<ProjectTracking[]>([]);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState<Omit<ProjectTracking, 'id' | 'updatedAt'>>({
    customerName: '', status: 'followup', product: '', cityManager: '', projectManager: '',
    expectedContractAmount: 0, actualContractAmount: 0, contactName: '', contactPhone: ''
  });
  const [trackingFilterStatus, setTrackingFilterStatus] = useState<TrackingStatus | 'all'>('all');
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
  const [trackingYear, setTrackingYear] = useState(new Date().getFullYear());
  const [trackingMonth, setTrackingMonth] = useState(new Date().getMonth() + 1);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({ date: '', content: '' });
  const [isTrackingDetailModalOpen, setIsTrackingDetailModalOpen] = useState(false);
  const [isTerminateTrackingModalOpen, setIsTerminateTrackingModalOpen] = useState(false);
  const [trackingToTerminate, setTrackingToTerminate] = useState<string | null>(null);
  const [selectedTrackingDetail, setSelectedTrackingDetail] = useState<ProjectTracking | null>(null);
  const statusColors: Record<TrackingStatus, string> = {
    followup: 'bg-amber-500', 
    implementing: 'bg-blue-500', 
    accepting: 'bg-green-500', 
    quoted: 'bg-purple-500', 
    terminated: 'bg-gray-500',
    archived: 'bg-stone-600'
  };
  const statusLabels: Record<TrackingStatus, string> = {
    followup: '跟进中', 
    implementing: '实施中', 
    accepting: '验收中', 
    quoted: '已报价', 
    terminated: '已作废',
    archived: '完成归档'
  };
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('groups');
    if (saved) return JSON.parse(saved);
    return mockGroups;
  });

  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups));
  }, [groups]);
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('members');
    if (saved) {
      const parsedMembers = JSON.parse(saved);
      return parsedMembers.map((m: any) => ({
        ...m,
        roles: m.roles || (m.role ? [m.role] : [])
      }));
    }
    return mockMembers;
  });

  useEffect(() => {
    localStorage.setItem('members', JSON.stringify(members));
  }, [members]);
  const [quarterGoalsTexts, setQuarterGoalsTexts] = useState<Record<string, string>>({});
  const [editingQuarterGroupIds, setEditingQuarterGroupIds] = useState<string[]>([]);
  
  // Refactored State: Separate profit target
  const [annualTargetProfit, setAnnualTargetProfit] = useState<number>(1000);
  
  const [authorizedCompanies, setAuthorizedCompanies] = useState<string[]>(() => {
    const saved = localStorage.getItem('authorizedCompanies');
    if (saved) return JSON.parse(saved);
    return ['Apple Inc.', 'Test Company'];
  });

  useEffect(() => {
    localStorage.setItem('authorizedCompanies', JSON.stringify(authorizedCompanies));
  }, [authorizedCompanies]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedQuarter, setSelectedQuarter] = useState(`${new Date().getFullYear()}-Q${Math.floor((new Date().getMonth() + 3) / 3)}`);
  const [selectedYear, setSelectedYear] = useState(`${new Date().getFullYear()}`);
  const [reqTimeFrame, setReqTimeFrame] = useState<'month' | 'quarter' | 'year'>('month');
  const [reqAssigneeFilter, setReqAssigneeFilter] = useState<string>('');
  const [reqTabFilter, setReqTabFilter] = useState<'all' | 'created' | 'assigned'>('all');
  const [selectedTaskGroupIds, setSelectedTaskGroupIds] = useState<Record<string, string>>({});
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [guideContent, setGuideContent] = useState(() => {
    const saved = localStorage.getItem('guideContent');
    if (saved) return saved;
    return `
      <section>
        <h3 class="font-bold text-lg mb-3 flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
          系统定位
        </h3>
        <p>
          《项目跟踪系统（Air版本）》是一个轻量级的协同管理中枢，旨在帮助团队将抽象的季度目标转化为具体的周执行计划，并对项目和任务的进展进行透明化跟踪。本系统抛弃了繁重的管理流程，专注于“目标—拆解—执行—反馈”的敏捷循环。
        </p>
      </section>

      <section>
        <h3 class="font-bold text-lg mb-3 flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
          模块概览
        </h3>
        <ul class="list-disc pl-5 space-y-2 opacity-90">
          <li><strong>全局看板（Dashboard）：</strong>展现核心业务指标（包含营业目标达成度、客户漏斗等）及年度核心经营测算，帮助管理者总览全局。</li>
          <li><strong>部门跟进（如市场部、研发部等）：</strong>展示特定部门的周执行简报以及个人产出，细化到各负责人的具体任务和交付物。</li>
          <li><strong>季度核心目标（侧边栏）：</strong>用于记录各小组或部门的季度OKR，支持富文本编辑，确保方向始终对齐。</li>
        </ul>
      </section>

      <section>
        <h3 class="font-bold text-lg mb-3 flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
          核心操作说明
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-bold mb-1 opacity-100">1. 编辑季度目标</h4>
            <p>在左侧边栏“季度核心目标”区域，点击相应小组右上方的“编辑”按钮，可进入富文本编辑模式，修改当前小组的季度目标内容，完成后点击“保存”。</p>
          </div>
          <div>
            <h4 class="font-bold mb-1 opacity-100">2. 录入与调整营业目标 (全局看板)</h4>
            <p>在“核心业务指标与目标管理”卡片右上角或对应月份，点击设置图标或“录入实际”按钮，可更新每月的指标目标值及实际完成情况。</p>
          </div>
          <div>
            <h4 class="font-bold mb-1 opacity-100">3. 任务与进度管理</h4>
            <p>在部门跟进视图中，点击成员卡片内的“推进”按钮更新任务进度（10%-100%）。点击右上侧的“+ 新增任务”为特定成员分配新任务。</p>
          </div>
          <div>
            <h4 class="font-bold mb-1 opacity-100">4. 产出物登记</h4>
            <p>任务完成后或阶段性交付时，在个人卡片下的“核心产出交付”区域，点击“+ 登记新产出”并填写说明及链接。</p>
          </div>
        </div>
      </section>

      <section class="bg-gray-50 border border-[#1A1A1A]/10 p-4">
        <h3 class="font-bold mb-2 flex items-center gap-2 text-[#1A1A1A]">
          注意事項
        </h3>
        <p class="text-xs opacity-75">
          本Air版本采用前端本地化存储或简化状态管理进行演示验证，刷新页面后如果未接后端，数据可能恢复初始状态。实际使用中请确保绑定您的账号（已通过手机号码登入）。如需系统设置调整（编排人员、定制年度利润等），请点击右上角的齿轮图标进入系统设置。
        </p>
      </section>
    `;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, plansData, tasksData, outcomesData, requirementsData, releaseGoalsData, trackingsData] = await Promise.all([
          apiService.getProjects(),
          apiService.getPlans(),
          apiService.getTasks(),
          apiService.getOutcomes(),
          apiService.getRequirements(),
          apiService.getReleaseGoals(),
          apiService.getProjectTrackings()
        ]);
        setProjects(projectsData.length > 0 ? projectsData : mockProjects);
        setPlans(plansData.length > 0 ? plansData : initialPlans);
        setTasks(tasksData.length > 0 ? tasksData : initialTasks);
        setOutcomes(outcomesData.length > 0 ? outcomesData : initialOutcomes);
        setRequirements(requirementsData.length > 0 ? requirementsData : initialRequirements);
        setReleaseGoals(releaseGoalsData && releaseGoalsData.length > 0 ? releaseGoalsData : []);
        setProjectTrackings(trackingsData && trackingsData.length > 0 ? trackingsData : []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
    // In a real app we might use WebSockets or polling here
  }, []);

  useEffect(() => {
    localStorage.setItem('guideContent', guideContent);
  }, [guideContent]);

  useEffect(() => {
    // Attempt to scroll the active tab into view when it changes
    const scrollContainer = () => {
      const activeMonthTab = document.getElementById('active-month-tab');
      if (activeMonthTab) {
        activeMonthTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      const activeQuarterTab = document.getElementById('active-quarter-tab');
      if (activeQuarterTab) {
        activeQuarterTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      const activeYearTab = document.getElementById('active-year-tab');
      if (activeYearTab) {
        activeYearTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };
    
    // Give DOM a tick to render
    setTimeout(scrollContainer, 50);
  }, [selectedMonth, selectedQuarter, selectedYear, currentView, reqTimeFrame]);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActualModalOpen, setIsActualModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ targetValue: '' });
  const [actualForm, setActualForm] = useState({ actualValue: '' });
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [isRequirementDetailModalOpen, setIsRequirementDetailModalOpen] = useState(false);
  const [isRejectRequirementModalOpen, setIsRejectRequirementModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reqToReject, setReqToReject] = useState<Requirement | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isOutcomeDetailModalOpen, setIsOutcomeDetailModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [isRequirementRecycleBinOpen, setIsRequirementRecycleBinOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [isSubmittingRequirement, setIsSubmittingRequirement] = useState(false);
  
  const [isGoalDetailModalOpen, setIsGoalDetailModalOpen] = useState(false);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<{title: string, content: string} | null>(null);

  const [isReleaseGoalModalOpen, setIsReleaseGoalModalOpen] = useState(false);
  const [editingReleaseGoal, setEditingReleaseGoal] = useState<ReleaseGoal | null>(null);
  const [releaseGoalForm, setReleaseGoalForm] = useState<Partial<ReleaseGoal>>({
    title: '',
    targetMonth: selectedMonth,
    targetDate: '',
    status: 'planned'
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<'marketing' | 'rnd' | null>(null);
  
  const [taskForms, setTaskForms] = useState([{ id: generateId(), title: '', plannedProgress: '0', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), projectName: '', outcome: '' }]);
  const [outcomeForms, setOutcomeForms] = useState([{ id: generateId(), title: '', description: '', date: '2024-08-16' }]);
  const [requirementForm, setRequirementForm] = useState({ title: '', description: '', linkUrl: '', priority: 'medium' as Priority, source: 'customer' as string, customerName: '', internalSourceDetail: '', assigneeId: '' });
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);

  const [goalForm, setGoalForm] = useState({
    leadClientsTarget: '',
    leadClientsActual: '',
    activeClientsTarget: '',
    activeClientsActual: '',
    lostClientsTarget: '',
    lostClientsActual: '',
    contractAmountTarget: '',
    contractAmountActual: '',
    profitAmountTarget: '',
    profitAmountActual: '',
    collectionAmountTarget: '',
    collectionAmountActual: ''
  });

  const openGoalModal = () => {
    // Find existing plans for this month to pre-fill
    const monthPlans = plans.filter(p => p.level === 'month' && p.startDate.startsWith(selectedMonth));
    const findTarget = (type: string, title?: string) => {
        if (title) return monthPlans.find(p => p.title.includes(title))?.metric?.target?.toString() || '';
        return monthPlans.find(p => p.metric?.funnelStage === type)?.metric?.target?.toString() || '';
    };
    const findActual = (type: string, title?: string) => {
        if (title) {
            const plan = monthPlans.find(p => p.title.includes(title));
            return (plan?.metric?.actualCompleted ?? plan?.metric?.current)?.toString() || '';
        }
        const plan = monthPlans.find(p => p.metric?.funnelStage === type);
        return (plan?.metric?.actualCompleted ?? plan?.metric?.current)?.toString() || '';
    };

    setGoalForm({
      leadClientsTarget: findTarget('lead'),
      leadClientsActual: findActual('lead'),
      activeClientsTarget: findTarget('active'),
      activeClientsActual: findActual('active'),
      lostClientsTarget: findTarget('lost'),
      lostClientsActual: findActual('lost'),
      contractAmountTarget: findTarget('', '合同签署额'),
      contractAmountActual: findActual('', '合同签署额'),
      profitAmountTarget: findTarget('', '利润额'),
      profitAmountActual: findActual('', '利润额'),
      collectionAmountTarget: findTarget('', '回款额'),
      collectionAmountActual: findActual('', '回款额')
    });
    setIsGoalModalOpen(true);
  };

  useEffect(() => {
    if (currentUser?.id) {
      const updatedMember = members.find(m => m.id === currentUser.id);
      if (updatedMember) {
        if (
          updatedMember.department !== currentUser.department ||
          JSON.stringify(updatedMember.roles) !== JSON.stringify(currentUser.roles) ||
          updatedMember.groupId !== currentUser.groupId
        ) {
          const newUser = {
            ...currentUser,
            department: updatedMember.department,
            roles: updatedMember.roles,
            groupId: updatedMember.groupId,
          };
          setCurrentUser(newUser);
          localStorage.setItem('currentUser', JSON.stringify(newUser));
        }
      }
    }
  }, [members, currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (!parsedUser.roles) {
        parsedUser.roles = parsedUser.role ? [parsedUser.role] : [];
      }
      setCurrentUser(parsedUser);
    } else {
      const defaultAdmin = mockMembers.find(m => m.name === '李克秋');
      if (defaultAdmin) {
        const user: Member = {
          id: defaultAdmin.id,
          name: defaultAdmin.name,
          avatar: defaultAdmin.avatar,
          department: defaultAdmin.department,
          roles: defaultAdmin.roles,
          groupId: defaultAdmin.groupId
        };
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    }
    setCurrentUserLoaded(true);
  }, []);

  const handleLogin = (user: Member) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setIsLogoutModalOpen(false);
  };

  const handleAccountSetupComplete = (account: string, pass: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, account, password: pass };
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('has_setup_account', 'true');
    
    setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, account, password: pass } : m));
  };

  if (!currentUserLoaded) {
    return <div className="h-screen w-full bg-[#F7F6F2]"></div>;
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} authorizedCompanies={authorizedCompanies} members={members} />;
  }

  if (!currentUser.account || !currentUser.password) {
    return <AccountSetupModal currentUser={currentUser} onComplete={handleAccountSetupComplete} members={members} />;
  }

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlans: Plan[] = [];
    // We will update existing plans if they exist, or create new ones
    const baseDateStr = `${selectedMonth}-01`;
    const monthLabel = `${parseInt(selectedMonth.split('-')[1])}月`;
    const monthPlans = plans.filter(p => p.level === 'month' && p.startDate.startsWith(selectedMonth));

    const upsertPlan = (title: string, funnelStage: string | undefined, target: string, actual: string, unit: string, type: 'number' | 'currency' = 'number') => {
        const existingPlan = funnelStage ? monthPlans.find(p => p.metric?.funnelStage === funnelStage) : monthPlans.find(p => p.title.includes(title));
        
        if (existingPlan) {
            // Update existing
            existingPlan.metric = {
                ...existingPlan.metric!,
                target: target ? Number(target) : existingPlan.metric?.target || 0,
                current: actual ? Number(actual) : existingPlan.metric?.current || 0,
                actualCompleted: actual ? Number(actual) : existingPlan.metric?.actualCompleted || 0
            };
            apiService.savePlan(existingPlan); // Save updated plan directly
        } else if (target || actual) {
            // Create new
            const newPlan: Plan = {
                id: generateId(),
                projectId: 'p1', // Default to first marketing project
                title: `${monthLabel} ${title}`,
                level: 'month',
                startDate: baseDateStr,
                endDate: `${selectedMonth}-30`, // Simplification
                status: 'not_started',
                progress: 0,
                metric: { type, target: Number(target || 0), current: Number(actual || 0), actualCompleted: Number(actual || 0), unit, funnelStage: funnelStage as any }
            };
            newPlans.push(newPlan);
        }
    };

    upsertPlan('潜在客户挖掘', 'lead', goalForm.leadClientsTarget, goalForm.leadClientsActual, '家');
    upsertPlan('意向客户跟进', 'active', goalForm.activeClientsTarget, goalForm.activeClientsActual, '家');
    upsertPlan('客户流失', 'lost', goalForm.lostClientsTarget, goalForm.lostClientsActual, '家');
    upsertPlan('目标合同签署额', undefined, goalForm.contractAmountTarget, goalForm.contractAmountActual, '万', 'currency');
    upsertPlan('目标利润额', undefined, goalForm.profitAmountTarget, goalForm.profitAmountActual, '万', 'currency');
    upsertPlan('渠道保底回款额', undefined, goalForm.collectionAmountTarget, goalForm.collectionAmountActual, '万', 'currency');

    newPlans.forEach(async (plan) => {
      await apiService.savePlan(plan);
    });
    
    // Refresh plans state
    if (newPlans.length > 0) {
        setPlans([...plans, ...newPlans]);
    } else {
        // Trigger re-render to show updated existing plans
        setPlans([...plans]);
    }

    setIsGoalModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan && editingPlan.metric) {
      const updatedPlans = plans.map(p => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            metric: {
              ...p.metric!,
              target: Number(editForm.targetValue),
              isModified: true
            }
          };
        }
        return p;
      });
      updatedPlans.forEach(async (p) => {
        if (p.id === editingPlan.id) {
          await apiService.savePlan(p);
        }
      });
      setPlans(updatedPlans);
      setIsEditModalOpen(false);
      setEditingPlan(null);
      setEditForm({ targetValue: '' });
    }
  };

  const handleActualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan && editingPlan.metric) {
      const actualValue = Number(actualForm.actualValue);
      const updatedPlans = plans.map(p => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            progress: Math.min(Math.round((actualValue / p.metric!.target) * 100), 100),
            metric: {
              ...p.metric!,
              actualCompleted: actualValue,
              current: actualValue
            }
          };
        }
        return p;
      });
      updatedPlans.forEach(async (p) => {
        if (p.id === editingPlan.id) {
          await apiService.savePlan(p);
        }
      });
      setPlans(updatedPlans);
      setIsActualModalOpen(false);
      setEditingPlan(null);
      setActualForm({ actualValue: '' });
    }
  };

  const openTaskModal = (memberId: string, dept: 'marketing' | 'rnd') => {
    setSelectedMemberId(memberId);
    setSelectedDepartment(dept);
    setTaskForms([{ id: generateId(), title: '', plannedProgress: '0', startDate: format(currentWeekDate, 'yyyy-MM-dd'), endDate: format(currentWeekDate, 'yyyy-MM-dd'), projectName: '', outcome: '' }]);
    setIsTaskModalOpen(true);
  };

  const openOutcomeModal = (memberId: string, dept: 'marketing' | 'rnd') => {
    setSelectedMemberId(memberId);
    setSelectedDepartment(dept);
    setOutcomeForms([{ id: generateId(), title: '', description: '', date: format(currentWeekDate, 'yyyy-MM-dd') }]);
    setIsOutcomeModalOpen(true);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && selectedDepartment) {
      const proj = projects.find(p => p.category === selectedDepartment);
      
      const newTasks: Task[] = taskForms.filter(f => f.title.trim()).map(form => ({
        id: generateId(),
        projectId: proj ? proj.id : 'p1', // Backward compatibility for now
        projectName: form.projectName,
        planId: 'tmp',
        title: form.title,
        outcome: form.outcome,
        assigneeId: selectedMemberId,
        startDate: form.startDate,
        endDate: form.endDate,
        status: 'not_started',
        priority: 'medium',
        progress: 0,
        plannedProgress: Number(form.plannedProgress) || 0
      }));
      
      if (newTasks.length > 0) {
        newTasks.forEach(task => apiService.saveTask(task));
        setTasks(prev => [...prev, ...newTasks]);
      }
      setIsTaskModalOpen(false);
      setTaskForms([{ id: generateId(), title: '', plannedProgress: '0', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(currentWeekDate, 'yyyy-MM-dd'), projectName: '', outcome: '' }]);
    }
  };

  const handleOutcomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && selectedDepartment) {
      const proj = projects.find(p => p.category === selectedDepartment);
      
      const newOutcomes: Outcome[] = outcomeForms.filter(f => f.title.trim() && f.description.trim()).map(form => ({
        id: generateId(),
        projectId: proj ? proj.id : 'p1',
        submitterId: selectedMemberId,
        title: form.title,
        description: form.description,
        date: form.date,
        status: 'pending_review'
      }));
      
      if (newOutcomes.length > 0) {
        newOutcomes.forEach(outcome => apiService.saveOutcome(outcome));
        setOutcomes(prev => [...prev, ...newOutcomes]);
      }
      setIsOutcomeModalOpen(false);
      setOutcomeForms([{ id: generateId(), title: '', description: '', date: format(new Date(), 'yyyy-MM-dd') }]);
    }
  };

  const handleReleaseGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseGoalForm.title || !releaseGoalForm.groupId || !releaseGoalForm.targetMonth || !releaseGoalForm.targetDate) return;

    try {
      const isNew = !editingReleaseGoal;
      const targetGoal: ReleaseGoal = {
        id: isNew ? generateId() : editingReleaseGoal!.id,
        groupId: releaseGoalForm.groupId,
        title: releaseGoalForm.title,
        targetMonth: releaseGoalForm.targetMonth,
        targetDate: releaseGoalForm.targetDate,
        actualVersion: releaseGoalForm.actualVersion,
        actualReleaseDate: releaseGoalForm.actualReleaseDate,
        status: releaseGoalForm.status as 'planned' | 'released' | 'delayed',
        note: releaseGoalForm.note,
        createdAt: isNew ? new Date().toISOString() : editingReleaseGoal!.createdAt
      };

      await apiService.saveReleaseGoal(targetGoal);
      
      const newGoalsList = isNew
        ? [...releaseGoals, targetGoal]
        : releaseGoals.map(g => g.id === targetGoal.id ? targetGoal : g);
      setReleaseGoals(newGoalsList);

      setReleaseGoalForm({ title: '', targetMonth: selectedMonth, targetDate: '', status: 'planned' });
      setEditingReleaseGoal(null);
      setIsReleaseGoalModalOpen(false);
    } catch (err) {
      console.error('Failed to save release goal', err);
    }
  };

  const deleteReleaseGoal = async (id: string) => {
    try {
      await apiService.deleteReleaseGoal(id);
      setReleaseGoals(releaseGoals.filter(g => g.id !== id));
    } catch (err) {
      console.error('Failed to delete release goal', err);
    }
  };

  const terminateTracking = async (id: string) => {
    setTrackingToTerminate(id);
    setIsTerminateTrackingModalOpen(true);
  };

  const confirmTerminateTracking = async () => {
    if (trackingToTerminate) {
      const tracking = projectTrackings.find(t => t.id === trackingToTerminate);
      if (tracking) {
        const updated = { ...tracking, status: 'terminated' as TrackingStatus, updatedAt: new Date().toISOString() };
        try {
          await apiService.saveProjectTracking(updated);
          setProjectTrackings(prev => prev.map(t => t.id === trackingToTerminate ? updated : t));
        } catch (err) {
          console.error('Failed to terminate tracking', err);
        }
      }
      setIsTerminateTrackingModalOpen(false);
      setTrackingToTerminate(null);
    }
  };

  const updateTrackingStatus = async (id: string, status: TrackingStatus) => {
    const tracking = projectTrackings.find(t => t.id === id);
    if (tracking) {
      const updated = { ...tracking, status, updatedAt: new Date().toISOString() };
      try {
        await apiService.saveProjectTracking(updated);
        setProjectTrackings(prev => prev.map(t => t.id === id ? updated : t));
      } catch (err) {
        console.error('Failed to update tracking status', err);
      }
    }
  };

  const saveTracking = async (tracking: ProjectTracking) => {
    try {
      await apiService.saveProjectTracking(tracking);
      if (editingTrackingId) {
        setProjectTrackings(prev => prev.map(t => t.id === editingTrackingId ? tracking : t));
      } else {
        setProjectTrackings(prev => [tracking, ...prev]);
      }
      setIsTrackingModalOpen(false);
      setEditingTrackingId(null);
    } catch (err) {
      console.error('Failed to save tracking', err);
      setTrackingError('Failed to save tracking record.');
    }
  };

  const saveFollowup = async () => {
    if (editingTrackingId && followupForm.content) {
      const tracking = projectTrackings.find(t => t.id === editingTrackingId);
      if (tracking) {
        const newRecord: FollowupRecord = {
          id: generateId(),
          date: followupForm.date || format(new Date(), 'yyyy-MM-dd'),
          content: followupForm.content
        };
        const updated = {
            ...tracking,
            lastFollowupDate: newRecord.date,
            updatedAt: new Date().toISOString(),
            followupRecords: [newRecord, ...(tracking.followupRecords || [])]
        };
        
        try {
            await apiService.saveProjectTracking(updated);
            setProjectTrackings(prev => prev.map(t => t.id === editingTrackingId ? updated : t));
            setIsFollowupModalOpen(false);
        } catch(err) {
            console.error('Failed to add followup', err);
        }
      }
    }
  };

  const handleRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRequirement) return;
    
    setIsSubmittingRequirement(true);
    try {
      const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      
      if (editingRequirementId) {
        const existingReq = requirements.find(r => r.id === editingRequirementId);
        if (existingReq) {
          const updatedReq: Requirement = {
            ...existingReq,
            title: requirementForm.title,
            description: requirementForm.description,
            linkUrl: requirementForm.linkUrl,
            priority: requirementForm.priority,
            source: requirementForm.source,
            customerName: requirementForm.source === 'customer' ? requirementForm.customerName : undefined,
            internalSourceDetail: requirementForm.source === 'internal' ? requirementForm.internalSourceDetail : undefined,
            assigneeId: requirementForm.assigneeId || undefined,
            updatedAt: now
          };
          
          const newHistoryEntry: RequirementHistory = {
            id: generateId(),
            requirementId: existingReq.id,
            status: existingReq.status,
            timestamp: now,
            note: '需求更新'
          };
          
          updatedReq.history = [newHistoryEntry, ...(updatedReq.history || [])];
          
          await apiService.saveRequirement({ ...updatedReq, newHistoryEntry });
          setRequirements(prev => prev.map(r => r.id === existingReq.id ? updatedReq : r));
        }
      } else {
        const reqId = generateId();
        const initialStatus: RequirementStatus = 'backlog';
        
        const nowDateStr = format(new Date(), 'yyyyMMdd');
        const todaysReqs = requirements.filter(r => r.serialNumber && r.serialNumber.startsWith(`XQ${nowDateStr}`));
        const serialCount = todaysReqs.length + 1;
        const serialNumber = `XQ${nowDateStr}${serialCount.toString().padStart(3, '0')}`;
        
        const newHistoryEntry: RequirementHistory = {
          id: generateId(),
          requirementId: reqId,
          status: initialStatus,
          timestamp: now,
          note: '需求创建'
        };

        const newReq: Requirement = {
          id: reqId,
          serialNumber,
          title: requirementForm.title,
          description: requirementForm.description,
          linkUrl: requirementForm.linkUrl,
          priority: requirementForm.priority,
          status: initialStatus,
          source: requirementForm.source,
          customerName: requirementForm.source === 'customer' ? requirementForm.customerName : undefined,
          internalSourceDetail: requirementForm.source === 'internal' ? requirementForm.internalSourceDetail : undefined,
          submitterId: currentUser?.id || members[0]?.id || 'admin',
          assigneeId: requirementForm.assigneeId || undefined,
          createdAt: now,
          updatedAt: now,
          history: [newHistoryEntry]
        };
        
        await apiService.saveRequirement({ ...newReq, newHistoryEntry });
        setRequirements(prev => [newReq, ...prev]);
      }

      setIsRequirementModalOpen(false);
      setEditingRequirementId(null);
      setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
    } catch (err) {
      console.error('Failed to submit requirement:', err);
      alert('提交需求失败，请检查网络或表单项');
    } finally {
      setIsSubmittingRequirement(false);
    }
  };

  const updateRequirementStatus = async (id: string, newStatus: RequirementStatus) => {
    const req = requirements.find(r => r.id === id);
    if (req && req.status !== newStatus) {
      if (newStatus === 'rejected') {
        setReqToReject(req);
        setIsRejectRequirementModalOpen(true);
        return;
      }
      try {
        const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const newHistoryEntry: RequirementHistory = {
          id: generateId(),
          requirementId: id,
          status: newStatus,
          timestamp: now,
          note: `状态变更为: ${
            newStatus === 'backlog' ? '待评审' : 
            newStatus === 'reviewing' ? '评审中' : 
            newStatus === 'approved' ? '评审通过' : 
            newStatus === 'planned' ? '已排期' : '已完成'
          }`
        };

        const updatedReq: Requirement = { 
          ...req, 
          status: newStatus,
          updatedAt: now,
          history: [newHistoryEntry, ...(req.history || [])]
        };
        
        await apiService.saveRequirement({ ...updatedReq, newHistoryEntry });
        setRequirements(prev => prev.map(r => r.id === id ? updatedReq : r));
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }
  };

  const handleRejectRequirement = async () => {
    if (!reqToReject) return;
    try {
      const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const newHistoryEntry: RequirementHistory = {
        id: generateId(),
        requirementId: reqToReject.id,
        status: 'rejected',
        timestamp: now,
        note: `已驳回，原因: ${rejectReason}`
      };
      const updatedReq: Requirement = { 
        ...reqToReject, 
        status: 'rejected',
        updatedAt: now,
        history: [newHistoryEntry, ...(reqToReject.history || [])]
      };
      await apiService.saveRequirement({ ...updatedReq, newHistoryEntry });
      setRequirements(prev => prev.map(r => r.id === reqToReject.id ? updatedReq : r));
      setIsRejectRequirementModalOpen(false);
      setReqToReject(null);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject requirement:', err);
    }
  };

  const deleteRequirement = async (id: string) => {
    const req = requirements.find(r => r.id === id);
    if (req) {
      try {
        const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const updatedReq: Requirement = { 
          ...req, 
          deleted: true,
          deletedAt: now,
          updatedAt: now
        };
        await apiService.saveRequirement(updatedReq);
        setRequirements(prev => prev.map(r => r.id === id ? updatedReq : r));
      } catch (err) {
        console.error('Failed to delete requirement:', err);
      }
    }
  };

  const restoreRequirement = async (id: string) => {
    const req = requirements.find(r => r.id === id);
    if (req) {
      try {
        const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const updatedReq: Requirement = { 
          ...req, 
          deleted: false,
          deletedAt: undefined,
          updatedAt: now
        };
        await apiService.saveRequirement(updatedReq);
        setRequirements(prev => prev.map(r => r.id === id ? updatedReq : r));
      } catch (err) {
        console.error('Failed to restore requirement:', err);
      }
    }
  };

  const filteredProjects = projects.filter(p => currentView === 'dashboard' || p.category === currentView);
  const projectIds = filteredProjects.map(p => p.id);

  const quarterPlans = plans.filter(p => p.level === 'quarter' && projectIds.includes(p.projectId));
  const monthPlans = plans.filter(p => p.level === 'month' && projectIds.includes(p.projectId));


  const marketingTasks = tasks.filter(t => {
    const project = projects.find(p => p.id === t.projectId);
    const isInWeek = isSameWeek(parseISO(t.endDate), currentWeekDate, { weekStartsOn: 1 });
    return project?.category === 'marketing' && isInWeek;
  });

  const rndTasks = tasks.filter(t => {
    const project = projects.find(p => p.id === t.projectId);
    const isInWeek = isSameWeek(parseISO(t.endDate), currentWeekDate, { weekStartsOn: 1 });
    return project?.category === 'rnd' && isInWeek;
  });

  const totalProgress = filteredProjects.reduce((acc, curr) => acc + curr.progress, 0);

  const viewOutcomes = outcomes.filter(o => currentView === 'dashboard' || projects.find(p => p.id === o.projectId)?.category === currentView);

  // Funnel Data Calculation
  const CURRENT_MONTH = selectedMonth;
  const CURRENT_YEAR = selectedMonth.split('-')[0];
  
  const getQuarterMonths = (quarter: string) => {
    const [year, q] = quarter.split('-');
    if (q === 'Q1') return [`${year}-01`, `${year}-02`, `${year}-03`];
    if (q === 'Q2') return [`${year}-04`, `${year}-05`, `${year}-06`];
    if (q === 'Q3') return [`${year}-07`, `${year}-08`, `${year}-09`];
    return [`${year}-10`, `${year}-11`, `${year}-12`];
  };

  const activeMonthReqs = requirements.filter(r => {
    if (r.deleted) return false;
    
    if (currentView !== 'requirements') {
      return r.createdAt.startsWith(selectedMonth);
    }
    
    if (reqTimeFrame === 'month') {
        return r.createdAt.startsWith(selectedMonth);
    } else if (reqTimeFrame === 'quarter') {
        return getQuarterMonths(selectedQuarter).some(m => r.createdAt.startsWith(m));
    } else {
        return r.createdAt.startsWith(selectedYear);
    }
  });

  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isEndOfMonth = today.getDate() >= lastDayOfMonth - 1;

  // Calculate current ISO week number
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };
  const currentWeekNum = getISOWeek(currentWeekDate);
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

  const leadPlans = plans.filter(p => p.metric?.funnelStage === 'lead' && p.level === 'month' && p.startDate.startsWith(selectedMonth));
  const activePlans = plans.filter(p => p.metric?.funnelStage === 'active' && p.level === 'month' && p.startDate.startsWith(selectedMonth));
  const signedPlans = plans.filter(p => p.metric?.funnelStage === 'signed' && p.level === 'month' && p.startDate.startsWith(selectedMonth));
  const lostPlans = plans.filter(p => p.metric?.funnelStage === 'lost' && p.level === 'month' && p.startDate.startsWith(selectedMonth));

  const targetLeadClients = leadPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentLeadClients = leadPlans.reduce((acc, curr) => acc + (curr.metric?.current || 0), 0) || 0;

  const targetActiveClients = activePlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentActiveClients = activePlans.reduce((acc, curr) => acc + (curr.metric?.current || 0), 0) || 0;

  const targetSignedClients = signedPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentSignedClients = signedPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0) || 0;

  const targetLostClients = lostPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentLostClients = lostPlans.reduce((acc, curr) => acc + (curr.metric?.current || 0), 0) || 0;
  
  const currentMonthProfitPlans = plans.filter(p => p.metric?.unit === '万' && p.level === 'month' && p.startDate.startsWith(selectedMonth) && p.title.includes('利润'));
  const currentMonthTargetProfit = currentMonthProfitPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentMonthActualProfit = currentMonthProfitPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const currentMonthContractPlans = plans.filter(p => p.metric?.unit === '万' && p.level === 'month' && p.startDate.startsWith(selectedMonth) && p.title.includes('合同'));
  const currentMonthTargetContract = currentMonthContractPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentMonthActualContract = currentMonthContractPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const currentMonthCollectionPlans = plans.filter(p => p.metric?.unit === '万' && p.level === 'month' && p.startDate.startsWith(selectedMonth) && p.title.includes('回款'));
  const currentMonthTargetCollection = currentMonthCollectionPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const currentMonthActualCollection = currentMonthCollectionPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const currentYearProfitPlans = plans.filter(p => p.metric?.unit === '万' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR) && p.title.includes('利润'));
  const currentYearActualProfit = currentYearProfitPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const yearLeadPlans = plans.filter(p => p.metric?.funnelStage === 'lead' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetLeadClients = yearLeadPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 50;
  const yearLeadClients = yearLeadPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0) || 40;

  const yearActivePlans = plans.filter(p => p.metric?.funnelStage === 'active' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetActiveClients = yearActivePlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 30;
  const yearActiveClients = yearActivePlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0) || 18;

  const yearSignedPlans = plans.filter(p => p.metric?.funnelStage === 'signed' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetSignedClients = yearSignedPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 10;
  const yearSignedClients = yearSignedPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0) || 6;

  const yearLostPlans = plans.filter(p => p.metric?.funnelStage === 'lost' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetLostClients = yearLostPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 5;
  const yearLostClients = yearLostPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0) || 3;

  const funnelData = [
    { name: '潜在线索', value: yearLeadClients },
    { name: '意向沟通', value: yearActiveClients },
    { name: '方案报价', value: Math.ceil(yearActiveClients / 2) },
    { name: '实际签约', value: yearSignedClients }
  ];

  // Quarterly Calculations
  const quarterMonths = getQuarterMonths(selectedQuarter);
  const globalQuarterPlans = plans.filter(p => 
      (p.level === 'quarter' && p.startDate.startsWith(selectedQuarter.split('-')[0])) ||
      (p.level === 'month' && quarterMonths.some(m => p.startDate.startsWith(m)))
  );
  
  const quarterTargetProfit = globalQuarterPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 360;
  const quarterActualProfit = globalQuarterPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  
  const quarterTargetContract = globalQuarterPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 1500;
  const quarterActualContract = globalQuarterPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  
  // Marketing Monthly Calculations
  const marketingProjects = projects.filter(p => p.category === 'marketing');
  const mktProjectIds = marketingProjects.map(p => p.id);
  const marketingMonthPlans = plans.filter(p => p.level === 'month' && p.startDate.startsWith(selectedMonth) && mktProjectIds.includes(p.projectId));
  const mktTargetProfit = marketingMonthPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 120;
  const mktActualProfit = marketingMonthPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  const mktTargetContract = marketingMonthPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 500;
  const mktActualContract = marketingMonthPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);

  // Generates 12 months of the currently selected year
  const currentYearMonths = Array.from({ length: 12 }).map((_, i) => `${CURRENT_YEAR}-${String(i + 1).padStart(2, '0')}`);

  // Chart 1 & 3: Profit Trend and Statistics Data
  const profitPlans = plans.filter(p => p.metric?.unit === '万' && p.level === 'month');
  const profitMap: Record<string, { target: number, actual: number }> = {};
  profitPlans.forEach(p => {
    const m = p.startDate.slice(0, 7);
    if (!profitMap[m]) profitMap[m] = { target: 0, actual: 0 };
    profitMap[m].target += (p.metric?.target || 0);
    profitMap[m].actual += (p.metric?.actualCompleted !== undefined ? p.metric.actualCompleted : p.metric?.current || 0);
  });
  
  const profitTrendData = currentYearMonths.map(month => ({
    name: month.split('-')[1] + '月',
    month: month,
    target: profitMap[month]?.target || 0,
    actual: profitMap[month]?.actual || 0
  }));

  // Chart 2: Task Status Pie Data
  const taskStatusData = [
    { name: '待开始/搁置', value: tasks.filter(t => t.status === 'not_started').length },
    { name: '进行中', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: '已验收交付', value: tasks.filter(t => t.status === 'completed').length },
  ];
  const PIE_COLORS = ['#d1d5db', '#3f3f46', '#22c55e'];

  const renderTaskGroups = (tasks: Task[], department: 'marketing' | 'rnd') => {
    // 1. Get all groups that belong to this department
    const departmentGroups = groups.filter(g => g.category === department)
      .filter(g => currentUser.department === 'admin' || g.id === currentUser.groupId);
    
    // 2. Find any tasks belonging to this department that have unassigned/unknown group
    const taskGroupIds = new Set(tasks.map(t => {
      const member = members.find(m => m.id === t.assigneeId);
      return member?.groupId || 'unassigned';
    }));

    // Combine department groups and unassigned/unknown groups from tasks
    let allGroupIds = Array.from(new Set([
      ...departmentGroups.map(g => g.id),
      ...Array.from(taskGroupIds).filter(id => id === 'unassigned' || !groups.find(g => g.id === id && g.category !== department))
    ]));

    if (currentUser.department !== 'admin') {
      allGroupIds = allGroupIds.filter(id => id === currentUser.groupId);
    }

    if (allGroupIds.length === 0) {
      return <p className="text-sm opacity-50 italic">暂无进行中的任务或无权限查看</p>;
    }
    
    const selectedGroupId = selectedTaskGroupIds[department] || allGroupIds[0];
    const groupId = allGroupIds.includes(selectedGroupId) ? selectedGroupId : allGroupIds[0];
    
    const groupTasks = tasks.filter(t => {
      const member = members.find(m => m.id === t.assigneeId);
      return (member?.groupId || 'unassigned') === groupId;
    });
    
    const groupMembersList = members.filter(m => (m.groupId || 'unassigned') === groupId && m.department === department);
    const taskMembersIds = groupTasks.map(t => t.assigneeId);
    let groupMembers = Array.from(new Set([...groupMembersList.map(m => m.id), ...taskMembersIds]));

    const canViewAllInGroup = currentUser.department === 'admin' || (currentUser.roles.includes('组长') && currentUser.groupId === groupId);
    if (!canViewAllInGroup) {
      groupMembers = groupMembers.filter(id => id === currentUser.id);
    }

    return (
      <div className="space-y-6">
        <div className="border-b border-[#1A1A1A]/10 flex overflow-x-auto custom-scrollbar hide-scrollbar-on-mobile mb-6">
          <div className="flex gap-6 min-w-max px-2">
            {allGroupIds.map(id => {
              const name = id === 'unassigned' ? '未分组' : (groups.find(g => g.id === id)?.name || '未知小组');
              const isSelected = groupId === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedTaskGroupIds(prev => ({ ...prev, [department]: id }))}
                  className={`text-[12px] font-bold uppercase tracking-widest pb-3 px-1 transition-all border-b-2 whitespace-nowrap ${isSelected ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/80'}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div key={groupId}>
          {groupMembers.length === 0 ? (
            <p className="text-sm opacity-50 italic px-2">该小组暂无进行中的任务</p>
          ) : (
            <div className="space-y-6">
              {groupMembers.map(assigneeId => {
                const assignee = members.find(m => m.id === assigneeId);
                const memberTasks = groupTasks.filter(t => t.assigneeId === assigneeId)
                  .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
                const memberOutcomes = outcomes.filter(o => o.submitterId === assigneeId && projects.find(p => p.id === o.projectId)?.category === department);
                const memberProgress = memberTasks.length > 0
                  ? Math.round(memberTasks.reduce((acc, curr) => acc + curr.progress, 0) / memberTasks.length)
                  : 0;

                return (
                  <div key={assigneeId} className="bg-[#EBE9E4]/30 border border-[#1A1A1A]/10 p-5 sm:p-6 transition-colors hover:bg-[#EBE9E4]/60">
                    <div className="flex flex-col lg:flex-row gap-6">
                      
                      {/* Left Sidebar (Avatar, Name, Stats) */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:w-48 shrink-0">
                        <img src={assignee?.avatar} alt={assignee?.name} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border border-[#1A1A1A]/20 shrink-0 object-cover bg-white" />
                        <div className="min-w-0">
                          <p className="text-base lg:text-lg font-bold truncate">{assignee?.name}</p>
                          <p className="text-[10px] opacity-60 uppercase tracking-widest truncate">{assignee?.roles?.join(', ')}</p>
                        </div>
                        <div className="flex lg:flex-col gap-5 lg:gap-6 ml-auto lg:ml-0 lg:mt-2 lg:w-full border-l lg:border-l-0 lg:border-t border-[#1A1A1A]/10 pl-5 lg:pl-0 lg:pt-5">
                          <div className="flex flex-col items-center lg:items-start shrink-0">
                            <span className="text-2xl lg:text-3xl font-serif italic leading-none">{memberTasks.length}</span>
                            <p className="text-[9px] uppercase tracking-widest opacity-50 mt-1 whitespace-nowrap">行动项目</p>
                          </div>
                          <div className="flex flex-col items-center lg:items-start shrink-0">
                            <span className="text-2xl lg:text-3xl font-serif italic leading-none">{memberTasks.filter(t => !!t.outcome).length}</span>
                            <p className="text-[9px] uppercase tracking-widest opacity-50 mt-1 whitespace-nowrap">产出成果</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Content */}
                      <div className="flex-1 min-w-0 lg:border-l border-[#1A1A1A]/10 lg:pl-6">
                        <h5 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-4 flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#1A1A1A]"></span> 任务与成果项 (Tasks & Outcomes)</span>
                          {(currentUser.department === 'admin' || currentUser.id === assigneeId) && (
                            <button onClick={() => openTaskModal(assigneeId, department)} className="text-[9px] hover:text-[#1A1A1A] hover:font-bold opacity-70 hover:opacity-100 transition-colors border border-transparent hover:border-[#1A1A1A] px-1">+ 添加</button>
                          )}
                        </h5>
                        <div className="space-y-4 lg:grid lg:grid-cols-1 xl:grid-cols-2 lg:space-y-0 lg:gap-6">
                          {memberTasks.length === 0 ? (
                              <p className="text-sm opacity-50 italic py-2 col-span-2">暂无进行中的任务</p>
                            ) : (
                              memberTasks.map((task) => {
                                return (
                                <div key={task.id} className={`border-l-2 ${task.status === 'completed' || task.progress === 100 ? 'border-[#1A1A1A]/30 opacity-60 bg-[#1A1A1A]/5' : 'border-[#1A1A1A] bg-white/70'} p-3 hover:bg-[#1A1A1A]/10 transition-colors flex items-start gap-3`}>
                                  <div className="pt-0.5">
                                      <input 
                                        type="checkbox" 
                                        checked={task.status === 'completed' || task.progress === 100}
                                        disabled={currentUser.department !== 'admin' && currentUser.id !== assigneeId}
                                        onChange={(e) => {
                                          if (currentUser.department !== 'admin' && currentUser.id !== assigneeId) return;
                                          const checked = e.target.checked;
                                          const updatedTask: Task = { 
                                            ...task, 
                                            progress: checked ? 100 : (task.progress === 100 ? 0 : task.progress),
                                            status: (checked ? 'completed' : 'in_progress') as Status
                                          };
                                          if (checked && !task.actualEndDate) updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
                                          apiService.saveTask(updatedTask);
                                          setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                                        }}
                                        className="h-3.5 w-3.5 accent-[#1A1A1A] cursor-pointer disabled:cursor-not-allowed mt-1" 
                                        title={task.status === 'completed' || task.progress === 100 ? "标记为未完成" : "标记为完成"}
                                      />
                                  </div>
                                  <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => { setSelectedTask(task); setIsTaskDetailModalOpen(true); }}
                                  >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                      <p className={`text-sm font-bold leading-snug ${task.status === 'completed' || task.progress === 100 ? 'line-through' : ''}`}>
                                        {task.title}
                                        {task.projectName && <span className="ml-2 text-[10px] bg-[#1A1A1A]/10 px-1.5 py-0.5 text-[#1A1A1A]/80 border border-[#1A1A1A]/20 font-normal tracking-wide inline-block">{task.projectName}</span>}
                                      </p>
                                      <TaskProgressInput 
                                        task={task} 
                                        onUpdate={(val) => {
                                          const updatedTask: Task = {
                                            ...task,
                                            progress: val,
                                            status: (val === 100 ? 'completed' : (val > 0 ? 'in_progress' : 'not_started')) as Status
                                          };
                                          if (val > 0 && !task.actualStartDate) updatedTask.actualStartDate = new Date().toISOString().split('T')[0];
                                          if (val === 100 && !task.actualEndDate) updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
                                          apiService.saveTask(updatedTask);
                                          setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                                        }} 
                                      />
                                    </div>
                                    {task.outcome && (
                                      <div className="mt-2 mb-2 bg-[#1A1A1A]/5 p-2 border border-[#1A1A1A]/10">
                                        <p className="text-[10px] font-bold opacity-60 uppercase mb-1">产出成果</p>
                                        <div 
                                          className="text-xs opacity-80 font-serif line-clamp-2 [&>p]:m-0"
                                          dangerouslySetInnerHTML={{ __html: task.outcome }}
                                        />
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 opacity-50">
                                      {task.startDate && <p className="text-[10px] uppercase tracking-wider">计划开始: {task.startDate}</p>}
                                      <p className="text-[10px] uppercase tracking-wider">计划截止: {task.endDate}</p>
                                      {(task.plannedProgress !== undefined && task.plannedProgress > 0) && <p className="text-[10px] uppercase tracking-wider">预计进度: {task.plannedProgress}%</p>}
                                    </div>
                                  </div>
                                </div>
                              )})
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    );
  };

  // R&D Release Stats Calculation
  const rndVisibleGroupsList = groups.filter(g => g.category === 'rnd' && (currentUser?.department === 'admin' || g.id === currentUser?.groupId));
  const currentMonthReleaseGoals = releaseGoals.filter(g => g.targetMonth === selectedMonth && rndVisibleGroupsList.some(vg => vg.id === g.groupId));
  
  const rndReleaseStats = {
    totalTarget: currentMonthReleaseGoals.length,
    totalReleased: currentMonthReleaseGoals.filter(g => g.status === 'released').length,
    groups: rndVisibleGroupsList.map(group => {
      const groupGoals = currentMonthReleaseGoals.filter(g => g.groupId === group.id);
      return {
        id: group.id,
        name: group.name,
        target: groupGoals.length,
        released: groupGoals.filter(g => g.status === 'released').length
      };
    })
  };

  const displayRequirements = requirements.filter(r => {
    if (r.deleted) return false;
    if (reqAssigneeFilter && r.assigneeId !== reqAssigneeFilter) return false;
    if (currentUser) {
      if (reqTabFilter === 'created' && r.submitterId !== currentUser.id) return false;
      if (reqTabFilter === 'assigned' && r.assigneeId !== currentUser.id) return false;
    }
    return true;
  });

  return (
    <div className="h-[100dvh] w-full bg-dynamic-minimal text-[#1A1A1A] font-sans flex flex-col selection:bg-[#1A1A1A] selection:text-[#FAFAF9] overflow-hidden antialiased">
      {/* Header */}
      <header className="flex justify-between items-center px-4 sm:px-6 lg:px-10 py-4 sm:py-6 border-b border-[#1A1A1A] shrink-0 z-40 bg-[#F7F6F2]">
        <div className="flex justify-between items-center w-full md:w-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif italic tracking-tight text-[#1A1A1A]">TrackFlow</h1>
          <div className="flex md:hidden items-center gap-4 text-[11px] font-semibold">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"                
            >
              <User className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsGuideModalOpen(true)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"                
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {currentUser.department === 'admin' && (
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="hidden md:flex w-full md:w-auto overflow-x-auto custom-scrollbar pb-1">
          <div className="flex gap-2 items-center text-[12px] uppercase tracking-widest font-bold whitespace-nowrap min-w-max">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-1.5 rounded-full transition-all duration-200 ${currentView === 'dashboard' ? 'bg-[#1A1A1A] text-white shadow-md' : 'opacity-60 hover:opacity-100 hover:bg-[#1A1A1A]/5'}`}
            >
              全局总览
            </button>
            
            {(currentUser.roles.includes('项目经理') || currentUser.department === 'admin') && (
              <button 
                onClick={() => setCurrentView('tracking')}
                className={`px-3 py-1.5 rounded-full transition-all duration-200 ${currentView === 'tracking' ? 'bg-[#1A1A1A] text-white shadow-md' : 'opacity-60 hover:opacity-100 hover:bg-[#1A1A1A]/5'}`}
              >
                项目跟踪
              </button>
            )}
            
            {[{id: 'marketing', name: '市场开拓'}, {id: 'rnd', name: '产品研发'}, {id: 'requirements', name: '需求池'}]
              .filter(dept => {
                if (currentUser.department === 'admin') return true;
                if (dept.id === 'requirements') return true;
                return currentUser.department === dept.id;
              })
              .map(dept => (
              <button 
                key={dept.id}
                onClick={() => setCurrentView(dept.id)}
                className={`px-3 py-1.5 rounded-full transition-all duration-200 ${currentView === dept.id ? 'bg-[#1A1A1A] text-white shadow-md' : 'opacity-60 hover:opacity-100 hover:bg-[#1A1A1A]/5'}`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6 border-l border-[#1A1A1A]/20 pl-6 ml-2 text-[12px] uppercase tracking-widest font-semibold">
          <span className="opacity-60 font-mono tracking-wider cursor-pointer hover:underline" onClick={() => setIsProfileModalOpen(true)}>{currentUser.name}</span>
          <button 
            onClick={() => setIsGuideModalOpen(true)}
            className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1.5 font-sans"                
            title="使用说明"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>说明</span>
          </button>
          {currentUser.department === 'admin' && (
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
              title="设置"
            >
              <Settings className="w-[15px] h-[15px]" />
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
            title="退出登录"
          >
             <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-12 relative pb-[calc(env(safe-area-inset-bottom)+70px)] md:pb-0">
        {/* Sidebar / Planning Column - Only show if not in tracking view */}
        <section className={`lg:col-span-3 lg:border-r border-[#1A1A1A] p-4 sm:p-6 lg:p-8 flex flex-col border-b lg:border-b-0 h-auto lg:h-full lg:overflow-y-auto ${currentView === 'tracking' ? 'hidden' : 'flex'} ${currentView === 'dashboard' ? 'order-2 lg:order-1' : ''}`}>
          <div className="mb-10 lg:mb-auto flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold flex items-center">
                <span className="w-2 h-2 bg-[#1A1A1A] mr-3"></span> {currentView === 'dashboard' ? `${selectedQuarter.split('-')[0]}年 ${selectedQuarter.split('-')[1]} 核心目标` : currentView === 'requirements' ? `${reqTimeFrame === 'month' ? selectedMonth.split('-')[0] + '年' + selectedMonth.split('-')[1] + '月' : reqTimeFrame === 'quarter' ? selectedQuarter.split('-')[0] + '年 ' + selectedQuarter.split('-')[1] : selectedYear + '年'} 需求统计` : `${selectedMonth.split('-')[0]}年${selectedMonth.split('-')[1]}月 目标`}
              </h2>
              <div className="flex items-center gap-2">
                {currentView === 'requirements' && (
                  <div className="flex gap-1 border border-[#1A1A1A]/20 p-0.5 bg-black/5">
                    {[
                      { id: 'month', label: '月度' },
                      { id: 'quarter', label: '季度' },
                      { id: 'year', label: '年度' }
                    ].map(tf => (
                      <button
                        key={tf.id}
                        onClick={() => setReqTimeFrame(tf.id as any)}
                        className={`text-[9px] px-2.5 py-1 font-bold uppercase tracking-widest transition-all ${reqTimeFrame === tf.id ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-black/5'}`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                )}
                {currentView === 'marketing' && (currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                  <button 
                    onClick={openGoalModal}
                    className="text-[9px] border border-[#1A1A1A] px-2 py-1 uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    设定市场指标
                  </button>
                )}
              </div>
            </div>

            {(currentView === 'dashboard' || (currentView === 'requirements' && reqTimeFrame === 'quarter')) && (
              <div className="mb-6 flex items-start">
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/20 bg-black/5 px-2 py-0 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedQuarter.split('-')[0]) + 1;
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5">{selectedQuarter.split('-')[0]}年</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedQuarter.split('-')[0]) - 1;
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▼</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar-on-mobile items-center flex-1" id="quarter-scroll-container">
                {Array.from({ length: 4 }).map((_, i) => {
                  const q = `Q${i + 1}`;
                  const targetQuarter = `${selectedQuarter.split('-')[0]}-${q}`;
                  const isSelected = selectedQuarter === targetQuarter;
                  return (
                    <button
                      key={targetQuarter}
                      id={isSelected ? 'active-quarter-tab' : undefined}
                      onClick={() => setSelectedQuarter(targetQuarter)}
                      className={`text-[10px] px-3 py-2 whitespace-nowrap border border-[#1A1A1A] transition-colors focus:outline-none ${isSelected ? 'bg-[#1A1A1A] text-white font-bold' : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}
                    >
                      {q}
                    </button>
                  )
                })}
                </div>
              </div>
            )}

            {(currentView === 'marketing' || currentView === 'rnd' || (currentView === 'requirements' && reqTimeFrame === 'month')) && (
              <div className="mb-6 flex items-start">
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/20 bg-black/5 px-2 py-0 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedMonth.split('-')[0]) + 1;
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5">{selectedMonth.split('-')[0]}年</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedMonth.split('-')[0]) - 1;
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▼</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar-on-mobile items-center flex-1" id="month-scroll-container">
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  const targetMonth = `${selectedMonth.split('-')[0]}-${m}`;
                  const isSelected = selectedMonth === targetMonth;
                  return (
                    <button
                      key={targetMonth}
                      id={isSelected ? 'active-month-tab' : undefined}
                      onClick={() => setSelectedMonth(targetMonth)}
                      className={`text-[10px] px-3 py-2 whitespace-nowrap border border-[#1A1A1A] transition-colors focus:outline-none ${isSelected ? 'bg-[#1A1A1A] text-white font-bold' : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}
                    >
                      {i + 1}月
                    </button>
                  )
                })}
                </div>
              </div>
            )}

            {(currentView === 'requirements' && reqTimeFrame === 'year') && (
              <div className="mb-6 flex items-start">
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/20 bg-black/5 px-2 py-0 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedYear) + 1;
                    setSelectedYear(`${newYear}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5">选择年份</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedYear) - 1;
                    setSelectedYear(`${newYear}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[8px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none">▼</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar-on-mobile items-center flex-1" id="year-scroll-container">
                {Array.from({ length: 5 }).map((_, i) => {
                  const targetYear = `${parseInt(selectedYear) - 2 + i}`;
                  const isSelected = selectedYear === targetYear;
                  return (
                    <button
                      key={targetYear}
                      id={isSelected ? 'active-year-tab' : undefined}
                      onClick={() => setSelectedYear(targetYear)}
                      className={`text-[10px] px-4 py-2 whitespace-nowrap border border-[#1A1A1A] transition-colors focus:outline-none ${isSelected ? 'bg-[#1A1A1A] text-white font-bold' : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}
                    >
                      {targetYear}年
                    </button>
                  )
                })}
                </div>
              </div>
            )}

            {currentView === 'marketing' && (
              <div className="mb-8 border-b border-[#1A1A1A]/10 pb-6">
                <h3 className="text-sm font-serif italic font-bold mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full"></span>
                  {selectedMonth} 月度核心指标概览
                </h3>
                <div className="flex flex-col border-y border-[#1A1A1A]/10">
                  {/* Profit */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 border-b border-[#1A1A1A]/5 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">利润额</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">万</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className="text-xs font-mono font-bold leading-none">{currentMonthActualProfit}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {currentMonthTargetProfit} 目标</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contract */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 border-b border-[#1A1A1A]/5 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">合同签署额</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">万</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className="text-xs font-mono font-bold leading-none">{currentMonthActualContract}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {currentMonthTargetContract} 目标</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Collection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 border-b border-[#1A1A1A]/5 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">渠道回款完成</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">万</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className="text-xs font-mono font-bold leading-none">{currentMonthActualCollection}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {currentMonthTargetCollection} 目标</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lead */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 border-b border-[#1A1A1A]/5 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">潜在客户挖掘</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">家</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className="text-xs font-mono font-bold leading-none">{currentLeadClients}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {targetLeadClients} 目标</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 border-b border-[#1A1A1A]/5 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">意向客户跟进</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">家</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className="text-xs font-mono font-bold leading-none">{currentActiveClients}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {targetActiveClients} 目标</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lost */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 hover:bg-black/5 transition-colors group">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                      <span className="text-xs font-medium text-[#1A1A1A]">客户流失控制</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 bg-black/5 px-1 py-0.5 rounded-sm shrink-0">家</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <div className="flex items-baseline gap-1">
                          <span className="text-[9px] sm:hidden text-[#1A1A1A]/50 mr-1">进度</span>
                          <span className={`text-xs font-mono font-bold leading-none ${targetLostClients > 0 && currentLostClients > targetLostClients ? 'text-[#dc2626]' : ''}`}>{currentLostClients}</span>
                          <span className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase leading-none">/ {targetLostClients} 上限</span>
                      </div>
                      <div className="w-[40px] flex justify-end shrink-0">
                        {(currentUser.department === 'admin' || (currentUser.department === 'marketing' && currentUser.roles.includes('组长'))) && (
                          <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white px-2 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentView === 'rnd' && (
              <div className="mb-8 border-b border-[#1A1A1A]/10 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-serif italic font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full"></span>
                    {selectedMonth} 上线产品数据看板
                  </h3>
                  {(currentUser.department === 'admin' || (currentUser.department === 'rnd' && currentUser.roles.includes('组长'))) && (
                    <button onClick={() => {
                      setEditingReleaseGoal(null);
                      setReleaseGoalForm({
                        title: '', targetMonth: selectedMonth, targetDate: '', status: 'planned', 
                        groupId: currentUser.department === 'admin' ? (groups.filter(g => g.category === 'rnd').length > 0 ? groups.filter(g => g.category === 'rnd')[0].id : '') : currentUser.groupId
                      });
                      setIsReleaseGoalModalOpen(true);
                    }} className="text-[9px] uppercase tracking-widest border border-[#1A1A1A] px-2 py-1 hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer">
                      设定发布目标
                    </button>
                  )}
                </div>
                
                {/* Stats Summary Panel */}
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border border-[#1A1A1A]/10 bg-[#1A1A1A]/5">
                  <div className="flex flex-col border-r border-[#1A1A1A]/10 pr-4">
                    <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-1">当月总目标</span>
                    <span className="text-2xl font-serif italic">{rndReleaseStats.totalTarget}</span>
                  </div>
                  <div className="flex flex-col sm:border-r border-[#1A1A1A]/10 pr-4">
                    <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-1">当月实际上线</span>
                    <span className="text-2xl font-serif italic text-[#16a34a]">{rndReleaseStats.totalReleased}</span>
                  </div>
                  
                  {/* Group breakdown */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-2">各小组明细</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {rndReleaseStats.groups.length > 0 ? rndReleaseStats.groups.map(g => (
                        <div key={g.id} className="flex items-center gap-2 text-xs">
                          <span className="font-bold opacity-80">{g.name}:</span>
                          <span className="font-mono">
                            <span className="text-[#16a34a]">{g.released}</span>
                            <span className="opacity-40">/</span>
                            <span className="opacity-80">{g.target}</span>
                          </span>
                        </div>
                      )) : (
                        <span className="text-[9px] opacity-40 italic">暂无研发小组</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {releaseGoals.filter(g => g.targetMonth === selectedMonth && (currentUser.department === 'admin' || currentUser.groupId === g.groupId)).length > 0 ? (
                    releaseGoals.filter(g => g.targetMonth === selectedMonth && (currentUser.department === 'admin' || currentUser.groupId === g.groupId)).map(goal => {
                      const group = groups.find(g => g.id === goal.groupId);
                      const canEdit = currentUser.department === 'admin' || (currentUser.groupId === goal.groupId && currentUser.roles.includes('组长'));
                      return (
                        <div key={goal.id} className="border border-[#1A1A1A]/10 p-3 hover:bg-[#1A1A1A]/5 transition-colors group relative cursor-pointer" onClick={() => {
                          if (!canEdit) return;
                          setEditingReleaseGoal(goal);
                          setReleaseGoalForm(goal);
                          setIsReleaseGoalModalOpen(true);
                        }}>
                          {canEdit && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); deleteReleaseGoal(goal.id); }} className="text-[#1A1A1A]/50 hover:text-red-600 text-xs px-1">×</button>
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-2">
                             <div className="flex flex-col gap-1 w-full overflow-hidden">
                               <div 
                                 className="text-xs font-bold leading-tight prose prose-sm prose-black max-w-none [&>p]:m-0"
                                 dangerouslySetInnerHTML={{ __html: goal.title }}
                               />
                               <span className="text-[9px] font-mono opacity-60 uppercase">{group?.name || '未知小组'}</span>
                             </div>
                             <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${goal.status === 'released' ? 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/30' : goal.status === 'delayed' ? 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/30' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 border-[#1A1A1A]/20'}`}>
                                {goal.status === 'planned' ? '计划中' : goal.status === 'released' ? '已上线' : '已延期'}
                             </span>
                          </div>
                          
                          <div className="flex gap-4 mt-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] opacity-50 uppercase tracking-widest">预估时间</span>
                              <span className="text-xs font-mono">{goal.targetDate || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] opacity-50 uppercase tracking-widest">实际版本与时间</span>
                              <span className="text-xs font-mono font-bold">{goal.actualVersion ? `${goal.actualVersion} (${goal.actualReleaseDate})` : '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-left text-xs opacity-50 py-4 italic font-serif">该月暂无产品上线目标</div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'requirements' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 mb-10">
                <div className="flex flex-col gap-6">
                  <div className="border border-[#1A1A1A]/10 p-5 bg-white shadow-sm ring-1 ring-black/5">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-[#1A1A1A]"></span> 核心指标数据
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                      <div className="flex flex-col">
                        <span className="text-4xl font-serif italic">{activeMonthReqs.length}</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 mt-1 font-bold">需求总计</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-serif italic text-[#1A1A1A]">{activeMonthReqs.filter(r => r.status === 'backlog').length}</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 mt-1 font-bold">待评审</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-serif italic text-[#1A1A1A]">{activeMonthReqs.filter(r => ['approved', 'planned'].includes(r.status)).length}</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 mt-1 font-bold">进行中</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-serif italic text-[#16a34a]">{activeMonthReqs.length > 0 ? Math.round((activeMonthReqs.filter(r => r.status === 'completed').length / activeMonthReqs.length) * 100) : 0}%</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 mt-1 font-bold">交付率</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#1A1A1A]/10 p-5 h-[240px] flex flex-col">
                    <h3 className="text-[10px] uppercase tracking-[0.1em] font-bold mb-6 flex items-center">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A] mr-2"></span> 状态流转分布
                    </h3>
                    <div className="flex-1 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: '待评', value: activeMonthReqs.filter(r => r.status === 'backlog').length },
                          { name: '审中', value: activeMonthReqs.filter(r => r.status === 'reviewing').length },
                          { name: '通过', value: activeMonthReqs.filter(r => r.status === 'approved').length },
                          { name: '排期', value: activeMonthReqs.filter(r => r.status === 'planned').length },
                          { name: '完成', value: activeMonthReqs.filter(r => r.status === 'completed').length },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} hide />
                          <Tooltip 
                            contentStyle={{ fontSize: '10px', borderRadius: '0', border: '1px solid #000', padding: '4px' }}
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          />
                          <Bar dataKey="value" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-[#1A1A1A]/10 p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-6 flex items-center">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A] mr-2"></span> 业务优先级 (P0-P2)
                    </h3>
                    <div className="space-y-4">
                      {[
                        { name: 'P0 - 紧急响应', count: activeMonthReqs.filter(r => r.priority === 'high').length, bgColor: 'bg-red-600', textColor: 'text-red-600' },
                        { name: 'P1 - 核心需求', count: activeMonthReqs.filter(r => r.priority === 'medium').length, bgColor: 'bg-amber-600', textColor: 'text-amber-600' },
                        { name: 'P2 - 持续优化', count: activeMonthReqs.filter(r => r.priority === 'low').length, bgColor: 'bg-gray-400', textColor: 'text-gray-400' },
                      ].map((item, i) => {
                        const total = activeMonthReqs.length || 1;
                        const percent = (item.count / total) * 100;
                        return (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                              <span className="opacity-60">{item.name}</span>
                              <span className={item.textColor}>{item.count}</span>
                            </div>
                            <div className="h-1 bg-black/5 overflow-hidden rounded-full">
                              <div className={`h-full ${item.bgColor}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-[#1A1A1A]/10 p-5">
                    <div className="space-y-4">
                       {[
                         { id: 'customer', name: '客户反馈' },
                         { id: 'marketing', name: '市场调研' },
                         { id: 'product', name: '产品规划' },
                         { id: 'tech', name: '技术演进' },
                         { id: 'internal', name: '内部需求' }
                       ].map(src => {
                         const count = activeMonthReqs.filter(r => r.source === src.id).length;
                         const percentage = activeMonthReqs.length > 0 ? Math.round((count / activeMonthReqs.length) * 100) : 0;
                         return (
                           <div key={src.id} className="group">
                             <div className="flex justify-between text-[9px] uppercase tracking-wider font-bold mb-1.5">
                               <span className="opacity-60">{src.name}</span>
                               <span className="opacity-40">{count}</span>
                             </div>
                             <div className="h-1 bg-black/5 overflow-hidden">
                               <div className="h-full bg-[#1A1A1A] transition-all duration-700" style={{ width: `${percentage}%` }}></div>
                             </div>
                           </div>
                         )
                       })}
                    </div>
                  </div>

                  <div className="bg-white border border-[#1A1A1A]/10 p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-6 flex items-center">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A] mr-2"></span> 研发各组需求分析 (总计 / 已交付)
                    </h3>
                    <div className="space-y-5">
                      {(() => {
                        const groupStats = groups.filter(g => g.category === 'rnd').map(group => {
                          const getRequirementGroup = (req: Requirement) => {
                            if (req.assigneeId) {
                              return members.find(m => m.id === req.assigneeId)?.groupId;
                            }
                            if (req.projectId) {
                              const proj = projects.find(p => p.id === req.projectId);
                              if (proj?.managerId) {
                                return members.find(m => m.id === proj.managerId)?.groupId;
                              }
                            }
                            return null;
                          };
                          const grpReqs = activeMonthReqs.filter(r => getRequirementGroup(r) === group.id);
                          const total = grpReqs.length;
                          const completed = grpReqs.filter(r => r.status === 'completed').length;
                          return { ...group, total, completed };
                        });
                        const maxTotal = Math.max(1, ...groupStats.map(s => s.total));
                        
                        return groupStats.map(stat => {
                          const totalPercent = (stat.total / maxTotal) * 100;
                          const completedPercent = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
                          return (
                            <div key={stat.id} className="group">
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 leading-none">{stat.name}</span>
                                <span className="text-[10px] font-mono leading-none">
                                  <span className="text-[#1A1A1A] opacity-50">{stat.total}</span>
                                  <span className="mx-1 opacity-20">/</span>
                                  <span className="text-[#16a34a] font-bold opacity-80">{stat.completed}</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-black/5 overflow-hidden flex w-full">
                                <div className="h-full bg-black/20 transition-all duration-700" style={{ width: `${totalPercent - (totalPercent * completedPercent / 100)}%` }} title={`未交付: ${stat.total - stat.completed}`} />
                                <div className="h-full bg-[#16a34a] transition-all duration-700" style={{ width: `${totalPercent * completedPercent / 100}%` }} title={`已交付: ${stat.completed}`} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="space-y-8">
              {(currentView === 'dashboard' ? groups : groups.filter(g => g.category === currentView))
                .filter(g => currentView === 'dashboard' || currentUser.department === 'admin' || currentUser.groupId === g.id)
                .map(group => {
                const storageKey = `${group.id}_${currentView === 'dashboard' ? selectedQuarter : selectedMonth}`;
                const canEditGoal = currentUser.department === 'admin' || (currentUser.roles.includes('组长') && currentUser.groupId === group.id);
                return (
                <div key={group.id} className="space-y-3 relative group">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold opacity-80">{group.name}</h3>
                    {canEditGoal && (
                      <button 
                        onClick={() => setEditingQuarterGroupIds(prev => prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id])}
                        className={`text-[9px] border border-[#1A1A1A] px-2 py-1 uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors ${editingQuarterGroupIds.includes(group.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        {editingQuarterGroupIds.includes(group.id) ? '保存' : '编辑'}
                      </button>
                    )}
                  </div>
                  {editingQuarterGroupIds.includes(group.id) ? (
                    <RichTextEditor 
                      value={quarterGoalsTexts[storageKey] || ''} 
                      onChange={(val) => setQuarterGoalsTexts(prev => ({...prev, [storageKey]: val}))} 
                    />
                  ) : (
                    <div className="relative group/content">
                      <div 
                        className="prose prose-sm prose-black max-w-none opacity-80 text-sm leading-relaxed line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: quarterGoalsTexts[storageKey] || `<p class="opacity-50 italic text-sm">暂无 ${currentView === 'dashboard' ? selectedQuarter : selectedMonth} 目标...</p>` }}
                      />
                      {quarterGoalsTexts[storageKey] && (
                        <button
                          onClick={() => {
                            setSelectedGoalDetail({ title: group.name, content: quarterGoalsTexts[storageKey] });
                            setIsGoalDetailModalOpen(true);
                          }}
                          className="text-[10px] uppercase tracking-widest font-bold underline underline-offset-4 mt-2 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          查看全部目标详情
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
            )}
          </div>
        </section>

        {/* Main Schedule / Weekly Breakdown */}
        <section className={`${currentView === 'tracking' ? 'lg:col-span-12 p-0' : 'lg:col-span-9 p-4 sm:p-6 lg:p-8'} flex flex-col border-b border-[#1A1A1A] lg:border-b-0 h-auto lg:h-full lg:overflow-y-auto bg-[#F7F6F2] ${currentView === 'dashboard' ? 'order-1 lg:order-2' : ''}`}>
          <div className="flex-1 flex flex-col">
            {/* Requirements View */}
            {currentView === 'requirements' && (
              <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col gap-4">
                  
                  {/* Desktop Header */}
                  <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 p-6 border border-[#1A1A1A]/10">
                    <div>
                      <h2 className="text-3xl font-serif italic mb-1">产品需求池</h2>
                      <p className="text-[10px] opacity-50 uppercase tracking-widest">收纳、评审与规划产品的各项业务及技术需求</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <select 
                        value={reqAssigneeFilter}
                        onChange={(e) => setReqAssigneeFilter(e.target.value)}
                        className="bg-transparent border border-[#1A1A1A]/20 py-2.5 px-3 text-[11px] outline-none hover:border-[#1A1A1A]/50 transition-colors cursor-pointer mr-2 max-w-[140px]"
                      >
                        <option value="">全部研发人员</option>
                        {members.filter(m => m.department === 'rnd').map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setIsRequirementRecycleBinOpen(true)}
                        className="group bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] py-2.5 px-4 text-[11px] font-bold uppercase tracking-widest hover:bg-black/5 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除记录
                      </button>
                      <button 
                        onClick={() => {
                          setEditingRequirementId(null);
                          setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                          setIsRequirementModalOpen(true);
                        }}
                        className="bg-[#1A1A1A] text-[#F7F6F2] py-2.5 px-6 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                      >
                        + 提交新需求
                      </button>
                    </div>
                  </div>
                  
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

                  <div className="flex items-center gap-4 sm:gap-6 sm:border-b border-[#1A1A1A]/10 px-4 sm:px-2 overflow-x-auto whitespace-nowrap hide-scrollbar-on-mobile">
                    {/* Desktop Tabs */}
                    <div className="hidden sm:flex items-center gap-6">
                      <button 
                        onClick={() => setReqTabFilter('all')}
                        className={`pb-3 border-b-2 text-[12px] font-bold tracking-widest transition-colors ${reqTabFilter === 'all' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                      >
                        所有需求
                      </button>
                      <button 
                        onClick={() => setReqTabFilter('created')}
                        className={`pb-3 border-b-2 text-[12px] font-bold tracking-widest transition-colors ${reqTabFilter === 'created' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                      >
                        我发起的
                      </button>
                      <button 
                        onClick={() => setReqTabFilter('assigned')}
                        className={`pb-3 border-b-2 text-[12px] font-bold tracking-widest transition-colors ${reqTabFilter === 'assigned' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                      >
                        分配给我的
                      </button>
                    </div>

                    {/* Mobile Native Segmented Control */}
                    <div className="sm:hidden flex bg-[#1A1A1A]/5 p-1 rounded-[14px] w-full">
                      {(['all', 'created', 'assigned'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setReqTabFilter(tab)}
                          className={`flex-1 py-1.5 text-[12px] font-bold rounded-[10px] transition-all ${reqTabFilter === tab ? 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.06)] text-[#1A1A1A]' : 'text-[#1A1A1A]/60'}`}
                        >
                          {tab === 'all' ? '全部' : tab === 'created' ? '我发起的' : '我负责的'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 pb-8 -mx-4 sm:mx-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth">
                  
                  <div className="flex xl:grid xl:grid-cols-6 gap-4 sm:gap-6 pb-4 px-4 sm:px-0">
                  {(['backlog', 'reviewing', 'approved', 'rejected', 'planned', 'completed'] as RequirementStatus[]).map((status) => (
                    <div key={status} className="flex flex-col gap-4 w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-center sm:snap-start">
                      <div className="flex items-center justify-between px-2 sm:px-1 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                              status === 'backlog' ? 'bg-gray-400' :
                              status === 'reviewing' ? 'bg-blue-400' :
                              status === 'approved' ? 'bg-emerald-400' :
                              status === 'rejected' ? 'bg-rose-400' :
                              status === 'planned' ? 'bg-indigo-500' :
                              'bg-slate-800'
                          }`}></div>
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
                      </div>
                      <div className="flex flex-col gap-3 min-h-[200px]">
                        {displayRequirements.filter(r => r.status === status).map((req) => (
                          <div 
                            key={req.id} 
                            onClick={() => {
                              setSelectedRequirement(req);
                              setIsRequirementDetailModalOpen(true);
                            }}
                            className={`p-5 hover:shadow-md transition-transform active:scale-[0.98] group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-black/5 cursor-pointer shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                              req.status === 'backlog' ? 'border-l-4 border-l-gray-300' :
                              req.status === 'reviewing' ? 'border-l-4 border-l-blue-400' :
                              req.status === 'approved' ? 'border-l-4 border-l-emerald-400' :
                              req.status === 'rejected' ? 'border-l-4 border-l-rose-400' :
                              req.status === 'planned' ? 'border-l-4 border-l-indigo-500' :
                              'border-l-4 border-l-slate-800 opacity-80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-3 relative z-10">
                              <div className="flex gap-1.5 flex-wrap">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                                  req.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-200' : 
                                  req.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                                  'bg-gray-50 text-gray-500 border border-gray-200'
                                }`}>
                                  {req.priority === 'high' ? 'P0' : req.priority === 'medium' ? 'P1' : 'P2'}
                                </span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 opacity-70">
                                  {req.source === 'customer' ? (req.customerName || '客户') : req.source === 'marketing' ? '市场' : req.source === 'product' ? '规划' : req.source === 'internal' ? (req.internalSourceDetail || '内部') : '技术'}
                                </span>
                              </div>
                              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-auto flex-wrap justify-end items-center bg-white/50 backdrop-blur-sm sm:bg-transparent rounded-sm p-1 sm:p-0">
                                {(currentUser.department === 'admin' || currentUser.id === req.submitterId) && (
                                  <select 
                                    value={req.status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateRequirementStatus(req.id, e.target.value as RequirementStatus);
                                    }}
                                    className="text-[10px] bg-white sm:bg-transparent outline-none cursor-pointer font-bold uppercase hover:bg-black/5 py-1.5 px-2 focus:bg-white border border-[#1A1A1A]/10 sm:border-transparent focus:border-[#1A1A1A]/20 rounded-sm"
                                  >
                                    <option value="backlog">待评</option>
                                    <option value="reviewing">评审</option>
                                    <option value="approved">通过</option>
                                    <option value="rejected">驳回</option>
                                    <option value="planned">排期</option>
                                    <option value="completed">完成</option>
                                  </select>
                                )}
                              </div>
                            </div>
                            <h4 className="text-sm font-bold mb-2 leading-snug relative z-10 group-hover:text-black transition-colors">{req.title}</h4>
                            <div 
                              className="text-[11px] opacity-50 line-clamp-3 font-serif italic mb-4 relative z-10 leading-relaxed overflow-hidden"
                            >
                              {/* 仅在预览模式下剥离 HTML 标签以确保 line-clamp 稳定生效 */}
                              {(req.description || "").replace(/<[^>]*>/g, " ")}
                            </div>
                            
                            {/* History Preview */}
                            {req.history && req.history.length > 0 && (
                              <div className="mb-4 space-y-1.5">
                                <div className="text-[8px] uppercase tracking-widest font-bold opacity-30 mb-1">最近动态</div>
                                {req.history.slice(0, 2).map((h, i) => (
                                  <div key={h.id} className="text-[9px] flex items-start gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <div className="w-1 h-1 rounded-full bg-black/20 mt-1.5 flex-shrink-0" />
                                    <span className="font-serif italic text-black/70">
                                      {h.note} <span className="opacity-40 ml-1">({format(new Date(h.timestamp), 'MM-dd HH:mm')})</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-[#1A1A1A]/5 relative z-10">
                              <div className="flex items-center gap-1.5 py-0.5">
                                {req.assigneeId && (
                                  <span className="text-[9px] font-bold bg-[#1A1A1A] text-white px-1 shadow-sm">
                                    {members.find(m => m.id === req.assigneeId)?.name.charAt(0)}
                                  </span>
                                )}
                                <span className="text-[9px] opacity-60 font-bold">
                                  {members.find(m => m.id === req.assigneeId)?.name || '未分配'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {displayRequirements.filter(r => r.status === status).length === 0 && (
                          <div className="flex-1 border border-dashed border-[#1A1A1A]/10 flex items-center justify-center bg-black/[0.02]">
                            <span className="text-[10px] opacity-20 uppercase tracking-[0.2em] font-bold">空</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
            {/* Marketing Section */}
            {currentView === 'marketing' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl sm:text-3xl font-serif italic">任务看板</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono uppercase tracking-widest opacity-60">第{currentWeekNum}周 / {format(weekStart, 'MM月dd日')} - {format(weekEnd, 'MM月dd日')}</span>
                      {isSameWeek(new Date(), currentWeekDate, { weekStartsOn: 1 }) && (
                        <span className="text-[9px] bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">本周</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-[#1A1A1A]/5 p-1 rounded-sm border border-[#1A1A1A]/10">
                    <button 
                      onClick={() => setCurrentWeekDate(subWeeks(currentWeekDate, 1))}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 transition-colors rounded-sm"
                      title="上周"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => setCurrentWeekDate(new Date())}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-x border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/10 transition-colors"
                    >
                      返回本周
                    </button>
                    <button 
                      onClick={() => setCurrentWeekDate(addWeeks(currentWeekDate, 1))}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 transition-colors rounded-sm"
                      title="下周"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-[10px] px-2 py-0.5 border border-[#1A1A1A] font-bold tracking-widest">市场开拓序列</span>
                  <div className="h-[1px] flex-1 bg-[#1A1A1A] opacity-10"></div>
                </div>
                {renderTaskGroups(marketingTasks, 'marketing')}
              </div>
            )}

            {/* R&D Section */}
            {currentView === 'rnd' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl sm:text-3xl font-serif italic">任务看板</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono uppercase tracking-widest opacity-60">第{currentWeekNum}周 / {format(weekStart, 'MM月dd日')} - {format(weekEnd, 'MM月dd日')}</span>
                      {isSameWeek(new Date(), currentWeekDate, { weekStartsOn: 1 }) && (
                        <span className="text-[9px] bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">本周</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#1A1A1A]/5 p-1 rounded-sm border border-[#1A1A1A]/10">
                    <button 
                      onClick={() => setCurrentWeekDate(subWeeks(currentWeekDate, 1))}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 transition-colors rounded-sm"
                      title="上周"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => setCurrentWeekDate(new Date())}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-x border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/10 transition-colors"
                    >
                      返回本周
                    </button>
                    <button 
                      onClick={() => setCurrentWeekDate(addWeeks(currentWeekDate, 1))}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 transition-colors rounded-sm"
                      title="下周"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-[10px] px-2 py-0.5 border border-[#1A1A1A] font-bold tracking-widest">产品研发序列</span>
                  <div className="h-[1px] flex-1 bg-[#1A1A1A] opacity-10"></div>
                </div>
                {renderTaskGroups(rndTasks, 'rnd')}
              </div>
            )}
          </div>

          {/* Monthly Comparison Analysis (Dashboard Exclusive) */}
          {currentView === 'tracking' && (currentUser.roles.includes('项目经理') || currentUser.department === 'admin') && (
              <ProjectTrackingView 
                trackings={projectTrackings}
                onDelete={terminateTracking}
                onEdit={(t) => { setEditingTrackingId(t.id); setTrackingForm(t); setTrackingError(''); setIsTrackingModalOpen(true); }}
                onAdd={() => { setEditingTrackingId(null); setTrackingForm({ customerName: '', status: 'followup', product: '', cityManager: '', projectManager: '', expectedContractAmount: 0, actualContractAmount: 0, contactName: '', contactPhone: '' }); setTrackingError(''); setIsTrackingModalOpen(true); }}
                onAddFollowup={(t) => {
                   setEditingTrackingId(t.id);
                   setFollowupForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '' });
                   setIsFollowupModalOpen(true);
                }}
                onViewDetails={(t) => {
                   setSelectedTrackingDetail(t);
                   setIsTrackingDetailModalOpen(true);
                }}
                onStatusChange={updateTrackingStatus}
                filterStatus={trackingFilterStatus}
                setFilterStatus={setTrackingFilterStatus}
                searchTerm={trackingSearchTerm}
                setSearchTerm={setTrackingSearchTerm}
                statusColors={statusColors}
                statusLabels={statusLabels}
                year={trackingYear}
                month={trackingMonth}
                setYear={setTrackingYear}
                setMonth={setTrackingMonth}
                annualTargetProfit={annualTargetProfit}
              />
          )}
          {currentView === 'dashboard' && (
            <div className="flex-1 w-full space-y-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-6 gap-2 sm:gap-0 sm:border-b border-[#1A1A1A]/20 pb-2 sm:pb-4 px-4 sm:px-0 mt-4 sm:mt-0">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">全局看板</h2>
                  <p className="text-[11px] font-sans text-[#1A1A1A]/50 uppercase tracking-widest hidden sm:block">DATABOARD . V1</p>
                </div>
              </div>


              {/* Digital Metrics Board */}
              <div className="flex flex-col gap-4 mb-2">
                <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-4 -mx-4 sm:mx-0">
                  
                  {/* 1. Year to Date Profit */}
                  {(() => {
                    const yearProfitRatio = annualTargetProfit > 0 ? currentYearActualProfit / annualTargetProfit : 0;
                    const yearPercentage = (yearProfitRatio * 100).toFixed(1);
                    
                    let textColor = "text-[#1A1A1A]";
                    let badgeBg = "bg-[#1A1A1A]/10";
                    let barColor = "bg-[#1A1A1A]";
                    
                    if (currentYearActualProfit > 0) {
                      if (yearProfitRatio >= 1) {
                        textColor = "text-[#16a34a]";
                        badgeBg = "bg-[#16a34a]/10";
                        barColor = "bg-[#16a34a]";
                      } else if (yearProfitRatio >= 0.8) {
                        textColor = "text-[#d97706]";
                        badgeBg = "bg-[#d97706]/10";
                        barColor = "bg-[#d97706]";
                      } else if (yearProfitRatio > 0 && currentYearActualProfit < annualTargetProfit * (new Date().getMonth()+1)/12 ) { // Just a rough estimate if behind schedule
                        textColor = "text-[#dc2626]";
                        badgeBg = "bg-[#dc2626]/10";
                        barColor = "bg-[#dc2626]";
                      }
                    }

                    return (
                      <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[300px] sm:min-w-0 w-full shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="text-8xl font-serif">¥</span>
                        </div>
                        <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 w-[85%] leading-tight">本年度累计利润 (万) / 目标: {annualTargetProfit}</span>
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className={`text-4xl font-serif italic ${textColor}`}>{currentYearActualProfit}</span>
                          <span className={`text-[10px] font-mono ${textColor} ${badgeBg} px-1.5 py-0.5 rounded-sm`}>
                            {yearPercentage}% 达成
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A1A]/5">
                          <div 
                            className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.min(100, yearProfitRatio * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Combined Month Profit */}
                  {(() => {
                    const monthProfitRatio = currentMonthTargetProfit > 0 ? currentMonthActualProfit / currentMonthTargetProfit : 0;
                    const monthPercentage = (monthProfitRatio * 100).toFixed(1);
                    
                    let textColor = "text-[#1A1A1A]";
                    let badgeBg = "bg-[#1A1A1A]/10";
                    let barColor = "bg-[#1A1A1A]";
                    
                    if (currentMonthActualProfit > 0) {
                      if (monthProfitRatio >= 1) {
                        textColor = "text-[#16a34a]";
                        badgeBg = "bg-[#16a34a]/10";
                        barColor = "bg-[#16a34a]";
                      } else if (monthProfitRatio >= 0.8) {
                        textColor = "text-[#d97706]";
                        badgeBg = "bg-[#d97706]/10";
                        barColor = "bg-[#d97706]";
                      } else {
                        textColor = "text-[#dc2626]";
                        badgeBg = "bg-[#dc2626]/10";
                        barColor = "bg-[#dc2626]";
                      }
                    } else if (monthProfitRatio === 0 && currentMonthTargetProfit > 0) {
                      textColor = "text-[#dc2626]";
                      badgeBg = "bg-[#dc2626]/10";
                      barColor = "bg-[#dc2626]";
                    }
                    
                    return (
                      <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[300px] sm:min-w-0 w-full shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="text-8xl font-serif">¥</span>
                        </div>
                        <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 leading-tight">当月利润目标 / 实际 (万)</span>
                        <div className="flex items-baseline gap-2 relative z-10 mt-2">
                          <span className={`text-3xl font-serif italic ${textColor}`}>{currentMonthActualProfit}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/40 uppercase">/ {currentMonthTargetProfit}</span>
                          <span className={`text-[10px] font-mono ${textColor} ${badgeBg} px-1.5 py-0.5 rounded-sm ml-auto`}>
                            {monthPercentage}% 达成
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A1A]/5">
                          <div 
                            className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                            style={{ width: `${Math.min(100, monthProfitRatio * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Combined Month Contract */}
                  {(() => {
                    const monthContractRatio = currentMonthTargetContract > 0 ? currentMonthActualContract / currentMonthTargetContract : 0;
                    const monthPercentage = (monthContractRatio * 100).toFixed(1);
                    
                    let textColor = "text-[#1A1A1A]";
                    let badgeBg = "bg-[#1A1A1A]/10";
                    let barColor = "bg-[#1A1A1A]";
                    
                    if (currentMonthActualContract > 0) {
                      if (monthContractRatio >= 1) {
                        textColor = "text-[#16a34a]";
                        badgeBg = "bg-[#16a34a]/10";
                        barColor = "bg-[#16a34a]";
                      } else if (monthContractRatio >= 0.8) {
                        textColor = "text-[#d97706]";
                        badgeBg = "bg-[#d97706]/10";
                        barColor = "bg-[#d97706]";
                      } else {
                        textColor = "text-[#dc2626]";
                        badgeBg = "bg-[#dc2626]/10";
                        barColor = "bg-[#dc2626]";
                      }
                    } else if (monthContractRatio === 0 && currentMonthTargetContract > 0) {
                      textColor = "text-[#dc2626]";
                      badgeBg = "bg-[#dc2626]/10";
                      barColor = "bg-[#dc2626]";
                    }
                    
                    return (
                      <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[300px] sm:min-w-0 w-full shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="text-8xl font-serif">¥</span>
                        </div>
                        <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 leading-tight">当月合同目标 / 实际 (万)</span>
                        <div className="flex items-baseline gap-2 relative z-10 mt-2">
                          <span className={`text-3xl font-serif italic ${textColor}`}>{currentMonthActualContract}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/40 uppercase">/ {currentMonthTargetContract}</span>
                          <span className={`text-[10px] font-mono ${textColor} ${badgeBg} px-1.5 py-0.5 rounded-sm ml-auto`}>
                            {monthPercentage}% 达成
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A1A]/5">
                          <div 
                            className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                            style={{ width: `${Math.min(100, monthContractRatio * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Combined Month Collection */}
                  <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 flex flex-col justify-between h-32 relative overflow-hidden group shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[300px] sm:min-w-0 w-full shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                    <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A] relative z-10 w-[85%] leading-tight">当月回款目标 / 实际 (万)</span>
                    <div className="flex items-baseline gap-2 relative z-10 mt-2">
                       <span className="text-3xl font-serif italic text-[#1A1A1A]">{currentMonthActualCollection}</span>
                       <span className="text-[10px] font-mono text-[#1A1A1A]/40 uppercase">/ {currentMonthTargetCollection}</span>
                       {(() => {
                         const collectionRatio = currentMonthTargetCollection > 0 ? currentMonthActualCollection / currentMonthTargetCollection : 0;
                         const collectionPercentage = (collectionRatio * 100).toFixed(1);
                         
                         let textColor = "text-[#1A1A1A]";
                         let badgeBg = "bg-[#1A1A1A]/10";
                         
                         if (currentMonthActualCollection > 0) {
                           if (collectionRatio >= 1) { textColor = "text-[#16a34a]"; badgeBg = "bg-[#16a34a]/10"; }
                           else if (collectionRatio >= 0.8) { textColor = "text-[#d97706]"; badgeBg = "bg-[#d97706]/10"; }
                           else { textColor = "text-[#dc2626]"; badgeBg = "bg-[#dc2626]/10"; }
                         }
                         return (
                           <span className={`text-[10px] font-mono ${textColor} ${badgeBg} px-1.5 py-0.5 rounded-sm ml-auto`}>
                             {collectionPercentage}% 达成
                           </span>
                         )
                       })()}
                    </div>
                    {(() => {
                      const collectionRatio = currentMonthTargetCollection > 0 ? currentMonthActualCollection / currentMonthTargetCollection : 0;
                      let barColor = "bg-[#1A1A1A]";
                      if (collectionRatio >= 1) barColor = "bg-[#16a34a]";
                      else if (collectionRatio >= 0.8) barColor = "bg-[#d97706]";
                      else if (collectionRatio > 0) barColor = "bg-[#dc2626]";
                      return (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A1A]/5">
                          <div 
                            className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.min(100, collectionRatio * 100)}%` }}
                          />
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Client Stats Row */}
                <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-4 -mx-4 sm:mx-0">
                  <div className="bg-white/80 backdrop-blur-md border border-black/5 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[260px] sm:min-w-0 shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                    <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A]">潜在客户库 (年度累计)</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-serif italic text-[#1A1A1A]">{yearLeadClients}</span>
                      <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase">Total / {yearTargetLeadClients}</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-md border border-black/5 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[260px] sm:min-w-0 shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                    <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A]">已开发推进中 (年度累计)</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-serif italic text-[#16a34a]">{yearActiveClients}</span>
                      <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase">Active / {yearTargetActiveClients}</span>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md border border-black/5 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[260px] sm:min-w-0 shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                    <span className="text-[12px] sm:text-[10px] font-semibold opacity-80 text-[#1A1A1A]">已签约成交 (年度累计)</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-serif italic text-[#1A1A1A]">{yearSignedClients}</span>
                      <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase">Signed / {yearTargetSignedClients}</span>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md border border-black/5 p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform active:scale-[0.98] min-w-[260px] sm:min-w-0 shrink-0 snap-center rounded-[24px] sm:rounded-2xl">
                    <span className="text-[12px] sm:text-[10px] font-medium opacity-60 text-[#1A1A1A]">客户流失 (年度累计)</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-serif italic text-red-600">{yearLostClients}</span>
                      <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase">Lost / {yearTargetLostClients}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 px-4 sm:px-0 mb-8 sm:mb-0">
                {/* Chart 1: 月度目标完成趋势 (Area Chart) */}
                <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 rounded-[24px] sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <h3 id="chart-profit-title" className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-80 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#1A1A1A]" aria-hidden="true"></span> 月度利润趋势分析 ({CURRENT_YEAR}年 / 万)
                  </h3>
                  <div className="h-64 w-full focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" role="figure" aria-labelledby="chart-profit-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} role="img" aria-label="月度利润趋势分析面积图">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.6}} />
                        <YAxis fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.6}} />
                        <Tooltip contentStyle={{ backgroundColor: '#F7F6F2', border: '1px solid #1A1A1A', borderRadius: 0, fontSize: '12px' }} />
                        <Area type="monotone" dataKey="target" stroke="#1A1A1A" strokeWidth={2} fill="#1A1A1A" fillOpacity={0.05} name="目标利润" />
                        <Area type="monotone" dataKey="actual" stroke="#16a34a" strokeWidth={2} fill="#16a34a" fillOpacity={0.15} name="实际利润" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: 研发推进 & 任务分布 (Pie Chart) */}
                <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 rounded-[24px] sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <h3 id="chart-task-title" className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-80 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#1A1A1A]" aria-hidden="true"></span> 月度需求统计
                  </h3>
                  <div className="h-64 w-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" role="figure" aria-labelledby="chart-task-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart role="img" aria-label="月度需求统计饼图">
                        <Pie 
                          data={[
                            { name: '总数', value: activeMonthReqs.length },
                            { name: '进行中', value: activeMonthReqs.filter(r => ['approved', 'planned'].includes(r.status)).length },
                            { name: '已完成', value: activeMonthReqs.filter(r => r.status === 'completed').length },
                          ]} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={90} 
                          innerRadius={50}
                          fill="#1A1A1A" 
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          stroke="none"
                        >
                          <Cell fill="#a8a29e" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#16a34a" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#F7F6F2', border: '1px solid #1A1A1A', borderRadius: 0, fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8, paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: 月度利润统计 (Bar Chart) */}
                <div className="bg-white/80 backdrop-blur-md border border-black/5 p-6 lg:col-span-2 rounded-[24px] sm:rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <h3 id="chart-outcome-title" className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-80 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#1A1A1A]" aria-hidden="true"></span> 月度利润统计 ({CURRENT_YEAR}年 / 万)
                  </h3>
                  <div className="h-72 w-full focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" role="figure" aria-labelledby="chart-outcome-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} role="img" aria-label="月度利润统计柱状图">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" strokeOpacity={0.1} vertical={false} />
                        <XAxis dataKey="name" fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.6}} />
                        <YAxis fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.6}} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#F7F6F2', border: '1px solid #1A1A1A', borderRadius: 0, fontSize: '12px' }} cursor={{fill: '#1A1A1A', opacity: 0.05}} />
                        <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.8, paddingTop: '10px' }} />
                        <Bar dataKey="target" fill="#1A1A1A" name="目标利润" radius={[2, 2, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="actual" fill="#16a34a" name="实际利润" radius={[2, 2, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Mobile Bottom Navigation (Apple Style) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/70 backdrop-blur-2xl border-t border-black/5 z-40 pb-[env(safe-area-inset-bottom)] px-2 h-[calc(70px+env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.04)] before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-white/40">
        
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'dashboard' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
        >
           <LayoutDashboard className={`w-5 h-5 transition-transform ${currentView === 'dashboard' ? 'scale-110' : ''}`} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
           <span className={`text-[9px] font-bold tracking-wider ${currentView === 'dashboard' ? 'opacity-100' : 'opacity-80'}`}>全局</span>
        </button>

        {(currentUser.roles.includes('项目经理') || currentUser.department === 'admin') && (
          <button 
            onClick={() => setCurrentView('tracking')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'tracking' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <Target className={`w-5 h-5 transition-transform ${currentView === 'tracking' ? 'scale-110' : ''}`} strokeWidth={currentView === 'tracking' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'tracking' ? 'opacity-100' : 'opacity-80'}`}>跟踪</span>
          </button>
        )}

        {(currentUser.department === 'admin' || currentUser.department === 'marketing') && (
          <button 
            onClick={() => setCurrentView('marketing')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'marketing' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <TrendingUp className={`w-5 h-5 transition-transform ${currentView === 'marketing' ? 'scale-110' : ''}`} strokeWidth={currentView === 'marketing' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'marketing' ? 'opacity-100' : 'opacity-80'}`}>市场</span>
          </button>
        )}

        {(currentUser.department === 'admin' || currentUser.department === 'rnd') && (
          <button 
            onClick={() => setCurrentView('rnd')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'rnd' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <Code2 className={`w-5 h-5 transition-transform ${currentView === 'rnd' ? 'scale-110' : ''}`} strokeWidth={currentView === 'rnd' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'rnd' ? 'opacity-100' : 'opacity-80'}`}>研发</span>
          </button>
        )}

        <button 
          onClick={() => setCurrentView('requirements')}
          className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'requirements' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
        >
           <ClipboardList className={`w-5 h-5 transition-transform ${currentView === 'requirements' ? 'scale-110' : ''}`} strokeWidth={currentView === 'requirements' ? 2.5 : 2} />
           <span className={`text-[9px] font-bold tracking-wider ${currentView === 'requirements' ? 'opacity-100' : 'opacity-80'}`}>需求</span>
        </button>

      </nav>

      {/* Release Goal Modal */}
      {isReleaseGoalModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => setIsReleaseGoalModalOpen(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">{editingReleaseGoal ? '更新发布目标' : '设定发布目标'}</h3>
            <form onSubmit={handleReleaseGoalSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">选择研发小组</label>
                <select 
                  value={releaseGoalForm.groupId} 
                  onChange={(e) => setReleaseGoalForm({...releaseGoalForm, groupId: e.target.value})} 
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono pb-2"
                  required
                  disabled={currentUser.department !== 'admin'}
                >
                  <option value="" disabled>--请选择小组--</option>
                  {(currentUser.department === 'admin' ? groups.filter(g => g.category === 'rnd') : groups.filter(g => g.id === currentUser.groupId)).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">主打特性 / 版本名称</label>
                <RichTextEditor 
                  value={releaseGoalForm.title || ''} 
                  onChange={(val) => setReleaseGoalForm({...releaseGoalForm, title: val})} 
                  placeholder="例如：支持XXX功能的v2.1版本。也可以使用列表说明详细特性..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">目标月份</label>
                  <input 
                    type="month" 
                    required
                    value={releaseGoalForm.targetMonth} 
                    onChange={(e) => setReleaseGoalForm({...releaseGoalForm, targetMonth: e.target.value})} 
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">预计上线日期</label>
                  <input 
                    type="date" 
                    required
                    value={releaseGoalForm.targetDate} 
                    onChange={(e) => setReleaseGoalForm({...releaseGoalForm, targetDate: e.target.value})} 
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 pt-2 border-t border-[#1A1A1A]/10 mt-2">发布状态</label>
                <select 
                  value={releaseGoalForm.status} 
                  onChange={(e) => setReleaseGoalForm({...releaseGoalForm, status: e.target.value as 'planned' | 'released' | 'delayed'})} 
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono pb-2"
                >
                  <option value="planned">计划中 (未上线)</option>
                  <option value="released">已发布上线 🎉</option>
                  <option value="delayed">延期</option>
                </select>
              </div>

              {releaseGoalForm.status === 'released' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-[#16a34a]">实际发布版本</label>
                    <input 
                      type="text" 
                      required
                      value={releaseGoalForm.actualVersion || ''} 
                      onChange={(e) => setReleaseGoalForm({...releaseGoalForm, actualVersion: e.target.value})} 
                      placeholder="v2.1.0"
                      className="w-full bg-transparent border-b border-[#16a34a]/30 focus:border-[#16a34a] outline-none py-1 text-sm font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-[#16a34a]">实际上线日期</label>
                    <input 
                      type="date" 
                      required
                      value={releaseGoalForm.actualReleaseDate || ''} 
                      onChange={(e) => setReleaseGoalForm({...releaseGoalForm, actualReleaseDate: e.target.value})} 
                      className="w-full bg-transparent border-b border-[#16a34a]/30 focus:border-[#16a34a] outline-none py-1 text-sm font-mono" 
                    />
                  </div>
                </div>
              )}

              {releaseGoalForm.status === 'delayed' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-[#dc2626]">延期说明/备注</label>
                  <textarea 
                    value={releaseGoalForm.note || ''} 
                    onChange={(e) => setReleaseGoalForm({...releaseGoalForm, note: e.target.value})} 
                    className="w-full bg-white border border-[#dc2626]/30 focus:border-[#dc2626] outline-none p-2 text-sm h-16 resize-none" 
                    placeholder="说明延期原因及新的预期..."
                  />
                </div>
              )}

              <button type="submit" className="w-full bg-[#1A1A1A] text-white py-3 font-bold tracking-widest uppercase text-xs hover:bg-black transition-colors mt-4">
                {editingReleaseGoal ? '保存更改' : '确认设定'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Goal Setting Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => setIsGoalModalOpen(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">录入 {selectedMonth} 经营指标</h3>
            <p className="text-[10px] opacity-60 uppercase tracking-widest mb-4">月初输入目标，月底输入实际</p>
            <form onSubmit={handleGoalSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

              {/* Lead Clients */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">潜在客户挖掘 (家)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.leadClientsTarget} onChange={(e) => setGoalForm({...goalForm, leadClientsTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.leadClientsActual} onChange={(e) => setGoalForm({...goalForm, leadClientsActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

              {/* Active Clients */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">意向客户跟进 (家)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.activeClientsTarget} onChange={(e) => setGoalForm({...goalForm, activeClientsTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.activeClientsActual} onChange={(e) => setGoalForm({...goalForm, activeClientsActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

              {/* Lost Clients */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">客户流失 (家)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初限制目标</span>
                    <input type="number" min="0" value={goalForm.lostClientsTarget} onChange={(e) => setGoalForm({...goalForm, lostClientsTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.lostClientsActual} onChange={(e) => setGoalForm({...goalForm, lostClientsActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

               {/* Contract amount */}
               <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">目标合同签署额 (万)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.contractAmountTarget} onChange={(e) => setGoalForm({...goalForm, contractAmountTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.contractAmountActual} onChange={(e) => setGoalForm({...goalForm, contractAmountActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

              {/* Profit amount */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">目标利润额 (万)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.profitAmountTarget} onChange={(e) => setGoalForm({...goalForm, profitAmountTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.profitAmountActual} onChange={(e) => setGoalForm({...goalForm, profitAmountActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

               {/* Collection amount */}
               <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">渠道保底回款额 (万)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.collectionAmountTarget} onChange={(e) => setGoalForm({...goalForm, collectionAmountTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.collectionAmountActual} onChange={(e) => setGoalForm({...goalForm, collectionAmountActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-colors"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {isEditModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => { setIsEditModalOpen(false); setEditingPlan(null); }}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-2">修改月度目标</h3>
            <p className="text-[10px] opacity-60 uppercase tracking-widest mb-6">每个目标仅允许修改一次</p>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{editingPlan.title} ({editingPlan.metric?.unit})</label>
                <input 
                  type="number" 
                  min="0"
                  value={editForm.targetValue}
                  onChange={(e) => setEditForm({ targetValue: e.target.value })}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingPlan(null); }}
                  className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-colors"
                >
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Actual Progress Modal */}
      {isActualModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => { setIsActualModalOpen(false); setEditingPlan(null); }}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">填报月底完成情况</h3>
            <form onSubmit={handleActualSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">实际完成 ({editingPlan.metric?.unit})</label>
                <div className="mb-2 text-[10px] opacity-60 tracking-widest">
                  目标: {editingPlan.metric?.target} {editingPlan.metric?.unit}
                </div>
                <input 
                  type="number" 
                  min="0"
                  value={actualForm.actualValue}
                  onChange={(e) => setActualForm({ actualValue: e.target.value })}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                  placeholder="请输入月底结算数据"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => { setIsActualModalOpen(false); setEditingPlan(null); }}
                  className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-colors"
                >
                  确认验收
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">规划本周行动项</h3>
            <form onSubmit={handleTaskSubmit} className="space-y-6 max-h-[80vh] flex flex-col">
              <div className="overflow-y-auto pr-2 space-y-6">
                {taskForms.map((form, index) => (
                  <div key={form.id} className="relative border border-[#1A1A1A]/10 p-4 bg-white">
                    {taskForms.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setTaskForms(taskForms.filter(f => f.id !== form.id))}
                        className="absolute top-2 right-2 text-xs text-[#1A1A1A]/50 hover:text-[#dc2626]"
                      >
                        × 删除
                      </button>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">关联项目</label>
                        <input 
                          type="text"
                          value={form.projectName || ''}
                          className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                          placeholder="手动输入关联项目名称"
                          onChange={(e) => {
                            const newForms = [...taskForms];
                            newForms[index] = { ...newForms[index], projectName: e.target.value };
                            setTaskForms(newForms);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">任务名称</label>
                        <input 
                          type="text" 
                          value={form.title}
                          onChange={(e) => {
                            const newForms = [...taskForms];
                            newForms[index] = { ...newForms[index], title: e.target.value };
                            setTaskForms(newForms);
                          }}
                          className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                          placeholder="请输入需要执行的具体事项"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">产出成果 (支持富文本)</label>
                        <div className="border border-[#1A1A1A]/30 focus-within:border-[#1A1A1A] min-h-[100px] bg-white">
                          <RichTextEditor 
                            value={form.outcome || ''}
                            onChange={(val) => {
                              const newForms = [...taskForms];
                              newForms[index] = { ...newForms[index], outcome: val };
                              setTaskForms(newForms);
                            }}
                            placeholder="描述该任务交付的成果物或结果..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">计划开始时间</label>
                          <input 
                            type="date" 
                            value={form.startDate}
                            onChange={(e) => {
                              const newForms = [...taskForms];
                              newForms[index] = { ...newForms[index], startDate: e.target.value };
                              setTaskForms(newForms);
                            }}
                            className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">计划截止日期</label>
                          <input 
                            type="date" 
                            value={form.endDate}
                            onChange={(e) => {
                              const newForms = [...taskForms];
                              newForms[index] = { ...newForms[index], endDate: e.target.value };
                              setTaskForms(newForms);
                            }}
                            className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                            required
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">预计进度 (%)</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={form.plannedProgress}
                            onChange={(e) => {
                              const newForms = [...taskForms];
                              newForms[index] = { ...newForms[index], plannedProgress: e.target.value };
                              setTaskForms(newForms);
                            }}
                            className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono text-center"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#1A1A1A]/10 mt-auto">
                <button 
                  type="button"
                  onClick={() => setTaskForms([...taskForms, { id: generateId(), title: '', plannedProgress: '0', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(currentWeekDate, 'yyyy-MM-dd'), projectName: '', outcome: '' }])}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] px-3 py-2 border border-[#1A1A1A]/30 hover:bg-[#1A1A1A] hover:text-white transition-colors"
                >
                  + 添加任务项
                </button>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-colors"
                  >
                    保存 ({taskForms.length})
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Outcome Modal */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => setIsOutcomeModalOpen(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">提报本周产出成果</h3>
            <form onSubmit={handleOutcomeSubmit} className="space-y-6 max-h-[80vh] flex flex-col">
              <div className="overflow-y-auto pr-2 space-y-6">
                {outcomeForms.map((form, index) => (
                  <div key={form.id} className="relative border border-[#1A1A1A]/10 p-4 bg-white">
                    {outcomeForms.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setOutcomeForms(outcomeForms.filter(f => f.id !== form.id))}
                        className="absolute top-2 right-2 text-xs text-[#1A1A1A]/50 hover:text-[#dc2626]"
                      >
                        × 删除
                      </button>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">成果摘要</label>
                        <input 
                          type="text" 
                          value={form.title}
                          onChange={(e) => {
                            const newForms = [...outcomeForms];
                            newForms[index] = { ...newForms[index], title: e.target.value };
                            setOutcomeForms(newForms);
                          }}
                          className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                          placeholder="例如: 签约某某客户、上线新系统"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">详细说明</label>
                        <RichTextEditor 
                          value={form.description}
                          onChange={(val) => {
                            const newForms = [...outcomeForms];
                            newForms[index] = { ...newForms[index], description: val };
                            setOutcomeForms(newForms);
                          }}
                          placeholder="描述取得的具体成效和相关数据支撑..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">归档日期</label>
                        <input 
                          type="date" 
                          value={form.date}
                          onChange={(e) => {
                            const newForms = [...outcomeForms];
                            newForms[index] = { ...newForms[index], date: e.target.value };
                            setOutcomeForms(newForms);
                          }}
                          className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#1A1A1A]/10 mt-auto">
                <button 
                  type="button"
                  onClick={() => setOutcomeForms([...outcomeForms, { id: generateId(), title: '', description: '', date: format(currentWeekDate, 'yyyy-MM-dd') }])}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] px-3 py-2 border border-[#1A1A1A]/30 hover:bg-[#1A1A1A] hover:text-white transition-colors"
                >
                  + 添加成果项
                </button>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsOutcomeModalOpen(false)}
                    className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-colors"
                  >
                    归档总结 ({outcomeForms.length})
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Requirement Modal */}
      {isRequirementModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="bg-[#F7F6F2] pt-8 p-4 sm:p-8 min-h-[50vh] max-w-md w-full border-t sm:border border-[#1A1A1A] shadow-2xl relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <button 
              onClick={() => {
                setIsRequirementModalOpen(false);
                setEditingRequirementId(null);
                setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
              }}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-2xl font-serif italic mb-6">{editingRequirementId ? '编辑产品需求' : '提交新产品需求'}</h3>
            <form onSubmit={handleRequirementSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">需求标题</label>
                <input 
                  type="text" 
                  value={requirementForm.title}
                  onChange={(e) => setRequirementForm({...requirementForm, title: e.target.value})}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  placeholder="简洁明了的标题更受欢迎"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">链接地址（选填）</label>
                <input 
                  type="url" 
                  value={requirementForm.linkUrl}
                  onChange={(e) => setRequirementForm({...requirementForm, linkUrl: e.target.value})}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  placeholder="相关的参考链接、竞品链接或设计稿链接等"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">优先级</label>
                <div className="flex gap-4">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="priority"
                        checked={requirementForm.priority === p}
                        onChange={() => setRequirementForm({...requirementForm, priority: p})}
                        className="accent-[#1A1A1A]"
                      />
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        {p === 'high' ? 'P0-紧急' : p === 'medium' ? 'P1-正常' : 'P2-低'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">需求来源</label>
                <select 
                  value={requirementForm.source}
                  onChange={(e) => setRequirementForm({...requirementForm, source: e.target.value})}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  required
                >
                  <option value="customer">客户反馈</option>
                  <option value="marketing">市场调研</option>
                  <option value="product">产品规划</option>
                  <option value="tech">技术演进</option>
                  <option value="internal">公司内部需求</option>
                </select>
              </div>
              
              {requirementForm.source === 'customer' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-[#1A1A1A]">客户名称</label>
                  <input 
                    type="text" 
                    value={requirementForm.customerName}
                    onChange={(e) => setRequirementForm({...requirementForm, customerName: e.target.value})}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                    placeholder="请输入客户名称"
                    required
                  />
                </div>
              )}

              {requirementForm.source === 'internal' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-[#1A1A1A]">具体来源说明</label>
                  <input 
                    type="text" 
                    value={requirementForm.internalSourceDetail}
                    onChange={(e) => setRequirementForm({...requirementForm, internalSourceDetail: e.target.value})}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                    placeholder="请输入具体来源说明（如：财务部、高管要求等）"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">负责人</label>
                <select 
                  value={requirementForm.assigneeId}
                  onChange={(e) => setRequirementForm({...requirementForm, assigneeId: e.target.value})}
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                >
                  <option value="">待分配</option>
                  {members.filter(m => m.department !== 'marketing').map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.department === 'rnd' ? '研发' : '管理'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">需求描述</label>
                <RichTextEditor 
                  value={requirementForm.description}
                  onChange={(val) => setRequirementForm({...requirementForm, description: val})}
                  placeholder="详细描述需求场景、痛点及预期效果..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRequirementModalOpen(false);
                    setEditingRequirementId(null);
                    setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                  }}
                  className="text-xs uppercase tracking-widest px-4 py-2 opacity-60 hover:opacity-100"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingRequirement}
                  className={`text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-all flex items-center gap-2 ${isSubmittingRequirement ? 'opacity-50 cursor-not-allowed translate-y-0.5' : 'active:translate-y-0.5'}`}
                >
                  {isSubmittingRequirement ? (
                    <>
                      <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在提交
                    </>
                  ) : (editingRequirementId ? '保存更改' : '确认提交')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requirement Recycle Bin Modal */}
      {isRequirementRecycleBinOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm"
            onClick={() => setIsRequirementRecycleBinOpen(false)}
          />
          <div className="relative bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-3xl h-[100dvh] sm:h-[80vh] max-h-[100dvh] sm:max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-sm">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 pt-8 sm:pt-6 border-b border-[#1A1A1A]/5 bg-black/[0.02]">
              <div className="flex items-center gap-3">
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-40">已删除需求记录</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-black/5 rounded-full opacity-40">
                  {requirements.filter(r => r.deleted).length} 项已删除
                </span>
              </div>
              <button 
                onClick={() => setIsRequirementRecycleBinOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <span className="text-xl font-light">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {requirements.filter(r => r.deleted).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                  <span className="text-4xl mb-4 font-serif italic">Empty</span>
                  <p className="text-[10px] uppercase tracking-widest font-bold">暂无删除记录</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requirements.filter(r => r.deleted).map((req) => (
                    <div key={req.id} className="border border-[#1A1A1A]/10 p-5 bg-white flex justify-between items-center group">
                      <div className="flex-1 pr-8">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest">{req.deletedAt}</span>
                           <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-sm font-bold uppercase ring-1 ring-red-100">已删除</span>
                        </div>
                        <h4 className="text-sm font-bold mb-1 opacity-80">{req.title}</h4>
                        <p className="text-[10px] opacity-40 line-clamp-1 italic font-serif">{(req.description || "").replace(/<[^>]*>/g, " ")}</p>
                      </div>
                      <button 
                        onClick={() => restoreRequirement(req.id)}
                        className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black transition-all shadow-sm active:translate-y-0.5"
                      >
                        一键恢复
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#1A1A1A]/5 bg-gray-50/50">
              <p className="text-[9px] text-center opacity-40 uppercase tracking-widest">恢复后的需求将回到原有的状态阶段</p>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm"
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative bg-white pt-8 sm:pt-6 p-8 max-w-sm w-full border-t-4 border-[#1A1A1A] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              确认退出
            </h3>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              确定要退出当前系统吗？
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmLogout}
                className="px-4 py-2 text-xs uppercase tracking-widest font-bold bg-[#1A1A1A] text-white hover:bg-black transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => { setIsTrackingModalOpen(false); setTrackingError(''); }} />
          <div className="relative bg-white pt-8 sm:pt-6 sm:border border-[#1A1A1A]/10 w-full sm:max-w-lg p-4 sm:p-8 shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm overflow-y-auto custom-scrollbar mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <h3 className="text-2xl font-serif italic mb-6">{editingTrackingId ? '编辑项目' : '新增项目'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'customerName', label: '客户名称', placeholder: '请输入客户名称' },
                { key: 'product', label: '产品名称', placeholder: '请输入产品名称' },
                { key: 'cityManager', label: '市负责人', placeholder: '请输入市负责人' },
                { key: 'projectManager', label: '项目负责人', placeholder: '请输入项目负责人' },
                { key: 'contactName', label: '联系人', placeholder: '请输入联系人' },
                { key: 'contactPhone', label: '联系电话', placeholder: '如：13812345678' },
                { key: 'expectedContractAmount', label: '预期合同额(元)', placeholder: '请输入金额' },
                { key: 'actualContractAmount', label: '已达成合同额(元)', placeholder: '请输入金额' },
                { key: 'lastFollowupDate', label: '最近跟进日期', placeholder: '请选择日期' }
              ].map(field => (
                <div key={field.key} className={field.key === 'lastFollowupDate' ? 'col-span-2' : 'col-span-1'}>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{field.label}</label>
                  <input 
                    type={field.key.includes('Amount') ? 'number' : field.key === 'lastFollowupDate' ? 'date' : 'text'}
                    value={(trackingForm as any)[field.key]} 
                    onChange={(e) => setTrackingForm({...trackingForm, [field.key]: field.key.includes('Amount') ? Number(e.target.value) : e.target.value})} 
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 outline-none py-2 text-sm"
                    placeholder={field.placeholder}
                    required
                  />
                </div>
              ))}
              <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">状态</label>
                  <select value={trackingForm.status} onChange={(e) => setTrackingForm({...trackingForm, status: e.target.value as any})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 outline-none py-2 text-sm">
                      {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
              </div>
            </div>
            {trackingError && (
              <div className="mt-4 text-red-500 text-xs font-bold">{trackingError}</div>
            )}
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => {
                  setIsTrackingModalOpen(false);
                  setTrackingError('');
                }} 
                className="text-xs uppercase px-4 py-2 opacity-60">取消</button>
              <button 
                onClick={() => {
                  /* Basic Validation */
                  if (trackingForm.contactPhone && !/^1\d{10}$/.test(trackingForm.contactPhone)) { 
                    setTrackingError('请输入正确的11位手机号码'); 
                    return; 
                  }
                  if (trackingForm.actualContractAmount < 0 || trackingForm.expectedContractAmount < 0) { 
                    setTrackingError('合同额不能为负数'); 
                    return; 
                  }
                  setTrackingError('');
                  saveTracking({ ...trackingForm, id: editingTrackingId || generateId(), updatedAt: new Date().toISOString() });
                }} 
                className="bg-[#1A1A1A] text-white text-xs uppercase px-6 py-2.5">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Followup Modal */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => setIsFollowupModalOpen(false)} />
          <div className="relative bg-white pt-8 sm:pt-6 sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl p-4 sm:p-8 shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <h3 className="text-2xl font-serif italic mb-6 shrink-0">添加跟进记录</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">跟进日期</label>
                <input 
                  type="date"
                  value={followupForm.date} 
                  onChange={(e) => setFollowupForm({...followupForm, date: e.target.value})} 
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 outline-none py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">详细说明 (支持富文本)</label>
                <div className="border border-[#1A1A1A]/30 focus-within:border-[#1A1A1A] min-h-[250px] bg-white">
                  <RichTextEditor 
                    value={followupForm.content}
                    onChange={(val) => setFollowupForm({...followupForm, content: val})} 
                    placeholder="请输入跟进的详细内容..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 shrink-0 pt-4 border-t border-[#1A1A1A]/10">
              <button 
                onClick={() => setIsFollowupModalOpen(false)} 
                className="text-xs uppercase px-4 py-2 opacity-60">取消</button>
              <button 
                onClick={saveFollowup} 
                disabled={!followupForm.content}
                className="bg-[#1A1A1A] text-white text-xs uppercase px-6 py-2.5 disabled:opacity-50">保存记录</button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Detail Modal */}
      {isTrackingDetailModalOpen && selectedTrackingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => setIsTrackingDetailModalOpen(false)} />
          <div className="relative bg-white pt-8 sm:pt-6 sm:border border-[#1A1A1A]/10 w-full sm:max-w-5xl h-[100dvh] sm:h-full max-h-[100dvh] sm:max-h-[90vh] shadow-xl sm:shadow-2xl flex flex-col animate-in zoom-in-95 sm:zoom-in-100 duration-300 sm:rounded-sm overflow-hidden">
            <div className="px-6 md:px-8 py-6 pt-4 sm:pt-6 border-b border-[#1A1A1A]/10 shrink-0 flex justify-between items-start bg-[#F7F6F2] relative">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-serif italic">{selectedTrackingDetail.customerName}</h3>
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full border text-[11px] font-medium bg-white shadow-sm
                       ${selectedTrackingDetail.status === 'followup' ? 'border-amber-400 text-amber-600' : 
                       selectedTrackingDetail.status === 'implementing' ? 'border-blue-400 text-blue-600' : 
                       selectedTrackingDetail.status === 'accepting' ? 'border-green-400 text-green-600' : 
                       selectedTrackingDetail.status === 'quoted' ? 'border-purple-400 text-purple-600' : 
                       selectedTrackingDetail.status === 'archived' ? 'border-stone-400 text-stone-600' : 
                       'border-gray-300 text-gray-500'}`}
                  >
                    {statusLabels[selectedTrackingDetail.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm font-mono opacity-60">
                   <span>标识ID: {selectedTrackingDetail.id}</span>
                </div>
              </div>
              <button onClick={() => setIsTrackingDetailModalOpen(false)} className="opacity-50 hover:opacity-100 p-2 transition-opacity">
                 ✕ 关 闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-hidden flex flex-col md:flex-row">
              {/* Left Sidebar: Detailed Info */}
              <div className="w-full md:w-[35%] lg:w-[30%] border-b md:border-b-0 md:border-r border-[#1A1A1A]/10 p-6 md:p-8 bg-white space-y-8 shrink-0 md:h-full md:overflow-y-auto custom-scrollbar">
                
                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">客户联系信息</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">联系人</div>
                        <div className="text-sm font-medium">{selectedTrackingDetail.contactName || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">联系电话</div>
                        <div className="text-sm font-mono">{selectedTrackingDetail.contactPhone || '—'}</div>
                      </div>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">项目及团队</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">合作意向 / 产品</div>
                        <div className="text-sm font-medium">{selectedTrackingDetail.product || '—'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">市场负责人</div>
                          <div className="text-sm">{selectedTrackingDetail.cityManager || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] opacity-60 mb-1">项目负责人</div>
                          <div className="text-sm">{selectedTrackingDetail.projectManager || '—'}</div>
                        </div>
                      </div>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">金额核算</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">预期合同额</div>
                        <div className="text-lg font-mono">¥{selectedTrackingDetail.expectedContractAmount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-emerald-600/80 font-bold mb-1">已达成金额</div>
                        <div className="text-2xl font-mono text-emerald-600 font-bold">¥{selectedTrackingDetail.actualContractAmount.toLocaleString()}</div>
                      </div>
                   </div>
                </div>
                
                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">时间线</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">最近跟进</div>
                        <div className="text-sm font-mono">{selectedTrackingDetail.lastFollowupDate || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] opacity-60 mb-1">最后更新于</div>
                        <div className="text-sm font-mono">{new Date(selectedTrackingDetail.updatedAt).toLocaleString()}</div>
                      </div>
                   </div>
                </div>

              </div>

              {/* Right Area: Followup Timeline */}
              <div className="w-full md:w-[65%] lg:w-[70%] p-6 md:p-8 lg:p-10 bg-[#F7F6F2] md:h-full md:overflow-y-auto custom-scrollbar">
                 <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1A1A1A]/10 border-dashed">
                   <div>
                     <h4 className="text-lg font-serif italic">跟进记录明细</h4>
                     <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Timeline & Updates</p>
                   </div>
                   <button 
                     onClick={() => {
                        setEditingTrackingId(selectedTrackingDetail.id);
                        setFollowupForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '' });
                        setIsTrackingDetailModalOpen(false);
                        setIsFollowupModalOpen(true);
                     }}
                     disabled={selectedTrackingDetail.status === 'terminated' || selectedTrackingDetail.status === 'archived'}
                     className={`px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedTrackingDetail.status === 'terminated' || selectedTrackingDetail.status === 'archived' ? 'bg-[#1A1A1A]/10 text-gray-400 cursor-not-allowed' : 'bg-[#1A1A1A] text-white hover:bg-black'}`}
                   >
                     <span>+</span> 补充最新跟进
                   </button>
                 </div>

                 {(!selectedTrackingDetail.followupRecords || selectedTrackingDetail.followupRecords.length === 0) ? (
                   <div className="py-20 flex flex-col items-center justify-center border border-[#1A1A1A]/10 border-dashed bg-white/50 rounded-sm">
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">暂无任何跟进记录</p>
                      <p className="text-[10px] opacity-30 mt-2">点击右侧上方按钮添加第一条记录</p>
                   </div>
                 ) : (
                   <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-px before:bg-[#1A1A1A]/10">
                     {selectedTrackingDetail.followupRecords.map((record, index) => (
                       <div key={record.id} className="relative flex items-start group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#F7F6F2] bg-white shadow-sm shrink-0 z-10">
                            {index === 0 ? (
                               <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                            ) : (
                               <span className="w-2 h-2 bg-[#1A1A1A]/30 rounded-full"></span>
                            )}
                          </div>
                          <div className="ml-6 w-full bg-white p-6 rounded-sm shadow-sm border border-[#1A1A1A]/5 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1A1A1A]/5">
                               <div className="flex items-center gap-3">
                                 <div className="font-mono text-xs font-semibold px-2 py-1 bg-[#F7F6F2] rounded text-[#1A1A1A]/70 border border-[#1A1A1A]/5">
                                   {record.date}
                                 </div>
                                 {index === 0 && <span className="text-[9px] uppercase font-bold tracking-widest text-blue-500">最新</span>}
                               </div>
                            </div>
                            <div className="prose prose-sm prose-black max-w-none opacity-80 leading-relaxed text-[13px]" dangerouslySetInnerHTML={{ __html: record.content }} />
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Tracking Modal */}
      {isTerminateTrackingModalOpen && trackingToTerminate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm"
            onClick={() => { setIsTerminateTrackingModalOpen(false); setTrackingToTerminate(null); }}
          />
          <div className="relative bg-white pt-8 sm:pt-6 p-8 max-w-sm w-full border-t-4 border-red-500 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              确认作废项目
            </h3>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              您即将作废此项目跟踪记录。标为作废后，代表该项目不再继续跟进。<br/><br/>
              <b>此操作不可逆，请确认是否继续。</b>
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => { setIsTerminateTrackingModalOpen(false); setTrackingToTerminate(null); }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#1A1A1A]/20 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmTerminateTracking}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Requirement Modal */}
      {isRejectRequirementModalOpen && reqToReject && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm"
            onClick={() => { setIsRejectRequirementModalOpen(false); setReqToReject(null); setRejectReason(''); }}
          />
          <div className="relative bg-[#F7F6F2] p-8 max-w-sm w-full border border-[#1A1A1A] shadow-2xl">
            <h3 className="text-lg font-serif italic mb-6">请输入驳回原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 bg-transparent border border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none p-3 text-sm mb-6"
              placeholder="请输入驳回该需求的原因..."
              required
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setIsRejectRequirementModalOpen(false); setReqToReject(null); setRejectReason(''); }}
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 hover:opacity-60"
              >
                取消
              </button>
              <button 
                onClick={handleRejectRequirement}
                disabled={!rejectReason.trim()}
                className={`text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 py-2.5 hover:bg-black transition-all ${!rejectReason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement Detail Modal */}
      {isRequirementDetailModalOpen && selectedRequirement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm"
            onClick={() => setIsRequirementDetailModalOpen(false)}
          />
          <div className="relative bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-sm">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 pt-8 sm:pt-5 border-b border-[#1A1A1A]/5 bg-black/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 ${
                  selectedRequirement.priority === 'high' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 
                  selectedRequirement.priority === 'medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-gray-400'
                }`} />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">需求详情单</h3>
              </div>
              <button 
                onClick={() => setIsRequirementDetailModalOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity p-2 -mr-2"
              >
                <span className="text-xl font-light leading-none">×</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:p-8 custom-scrollbar">
              <div className="mb-6 sm:mb-10">
                <div className="flex flex-col gap-2 mb-8">
                  {selectedRequirement.serialNumber && <span className="text-[11px] font-mono text-[#1A1A1A]/40 uppercase tracking-widest">{selectedRequirement.serialNumber}</span>}
                  <h2 className="text-2xl sm:text-3xl font-serif italic leading-tight text-[#1A1A1A]">{selectedRequirement.title}</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 py-6 px-6 bg-[#F7F6F2]/50 border border-[#1A1A1A]/5 rounded-sm">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-40 mb-2">项目状态</span>
                    <span className="text-[11px] font-bold px-2 py-1 bg-[#1A1A1A] text-white shadow-sm inline-block">
                      {
                        selectedRequirement.status === 'backlog' ? '待评审' :
                        selectedRequirement.status === 'reviewing' ? '评审中' :
                        selectedRequirement.status === 'approved' ? '已通过' :
                        selectedRequirement.status === 'rejected' ? '已驳回' :
                        selectedRequirement.status === 'planned' ? '已排期' : '已完成'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-40 mb-2.5">优先级</span>
                    <span className="text-[11px] font-bold text-[#1A1A1A]">
                      {selectedRequirement.priority === 'high' ? 'P0-紧急响应' : 
                       selectedRequirement.priority === 'medium' ? 'P1-核心需求' : 'P2-持续优化'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-40 mb-2.5">来源渠道</span>
                    <span className="text-[11px] font-bold text-[#1A1A1A]">
                      {
                        selectedRequirement.source === 'customer' ? `客户反馈${selectedRequirement.customerName ? ` (${selectedRequirement.customerName})` : ''}` :
                        selectedRequirement.source === 'marketing' ? '市场调研' :
                        selectedRequirement.source === 'product' ? '产品规划' :
                        selectedRequirement.source === 'internal' ? `公司内部需求${selectedRequirement.internalSourceDetail ? ` (${selectedRequirement.internalSourceDetail})` : ''}` : '技术演进'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-40 mb-2.5">创建人</span>
                    <div className="flex items-center gap-1.5">
                      {selectedRequirement.submitterId && members.find(m => m.id === selectedRequirement.submitterId)?.avatar && (
                        <img 
                          src={members.find(m => m.id === selectedRequirement.submitterId)?.avatar} 
                          alt="avatar" 
                          className="w-4 h-4 rounded-full border border-[#1A1A1A]/10 bg-white"
                        />
                      )}
                      <span className="text-[11px] font-bold text-[#1A1A1A]">
                        {members.find(m => m.id === selectedRequirement.submitterId)?.name || 'admin'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-40 mb-2.5">责任人</span>
                    <div className="flex items-center gap-1.5">
                      {selectedRequirement.assigneeId && members.find(m => m.id === selectedRequirement.assigneeId)?.avatar && (
                        <img 
                          src={members.find(m => m.id === selectedRequirement.assigneeId)?.avatar} 
                          alt="avatar" 
                          className="w-4 h-4 rounded-full border border-[#1A1A1A]/10 bg-white"
                        />
                      )}
                      <span className="text-[11px] font-bold text-[#1A1A1A] underline decoration-[#1A1A1A]/20 underline-offset-2">
                        {members.find(m => m.id === selectedRequirement.assigneeId)?.name || '未分配'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex items-center gap-3 mb-5 border-b border-[#1A1A1A]/5 pb-3">
                  <span className="w-1 h-3 bg-[#1A1A1A]"></span>
                  <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-60">详细描述</h3>
                </div>
                {selectedRequirement.linkUrl && (
                  <div className="mb-6 pl-4 border-l border-[#1A1A1A]/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-2">相关链接</span>
                    <a 
                      href={selectedRequirement.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[13px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 w-fit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {selectedRequirement.linkUrl}
                    </a>
                  </div>
                )}
                <div 
                  className="prose prose-sm max-w-none prose-black opacity-80 pl-4 border-l border-[#1A1A1A]/10"
                  dangerouslySetInnerHTML={{ __html: selectedRequirement.description || '<p class="text-xs italic opacity-50">暂无详细描述</p>' }}
                />
              </div>

              {selectedRequirement.history && selectedRequirement.history.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6 border-b border-[#1A1A1A]/5 pb-3">
                    <span className="w-1 h-3 bg-[#1A1A1A]"></span>
                    <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-60">流转轨迹</h3>
                  </div>
                  <div className="space-y-6 pl-4">
                    {selectedRequirement.history.map((entry, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {idx !== selectedRequirement.history!.length - 1 && (
                          <div className="absolute left-[3px] top-5 w-[1px] h-full bg-[#1A1A1A]/10" />
                        )}
                        <div className="w-2 h-2 rounded-full border border-[#1A1A1A] mt-1.5 bg-white relative z-10" />
                        <div className="flex-1 bg-black/[0.02] border border-[#1A1A1A]/10 p-4 rounded-sm">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span className="text-[11px] font-bold text-[#1A1A1A]">
                              阶段流转至：<span className="bg-white border border-[#1A1A1A]/20 px-1.5 py-0.5 ml-1 inline-block shadow-sm">
                              {
                                entry.status === 'backlog' ? '待评审' :
                                entry.status === 'reviewing' ? '评审中' :
                                entry.status === 'approved' ? '已通过' :
                                entry.status === 'rejected' ? '已驳回' :
                                entry.status === 'planned' ? '已排期' : '已完成'
                              }</span>
                            </span>
                            <span className="text-[9px] opacity-40 font-mono tracking-widest">{format(parseISO(entry.timestamp), 'yyyy/MM/dd HH:mm')}</span>
                          </div>
                          {entry.note && (
                            <p className="text-[11px] opacity-60 mt-2 bg-white px-3 py-2 border-l-2 border-[#1A1A1A]/30 italic">{entry.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-8 py-5 border-t border-[#1A1A1A]/10 bg-gray-50 flex justify-end gap-3 sm:gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10">
              {(currentUser?.department === 'admin' || currentUser?.id === selectedRequirement.submitterId) && (
                <button 
                  onClick={() => {
                    deleteRequirement(selectedRequirement.id);
                    setIsRequirementDetailModalOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest bg-white border border-red-200 text-red-600 px-6 sm:px-8 py-2.5 hover:bg-red-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除
                </button>
              )}
              {( (currentUser?.department === 'admin' || currentUser?.id === selectedRequirement.submitterId) && (selectedRequirement.status === 'backlog' || selectedRequirement.status === 'reviewing') ) && (
                <button 
                  onClick={() => {
                    setIsRequirementDetailModalOpen(false);
                    setEditingRequirementId(selectedRequirement.id);
                    setRequirementForm({
                      title: selectedRequirement.title,
                      description: selectedRequirement.description,
                      linkUrl: selectedRequirement.linkUrl || '',
                      priority: selectedRequirement.priority,
                      source: selectedRequirement.source,
                      customerName: selectedRequirement.customerName || '',
                      internalSourceDetail: selectedRequirement.internalSourceDetail || '',
                      assigneeId: selectedRequirement.assigneeId || ''
                    });
                    setIsRequirementModalOpen(true);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] px-6 sm:px-8 py-2.5 hover:bg-[#1A1A1A]/5 transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </button>
              )}
              <button 
                onClick={() => setIsRequirementDetailModalOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-6 sm:px-8 py-2.5 hover:bg-black transition-all shadow-sm"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {isTaskDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm"
            onClick={() => setIsTaskDetailModalOpen(false)}
          />
          <div className="relative bg-white pt-8 sm:pt-6 border border-[#1A1A1A]/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-8 py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 ${selectedTask.status === 'completed' || selectedTask.progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`} />
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-40">行动项详情</h3>
              </div>
              <button 
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <span className="text-xl font-light">×</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-8">
                <h2 className={`text-3xl font-serif italic mb-6 leading-tight ${selectedTask.status === 'completed' || selectedTask.progress === 100 ? 'line-through opacity-70' : ''}`}>{selectedTask.title}</h2>
                
                <div className="flex flex-wrap gap-6 border-y border-[#1A1A1A]/5 py-6">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">状态</span>
                    <span className={`text-[10px] font-bold px-2 py-1 ${selectedTask.status === 'completed' || selectedTask.progress === 100 ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}`}>
                      {selectedTask.status === 'completed' || selectedTask.progress === 100 ? '已验收交付' : `进行中 (${selectedTask.progress}%)`}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">负责人</span>
                    <div className="flex items-center gap-2 mt-1">
                      {members.find(m => m.id === selectedTask.assigneeId)?.avatar && (
                        <img 
                          src={members.find(m => m.id === selectedTask.assigneeId)?.avatar} 
                          alt="avatar" 
                          className="w-5 h-5 rounded-full border border-[#1A1A1A]/10 bg-white"
                        />
                      )}
                      <span className="text-[12px] font-bold">
                        {members.find(m => m.id === selectedTask.assigneeId)?.name || '未知'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">计划时间</span>
                    <span className="text-[12px] font-mono">{selectedTask.startDate || '-'} 至 {selectedTask.endDate}</span>
                  </div>

                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">实际时间</span>
                    <span className="text-[12px] font-mono">{selectedTask.actualStartDate || '-'} 至 {selectedTask.actualEndDate || '-'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">预计进度</span>
                    <span className="text-[12px] font-mono">{selectedTask.plannedProgress !== undefined ? `${selectedTask.plannedProgress}%` : '-'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">所属项目</span>
                    <span className="text-[12px] font-bold">{selectedTask.projectName || '无'}</span>
                  </div>
                </div>

                {selectedTask.outcome && (
                  <div className="mt-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-4 flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#1A1A1A]"></span> 产出成果
                    </h4>
                    <div className="bg-[#1A1A1A]/5 p-6 border border-[#1A1A1A]/10 text-sm font-serif leading-relaxed line-break-anywhere whitespace-pre-wrap [&>p]:m-0" dangerouslySetInnerHTML={{ __html: selectedTask.outcome }} />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 border-t border-[#1A1A1A]/5 flex justify-end">
              <button 
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-8 py-3 hover:bg-black transition-all active:translate-y-0.5 shadow-lg"
              >
                确认并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Detail Modal */}
      {isOutcomeDetailModalOpen && selectedOutcome && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm"
            onClick={() => setIsOutcomeDetailModalOpen(false)}
          />
          <div className="relative bg-white pt-8 sm:pt-6 border border-[#1A1A1A]/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-8 py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#1A1A1A]" />
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-40">产出成果详情</h3>
              </div>
              <button 
                onClick={() => setIsOutcomeDetailModalOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <span className="text-xl font-light">×</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-8">
                <h2 className="text-3xl font-serif italic mb-6 leading-tight">{selectedOutcome.title}</h2>
                
                <div className="flex flex-wrap gap-6 border-y border-[#1A1A1A]/5 py-6 mb-8">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">提交人</span>
                    <div className="flex items-center gap-2 mt-1">
                      {members.find(m => m.id === selectedOutcome.submitterId)?.avatar && (
                        <img 
                          src={members.find(m => m.id === selectedOutcome.submitterId)?.avatar} 
                          alt="avatar" 
                          className="w-5 h-5 rounded-full border border-[#1A1A1A]/10 bg-white"
                        />
                      )}
                      <span className="text-[12px] font-bold">
                        {members.find(m => m.id === selectedOutcome.submitterId)?.name || '未知'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">提交日期</span>
                    <span className="text-[12px] font-mono">{selectedOutcome.date}</span>
                  </div>
                  
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest font-bold opacity-30 mb-2">所属项目</span>
                    <span className="text-[12px] font-bold">{projects.find(p => p.id === selectedOutcome.projectId)?.title || '无'}</span>
                  </div>
                </div>

                {selectedOutcome.description && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">成果描述</h4>
                    <div 
                      className="prose prose-sm prose-black max-w-none text-sm opacity-80 leading-relaxed font-serif bg-black/5 p-6 border-l-2 border-[#1A1A1A]/20"
                      dangerouslySetInnerHTML={{ __html: selectedOutcome.description }}
                    />
                  </div>
                )}
                
                {selectedOutcome.fileUrl && (
                  <div className="mt-8">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">附件资料</h4>
                    <a href={selectedOutcome.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#1A1A1A] hover:underline underline-offset-4">
                      <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      查看附件资料
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 border-t border-[#1A1A1A]/5 flex justify-end">
              <button 
                onClick={() => setIsOutcomeDetailModalOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-8 py-3 hover:bg-black transition-all active:translate-y-0.5 shadow-lg"
              >
                确认并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Detail Modal */}
      {isGoalDetailModalOpen && selectedGoalDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm"
            onClick={() => setIsGoalDetailModalOpen(false)}
          />
          <div className="relative bg-white pt-8 sm:pt-6 border border-[#1A1A1A]/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-8 py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#1A1A1A]" />
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-40">目标详情</h3>
              </div>
              <button 
                onClick={() => setIsGoalDetailModalOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <span className="text-xl font-light">×</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="mb-4">
                <h2 className="text-2xl font-serif italic mb-6 leading-tight">{selectedGoalDetail.title}</h2>
                <div 
                  className="prose prose-sm max-w-none prose-black opacity-80 text-base leading-relaxed font-serif"
                  dangerouslySetInnerHTML={{ __html: selectedGoalDetail.content }}
                />
              </div>
            </div>
            
            <div className="p-8 border-t border-[#1A1A1A]/5 flex justify-end">
              <button 
                onClick={() => setIsGoalDetailModalOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-8 py-3 hover:bg-black transition-all active:translate-y-0.5 shadow-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          annualTargetProfit={annualTargetProfit}
          setAnnualTargetProfit={setAnnualTargetProfit}
          groups={groups}
          setGroups={setGroups}
          members={members}
          setMembers={setMembers}
          guideContent={guideContent}
          setGuideContent={setGuideContent}
          authorizedCompanies={authorizedCompanies}
          setAuthorizedCompanies={setAuthorizedCompanies}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
        />
      )}
      {isGuideModalOpen && (
        <GuideModal onClose={() => setIsGuideModalOpen(false)} content={guideContent} />
      )}
    </div>
  );
}

