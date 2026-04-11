
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { AppSection, User } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import HomeView from './views/HomeView';
import TryOnView from './views/TryOnView';
import AdvancedTryOnView from './views/AdvancedTryOnView';
import HairstyleView from './views/HairstyleView';
import MakeupView from './views/MakeupView';
import AnalysisView from './views/AnalysisView';
import CoupleFaceView from './views/CoupleFaceView';
import FengShuiView from './views/FengShuiView';
import LicensePlateView from './views/LicensePlateView';
import CalendarView from './views/CalendarView';
import MBTITestView from './views/MBTITestView';
import EQTestView from './views/EQTestView';
import IQTestView from './views/IQTestView';
import BigFiveView from './views/BigFiveView';
import DepressionTestView from './views/DepressionTestView';
import MarriageView from './views/MarriageView';
import WealthView from './views/WealthView';
import JadeAppraisalView from './views/JadeAppraisalView';
import LoginView from './views/LoginView';
import MemberView from './views/MemberView';
import AdminView from './views/AdminView';
import DownloadAppView from './views/DownloadAppView';
import EyeDiagnosisView from './views/EyeDiagnosisView';
import { getApiUrl } from './lib/api-config';
import { App as CapApp } from '@capacitor/app';
import { getStableDeviceId } from './lib/fingerprint';

const App: React.FC = () => {
    const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  // 【问题1修复】user 类型从 any 改为 User | null
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // 【问题2修复】并发锁：防止 checkCredits 通过后在 AI 处理期间被再次调用
  const isProcessingRef = useRef(false);

  // 【问题5修复】用 ref 保存最新的状态值，供返回键回调读取，避免闭包陷阱
  const currentSectionRef = useRef(currentSection);
  const showLoginRef = useRef(showLogin);
  const showMemberRef = useRef(showMember);
  const showAdminRef = useRef(showAdmin);

  // 同步 state 到 ref（每次 state 变化时自动更新）
  useEffect(() => { currentSectionRef.current = currentSection; }, [currentSection]);
  useEffect(() => { showLoginRef.current = showLogin; }, [showLogin]);
  useEffect(() => { showMemberRef.current = showMember; }, [showMember]);
  useEffect(() => { showAdminRef.current = showAdmin; }, [showAdmin]);

  // 1. 初始化用户状态 (Effect #1)
  useEffect(() => {
    // 捕获推荐人
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('referrer_id', ref);

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser: User = JSON.parse(savedUser);
        setUser(parsedUser);

        // 增量更新用户信息
        const ts = Date.now();
        fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getUser', userId: parsedUser.id })
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              const upUser: User = { ...parsedUser, ...data.user };
              setUser(upUser);
              localStorage.setItem('user', JSON.stringify(upUser));
            }
          }).catch(e => console.error('[App] User sync failed', e));
      } catch (e) { localStorage.removeItem('user'); }
    }
  }, []);

  // 2. 初始化设备ID (Effect #2)
  useEffect(() => {
    const initId = async () => {
      try {
        const storedId = localStorage.getItem('device_id');
        if (!storedId || storedId.startsWith('dev_')) {
          const fingerId = await getStableDeviceId();
          localStorage.setItem('device_id', fingerId);
        }
      } catch (e) { console.error('[App] Fingerprint failed', e); }
    };
    initId();
  }, []);

  // 3. 监听微信回调 code (Effect #3)
  useEffect(() => {
    const handleWechatCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        try {
          const deviceId = localStorage.getItem('device_id') || await getStableDeviceId();
          const res = await fetch(getApiUrl('/api/auth_v2'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'wechatLogin',
              code,
              deviceId,
              userId: user?.id // 如果已登录，则传入 userId 执行绑定
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          // 成功后清理 URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          handleUserUpdate(data.user);
          console.log('[App] WeChat auth success:', data.user.wechat_openid ? 'Bound' : 'LoggedIn');
        } catch (e: any) {
          console.error('[App] WeChat callback failed:', e);
          alert('微信授权失败: ' + e.message);
        }
      }
    };
    handleWechatCallback();
  }, [user?.id]); // 依赖 user.id 确保在用户登录状态变化时依然能正确绑定

  // 4. Android 物理返回键监听 (Effect #4)

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
    setShowLogin(false);
    if (u.is_admin) setShowAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowMember(false);
    setShowAdmin(false);
    setCurrentSection(AppSection.HOME); // 登出时返回首页
  };

  const handleNavigate = (section: AppSection) => {
    // 导航时自动释放 AI 锁，防止用户在某个页面卡死后无法进行其他操作
    isProcessingRef.current = false;

    // 豁免区域：首页和 App 下载
    if (section === AppSection.HOME || section === AppSection.APP_DOWNLOAD) {
      setCurrentSection(section);
      return;
    }

    // 鉴权拦截：所有测试项目必须登录
    if (!user) {
      setShowLogin(true);
      return;
    }

    setCurrentSection(section);
  };

  const handleUserUpdate = (up: User) => {
    setUser(up);
    localStorage.setItem('user', JSON.stringify(up));
  };

  /**
   * 手动释放处理锁 (用于异常清理)
   */
  const cancelProcessing = () => {
    if (isProcessingRef.current) {
      console.log('[App] Manual processing lock release');
      isProcessingRef.current = false;
    }
  };

  const checkCredits = async (): Promise<boolean> => {
    if (!user) { setShowLogin(true); return false; }
    if (isProcessingRef.current) {
      console.warn('[App] checkCredits blocked: 上一个请求仍在处理中');
      return false;
    }
    try {
      const res = await fetch(getApiUrl('/api/auth_v2'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'useCredit', userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needCredits) { alert('额度不足'); setShowMember(true); }
        return false;
      }
      isProcessingRef.current = true;
      return true;
    } catch { return false; }
  };

  const deductCredit = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch(getApiUrl('/api/auth_v2'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deductCredit', userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        handleUserUpdate({ ...user, credits: data.credits });
        return true;
      }
      return false;
    } catch { return false; }
    finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-pink-50 flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <div className="flex-1 overflow-y-auto pb-20">
          <Suspense fallback={<div className="flex items-center justify-center p-20 animate-pulse text-pink-300">加载中...</div>}>

            {showLogin && <LoginView onLogin={handleLogin} onBack={() => setShowLogin(false)} />}

            {!showLogin && showAdmin && user?.is_admin && <AdminView admin={user} onBack={() => setShowAdmin(false)} />}

            {!showLogin && !showAdmin && showMember && user && <MemberView user={user} onLogout={handleLogout} onBack={() => setShowMember(false)} onUserUpdate={handleUserUpdate} />}

            {!showLogin && !showAdmin && !showMember && (
              <>
                {currentSection === AppSection.HOME && <HomeView onNavigate={handleNavigate} onShowLogin={() => setShowLogin(true)} />}
                {currentSection === AppSection.ADVANCED_TRY_ON && <AdvancedTryOnView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.TRY_ON_CLOTHES && <TryOnView type="clothes" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.TRY_ON_ACCESSORIES && <TryOnView type="accessories" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.HAIRSTYLE && <HairstyleView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.MAKEUP && <MakeupView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.BEAUTY_SCORE && <AnalysisView title="颜值打分" type="颜值打分" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.COUPLE_FACE && <CoupleFaceView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.TONGUE_DIAGNOSIS && <AnalysisView title="趣味舌诊" type="舌诊" onBack={() => setCurrentSection(AppSection.HOME)} helpText="请上传一张清晰的舌头照片哦～" onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.FACE_COLOR && <AnalysisView title="面色分析" type="中医面色" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.FACE_READING && <AnalysisView title="传统面相" type="传统相术" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.FENG_SHUI && <FengShuiView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.LICENSE_PLATE && <LicensePlateView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.CALENDAR && <CalendarView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.MBTI_TEST && <MBTITestView onBack={() => setCurrentSection(AppSection.HOME)} />}
                {currentSection === AppSection.EQ_TEST && <EQTestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.IQ_TEST && <IQTestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.BIG_FIVE && <BigFiveView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.DEPRESSION_TEST && <DepressionTestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.MARRIAGE_ANALYSIS && <MarriageView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.WEALTH_ANALYSIS && <WealthView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.JADE_APPRAISAL && <JadeAppraisalView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.AI_EYE_DIAGNOSIS && <EyeDiagnosisView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} onCancelProcessing={cancelProcessing} />}
                {currentSection === AppSection.APP_DOWNLOAD && <DownloadAppView onBack={() => setCurrentSection(AppSection.HOME)} />}
              </>
            )}

          </Suspense>
        </div>

        {!(showLogin || showAdmin || showMember) && (
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white/80 backdrop-blur-md border-t flex justify-around items-center px-4 z-50">
            <button onClick={() => setCurrentSection(AppSection.HOME)} className={`flex flex-col items-center gap-1 ${currentSection === AppSection.HOME ? 'text-pink-500' : 'text-gray-500'}`}>
              <span className="text-xl">🏠</span>
              <span className="text-xs">首页</span>
            </button>
            <button onClick={() => user ? setShowMember(true) : setShowLogin(true)} className="flex flex-col items-center gap-1 text-gray-500 hover:text-pink-500">
              <span className="text-xl">{user ? '👤' : '🔐'}</span>
              <span className="text-xs">{user ? '我的' : '登录'}</span>
            </button>
            {user?.is_admin && (
              <button onClick={() => setShowAdmin(true)} className="flex flex-col items-center gap-1 text-gray-500 hover:text-purple-500">
                <span className="text-xl">⚙️</span>
                <span className="text-xs">管理</span>
              </button>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
