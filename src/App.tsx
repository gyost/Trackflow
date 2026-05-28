import { getOrganizationId } from './lib/orgService';
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
import { HelpCircle, LayoutDashboard, Target, TrendingUp, Code2, ClipboardList, User, Settings, LogOut, Search, Plus, Download, Upload, FileSpreadsheet, Filter, Coins, FileText, Wallet, Users, UserX, CheckCircle2, AlertTriangle, X, Info, XCircle, Trello, Activity, RotateCcw } from 'lucide-react';
import { mockProjects, mockPlans as initialPlans, mockTasks as initialTasks, mockOutcomes as initialOutcomes, mockMembers, mockGroups, mockRequirements as initialRequirements } from './mockData';
import { Plan, Task, Outcome, Group, Member, Project, Status, Priority, Requirement, RequirementStatus, RequirementHistory, ReleaseGoal, ProjectTracking, TrackingStatus, FollowupRecord, RolePermission } from './types';
import { generateId } from './lib/utils';
import SettingsModal from './components/SettingsModal';
import RichTextEditor from './components/RichTextEditor';
import Login from './components/Login';
import AccountSetupModal from './components/AccountSetupModal';
import { apiService, CentralError } from './services/apiService';
import { seedSupabase, forceSeedTable } from './services/seedService';

import GuideModal from './components/GuideModal';
import ProfileModal from './components/ProfileModal';
import Logo from './components/Logo';
import TrackFlowIntro from './components/TrackFlowIntro';
import { Compass } from 'lucide-react';

function pruneDuplicates<T extends { id: any }>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || item.id === undefined || item.id === null) return true;
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const TaskProgressInput = React.memo(({ task, onUpdate, disabled = false }: { task: Task, onUpdate: (val: number) => void, disabled?: boolean }) => {
  const [localVal, setLocalVal] = useState(task.progress.toString());
  
  useEffect(() => {
    if (task.progress.toString() !== localVal && localVal !== '') {
      setLocalVal(task.progress.toString());
    }
  }, [task.progress]);

  return (
    <div 
      className={`flex items-center gap-0.5 shrink-0 bg-[#EBE9E4] px-1 py-0.5 border border-[#1A1A1A]/10 ${disabled ? 'opacity-80 cursor-not-allowed select-none' : ''}`}
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
        disabled={disabled}
        onFocus={(e) => !disabled && e.target.select()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (disabled) return;
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
          if (disabled) return;
          if (localVal === '') {
            setLocalVal('0');
            onUpdate(0);
          }
        }}
        className={`w-7 text-[10px] font-mono opacity-80 bg-transparent outline-none border-b border-transparent ${disabled ? '' : 'hover:border-[#1A1A1A]/30 focus:border-[#1A1A1A]/50'} text-right hide-number-arrows`}
      />
      <span className="text-[10px] font-mono opacity-80">%</span>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.task.progress === nextProps.task.progress &&
    prevProps.task.id === nextProps.task.id
  );
});

interface TaskItemProps {
  task: Task;
  assigneeId: string;
  currentUser: Member;
  setSelectedTask: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TaskItemCard = React.memo(({ 
  task, 
  assigneeId, 
  currentUser, 
  setSelectedTask, 
  setIsTaskDetailModalOpen, 
  setTasks 
}: TaskItemProps) => {
  const isSelf = currentUser.id === assigneeId;
  const isCompleted = task.status === 'completed' || task.progress === 100;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSelf) return;
    const checked = e.target.checked;
    const updatedTask: Task = { 
      ...task, 
      progress: checked ? 100 : (task.progress === 100 ? 0 : task.progress),
      status: (checked ? 'completed' : 'in_progress') as Status
    };
    if (checked && !task.actualEndDate) updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
    apiService.saveTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
  };

  const handleProgressUpdate = (val: number) => {
    const updatedTask: Task = {
      ...task,
      progress: val,
      status: (val === 100 ? 'completed' : (val > 0 ? 'in_progress' : 'not_started')) as Status
    };
    if (val > 0 && !task.actualStartDate) updatedTask.actualStartDate = new Date().toISOString().split('T')[0];
    if (val === 100 && !task.actualEndDate) updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
    apiService.saveTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
  };

  return (
    <div className={`border-l-2 ${isCompleted ? 'border-[#1A1A1A]/30 opacity-60 bg-[#1A1A1A]/5' : 'border-[#1A1A1A] bg-white/70'} p-3 hover:bg-[#1A1A1A]/10 transition-colors flex items-start gap-3`}>
      <div className="pt-0.5">
        <input 
          type="checkbox" 
          checked={isCompleted}
          disabled={!isSelf}
          onChange={handleCheckboxChange}
          className="h-3.5 w-3.5 accent-[#1A1A1A] cursor-pointer disabled:cursor-not-allowed mt-1" 
          title={isCompleted ? "标记为未完成" : "标记为完成"}
        />
      </div>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => { setSelectedTask(task); setIsTaskDetailModalOpen(true); }}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <p className={`text-sm font-bold leading-snug ${isCompleted ? 'line-through' : ''}`}>
            {task.title}
            {task.projectName && <span className="ml-2 text-[10px] bg-[#1A1A1A]/10 px-1.5 py-0.5 text-[#1A1A1A]/80 border border-[#1A1A1A]/20 font-normal tracking-wide inline-block">{task.projectName}</span>}
          </p>
          
          <TaskProgressInput 
            task={task} 
            disabled={!isSelf} 
            onUpdate={handleProgressUpdate} 
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
  );
}, (prevProps, nextProps) => {
  if (prevProps.assigneeId !== nextProps.assigneeId) return false;
  if (prevProps.currentUser.id !== nextProps.currentUser.id) return false;
  if (prevProps.setSelectedTask !== nextProps.setSelectedTask) return false;
  if (prevProps.setIsTaskDetailModalOpen !== nextProps.setIsTaskDetailModalOpen) return false;
  if (prevProps.setTasks !== nextProps.setTasks) return false;
  
  const tPrev = prevProps.task;
  const tNext = nextProps.task;
  return (
    tPrev.id === tNext.id &&
    tPrev.title === tNext.title &&
    tPrev.progress === tNext.progress &&
    tPrev.status === tNext.status &&
    tPrev.projectName === tNext.projectName &&
    tPrev.outcome === tNext.outcome &&
    tPrev.startDate === tNext.startDate &&
    tPrev.endDate === tNext.endDate &&
    tPrev.plannedProgress === tNext.plannedProgress
  );
});
TaskItemCard.displayName = 'TaskItemCard';

interface MemberTaskCardProps {
  assigneeId: string;
  assignee: Member | undefined;
  memberTasks: Task[];
  department: 'marketing' | 'rnd';
  currentUser: Member;
  openTaskModal: (memberId: string, dept: 'marketing' | 'rnd') => void;
  setSelectedTask: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const MemberTaskCard = React.memo(({
  assigneeId,
  assignee,
  memberTasks,
  department,
  currentUser,
  openTaskModal,
  setSelectedTask,
  setIsTaskDetailModalOpen,
  setTasks
}: MemberTaskCardProps) => {
  const isSelf = currentUser.id === assigneeId;
  const prunedTasks = React.useMemo(() => pruneDuplicates(memberTasks), [memberTasks]);

  return (
    <div className="bg-[#EBE9E4]/30 border border-[#1A1A1A]/10 p-5 sm:p-6 transition-colors hover:bg-[#EBE9E4]/60">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar (Avatar, Name, Stats) */}
        <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:w-48 shrink-0">
          <img src={assignee?.avatar} alt={assignee?.name} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border border-[#1A1A1A]/20 shrink-0 object-cover bg-white" referrerPolicy="no-referrer" />
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
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#1A1A1A]"></span> 
              任务与成果项 (Tasks & Outcomes)
            </span>
            {isSelf && (
              <button 
                onClick={() => openTaskModal(assigneeId, department)} 
                className="text-[9px] hover:text-[#1A1A1A] hover:font-bold opacity-70 hover:opacity-100 transition-colors border border-transparent hover:border-[#1A1A1A] px-1"
              >
                + 添加
              </button>
            )}
          </h5>
          <div className="space-y-4 lg:grid lg:grid-cols-1 xl:grid-cols-2 lg:space-y-0 lg:gap-6">
            {prunedTasks.length === 0 ? (
              <p className="text-sm opacity-50 italic py-2 col-span-2">暂无进行中的任务</p>
            ) : (
              prunedTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  assigneeId={assigneeId}
                  currentUser={currentUser}
                  setSelectedTask={setSelectedTask}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setTasks={setTasks}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.assigneeId !== nextProps.assigneeId) return false;
  if (prevProps.department !== nextProps.department) return false;
  if (prevProps.currentUser.id !== nextProps.currentUser.id) return false;
  if (prevProps.openTaskModal !== nextProps.openTaskModal) return false;
  if (prevProps.setSelectedTask !== nextProps.setSelectedTask) return false;
  if (prevProps.setIsTaskDetailModalOpen !== nextProps.setIsTaskDetailModalOpen) return false;
  if (prevProps.setTasks !== nextProps.setTasks) return false;
  
  if (prevProps.assignee?.id !== nextProps.assignee?.id) return false;
  if (prevProps.assignee?.name !== nextProps.assignee?.name) return false;
  if (prevProps.assignee?.avatar !== nextProps.assignee?.avatar) return false;
  
  const prevTasks = prevProps.memberTasks;
  const nextTasks = nextProps.memberTasks;
  if (prevTasks.length !== nextTasks.length) return false;
  for (let i = 0; i < prevTasks.length; i++) {
    const tPrev = prevTasks[i];
    const tNext = nextTasks[i];
    if (tPrev.id !== tNext.id) return false;
    if (tPrev.progress !== tNext.progress) return false;
    if (tPrev.status !== tNext.status) return false;
    if (tPrev.title !== tNext.title) return false;
    if (tPrev.outcome !== tNext.outcome) return false;
    if (tPrev.endDate !== tNext.endDate) return false;
    if (tPrev.startDate !== tNext.startDate) return false;
    if (tPrev.projectName !== tNext.projectName) return false;
    if (tPrev.plannedProgress !== tNext.plannedProgress) return false;
  }
  return true;
});
MemberTaskCard.displayName = 'MemberTaskCard';

interface TaskDepartmentGroupsProps {
  tasks: Task[];
  department: 'marketing' | 'rnd';
  groups: Group[];
  isSystemAdmin: boolean;
  currentUser: Member;
  members: Member[];
  selectedTaskGroupIds: Record<string, string>;
  setSelectedTaskGroupIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  outcomes: Outcome[];
  projects: Project[];
  openTaskModal: (memberId: string, dept: 'marketing' | 'rnd') => void;
  setSelectedTask: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TaskDepartmentGroups = React.memo(({
  tasks,
  department,
  groups,
  isSystemAdmin,
  currentUser,
  members,
  selectedTaskGroupIds,
  setSelectedTaskGroupIds,
  outcomes,
  projects,
  openTaskModal,
  setSelectedTask,
  setIsTaskDetailModalOpen,
  setTasks
}: TaskDepartmentGroupsProps) => {
  // 1. Get all groups that belong to this department
  const departmentGroups = React.useMemo(() => {
    return groups.filter(g => g.category === department)
      .filter(g => isSystemAdmin || g.id === currentUser.groupId);
  }, [groups, department, isSystemAdmin, currentUser.groupId]);

  // 2. Find any tasks belonging to this department that have unassigned/unknown group
  const taskGroupIds = React.useMemo(() => {
    return new Set(tasks.map(t => {
      const member = members.find(m => m.id === t.assigneeId);
      return member?.groupId || 'unassigned';
    }));
  }, [tasks, members]);

  // Combined department groups and unassigned/unknown groups from tasks
  const allGroupIds = React.useMemo(() => {
    let ids = Array.from(new Set([
      ...departmentGroups.map(g => g.id),
      ...Array.from(taskGroupIds).filter(id => id === 'unassigned' || !groups.find(g => g.id === id && g.category !== department))
    ]));
    if (!isSystemAdmin) {
      ids = ids.filter(id => id === currentUser.groupId);
    }
    return ids;
  }, [departmentGroups, taskGroupIds, groups, department, isSystemAdmin, currentUser.groupId]);

  const selectedGroupId = selectedTaskGroupIds[department] || allGroupIds[0];
  const groupId = allGroupIds.includes(selectedGroupId) ? selectedGroupId : allGroupIds[0];

  const groupTasks = React.useMemo(() => {
    if (!groupId) return [];
    return tasks.filter(t => {
      const member = members.find(m => m.id === t.assigneeId);
      return (member?.groupId || 'unassigned') === groupId;
    });
  }, [tasks, members, groupId]);

  const groupMembers = React.useMemo(() => {
    if (!groupId) return [];
    const groupMembersList = members.filter(m => (m.groupId || 'unassigned') === groupId && m.department === department);
    const taskMembersIds = groupTasks.map(t => t.assigneeId);
    let ids = Array.from(new Set([...groupMembersList.map(m => m.id), ...taskMembersIds]));

    const canViewAllInGroup = isSystemAdmin || (currentUser.roles.includes('组长') && currentUser.groupId === groupId);
    if (!canViewAllInGroup) {
      ids = ids.filter(id => id === currentUser.id);
    }

    // Sort: leader pinned to the top, other members sorted chronologically by submission time (earliest outcomes or tasks)
    ids.sort((idA, idB) => {
      const memberA = members.find(m => m.id === idA);
      const memberB = members.find(m => m.id === idB);
      
      const isLeaderA = memberA?.roles?.includes('组长') ? 1 : 0;
      const isLeaderB = memberB?.roles?.includes('组长') ? 1 : 0;

      if (isLeaderA !== isLeaderB) {
        return isLeaderB - isLeaderA; // 组长(1)排非组长(0)前面
      }

      // Helper to calculate earliest submission time (outcome.date or task.startDate or task.endDate)
      const getEarliestSubmissionTime = (mId: string) => {
        const mOutcomes = outcomes.filter(o => o.submitterId === mId);
        const mTasks = groupTasks.filter(t => t.assigneeId === mId);
        
        let earliestTime = Infinity;

        mOutcomes.forEach(o => {
          if (o.date) {
            const oTime = new Date(o.date).getTime();
            if (!isNaN(oTime) && oTime < earliestTime) {
              earliestTime = oTime;
            }
          }
        });

        mTasks.forEach(t => {
          if (t.startDate) {
            const tTime = new Date(t.startDate).getTime();
            if (!isNaN(tTime) && tTime < earliestTime) {
              earliestTime = tTime;
            }
          } else if (t.endDate) {
            const tTime = new Date(t.endDate).getTime();
            if (!isNaN(tTime) && tTime < earliestTime) {
              earliestTime = tTime;
            }
          }
        });

        return earliestTime;
      };

      const timeA = getEarliestSubmissionTime(idA);
      const timeB = getEarliestSubmissionTime(idB);

      if (timeA !== timeB) {
        return timeA - timeB; // ascending order
      }

      // Fallback to name alphabetical
      return (memberA?.name || '').localeCompare(memberB?.name || '', 'zh');
    });

    return ids;
  }, [members, groupId, department, groupTasks, isSystemAdmin, currentUser.roles, currentUser.groupId, currentUser.id, outcomes]);

  if (allGroupIds.length === 0) {
    return <p className="text-sm opacity-50 italic px-2">暂无进行中的任务或无权限查看</p>;
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
                type="button"
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
              // Filter assignee tasks precisely inside groupTasks
              const memberTasks = groupTasks.filter(t => t.assigneeId === assigneeId)
                .sort((a, b) => {
                  const timeA = new Date(a.startDate || a.endDate).getTime();
                  const timeB = new Date(b.startDate || b.endDate).getTime();
                  return timeA - timeB;
                });

              return (
                <MemberTaskCard
                  key={assigneeId}
                  assigneeId={assigneeId}
                  assignee={assignee}
                  memberTasks={memberTasks}
                  department={department}
                  currentUser={currentUser}
                  openTaskModal={openTaskModal}
                  setSelectedTask={setSelectedTask}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setTasks={setTasks}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
TaskDepartmentGroups.displayName = 'TaskDepartmentGroups';

const ProjectTrackingView = ({ 
  trackings, onDelete, onEdit, onAdd, 
  filterStatus, setFilterStatus, searchTerm, setSearchTerm,
  statusColors, statusLabels,
  year, month, setYear, setMonth,
  onAddFollowup, onViewDetails, onStatusChange, annualTargetProfit,
  onImport, onRestore, onDeletePermanently
}: { 
  trackings: ProjectTracking[], onDelete: (id: string) => void, onEdit: (t: ProjectTracking) => void, onAdd: () => void,
  filterStatus: 'all' | TrackingStatus, setFilterStatus: (s: 'all' | TrackingStatus) => void,
  searchTerm: string, setSearchTerm: (t: string) => void,
  statusColors: Record<TrackingStatus, string>, statusLabels: Record<TrackingStatus, string>,
  year: number, month: number, setYear: (y: number) => void, setMonth: (m: number) => void,
  onAddFollowup: (t: ProjectTracking) => void, onViewDetails: (t: ProjectTracking) => void,
  onStatusChange: (id: string, status: TrackingStatus) => void,
  annualTargetProfit: number,
  onImport?: (importedTrackings: Omit<ProjectTracking, 'id' | 'updatedAt'>[]) => void,
  onRestore?: (id: string) => void,
  onDeletePermanently?: (id: string) => void
}) => {
  const monthTrackings = trackings.filter(t => {
    const cdt = t.createdAt || t.updatedAt;
    if (!cdt) return false;
    const cDate = new Date(cdt);
    if (isNaN(cDate.getTime())) return false;
    const cYear = cDate.getFullYear();
    const cMonth = cDate.getMonth() + 1;

    // 检查签约日期是否在选定月份/年份中
    let isSignedInSelectedMonth = false;
    if (t.signedDate) {
      const sDate = new Date(t.signedDate);
      if (!isNaN(sDate.getTime())) {
        const sYear = sDate.getFullYear();
        const sMonth = sDate.getMonth() + 1;
        if (month === 0) {
          isSignedInSelectedMonth = sYear === year;
        } else {
          isSignedInSelectedMonth = sYear === year && sMonth === month;
        }
      }
    }

    // 检查是否有选定月份/年份中的跟进记录
    let hasFollowupInSelectedMonth = false;
    if (t.followupRecords && Array.isArray(t.followupRecords)) {
      hasFollowupInSelectedMonth = t.followupRecords.some(fr => {
        if (!fr.date) return false;
        const frDate = new Date(fr.date);
        if (isNaN(frDate.getTime())) return false;
        const frYear = frDate.getFullYear();
        const frMonth = frDate.getMonth() + 1;
        if (month === 0) {
          return frYear === year;
        } else {
          return frYear === year && frMonth === month;
        }
      });
    }

    if (month === 0) {
      // 全年筛选：创建时间、签约时间或跟进时间在该年份之内的项目
      return cYear === year || isSignedInSelectedMonth || hasFollowupInSelectedMonth;
    } else {
      // 按月筛选：创建时间、签约时间或跟进时间在该月份之内的项目
      return (cYear === year && cMonth === month) || isSignedInSelectedMonth || hasFollowupInSelectedMonth;
    }
  });

  let filtered = pruneDuplicates(monthTrackings.filter(t => {
    return (filterStatus === 'all' || t.status === filterStatus) && 
           (t.customerName.includes(searchTerm) || 
            t.product.includes(searchTerm) || 
            (t.cityManager && t.cityManager.includes(searchTerm)) || 
            (t.projectManager && t.projectManager.includes(searchTerm)));
  }));

  filtered = filtered.sort((a, b) => {
    const da = a.createdAt || a.updatedAt || '';
    const db = b.createdAt || b.updatedAt || '';
    return db.localeCompare(da);
  });
  
  const totalAmount = monthTrackings.reduce((acc, curr) => acc + curr.actualContractAmount, 0);
  const totalExpectedAmount = monthTrackings.reduce((acc, curr) => acc + curr.expectedContractAmount, 0);
  const conversionRate = totalExpectedAmount > 0 ? (totalAmount / totalExpectedAmount) * 100 : 0;
  const statusCounts = (Object.keys(statusLabels) as TrackingStatus[]).map(s => ({
      status: s,
      count: monthTrackings.filter(t => t.status === s).length
  }));

  const [loadingAction, setLoadingAction] = React.useState<{id: string, type: string} | null>(null);
  const [importStatus, setImportStatus] = React.useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const yearsList = React.useMemo(() => Array.from({ length: 17 }, (_, i) => 2020 + i), []); // 2020 to 2036
  const yearScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (yearScrollRef.current) {
        const activeIndex = yearsList.indexOf(year);
        if (activeIndex !== -1) {
          const targetScrollTop = activeIndex * 32;
          if (Math.abs(yearScrollRef.current.scrollTop - targetScrollTop) > 2) {
            yearScrollRef.current.scrollTop = targetScrollTop;
          }
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [year, yearsList]);

  const handleYearScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / 32);
    if (index >= 0 && index < yearsList.length) {
      const selectedYearVal = yearsList[index];
      if (selectedYearVal !== year) {
        setYear(selectedYearVal);
      }
    }
  };

  const [localConfirm, setLocalConfirm] = React.useState<{
    title: string;
    message: string;
    type: 'restore' | 'delete_permanently';
    id: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const handleRestoreClick = (t: ProjectTracking) => {
    setLocalConfirm({
      title: '确认恢复项目',
      message: `确定要将已作废项目【${t.customerName}】重新恢复至跟进中状态吗？`,
      type: 'restore',
      id: t.id,
      onConfirm: async () => {
        setLoadingAction({ id: t.id, type: 'restore' });
        // Simulate minor visual buffer for smooth transitional response
        await new Promise(resolve => setTimeout(resolve, 400));
        if (onRestore) {
          try {
            await onRestore(t.id);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(15);
            }
          } catch (e) {
            console.error(e);
          }
        }
        setLoadingAction(null);
        setLocalConfirm(null);
      }
    });
  };

  const handleDeletePermanentlyClick = (t: ProjectTracking) => {
    setLocalConfirm({
      title: '确认永久删除项目',
      message: `确定要永久删除已作废项目【${t.customerName}】吗？删除后该项目所有的档案和历史跟进动态将被物理删除，操作不可撤销，请谨慎操作！`,
      type: 'delete_permanently',
      id: t.id,
      onConfirm: async () => {
        setLoadingAction({ id: t.id, type: 'delete_permanently' });
        await new Promise(resolve => setTimeout(resolve, 400));
        if (onDeletePermanently) {
          try {
            await onDeletePermanently(t.id);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([20, 40, 20]);
            }
          } catch (e) {
            console.error(e);
          }
        }
        setLoadingAction(null);
        setLocalConfirm(null);
      }
    });
  };

  const handleAction = async (id: string, type: string, actionFn: () => void) => {
    setLoadingAction({ id, type });
    // Simulate a small network delay for obvious loading feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    actionFn();
    setLoadingAction(null);
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentField = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
        if (row.length > 0 && row.some(x => x !== '')) {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        currentField += char;
      }
    }
    if (currentField || row.length > 0) {
      row.push(currentField.trim());
      if (row.some(x => x !== '')) {
        lines.push(row);
      }
    }
    return lines;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        const lines = parseCSV(text);
        if (lines.length < 2) {
          setImportStatus({ type: 'error', message: 'CSV 文件数据行为空或格式不正确' });
          setTimeout(() => setImportStatus(null), 4000);
          return;
        }

        const headers = lines[0].map(h => h.trim().replace(/^\uFEFF/, '')); // 去除 BOM 头
        
        // 建立表头映射
        const colMap: Record<string, number> = {};
        headers.forEach((h, idx) => {
          colMap[h] = idx;
        });

        // 必须字段校验：客户名称
        if (colMap['客户名称'] === undefined) {
          setImportStatus({ type: 'error', message: 'CSV 文件缺少必填卡栏：“客户名称”' });
          setTimeout(() => setImportStatus(null), 4000);
          return;
        }

        const importedList: Omit<ProjectTracking, 'id' | 'updatedAt'>[] = [];

        // 从第二行开始解析
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const getVal = (headerName: string) => {
            const idx = colMap[headerName];
            return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
          };

          const customerName = getVal('客户名称');
          if (!customerName) continue; // 客户名称为空跳过

          const statusStr = getVal('状态');
          // 中文状态映射到 TrackingStatus
          let status: TrackingStatus = 'followup';
          if (statusStr.includes('实施') || statusStr.toLowerCase().includes('implement')) {
            status = 'implementing';
          } else if (statusStr.includes('验收') || statusStr.toLowerCase().includes('accept')) {
            status = 'accepting';
          } else if (statusStr.includes('报价') || statusStr.toLowerCase().includes('quote')) {
            status = 'quoted';
          } else if (statusStr.includes('作废') || statusStr.toLowerCase().includes('terminate')) {
            status = 'terminated';
          } else if (statusStr.includes('归档') || statusStr.toLowerCase().includes('archive')) {
            status = 'archived';
          }

          const product = getVal('合作意向/产品') || getVal('产品') || '';
          const cityManager = getVal('市场负责人') || getVal('业务负责人') || '';
          const projectManager = getVal('项目负责人') || '';
          
          // 金额转化：万 -> 元
          const expectedAmtVal = parseFloat(getVal('预期(万)') || getVal('预期金额(万)') || getVal('预期金额') || '0');
          const expectedContractAmount = isNaN(expectedAmtVal) ? 0 : expectedAmtVal * 10000;

          const actualAmtVal = parseFloat(getVal('已达成(万)') || getVal('实际金额(万)') || getVal('已达成') || '0');
          const actualContractAmount = isNaN(actualAmtVal) ? 0 : actualAmtVal * 10000;

          const contactName = getVal('联系人') || getVal('客户联系人') || '';
          const contactPhone = getVal('联系电话') || getVal('联系方式') || '';

          importedList.push({
            customerName,
            status,
            product,
            cityManager,
            projectManager,
            expectedContractAmount,
            actualContractAmount,
            contactName,
            contactPhone,
            followupRecords: []
          });
        }

        if (importedList.length === 0) {
          setImportStatus({ type: 'error', message: '未找到有效的项目跟踪数据（请检查是否填写了“客户名称”）' });
          setTimeout(() => setImportStatus(null), 4000);
        } else if (onImport) {
          onImport(importedList);
          setImportStatus({ type: 'success', message: `成功解析并导入 ${importedList.length} 条项目跟踪记录！` });
          setTimeout(() => setImportStatus(null), 4000);
        }
      } catch (err: any) {
        setImportStatus({ type: 'error', message: '读取 CSV 失败: ' + err.message });
        setTimeout(() => setImportStatus(null), 4000);
      } finally {
        if (e.target) {
          e.target.value = ''; // 重置文件 input
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#F7F6F2] text-[#1A1A1A] overflow-hidden">
      {/* Sleek Header & Metric Row (Unified & Compact) */}
      <div className="bg-[#F7F6F2] border-b border-[#1A1A1A]/10 px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full md:w-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-gradient-to-tr from-[#1A1A1A] to-[#404040] rounded-full shadow-[0_0_8px_rgba(0,0,0,0.25)]"></span>
              <h2 className="text-xl sm:text-2xl font-serif italic font-bold tracking-tight text-[#1A1A1A]">项目跟踪</h2>
            </div>
            <p className="text-[9px] opacity-40 uppercase tracking-widest font-mono mt-0.5">Pipeline sales & conversion tracker</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* 年份选择 (Sleek Vertical Scroll Snap Picker) */}
            <div className="relative flex items-center bg-white border border-black/[0.06] rounded-xl shadow-sm h-9 px-1 shrink-0 select-none hover:border-black/[0.12] transition-colors">
              <button
                onClick={() => {
                  const prevYear = Math.max(2020, year - 1);
                  setYear(prevYear);
                }}
                className="w-5 h-8 flex items-center justify-center text-[#1A1A1A]/35 hover:text-[#1A1A1A]/90 transition-colors focus:outline-none cursor-pointer active:scale-90"
                title="上一年"
              >
                <span className="text-[9px] font-bold">▲</span>
              </button>
              
              <div 
                ref={yearScrollRef}
                onScroll={handleYearScroll}
                className="h-8 w-[48px] overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col scroll-smooth relative"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {yearsList.map(y => {
                  const isSelected = year === y;
                  return (
                    <div
                      key={y}
                      onClick={() => setYear(y)}
                      className={`h-8 flex items-center justify-center snap-center shrink-0 text-[10.5px] font-bold tracking-tight cursor-pointer transition-all duration-150 ${
                        isSelected 
                          ? 'text-[#1A1A1A] font-extrabold bg-[#1A1A1A]/8 rounded-lg px-1.5' 
                          : 'text-[#1A1A1A]/35 hover:text-[#1A1A1A]/60'
                      }`}
                    >
                      {y}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const nextYear = Math.min(2036, year + 1);
                  setYear(nextYear);
                }}
                className="w-5 h-8 flex items-center justify-center text-[#1A1A1A]/35 hover:text-[#1A1A1A]/90 transition-colors focus:outline-none cursor-pointer active:scale-90"
                title="下一年"
              >
                <span className="text-[9px] font-bold">▼</span>
              </button>
            </div>
            
            {/* 月份选择 (Elegant Flat Scroll List with Smooth Interaction) */}
            <div className="flex items-center bg-white border border-black/[0.06] rounded-xl p-0.5 shadow-sm overflow-x-auto custom-scrollbar hide-scrollbar-on-mobile max-w-full sm:max-w-[420px]">
              <button
                onClick={() => setMonth(0)}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all duration-150 select-none cursor-pointer text-nowrap shrink-0 ${
                  month === 0 
                    ? 'bg-[#1A1A1A] text-white shadow-sm' 
                    : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                }`}
              >
                全年
              </button>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                const isSelected = month === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMonth(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all duration-150 select-none cursor-pointer text-nowrap shrink-0 ${
                      isSelected 
                        ? 'bg-[#1A1A1A] text-white shadow-sm' 
                        : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                    }`}
                  >
                    {m.toString().padStart(2, '0')}月
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Metrics & Status Filter Tags integrated in line */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Card 1: 客户总数 */}
          <div className="flex-1 sm:flex-none min-w-[100px] bg-white border border-black/[0.06] rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 mb-1 font-mono">客户总数</div>
            <div className="text-xl font-extrabold text-[#1A1A1A] flex items-baseline gap-0.5 font-sans">
              {filtered.length} 
              <span className="text-[10px] font-medium text-[#1A1A1A]/40 ml-0.5">户</span>
            </div>
          </div>

          {/* Card 2: 预期合同总额 */}
          <div className="flex-1 sm:flex-none min-w-[130px] bg-white border border-black/[0.06] rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 mb-1 font-mono">预期合同总额</div>
            <div className="text-xl font-extrabold text-zinc-700 flex items-baseline gap-0.5 font-sans">
              ¥{(totalExpectedAmount / 10000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-[10px] font-medium text-zinc-700/50 ml-0.5">万</span>
            </div>
          </div>

          {/* Card 3: 已达成转化 */}
          <div className="flex-1 sm:flex-none min-w-[130px] bg-emerald-500/[0.03] border border-emerald-500/15 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-[9px] uppercase font-bold tracking-wider text-emerald-800/50 mb-1 font-mono">已达成转化</div>
            <div className="text-xl font-extrabold text-emerald-700 flex items-baseline gap-0.5 font-sans">
              ¥{(totalAmount / 10000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-[10px] font-bold text-emerald-700/60 ml-0.5">万</span>
            </div>
          </div>

          {/* Card 4: 业绩转化率 */}
          <div className="flex-1 sm:flex-none min-w-[115px] bg-purple-500/[0.03] border border-purple-500/15 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-[9px] uppercase font-bold tracking-wider text-purple-800/50 mb-1 font-mono">业绩转化率</div>
            <div className="text-xl font-extrabold text-purple-700 flex items-baseline gap-0.5 font-sans">
              {conversionRate.toFixed(1)}
              <span className="text-[10px] font-bold text-purple-700/60 ml-0.5">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full flex flex-col min-h-0">
        {/* Tool Bar */}
        <div className="flex flex-col gap-5 mb-6 sm:mb-8 shrink-0 bg-white/40 p-4 sm:p-6 rounded-2xl border border-[#1A1A1A]/5 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Beautiful Custom Search Input */}
            <div className="w-full md:w-[320px]">
              <div className="flex items-center bg-white border border-[#1A1A1A]/12 hover:border-[#1A1A1A]/20 focus-within:border-[#1A73E8] focus-within:ring-4 focus-within:ring-[#1A73E8]/10 rounded-xl px-3.5 py-2.5 w-full transition-all duration-250 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group">
                <Search className="w-4 h-4 opacity-40 group-focus-within:opacity-80 group-focus-within:text-[#1A73E8] transition-all" strokeWidth={2.5} />
                <input 
                  placeholder="搜索项目、客户或负责人..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="bg-transparent border-none text-[13px] w-full outline-none px-2.5 placeholder:text-[#1A1A1A]/30 text-[#1A1A1A] font-medium" 
                />
              </div>
            </div>

            {/* Right: Modern Actions Suite (Visible on both desktop & mobile) */}
            <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-0">
              
              {/* Action: Add Project - Primary Black styled with Icon */}
              <button 
                onClick={onAdd} 
                className="flex-1 sm:flex-none justify-center bg-[#1A1A1A] text-white px-4 h-9 text-[11px] font-bold rounded-lg hover:bg-black transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>新增项目</span>
              </button>

              {/* Action: Export CSV - Elegant White Outlined */}
              <button 
                onClick={() => {
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
                }} 
                className="flex-1 sm:flex-none justify-center bg-white border border-black/[0.08] hover:border-black/[0.15] text-[#1A1A1A]/85 px-3.5 h-9 text-[11px] font-semibold rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                title="导出下方筛选的数据为 CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
                <span>导出数据</span>
              </button>
              
              {/* Action: Download Template - Outlined Minimal */}
              <button 
                onClick={() => {
                  const headers = ['客户名称', '状态', '合作意向/产品', '市场负责人', '项目负责人', '预期(万)', '已达成(万)', '联系人', '联系电话'];
                  const sampleRow = ['示例客户有限公司', '跟进中', '数字化转型综合系统', '陈鹏飞', '梁冬雪', '120.5', '95.0', '李燕', '13988889999'];
                  const csvContent = [
                    headers.join(','),
                    sampleRow.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',')
                  ].join('\n');
                  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', '项目跟踪导入模板.csv');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }} 
                className="flex-1 sm:flex-none justify-center bg-white border border-black/[0.08] hover:border-black/[0.15] text-[#1A1A1A]/85 px-3.5 h-9 text-[11px] font-semibold rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                title="下载标准导入 CSV 格式模板"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
                <span>下载模板</span>
              </button>

              {/* Action: Import Data - Minimal Outlined to match rest */}
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 sm:flex-none justify-center bg-white border border-black/[0.08] hover:border-black/[0.15] text-[#1A1A1A]/85 px-3.5 h-9 text-[11px] font-semibold rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
                <span>导入数据</span>
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                accept=".csv" 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          {/* Sub-bar: Touch-friendly horizontal filter swipe row for both desktop & mobile */}
          <div className="border-t border-[#1A1A1A]/5 pt-3 mt-1">
            <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-2 pb-1 shrink-0 -mx-4 sm:-mx-0 px-4 sm:px-0">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer text-nowrap select-none shrink-0 snap-start active:scale-95 ${
                  filterStatus === 'all' 
                    ? 'bg-[#1A1A1A] text-white shadow-sm' 
                    : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10'
                }`}
              >
                全部阶段
              </button>
              {Object.keys(statusLabels).map(s => {
                const st = s as TrackingStatus;
                return (
                  <button 
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer text-nowrap select-none shrink-0 snap-start active:scale-95 flex items-center gap-1.5 ${
                      filterStatus === st 
                        ? 'bg-[#1A1A1A] text-white shadow-sm' 
                        : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10'
                    }`}
                  >
                    <span>{statusLabels[st]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {importStatus && (
          <div className={`mb-6 px-5 py-4 rounded-2xl border flex items-center justify-between text-xs font-mono tracking-wide shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${
            importStatus.type === 'success' 
              ? 'bg-emerald-50 border-emerald-500/20 text-emerald-800' 
              : 'bg-rose-50 border-rose-500/20 text-rose-800'
          }`}>
            <div className="flex items-center gap-3">
               <span className={`w-2 h-2 rounded-full ${importStatus.type === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
               <span>{importStatus.message}</span>
            </div>
            <button onClick={() => setImportStatus(null)} className="opacity-50 hover:opacity-100 transition-opacity p-1 ml-4 text-sm leading-none">✕</button>
          </div>
        )}

        {/* Data List Wrapper (scrollable) */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-col md:min-h-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-12 h-12 border border-[#1A1A1A]/10 rounded-full flex items-center justify-center text-2xl font-serif italic opacity-20 mb-4">0</div>
               <div className="text-xs uppercase tracking-widest opacity-40">暂无符合条件的项目记录</div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 md:flex-1 md:flex md:flex-col md:min-h-0">
                              {/* Desktop Table */}
               <div className="hidden md:block md:flex-1 overflow-auto custom-scrollbar border border-[#1A1A1A]/10 rounded shadow-sm bg-white">
                 <table className="w-full text-xs text-left whitespace-nowrap">
                   <thead className="sticky top-0 bg-[#F7F6F2] z-10">
                     <tr className="border-b-2 border-[#1A1A1A]/20 text-xs font-bold text-[#1A1A1A] h-12">
                       <th className="px-2 font-bold w-10">#</th>
                       <th className="px-2.5 font-bold">客户名称</th>
                       <th className="px-2.5 font-bold text-center">状态</th>
                       <th className="px-2.5 font-bold">合作意向/产品</th>
                       <th className="px-2.5 font-bold">市场负责人</th>
                       <th className="px-2.5 font-bold">项目负责人</th>
                       <th className="px-2.5 font-bold text-right font-mono">预期合同额(万)</th>
                       <th className="px-2.5 font-bold text-right font-mono">已达成(万)</th>
                       <th className="px-2.5 font-bold">最近跟进</th>
                       <th className="px-2.5 font-bold">客户联系人</th>
                       <th className="px-2.5 font-bold text-center">操作</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filtered.map((t, i) => (
                       <tr key={t.id} onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))} className="border-b border-[#1A1A1A]/5 hover:bg-[#F7F6F2]/80 transition-colors group h-14 cursor-pointer">
                         <td className="px-2 text-xs opacity-80">{i + 1}</td>
                         <td className="px-2.5 font-medium text-xs text-[#1A1A1A] max-w-[180px] truncate" title={t.customerName}>{t.customerName}</td>
                         <td className="px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={t.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onStatusChange(t.id, e.target.value as TrackingStatus)}
                              disabled={t.status === 'terminated' || t.status === 'archived'}
                              className={`appearance-none bg-transparent outline-none cursor-pointer inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium min-w-[70px] text-center
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
                         <td className="px-2.5 text-xs opacity-90 max-w-[150px] truncate" title={t.product}>{t.product}</td>
                         <td className="px-2.5 text-xs opacity-90">{t.cityManager}</td>
                         <td className="px-2.5 text-xs opacity-90">{t.projectManager}</td>
                         <td className="px-2.5 text-xs font-mono opacity-80 text-right">
                           {t.expectedContractAmount > 0 ? (t.expectedContractAmount / 10000).toFixed(2) : '—'}
                         </td>
                         <td className="px-2.5 text-xs font-mono text-emerald-600 text-right">
                           {t.actualContractAmount > 0 ? (t.actualContractAmount / 10000).toFixed(2) : '—'}
                         </td>
                         <td className="px-2.5 text-xs font-mono opacity-80">{t.lastFollowupDate || '—'}</td>
                         <td className="px-2.5 text-xs opacity-90">{t.contactName}</td>
                         <td className="px-2.5 text-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); }}>
                           {t.status === 'terminated' ? (
                             <>
                               <button 
                                 onClick={() => handleRestoreClick(t)} 
                                 disabled={loadingAction !== null}
                                 className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 px-2.5 py-1.5 rounded text-[11px] font-semibold mr-2 transition-all disabled:opacity-50 min-w-[56px] cursor-pointer"
                               >
                                 恢复
                               </button>
                               <button 
                                 onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))} 
                                 disabled={loadingAction !== null}
                                 className="inline-flex items-center justify-center bg-gray-50 text-[#1A1A1A] hover:bg-gray-200 active:scale-95 px-2.5 py-1.5 rounded text-[11px] font-semibold mr-2 transition-all disabled:opacity-50 min-w-[56px] cursor-pointer"
                               >
                                 详情
                               </button>
                               <button 
                                 onClick={() => handleDeletePermanentlyClick(t)} 
                                 disabled={loadingAction !== null}
                                 className="inline-flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-50 min-w-[56px] cursor-pointer"
                               >
                                 删除
                               </button>
                             </>
                           ) : (
                             <>
                               <button 
                                 onClick={() => handleAction(t.id, 'followup', () => onAddFollowup(t))} 
                                 disabled={loadingAction !== null || t.status === 'archived'}
                                 className={`inline-flex items-center justify-center ${t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium mr-2 transition-all disabled:opacity-50 min-w-[56px]`}
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
                                 disabled={loadingAction !== null || t.status === 'archived'}
                                 className={`inline-flex items-center justify-center ${t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-[#1A1A1A] hover:bg-gray-200 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium mr-2 transition-all disabled:opacity-50 min-w-[56px]`}
                               >
                                 {loadingAction?.id === t.id && loadingAction?.type === 'edit' ? (
                                   <span className="w-3 h-3 border-[1.5px] border-[#1A1A1A] border-t-transparent rounded-full animate-spin mr-1"></span>
                                 ) : null}
                                 修改
                               </button>
                               <button 
                                 onClick={() => handleAction(t.id, 'delete', () => onDelete(t.id))} 
                                 disabled={loadingAction !== null || t.status === 'archived'}
                                 className={`inline-flex items-center justify-center ${t.status === 'archived' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95'} px-2.5 py-1.5 rounded text-[11px] font-medium transition-all disabled:opacity-50 min-w-[56px]`}
                               >
                                 {loadingAction?.id === t.id && loadingAction?.type === 'delete' ? (
                                   <span className="w-3 h-3 border-[1.5px] border-red-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                                 ) : null}
                                 作废
                               </button>
                             </>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* Mobile Card Layout */}
               <div className="md:hidden flex flex-col gap-4.5 pb-[calc(110px+env(safe-area-inset-bottom))]">
                 {filtered.map((t, i) => (
                   <div 
                     key={t.id} 
                     className="bg-white border border-black/[0.04] rounded-2xl p-5 flex flex-col gap-4 shadow-[0_4px_18px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] active:scale-[0.985] transition-all relative overflow-hidden" 
                     onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))}
                   >
                     {/* Header */}
                     <div className="flex flex-col gap-2 pr-12">
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
                             ${t.status === 'followup' ? 'bg-amber-500/10 text-amber-700' : 
                               t.status === 'implementing' ? 'bg-blue-500/10 text-blue-700' : 
                               t.status === 'accepting' ? 'bg-emerald-500/10 text-emerald-700' : 
                               t.status === 'quoted' ? 'bg-purple-500/10 text-purple-700' : 
                               t.status === 'archived' ? 'bg-zinc-500/10 text-zinc-700' :
                               'bg-zinc-500/10 text-zinc-700'}`}
                           >
                             <span className={`w-1 h-1 rounded-full ${statusColors[t.status]} shrink-0`} />
                             {statusLabels[t.status]}
                           </span>
                           {t.product && (
                             <span className="bg-zinc-100/55 text-zinc-500 text-[9px] font-medium px-2 py-0.5 rounded uppercase tracking-wider">
                               {t.product}
                             </span>
                           )}
                        </div>
                        <h3 className="font-bold text-[16px] text-[#1A1A1A] leading-snug tracking-tight">
                          {t.customerName}
                        </h3>
                     </div>
                       
                     {/* Call Action in absolute top right */}
                     {t.contactPhone && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${t.contactPhone}`; }} 
                         className="absolute top-5 right-5 w-9 h-9 bg-black/[0.02] border border-black/[0.04] hover:bg-black/[0.05] select-none cursor-pointer rounded-xl flex items-center justify-center transition-all active:scale-90"
                         title="拨打电话"
                       >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                       </button>
                     )}
                     
                     {/* Metrics Ribbon */}
                     <div className="grid grid-cols-2 bg-[#1A1A1A]/[0.012] border border-black/[0.02] rounded-xl p-3">
                        <div className="flex-1">
                           <div className="text-[9px] opacity-40 mb-1 font-bold tracking-widest uppercase">预期合同额</div>
                           <div className="font-mono text-[14px] font-bold text-[#1A1A1A]/85">
                             {t.expectedContractAmount > 0 ? `¥${(t.expectedContractAmount / 10000).toLocaleString()}万` : '—'}
                           </div>
                        </div>
                        <div className="hidden"></div>
                        <div className="flex-1 border-l border-black/[0.035] pl-4">
                           <div className="text-[9px] opacity-40 mb-1 font-bold tracking-widest uppercase">实际达成额</div>
                           <div className="font-mono text-[14px] font-bold text-emerald-600">
                             {t.actualContractAmount > 0 ? `¥${(t.actualContractAmount / 10000).toLocaleString()}万` : '—'}
                           </div>
                        </div>
                     </div>
                     
                     {/* Footer Info */}
                     <div className="flex items-center justify-between text-[10px] font-mono opacity-45">
                        <div className="flex items-center gap-1">
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                           <span>跟进: {t.lastFollowupDate || '首轮未录入'}</span>
                        </div>
                        <div className="font-semibold flex items-center gap-1 text-[#1A1A1A]/60">
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                           <span>{(t.cityManager || t.projectManager) ? `${t.cityManager || ''} ${t.projectManager || ''}`.trim() : '未分派'}</span>
                        </div>
                     </div>

                     {/* Mobile Card Action Drawer / Slider Buttons with at least 44px height hit targets */}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-3 border-t border-black/[0.035]" onClick={e => e.stopPropagation()}>
                        {t.status === 'terminated' ? (
                          <>
                            <button 
                              onClick={() => handleRestoreClick(t)} 
                              disabled={loadingAction !== null}
                              className="px-3.5 py-1.5 text-[10.5px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                              <span>恢复</span>
                            </button>

                            <button 
                              onClick={() => handleAction(t.id, 'details', () => onViewDetails(t))} 
                              disabled={loadingAction !== null}
                              className="px-3 py-1.5 text-[10.5px] font-medium rounded-lg bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-zinc-750 border border-black/5 transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              <span>详情</span>
                            </button>

                            <button 
                              onClick={() => handleDeletePermanentlyClick(t)} 
                              disabled={loadingAction !== null}
                              className="px-3 py-1.5 text-[10.5px] font-medium rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span>删除</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleAction(t.id, 'followup', () => onAddFollowup(t))} 
                              disabled={loadingAction !== null || t.status === 'archived'}
                              className={`px-3.5 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1 ${
                                t.status === 'archived'
                                  ? 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30 cursor-not-allowed'
                                  : 'bg-[#1A1A1A] hover:bg-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                              }`}
                            >
                              {loadingAction?.id === t.id && loadingAction?.type === 'followup' ? (
                                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              )}
                              <span>新跟进</span>
                            </button>

                            <button 
                              onClick={() => handleAction(t.id, 'edit', () => onEdit(t))} 
                              disabled={loadingAction !== null || t.status === 'archived'}
                              className={`px-3 py-1.5 text-[10.5px] font-medium rounded-lg transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1 ${
                                t.status === 'archived'
                                  ? 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30 cursor-not-allowed'
                                  : 'bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-zinc-700 border border-black/5'
                              }`}
                            >
                              {loadingAction?.id === t.id && loadingAction?.type === 'edit' ? (
                                <span className="w-3.5 h-3.5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              )}
                              <span>修改</span>
                            </button>

                            <button 
                              onClick={() => handleAction(t.id, 'delete', () => onDelete(t.id))} 
                              disabled={loadingAction !== null || t.status === 'archived'}
                              className={`px-3 py-1.5 text-[10.5px] font-medium rounded-lg transition-all cursor-pointer select-none active:scale-95 min-h-[36px] flex items-center justify-center gap-1 ${
                                t.status === 'archived'
                                  ? 'bg-[#1A1A1A]/5 text-[#1A1A1A]/30 cursor-not-allowed'
                                  : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50/50'
                              }`}
                            >
                              {loadingAction?.id === t.id && loadingAction?.type === 'delete' ? (
                                <span className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              )}
                              <span>作废</span>
                            </button>
                          </>
                        )}
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {localConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isConfirmLoading && setLocalConfirm(null)}>
          <div className="bg-white rounded-xl border border-black/10 shadow-2xl p-6 w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1A1A1A] border-b border-zinc-100 pb-3 flex items-center gap-2">
              {localConfirm.type === 'restore' ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              )}
              {localConfirm.title}
            </h3>
            <p className="text-xs text-zinc-600 mt-4 leading-relaxed whitespace-pre-wrap">
              {localConfirm.message}
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setLocalConfirm(null)}
                disabled={isConfirmLoading}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setIsConfirmLoading(true);
                  try {
                    await localConfirm.onConfirm();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsConfirmLoading(false);
                  }
                }}
                disabled={isConfirmLoading}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all active:scale-95 cursor-pointer select-none shadow-sm flex items-center justify-center gap-1.5 ${
                  localConfirm.type === 'restore'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100/50'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100/50'
                } disabled:opacity-80 disabled:cursor-not-allowed`}
              >
                {isConfirmLoading && (
                  <span className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                <span>确定</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

declare global {
  interface Window {
    showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  }
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export default function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    window.showToast = showToast;
    return () => {
      delete window.showToast;
    };
  }, [showToast]);

  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const isSystemAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    return currentUser.department === 'admin' || 
           currentUser.name === 'Admin' || 
           currentUser.roles?.includes('管理员') || 
           currentUser.roles?.includes('系统管理员');
  }, [currentUser]);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [cuteStepIndex, setCuteStepIndex] = useState(0);
  const [showSlowLoadingOption, setShowSlowLoadingOption] = useState(false);

  useEffect(() => {
    if (!isLoadingData) return;
    const interval = setInterval(() => {
      setCuteStepIndex(prev => (prev + 1) % 6);
    }, 2400);
    return () => clearInterval(interval);
  }, [isLoadingData]);

  useEffect(() => {
    if (!isLoadingData) {
      setShowSlowLoadingOption(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowLoadingOption(true);
    }, 5500);
    return () => clearTimeout(timer);
  }, [isLoadingData]);

  const [dataError, setDataError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [mobileSubTab, setMobileSubTab] = useState<'kanban' | 'overview'>('kanban');

  useEffect(() => {
    setMobileSubTab('kanban');
  }, [currentView]);

  const [loadingStep, setLoadingStep] = useState<string>('正在对数据服务进行连接初始化...');
  const [useLocalMockMode, setUseLocalMockMode] = useState<boolean>(false);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [apiError, setApiError] = useState<CentralError | null>(null);

  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(() => {
    const saved = localStorage.getItem('role_permissions');
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem('role_permissions', JSON.stringify(rolePermissions));
    if (isDbLoaded && !useLocalMockMode && rolePermissions.length > 0) {
      apiService.savePermissions(rolePermissions).then(() => {
        setSyncError(null);
      }).catch(e => {
        console.warn('自动同步权限矩阵到数据库失败:', e);
        setSyncError(e.message || String(e));
      });
    }
  }, [rolePermissions, isDbLoaded, useLocalMockMode]);

  useEffect(() => {
    const unsub = apiService.onError((err) => {
      setApiError(err);
    });
    return unsub;
  }, []);

  const currentUserPermissions = React.useMemo(() => {
    if (!currentUser) return [];
    
    if (isSystemAdmin) {
      return [
        'VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS',
        'EDIT_RELEASE_GOAL', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'REVIEW_DELIVERABLE', 'MANAGE_SYSTEM_SETTINGS'
      ];
    }
    
    const userRoles = currentUser.roles || [];
    const activePerms = new Set<string>();
    
    userRoles.forEach(r => {
      const rpObj = rolePermissions.find(p => p.roleName === r);
      if (rpObj) {
        rpObj.permissions.forEach(pKey => activePerms.add(pKey));
      } else {
        const defaultRoleDefaults: Record<string, string[]> = {
          '系统管理员': ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE', 'MANAGE_SYSTEM_SETTINGS'],
          '项目经理': ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'],
          '部门经理': ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'],
          '产品总监': ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL'],
          '市场总监': ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL'],
          '组长':     ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL', 'MANAGE_PLAN_TASK'],
          '产品经理': ['VIEW_DASHBOARD', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT'],
          '研发经理': ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'],
          '测试经理': ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'],
          '市场人员': ['VIEW_DASHBOARD', 'VIEW_MARKETING']
        };
        const defaults = defaultRoleDefaults[r] || [];
        defaults.forEach(pKey => activePerms.add(pKey));
      }
    });
    
    return Array.from(activePerms);
  }, [currentUser, rolePermissions]);

  useEffect(() => {
    if (!currentUser || !isDbLoaded) return;
    const viewUpper = 'VIEW_' + currentView.toUpperCase();
    if (!currentUserPermissions.includes(viewUpper)) {
      const possibleViews = [
        { view: 'dashboard', permission: 'VIEW_DASHBOARD' },
        { view: 'tracking', permission: 'VIEW_TRACKING' },
        { view: 'marketing', permission: 'VIEW_MARKETING' },
        { view: 'rnd', permission: 'VIEW_RND' },
        { view: 'requirements', permission: 'VIEW_REQUIREMENTS' },
      ];
      const fallback = possibleViews.find(v => currentUserPermissions.includes(v.permission));
      if (fallback) {
        setCurrentView(fallback.view);
      }
    }
  }, [currentUser, currentUserPermissions, isDbLoaded, currentView]);

  const switchToLocalMockMode = () => {
    console.log('一键切换至纯前端本地 Mock 模式');
    apiService.setLocalMockOverride(true);
    setUseLocalMockMode(true);
    setIsDbLoaded(true);
    setIsLoadingData(false);
    setDataError(null);
  };
  
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errObj = event.reason;
      if (errObj && (String(errObj).includes('RLS受阻') || String(errObj).includes('Could not find') || String(errObj).includes('schema cache'))) {
        setDataError(String(errObj));
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [releaseGoals, setReleaseGoals] = useState<ReleaseGoal[]>([]);
  const [projectTrackings, setProjectTrackings] = useState<ProjectTracking[]>([]);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState<Omit<ProjectTracking, 'id' | 'updatedAt'>>({
    customerName: '', status: 'followup', product: '', cityManager: '', projectManager: '',
    expectedContractAmount: 0, actualContractAmount: 0, contactName: '', contactPhone: '',
    createdAt: format(new Date(), 'yyyy-MM-dd')
  });
  const [trackingFilterStatus, setTrackingFilterStatus] = useState<TrackingStatus | 'all'>('all');
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
  const [trackingYear, setTrackingYear] = useState(new Date().getFullYear());
  const [trackingMonth, setTrackingMonth] = useState(new Date().getMonth() + 1);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({ date: '', content: '' });
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete_followup' | 'update_followup';
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [isTrackingDetailModalOpen, setIsTrackingDetailModalOpen] = useState(false);
  const [mobileDetailTab, setMobileDetailTab] = useState<'timeline' | 'info'>('timeline');
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
    if (saved && saved.includes('-')) return pruneDuplicates(JSON.parse(saved));
    return pruneDuplicates(mockGroups);
  });

  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups));
    if (isDbLoaded && !useLocalMockMode) {
      apiService.saveGroups(groups).then(() => {
        setSyncError(null);
      }).catch(e => {
        console.warn('自动同步小组到数据库失败:', e);
        setSyncError(e.message || String(e));
      });
    }
  }, [groups, isDbLoaded, useLocalMockMode]);

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('members');
    if (saved && !saved.includes('-')) {
      localStorage.removeItem('members');
      localStorage.removeItem('groups');
      localStorage.removeItem('currentUser');
      return pruneDuplicates(mockMembers);
    }
    if (saved) {
      const parsedMembers = JSON.parse(saved);
      return pruneDuplicates(parsedMembers.map((m: any) => ({
        ...m,
        roles: m.roles || (m.role ? [m.role] : [])
      })));
    }
    return pruneDuplicates(mockMembers);
  });

  useEffect(() => {
    localStorage.setItem('members', JSON.stringify(members));
    if (isDbLoaded && !useLocalMockMode) {
      apiService.saveMembers(members).then(() => {
        setSyncError(null);
      }).catch(e => {
        console.warn('自动同步成员到数据库失败:', e);
        setSyncError(e.message || String(e));
      });
    }
  }, [members, isDbLoaded, useLocalMockMode]);



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
    if (isDbLoaded && !useLocalMockMode) {
      apiService.saveSystemSettings({ authorizedCompanies, annualTargetProfit, guideContent }).catch(e => console.warn('自动同步系统设置失败:', e));
    }
  }, [authorizedCompanies, isDbLoaded, useLocalMockMode]);

  useEffect(() => {
    if (isDbLoaded && !useLocalMockMode) {
      apiService.saveSystemSettings({ authorizedCompanies, annualTargetProfit, guideContent }).catch(e => console.warn('自动同步利润指标失败:', e));
    }
  }, [annualTargetProfit, isDbLoaded, useLocalMockMode]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [draggedRequirementId, setDraggedRequirementId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RequirementStatus | null>(null);

  const reqLongPressTimerRef = React.useRef<any>(null);
  const reqTouchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const reqHasTriggeredLongPressRef = React.useRef<boolean>(false);
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
      <div class="space-y-8 text-stone-800">
        <!-- 头部导览 -->
        <div class="border-l-4 border-[#1A1A1A] pl-4 py-2 bg-[#1A1A1A]/5 rounded-r">
          <p class="text-[10px] font-mono uppercase tracking-widest text-[#1A1A1A]/50">COLLABORATION SYSTEM MANUAL</p>
          <h3 class="text-xl font-serif italic text-[#1A1A1A] mt-0.5 font-bold">面向高效团队的敏捷协同中枢</h3>
          <p class="text-xs text-stone-500 mt-1">本指南将帮助您快速熟悉系统的四大核心工作流与高效协作技巧，建立起“目标-执行-交付-反馈”的高效循环。</p>
        </div>

        <!-- 核心定位 -->
        <section>
          <h4 class="font-bold text-sm uppercase tracking-wider text-[#1A1A1A] mb-3 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
            一、 核心设计理念
          </h4>
          <p class="text-xs leading-relaxed text-stone-600 mb-3">
            项目跟踪系统抛弃了繁重的管理流程，提倡<strong>“目标对齐、透明管理、敏捷交付”</strong>。通过轻量、美观的响应式页面，确保团队管理者和执行人员无缝对接核心资源、进度完成度和项目交付指标。
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3 bg-stone-50 border border-stone-200/60 rounded">
              <span class="text-xs font-bold block text-[#1A1A1A]">🎯 战略对齐</span>
              <span class="text-[11px] text-stone-500 leading-snug block mt-1">季度核心目标纵向拆解为可量化的周计划指标（Plan），确保每一项工作皆服务于全局。</span>
            </div>
            <div class="p-3 bg-stone-50 border border-stone-200/60 rounded">
              <span class="text-xs font-bold block text-[#1A1A1A]">⚡ 敏捷交付</span>
              <span class="text-[11px] text-stone-500 leading-snug block mt-1">个人任务进度滑块无级调节，支持任务一键点选勾选完成，自动记录实际起止时间闭环。</span>
            </div>
            <div class="p-3 bg-stone-50 border border-stone-200/60 rounded">
              <span class="text-xs font-bold block text-[#1A1A1A]">📊 经营透视</span>
              <span class="text-[11px] text-stone-500 leading-snug block mt-1">结合项目合同总额、签约日期、客户漏斗及预期奋斗指标，全局看清公司整体经营与利润率状况。</span>
            </div>
          </div>
        </section>

        <!-- 详细功能指南 -->
        <section>
          <h4 class="font-bold text-sm uppercase tracking-wider text-[#1A1A1A] mb-4 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
            二、 四大典型工作流操作要领
          </h4>
          
          <div class="space-y-5">
            <!-- 看板管理 -->
            <div class="group">
              <h5 class="font-bold text-xs text-[#1A1A1A] flex items-center gap-2 mb-1.5">
                <span class="w-1 h-3 bg-[#1A1A1A]/30 group-hover:bg-[#1A1A1A] transition-colors inline-block"></span>
                1. 经营分析与指标配置 (全局看板)
              </h5>
              <div class="pl-3 text-xs text-stone-600 space-y-1">
                <p>• <strong>多维度指标分析：</strong> 顶部的经营仪表盘汇总了财务、利润率与销售商机漏斗。通过切换年度/季度/月份，可实现对任意区间的历史追溯与指标核验。</p>
                <p>• <strong>目标/实际数值录入：</strong> 在每个经营指标卡片右侧，点击设置图标或“规划/调整实际”按钮。所有数值将使用高精度本地持久化存储（并完美适配后端同步）。</p>
              </div>
            </div>

            <!-- OKR管理 -->
            <div class="group">
              <h5 class="font-bold text-xs text-[#1A1A1A] flex items-center gap-2 mb-1.5">
                <span class="w-1 h-3 bg-[#1A1A1A]/30 group-hover:bg-[#1A1A1A] transition-colors inline-block"></span>
                2. 季度核心目标编排 (OKR 规划)
              </h5>
              <div class="pl-3 text-xs text-stone-600 space-y-1">
                <p>• <strong>富文本目标设定：</strong> 点击左侧边栏对应团队或小组右上角的“编辑”按钮，可进入极简富文本状态。输入目标大纲后，点击“保存”即可实时呈现给团队。</p>
                <p>• <strong>目标树状对齐拆解：</strong> 每一项季度 OKR 可以和当前周或历史周计划进行紧密联动。可根据进展实时监控具体周计划的执行数值。</p>
              </div>
            </div>

            <!-- 任务协同 -->
            <div class="group">
              <h5 class="font-bold text-xs text-[#1A1A1A] flex items-center gap-2 mb-1.5">
                <span class="w-1 h-3 bg-[#1A1A1A]/30 group-hover:bg-[#1A1A1A] transition-colors inline-block"></span>
                3. 周计划执行与个人任务微调 (部门视图)
              </h5>
              <div class="pl-3 text-xs text-stone-600 space-y-1">
                <p>• <strong>创建与指派任务：</strong> 进入相应部门（如研发部、市场部、运营部），在项目成员卡片内点击“+ 添加/新增任务项”可以指派责任人、对应项目、任务起止预期并设置交付成果物标准。</p>
                <p>• <strong>无级进度滑动与一键验收：</strong> 通过流畅的范围调节条，负责人可以随时反馈任务实际完成进度（10%-100%）。当进度滑至 100% 或在卡片列表里直接点击勾选框，系统将一键完成任务并自动记录当前的实际完成日期。</p>
              </div>
            </div>

            <!-- 交付跟进 -->
            <div class="group">
              <h5 class="font-bold text-xs text-[#1A1A1A] flex items-center gap-2 mb-1.5">
                <span class="w-1 h-3 bg-[#1A1A1A]/30 group-hover:bg-[#1A1A1A] transition-colors inline-block"></span>
                4. 项目和客户跟踪管理 (跟进看板)
              </h5>
              <div class="pl-3 text-xs text-stone-600 space-y-1">
                <p>• <strong>跟进详情弹窗：</strong> 支持快捷筛查未跟进、跟进中、重要跟进、已签约、已丢单等不同状态的商机及项目。可以集中管理联系人、预期签单总额与签约月份。</p>
                <p>• <strong>复合追加历史备注：</strong> 点击项目行的“跟进记录”，即可划出右侧抽屉，随时输入并追加跟进历史。每一次记录都会被打上创建时间戳，便于后期追溯与销售漏斗分析。</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 交互与技巧 -->
        <section>
          <h4 class="font-bold text-sm uppercase tracking-wider text-[#1A1A1A] mb-3 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-[#1A1A1A] inline-block"></span>
            三、 界面交互特色及使用技巧
          </h4>
          <div class="bg-stone-50 border border-stone-200/60 p-4 rounded space-y-2.5 text-xs text-stone-600">
            <p>💡 <strong class="text-[#1A1A1A]">统一高质感立体提交按钮：</strong> 全局所有表单的常规提交、“保存”、“确认提交”以及“确定完成”按钮均经过高精度重构，并引入了 <code>shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)]</code> 立体力学微阴影，并在 <code>active:translate-x-[2px] active:translate-y-[2px]</code> 的作用下提供生动灵敏的物理按下触觉反馈。</p>
            <p>💡 <strong class="text-[#1A1A1A]">多终端自适应舒适度：</strong> 响应式布局自适应桌面电脑、平板与移动端操作。任何对话框表单及操作按键均严格遵守 <code>min-h-[44px]</code> 或 <code>min-h-[40px]</code> 的最小触摸间距，避免任何误触现象。</p>
            <p>💡 <strong class="text-[#1A1A1A]">系统配置与自定义权值：</strong> 您可以点击顶部导航卡片右上方的“设置齿轮”图标自定义允许访问此系统的授权企业列表，实时调增年度总奋斗指标，也可修改本说明文档的内容进行团队定制。</p>
          </div>
        </section>

        <!-- 声明备注 -->
        <section class="bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 p-4 rounded text-xs text-stone-600 leading-relaxed">
          <p class="font-bold text-[#1A1A1A] mb-1.5">🔒 数据持久化与版本管理</p>
          <p>
            本系统由现代 React 进行驱动，默认在您浏览器的 <code>localStorage</code> 中保持状态，任何更改都可以实时保存，无惧误触刷新。对于多人协作环境，系统提供了自动连接云端托管数据库的极速接入接口，保障高并发安全性及企业资产完整。
          </p>
        </section>
      </div>
    `;
  });

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (useLocalMockMode) {
        console.log('fetchData: Local mock mode active, skipping cloud fetch');
        setProjects(mockProjects);
        setPlans(initialPlans);
        setTasks(initialTasks);
        setOutcomes(initialOutcomes);
        setRequirements(initialRequirements);
        setReleaseGoals([]);
        setProjectTrackings([]);
        setIsDbLoaded(true);
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      setLoadingStep('正在连接组织管理服务并识别您的归属组织 (organizations)...');
      try {
        await getOrganizationId();
      } catch (err: any) {
        console.warn('Failed to init organization', err);
        const errObj = err as any;
        const details = errObj?.message || errObj?.details || String(err);
        setDataError('组织初始化失败: ' + details);
        setIsLoadingData(false);
        return;
      }
      if (!mounted) return;
      setDataError(null);
      setLoadingStep('正在与 Supabase 云服务建立连接，加载底层数据模型...');
      console.log('fetchData: START');
      try {
        const fetchPromise = Promise.all([
          apiService.getProjects(),
          apiService.getPlans(),
          apiService.getTasks(),
          apiService.getOutcomes(),
          apiService.getRequirements(),
          apiService.getReleaseGoals(),
          apiService.getProjectTrackings(),
          apiService.getGroups(),
          apiService.getMembers(),
          apiService.getSystemSettings(),
          apiService.getPermissions()
        ]);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时 (15秒)')), 15000)
        );

        console.log('fetchData: Waiting for initial fetch');
        const results = await Promise.race([fetchPromise, timeoutPromise]) as any;
        let [
          projectsData, 
          plansData, 
          tasksData, 
          outcomesData, 
          requirementsData, 
          releaseGoalsData, 
          trackingsData,
          groupsData,
          membersData,
          systemSettingsData,
          permissionsData
        ] = results;
        console.log('fetchData: Initial fetch done');

        if (projectsData.length === 0) {
           setLoadingStep('检测到全新数据库，正在写入预制业务演示数据以配置核心看板...');
           console.log('fetchData: No projects found, starting seed');
           const seedService = await import('./services/seedService');
           
           const seeded = await Promise.race([
               seedService.seedSupabase(),
               new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Seed 请求超时 (15秒)')), 15000))
           ]);
           
           console.log('fetchData: Seed result:', seeded);
           if (seeded && mounted) {
               console.log('fetchData: Fetching data after seed');
               const seedFetchPromise = Promise.all([
                 apiService.getProjects(), 
                 apiService.getPlans(), 
                 apiService.getTasks(), 
                 apiService.getOutcomes(), 
                 apiService.getRequirements(), 
                 apiService.getReleaseGoals(), 
                 apiService.getProjectTrackings(),
                 apiService.getGroups(),
                 apiService.getMembers(),
                 apiService.getSystemSettings(),
                 apiService.getPermissions()
               ]);
               const seedResults = await Promise.race([seedFetchPromise, timeoutPromise]) as any;
               const [p, pl, t, o, r, rg, tr, gData, mData, sData, permData] = seedResults;
               
               console.log('fetchData: Seed fetch done');
               projectsData = p;
               plansData = pl;
               tasksData = t;
               outcomesData = o;
               requirementsData = r;
               releaseGoalsData = rg || [];
               trackingsData = tr || [];
               groupsData = gData;
               membersData = mData;
               systemSettingsData = sData;
               permissionsData = permData;
           }
        }

        if (mounted) {
          setLoadingStep('获取核心数据模型成功，正在组装渲染业务看板...');
          console.log('fetchData: Setting state');
          setProjects(pruneDuplicates(projectsData));
          setPlans(pruneDuplicates(plansData));
          setTasks(pruneDuplicates(tasksData));
          setOutcomes(pruneDuplicates(outcomesData));
          setRequirements(pruneDuplicates(requirementsData));
          setReleaseGoals(pruneDuplicates(releaseGoalsData || []));
          setProjectTrackings(pruneDuplicates(trackingsData || []));

          // 处理核心设置数据的自愈机制
          let finalGroups = groups;
          if (groupsData && groupsData.length > 0) {
            finalGroups = pruneDuplicates(groupsData);
          } else {
            console.log('No groups in database, uploading initial ones...');
            await apiService.saveGroups(groups).catch(e => console.warn('Sync initial groups failed', e));
          }

          let finalMembers = members;
          if (membersData && membersData.length > 0) {
            finalMembers = pruneDuplicates(membersData);
          } else {
            console.log('No members in database, uploading initial ones...');
            await apiService.saveMembers(members).catch(e => console.warn('Sync initial members failed', e));
          }

          if (systemSettingsData) {
            setAuthorizedCompanies(systemSettingsData.authorizedCompanies);
            setAnnualTargetProfit(systemSettingsData.annualTargetProfit);
            setGuideContent(systemSettingsData.guideContent);
          } else {
            console.log('No system settings in database, uploading initial ones...');
            await apiService.saveSystemSettings({ authorizedCompanies, annualTargetProfit, guideContent }).catch(e => console.warn('Sync initial system settings failed', e));
          }

          setGroups(pruneDuplicates(finalGroups));
          setMembers(pruneDuplicates(finalMembers));

          // 开启默认角色分配权限
          if (permissionsData && permissionsData.length > 0) {
            setRolePermissions(permissionsData);
          } else {
            console.log('No permissions rules found, uploading initial ones...');
            const defaults = [
              { roleName: '系统管理员', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE', 'MANAGE_SYSTEM_SETTINGS'] },
              { roleName: '项目经理', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'] },
              { roleName: '部门经理', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'] },
              { roleName: '产品总监', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL'] },
              { roleName: '市场总监', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL'] },
              { roleName: '组长', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL', 'MANAGE_PLAN_TASK'] },
              { roleName: '产品经理', permissions: ['VIEW_DASHBOARD', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT'] },
              { roleName: '研发经理', permissions: ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'] },
              { roleName: '测试经理', permissions: ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'] },
              { roleName: '市场人员', permissions: ['VIEW_DASHBOARD', 'VIEW_MARKETING'] }
            ];
            setRolePermissions(defaults);
            await apiService.savePermissions(defaults).catch(e => console.warn('Sync initial permissions failed', e));
          }
          
          setIsDbLoaded(true);
          console.log('fetchData: State set successfully');
        }
      } catch (err) {
        console.warn('Failed to fetch data:', err);
        if (mounted) {
           const errObj = err as any;
           const details = errObj?.message || errObj?.details || String(err);
           setDataError('与数据库连接失败: ' + details);
        }
      } finally {
        console.log('fetchData: FINISHED');
        if (mounted) setIsLoadingData(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [useLocalMockMode]);

  useEffect(() => {
    localStorage.setItem('guideContent', guideContent);
    if (isDbLoaded && !useLocalMockMode) {
      apiService.saveSystemSettings({ authorizedCompanies, annualTargetProfit, guideContent }).catch(e => console.warn('自动同步使用说明到数据库失败:', e));
    }
  }, [guideContent, isDbLoaded, useLocalMockMode]);

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
  const [isDbHelperOpen, setIsDbHelperOpen] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<string>('');
  const [dbSyncError, setDbSyncError] = useState<string>('');
  const [isSyncingDb, setIsSyncingDb] = useState(false);
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
    signedClientsTarget: '',
    signedClientsActual: '',
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
      signedClientsTarget: findTarget('signed'),
      signedClientsActual: findActual('signed'),
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
          updatedMember.name !== currentUser.name ||
          updatedMember.avatar !== currentUser.avatar ||
          JSON.stringify(updatedMember.roles) !== JSON.stringify(currentUser.roles) ||
          updatedMember.groupId !== currentUser.groupId
        ) {
          const newUser = {
            ...currentUser,
            name: updatedMember.name,
            avatar: updatedMember.avatar,
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
    if (savedUser && savedUser.includes('-')) {
      const parsedUser = JSON.parse(savedUser);
      if (!parsedUser.roles) {
        parsedUser.roles = parsedUser.role ? [parsedUser.role] : [];
      }
      setCurrentUser(parsedUser);
    } else {
      setCurrentUser(null);
    }
    setCurrentUserLoaded(true);
  }, []);

  const handleLogin = (user: Member) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    window.showToast?.(`登录成功，欢迎回来，${user.name}！`, 'success');
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setIsLogoutModalOpen(false);
    window.showToast?.('您已安全退出系统', 'info');
  };

  const handleAccountSetupComplete = (account: string, pass: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, account, password: pass };
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('has_setup_account', 'true');
    
    setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, account, password: pass } : m));
    window.showToast?.('系统登录账户和密码已保存成功', 'success');
  };

  const openTaskModal = React.useCallback((memberId: string, dept: 'marketing' | 'rnd') => {
    setSelectedMemberId(memberId);
    setSelectedDepartment(dept);
    setTaskForms([{ id: generateId(), title: '', plannedProgress: '0', startDate: format(currentWeekDate, 'yyyy-MM-dd'), endDate: format(currentWeekDate, 'yyyy-MM-dd'), projectName: '', outcome: '' }]);
    setIsTaskModalOpen(true);
  }, [currentWeekDate]);

  const openOutcomeModal = React.useCallback((memberId: string, dept: 'marketing' | 'rnd') => {
    setSelectedMemberId(memberId);
    setSelectedDepartment(dept);
    setOutcomeForms([{ id: generateId(), title: '', description: '', date: format(currentWeekDate, 'yyyy-MM-dd') }]);
    setIsOutcomeModalOpen(true);
  }, [currentWeekDate]);

  const marketingTasks = React.useMemo(() => {
    return tasks.filter(t => {
      const project = projects.find(p => p.id === t.projectId);
      const assignee = members.find(m => m.id === t.assigneeId);
      const isInWeek = t.endDate ? isSameWeek(parseISO(t.endDate), currentWeekDate, { weekStartsOn: 1 }) : false;
      const category = project?.category || assignee?.department;
      return category === 'marketing' && isInWeek;
    });
  }, [tasks, projects, members, currentWeekDate]);

  const rndTasks = React.useMemo(() => {
    return tasks.filter(t => {
      const project = projects.find(p => p.id === t.projectId);
      const assignee = members.find(m => m.id === t.assigneeId);
      const isInWeek = t.endDate ? isSameWeek(parseISO(t.endDate), currentWeekDate, { weekStartsOn: 1 }) : false;
      const category = project?.category || assignee?.department;
      return category === 'rnd' && isInWeek;
    });
  }, [tasks, projects, members, currentWeekDate]);

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

  const pieData = React.useMemo(() => {
    const backlogReviewing = activeMonthReqs.filter(r => ['backlog', 'reviewing'].includes(r.status)).length;
    const approvedPlanned = activeMonthReqs.filter(r => ['approved', 'planned'].includes(r.status)).length;
    const completed = activeMonthReqs.filter(r => r.status === 'completed').length;
    const rejected = activeMonthReqs.filter(r => r.status === 'rejected').length;

    const data = [
      { name: '储备评审', value: backlogReviewing, color: '#94a3b8' }, 
      { name: '落实推进', value: approvedPlanned, color: '#f59e0b' },   
      { name: '完成交付', value: completed, color: '#10b981' },       
      { name: '驳回搁置', value: rejected, color: '#f43f5e' },        
    ].filter(item => item.value > 0);

    if (data.length === 0) {
      return [{ name: '暂无数据', value: 1, color: '#e4e4e7' }];
    }
    return data;
  }, [activeMonthReqs]);

  if (dataError) {
    const isRlsError = dataError.includes('RLS受阻') || dataError.includes('row-level security');
    const isMissingColumn = dataError.includes('Could not find') || dataError.includes('schema cache') || dataError.includes('column') || dataError.includes('relation');
    const columnNameMatch = dataError.match(/column ["']([^"']+)["']/i) || dataError.match(/column ([^ ]+)/i) || dataError.match(/'([^']+)' column/i);
    const tableNameMatch = dataError.match(/relation ["']([^"']+)["']/i) || dataError.match(/of ["']([^"']+)["']/i) || dataError.match(/of '([^']+)'/i);
    const colName = columnNameMatch ? columnNameMatch[1] : '缺失字段';
    const tabName = tableNameMatch ? tableNameMatch[1] : '该表';
    
    return (
       <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFCFB] text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">{isRlsError ? 'Supabase 权限限制 (RLS受阻)' : '数据加载失败'}</h2>
          <p className="opacity-70 mb-4 max-w-lg text-left">{dataError}</p>
          
          {isMissingColumn && (
             <div className="mt-4 mb-4 bg-gray-100 p-4 rounded-xl text-left max-w-2xl w-full text-[#1A1A1A]">
                <p className="font-bold mb-2">💡 解决方案：请在您的 Supabase 项目中执行以下 SQL 语句，补充缺失的字段：</p>
                <pre className="text-xs p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
                  {`alter table "${tabName}" add column if not exists "${colName}" jsonb;`}
                </pre>
                <details className="mt-4 cursor-pointer">
                  <summary className="font-bold text-[#1A1A1A] underline">如果仍然报错，请点击此处复制完整数据库更新脚本（一键补齐所有缺失字段与设置表格）</summary>
                  <pre className="mt-2 text-[10px] p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
                    {`
-- 1. 创建核心基础设施与业务表格
create table if not exists organizations (
  id text primary key,
  name text
);

create table if not exists groups (
  id text primary key,
  name text,
  category text,
  organization_id text
);

create table if not exists members (
  id text primary key,
  name text,
  avatar text,
  roles text,
  department text,
  group_id text,
  account text,
  password text,
  organization_id text
);

create table if not exists system_settings (
  id text primary key,
  authorized_companies text,
  annual_target_profit numeric,
  guide_content text,
  organization_id text
);

create table if not exists role_permissions (
  role_name text primary key,
  permissions text,
  organization_id text
);

create table if not exists projects (
  id text primary key,
  title text not null,
  description text,
  category text,
  manager_id text,
  organization_id text
);

create table if not exists plans (
  id text primary key,
  project_id text,
  title text not null,
  level text,
  parent_id text,
  start_date text,
  end_date text,
  status text,
  progress numeric,
  metric jsonb,
  organization_id text
);

create table if not exists tasks (
  id text primary key,
  project_id text,
  plan_id text,
  title text not null,
  assignee_id text,
  status text,
  priority text,
  progress numeric,
  planned_progress numeric,
  start_date text,
  actual_start_date text,
  actual_end_date text,
  end_date text,
  outcome text,
  project_name text,
  organization_id text
);

create table if not exists outcomes (
  id text primary key,
  project_id text,
  title text not null,
  description text,
  submitter_id text,
  date text,
  status text,
  file_url text,
  organization_id text
);

create table if not exists release_goals (
  id text primary key,
  group_id text,
  title text not null,
  target_month text,
  target_date text,
  actual_version text,
  actual_release_date text,
  status text,
  note text,
  created_at text,
  organization_id text
);

create table if not exists project_trackings (
  id text primary key,
  customer_name text not null,
  status text,
  product text,
  city_manager text,
  project_manager text,
  expected_contract_amount numeric,
  actual_contract_amount numeric,
  contact_name text,
  contact_phone text,
  last_followup_date text,
  followup_records jsonb,
  organization_id text,
  updated_at timestamp with time zone,
  signed_date text,
  followup_date text
);

create table if not exists requirements (
  id text primary key,
  project_id text,
  title text not null,
  description text,
  priority text,
  status text,
  source text,
  submitter_id text,
  assignee_id text,
  created_at text,
  updated_at text,
  serial_number text,
  link_url text,
  customer_name text,
  internal_source_detail text,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  org_id text,
  organization_id text
);

create table if not exists requirement_history (
  id text primary key,
  requirement_id text,
  status text,
  timestamp text,
  note text,
  org_id text,
  organization_id text
);

-- 2. 字段兼容性自愈修复（针对已有旧表补全缺失列）
alter table requirements add column if not exists serial_number text;
alter table requirements add column if not exists project_id text;
alter table requirements add column if not exists link_url text;
alter table requirements add column if not exists customer_name text;
alter table requirements add column if not exists internal_source_detail text;
alter table requirements add column if not exists submitter_id text;
alter table requirements add column if not exists assignee_id text;
alter table requirements add column if not exists deleted boolean;
alter table requirements add column if not exists deleted_at timestamp with time zone;
alter table requirements add column if not exists org_id text;
alter table requirements add column if not exists organization_id text;

alter table tasks add column if not exists project_name text;
alter table tasks add column if not exists plan_id text;
alter table tasks add column if not exists title text;
alter table tasks add column if not exists assignee_id text;
alter table tasks add column if not exists status text;
alter table tasks add column if not exists priority text;
alter table tasks add column if not exists progress numeric;
alter table tasks add column if not exists planned_progress numeric;
alter table tasks add column if not exists start_date text;
alter table tasks add column if not exists actual_start_date text;
alter table tasks add column if not exists actual_end_date text;
alter table tasks add column if not exists end_date text;
alter table tasks add column if not exists outcome text;
alter table tasks add column if not exists organization_id text;

alter table plans add column if not exists metric jsonb;
alter table plans add column if not exists organization_id text;

alter table requirement_history add column if not exists requirement_id text;
alter table requirement_history add column if not exists status text;
alter table requirement_history add column if not exists timestamp text;
alter table requirement_history add column if not exists note text;
alter table requirement_history add column if not exists org_id text;
alter table requirement_history add column if not exists organization_id text;

alter table project_trackings add column if not exists followup_records jsonb;
alter table project_trackings add column if not exists organization_id text;
alter table project_trackings add column if not exists updated_at timestamp with time zone;
alter table project_trackings add column if not exists signed_date text;
alter table project_trackings add column if not exists followup_date text;
alter table project_trackings add column if not exists last_followup_date text;
alter table project_trackings add column if not exists expected_contract_amount numeric;
alter table project_trackings add column if not exists actual_contract_amount numeric;
alter table project_trackings add column if not exists contact_name text;
alter table project_trackings add column if not exists contact_phone text;

alter table release_goals add column if not exists actual_version text;
alter table release_goals add column if not exists actual_release_date text;
alter table release_goals add column if not exists note text;
alter table release_goals add column if not exists organization_id text;

alter table outcomes add column if not exists file_url text;
alter table outcomes add column if not exists organization_id text;

alter table organizations add column if not exists name text;
alter table projects add column if not exists manager_id text;

-- 3. 关闭行安全策略限制（RLS），授予读写权限一键自愈
alter table organizations disable row level security;
alter table groups disable row level security;
alter table members disable row level security;
alter table system_settings disable row level security;
alter table role_permissions disable row level security;
alter table projects disable row level security;
alter table plans disable row level security;
alter table tasks disable row level security;
alter table outcomes disable row level security;
alter table release_goals disable row level security;
alter table project_trackings disable row level security;
alter table requirements disable row level security;
alter table requirement_history disable row level security;
`}
                </pre>
                </details>
                <p className="mt-3 text-sm text-gray-600">执行位置：进入 <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer" className="underline hover:text-black font-semibold">Supabase Dashboard</a> -&gt; SQL Editor -&gt; New query -&gt; 粘贴代码并点击 <strong>RUN</strong>。</p>
             </div>
          )}

          {isRlsError && (
             <div className="mt-4 mb-8 bg-gray-100 p-4 rounded-xl text-left max-w-2xl w-full text-[#1A1A1A]">
               <p className="font-bold mb-2">💡 解决方案：请在您的 Supabase 项目中执行以下 SQL 语句，关闭全表的安全策略限制：</p>
               <pre className="text-xs p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
{`alter table organizations disable row level security;
alter table projects disable row level security;
alter table plans disable row level security;
alter table tasks disable row level security;
alter table outcomes disable row level security;
alter table requirements disable row level security;
alter table requirement_history disable row level security;
alter table release_goals disable row level security;
alter table project_trackings disable row level security;
alter table groups disable row level security;
alter table members disable row level security;
alter table system_settings disable row level security;
`}
               </pre>
               <p className="mt-3 text-sm text-gray-600">执行位置：进入 <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer" className="underline hover:text-black font-semibold">Supabase Dashboard</a> -&gt; SQL Editor -&gt; New query -&gt; 粘贴上述代码并点击 <strong>RUN</strong>。</p>
             </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1A1A1A] text-sm font-semibold tracking-wide text-white shadow-md hover:bg-black transition-colors"
            >
              确认已执行并重试
            </button>
            <button 
              onClick={switchToLocalMockMode} 
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm font-semibold text-gray-800 transition-colors"
            >
              一键降级为本地 Mock 演示模式
            </button>
          </div>
       </div>
    );
  }

  if (isLoadingData) {
    const cuteSteps = [
      "🛸 正在启动智慧看板的数据飞船...",
      "✨ 正在打扫任务看板，擦亮每个闪耀成果...",
      "🎨 正在调制今日看板的马卡龙色系...",
      "📊 正在把复杂的项目进度折叠成快乐的小星星...",
      "💼 正在用魔法棒精细校准本月度的经营指标...",
      "🧁 正在为您准备热咖啡，即将进入数字化管理大厅..."
    ];

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-6 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          {/* Animated Cute Robot SVG */}
          <div className="relative w-[140px] h-[140px] flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Keyframe Inline Styles */}
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-12px); }
                }
                @keyframes shadow {
                  0%, 100% { transform: scale(1); opacity: 0.15; }
                  50% { transform: scale(0.8); opacity: 0.08; }
                }
                @keyframes blink {
                  0%, 90%, 100% { transform: scaleY(1); }
                  55% { transform: scaleY(0.1); }
                }
                @keyframes pulseGlow {
                  0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 2px #EAB308); }
                  50% { opacity: 1; filter: drop-shadow(0 0 8px #EAB308); }
                }
                @keyframes spinSlow {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .float-robot {
                  animation: float 2.5s ease-in-out infinite;
                }
                .shadow-robot {
                  animation: shadow 2.5s ease-in-out infinite;
                  transform-origin: 70px 125px;
                }
                .eye-blink {
                  animation: blink 4s ease-in-out infinite;
                }
                .antenna-glow {
                  animation: pulseGlow 1.8s ease-in-out infinite;
                }
                .spin-star {
                  animation: spinSlow 8s linear infinite;
                  transform-origin: 105px 35px;
                }
                .cute-sparkle {
                  animation: float 3s ease-in-out infinite reverse;
                }
              `}</style>

              {/* Ground Shadow */}
              <ellipse className="shadow-robot" cx="70" cy="125" rx="32" ry="7" fill="#EADCC9" />

              {/* The Cute Floating Robot Body and Parts */}
              <g className="float-robot">
                {/* Tiny antenna line */}
                <path d="M70 42V30" stroke="#78716C" strokeWidth="4" strokeLinecap="round"/>
                {/* Antenna bulb (glowing yellow) */}
                <circle className="antenna-glow" cx="70" cy="24" r="7" fill="#EAB308" />
                
                {/* Left Ear / Speaker */}
                <rect x="25" y="60" width="8" height="16" rx="4" fill="#A8A29E" />
                {/* Right Ear / Speaker */}
                <rect x="107" y="60" width="8" height="16" rx="4" fill="#A8A29E" />

                {/* Main Robot Head/Body */}
                <rect x="30" y="42" width="80" height="66" rx="28" fill="#F5F5F4" stroke="#78716C" strokeWidth="4" />
                
                {/* Face Screen */}
                <rect x="40" y="52" width="60" height="34" rx="14" fill="#292524" />
                
                {/* Left Eye */}
                <circle cx="56" cy="68" r="5" fill="#2DD4BF" className="eye-blink" style={{ transformOrigin: "56px 68px" }} />
                {/* Right Eye */}
                <circle cx="84" cy="68" r="5" fill="#2DD4BF" className="eye-blink" style={{ transformOrigin: "84px 68px" }} />
                
                {/* Blush */}
                <circle cx="48" cy="78" r="3" fill="#FB7185" opacity="0.6" />
                <circle cx="92" cy="78" r="3" fill="#FB7185" opacity="0.6" />

                {/* Cute Smiling Mouth */}
                <path d="M66 76C66 78 68 79 70 79C72 79 74 78 74 76" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />

                {/* Hands (small cute nubs) */}
                <circle cx="21" cy="78" r="5" fill="#E7E5E4" stroke="#78716C" strokeWidth="3" />
                <circle cx="119" cy="78" r="5" fill="#E7E5E4" stroke="#78716C" strokeWidth="3" />
                
                {/* Heart on body */}
                <path d="M70 98L67 95C64 92 64 89.5 66.5 87C68 85.5 69.5 86 70 86.5C70.5 86 72 85.5 73.5 87C76 89.5 76 92 73 95L70 98Z" fill="#F43F5E" />
              </g>

              {/* Playful Decorative Sparkles */}
              <g className="spin-star">
                <path d="M105 27L106.5 31.5L111 33L106.5 34.5L105 39L103.5 34.5L99 33L103.5 31.5L105 27Z" fill="#FBBF24" />
              </g>
              <g className="cute-sparkle" style={{ animationDelay: "-1s" }}>
                <path d="M32 20L33 23L36 24L33 25L32 28L31 25L28 24L31 23L32 20Z" fill="#38BDF8" opacity="0.8" />
              </g>
            </svg>
          </div>

          <div className="space-y-4 w-full">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#1A1A1A] tracking-wide">
                主理人，正在为您加载数字化看板...
              </h3>
              <div className="text-[11px] leading-relaxed text-zinc-500/90 font-medium px-4 min-h-[32px] flex items-center justify-center transition-all duration-300">
                {cuteSteps[cuteStepIndex]}
              </div>
            </div>
          </div>

          {/* Fallback Options - Only reveals after delay if loading is abnormally slow */}
          {showSlowLoadingOption && (
            <div className="pt-4 border-t border-[#1A1A1A]/5 w-full flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-[10px] text-zinc-400">
                如果长时间未响应，您可以快速降级运行
              </p>
              <button 
                onClick={switchToLocalMockMode}
                className="px-3.5 py-1.5 text-[10px] font-semibold text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all rounded-lg"
              >
                💾 降级至本地 Mock 演示模式
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
    if (currentUser.department !== 'marketing' || !currentUser.roles.includes('组长')) {
      return;
    }
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
                projectId: projects[0]?.id || generateId(), // Default to first project
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
    upsertPlan('新增重点客户', 'signed', goalForm.signedClientsTarget, goalForm.signedClientsActual, '家');
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
    window.showToast?.('本月度经营指标与管理目标设定成功！', 'success');
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
      window.showToast?.('目标指标数值已修改成功', 'success');
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
      window.showToast?.('实际完成度与达成数值已更新！', 'success');
    }
  };



  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && selectedDepartment) {
      const proj = projects.find(p => p.category === selectedDepartment);
      
      const newTasks: Task[] = taskForms.filter(f => f.title.trim()).map(form => ({
        id: generateId(),
        projectId: proj ? proj.id : (projects[0]?.id || ''), // Fallback as empty string instead of random ID to map as NULL in supabase
        projectName: form.projectName,
        planId: plans[0]?.id || '', // Fallback as empty string instead of random ID to map as NULL in supabase
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
      window.showToast?.('新增周计划任务成功！', 'success');
    }
  };

  const handleOutcomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && selectedDepartment) {
      const proj = projects.find(p => p.category === selectedDepartment);
      
      const newOutcomes: Outcome[] = outcomeForms.filter(f => f.title.trim() && f.description.trim()).map(form => ({
        id: generateId(),
        projectId: proj ? proj.id : (projects[0]?.id || generateId()),
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
      window.showToast?.('产出成果提交成功，已呈报待审核', 'success');
    }
  };

  const handleReleaseGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseGoalForm.title || !releaseGoalForm.groupId || !releaseGoalForm.targetMonth || !releaseGoalForm.targetDate) return;
    const isRndLeader = currentUser.department === 'rnd' && currentUser.roles.includes('组长') && currentUser.groupId === releaseGoalForm.groupId;
    if (!isRndLeader) {
      return;
    }

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
      window.showToast?.(`发布目标${isNew ? '创建' : '更新'}成功！`, 'success');
    } catch (err) {
      console.warn('Failed to save release goal', err);
      window.showToast?.('保存发布目标异常，请稍后重试', 'error');
    }
  };

  const deleteReleaseGoal = async (id: string) => {
    const goal = releaseGoals.find(g => g.id === id);
    if (!goal) return;
    const isRndLeader = currentUser.department === 'rnd' && currentUser.roles.includes('组长') && currentUser.groupId === goal.groupId;
    if (!isRndLeader) return;

    try {
      await apiService.deleteReleaseGoal(id);
      setReleaseGoals(releaseGoals.filter(g => g.id !== id));
      window.showToast?.('发布目标已成功删除', 'info');
    } catch (err) {
      console.warn('Failed to delete release goal', err);
      window.showToast?.('删除发布目标失败', 'error');
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
          window.showToast?.('项目已终止跟进', 'info');
        } catch (err) {
          console.warn('Failed to terminate tracking', err);
          window.showToast?.('终止项目跟进操作失败', 'error');
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
        window.showToast?.('项目跟进状态更新成功', 'success');
      } catch (err) {
        console.warn('Failed to update tracking status', err);
        window.showToast?.('更新状态出错', 'error');
      }
    }
  };

  const restoreTracking = async (id: string) => {
    const tracking = projectTrackings.find(t => t.id === id);
    if (tracking) {
      const updated = { ...tracking, status: 'followup' as TrackingStatus, updatedAt: new Date().toISOString() };
      try {
        await apiService.saveProjectTracking(updated);
        setProjectTrackings(prev => prev.map(t => t.id === id ? updated : t));
        window.showToast?.('项目已恢复至跟进中状态', 'success');
      } catch (err) {
        console.warn('Failed to restore tracking', err);
        window.showToast?.('恢复项目失败', 'error');
      }
    }
  };

  const deleteTrackingPermanently = async (id: string) => {
    try {
      await apiService.deleteProjectTracking(id);
      setProjectTrackings(prev => prev.filter(t => t.id !== id));
      window.showToast?.('项目已被物理永久删除', 'success');
    } catch (err) {
      console.warn('Failed to delete tracking permanently', err);
      window.showToast?.('永久删除项目失败', 'error');
    }
  };

  const saveTracking = async (tracking: ProjectTracking) => {
    try {
      await apiService.saveProjectTracking(tracking);
      const isEdit = !!editingTrackingId;
      if (isEdit) {
        setProjectTrackings(prev => prev.map(t => t.id === editingTrackingId ? tracking : t));
      } else {
        setProjectTrackings(prev => [tracking, ...prev]);
      }
      setIsTrackingModalOpen(false);
      setEditingTrackingId(null);
      window.showToast?.(`跟进档案${isEdit ? '修改' : '登记'}成功！`, 'success');
    } catch (err) {
      console.warn('Failed to save tracking', err);
      const eObj = err as any;
      if (eObj.message && eObj.message.includes('security policy')) {
        setTrackingError('Supabase权限受限: 请在Supabase控制台关闭表 project_trackings 的 RLS，或添加匿名访问策略。');
      } else {
        setTrackingError('Failed to save tracking record: ' + (eObj.message || ''));
      }
      window.showToast?.('保存跟进失败，请检查登录或权限', 'error');
    }
  };

  const closeFollowupModal = () => {
    setIsFollowupModalOpen(false);
    setEditingFollowupId(null);
    if (selectedTrackingDetail) {
      setIsTrackingDetailModalOpen(true);
    }
  };

  const saveFollowup = async () => {
    if (editingTrackingId && followupForm.content) {
      const tracking = projectTrackings.find(t => t.id === editingTrackingId);
      if (tracking) {
        if (editingFollowupId) {
          // 修改需要二次确认
          setConfirmAction({
            type: 'update_followup',
            title: '确认修改跟进记录',
            message: '确定要保存对此跟进记录的修改吗？',
            onConfirm: async () => {
              const updatedRecords = (tracking.followupRecords || []).map(r => 
                r.id === editingFollowupId 
                  ? { ...r, date: followupForm.date || format(new Date(), 'yyyy-MM-dd'), content: followupForm.content } 
                  : r
              );
              const latestDate = updatedRecords.length > 0 ? updatedRecords[0].date : undefined;
              const updated = {
                  ...tracking,
                  lastFollowupDate: latestDate,
                  updatedAt: new Date().toISOString(),
                  followupRecords: updatedRecords
              };
              try {
                  await apiService.saveProjectTracking(updated);
                  setProjectTrackings(prev => prev.map(t => t.id === editingTrackingId ? updated : t));
                  setSelectedTrackingDetail(updated);
                  setIsFollowupModalOpen(false);
                  setEditingFollowupId(null);
                  setConfirmAction(null);
                  setIsTrackingDetailModalOpen(true);
                  window.showToast?.('跟进备注修改成功！', 'success');
              } catch(err) {
                  console.warn('Failed to update followup', err);
                  window.showToast?.('修改跟进记录保存失败', 'error');
              }
            }
          });
        } else {
          // 新增直接保存
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
              setSelectedTrackingDetail(updated);
              setIsFollowupModalOpen(false);
              setIsTrackingDetailModalOpen(true);
              window.showToast?.('关联商机跟进备注追加成功！', 'success');
          } catch(err) {
              console.warn('Failed to add followup', err);
              window.showToast?.('新增跟进记录保存失败', 'error');
          }
        }
      }
    }
  };

  const deleteFollowup = (followupId: string) => {
    if (editingTrackingId) {
      setConfirmAction({
        type: 'delete_followup',
        title: '确认删除跟进记录',
        message: '确定要删除此条跟进记录吗？此操作不可撤销。',
        onConfirm: async () => {
          const tracking = projectTrackings.find(t => t.id === editingTrackingId);
          if (tracking) {
            const updatedRecords = (tracking.followupRecords || []).filter(r => r.id !== followupId);
            const latestDate = updatedRecords.length > 0 ? updatedRecords[0].date : undefined;
            const updated = {
                ...tracking,
                lastFollowupDate: latestDate,
                updatedAt: new Date().toISOString(),
                followupRecords: updatedRecords
            };
            try {
                await apiService.saveProjectTracking(updated);
                setProjectTrackings(prev => prev.map(t => t.id === editingTrackingId ? updated : t));
                setSelectedTrackingDetail(updated);
                setConfirmAction(null);
                window.showToast?.('跟进记录删除成功', 'info');
            } catch(err) {
                console.warn('Failed to delete followup', err);
                window.showToast?.('删除跟进记录失败', 'error');
            }
          }
        }
      });
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
          submitterId: currentUser?.id || members[0]?.id || generateId(),
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
      window.showToast?.(`需求研发专项档案已${editingRequirementId ? '修改' : '创建'}成功！`, 'success');
    } catch (err) {
      console.warn('Failed to submit requirement:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
      window.showToast?.('提交需求失败: ' + errMsg, 'error');
      if (errMsg.includes('RLS受阻') || errMsg.includes('Could not find') || errMsg.includes('schema cache')) {
        setDataError(errMsg);
      }
    } finally {
      setIsSubmittingRequirement(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, reqId: string) => {
    reqHasTriggeredLongPressRef.current = false;
    const touch = e.touches[0];
    reqTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (reqLongPressTimerRef.current) {
      clearTimeout(reqLongPressTimerRef.current);
    }

    reqLongPressTimerRef.current = setTimeout(() => {
      reqHasTriggeredLongPressRef.current = true;
      setDraggedRequirementId(reqId);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(80);
        } catch (_) {}
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!reqTouchStartPosRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - reqTouchStartPosRef.current.x;
    const dy = touch.clientY - reqTouchStartPosRef.current.y;

    if (reqHasTriggeredLongPressRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }

      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      let parent: HTMLElement | null = elementUnderTouch as HTMLElement;
      let targetStatus: RequirementStatus | null = null;
      while (parent) {
        const colStat = parent.getAttribute('data-column-status');
        if (colStat) {
          targetStatus = colStat as RequirementStatus;
          break;
        }
        parent = parent.parentElement;
      }
      if (targetStatus) {
        setDragOverColumn(targetStatus);
      } else {
        setDragOverColumn(null);
      }
    } else {
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        if (reqLongPressTimerRef.current) {
          clearTimeout(reqLongPressTimerRef.current);
          reqLongPressTimerRef.current = null;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, reqId: string) => {
    if (reqLongPressTimerRef.current) {
      clearTimeout(reqLongPressTimerRef.current);
      reqLongPressTimerRef.current = null;
    }

    if (reqHasTriggeredLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();

      if (dragOverColumn) {
        updateRequirementStatus(reqId, dragOverColumn);
      }

      setDraggedRequirementId(null);
      setDragOverColumn(null);
      reqHasTriggeredLongPressRef.current = false;
    }
    
    reqTouchStartPosRef.current = null;
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
        window.showToast?.('需求跟进状态已更新成功！', 'success');
      } catch (err) {
        console.warn('Failed to update status:', err);
        window.showToast?.('变更需求状态失败，请联系管理员', 'error');
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
      window.showToast?.('已成功驳回该核心需求申报', 'warning');
    } catch (err) {
      console.warn('Failed to reject requirement:', err);
      window.showToast?.('驳回需求异常', 'error');
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
        window.showToast?.('已将该需求移入需求回收站', 'info');
      } catch (err) {
        console.warn('Failed to delete requirement:', err);
        window.showToast?.('删除需求操作失败', 'error');
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
        window.showToast?.('需求档案已成功恢复！', 'success');
      } catch (err) {
        console.warn('Failed to restore requirement:', err);
        window.showToast?.('还原需求异常', 'error');
      }
    }
  };

  const filteredProjects = projects.filter(p => currentView === 'dashboard' || p.category === currentView);
  const projectIds = filteredProjects.map(p => p.id);

  const quarterPlans = plans.filter(p => p.level === 'quarter' && projectIds.includes(p.projectId));
  const monthPlans = plans.filter(p => p.level === 'month' && projectIds.includes(p.projectId));




  const totalProgress = filteredProjects.reduce((acc, curr) => acc + curr.progress, 0);

  const viewOutcomes = outcomes.filter(o => {
    if (currentView === 'dashboard') return true;
    const project = projects.find(p => p.id === o.projectId);
    const submitter = members.find(m => m.id === o.submitterId);
    const category = project?.category || submitter?.department;
    return category === currentView;
  });

  // Funnel Data Calculation
  const CURRENT_MONTH = selectedMonth;
  const CURRENT_YEAR = selectedMonth.split('-')[0];
  
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

  // Project tracking data is no longer linked to global dashboard metrics
  const isMarketingCleared = false;

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
  const yearTargetLeadClients = yearLeadPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  
  const yearLeadClients = yearLeadPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const yearActivePlans = plans.filter(p => p.metric?.funnelStage === 'active' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetActiveClients = yearActivePlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const yearActiveClients = yearActivePlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const yearSignedPlans = plans.filter(p => p.metric?.funnelStage === 'signed' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetSignedClients = yearSignedPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const yearSignedClients = yearSignedPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const yearLostPlans = plans.filter(p => p.metric?.funnelStage === 'lost' && p.level === 'month' && p.startDate.startsWith(CURRENT_YEAR));
  const yearTargetLostClients = yearLostPlans.reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const yearLostClients = yearLostPlans.reduce((acc, curr) => acc + (curr.metric?.actualCompleted !== undefined ? curr.metric.actualCompleted : curr.metric?.current || 0), 0);

  const funnelData = [
    { name: '潜在线索', value: yearLeadClients },
    { name: '意向沟通', value: yearActiveClients },
    { name: '实际签约', value: yearSignedClients }
  ];

  // Quarterly Calculations
  const quarterMonths = getQuarterMonths(selectedQuarter);
  const globalQuarterPlans = plans.filter(p => 
      (p.level === 'quarter' && p.startDate.startsWith(selectedQuarter.split('-')[0])) ||
      (p.level === 'month' && quarterMonths.some(m => p.startDate.startsWith(m)))
  );
  
  const quarterTargetProfit = globalQuarterPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const quarterActualProfit = isMarketingCleared ? 0 : globalQuarterPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  
  const quarterTargetContract = globalQuarterPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const quarterActualContract = isMarketingCleared ? 0 : globalQuarterPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  
  // Marketing Monthly Calculations
  const marketingProjects = projects.filter(p => p.category === 'marketing');
  const mktProjectIds = marketingProjects.map(p => p.id);
  const marketingMonthPlans = plans.filter(p => p.level === 'month' && p.startDate.startsWith(selectedMonth) && mktProjectIds.includes(p.projectId));
  const mktTargetProfit = marketingMonthPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
  const mktActualProfit = isMarketingCleared ? 0 : marketingMonthPlans.filter(p => p.title.includes('利润')).reduce((acc, curr) => acc + (curr.metric?.actualCompleted ?? curr.metric?.current ?? 0), 0);
  const mktTargetContract = marketingMonthPlans.filter(p => p.title.includes('合同')).reduce((acc, curr) => acc + (curr.metric?.target || 0), 0) || 0;
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
    actual: isMarketingCleared ? 0 : (profitMap[month]?.actual || 0)
  }));

  // Chart 2: Task Status Pie Data
  const taskStatusData = [
    { name: '待开始/搁置', value: tasks.filter(t => t.status === 'not_started').length },
    { name: '进行中', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: '已验收交付', value: tasks.filter(t => t.status === 'completed').length },
  ];
  const PIE_COLORS = ['#d1d5db', '#3f3f46', '#22c55e'];

  // R&D Release Stats Calculation
  const rndVisibleGroupsList = groups.filter(g => g.category === 'rnd' && (isSystemAdmin || g.id === currentUser?.groupId));
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

  if (false) {
    const isRlsError = dataError.includes('RLS受阻') || dataError.includes('row-level security');
    const isMissingColumn = dataError.includes('Could not find') || dataError.includes('schema cache') || dataError.includes('column') || dataError.includes('relation');
    const columnNameMatch = dataError.match(/column ["']([^"']+)["']/i) || dataError.match(/column ([^ ]+)/i) || dataError.match(/'([^']+)' column/i);
    const tableNameMatch = dataError.match(/relation ["']([^"']+)["']/i) || dataError.match(/of ["']([^"']+)["']/i) || dataError.match(/of '([^']+)'/i);
    const colName = columnNameMatch ? columnNameMatch[1] : '缺失字段';
    const tabName = tableNameMatch ? tableNameMatch[1] : '该表';
    
    return (
       <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFCFB] text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">{isRlsError ? 'Supabase 权限限制 (RLS受阻)' : '数据加载失败'}</h2>
          <p className="opacity-70 mb-4 max-w-lg text-left">{dataError}</p>
          
          {isMissingColumn && (
             <div className="mt-4 mb-4 bg-gray-100 p-4 rounded-xl text-left max-w-2xl w-full text-[#1A1A1A]">
                <p className="font-bold mb-2">💡 解决方案：请在您的 Supabase 项目中执行以下 SQL 语句，补充缺失的字段：</p>
                <pre className="text-xs p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
                  {`alter table "${tabName}" add column if not exists "${colName}" jsonb;`}
                </pre>
                <details className="mt-4 cursor-pointer">
                  <summary className="font-bold text-[#1A1A1A] underline">如果仍然报错，请点击此处复制完整数据库更新脚本（一键补齐所有缺失字段与设置表格）</summary>
                  <pre className="mt-2 text-[10px] p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
                    {`
-- 1. 创建核心基础设施与业务表格
create table if not exists organizations (
  id text primary key,
  name text
);

create table if not exists groups (
  id text primary key,
  name text,
  category text,
  organization_id text
);

create table if not exists members (
  id text primary key,
  name text,
  avatar text,
  roles text,
  department text,
  group_id text,
  account text,
  password text,
  organization_id text
);

create table if not exists system_settings (
  id text primary key,
  authorized_companies text,
  annual_target_profit numeric,
  guide_content text,
  organization_id text
);

create table if not exists role_permissions (
  role_name text primary key,
  permissions text,
  organization_id text
);

create table if not exists projects (
  id text primary key,
  title text not null,
  description text,
  category text,
  manager_id text,
  organization_id text
);

create table if not exists plans (
  id text primary key,
  project_id text,
  title text not null,
  level text,
  parent_id text,
  start_date text,
  end_date text,
  status text,
  progress numeric,
  metric jsonb,
  organization_id text
);

create table if not exists tasks (
  id text primary key,
  project_id text,
  plan_id text,
  title text not null,
  assignee_id text,
  status text,
  priority text,
  progress numeric,
  planned_progress numeric,
  start_date text,
  actual_start_date text,
  actual_end_date text,
  end_date text,
  outcome text,
  project_name text,
  organization_id text
);

create table if not exists outcomes (
  id text primary key,
  project_id text,
  title text not null,
  description text,
  submitter_id text,
  date text,
  status text,
  file_url text,
  organization_id text
);

create table if not exists release_goals (
  id text primary key,
  group_id text,
  title text not null,
  target_month text,
  target_date text,
  actual_version text,
  actual_release_date text,
  status text,
  note text,
  created_at text,
  organization_id text
);

create table if not exists project_trackings (
  id text primary key,
  customer_name text not null,
  status text,
  product text,
  city_manager text,
  project_manager text,
  expected_contract_amount numeric,
  actual_contract_amount numeric,
  contact_name text,
  contact_phone text,
  last_followup_date text,
  followup_records jsonb,
  organization_id text,
  updated_at timestamp with time zone,
  signed_date text,
  followup_date text
);

create table if not exists requirements (
  id text primary key,
  project_id text,
  title text not null,
  description text,
  priority text,
  status text,
  source text,
  submitter_id text,
  assignee_id text,
  created_at text,
  updated_at text,
  serial_number text,
  link_url text,
  customer_name text,
  internal_source_detail text,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  org_id text,
  organization_id text
);

create table if not exists requirement_history (
  id text primary key,
  requirement_id text,
  status text,
  timestamp text,
  note text,
  org_id text,
  organization_id text
);

-- 2. 字段兼容性自愈修复（针对已有旧表补全缺失列）
alter table requirements add column if not exists serial_number text;
alter table requirements add column if not exists project_id text;
alter table requirements add column if not exists link_url text;
alter table requirements add column if not exists customer_name text;
alter table requirements add column if not exists internal_source_detail text;
alter table requirements add column if not exists submitter_id text;
alter table requirements add column if not exists assignee_id text;
alter table requirements add column if not exists deleted boolean;
alter table requirements add column if not exists deleted_at timestamp with time zone;
alter table requirements add column if not exists org_id text;
alter table requirements add column if not exists organization_id text;

alter table tasks add column if not exists project_name text;
alter table tasks add column if not exists plan_id text;
alter table tasks add column if not exists title text;
alter table tasks add column if not exists assignee_id text;
alter table tasks add column if not exists status text;
alter table tasks add column if not exists priority text;
alter table tasks add column if not exists progress numeric;
alter table tasks add column if not exists planned_progress numeric;
alter table tasks add column if not exists start_date text;
alter table tasks add column if not exists actual_start_date text;
alter table tasks add column if not exists actual_end_date text;
alter table tasks add column if not exists end_date text;
alter table tasks add column if not exists outcome text;
alter table tasks add column if not exists organization_id text;

alter table plans add column if not exists metric jsonb;
alter table plans add column if not exists organization_id text;

alter table requirement_history add column if not exists requirement_id text;
alter table requirement_history add column if not exists status text;
alter table requirement_history add column if not exists timestamp text;
alter table requirement_history add column if not exists note text;
alter table requirement_history add column if not exists org_id text;
alter table requirement_history add column if not exists organization_id text;

alter table project_trackings add column if not exists followup_records jsonb;
alter table project_trackings add column if not exists organization_id text;
alter table project_trackings add column if not exists updated_at timestamp with time zone;
alter table project_trackings add column if not exists signed_date text;
alter table project_trackings add column if not exists followup_date text;
alter table project_trackings add column if not exists last_followup_date text;
alter table project_trackings add column if not exists expected_contract_amount numeric;
alter table project_trackings add column if not exists actual_contract_amount numeric;
alter table project_trackings add column if not exists contact_name text;
alter table project_trackings add column if not exists contact_phone text;

alter table release_goals add column if not exists actual_version text;
alter table release_goals add column if not exists actual_release_date text;
alter table release_goals add column if not exists note text;
alter table release_goals add column if not exists organization_id text;

alter table outcomes add column if not exists file_url text;
alter table outcomes add column if not exists organization_id text;

alter table organizations add column if not exists name text;
alter table projects add column if not exists manager_id text;

-- 3. 关闭行安全策略限制（RLS），授予读写权限一键自愈
alter table organizations disable row level security;
alter table groups disable row level security;
alter table members disable row level security;
alter table system_settings disable row level security;
alter table role_permissions disable row level security;
alter table projects disable row level security;
alter table plans disable row level security;
alter table tasks disable row level security;
alter table outcomes disable row level security;
alter table release_goals disable row level security;
alter table project_trackings disable row level security;
alter table requirements disable row level security;
alter table requirement_history disable row level security;
`}
                  </pre>
                </details>
                <p className="mt-3 text-sm text-gray-600">执行位置：进入 <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer" className="underline hover:text-black font-semibold">Supabase Dashboard</a> -&gt; SQL Editor -&gt; New query -&gt; 粘贴代码并点击 <strong>RUN</strong>。</p>
             </div>
          )}�

          {isRlsError && (
             <div className="mt-4 mb-8 bg-gray-100 p-4 rounded-xl text-left max-w-2xl w-full text-[#1A1A1A]">
               <p className="font-bold mb-2">💡 解决方案：请在您的 Supabase 项目中执行以下 SQL 语句，关闭全表的安全策略限制：</p>
               <pre className="text-xs p-4 bg-black text-green-400 rounded overflow-x-auto whitespace-pre-wrap">
{`alter table organizations disable row level security;
alter table projects disable row level security;
alter table plans disable row level security;
alter table tasks disable row level security;
alter table outcomes disable row level security;
alter table requirements disable row level security;
alter table requirement_history disable row level security;
alter table release_goals disable row level security;
alter table project_trackings disable row level security;
alter table groups disable row level security;
alter table members disable row level security;
alter table system_settings disable row level security;
`}
               </pre>
               <p className="mt-3 text-sm text-gray-600">执行位置：进入 <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer" className="underline hover:text-black font-semibold">Supabase Dashboard</a> -&gt; SQL Editor -&gt; New query -&gt; 粘贴上述代码并点击 <strong>RUN</strong>。</p>
             </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1A1A1A] text-sm font-semibold tracking-wide text-white shadow-md hover:bg-black transition-colors"
            >
              确认已执行并重试
            </button>
            <button 
              onClick={switchToLocalMockMode} 
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm font-semibold text-gray-800 transition-colors"
            >
              一键降级为本地 Mock 演示模式
            </button>
          </div>
       </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-dynamic-minimal text-[#1A1A1A] font-sans flex flex-col selection:bg-[#1A1A1A] selection:text-[#FAFAF9] overflow-hidden antialiased">
      {/* Header */}
      <header className="flex justify-between items-center px-4 sm:px-6 lg:px-10 py-4 sm:py-6 border-b border-[#1A1A1A] shrink-0 z-40 bg-[#F7F6F2]">
        <div className="flex justify-between items-center w-full md:w-auto">
          <Logo iconSize="md" />
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
            {currentUserPermissions.includes('MANAGE_SYSTEM_SETTINGS') && (
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setIsIntroOpen(true)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center text-[#1A1A1A]"
              title="功能图谱介绍"
            >
              <Compass className="w-5 h-5" />
            </button>
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
            {currentUserPermissions.includes('VIEW_DASHBOARD') && (
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-1.5 rounded-full transition-all duration-200 ${currentView === 'dashboard' ? 'bg-[#1A1A1A] text-white shadow-md' : 'opacity-60 hover:opacity-100 hover:bg-[#1A1A1A]/5'}`}
              >
                全局总览
              </button>
            )}
            
            {currentUserPermissions.includes('VIEW_TRACKING') && (
              <button 
                onClick={() => setCurrentView('tracking')}
                className={`px-3 py-1.5 rounded-full transition-all duration-200 ${currentView === 'tracking' ? 'bg-[#1A1A1A] text-white shadow-md' : 'opacity-60 hover:opacity-100 hover:bg-[#1A1A1A]/5'}`}
              >
                项目跟踪
              </button>
            )}
            
            {[{id: 'marketing', name: '市场开拓', perm: 'VIEW_MARKETING'}, {id: 'rnd', name: '产品研发', perm: 'VIEW_RND'}, {id: 'requirements', name: '需求池', perm: 'VIEW_REQUIREMENTS'}]
              .filter(dept => currentUserPermissions.includes(dept.perm))
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
          {currentUserPermissions.includes('MANAGE_SYSTEM_SETTINGS') && (
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center"
              title="设置"
            >
              <Settings className="w-[15px] h-[15px]" />
            </button>
          )}
          <button 
            onClick={() => setIsIntroOpen(true)}
            className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1.5 font-sans"
            title="产品图谱与介绍"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>介绍</span>
          </button>
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
        {/* Mobile Sub-view Switcher for multiple views */}
        {(currentView === 'marketing' || currentView === 'rnd' || currentView === 'requirements' || currentView === 'dashboard') && (
          <div className="lg:hidden w-full px-4 pt-4 bg-[#F7F6F2] border-b border-[#1A1A1A]/10 sticky top-0 z-30 flex justify-center pb-2 shrink-0">
            <div className="flex bg-[#1A1A1A]/5 p-1 rounded-xl w-full max-w-sm border border-[#1A1A1A]/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => {
                  setMobileSubTab('kanban');
                  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(10);
                  }
                }}
                className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-200 tracking-wider flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  mobileSubTab === 'kanban' 
                    ? 'bg-[#1A1A1A] text-[#F7F6F2] shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-[1.02]' 
                    : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                }`}
              >
                {currentView === 'dashboard' ? (
                  <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <Trello className="w-3.5 h-3.5" strokeWidth={2.5} />
                )}
                <span>
                  {currentView === 'dashboard' ? '大盘数据' : currentView === 'requirements' ? '需求看板' : currentView === 'marketing' ? '跟进看板' : '任务看板'}
                </span>
              </button>
              <button
                onClick={() => {
                  setMobileSubTab('overview');
                  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(10);
                  }
                }}
                className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-200 tracking-wider flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  mobileSubTab === 'overview' 
                    ? 'bg-[#1A1A1A] text-[#F7F6F2] shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-[1.02]' 
                    : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                }`}
              >
                {currentView === 'dashboard' ? (
                  <Target className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
                )}
                <span>
                  {currentView === 'dashboard' ? '目标推进' : currentView === 'requirements' ? '指标统计' : '指标与数据'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Sidebar / Planning Column - Only show if not in tracking view */}
        <section className={`lg:col-span-3 lg:border-r border-[#1A1A1A]/10 bg-[#FCFCFA]/45 backdrop-blur-sm p-4 sm:p-6 lg:p-8 flex flex-col border-b lg:border-b-0 h-auto lg:h-full lg:overflow-y-auto ${
          currentView === 'tracking'
            ? 'hidden'
            : (currentView === 'marketing' || currentView === 'rnd' || currentView === 'requirements' || currentView === 'dashboard')
              ? (mobileSubTab === 'kanban' ? 'hidden lg:flex' : 'flex')
              : 'flex'
        } ${currentView === 'dashboard' ? 'order-2 lg:order-1' : ''}`}>
          <div className="mb-10 lg:mb-auto flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-extrabold flex items-center text-[#1A1A1A]/80">
                <span className="w-2.5 h-2.5 bg-[#1A1A1A] mr-3 rounded-sm scale-90"></span> {currentView === 'dashboard' ? `${selectedQuarter.split('-')[0]}年 ${selectedQuarter.split('-')[1]} 核心目标` : currentView === 'requirements' ? `${reqTimeFrame === 'month' ? selectedMonth.split('-')[0] + '年' + selectedMonth.split('-')[1] + '月' : reqTimeFrame === 'quarter' ? selectedQuarter.split('-')[0] + '年 ' + selectedQuarter.split('-')[1] : selectedYear + '年'} 需求统计` : `${selectedMonth.split('-')[0]}年${selectedMonth.split('-')[1]}月 目标`}
              </h2>
              <div className="flex items-center gap-2">
                {currentView === 'requirements' && (
                  <div className="flex gap-1 border border-[#1A1A1A]/10 p-0.5 bg-black/[0.03] rounded-xl">
                    {[
                      { id: 'month', label: '月度' },
                      { id: 'quarter', label: '季度' },
                      { id: 'year', label: '年度' }
                    ].map(tf => (
                      <button
                        key={tf.id}
                        onClick={() => setReqTimeFrame(tf.id as any)}
                        className={`text-[9px] px-3 py-1 font-bold uppercase tracking-widest transition-all rounded-lg ${reqTimeFrame === tf.id ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-black/5'}`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                )}
                 {currentView === 'marketing' && (currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                  <button 
                    onClick={openGoalModal}
                    className="text-[9px] border-2 border-[#1A1A1A] px-3 py-1.5 uppercase tracking-widest font-bold rounded-xl bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer shrink-0 shadow-[2px_2px_0px_#1A1A1A]"
                  >
                    设定市场指标
                  </button>
                )}
              </div>
            </div>

            {(currentView === 'dashboard' || (currentView === 'requirements' && reqTimeFrame === 'quarter')) && (
              <div className="mb-6 flex items-start">
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/10 bg-black/[0.03] hover:bg-black/[0.06] transition-colors rounded-xl px-2 py-0.5 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedQuarter.split('-')[0]) + 1;
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5 font-mono">{selectedQuarter.split('-')[0]}</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedQuarter.split('-')[0]) - 1;
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▼</button>
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
                      className={`text-[10px] px-4 py-2 whitespace-nowrap border rounded-xl transition-all duration-200 focus:outline-none cursor-pointer font-sans font-bold ${isSelected ? 'bg-[#1A1A1A] text-white border-transparent shadow-sm scale-110' : 'bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/85 hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30'}`}
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
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/10 bg-black/[0.03] hover:bg-black/[0.06] transition-colors rounded-xl px-2 py-0.5 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedMonth.split('-')[0]) + 1;
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5 font-mono">{selectedMonth.split('-')[0]}</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedMonth.split('-')[0]) - 1;
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▼</button>
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
                      className={`text-[10px] px-3.5 py-1.5 whitespace-nowrap border rounded-xl transition-all duration-200 focus:outline-none cursor-pointer font-sans font-bold ${isSelected ? 'bg-[#1A1A1A] text-white border-transparent shadow-sm scale-110' : 'bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/85 hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30'}`}
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
                <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/10 bg-black/[0.03] hover:bg-black/[0.06] transition-colors rounded-xl px-2 py-0.5 select-none mr-3 shrink-0">
                  <button onClick={() => {
                    const newYear = parseInt(selectedYear) + 1;
                    setSelectedYear(`${newYear}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▲</button>
                  <span className="text-[10px] font-bold shrink-0 uppercase tracking-widest leading-none my-0.5 font-mono">年份</span>
                  <button onClick={() => {
                    const newYear = parseInt(selectedYear) - 1;
                    setSelectedYear(`${newYear}`);
                    setSelectedQuarter(`${newYear}-${selectedQuarter.split('-')[1]}`);
                    setSelectedMonth(`${newYear}-${selectedMonth.split('-')[1]}`);
                  }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-black focus:outline-none transition-opacity px-2 py-0.5 leading-none cursor-pointer">▼</button>
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
                      className={`text-[10px] px-4 py-2 whitespace-nowrap border rounded-xl transition-all duration-200 focus:outline-none cursor-pointer font-sans font-bold ${isSelected ? 'bg-[#1A1A1A] text-white border-transparent shadow-sm scale-110' : 'bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/85 hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30'}`}
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
                <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 mb-4 flex items-center gap-2 font-sans">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {selectedMonth} 月度核心指标达成
                </h3>
                <div className="flex flex-col gap-3">
                  {/* Profit */}
                  {(() => {
                    const pct = currentMonthTargetProfit > 0 ? Math.min(100, Math.round((currentMonthActualProfit / currentMonthTargetProfit) * 100)) : 0;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">利润额</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">万元</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold">{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className="text-black">{currentMonthActualProfit}</strong></span>
                          <span>目标: {currentMonthTargetProfit}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Contract */}
                  {(() => {
                    const pct = currentMonthTargetContract > 0 ? Math.min(100, Math.round((currentMonthActualContract / currentMonthTargetContract) * 100)) : 0;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">合同签署额</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">万元</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold">{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className="text-black">{currentMonthActualContract}</strong></span>
                          <span>目标: {currentMonthTargetContract}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Collection */}
                  {(() => {
                    const pct = currentMonthTargetCollection > 0 ? Math.min(100, Math.round((currentMonthActualCollection / currentMonthTargetCollection) * 100)) : 0;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">渠道回款完成</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">万元</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold">{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className="text-black">{currentMonthActualCollection}</strong></span>
                          <span>目标: {currentMonthTargetCollection}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Lead */}
                  {(() => {
                    const pct = targetLeadClients > 0 ? Math.min(100, Math.round((currentLeadClients / targetLeadClients) * 100)) : 0;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">潜在客户挖掘</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">家</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold">{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className="text-black">{currentLeadClients}</strong></span>
                          <span>目标: {targetLeadClients}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Active */}
                  {(() => {
                    const pct = targetActiveClients > 0 ? Math.min(100, Math.round((currentActiveClients / targetActiveClients) * 100)) : 0;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">意向客户跟进</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">家</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold">{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className="text-black">{currentActiveClients}</strong></span>
                          <span>目标: {targetActiveClients}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Lost */}
                  {(() => {
                    const pct = targetLostClients > 0 ? Math.min(100, Math.round((currentLostClients / targetLostClients) * 100)) : 0;
                    const isOver = targetLostClients > 0 && currentLostClients > targetLostClients;
                    return (
                      <div className="flex flex-col p-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-black/[0.01] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1A1A]">客户流失控制</span>
                            <span className="text-[10px] text-[#1A1A1A]/50 bg-black/5 px-1.5 py-0.5 rounded font-mono shrink-0">家</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${isOver ? 'text-red-500 animate-pulse' : ''}`}>{pct}%</span>
                            {(currentUser.department === 'marketing' && currentUser.roles.includes('组长')) && (
                              <button onClick={openGoalModal} className="opacity-100 sm:opacity-0 group-hover:opacity-100 whitespace-nowrap text-[8px] uppercase border border-[#1A1A1A] bg-white rounded-md px-1.5 py-0.5 transition-opacity cursor-pointer shadow-sm hover:bg-[#1A1A1A] hover:text-white">录入</button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-[#1A1A1A]/60 font-mono">
                          <span>实际: <strong className={`text-black ${isOver ? 'text-red-600 font-extrabold' : ''}`}>{currentLostClients}</strong></span>
                          <span>上限: {targetLostClients}</span>
                        </div>
                        <div className="w-full mt-2 bg-black/[0.04] h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${isOver ? 'bg-red-500' : 'bg-rose-400'} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            
            {currentView === 'rnd' && (
              <div className="mb-8 border-b border-[#1A1A1A]/10 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 flex items-center gap-2 font-sans">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                    {selectedMonth} 上线产品数据看板
                  </h3>
                  {(currentUser.department === 'rnd' && currentUser.roles.includes('组长')) && (
                    <button onClick={() => {
                      setEditingReleaseGoal(null);
                      setReleaseGoalForm({
                        title: '', targetMonth: selectedMonth, targetDate: '', status: 'planned', 
                        groupId: currentUser.groupId
                      });
                      setIsReleaseGoalModalOpen(true);
                    }} className="text-[9px] border-2 border-[#1A1A1A] px-3 py-1.5 uppercase tracking-widest font-bold rounded-xl bg-white hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 cursor-pointer shadow-[2px_2px_0px_#1A1A1A]">
                      设定发布目标
                    </button>
                  )}
                </div>
                
                {/* Stats Summary Panel */}
                <div className="mb-6 grid grid-cols-2 gap-4 p-4 rounded-3xl border border-[#1A1A1A]/10 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                  <div className="flex flex-col border-r border-[#1A1A1A]/5 pr-2">
                    <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 font-extrabold mb-1 font-sans">当月总目标</span>
                    <span className="text-3xl font-bold font-mono tracking-tight text-[#1A1A1A]">{rndReleaseStats.totalTarget} <span className="text-xs font-normal text-[#1A1A1A]/50 font-sans">个</span></span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 font-extrabold mb-1 font-sans">当月实际上线</span>
                    <span className="text-3xl font-bold font-mono tracking-tight text-emerald-600">{rndReleaseStats.totalReleased} <span className="text-xs font-normal text-emerald-600/60 font-sans">个</span></span>
                  </div>
                  
                  {/* Group breakdown */}
                  <div className="col-span-2 border-t border-[#1A1A1A]/5 pt-3 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 font-extrabold mb-2 font-sans">各研发团队进度明细</span>
                    <div className="grid grid-cols-2 gap-2">
                      {rndReleaseStats.groups.length > 0 ? rndReleaseStats.groups.map(g => {
                        const pct = g.target > 0 ? Math.min(100, Math.round((g.released / g.target) * 100)) : 0;
                        return (
                          <div key={g.id} className="flex flex-col bg-black/[0.02] p-2 rounded-xl border border-black/[0.02]">
                             <div className="flex items-center justify-between text-[10px] mb-1">
                               <span className="font-bold text-[#1A1A1A]/85 font-sans">{g.name}</span>
                               <span className="font-mono font-bold text-[#1A1A1A]/60">
                                 <span className="text-emerald-600">{g.released}</span> / <span>{g.target}</span>
                               </span>
                             </div>
                             <div className="h-1 bg-black/[0.05] rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                             </div>
                          </div>
                        );
                      }) : (
                        <span className="text-[9px] opacity-40 italic col-span-2">暂无研发小组</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {releaseGoals.filter(g => g.targetMonth === selectedMonth && (isSystemAdmin || currentUser.groupId === g.groupId)).length > 0 ? (
                    pruneDuplicates(releaseGoals.filter(g => g.targetMonth === selectedMonth && (isSystemAdmin || currentUser.groupId === g.groupId))).map(goal => {
                      const group = groups.find(g => g.id === goal.groupId);
                      const canEdit = currentUser.groupId === goal.groupId && currentUser.roles.includes('组长');
                      return (
                        <div key={goal.id} className="bg-white border border-[#1A1A1A]/10 p-4 rounded-2xl hover:shadow-md hover:border-[#1A1A1A]/30 transition-all duration-200 group relative cursor-pointer" onClick={() => {
                          if (!canEdit) return;
                          setEditingReleaseGoal(goal);
                          setReleaseGoalForm(goal);
                          setIsReleaseGoalModalOpen(true);
                        }}>
                          {canEdit && (
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); deleteReleaseGoal(goal.id); }} className="text-[#1A1A1A]/50 hover:text-red-600 text-sm font-bold bg-black/5 hover:bg-red-50 w-5 h-5 flex items-center justify-center rounded-full transition-colors">×</button>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-3 mb-2">
                             <div className="flex flex-col gap-1 w-full overflow-hidden">
                               <div 
                                 className="text-xs font-bold leading-tight text-[#1A1A1A] prose prose-sm prose-black max-w-none [&>p]:m-0"
                                 dangerouslySetInnerHTML={{ __html: goal.title }}
                               />
                               <span className="text-[9px] font-mono opacity-50 uppercase tracking-wider font-semibold">{group?.name || '未知小组'}</span>
                             </div>
                             <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg shrink-0 border ${
                               goal.status === 'released' 
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                 : goal.status === 'delayed' 
                                   ? 'bg-red-50 text-red-700 border-red-200' 
                                   : 'bg-amber-50 text-amber-700 border-amber-200'
                             }`}>
                                {goal.status === 'planned' ? '计划中' : goal.status === 'released' ? '已上线' : '已延期'}
                             </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 border-t border-black/[0.03] pt-2.5 mt-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] opacity-40 uppercase tracking-widest font-extrabold font-sans">预估时间</span>
                              <span className="text-[10px] font-mono text-black/70 font-semibold">{goal.targetDate || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] opacity-40 uppercase tracking-widest font-extrabold font-sans">实际版本与交付时间</span>
                              <span className="text-[10px] font-mono font-bold text-black">{goal.actualVersion ? `${goal.actualVersion} (${goal.actualReleaseDate})` : '-'}</span>
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
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 mb-10">
                <div className="flex flex-col gap-6">
                  {/* Core Metrics Grid */}
                  <div className="border border-[#1A1A1A]/10 p-5 bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 flex items-center gap-2 font-sans">
                         <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 核心需求指标数据
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col bg-[#F9F9FB] p-3 rounded-2xl border border-[#1A1A1A]/5">
                        <span className="text-3xl font-bold font-mono tracking-tight text-slate-800">{activeMonthReqs.length}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 mt-1 font-extrabold font-sans">需求总计</span>
                      </div>
                      <div className="flex flex-col bg-[#F9F9FB] p-3 rounded-2xl border border-[#1A1A1A]/5">
                        <span className="text-3xl font-bold font-mono tracking-tight text-[#1A1A1A]">{activeMonthReqs.filter(r => r.status === 'backlog').length}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 mt-1 font-extrabold font-sans">待评审数</span>
                      </div>
                      <div className="flex flex-col bg-[#F9F9FB] p-3 rounded-2xl border border-[#1A1A1A]/5">
                        <span className="text-3xl font-bold font-mono tracking-tight text-[#1A1A1A]">{activeMonthReqs.filter(r => ['approved', 'planned'].includes(r.status)).length}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 mt-1 font-extrabold font-sans">开发中 / 排期</span>
                      </div>
                      <div className="flex flex-col bg-emerald-50/40 p-3 rounded-2xl border border-emerald-500/15">
                        <span className="text-3xl font-bold font-mono tracking-tight text-emerald-600">{activeMonthReqs.length > 0 ? Math.round((activeMonthReqs.filter(r => r.status === 'completed').length / activeMonthReqs.length) * 100) : 0}%</span>
                        <span className="text-[9px] uppercase tracking-wider text-emerald-700/60 mt-1 font-extrabold font-sans">交付率</span>
                      </div>
                    </div>
                  </div>

                  {/* Status distribution chart */}
                  <div className="bg-white border border-[#1A1A1A]/10 p-5 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-[240px] flex flex-col">
                    <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 mb-5 flex items-center gap-2 font-sans">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 需求生命周期看板
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
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} hide />
                          <Tooltip 
                            contentStyle={{ fontSize: '10px', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '6px 10px', backgroundColor: '#FFF', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.01)' }}
                          />
                          <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-white border border-[#1A1A1A]/10 p-5 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 mb-5 flex items-center gap-2 font-sans">
                       <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 业务优先级覆盖
                    </h3>
                    <div className="space-y-4">
                      {[
                        { name: 'P0 - 紧急响应', count: activeMonthReqs.filter(r => r.priority === 'high').length, bgColor: 'bg-rose-500', textColor: 'text-rose-600', badgeBag: 'bg-rose-50 border-rose-100' },
                        { name: 'P1 - 核心需求', count: activeMonthReqs.filter(r => r.priority === 'medium').length, bgColor: 'bg-amber-500', textColor: 'text-amber-600', badgeBag: 'bg-amber-50 border-amber-100' },
                        { name: 'P2 - 持续优化', count: activeMonthReqs.filter(r => r.priority === 'low').length, bgColor: 'bg-slate-400', textColor: 'text-slate-500', badgeBag: 'bg-slate-50 border-slate-100' },
                      ].map((item, i) => {
                        const total = activeMonthReqs.length || 1;
                        const percent = (item.count / total) * 100;
                        return (
                          <div key={i} className={`flex flex-col gap-1.5 p-2 rounded-2xl border ${item.badgeBag}`}>
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider font-sans px-1">
                              <span className="opacity-70">{item.name}</span>
                              <span className={`${item.textColor} font-mono font-black`}>{item.count}</span>
                            </div>
                            <div className="h-1.5 bg-black/[0.03] overflow-hidden rounded-full">
                              <div className={`h-full ${item.bgColor} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source Distribution */}
                  <div className="bg-white border border-[#1A1A1A]/10 p-5 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 mb-5 flex items-center gap-2 font-sans">
                       <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 需求来源渠道
                    </h3>
                    <div className="space-y-4">
                       {[
                         { id: 'customer', name: '客户反馈', barBg: 'bg-indigo-500' },
                         { id: 'marketing', name: '市场调研', barBg: 'bg-sky-500' },
                         { id: 'product', name: '产品规划', barBg: 'bg-violet-500' },
                         { id: 'tech', name: '技术演进', barBg: 'bg-purple-500' },
                         { id: 'internal', name: '内部需求', barBg: 'bg-emerald-500' }
                       ].map(src => {
                         const count = activeMonthReqs.filter(r => r.source === src.id).length;
                         const percentage = activeMonthReqs.length > 0 ? Math.round((count / activeMonthReqs.length) * 100) : 0;
                         return (
                           <div key={src.id} className="group p-1.5 rounded-xl hover:bg-black/[0.01]">
                             <div className="flex justify-between text-[10px] tracking-wide font-normal font-sans mb-1.5">
                               <span className="opacity-70 font-semibold">{src.name}</span>
                               <span className="font-mono font-bold text-black/60">{count}</span>
                             </div>
                             <div className="h-1 bg-black/[0.03] overflow-hidden rounded-full">
                               <div className={`h-full ${src.barBg} transition-all duration-500 rounded-full`} style={{ width: `${percentage}%` }}></div>
                             </div>
                           </div>
                         )
                       })}
                    </div>
                  </div>

                  {/* RND Requirements workload division */}
                  <div className="bg-white border border-[#1A1A1A]/10 p-5 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#1A1A1A]/70 mb-5 flex items-center gap-2 font-sans">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 团队需求负荷与进度 (总计 / 已交付)
                    </h3>
                    <div className="space-y-4">
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
                            <div key={stat.id} className="group p-1.5 rounded-xl hover:bg-black/[0.01]">
                              <div className="flex justify-between items-end mb-1.5 font-sans">
                                <span className="text-[10px] font-bold text-black/75 leading-none">{stat.name}</span>
                                <span className="text-[10px] font-mono leading-none">
                                  <span className="text-[#1A1A1A] opacity-50">{stat.total}</span>
                                  <span className="mx-1 opacity-20">/</span>
                                  <span className="text-emerald-600 font-bold">{stat.completed}</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-black/[0.03] overflow-hidden flex w-full rounded-full">
                                <div className="h-full bg-slate-300 rounded-l transition-all duration-500" style={{ width: `${totalPercent - (totalPercent * completedPercent / 100)}%` }} title={`未交付: ${stat.total - stat.completed}`} />
                                <div className="h-full bg-emerald-500 rounded-r transition-all duration-500" style={{ width: `${totalPercent * completedPercent / 100}%` }} title={`已交付: ${stat.completed}`} />
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
                .filter(g => currentView === 'dashboard' || isSystemAdmin || currentUser.groupId === g.id)
                .map(group => {
                const storageKey = `${group.id}_${currentView === 'dashboard' ? selectedQuarter : selectedMonth}`;
                const canEditGoal = currentUser.roles.includes('组长') && currentUser.groupId === group.id;
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
        <section className={`${
          currentView === 'tracking' 
            ? 'lg:col-span-12 p-0 lg:overflow-hidden' 
            : 'lg:col-span-9 p-4 sm:p-6 lg:p-8 lg:overflow-y-auto'
        } flex flex-col border-b border-[#1A1A1A] lg:border-b-0 h-auto lg:h-full bg-[#F7F6F2] ${
          currentView === 'dashboard' ? 'order-1 lg:order-2' : ''
        } ${
          (currentView === 'marketing' || currentView === 'rnd' || currentView === 'requirements' || currentView === 'dashboard')
            ? (mobileSubTab === 'overview' ? 'hidden lg:flex' : 'flex')
            : 'flex'
        }`}>
          <div className="flex-1 flex flex-col min-h-0">
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
                      </button>
                      <button 
                        onClick={() => {
                          setEditingRequirementId(null);
                          setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                          setIsRequirementModalOpen(true);
                        }}
                        className="bg-[#1A1A1A] hover:bg-black text-[#F7F6F2] py-2.5 px-4 text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
                      >
                        新增产品需求
                      </button>
                    </div>
                  </div>

                  {/* 移动端新增需求浮动按钮 */}
                  <button 
                      onClick={() => {
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
                    <div 
                      key={status} 
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverColumn !== status) {
                          setDragOverColumn(status);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverColumn === status) {
                          setDragOverColumn(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const reqId = e.dataTransfer.getData('text/plain') || draggedRequirementId;
                        if (reqId) {
                          updateRequirementStatus(reqId, status);
                        }
                        setDraggedRequirementId(null);
                        setDragOverColumn(null);
                      }}
                      data-column-status={status}
                      className={`flex flex-col gap-4 w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-center sm:snap-start p-2 rounded-2xl transition-all duration-300 select-none ${
                        dragOverColumn === status ? 'bg-[#1A1A1A]/5 ring-2 ring-[#1A1A1A]/20 scale-[1.01]' : 'border-2 border-transparent'
                      }`}
                    >
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
                        {pruneDuplicates(displayRequirements.filter(r => r.status === status)).map((req) => (
                          <div 
                            key={req.id} 
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', req.id);
                              setDraggedRequirementId(req.id);
                            }}
                            onDragEnd={() => {
                              setDraggedRequirementId(null);
                              setDragOverColumn(null);
                            }}
                            onTouchStart={(e) => handleTouchStart(e, req.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={(e) => handleTouchEnd(e, req.id)}
                            onClick={(e) => {
                              if (reqHasTriggeredLongPressRef.current) {
                                e.stopPropagation();
                                e.preventDefault();
                                return;
                              }
                              setSelectedRequirement(req);
                              setIsRequirementDetailModalOpen(true);
                            }}
                            className={`p-5 hover:shadow-md transition-all duration-200 group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl border border-black/5 cursor-grab active:cursor-grabbing shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                              draggedRequirementId === req.id 
                                ? 'opacity-40 scale-[0.98] border-dashed border-[#1A1A1A]/40 rotate-1' 
                                : 'hover:scale-[1.01] active:scale-[0.99]'
                            } ${
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
                                {(isSystemAdmin || currentUser.id === req.submitterId) && (
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
                <TaskDepartmentGroups
                  tasks={marketingTasks}
                  department="marketing"
                  groups={groups}
                  isSystemAdmin={isSystemAdmin}
                  currentUser={currentUser}
                  members={members}
                  selectedTaskGroupIds={selectedTaskGroupIds}
                  setSelectedTaskGroupIds={setSelectedTaskGroupIds}
                  outcomes={outcomes}
                  projects={projects}
                  openTaskModal={openTaskModal}
                  setSelectedTask={setSelectedTask}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setTasks={setTasks}
                />
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
                <TaskDepartmentGroups
                  tasks={rndTasks}
                  department="rnd"
                  groups={groups}
                  isSystemAdmin={isSystemAdmin}
                  currentUser={currentUser}
                  members={members}
                  selectedTaskGroupIds={selectedTaskGroupIds}
                  setSelectedTaskGroupIds={setSelectedTaskGroupIds}
                  outcomes={outcomes}
                  projects={projects}
                  openTaskModal={openTaskModal}
                  setSelectedTask={setSelectedTask}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setTasks={setTasks}
                />
              </div>
            )}
          </div>

          {/* Monthly Comparison Analysis (Dashboard Exclusive) */}
          {currentView === 'tracking' && (currentUser.roles.includes('项目经理') || isSystemAdmin) && (
              <ProjectTrackingView 
                trackings={projectTrackings}
                onDelete={terminateTracking}
                onRestore={restoreTracking}
                onDeletePermanently={deleteTrackingPermanently}
                onEdit={(t) => { setEditingTrackingId(t.id); setTrackingForm(t); setTrackingError(''); setIsTrackingModalOpen(true); }}
                onAdd={() => { setEditingTrackingId(null); setTrackingForm({ customerName: '', status: 'followup', product: '', cityManager: '', projectManager: '', expectedContractAmount: 0, actualContractAmount: 0, contactName: '', contactPhone: '', createdAt: format(new Date(), 'yyyy-MM-dd') }); setTrackingError(''); setIsTrackingModalOpen(true); }}
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
                onImport={async (importedTrackings) => {
                  try {
                    const newTrackings: ProjectTracking[] = [];
                    for (const item of importedTrackings) {
                      const newTracking: ProjectTracking = {
                        ...item,
                        id: generateId(),
                        updatedAt: new Date().toISOString(),
                        followupRecords: []
                      };
                      await apiService.saveProjectTracking(newTracking);
                      newTrackings.push(newTracking);
                    }
                    setProjectTrackings(prev => [...newTrackings, ...prev]);
                  } catch (err) {
                    console.error('Failed to import trackings', err);
                    throw err;
                  }
                }}
              />
          )}
          {currentView === 'dashboard' && (
            <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Header section (Borderless, sleek, minimal) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-4 gap-2 sm:gap-0 pb-1 px-4 sm:px-0 mt-2 sm:mt-0">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-2xl sm:text-3xl font-serif italic text-zinc-900 tracking-tight">全局数据看板</h2>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden sm:block">
                    Real-time Business & Development Insights . {CURRENT_YEAR}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    数据已实时更新
                  </span>
                </div>
              </div>

              {/* SECTION 1: 核心财务毛利分析 (Digital Metrics Board) */}
              <div className="flex flex-col gap-4 w-full max-w-[1280px] mx-auto">
                <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-2 -mx-4 sm:mx-0">
                  
                  {/* 1. Year to Date Profit */}
                  {(() => {
                    const yearProfitRatio = annualTargetProfit > 0 ? currentYearActualProfit / annualTargetProfit : 0;
                    const yearPercentage = (yearProfitRatio * 100).toFixed(1);
                    
                    let statusColor = "text-zinc-955 font-bold";
                    let badgeBg = "bg-zinc-100/80 text-zinc-750";
                    let barColor = "bg-zinc-950";
                    let iconBg = "bg-zinc-50 border border-zinc-100/50 text-zinc-600";
                    
                    if (currentYearActualProfit > 0) {
                      if (yearProfitRatio >= 1) {
                        statusColor = "text-emerald-600";
                        badgeBg = "bg-emerald-50 text-emerald-700";
                        barColor = "bg-emerald-500";
                        iconBg = "bg-emerald-50 text-emerald-600 border border-emerald-100/55";
                      } else if (yearProfitRatio >= 0.8) {
                        statusColor = "text-amber-600";
                        badgeBg = "bg-amber-50 text-amber-700";
                        barColor = "bg-amber-505";
                        iconBg = "bg-amber-50 text-amber-600 border border-amber-100/55";
                      } else if (yearProfitRatio > 0 && currentYearActualProfit < annualTargetProfit * (new Date().getMonth()+1)/12 ) {
                        statusColor = "text-rose-600";
                        badgeBg = "bg-rose-50 text-rose-700";
                        barColor = "bg-rose-500";
                        iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                      }
                    }

                    return (
                      <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[124px] relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.05)] transition-all duration-300 w-full min-w-[280px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                        <div className="flex justify-between items-start relative z-10 w-full mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block max-w-[80%] leading-snug">本年度累计利润 (万)</span>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg} transition-transform group-hover:scale-105 duration-300`}>
                            <Coins className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className={`text-3.5xl font-serif italic ${statusColor} tracking-tight leading-none`}>{currentYearActualProfit}</span>
                          <span className="text-[10px] font-mono text-zinc-400 leading-none">/ 目标 {annualTargetProfit}</span>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex flex-col gap-1 w-full mt-2">
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-400">
                            <span>年完成比例</span>
                            <span className={statusColor}>{yearPercentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-100/80 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                              style={{ width: `${Math.min(100, yearProfitRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Combined Month Profit */}
                  {(() => {
                    const monthProfitRatio = currentMonthTargetProfit > 0 ? currentMonthActualProfit / currentMonthTargetProfit : 0;
                    const monthPercentage = (monthProfitRatio * 100).toFixed(1);
                    
                    let statusColor = "text-zinc-950 font-bold";
                    let badgeBg = "bg-zinc-100/80 text-zinc-700";
                    let barColor = "bg-zinc-950";
                    let iconBg = "bg-zinc-50 border border-zinc-100/50 text-zinc-600";
                    
                    if (currentMonthActualProfit > 0) {
                      if (monthProfitRatio >= 1) {
                        statusColor = "text-emerald-600";
                        badgeBg = "bg-emerald-50 text-emerald-700";
                        barColor = "bg-emerald-400";
                        iconBg = "bg-emerald-50 text-emerald-600 border border-emerald-100/55";
                      } else if (monthProfitRatio >= 0.8) {
                        statusColor = "text-amber-600";
                        badgeBg = "bg-amber-50 text-amber-700";
                        barColor = "bg-amber-400";
                        iconBg = "bg-amber-50 text-amber-600 border border-amber-100/55";
                      } else {
                        statusColor = "text-rose-600";
                        badgeBg = "bg-rose-50 text-rose-700";
                        barColor = "bg-rose-400";
                        iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                      }
                    } else if (monthProfitRatio === 0 && currentMonthTargetProfit > 0) {
                      statusColor = "text-rose-600";
                      badgeBg = "bg-rose-50 text-rose-700";
                      barColor = "bg-rose-400";
                      iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                    }
                    
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[124px] relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.05)] transition-all duration-300 w-full min-w-[280px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                        <div className="flex justify-between items-start relative z-10 w-full mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block max-w-[80%] leading-snug">当月利润完成 (万)</span>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg} transition-transform group-hover:scale-105 duration-300`}>
                            <Wallet className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className={`text-3.5xl font-serif italic ${statusColor} tracking-tight leading-none`}>{currentMonthActualProfit}</span>
                          <span className="text-[10px] font-mono text-zinc-400 leading-none">/ 目标 {currentMonthTargetProfit}</span>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex flex-col gap-1 w-full mt-2">
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-400">
                            <span>当月指标进度</span>
                            <span className={statusColor}>{monthPercentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-100/80 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                              style={{ width: `${Math.min(100, monthProfitRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Combined Month Contract */}
                  {(() => {
                    const monthContractRatio = currentMonthTargetContract > 0 ? currentMonthActualContract / currentMonthTargetContract : 0;
                    const monthPercentage = (monthContractRatio * 100).toFixed(1);
                    
                    let statusColor = "text-zinc-950 font-bold";
                    let badgeBg = "bg-zinc-100/80 text-zinc-700";
                    let barColor = "bg-zinc-950";
                    let iconBg = "bg-zinc-50 border border-zinc-100/50 text-zinc-600";
                    
                    if (currentMonthActualContract > 0) {
                      if (monthContractRatio >= 1) {
                        statusColor = "text-emerald-600";
                        badgeBg = "bg-emerald-50 text-emerald-700";
                        barColor = "bg-emerald-400";
                        iconBg = "bg-emerald-50 text-emerald-600 border border-emerald-100/55";
                      } else if (monthContractRatio >= 0.8) {
                        statusColor = "text-amber-600";
                        badgeBg = "bg-amber-50 text-amber-700";
                        barColor = "bg-amber-400";
                        iconBg = "bg-amber-50 text-amber-600 border border-amber-100/55";
                      } else {
                        statusColor = "text-rose-600";
                        badgeBg = "bg-rose-50 text-rose-700";
                        barColor = "bg-rose-400";
                        iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                      }
                    } else if (monthContractRatio === 0 && currentMonthTargetContract > 0) {
                      statusColor = "text-rose-600";
                      badgeBg = "bg-rose-50 text-rose-700";
                      barColor = "bg-rose-400";
                      iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                    }
                    
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[124px] relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.05)] transition-all duration-300 w-full min-w-[280px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                        <div className="flex justify-between items-start relative z-10 w-full mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block max-w-[80%] leading-snug">当月合同完成 (万)</span>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg} transition-transform group-hover:scale-105 duration-300`}>
                            <FileText className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className={`text-3.5xl font-serif italic ${statusColor} tracking-tight leading-none`}>{currentMonthActualContract}</span>
                          <span className="text-[10px] font-mono text-zinc-400 leading-none">/ 目标 {currentMonthTargetContract}</span>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex flex-col gap-1 w-full mt-2">
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-400">
                            <span>合同签署进度</span>
                            <span className={statusColor}>{monthPercentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-100/80 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                              style={{ width: `${Math.min(100, monthContractRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Combined Month Collection */}
                  {(() => {
                    const collectionRatio = currentMonthTargetCollection > 0 ? currentMonthActualCollection / currentMonthTargetCollection : 0;
                    const collectionPercentage = (collectionRatio * 100).toFixed(1);
                    
                    let statusColor = "text-zinc-950 font-bold";
                    let badgeBg = "bg-zinc-100/80 text-zinc-700";
                    let barColor = "bg-zinc-950";
                    let iconBg = "bg-zinc-50 border border-zinc-100/50 text-zinc-600";
                    
                    if (currentMonthActualCollection > 0) {
                      if (collectionRatio >= 1) {
                        statusColor = "text-emerald-600";
                        badgeBg = "bg-emerald-50 text-emerald-700";
                        barColor = "bg-emerald-400";
                        iconBg = "bg-emerald-50 text-emerald-600 border border-emerald-100/55";
                      } else if (collectionRatio >= 0.8) {
                        statusColor = "text-amber-600";
                        badgeBg = "bg-amber-50 text-amber-700";
                        barColor = "bg-amber-400";
                        iconBg = "bg-amber-50 text-amber-600 border border-amber-100/55";
                      } else {
                        statusColor = "text-rose-600";
                        badgeBg = "bg-rose-50 text-rose-700";
                        barColor = "bg-rose-400";
                        iconBg = "bg-rose-50 text-rose-600 border border-rose-100/55";
                      }
                    }
                    
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[124px] relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.05)] transition-all duration-300 w-full min-w-[280px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                        <div className="flex justify-between items-start relative z-10 w-full mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block max-w-[80%] leading-snug">当月回款完成 (万)</span>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg} transition-transform group-hover:scale-105 duration-300`}>
                            <TrendingUp className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 relative z-10">
                          <span className={`text-3.5xl font-serif italic ${statusColor} tracking-tight leading-none`}>{currentMonthActualCollection}</span>
                          <span className="text-[10px] font-mono text-zinc-400 leading-none">/ 目标 {currentMonthTargetCollection}</span>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex flex-col gap-1 w-full mt-2">
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-400">
                            <span>款项收回进度</span>
                            <span className={statusColor}>{collectionPercentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-100/80 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor} transition-all duration-1000 ease-out`}
                              style={{ width: `${Math.min(100, collectionRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* SECTION 2: 潜在客户与漏斗累计目标 (Client Stats Row) */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-4 sm:px-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">客群转化动态与漏斗 (年度累计)</span>
                </div>
                
                <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 px-4 sm:px-0 overflow-x-auto hide-scrollbar-on-mobile snap-x snap-mandatory scroll-smooth pb-2 -mx-4 sm:mx-0">
                  
                  {/* Lead Clients */}
                  <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[104px] relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 w-full min-w-[245px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-medium text-zinc-400">潜在客户库</span>
                      <span className="w-6 h-6 rounded-lg bg-zinc-50 border border-zinc-100/75 flex items-center justify-center text-zinc-400">
                        <Users className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2.5xl font-serif italic text-zinc-800 tracking-tight">{yearLeadClients}</span>
                      <span className="text-[9px] font-mono text-zinc-400 font-bold">/ {yearTargetLeadClients} 目标</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <span className="text-[9px] font-mono text-zinc-400">年度推进指数</span>
                      <span className="text-[9px] font-mono font-bold text-zinc-600">
                        {yearTargetLeadClients > 0 ? Math.round((yearLeadClients / yearTargetLeadClients) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Active Clients */}
                  <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[104px] relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 w-full min-w-[245px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-medium text-zinc-400">已开发推进中</span>
                      <span className="w-6 h-6 rounded-lg bg-amber-50/55 border border-amber-100/30 flex items-center justify-center text-amber-600">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2.5xl font-serif italic text-amber-600 tracking-tight">{yearActiveClients}</span>
                      <span className="text-[9px] font-mono text-zinc-400 font-bold">/ {yearTargetActiveClients} 目标</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <span className="text-[9px] font-mono text-zinc-400">活跃推进效率</span>
                      <span className="text-[9px] font-mono font-bold text-amber-600">
                        {yearTargetActiveClients > 0 ? Math.round((yearActiveClients / yearTargetActiveClients) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Signed Clients */}
                  <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[104px] relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 w-full min-w-[245px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-medium text-zinc-400">已签约成交</span>
                      <span className="w-6 h-6 rounded-lg bg-emerald-50/55 border border-emerald-100/30 flex items-center justify-center text-emerald-600">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2.5xl font-serif italic text-emerald-600 tracking-tight">{yearSignedClients}</span>
                      <span className="text-[9px] font-mono text-zinc-400 font-bold">/ {yearTargetSignedClients} 目标</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <span className="text-[9px] font-mono text-zinc-400">合作达成度</span>
                      <span className="text-[9px] font-mono font-bold text-emerald-600">
                        {yearTargetSignedClients > 0 ? Math.round((yearSignedClients / yearTargetSignedClients) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Lost Clients */}
                  {(() => {
                    const isExceeded = yearTargetLostClients > 0 && yearLostClients > yearTargetLostClients;
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-5 flex flex-col justify-between h-[104px] relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 w-full min-w-[245px] sm:min-w-0 shrink-0 snap-center rounded-2xl active:scale-[0.99] cursor-pointer">
                        <div className="flex justify-between items-start w-full">
                          <span className="text-[11px] font-medium text-zinc-400 font-sans">客户流失控制</span>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${isExceeded ? 'bg-rose-50 border border-rose-100/30 text-rose-600 animate-pulse' : 'bg-zinc-50 border border-zinc-100/75 text-zinc-400'}`}>
                            <UserX className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className={`text-2.5xl font-serif italic tracking-tight ${isExceeded ? 'text-rose-600 font-extrabold' : 'text-zinc-800'}`}>
                            {yearLostClients}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 font-bold">/ {yearTargetLostClients} 上限</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                          <span className="text-[9px] font-mono text-zinc-400">风险预警状况</span>
                          <span className={`text-[9px] font-mono font-bold ${isExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isExceeded ? '已超出规划阀值' : '流失率在控制内'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* SECTION 3: 现代化趋势图表数据面板 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-0 mb-4">
                
                {/* Chart 1: 月度目标完成趋势 */}
                <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] flex flex-col">
                  <h3 id="chart-profit-title" className="text-[11px] uppercase tracking-widest font-bold mb-5 text-zinc-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-zinc-950 rounded-full" aria-hidden="true" />
                    月度利润趋势分析 ({CURRENT_YEAR}年 / 万)
                  </h3>
                  <div className="h-64 w-full focus:outline-none focus:ring-2 focus:ring-zinc-950/20" role="figure" aria-labelledby="chart-profit-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} role="img" aria-label="月度利润趋势分析面积图">
                        <CartesianGrid strokeDasharray="4 4" stroke="#1A1A1A" strokeOpacity={0.03} vertical={false} />
                        <XAxis dataKey="name" fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.5}} />
                        <YAxis fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.5}} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -4px rgba(0, 0, 0, 0.05)',
                            fontSize: '11px',
                            padding: '10px 14px'
                          }} 
                        />
                        <Area type="monotone" dataKey="target" stroke="#71717a" strokeWidth={1.5} strokeDasharray="3 3" fill="url(#colorTarget)" fillOpacity={0.02} name="目标利润" />
                        <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#colorActual)" fillOpacity={0.12} name="实际利润" />
                        
                        {/* Define gorgeous smooth gradients */}
                        <defs>
                          <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: 研发推进 & 任务分布 */}
                <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] flex flex-col">
                  <h3 id="chart-task-title" className="text-[11px] uppercase tracking-widest font-bold mb-5 text-zinc-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-zinc-950 rounded-full" aria-hidden="true" />
                    月度需求大盘分布
                  </h3>
                  <div className="h-64 w-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-zinc-950/20" role="figure" aria-labelledby="chart-task-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart role="img" aria-label="月度需求统计饼图">
                        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-900 font-serif italic text-3xl font-bold">
                          {activeMonthReqs.length}
                        </text>
                        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                          需求总计
                        </text>
                        <Pie 
                          data={pieData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="48%" 
                          outerRadius={85} 
                          innerRadius={58}
                          paddingAngle={3}
                          label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -4px rgba(0, 0, 0, 0.05)',
                            fontSize: '11px',
                            padding: '10px 14px'
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', opacity: 0.7, paddingTop: '10px' }} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 3: 月度利润统计 (Bar Chart, spanning full-width for gorgeous balance) */}
                <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 lg:col-span-2 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02),0_12px_36px_-6px_rgba(0,0,0,0.03)] flex flex-col">
                  <h3 id="chart-outcome-title" className="text-[11px] uppercase tracking-widest font-bold mb-5 text-zinc-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-zinc-950 rounded-full" aria-hidden="true" />
                    月度累计利润效益比 ({CURRENT_YEAR}年 / 万)
                  </h3>
                  <div className="h-64 w-full focus:outline-none focus:ring-2 focus:ring-zinc-950/20" role="figure" aria-labelledby="chart-outcome-title" tabIndex={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} role="img" aria-label="月度利润统计柱状图">
                        <CartesianGrid strokeDasharray="4 4" stroke="#1A1A1A" strokeOpacity={0.03} vertical={false} />
                        <XAxis dataKey="name" fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.5}} />
                        <YAxis fontSize={10} fontFamily="monospace" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', opacity: 0.5}} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -4px rgba(0, 0, 0, 0.05)',
                            fontSize: '11px',
                            padding: '10px 14px'
                          }} 
                          cursor={{fill: '#1a1a1a', opacity: 0.02}} 
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', opacity: 0.7, paddingTop: '10px' }} iconType="circle" />
                        <Bar dataKey="target" fill="#64748b" name="目标利润" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="actual" fill="#10b981" name="实际利润" radius={[4, 4, 0, 0]} maxBarSize={32} />
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
        
        {currentUserPermissions.includes('VIEW_DASHBOARD') && (
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'dashboard' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <LayoutDashboard className={`w-5 h-5 transition-transform ${currentView === 'dashboard' ? 'scale-110' : ''}`} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'dashboard' ? 'opacity-100' : 'opacity-80'}`}>全局</span>
          </button>
        )}

        {currentUserPermissions.includes('VIEW_TRACKING') && (
          <button 
            onClick={() => setCurrentView('tracking')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'tracking' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <Target className={`w-5 h-5 transition-transform ${currentView === 'tracking' ? 'scale-110' : ''}`} strokeWidth={currentView === 'tracking' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'tracking' ? 'opacity-100' : 'opacity-80'}`}>跟踪</span>
          </button>
        )}

        {currentUserPermissions.includes('VIEW_MARKETING') && (
          <button 
            onClick={() => setCurrentView('marketing')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'marketing' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <TrendingUp className={`w-5 h-5 transition-transform ${currentView === 'marketing' ? 'scale-110' : ''}`} strokeWidth={currentView === 'marketing' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'marketing' ? 'opacity-100' : 'opacity-80'}`}>市场</span>
          </button>
        )}

        {currentUserPermissions.includes('VIEW_RND') && (
          <button 
            onClick={() => setCurrentView('rnd')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'rnd' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <Code2 className={`w-5 h-5 transition-transform ${currentView === 'rnd' ? 'scale-110' : ''}`} strokeWidth={currentView === 'rnd' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'rnd' ? 'opacity-100' : 'opacity-80'}`}>研发</span>
          </button>
        )}

        {currentUserPermissions.includes('VIEW_REQUIREMENTS') && (
          <button 
            onClick={() => setCurrentView('requirements')}
            className={`flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-xl transition-all pt-1 ${currentView === 'requirements' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/40'}`}
          >
             <ClipboardList className={`w-5 h-5 transition-transform ${currentView === 'requirements' ? 'scale-110' : ''}`} strokeWidth={currentView === 'requirements' ? 2.5 : 2} />
             <span className={`text-[9px] font-bold tracking-wider ${currentView === 'requirements' ? 'opacity-100' : 'opacity-80'}`}>需求</span>
          </button>
        )}

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
                  value={releaseGoalForm.groupId || ''} 
                  onChange={(e) => setReleaseGoalForm({...releaseGoalForm, groupId: e.target.value})} 
                  className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono pb-2"
                  required
                  disabled={!isSystemAdmin}
                >
                  <option value="" disabled>--请选择小组--</option>
                  {(isSystemAdmin ? groups.filter(g => g.category === 'rnd') : groups.filter(g => g.id === currentUser.groupId)).map(g => (
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
                    value={releaseGoalForm.targetMonth || ''} 
                    onChange={(e) => setReleaseGoalForm({...releaseGoalForm, targetMonth: e.target.value})} 
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">预计上线日期</label>
                  <input 
                    type="date" 
                    required
                    value={releaseGoalForm.targetDate || ''} 
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

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200 mt-4"
              >
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

              {/* Signed Clients */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold mb-2 pb-1 border-b border-[#1A1A1A]/10">已签约成交 (家)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月初目标</span>
                    <input type="number" min="0" value={goalForm.signedClientsTarget} onChange={(e) => setGoalForm({...goalForm, signedClientsTarget: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
                  </div>
                  <div>
                    <span className="text-[9px] opacity-60 mb-1 block">月底实际</span>
                    <input type="number" min="0" value={goalForm.signedClientsActual} onChange={(e) => setGoalForm({...goalForm, signedClientsActual: e.target.value})} className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-1 text-sm font-mono" />
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
              
              <div className="pt-5 flex justify-end gap-3.5 border-t border-[#1A1A1A]/10 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
              <div className="pt-5 flex justify-end gap-3.5 border-t border-[#1A1A1A]/10 mt-2">
                <button 
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingPlan(null); }}
                  className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
              <div className="pt-5 flex justify-end gap-3.5 border-t border-[#1A1A1A]/10 mt-2">
                <button 
                  type="button"
                  onClick={() => { setIsActualModalOpen(false); setEditingPlan(null); }}
                  className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
          <div className="bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-md h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none relative">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 sm:px-8 py-4 pt-7 sm:py-6 border-b border-[#1A1A1A]/5 bg-black/[0.02] shrink-0">
              <h3 className="text-xl sm:text-2xl font-serif italic">规划本周行动项</h3>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="opacity-40 hover:opacity-100 transition-opacity p-2 -mr-2"
              >
                <span className="text-xl font-light leading-none">×</span>
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6 custom-scrollbar">
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
              <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-[#1A1A1A]/10 bg-gray-50 flex shrink-0 justify-between items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-5 relative z-10 w-full animate-in fade-in">
                <button 
                  type="button"
                  onClick={() => setTaskForms([...taskForms, { id: generateId(), title: '', plannedProgress: '0', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(currentWeekDate, 'yyyy-MM-dd'), projectName: '', outcome: '' }])}
                  className="flex items-center justify-center text-[#1A1A1A] bg-white text-[11.5px] sm:text-xs font-bold uppercase tracking-[0.05em] px-4 py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/20 hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-all active:translate-y-px"
                >
                  + 添加任务项
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200 bg-white"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
                  className="flex items-center justify-center text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.1em] px-4 py-2 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all active:translate-y-px"
                >
                  + 添加成果项
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsOutcomeModalOpen(false)}
                    className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
          <div className="bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-md h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none relative">
            <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-50"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 sm:px-8 py-4 pt-7 sm:py-6 border-b border-[#1A1A1A]/5 bg-black/[0.02] shrink-0">
              <h3 className="text-xl sm:text-2xl font-serif italic">{editingRequirementId ? '编辑产品需求' : '提交新产品需求'}</h3>
              <button 
                onClick={() => {
                  setIsRequirementModalOpen(false);
                  setEditingRequirementId(null);
                  setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                }}
                className="opacity-40 hover:opacity-100 transition-opacity p-2 -mr-2"
              >
                <span className="text-xl font-light leading-none">×</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleRequirementSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-5 custom-scrollbar">
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
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-[#1A1A1A]/10 bg-gray-50 flex shrink-0 justify-end gap-3.5 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-5 relative z-10 w-full">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRequirementModalOpen(false);
                    setEditingRequirementId(null);
                    setRequirementForm({ title: '', description: '', linkUrl: '', priority: 'medium', source: 'customer', customerName: '', internalSourceDetail: '', assigneeId: '' });
                  }}
                  className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200 bg-white"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingRequirement}
                  className={`flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200 ${isSubmittingRequirement ? 'opacity-50 cursor-not-allowed translate-y-0.5' : 'active:translate-y-0.5'}`}
                >
                  {isSubmittingRequirement ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
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
                  {pruneDuplicates(requirements.filter(r => r.deleted)).map((req) => (
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
            <div className="flex justify-end gap-3.5 mt-6 pt-5 border-t border-[#1A1A1A]/5">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
              >
                取消
              </button>
              <button 
                onClick={confirmLogout}
                className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
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
                { key: 'cityManager', label: '市场负责人', placeholder: '请输入市场负责人' },
                { key: 'projectManager', label: '项目负责人', placeholder: '请输入项目负责人' },
                { key: 'contactName', label: '联系人', placeholder: '请输入联系人' },
                { key: 'contactPhone', label: '联系电话', placeholder: '如：13812345678' },
                { key: 'expectedContractAmount', label: '预期合同额(万)', placeholder: '请输入万元金额' },
                { key: 'actualContractAmount', label: '已达成合同额(万)', placeholder: '请输入万元金额' },
                { key: 'createdAt', label: '创建日期', placeholder: '请选择日期' },
                { key: 'lastFollowupDate', label: '最近跟进日期', placeholder: '请选择日期' }
              ].map(field => {
                let displayValue = (trackingForm as any)[field.key] ?? '';
                if (field.key.includes('Amount') && displayValue !== '') {
                  displayValue = Number((Number(displayValue) / 10000).toFixed(6).replace(/\.?0+$/, ''));
                }
                return (
                  <div key={field.key} className="col-span-1">
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">{field.label}</label>
                    <input 
                      type={field.key.includes('Amount') ? 'number' : ['lastFollowupDate', 'createdAt'].includes(field.key) ? 'date' : 'text'}
                      value={displayValue} 
                      onChange={(e) => {
                        let val = e.target.value;
                        if (field.key.includes('Amount')) {
                          const numericVal = val === '' ? 0 : Number(val) * 10000;
                          setTrackingForm({...trackingForm, [field.key]: numericVal});
                        } else {
                          setTrackingForm({...trackingForm, [field.key]: e.target.value});
                        }
                      }} 
                      className="w-full bg-transparent border-b border-[#1A1A1A]/30 outline-none py-2 text-sm"
                      placeholder={field.placeholder}
                      required
                    />
                  </div>
                );
              })}
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
            <div className="flex justify-end gap-3.5 mt-8 pt-5 border-t border-[#1A1A1A]/10">
              <button 
                onClick={() => {
                  setIsTrackingModalOpen(false);
                  setTrackingError('');
                }} 
                className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
              >
                取消
              </button>
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
                className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followup Modal */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={closeFollowupModal} />
          <div className="relative bg-white pt-8 sm:pt-6 sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl p-4 sm:p-8 shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-sm mt-auto sm:mt-0 rounded-t-2xl sm:rounded-none">
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
          <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
            <h3 className="text-2xl font-serif italic mb-6 shrink-0">{editingFollowupId ? '编辑跟进记录' : '添加跟进记录'}</h3>
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
            <div className="flex justify-end gap-3.5 mt-8 shrink-0 pt-5 border-t border-[#1A1A1A]/10">
              <button 
                onClick={closeFollowupModal} 
                className="flex items-center justify-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-black/[0.02] active:translate-y-px transition-all duration-200"
              >
                取消
              </button>
              <button 
                onClick={saveFollowup} 
                disabled={!followupForm.content}
                className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-[40px] border border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)] hover:shadow-none hover:bg-white hover:text-[#1A1A1A] active:bg-[#1A1A1A] active:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Detail Modal */}
      {isTrackingDetailModalOpen && selectedTrackingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-[#F7F6F2]/80 backdrop-blur-sm" onClick={() => setIsTrackingDetailModalOpen(false)} />
          <div className="relative bg-white sm:border border-[#1A1A1A]/10 w-full sm:max-w-5xl h-[100dvh] sm:h-full max-h-[100dvh] sm:max-h-[90vh] shadow-xl sm:shadow-2xl flex flex-col animate-in zoom-in-95 sm:zoom-in-100 duration-300 sm:rounded-sm overflow-hidden">
            
            {/* Header Area */}
            <div className="px-6 md:px-8 py-5 border-b border-[#1A1A1A]/10 bg-white flex flex-col shrink-0 relative">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 pr-8">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-serif italic font-medium truncate max-w-[240px] sm:max-w-md">{selectedTrackingDetail.customerName}</h3>
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold bg-white shadow-xs
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
                  <div className="flex items-center gap-2 text-xs font-mono opacity-50">
                     <span>ID: {selectedTrackingDetail.id}</span>
                  </div>
                </div>
                
                {/* Close Button - Beautified */}
                <button 
                  onClick={() => setIsTrackingDetailModalOpen(false)} 
                  className="absolute right-4 top-4 sm:right-6 sm:top-5 p-2 rounded-full border border-[#1A1A1A]/10 bg-[#F7F6F2] hover:bg-white text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:border-[#1A1A1A] hover:rotate-90 active:scale-95 transition-all duration-300 cursor-pointer shadow-xs z-10 flex items-center justify-center"
                  title="关闭窗口"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Only: Tab bar for main & secondary info prioritization */}
              <div className="flex md:hidden mt-4 border-b border-gray-100 -mx-6 px-6">
                <button
                  onClick={() => setMobileDetailTab('timeline')}
                  className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${mobileDetailTab === 'timeline' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/40'}`}
                >
                  跟进动态 ({selectedTrackingDetail.followupRecords?.length || 0})
                </button>
                <button
                  onClick={() => setMobileDetailTab('info')}
                  className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${mobileDetailTab === 'info' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#1A1A1A]/40'}`}
                >
                  基本档案
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-[#F7F6F2]">
              
              {/* Left Column: Detailed Info */}
              <div className={`w-full md:w-[35%] lg:w-[30%] border-b md:border-b-0 md:border-r border-[#1A1A1A]/10 p-5 md:p-8 bg-white space-y-6 md:space-y-8 shrink-0 md:h-full overflow-y-auto custom-scrollbar ${mobileDetailTab === 'info' ? 'block' : 'hidden md:block'}`}>
                
                {/* 金额核算 */}
                <div className="p-4 sm:p-5 bg-stone-50 border border-[#1A1A1A]/5 rounded shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6"></div>
                   <h4 className="text-[10px] uppercase tracking-widest font-extrabold text-stone-700/80 mb-3.5 border-b border-[#1A1A1A]/10 pb-1.5">金额看板</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">预期合同额</div>
                        <div className="text-base font-mono font-semibold text-stone-800">¥{(selectedTrackingDetail.expectedContractAmount / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万</div>
                      </div>
                      <div className="pt-2 border-t border-stone-200/50">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600/90 font-bold mb-1">已达成签约额</div>
                        <div className="text-xl sm:text-2xl font-mono text-emerald-600 font-extrabold flex items-baseline gap-1">
                          <span className="text-sm font-sans font-medium">¥</span>
                          {(selectedTrackingDetail.actualContractAmount / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-sans font-medium ml-1">万</span>
                        </div>
                      </div>
                   </div>
                </div>

                {/* 客户联系信息 */}
                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">客户联系信息</h4>
                   <div className="space-y-3.5">
                      <div>
                        <div className="text-[11px] opacity-50 mb-0.5">联系人员</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">{selectedTrackingDetail.contactName || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] opacity-50 mb-0.5">联系电话</div>
                        {selectedTrackingDetail.contactPhone ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-mono font-medium text-[#1A1A1A]">{selectedTrackingDetail.contactPhone}</span>
                            <a 
                              href={`tel:${selectedTrackingDetail.contactPhone}`}
                              className="inline-flex items-center justify-center p-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 active:scale-95 transition-all"
                              title="拨打电话"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </a>
                          </div>
                        ) : (
                          <div className="text-sm font-mono opacity-40">—</div>
                        )}
                      </div>
                   </div>
                </div>

                {/* 项目及团队 */}
                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">项目及团队</h4>
                   <div className="space-y-4">
                      <div>
                        <div className="text-[11px] opacity-50 mb-0.5">合作意向 / 产品</div>
                        <div className="text-sm font-medium leading-relaxed">{selectedTrackingDetail.product || '—'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] opacity-50 mb-0.5">市场负责人</div>
                          <div className="text-sm font-medium text-stone-800">{selectedTrackingDetail.cityManager || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] opacity-50 mb-0.5">项目负责人</div>
                          <div className="text-sm font-medium text-stone-800">{selectedTrackingDetail.projectManager || '—'}</div>
                        </div>
                      </div>
                   </div>
                </div>
                
                {/* 时间线 */}
                <div>
                   <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 border-b border-[#1A1A1A]/10 pb-2">时间线</h4>
                   <div className="space-y-3 font-mono text-xs opacity-80">
                      <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                        <span className="opacity-60">最近跟进</span>
                        <span className="font-semibold text-stone-800">{selectedTrackingDetail.lastFollowupDate || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                        <span className="opacity-60">创建时间</span>
                        <span className="font-semibold text-stone-800">{selectedTrackingDetail.createdAt || (selectedTrackingDetail.updatedAt ? selectedTrackingDetail.updatedAt.split('T')[0] : '—')}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="opacity-60">最后更新于</span>
                        <span className="font-semibold text-stone-800 text-[11px]">{selectedTrackingDetail.updatedAt ? new Date(selectedTrackingDetail.updatedAt).toLocaleString() : '—'}</span>
                      </div>
                   </div>
                </div>

              </div>

              {/* Right Area: Followup Timeline */}
              <div className={`w-full md:w-[65%] lg:w-[70%] p-5 md:p-8 lg:p-10 bg-[#F7F6F2] md:h-full overflow-y-auto custom-scrollbar flex flex-col min-h-0 ${mobileDetailTab === 'timeline' ? 'block' : 'hidden md:block'}`}>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-4 border-b border-[#1A1A1A]/10 border-dashed shrink-0">
                   <div>
                     <h4 className="text-lg font-serif italic font-semibold text-[#1A1A1A]">动态跟踪明细</h4>
                     <p className="text-[10px] uppercase tracking-widest opacity-50 mt-0.5">Timeline & Work Updates</p>
                   </div>
                   <button 
                     onClick={() => {
                        setEditingTrackingId(selectedTrackingDetail.id);
                        setFollowupForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '' });
                        setIsTrackingDetailModalOpen(false);
                        setIsFollowupModalOpen(true);
                     }}
                     disabled={selectedTrackingDetail.status === 'terminated' || selectedTrackingDetail.status === 'archived'}
                     className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${selectedTrackingDetail.status === 'terminated' || selectedTrackingDetail.status === 'archived' ? 'bg-[#1A1A1A]/10 text-gray-400 cursor-not-allowed' : 'bg-[#1A1A1A] text-white hover:bg-black shadow-xs active:translate-y-px'}`}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                     补充跟进备注
                   </button>
                 </div>

                 {(!selectedTrackingDetail.followupRecords || selectedTrackingDetail.followupRecords.length === 0) ? (
                   <div className="py-16 md:py-24 flex flex-col items-center justify-center border border-[#1A1A1A]/10 border-dashed bg-white/50 rounded-sm">
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 opacity-30 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">暂无任何进展记录</p>
                      <p className="text-[10px] opacity-30 mt-2">点击上方按钮补充第一条工作汇报</p>
                   </div>
                 ) : (
                   <div className="space-y-6 relative flex-1 min-h-0 pb-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-px before:bg-[#1A1A1A]/10">
                     {selectedTrackingDetail.followupRecords.map((record, index) => (
                       <div key={record.id} className="relative flex items-start group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#F7F6F2] bg-white shadow-xs shrink-0 z-10">
                            {index === 0 ? (
                               <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                            ) : (
                               <span className="w-2 h-2 bg-[#1A1A1A]/30 rounded-full"></span>
                            )}
                          </div>
                          <div className="ml-4 sm:ml-6 w-full bg-white p-4 sm:p-6 rounded border border-[#1A1A1A]/5 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#1A1A1A]/5">
                               <div className="flex items-center gap-2.5">
                                 <div className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#F7F6F2] rounded text-[#1A1A1A]/70 border border-[#1A1A1A]/5">
                                   {record.date}
                                 </div>
                                 {index === 0 && <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">最新</span>}
                               </div>
                               <div className="flex items-center gap-1.5 shrink-0">
                                 <button
                                   onClick={() => {
                                      setEditingTrackingId(selectedTrackingDetail.id);
                                      setEditingFollowupId(record.id);
                                      setFollowupForm({ date: record.date, content: record.content });
                                      setIsTrackingDetailModalOpen(false);
                                      setIsFollowupModalOpen(true);
                                   }}
                                   className="text-gray-400 hover:text-stone-800 transition-colors p-1.5 hover:bg-stone-50 rounded cursor-pointer"
                                   title="修改跟进记录"
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                 </button>
                                 <button
                                   onClick={() => deleteFollowup(record.id)}
                                   className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded cursor-pointer"
                                   title="删除跟进记录"
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                 </button>
                               </div>
                            </div>
                            <div className="prose prose-sm prose-black max-w-none opacity-95 leading-relaxed text-[12.5px] sm:text-[13px]" dangerouslySetInnerHTML={{ __html: record.content }} />
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

      {/* 二次确认 Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
          <div 
            className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
            onClick={() => setConfirmAction(null)}
          />
          <div className="relative bg-white pt-8 sm:pt-6 p-8 max-w-sm w-full border border-[#1A1A1A]/10 shadow-2xl animate-in zoom-in-95 duration-200 sm:rounded-sm">
            <h3 className="text-xl font-bold mb-4 text-[#1A1A1A] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              {confirmAction.title}
            </h3>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#1A1A1A]/20 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors ${
                  confirmAction.type === 'delete_followup' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1A1A1A] hover:bg-black'
                }`}
              >
                确认
              </button>
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
          <div className="relative bg-[#F7F6F2] p-6 pt-8 sm:p-8 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-8 max-w-sm w-full border border-[#1A1A1A] shadow-2xl rounded-t-2xl sm:rounded-none">
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
          <div className="relative bg-[#F7F6F2] sm:border border-[#1A1A1A]/10 w-full sm:max-w-2xl h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none">
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
            
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-[#1A1A1A]/10 bg-gray-50 flex justify-end gap-3 sm:gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-5">
              {(isSystemAdmin || currentUser?.id === selectedRequirement.submitterId) && (
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
              {( (isSystemAdmin || currentUser?.id === selectedRequirement.submitterId) && (selectedRequirement.status === 'backlog' || selectedRequirement.status === 'reviewing') ) && (
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
            
            <div className="px-6 py-4 sm:p-8 border-t border-[#1A1A1A]/5 flex justify-end pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-8 bg-gray-50/50">
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
            
            <div className="px-6 py-4 sm:p-8 border-t border-[#1A1A1A]/5 flex justify-end pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-8 bg-gray-50/50">
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
            
            <div className="px-6 py-4 sm:p-8 border-t border-[#1A1A1A]/5 flex justify-end pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-8 bg-gray-50/50">
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
          syncError={syncError}
          setSyncError={setSyncError}
          rolePermissions={rolePermissions}
          setRolePermissions={setRolePermissions}
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

      {isIntroOpen && (
        <TrackFlowIntro onClose={() => setIsIntroOpen(false)} />
      )}

      {/* Central Database API Warning Toast / Dialog */}
      {apiError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-32px)] backdrop-blur-md">
          <div className="bg-white/95 border border-red-500/30 rounded-2xl shadow-[0_12px_40px_rgba(239,68,68,0.12)] overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="bg-red-50 text-red-600 p-2 rounded-xl shrink-0">
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] font-mono">同步同步异常警告</h4>
                    <span className="text-[10px] text-[#1A1A1A]/40 font-mono">{apiError.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#1A1A1A]/50 font-mono mt-1 font-bold">关联模块: {apiError.context}</p>
                  <p className="text-xs text-red-700/90 font-medium mt-2 leading-relaxed bg-red-50/40 p-2.5 rounded-lg border border-red-100 font-mono break-all line-clamp-4">
                    {apiError.message}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-[#1A1A1A]/5">
                {!useLocalMockMode && (
                  <button 
                    onClick={() => {
                      switchToLocalMockMode();
                      setApiError(null);
                    }}
                    className="flex-1 bg-[#1A1A1A] text-white hover:bg-black text-[10px] font-bold py-2 px-3 rounded-lg transition-all text-center uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
                  >
                    切换至前端本地模式
                  </button>
                )}
                <button 
                  onClick={() => setApiError(null)}
                  className="bg-white hover:bg-zinc-100 border border-[#1A1A1A]/10 text-[#1A1A1A] text-[10px] font-bold py-2 px-3.5 rounded-lg transition-all cursor-pointer select-none"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 极简精致的智能全局 Toast 系统 */}
      <div id="global-toast-container" className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-32px)] max-w-[360px] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => {
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
          let bgClass = "bg-white/95 border-emerald-500/10 text-zinc-800 shadow-[0_12px_32px_rgba(16,185,129,0.08)]";
          
          if (toast.type === 'error') {
            icon = <XCircle className="w-4 h-4 text-rose-600" />;
            bgClass = "bg-white/95 border-rose-500/10 text-zinc-800 shadow-[0_12px_32px_rgba(244,63,94,0.08)]";
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
            bgClass = "bg-white/95 border-amber-500/10 text-zinc-800 shadow-[0_12px_32px_rgba(245,158,11,0.08)]";
          } else if (toast.type === 'info') {
            icon = <Info className="w-4 h-4 text-indigo-600" />;
            bgClass = "bg-white/95 border-indigo-500/10 text-zinc-800 shadow-[0_12px_32px_rgba(99,102,241,0.08)]";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 border rounded-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${bgClass}`}
            >
              <div className="shrink-0">{icon}</div>
              <div className="flex-1 text-xs font-semibold text-zinc-800 break-words leading-snug">{toast.message}</div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 p-1 rounded-lg hover:bg-[#1A1A1A]/5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                id={`toast-close-${toast.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

