import React, { useState } from 'react';
import { Member, Group, Category, RolePermission } from '../types';
import { generateId } from '../lib/utils';
import RichTextEditor from './RichTextEditor';
import { Search, ChevronDown, ChevronUp, Shield, Sliders, Check, RefreshCw } from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Annie&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Leo&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=George&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Bailey&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Salem&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Mia&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Peanut&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Oscar&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Bear&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Maggie&backgroundColor=e5e7eb',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Snowball&backgroundColor=e5e7eb',
];

interface SettingsModalProps {
  onClose: () => void;
  // Settings Props
  annualTargetProfit: number;
  setAnnualTargetProfit: (val: number) => void;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  guideContent: string;
  setGuideContent: (val: string) => void;
  authorizedCompanies: string[];
  setAuthorizedCompanies: React.Dispatch<React.SetStateAction<string[]>>;
  syncError?: string | null;
  setSyncError?: (val: string | null) => void;
  rolePermissions: RolePermission[];
  setRolePermissions: React.Dispatch<React.SetStateAction<RolePermission[]>>;
}

const PERMISSION_DEFINITIONS = [
  { key: 'VIEW_DASHBOARD', label: '全局大盘', desc: '查看全局和各组的核心指标统计数据、历史数据与目标进度', category: '菜单访问' },
  { key: 'VIEW_TRACKING', label: '项目跟踪', desc: '查看并配置客户项目销售阶段、合同金额与每日跟进记录', category: '菜单访问' },
  { key: 'VIEW_MARKETING', label: '市场开拓', desc: '查看和编制市场组的考核指标、推进明细和月度发布目标', category: '菜单访问' },
  { key: 'VIEW_RND', label: '产品研发', desc: '查看研发项目大纲、状态进度、版本计划以及研发小组发布目标', category: '菜单访问' },
  { key: 'VIEW_REQUIREMENTS', label: '需求管理', desc: '完整查看客户和产品相关的多维需求和关联版本状态列表', category: '菜单访问' },
  { key: 'EDIT_RELEASE_GOAL', label: '目标编制', desc: '赋予在“市场/研发”版块中增加或修改小组年度/月度发布目标的权利', category: '业务操作' },
  { key: 'MANAGE_PLAN_TASK', label: '编制规划任务', desc: '赋予在“全局/市场/研发”中对季度/月度计划做任务分解、指派及状态维护的权利', category: '业务操作' },
  { key: 'MANAGE_REQUIREMENT', label: '管理需求', desc: '赋予新建、流转状态、编辑或直接在系统物理删除原始需求的权利', category: '业务操作' },
  { key: 'REVIEW_DELIVERABLE', label: '审核成果产出', desc: '对小组提交的任务产出交付物(outcomes)执行审核通过、重做或驳回的审批权', category: '业务操作' },
  { key: 'MANAGE_SYSTEM_SETTINGS', label: '系统设置管理', desc: '赋予进入系统设置、配置业务参数与公司白名单、管理小组与成员以及调整角色权限的最高编辑权利', category: '业务操作' },
];

export default function SettingsModal({
  onClose,
  annualTargetProfit,
  setAnnualTargetProfit,
  groups,
  setGroups,
  members,
  setMembers,
  guideContent,
  setGuideContent,
  authorizedCompanies,
  setAuthorizedCompanies,
  syncError,
  setSyncError,
  rolePermissions,
  setRolePermissions
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'business' | 'groups' | 'members' | 'guide' | 'permissions'>('global');

  // Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<Category>('marketing');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupCategory, setEditingGroupCategory] = useState<Category>('marketing');
  
  // Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRoles, setNewMemberRoles] = useState<string[]>([]);
  const [newMemberCategory, setNewMemberCategory] = useState<Category | 'admin'>('marketing');
  const [newMemberGroupId, setNewMemberGroupId] = useState('');
  const [newMemberAvatar, setNewMemberAvatar] = useState(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
  const [avatarDropdownField, setAvatarDropdownField] = useState<'new' | string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberState, setEditingMemberState] = useState({ name: '', avatar: '', roles: [] as string[], category: 'marketing' as Category | 'admin', groupId: '' });
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);

  // 权限配置标签专属状态
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [isMenuAccessExpanded, setIsMenuAccessExpanded] = useState(true);
  const [isBusinessOpExpanded, setIsBusinessOpExpanded] = useState(true);

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    setGroups([...groups, { id: generateId(), name: newGroupName, category: newGroupCategory }]);
    setNewGroupName('');
  };

  const handleUpdateGroup = () => {
    if (!editingGroupName.trim() || !editingGroupId) return;
    setGroups(groups.map(g => g.id === editingGroupId ? { ...g, name: editingGroupName, category: editingGroupCategory } : g));
    setEditingGroupId(null);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
    // Optionally move members of deleted group to no group
    setMembers(members.map(m => m.groupId === id ? { ...m, groupId: undefined } : m));
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || newMemberRoles.length === 0) return;
    const newMember: Member = {
      id: generateId(),
      name: newMemberName,
      avatar: newMemberAvatar,
      roles: newMemberRoles,
      department: newMemberCategory,
      groupId: newMemberGroupId || undefined
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberRoles([]);
    setNewMemberAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
  };

  const handleUpdateMember = () => {
    if (!editingMemberState.name.trim() || !editingMemberId) return;
    const { category, ...restState } = editingMemberState;
    setMembers(members.map(m => m.id === editingMemberId ? { 
      ...m, 
      ...restState, 
      department: category,
      groupId: editingMemberState.groupId || undefined
    } : m));
    setEditingMemberId(null);
  };

  const handleResetAccount = (memberId: string) => {
    setMembers(members.map(m => m.id === memberId ? { ...m, account: '', password: '' } : m));
  };

  const handleDeleteMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 pt-10 sm:p-4">
      <div className="bg-[#F7F6F2] w-full pt-8 sm:pt-0 max-w-3xl sm:border border-[#1A1A1A] shadow-2xl relative flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] mt-auto sm:mt-0 rounded-t-2xl sm:rounded-2xl">
        <div className="w-12 h-1.5 bg-[#1A1A1A]/20 rounded-full mx-auto sm:hidden absolute top-3 left-1/2 -translate-x-1/2"></div>
        <div className="p-6 border-b border-[#1A1A1A]/10 flex justify-between items-center shrink-0">
          <h3 className="text-2xl font-serif italic">系统设置</h3>
          <button onClick={onClose} className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex border-b border-[#1A1A1A]/10 shrink-0 px-6 pt-4 gap-6 text-sm uppercase tracking-widest font-semibold overflow-x-auto">
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'global' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('global')}
          >
            登录授权
          </button>
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'business' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('business')}
          >
            业务参数
          </button>
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'groups' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('groups')}
          >
            小组管理
          </button>
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'members' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('members')}
          >
            成员管理
          </button>
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'guide' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('guide')}
          >
            使用说明
          </button>
          <button 
            className={`pb-3 border-b-2 whitespace-nowrap ${activeTab === 'permissions' ? 'border-[#1A1A1A]' : 'border-transparent opacity-50 hover:opacity-100'}`}
            onClick={() => setActiveTab('permissions')}
          >
            权限配置
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {syncError && (
            <div className="mb-6 p-4 bg-amber-50 text-[#1A1A1A] border border-amber-300 text-xs flex flex-col gap-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">⚠️ 云数据库部分表连接受限</span>
                <span className="opacity-70 text-[10px]">(当前改动已暂存在本地浏览器，完美可用)</span>
              </div>
              <p className="opacity-85 text-[11px] leading-relaxed">
                您的云端数据库对 <code className="bg-black/5 px-1.5 py-0.5 rounded text-red-600 font-mono">groups</code> 或 <code className="bg-black/5 px-1.5 py-0.5 rounded text-red-600 font-mono">members</code> 启用了 Row Level Security (RLS) 安全限流：
                <br />
                {syncError}
                <br />
                <strong className="text-amber-800">别担心</strong>，所有当前新建、更易的架构设置已直接保存在浏览器本地（localStorage），<strong>您可以正常使用系统的所有功能！</strong>
              </p>
              <div className="bg-black/5 p-2.5 rounded font-mono text-[10px]">
                <p className="font-bold mb-1.5 opacity-70">💡 解除云同步限制：请登录您的 Supabase Dashboard，在 SQL Editor 中执行下述语句后刷新系统：</p>
                <div className="bg-black text-[#A3E635] p-2.5 rounded overflow-x-auto whitespace-pre-wrap font-mono select-all">
                  {`alter table groups disable row level security;
alter table members disable row level security;`}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'global' && (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">授权公司白名单</label>
                <p className="text-xs opacity-60 italic mb-4">仅以下列表中的公司名称可登录系统。输入公司全称并按回车添加。</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {authorizedCompanies.map((company, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white border border-[#1A1A1A]/20 px-3 py-1.5 shadow-sm">
                      <span className="text-xs font-bold">{company}</span>
                      <button 
                        onClick={() => setAuthorizedCompanies(prev => prev.filter((_, i) => i !== index))}
                        className="text-[#1A1A1A]/40 hover:text-red-500 hover:font-bold transition-colors ml-2 font-mono"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {authorizedCompanies.length === 0 && (
                    <span className="text-xs opacity-40 italic">暂无授权公司（当前拦截所有登录）</span>
                  )}
                </div>

                <div className="flex gap-2 max-w-sm">
                  <input 
                    type="text" 
                    id="new-company-input"
                    className="flex-1 bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                    placeholder="输入公司全称以添加"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !authorizedCompanies.includes(val)) {
                          setAuthorizedCompanies(prev => [...prev, val]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-company-input') as HTMLInputElement;
                      if (!input) return;
                      const val = input.value.trim();
                      if (val && !authorizedCompanies.includes(val)) {
                        setAuthorizedCompanies(prev => [...prev, val]);
                        input.value = '';
                      }
                    }}
                    className="bg-[#1A1A1A] text-white px-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">年度利润目标 (万)</label>
                <input 
                  type="number" 
                  value={annualTargetProfit}
                  onChange={(e) => setAnnualTargetProfit(Number(e.target.value))}
                  className="w-full max-w-sm bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-6 flex flex-col h-full min-h-[300px]">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">系统使用说明</label>
                <p className="text-xs opacity-60 italic mb-4">在此编辑的说明将通过弹窗展示给所有用户。</p>
              </div>
              <div className="flex-1">
                <RichTextEditor value={guideContent} onChange={setGuideContent} />
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,150px,auto] gap-4 items-end">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">新增小组名称</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                    placeholder="例如: 财务部"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">所属业务</label>
                  <select 
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value as Category)}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  >
                    <option value="marketing">市场开拓</option>
                    <option value="rnd">产品研发</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddGroup}
                  className="bg-[#1A1A1A] text-white px-4 py-2 mt-4 md:mt-0 text-xs uppercase tracking-widest hover:bg-black transition-colors w-full h-[38px] shrink-0"
                >
                  添加
                </button>
              </div>

              <div className="space-y-2 mt-6">
                {groups.map(group => (
                  <div key={group.id} className="flex justify-between items-center p-3 border border-[#1A1A1A]/10 bg-white/50">
                    {editingGroupId === group.id ? (
                       <div className="flex items-center gap-2 flex-1 mr-4">
                         <input 
                           type="text" 
                           value={editingGroupName}
                           onChange={(e) => setEditingGroupName(e.target.value)}
                           className="flex-1 bg-transparent border-b border-[#1A1A1A] outline-none py-1 text-sm font-medium"
                           autoFocus
                         />
                         <select
                           value={editingGroupCategory}
                           onChange={(e) => setEditingGroupCategory(e.target.value as Category)}
                           className="bg-transparent border-b border-[#1A1A1A] outline-none py-1 text-sm shrink-0"
                         >
                           <option value="marketing">市场开拓</option>
                           <option value="rnd">产品研发</option>
                         </select>
                         <button onClick={handleUpdateGroup} className="text-[#1A1A1A] text-[10px] uppercase tracking-widest hover:underline whitespace-nowrap">保存</button>
                         <button onClick={() => setEditingGroupId(null)} className="text-[#1A1A1A]/60 text-[10px] uppercase tracking-widest hover:underline whitespace-nowrap">取消</button>
                       </div>
                    ) : (
                       <>
                         <div className="flex items-center gap-3">
                           <span className="font-medium text-sm">{group.name}</span>
                           <span className="text-[10px] uppercase opacity-50 bg-[#1A1A1A]/5 px-1.5 py-0.5">
                             {group.category === 'marketing' ? '市场开拓' : group.category === 'rnd' ? '产品研发' : ''}
                           </span>
                         </div>
                         <div className="flex gap-4">
                           <button 
                             onClick={() => {
                               setEditingGroupId(group.id);
                               setEditingGroupName(group.name);
                               setEditingGroupCategory(group.category);
                             }}
                             className="text-[#1A1A1A] text-[10px] uppercase tracking-widest hover:underline shrink-0"
                           >
                             修改
                           </button>
                           <button 
                             onClick={() => handleDeleteGroup(group.id)}
                             className="text-red-600 text-[10px] uppercase tracking-widest hover:underline shrink-0"
                           >
                             删除
                           </button>
                         </div>
                       </>
                    )}
                  </div>
                ))}
                {groups.length === 0 && <p className="text-xs opacity-50 italic">暂无小组</p>}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,1fr,110px,130px,auto] gap-4 items-end bg-white/30 p-4 border border-[#1A1A1A]/5 relative">
                <div className="relative mb-1 md:mb-0">
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 invisible hidden md:block">头像</label>
                  <button 
                    type="button"
                    onClick={() => setAvatarDropdownField(avatarDropdownField === 'new' ? null : 'new')}
                    className="w-10 h-10 rounded-full border border-[#1A1A1A]/20 bg-black/5 overflow-hidden block shrink-0"
                  >
                    <img src={newMemberAvatar} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                  {avatarDropdownField === 'new' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#F7F6F2] border border-[#1A1A1A] p-2 shadow-xl z-50 grid grid-cols-4 gap-2">
                       {PRESET_AVATARS.map((avatar, idx) => (
                         <button 
                           key={idx} 
                           type="button" 
                           onClick={() => { setNewMemberAvatar(avatar); setAvatarDropdownField(null); }}
                           className={`w-10 h-10 rounded-full border-2 overflow-hidden ${newMemberAvatar === avatar ? 'border-amber-900' : 'border-transparent hover:border-[#1A1A1A]/30'}`}
                         >
                           <img src={avatar} alt="avatar option" className="w-full h-full bg-black/5" />
                         </button>
                       ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">姓名</label>
                  <input 
                    type="text" 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">职位 / 角色</label>
                  <div className="flex flex-wrap gap-2">
                    {['系统管理员', '项目经理', '部门经理', '产品总监', '市场总监', '组长', '产品经理', '研发经理', '测试经理', '市场人员'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (newMemberRoles.includes(role)) {
                            setNewMemberRoles(newMemberRoles.filter(r => r !== role));
                          } else {
                            setNewMemberRoles([...newMemberRoles, role]);
                          }
                        }}
                        className={`text-[10px] px-2 py-1 rounded-sm border transition-colors ${newMemberRoles.includes(role) ? 'bg-[#1A1A1A] text-[#F7F6F2] border-[#1A1A1A]' : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/20 hover:border-[#1A1A1A]'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">所属业务</label>
                  <select 
                    value={newMemberCategory}
                    onChange={(e) => {
                      setNewMemberCategory(e.target.value as Category | 'admin');
                      setNewMemberGroupId('');
                    }}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  >
                    <option value="marketing">市场开拓</option>
                    <option value="rnd">产品研发</option>
                    <option value="admin">管理</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">所属小组</label>
                  <select 
                    value={newMemberGroupId}
                    onChange={(e) => setNewMemberGroupId(e.target.value)}
                    className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
                  >
                    <option value="">请选择（可选）</option>
                    {groups.filter(g => g.category === newMemberCategory).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <button 
                  onClick={handleAddMember}
                  className="bg-[#1A1A1A] text-white px-4 py-2 mt-4 md:mt-0 text-xs uppercase tracking-widest hover:bg-black transition-colors w-full h-[38px] shrink-0"
                >
                  添加
                </button>
              </div>

              <div className="space-y-3 mt-6">
                {members.map(member => (
                  <div key={member.id} className="flex flex-col md:flex-row md:justify-between md:items-center p-3 border border-[#1A1A1A]/10 bg-white/50 gap-3">
                    {editingMemberId === member.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,1fr,110px,130px,auto] gap-3 flex-1 w-full relative">
                         <div className="relative">
                            <button 
                              type="button"
                              onClick={() => setAvatarDropdownField(avatarDropdownField === member.id ? null : member.id)}
                              className="w-10 h-10 rounded-full border border-[#1A1A1A]/20 bg-black/5 overflow-hidden block shrink-0"
                            >
                              <img src={editingMemberState.avatar} alt="avatar" className="w-full h-full object-cover" />
                            </button>
                            {avatarDropdownField === member.id && (
                              <div className="absolute top-full left-0 mt-2 w-48 bg-[#F7F6F2] border border-[#1A1A1A] p-2 shadow-xl z-50 grid grid-cols-4 gap-2">
                                 {PRESET_AVATARS.map((avatar, idx) => (
                                   <button 
                                     key={idx} 
                                     type="button" 
                                     onClick={() => { setEditingMemberState({...editingMemberState, avatar}); setAvatarDropdownField(null); }}
                                     className={`w-10 h-10 rounded-full border-2 overflow-hidden ${editingMemberState.avatar === avatar ? 'border-amber-900' : 'border-transparent hover:border-[#1A1A1A]/30'}`}
                                   >
                                     <img src={avatar} alt="avatar option" className="w-full h-full bg-black/5" />
                                   </button>
                                 ))}
                              </div>
                            )}
                         </div>
                         <input 
                           type="text" 
                           value={editingMemberState.name}
                           onChange={(e) => setEditingMemberState({...editingMemberState, name: e.target.value})}
                           className="bg-transparent border-b border-[#1A1A1A] outline-none py-1 text-sm font-medium"
                         />
                         <div className="flex flex-wrap gap-1 items-center">
                           {['系统管理员', '项目经理', '部门经理', '产品总监', '市场总监', '组长', '产品经理', '研发经理', '测试经理', '市场人员'].map(role => (
                             <button
                               key={role}
                               type="button"
                               onClick={() => {
                                 const currentRoles = editingMemberState.roles || [];
                                 if (currentRoles.includes(role)) {
                                   setEditingMemberState({...editingMemberState, roles: currentRoles.filter(r => r !== role)});
                                 } else {
                                   setEditingMemberState({...editingMemberState, roles: [...currentRoles, role]});
                                 }
                               }}
                               className={`text-[10px] px-2 py-1 rounded border transition-colors ${editingMemberState.roles?.includes(role) ? 'bg-[#1A1A1A] text-[#F7F6F2] border-[#1A1A1A]' : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/20 hover:border-[#1A1A1A]'}`}
                             >
                               {role}
                             </button>
                           ))}
                         </div>
                         <select 
                           value={editingMemberState.category}
                           onChange={(e) => setEditingMemberState({...editingMemberState, category: e.target.value as Category | 'admin', groupId: ''})}
                           className="bg-transparent border-b border-[#1A1A1A] outline-none py-1 text-sm"
                         >
                            <option value="marketing">市场开拓</option>
                            <option value="rnd">产品研发</option>
                            <option value="admin">管理</option>
                         </select>
                         <select 
                           value={editingMemberState.groupId}
                           onChange={(e) => setEditingMemberState({...editingMemberState, groupId: e.target.value})}
                           className="bg-transparent border-b border-[#1A1A1A] outline-none py-1 text-sm"
                         >
                           <option value="">请选择（可选）</option>
                           {groups.filter(g => g.category === editingMemberState.category).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                           {/* Add raw value if deleted */}
                           {editingMemberState.groupId && !groups.find(g => g.id === editingMemberState.groupId) && <option value={editingMemberState.groupId}>未知小组</option>}
                         </select>
                         <div className="flex items-center gap-3">
                           <button onClick={handleUpdateMember} className="text-[#1A1A1A] text-[10px] uppercase tracking-widest hover:underline">保存</button>
                           <button onClick={() => setEditingMemberId(null)} className="text-[#1A1A1A]/60 text-[10px] uppercase tracking-widest hover:underline">取消</button>
                         </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
                          <span className="font-medium text-sm flex items-center gap-2">
                             <img src={member.avatar} alt="avatar" className="w-5 h-5 rounded-full" />
                             {member.name}
                          </span>
                          <span className="text-[10px] font-mono opacity-60 bg-[#1A1A1A]/5 px-1 py-0.5 whitespace-nowrap">{member.roles.join(', ')}</span>
                          <span className="text-[10px] uppercase opacity-50 whitespace-nowrap overflow-hidden text-ellipsis px-1.5 py-0.5 border border-[#1A1A1A]/10">
                            {member.department === 'marketing' ? '市场开拓' : member.department === 'rnd' ? '产品研发' : member.department === 'admin' ? '管理' : ''} / {groups.find(g => g.id === member.groupId)?.name || '未分组'}
                          </span>
                        </div>
                        {deletingMemberId === member.id ? (
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[11px] text-red-600 font-bold shrink-0 font-mono">确定将该成员移出吗？</span>
                            <button 
                              onClick={() => {
                                handleDeleteMember(member.id);
                                setDeletingMemberId(null);
                              }}
                              className="bg-red-600 text-white hover:bg-red-700 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-red-600 select-none cursor-pointer tracking-wider h-[32px] flex items-center active:scale-95 transition-all font-mono"
                            >
                              确认删除
                            </button>
                            <button 
                              onClick={() => setDeletingMemberId(null)}
                              className="bg-white hover:bg-zinc-100 border border-[#1A1A1A]/15 text-[#1A1A1A] text-[10px] font-bold py-1.5 px-3 rounded-lg select-none cursor-pointer h-[32px] flex items-center active:scale-95 transition-all font-mono"
                            >
                              取消
                            </button>
                          </div>
                        ) : resettingMemberId === member.id ? (
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[11px] text-amber-600 font-bold shrink-0 font-mono">确定要重置该账号和密码吗？</span>
                            <button 
                              id={`confirm-reset-btn-${member.id}`}
                              onClick={() => {
                                handleResetAccount(member.id);
                                setResettingMemberId(null);
                              }}
                              className="bg-amber-600 text-white hover:bg-amber-700 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-amber-600 select-none cursor-pointer tracking-wider h-[32px] flex items-center active:scale-95 transition-all font-mono animate-pulse"
                            >
                              确认重置
                            </button>
                            <button 
                              onClick={() => setResettingMemberId(null)}
                              className="bg-white hover:bg-zinc-100 border border-[#1A1A1A]/15 text-[#1A1A1A] text-[10px] font-bold py-1.5 px-3 rounded-lg select-none cursor-pointer h-[32px] flex items-center active:scale-95 transition-all font-mono"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-4 shrink-0 justify-end">
                            <button 
                              onClick={() => {
                                setEditingMemberId(member.id);
                                setEditingMemberState({ name: member.name, avatar: member.avatar, roles: member.roles, category: member.department as 'marketing' | 'rnd' | 'admin', groupId: member.groupId || '' });
                              }}
                              className="text-[#1A1A1A] text-[10px] uppercase tracking-widest hover:underline whitespace-nowrap"
                            >
                              修改
                            </button>
                            <button 
                              id={`trigger-reset-btn-${member.id}`}
                              onClick={() => setResettingMemberId(member.id)}
                              className="text-[#1A73E8] text-[10px] uppercase tracking-widest hover:underline whitespace-nowrap cursor-pointer"
                              title="重置登录账号和密码"
                            >
                              重置账号
                            </button>
                            <button 
                              onClick={() => setDeletingMemberId(member.id)}
                              className="text-red-600 text-[10px] uppercase tracking-widest hover:underline whitespace-nowrap"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (() => {
            const allRoles = Array.from(new Set([
              '系统管理员', '项目经理', '部门经理', '产品总监', '市场总监', '组长', '产品经理', '研发经理', '测试经理', '市场人员',
              ...members.flatMap(m => m.roles || [])
            ])).filter(Boolean);

            const filteredRoles = allRoles.filter(role =>
              role.toLowerCase().includes(roleSearchQuery.trim().toLowerCase())
            );

            const menuAccessDefinitions = PERMISSION_DEFINITIONS.filter(p => p.category === '菜单访问');
            const businessOpDefinitions = PERMISSION_DEFINITIONS.filter(p => p.category === '业务操作');

            const updateRolePermissions = (role: string, nextPerms: string[]) => {
              setRolePermissions(prev => {
                const exists = prev.find(r => r.roleName === role);
                if (exists) {
                  return prev.map(r => r.roleName === role ? { ...r, permissions: nextPerms } : r);
                } else {
                  return [...prev, { roleName: role, permissions: nextPerms }];
                }
              });
            };

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A]/10 pb-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#1A1A1A]">管理员控制台 — 角色权限分配矩阵</h4>
                    <p className="text-xs opacity-60 mt-1 leading-relaxed">
                      灵活切换各个系统职务对功能视窗与操作权利的安全授权。完成更改后即时写入底层主数据库并自动同步。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('确定要恢复系统出厂自带的角色权限配置吗？此操作会覆盖当前的所有修改。')) {
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
                      }
                    }}
                    className="bg-stone-200 border border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-stone-300 text-xs px-3 py-1.5 font-bold tracking-wider rounded transition-all shrink-0 uppercase whitespace-nowrap self-start sm:self-center cursor-pointer active:scale-95"
                  >
                    恢复出厂默认值
                  </button>
                </div>

                {/* 搜索过滤工具栏 */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-stone-100/50 border border-[#1A1A1A]/10 p-3 rounded-lg">
                  <div className="relative flex-1 max-w-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-stone-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="快学检索，输入特定角色名称进行过滤配置..."
                      value={roleSearchQuery}
                      onChange={(e) => setRoleSearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A]/15 focus:border-[#1A1A1A]/40 rounded pl-9 pr-8 py-1.5 text-xs outline-none transition-colors placeholder:text-stone-400 text-[#1A1A1A] font-medium"
                    />
                    {roleSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRoleSearchQuery('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-black transition-colors"
                      >
                        <span className="text-sm font-bold">×</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                    <span>系统角色: <strong>{allRoles.length}</strong> 组</span>
                    <span className="opacity-30">|</span>
                    <span>已筛选: <strong>{filteredRoles.length}</strong> 组</span>
                  </div>
                </div>

                {filteredRoles.length === 0 ? (
                  <div className="text-center py-10 border border-stone-200 border-dashed rounded bg-white/40">
                    <p className="text-xs text-stone-400 font-medium">无匹配的系统角色名 “{roleSearchQuery}”</p>
                    <button 
                      type="button" 
                      onClick={() => setRoleSearchQuery('')}
                      className="mt-3 text-[10px] text-[#1A1A1A] font-bold border border-[#1A1A1A]/30 px-2 py-0.5 uppercase hover:bg-[#1A1A1A] hover:text-[#F7F6F2] transition-colors"
                    >
                      取消检索
                    </button>
                  </div>
                ) : (
                  <>
                    {/* DESKTOP VIEW */}
                    <div className="hidden md:block space-y-5">
                      {/* 菜单访问分组面板 */}
                      <div className="border border-[#1A1A1A]/10 rounded-xl bg-white shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsMenuAccessExpanded(!isMenuAccessExpanded)}
                          className="w-full text-left p-4 bg-stone-100 hover:bg-stone-200/60 transition-colors flex items-center justify-between border-b border-[#1A1A1A]/10 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-stone-600" />
                            <span className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">层级 A：菜单访问配置组 (Menus Access Scope)</span>
                            <span className="text-[9px] bg-[#1A1A1A]/10 text-[#1A1A1A] font-mono font-bold px-1.5 py-0.5 rounded-sm">5项</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 font-medium">
                            <span>{isMenuAccessExpanded ? '折叠此分类' : '展开展平此分类'}</span>
                            {isMenuAccessExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                        {isMenuAccessExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[650px]">
                              <thead>
                                <tr className="bg-stone-50 border-b border-[#1A1A1A]/10 text-[9px] tracking-wider uppercase font-bold text-[#1A1A1A]/70">
                                  <th className="py-2.5 px-4 sticky left-0 bg-stone-50 w-36 border-r border-[#1A1A1A]/10 z-10">系统角色 / 职能</th>
                                  {menuAccessDefinitions.map(p => (
                                    <th key={p.key} className="py-2.5 px-2 text-center" title={`${p.label}: ${p.desc}`}>
                                      <div className="text-[10px] leading-tight font-bold text-stone-800">{p.label}</div>
                                      <span className="text-[8px] opacity-40 font-normal block mt-0.5 leading-tight">{p.desc}</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRoles.map(role => {
                                  const currentRp = rolePermissions.find(r => r.roleName === role);
                                  const currentRpPermissions = currentRp ? currentRp.permissions : [];
                                  const groupKeys = menuAccessDefinitions.map(p => p.key);
                                  const isAllSelected = groupKeys.every(pk => currentRpPermissions.includes(pk));

                                  const toggleAllInGroup = () => {
                                    let nextPerms: string[];
                                    if (isAllSelected) {
                                      nextPerms = currentRpPermissions.filter(pk => !groupKeys.includes(pk));
                                    } else {
                                      nextPerms = Array.from(new Set([...currentRpPermissions, ...groupKeys]));
                                    }
                                    updateRolePermissions(role, nextPerms);
                                  };

                                  return (
                                    <tr key={role} className="border-b border-[#1A1A1A]/5 hover:bg-stone-50/50 transition-colors">
                                      <td className="py-3 px-4 font-bold text-[#1a1a1a] text-xs sticky left-0 bg-white border-r border-[#1A1A1A]/10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col gap-1">
                                          <span>{role}</span>
                                          <button
                                            type="button"
                                            onClick={toggleAllInGroup}
                                            className="text-[9px] text-stone-400 hover:text-black uppercase text-left tracking-wider hover:underline font-mono"
                                          >
                                            {isAllSelected ? '清空菜单栏' : '一键勾选组'}
                                          </button>
                                        </div>
                                      </td>
                                      {menuAccessDefinitions.map(p => {
                                        const isChecked = currentRpPermissions.includes(p.key);
                                        const handleToggle = () => {
                                          const nextPerms = isChecked
                                            ? currentRpPermissions.filter(pk => pk !== p.key)
                                            : [...currentRpPermissions, p.key];
                                          updateRolePermissions(role, nextPerms);
                                        };
                                        return (
                                          <td key={p.key} className="p-2.5 text-center vertical-middle">
                                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={handleToggle}
                                                className="accent-[#1A1A1A] h-4 w-4 rounded-sm border-stone-300 focus:ring-black cursor-pointer"
                                              />
                                            </label>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* 业务操作分组面板 */}
                      <div className="border border-[#1A1A1A]/10 rounded-xl bg-white shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsBusinessOpExpanded(!isBusinessOpExpanded)}
                          className="w-full text-left p-4 bg-stone-100 hover:bg-stone-200/60 transition-colors flex items-center justify-between border-b border-[#1A1A1A]/10 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-stone-600" />
                            <span className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">层级 B：业务操作权限组 (Operations & Access)</span>
                            <span className="text-[9px] bg-[#1A1A1A]/10 text-[#1A1A1A] font-mono font-bold px-1.5 py-0.5 rounded-sm">4项</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 font-medium">
                            <span>{isBusinessOpExpanded ? '折叠此分类' : '展开展平此分类'}</span>
                            {isBusinessOpExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                        {isBusinessOpExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[650px]">
                              <thead>
                                <tr className="bg-stone-50 border-b border-[#1A1A1A]/10 text-[9px] tracking-wider uppercase font-bold text-[#1A1A1A]/70">
                                  <th className="py-2.5 px-4 sticky left-0 bg-stone-50 w-36 border-r border-[#1A1A1A]/10 z-10">系统角色 / 职能</th>
                                  {businessOpDefinitions.map(p => (
                                    <th key={p.key} className="py-2.5 px-2 text-center" title={`${p.label}: ${p.desc}`}>
                                      <div className="text-[10px] leading-tight font-bold text-stone-800">{p.label}</div>
                                      <span className="text-[8px] opacity-40 font-normal block mt-0.5 leading-tight">{p.desc}</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRoles.map(role => {
                                  const currentRp = rolePermissions.find(r => r.roleName === role);
                                  const currentRpPermissions = currentRp ? currentRp.permissions : [];
                                  const groupKeys = businessOpDefinitions.map(p => p.key);
                                  const isAllSelected = groupKeys.every(pk => currentRpPermissions.includes(pk));

                                  const toggleAllInGroup = () => {
                                    let nextPerms: string[];
                                    if (isAllSelected) {
                                      nextPerms = currentRpPermissions.filter(pk => !groupKeys.includes(pk));
                                    } else {
                                      nextPerms = Array.from(new Set([...currentRpPermissions, ...groupKeys]));
                                    }
                                    updateRolePermissions(role, nextPerms);
                                  };

                                  return (
                                    <tr key={role} className="border-b border-[#1A1A1A]/5 hover:bg-stone-50/50 transition-colors">
                                      <td className="py-3 px-4 font-bold text-[#1a1a1a] text-xs sticky left-0 bg-white border-r border-[#1A1A1A]/10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col gap-1">
                                          <span>{role}</span>
                                          <button
                                            type="button"
                                            onClick={toggleAllInGroup}
                                            className="text-[9px] text-stone-400 hover:text-black uppercase text-left tracking-wider hover:underline font-mono"
                                          >
                                            {isAllSelected ? '清空操作权' : '一键勾选组'}
                                          </button>
                                        </div>
                                      </td>
                                      {businessOpDefinitions.map(p => {
                                        const isChecked = currentRpPermissions.includes(p.key);
                                        const handleToggle = () => {
                                          const nextPerms = isChecked
                                            ? currentRpPermissions.filter(pk => pk !== p.key)
                                            : [...currentRpPermissions, p.key];
                                          updateRolePermissions(role, nextPerms);
                                        };
                                        return (
                                          <td key={p.key} className="p-2.5 text-center vertical-middle">
                                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={handleToggle}
                                                className="accent-[#1A1A1A] h-4 w-4 rounded-sm border-stone-300 focus:ring-black cursor-pointer"
                                              />
                                            </label>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MOBILE VIEW */}
                    <div className="block md:hidden space-y-4">
                      <p className="text-[10px] opacity-40 italic">正在使用移动端显示模式，通过角色卡片对 <b>菜单访问 (5项) & 业务操作 (4项)</b> 执行分层管理：</p>
                      {filteredRoles.map(role => {
                        const currentRp = rolePermissions.find(r => r.roleName === role);
                        const currentRpPermissions = currentRp ? currentRp.permissions : [];

                        return (
                          <details
                            key={role}
                            className="group bg-white border border-[#1A1A1A]/10 rounded-xl overflow-hidden transition-all duration-300 [&_summary::-webkit-details-marker]:hidden open:shadow-md"
                          >
                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none font-bold text-xs text-[#1A1A1A] hover:bg-stone-50">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-3 bg-[#1A1A1A] rounded-full"></span>
                                <span>{role}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-normal opacity-50 font-mono">
                                  授权 {currentRpPermissions.length} / {PERMISSION_DEFINITIONS.length}
                                </span>
                                <span className="transition-transform duration-300 group-open:rotate-180 transform block text-[8px]">▼</span>
                              </div>
                            </summary>

                            <div className="p-4 border-t border-[#1A1A1A]/5 bg-stone-50/50 space-y-4">
                              <div className="flex justify-between items-center bg-stone-100 p-2 rounded-lg border border-[#1A1A1A]/5">
                                <span className="text-[9px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest font-mono">复合一键授权</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allPerms = PERMISSION_DEFINITIONS.map(p => p.key);
                                    const isAllSelected = allPerms.every(pk => currentRpPermissions.includes(pk));
                                    const nextPerms = isAllSelected ? [] : allPerms;
                                    updateRolePermissions(role, nextPerms);
                                  }}
                                  className="text-[9px] font-bold text-[#1A1A1A]/70 hover:text-black bg-white border border-[#1A1A1A]/10 px-2 py-1 rounded font-mono active:scale-95 transition-all shadow-xs"
                                >
                                  {PERMISSION_DEFINITIONS.map(p => p.key).every(pk => currentRpPermissions.includes(pk)) ? '一键清空' : '一键全选'}
                                </button>
                              </div>

                              {/* 1. 菜单访问授权 (5项) */}
                              <div>
                                <div className="border-l-2 border-stone-800 pl-2 mb-2 text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center justify-between">
                                  <span>1. 菜单访问分组控制</span>
                                  <span className="text-[8px] font-mono opacity-50">({menuAccessDefinitions.filter(p => currentRpPermissions.includes(p.key)).length}/5 项已授)</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {menuAccessDefinitions.map(p => {
                                    const isChecked = currentRpPermissions.includes(p.key);
                                    const handleToggleMobile = () => {
                                      const nextPerms = isChecked
                                        ? currentRpPermissions.filter(pk => pk !== p.key)
                                        : [...currentRpPermissions, p.key];
                                      updateRolePermissions(role, nextPerms);
                                    };

                                    return (
                                      <div key={p.key} className="flex justify-between items-start gap-4 p-2.5 bg-white rounded-lg border border-[#1A1A1A]/5 shadow-sm hover:border-[#1A1A1A]/20 transition-all">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-[#1A1A1A]">{p.label}</span>
                                          </div>
                                          <p className="text-[10px] opacity-50 mt-1 leading-relaxed break-words">{p.desc}</p>
                                        </div>
                                        <div className="flex items-center justify-center p-1">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={handleToggleMobile}
                                            className="accent-black h-4.5 w-4.5 cursor-pointer rounded border-stone-400"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. 业务操作授权 (4项) */}
                              <div className="pt-2">
                                <div className="border-l-2 border-stone-800 pl-2 mb-2 text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center justify-between">
                                  <span>2. 业务操作分组控制</span>
                                  <span className="text-[8px] font-mono opacity-50">({businessOpDefinitions.filter(p => currentRpPermissions.includes(p.key)).length}/4 项已授)</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {businessOpDefinitions.map(p => {
                                    const isChecked = currentRpPermissions.includes(p.key);
                                    const handleToggleMobile = () => {
                                      const nextPerms = isChecked
                                        ? currentRpPermissions.filter(pk => pk !== p.key)
                                        : [...currentRpPermissions, p.key];
                                      updateRolePermissions(role, nextPerms);
                                    };

                                    return (
                                      <div key={p.key} className="flex justify-between items-start gap-4 p-2.5 bg-white rounded-lg border border-[#1A1A1A]/5 shadow-sm hover:border-[#1A1A1A]/20 transition-all">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-[#1A1A1A]">{p.label}</span>
                                          </div>
                                          <p className="text-[10px] opacity-50 mt-1 leading-relaxed break-words">{p.desc}</p>
                                        </div>
                                        <div className="flex items-center justify-center p-1">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={handleToggleMobile}
                                            className="accent-black h-4.5 w-4.5 cursor-pointer rounded border-stone-400"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Status footer inside the tab */}
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] p-3 rounded-lg flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                  <span>配置同步就绪：保存的数据将直接存入 SQLite 数据库及本地。所有成员的操作权限都会跟随当前安全规则实时更新！</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
