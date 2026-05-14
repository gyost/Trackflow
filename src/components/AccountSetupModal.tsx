import React, { useState } from 'react';
import { Member } from '../types';

interface AccountSetupModalProps {
  currentUser: Member;
  onComplete: (account: string, pass: string) => void;
  members: Member[];
}

export default function AccountSetupModal({ currentUser, onComplete, members }: AccountSetupModalProps) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate account (letters and numbers combination, at least 8 chars)
    const isAccountValid = /^[A-Za-z0-9]{8,}$/.test(account) && /[A-Za-z]/.test(account) && /[0-9]/.test(account);
    if (!isAccountValid) {
      setError('账号必须是字母与数字组合，且至少 8 个字符');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }
    if (!password.includes('@')) {
      setError('密码必须包含 @ 特殊字符');
      return;
    }
    if (password === account) {
      setError('密码不能与账号重复');
      return;
    }

    // Check if account already exists
    if (members.some(m => m.account === account && m.id !== currentUser.id)) {
      setError('该账号已被使用，请更换一个');
      return;
    }

    onComplete(account, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F0F4F8]/90 p-4 text-[#202124] font-sans">
      <div className="bg-white rounded-[28px] w-full max-w-[440px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#E3E3E3] animate-in zoom-in-95 duration-300 p-8 sm:p-10 relative">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-normal mb-2 text-[#202124]">欢迎, {currentUser.name}</h2>
          <p className="text-[15px] font-normal text-[#5F6368]">为保护数据安全，请完善账号信息</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="text"
              id="setup_account"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                setError('');
              }}
              className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
              placeholder=" "
              autoFocus
            />
            <label htmlFor="setup_account" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">
              系统账号 (字母/数字，≥8位)
            </label>
          </div>
          
          <div className="relative">
            <input
              type="password"
              id="setup_password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
              placeholder=" "
            />
            <label htmlFor="setup_password" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">
              登录密码 (≥8位，含@)
            </label>
          </div>

          <div className="min-h-[20px]">
            {error && (
              <p className="text-[#D93025] text-[13px] font-medium animate-in fade-in duration-300 flex items-center gap-1.5 pt-1">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-[#1A73E8] text-white rounded-full px-6 py-2.5 text-[15px] font-medium hover:bg-[#1558B0] hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] transition-all w-full text-center"
            >
              绑定账号并进入系统
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
