import React, { useState } from 'react';
import { Member } from '../types';
import logoSrc from '../logo.svg';

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
    <div className="antialiased text-[#1e293b] bg-[#f9f9ff] relative overflow-hidden flex items-center justify-center min-h-screen selection:bg-[#2034e2]/20 select-none">
      {/* BACKGROUND WAVE ANIMATION */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <svg className="absolute w-[200%] h-full left-0 top-0 wave-path-1" preserveAspectRatio="none" viewBox="0 0 2000 1000">
          <path d="M0,600 C300,400 700,800 1000,600 C1300,400 1700,800 2000,600 L2000,1000 L0,1000 Z" fill="#2d3fe2" opacity="0.03"></path>
        </svg>
        <svg className="absolute w-[200%] h-full left-0 top-0 wave-path-2" preserveAspectRatio="none" viewBox="0 0 2000 1000">
          <path d="M0,500 C400,700 600,300 1000,500 C1400,700 1600,300 2000,500 L2000,1000 L0,1000 Z" fill="#2d3fe2" opacity="0.05"></path>
        </svg>
        <svg className="absolute w-[200%] h-full left-0 top-0 wave-path-3" preserveAspectRatio="none" viewBox="0 0 2000 1000">
          <path d="M0,700 C400,600 600,800 1000,700 C1400,600 1600,800 2000,700 L2000,1000 L0,1000 Z" fill="#ffffff" opacity="0.4"></path>
          <path d="M0,700 C400,600 600,800 1000,700 C1400,600 1600,800 2000,700" fill="none" opacity="0.1" stroke="#2d3fe2" strokeWidth="2"></path>
        </svg>
      </div>

      {/* LOGIN CARD */}
      <main className="w-full max-w-[480px] p-4 relative z-10 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-[0_10px_40px_-5px_rgba(45,63,226,0.06)] border border-[#e2e8f0]/40 p-8 sm:p-10 flex flex-col gap-6 relative overflow-hidden items-center">
          
          {/* HEADER */}
          <header className="text-center flex flex-col items-center gap-2 w-full select-none">
            <div className="flex items-center justify-center w-full">
              <img 
                src={logoSrc} 
                alt="TrackFlow Logo" 
                className="h-[38px] w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-xs text-[#64748b] mt-1.5">进入您的智能效率与协作工作区</p>
          </header>

          {/* TABS */}
          <div className="bg-stone-100/80 rounded-xl p-1 flex relative w-full border border-stone-200/20 select-none">
            <button 
              type="button"
              onClick={() => { setLoginMode('account'); setError(''); }}
              className={`flex-1 py-2.5 text-xs sm:text-xs font-semibold rounded-lg transition-all duration-200 ${loginMode === 'account' ? 'text-[#2D3FE2] bg-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              账号登录
            </button>
            <button 
              type="button"
              onClick={() => { setLoginMode('initial'); setError(''); }}
              className={`flex-1 py-2.5 text-xs sm:text-xs font-semibold rounded-lg transition-all duration-200 ${loginMode === 'initial' ? 'text-[#2D3FE2] bg-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              首次登录 / 账号激活
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 select-text">
            {loginMode === 'account' ? (
              <>
                {/* ACCOUNT FIELD */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none select-none">
                    <svg aria-hidden="true" className="h-5 w-5 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd"></path>
                    </svg>
                  </div>
                  <input 
                    id="account"
                    type="text"
                    value={account}
                    onChange={(e) => { setAccount(e.target.value); setError(''); }}
                    className="block w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3fe2]/15 focus:border-[#2d3fe2] transition-colors text-sm"
                    placeholder="系统账号"
                    autoFocus
                  />
                </div>

                {/* PASSWORD FIELD */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none select-none">
                    <svg aria-hidden="true" className="h-5 w-5 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <input 
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="block w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3fe2]/15 focus:border-[#2d3fe2] transition-colors text-sm"
                    placeholder="账号密码"
                  />
                </div>

                {/* REMEMBER CHECKBOX */}
                <div className="flex items-center gap-2.5 px-1 py-0.5 select-none text-left">
                  <input 
                    type="checkbox" 
                    id="rememberPwd" 
                    checked={rememberPwd}
                    onChange={(e) => setRememberPwd(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#2d3fe2] border-stone-300 rounded focus:ring-[#2d3fe2] cursor-pointer"
                  />
                  <label htmlFor="rememberPwd" className="text-xs text-stone-500 font-medium select-none cursor-pointer">
                    记住账号和密码
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* COMPANY FIELD */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none select-none">
                    <svg aria-hidden="true" className="h-5 w-5 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" fillRule="evenodd"></path>
                    </svg>
                  </div>
                  <input 
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); setError(''); }}
                    className="block w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3fe2]/15 focus:border-[#2d3fe2] transition-colors text-sm"
                    placeholder="公司名称"
                    autoFocus
                  />
                </div>

                {/* FULL NAME FIELD */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none select-none">
                    <svg aria-hidden="true" className="h-5 w-5 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd"></path>
                    </svg>
                  </div>
                  <input 
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    className="block w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3fe2]/15 focus:border-[#2d3fe2] transition-colors text-sm"
                    placeholder="成员姓名"
                  />
                </div>

                {/* SECURE REGISTER INFO BOX */}
                <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-4 flex mt-1 flex-col items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-1.5 text-stone-900">
                    <svg aria-hidden="true" className="h-4.5 w-4.5 text-[#2d3fe2] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fillRule="evenodd"></path>
                    </svg>
                    <h4 className="font-bold text-xs">新成员注册激活指南</h4>
                  </div>
                  <div className="text-[11px] text-stone-600 leading-relaxed text-center space-y-1">
                    <p>如果您是新录入系统的团队成员，可在上方输入公司名称和姓名进行初步验证。</p>
                    <p className="text-[10px] text-stone-400 flex gap-0.5 justify-center leading-normal">
                      <span>💡</span>
                      验证通过后，为保障个人业务隐私与数据隔离，系统将立即跳转账户口令设定。完成后即可用安全密匙登录。
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ERROR DISPLAY AREA */}
            <div className="min-h-[22px] flex items-center justify-center select-none">
              {error && (
                <p className="text-red-600 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500 animate-pulse">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" />
                  </svg>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* ACTION SUBMIT BUTTON */}
            <div className="mt-1 flex justify-center w-full select-none">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2d3fe2] hover:bg-blue-700 active:scale-[0.99] text-white py-3 px-8 rounded-xl shadow-md shadow-blue-700/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2d3fe2] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center gap-2 tracking-wider text-xs font-bold"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>安全盾牌验证中...</span>
                  </>
                ) : (
                  loginMode === 'account' ? '安全登录' : '验证激活'
                )}
              </button>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}
