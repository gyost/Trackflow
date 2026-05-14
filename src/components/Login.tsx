import React, { useState } from 'react';
import { Member } from '../types';

interface LoginProps {
  onLogin: (user: Member) => void;
  authorizedCompanies: string[];
  members: Member[];
}

export default function Login({ onLogin, authorizedCompanies, members }: LoginProps) {
  const hasAccountSetup = localStorage.getItem('has_setup_account') === 'true';
  const [loginMode, setLoginMode] = useState<'account' | 'initial'>(hasAccountSetup ? 'account' : 'account');
  const [showInitialAnyway, setShowInitialAnyway] = useState(!hasAccountSetup);
  const [company, setCompany] = useState(() => localStorage.getItem('login_company') || '');
  const [name, setName] = useState(() => localStorage.getItem('login_name') || '');
  const [account, setAccount] = useState(() => localStorage.getItem('login_account') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('login_password') || '');
  const [rememberPwd, setRememberPwd] = useState(() => localStorage.getItem('login_remember') === 'true');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (loginMode === 'account') {
      if (!account.trim() || !password) {
        setError('请输入账号和密码');
        return;
      }
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const member = members.find(m => m.account === account.trim() && m.password === password);
        if (member) {
          localStorage.setItem('login_account', account.trim());
          if (rememberPwd) {
            localStorage.setItem('login_password', password);
            localStorage.setItem('login_remember', 'true');
          } else {
            localStorage.removeItem('login_password');
            localStorage.setItem('login_remember', 'false');
          }
          onLogin(member);
        } else {
          setError('账号或密码不正确，或该账号不存在');
        }
      } catch (err) {
        setError('验证失败，请重试');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!company.trim() || !name.trim()) {
        setError('请输入公司名称和姓名');
        return;
      }
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!authorizedCompanies.includes(company.trim())) {
          setError('未找到授权公司，请联系管理员为您添加授权');
          return;
        }

        const member = members.find(m => m.name === name.trim());
        if (member) {
          if (member.account && member.password) {
            setError('该用户已设置账号，请切换到账号密码登录');
            return;
          }
          localStorage.setItem('login_company', company.trim());
          localStorage.setItem('login_name', name.trim());
          onLogin(member);
        } else {
          setError('未找到该成员，请检查姓名是否输入正确');
        }
      } catch (err) {
        setError('验证失败，请重试');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F4F8] flex items-center justify-center font-sans text-[#202124] px-4 selection:bg-[#1A73E8] selection:text-white">
      <div className="w-full max-w-[440px] relative z-10 transition-all duration-500">
        <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#E3E3E3] space-y-7">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-normal text-[#202124] mb-2 tracking-normal">Sign in</h1>
            <p className="text-[16px] font-normal text-[#5F6368]">to continue to your workspace</p>
          </div>
          
          {showInitialAnyway && (
            <div className="flex bg-[#F1F3F4] rounded-full p-1 mb-8">
              <button 
                type="button" 
                onClick={() => { setLoginMode('account'); setError(''); }} 
                className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-all ${loginMode === 'account' ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'}`}
              >
                账号登录
              </button>
              <button 
                type="button" 
                onClick={() => { setLoginMode('initial'); setError(''); }} 
                className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-all ${loginMode === 'initial' ? 'bg-white text-[#202124] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'}`}
              >
                首次登录 / 重置账号
              </button>
            </div>
          )}

          <div className="space-y-4">
            {loginMode === 'account' ? (
              <>
                <div className="relative">
                  <input
                    type="text"
                    id="account"
                    value={account}
                    onChange={(e) => {
                      setAccount(e.target.value);
                      setError('');
                    }}
                    className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
                    placeholder=" "
                    autoFocus
                  />
                  <label htmlFor="account" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">系统账号</label>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
                    placeholder=" "
                  />
                  <label htmlFor="password" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">账号密码</label>
                </div>
                <div className="flex items-center gap-3 px-1 pt-2">
                  <input 
                    type="checkbox" 
                    id="rememberPwd" 
                    checked={rememberPwd}
                    onChange={(e) => setRememberPwd(e.target.checked)}
                    className="w-[18px] h-[18px] rounded-sm border-2 border-[#DADCE0] text-[#1A73E8] focus:ring-[#1A73E8] cursor-pointer"
                  />
                  <label htmlFor="rememberPwd" className="text-[14px] text-[#5F6368] select-none cursor-pointer">
                    记住账号和密码
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setError('');
                    }}
                    className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
                    placeholder=" "
                    autoFocus
                  />
                  <label htmlFor="company" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">公司名称</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    className="block px-4 pb-2.5 pt-5 w-full text-[16px] text-[#202124] bg-transparent rounded-md border border-[#DADCE0] appearance-none focus:outline-none focus:ring-0 focus:border-[#1A73E8] peer"
                    placeholder=" "
                  />
                  <label htmlFor="name" className="absolute text-[16px] text-[#5F6368] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-4 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[#1A73E8] bg-white px-1">成员姓名</label>
                </div>
              </>
            )}
          </div>

          <div className="min-h-[20px]">
            {error && (
              <p className="text-[#D93025] text-[13px] font-medium animate-in fade-in duration-300 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#1A73E8] text-white rounded-full px-6 py-2.5 text-[14px] font-medium hover:bg-[#1558B0] hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 tracking-wide"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>验证中...</span>
                </>
              ) : (
                '登录'
              )}
            </button>
          </div>
          
          {error && !showInitialAnyway && loginMode === 'account' && (
            <div className="text-right pt-2 border-t border-[#E3E3E3]">
              <button 
                type="button"
                onClick={() => {
                  setShowInitialAnyway(true);
                  setLoginMode('initial');
                  setError('');
                }}
                className="text-[13px] text-[#1A73E8] hover:bg-[#E8F0FE] px-2 py-1.5 rounded transition-colors font-medium"
              >
                管理员已重置账号？用姓名登录
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
