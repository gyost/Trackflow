import React, { useState } from 'react';
import { Member } from '../types';
import Logo from './Logo';

interface LoginProps {
  onLogin: (user: Member) => void;
  authorizedCompanies: string[];
  members: Member[];
}

export default function Login({ onLogin, authorizedCompanies, members }: LoginProps) {
  const lastAccount = localStorage.getItem('login_account') || '';
  const [loginMode, setLoginMode] = useState<'account' | 'initial'>(lastAccount ? 'account' : 'initial');
  const [company, setCompany] = useState(() => localStorage.getItem('login_company') || '');
  const [name, setName] = useState(() => localStorage.getItem('login_name') || '');
  const [account, setAccount] = useState(() => localStorage.getItem('login_account') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('login_password') || '');
  const [rememberPwd, setRememberPwd] = useState(() => localStorage.getItem('login_remember') === 'true');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect login mode based on registered members
  React.useEffect(() => {
    // If the saved account doesn't exist anymore or isn't set up, fallback to 'initial' mode so they can activate easily.
    const hasAnyActiveMembersWithCreds = members.some(m => m.account && m.password);
    if (!hasAnyActiveMembersWithCreds) {
      setLoginMode('initial');
    }
  }, [members]);

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
        <form id="login_form" onSubmit={handleSubmit} className="bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#E3E3E3] space-y-7">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <Logo iconSize="md" className="mb-2" />
            <p className="text-[14px] font-normal text-[#5F6368] mt-1">进入您的智能效率与协作工作区</p>
          </div>
          
          <div className="flex bg-[#F1F3F4] rounded-full p-1 mb-8">
            <button 
              type="button" 
              onClick={() => { setLoginMode('account'); setError(''); }} 
              className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-all ${loginMode === 'account' ? 'bg-white text-[#1A73E8] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'}`}
            >
              账号登录
            </button>
            <button 
              type="button" 
              onClick={() => { setLoginMode('initial'); setError(''); }} 
              className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-all ${loginMode === 'initial' ? 'bg-white text-[#1A73E8] shadow-sm' : 'text-[#5F6368] hover:text-[#202124]'}`}
            >
              首次登录 / 账号激活
            </button>
          </div>

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
                
                <div className="rounded-xl bg-[#F8F9FA] border border-[#DADCE0] p-4 text-[13px] text-[#5F6368] leading-relaxed space-y-2 mt-2">
                  <div className="font-semibold flex items-center gap-1.5 text-[14px] text-[#202124]">
                    <svg className="w-4 h-4 text-[#1A73E8] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>新成员注册激活指南</span>
                  </div>
                  <p className="text-[#3C4043] font-normal">
                    如果您是新录入系统的团队成员，可在上方输入<strong>【公司名称】和【姓名】</strong>进行初步验证。
                  </p>
                  <p className="text-[12px] text-[#5F6368]">
                    💡 验证校验通过后，为了保障您个人业务数据的私密和安全隔离，系统将立即跳转让您设定专属的登录账户、口令。设置完成后即可使用统一的账号和密码轻松登录。
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="min-h-[20px]">
            {error && (
              <p className="text-[#D93025] text-[13px] font-medium animate-in fade-in duration-300 flex items-center gap-1.5 animate-bounce">
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
                  <span>请稍候...</span>
                </>
              ) : (
                loginMode === 'account' ? '安全登录' : '验证激活'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
