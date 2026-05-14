import React, { useState } from 'react';
import { Member, Group, Category } from '../types';
import { generateId } from '../lib/utils';
import RichTextEditor from './RichTextEditor';

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
}

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
  setAuthorizedCompanies
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'business' | 'groups' | 'members' | 'guide'>('global');

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
    setMembers(members.map(m => m.id === editingMemberId ? { 
      ...m, 
      ...editingMemberState, 
      department: editingMemberState.category,
      groupId: editingMemberState.groupId || undefined
    } : m));
    setEditingMemberId(null);
  };

  const handleResetAccount = (memberId: string) => {
    if (window.confirm('确定要重置该用户的账号密码吗？重置后该用户需重新设置账号密码，业务数据不受影响。')) {
      setMembers(members.map(m => m.id === memberId ? { ...m, account: '', password: '' } : m));
    }
  };

  const handleDeleteMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#F7F6F2] w-full max-w-3xl border border-[#1A1A1A] shadow-2xl relative flex flex-col max-h-[85vh]">
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
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
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
                    {['项目经理', '部门经理', '产品总监', '市场总监', '组长', '产品经理', '研发经理', '测试经理', '市场人员'].map(role => (
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
                           {['项目经理', '部门经理', '产品总监', '市场总监', '组长', '产品经理', '研发经理', '测试经理', '市场人员'].map(role => (
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
                        <div className="flex gap-4 shrink-0 justify-end">
                           <button 
                             onClick={() => {
                               setEditingMemberId(member.id);
                               setEditingMemberState({ name: member.name, avatar: member.avatar, roles: member.roles, category: member.department as 'marketing' | 'rnd' | 'admin', groupId: member.groupId || '' });
                             }}
                             className="text-[#1A1A1A] text-[10px] uppercase tracking-widest hover:underline"
                           >
                             修改
                           </button>
                           <button 
                             onClick={() => handleResetAccount(member.id)}
                             className="text-[#1A73E8] text-[10px] uppercase tracking-widest hover:underline"
                             title="重置登录账号和密码"
                           >
                             重置账号
                           </button>
                           <button 
                             onClick={() => handleDeleteMember(member.id)}
                             className="text-red-600 text-[10px] uppercase tracking-widest hover:underline"
                           >
                             删除
                           </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
