
import React, { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { AppSection } from './types';
import { getStableDeviceId } from './lib/fingerprint';
import { getApiUrl } from './lib/api-config';
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
import MBTITestView from './views/MBTITestView';
import DepressionTestView from './views/DepressionTestView';
import MarriageView from './views/MarriageView';
import WealthView from './views/WealthView';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // 1. 系统初始化与状态恢复 (必须在最顶部)
  useEffect(() => {
    // 处理推荐人 ID 持久化
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referrer_id', ref);
      console.log('[App] 捕获并保存推荐人 ID:', ref);
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // 从数据库获取最新用户数据 - 加入时间戳防止缓存
        const ts = Date.now();
        fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getUser', userId: parsedUser.id })
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              const updatedUser = { ...parsedUser, credits: data.user.credits, points: data.user.points, commission_balance: data.user.commission_balance };
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

  // 2. 初始化设备ID
  useEffect(() => {
    const initId = async () => {
      const storedId = localStorage.getItem('device_id');
      if (!storedId || storedId.startsWith('dev_')) {
        const fingerId = await getStableDeviceId();
        localStorage.setItem('device_id', fingerId);
      }
    };
    initId();
  }, []);

  // 3. 处理 Android 物理返回键 (关键：必须确保无论哪个 View 显示，Listener 都能生效)
  useEffect(() => {
    const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (showLogin) {
        setShowLogin(false);
      } else if (showAdmin) {
        setShowAdmin(false);
      } else if (showMember) {
        setShowMember(false);
      } else if (currentSection !== AppSection.HOME) {
        setCurrentSection(AppSection.HOME);
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, [currentSection, showLogin, showAdmin, showMember]);

  const handleLogin = (loggedUser: any) => {
    setUser(loggedUser);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setShowLogin(false);
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

  const checkCredits = async (): Promise<boolean> => {
    if (!user) {
      setShowLogin(true);
      return false;
    }
    try {
      const ts = Date.now();
      const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
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

  const deductCredit = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const ts = Date.now();
      const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deductCredit', userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.success && typeof data.credits === 'number') {
        const updatedUser = { ...user, credits: data.credits };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // 渲染逻辑块
  const renderContent = () => {
    // 优先级 1: 登录页
    if (showLogin) {
      return <LoginView onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
    }

    // 优先级 2: 管理后台
    if (showAdmin && user?.is_admin) {
      return <AdminView admin={user} onBack={() => setShowAdmin(false)} />;
    }

    // 优先级 3: 会员中心
    if (showMember && user) {
      const handleUserUpdate = (updatedUser: any) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      };
      return <MemberView user={user} onLogout={handleLogout} onBack={() => setShowMember(false)} onUserUpdate={handleUserUpdate} />;
    }

    // 优先级 4: 普通业务页面
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
      case AppSection.MBTI_TEST:
        return <MBTITestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;
      case AppSection.DEPRESSION_TEST:
        return <DepressionTestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;
      case AppSection.MARRIAGE_ANALYSIS:
        return <MarriageView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;
      case AppSection.WEALTH_ANALYSIS:
        return <WealthView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />;
      default:
        return <HomeView onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-pink-50 flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex-1 overflow-y-auto pb-20">
        {renderContent()}
      </div>

      {/* Tab Bar: 仅在非特殊页面显示（可选，这里为了逻辑简单始终保持显示，或者根据 showLogin 等隐藏） */}
      {!(showLogin || showAdmin || showMember) && (
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
      )}
    </div>
  );
};

export default App;
