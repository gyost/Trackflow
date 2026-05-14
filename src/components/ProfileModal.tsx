import React, { useState } from 'react';
import { Member } from '../types';

interface ProfileModalProps {
  onClose: () => void;
  currentUser: Member;
  setCurrentUser: React.Dispatch<React.SetStateAction<Member | null>>;
}

export default function ProfileModal({ onClose, currentUser, setCurrentUser }: ProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);

  const handleSave = () => {
    setCurrentUser(prev => prev ? { ...prev, name, phone, avatar } : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center overflow-y-auto p-4">
      <div className="bg-white max-w-sm w-full p-8 border border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] relative selection:bg-[#1A1A1A] selection:text-white">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 className="text-2xl font-serif italic mb-8 border-b border-[#1A1A1A]/20 pb-4">完善个人信息</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">头像链接 (URL)</label>
            <input 
              type="text" 
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">姓名</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2">手机号码</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-transparent border-b border-[#1A1A1A]/30 focus:border-[#1A1A1A] outline-none py-2 text-sm font-mono"
            />
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSave}
              className="w-full bg-[#1A1A1A] text-white py-3 text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors"
            >
              保存信息
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
