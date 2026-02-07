
import React, { useState, useEffect } from 'react';
import { AppSection } from './types';
import { getStableDeviceId } from './lib/fingerprint';
import HomeView from './views/HomeView';
import TryOnView from './views/TryOnView';
import HairstyleView from './views/HairstyleView';
import AnalysisView from './views/AnalysisView';
import CalendarView from './views/CalendarView';
import CoupleFaceView from './views/CoupleFaceView';
import FengShuiView from './views/FengShuiView';
import LicensePlateView from './views/LicensePlateView';
import LoginView from './views/LoginView';
import MemberView from './views/MemberView';
import AdminView from './views/AdminView';
import MakeupView from './views/MakeupView';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // 从 localStorage 恢复用户状态，并从数据库获取最新数据
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // 从数据库获取最新用户数据
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getUser', userId: parsedUser.id })
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              const updatedUser = { ...parsedUser, credits: data.user.credits };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          })
          .catch(console.error);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  // 初始化设备ID (基于硬件指纹)
  useEffect(() => {
    const initId = async () => {
      const storedId = localStorage.getItem('device_id');
      // 如果没有ID，或者ID是旧版的随机 dev_ 开头，则强制生成指纹
      if (!storedId || storedId.startsWith('dev_')) {
        const fingerId = await getStableDeviceId();
        localStorage.setItem('device_id', fingerId);
      }
    };
    initId();
  }, []);

  const handleLogin = (loggedUser: any) => {
    setUser(loggedUser);
    setShowLogin(false);

    // 如果是管理员，显示管理后台
    if (loggedUser.is_admin) {
      setShowAdmin(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowMember(false);
    setShowAdmin(false);
  };

  // 检查额度
  const checkCredits = async (): Promise<boolean> => {
    if (!user) {
      setShowLogin(true);
      return false;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'useCredit', userId: user.id })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needCredits) {
          alert('使用额度不足，请充值或获取兑换码');
          setShowMember(true);
        }
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // 扣除额度 (成功后调用)
  const deductCredit = async (): Promise<boolean> => {
    if (!user) {
      console.warn('[deductCredit] 用户未登录，跳过扣除');
      return false;
    }
    try {
      console.log('[deductCredit] 开始扣除额度，用户ID:', user.id);
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deductCredit', userId: user.id })
      });

      const data = await res.json();
      console.log('[deductCredit] API 响应:', data);

      if (res.ok && data.success && typeof data.credits === 'number') {
        // 更新本地状态，确保 UI 实时同步
        const updatedUser = { ...user, credits: data.credits };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('[deductCredit] 额度扣除成功，剩余:', data.credits);
        return true;
      } else {
        console.error('[deductCredit] 扣除失败:', data.error || '未知错误');
        return false;
      }
    } catch (e) {
      console.error('[deductCredit] 请求异常:', e);
      return false;
    }
  };

  // 显示登录页面
  if (showLogin) {
    return <LoginView onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
  }

  // 显示管理后台
  if (showAdmin && user?.is_admin) {
    return <AdminView admin={user} onBack={() => setShowAdmin(false)} />;
  }

  // 显示会员中心
  if (showMember && user) {
    const handleUserUpdate = (updatedUser: any) => {
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    };
    return <MemberView user={user} onLogout={handleLogout} onBack={() => setShowMember(false)} onUserUpdate={handleUserUpdate} />;
  }

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.HOME:
        return <HomeView onNavigate={setCurrentSection} />;

      case AppSection.TRY_ON_CLOTHES:
        return <TryOnView type="clothes" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.TRY_ON_ACCESSORIES:
        return <TryOnView type="accessories" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.HAIRSTYLE:
        return <HairstyleView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.MAKEUP:
        return <MakeupView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.BEAUTY_SCORE:
        return <AnalysisView title="颜值打分" type="颜值打分" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.COUPLE_FACE:
        return <CoupleFaceView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.TONGUE_DIAGNOSIS:
        return <AnalysisView title="趣味舌诊" type="舌诊" onBack={() => setCurrentSection(AppSection.HOME)} helpText="请上传一张清晰的舌头照片哦～" onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.FACE_COLOR:
        return <AnalysisView title="面色分析" type="中医面色" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.FACE_READING:
        return <AnalysisView title="传统面相" type="传统相术" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.FENG_SHUI:
        return <FengShuiView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.LICENSE_PLATE:
        return <LicensePlateView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      case AppSection.CALENDAR:
        return <CalendarView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;

      default:
        return <HomeView onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-pink-50 flex flex-col shadow-2xl">
      <div className="flex-1 overflow-y-auto pb-20">
        {renderSection()}
      </div>

      {/* Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white/80 backdrop-blur-md border-t flex justify-around items-center px-4 z-50">
        <button
          onClick={() => setCurrentSection(AppSection.HOME)}
          className={`flex flex-col items-center gap-1 transition-colors ${currentSection === AppSection.HOME ? 'text-pink-500' : 'text-gray-500'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </button>

        <button
          onClick={() => user ? setShowMember(true) : setShowLogin(true)}
          className="flex flex-col items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors"
        >
          <span className="text-xl">{user ? '👤' : '🔐'}</span>
          <span className="text-xs">{user ? '我的' : '登录'}</span>
        </button>

        {user?.is_admin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-purple-500 transition-colors"
          >
            <span className="text-xl">⚙️</span>
            <span className="text-xs">管理</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
