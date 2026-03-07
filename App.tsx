
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { AppSection, User } from './types';
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
import JadeAppraisalView from './views/JadeAppraisalView';

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">哎呀，页面出错了</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded-xl mb-4 w-full overflow-auto max-h-40">
            {this.state.error?.message || '未知错误'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-pink-500 text-white rounded-full"
          >
            刷新重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CURRENT_VERSION = '1.1'; // 当前本地版本

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  // 【问题1修复】user 类型从 any 改为 User | null
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // 版本更新弹窗
  const [updateInfo, setUpdateInfo] = useState<{
    show: boolean;
    title: string;
    message: string;
    version: string;
    apkUrl: string;
  }>({
    show: false,
    title: '发现新版本',
    message: '',
    version: '',
    apkUrl: '/app.apk'
  });

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

  // 4. 版本检查 (Effect #4)
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(getApiUrl('/api/admin'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getConfig' })
        });
        const data = await res.json();
        const config = data.config || {};
        const latestVersion = config.latest_version || CURRENT_VERSION;

        // 比较版本号：如果远程版本大于本地版本，则提示
        if (latestVersion !== CURRENT_VERSION) {
          // 简单的字符串或数字比较。如果版本号是 1.1.1 这种，可能需要更复杂的逻辑，
          // 但目前先按简单比较处理。
          setUpdateInfo({
            show: true,
            title: config.update_title || '发现新版本',
            message: config.update_message || '为了更好的体验，请下载最新版本 APP',
            version: latestVersion,
            apkUrl: config.apk_url || '/app.apk'
          });
        }
      } catch (e) {
        console.error('[App] Version check failed', e);
      }
    };

    // 延迟 2 秒检查，避免干扰核心启动逻辑
    const timer = setTimeout(checkVersion, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 3. Android 物理返回键监听 (Effect #3)
  // 【问题5修复】依赖数组为空 []，只注册一次。回调通过 ref 读取最新 state，避免频繁重注册。
  useEffect(() => {
    if (typeof CapApp === 'undefined' || !CapApp.addListener) return;

    let listener: any = null;
    const setupListener = async () => {
      listener = await CapApp.addListener('backButton', () => {
        // NOTE: 通过 ref 读取最新状态，避免旧闭包问题
        if (showLoginRef.current) setShowLogin(false);
        else if (showAdminRef.current) setShowAdmin(false);
        else if (showMemberRef.current) setShowMember(false);
        else if (currentSectionRef.current !== AppSection.HOME) setCurrentSection(AppSection.HOME);
        else CapApp.exitApp();
      });
    };

    setupListener();

    return () => {
      if (listener) listener.remove();
    };
  }, []); // NOTE: 空依赖，只挂载一次监听器

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
  };

  // 快捷刷新用户信息
  const handleUserUpdate = (up: User) => {
    setUser(up);
    localStorage.setItem('user', JSON.stringify(up));
  };

  /**
   * 检查用户额度是否充足（不扣除）
   * 【问题2修复】：加入并发锁 isProcessingRef，防止用户在 AI 处理期间重复触发
   */
  const checkCredits = async (): Promise<boolean> => {
    if (!user) { setShowLogin(true); return false; }
    // 如果上一次调用还未通过 deductCredit 释放锁，直接拒绝
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
      // 检查通过后加锁，防止在 AI 处理期间重复进入
      isProcessingRef.current = true;
      return true;
    } catch { return false; }
  };

  /**
   * 实际扣除 1 次额度（AI 生成成功后调用）
   * 【问题2修复】：完成后释放并发锁
   */
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
      // NOTE: 无论成功或失败，都必须释放锁，防止永久阻塞
      isProcessingRef.current = false;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-pink-50 flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <div className="flex-1 overflow-y-auto pb-20">
          <Suspense fallback={<div className="flex items-center justify-center p-20 animate-pulse text-pink-300">加载中...</div>}>

            {/* 核心页面路由逻辑 */}
            {showLogin && <LoginView onLogin={handleLogin} onBack={() => setShowLogin(false)} />}

            {!showLogin && showAdmin && user?.is_admin && <AdminView admin={user} onBack={() => setShowAdmin(false)} />}

            {!showLogin && !showAdmin && showMember && user && <MemberView user={user} onLogout={handleLogout} onBack={() => setShowMember(false)} onUserUpdate={handleUserUpdate} />}

            {!showLogin && !showAdmin && !showMember && (
              <>
                {currentSection === AppSection.HOME && <HomeView onNavigate={setCurrentSection} />}
                {currentSection === AppSection.TRY_ON_CLOTHES && <TryOnView type="clothes" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.TRY_ON_ACCESSORIES && <TryOnView type="accessories" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.HAIRSTYLE && <HairstyleView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.MAKEUP && <MakeupView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.BEAUTY_SCORE && <AnalysisView title="颜值打分" type="颜值打分" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.COUPLE_FACE && <CoupleFaceView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.TONGUE_DIAGNOSIS && <AnalysisView title="趣味舌诊" type="舌诊" onBack={() => setCurrentSection(AppSection.HOME)} helpText="请上传一张清晰的舌头照片哦～" onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.FACE_COLOR && <AnalysisView title="面色分析" type="中医面色" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.FACE_READING && <AnalysisView title="传统面相" type="传统相术" onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.FENG_SHUI && <FengShuiView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.LICENSE_PLATE && <LicensePlateView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.CALENDAR && <CalendarView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.MBTI_TEST && <MBTITestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.DEPRESSION_TEST && <DepressionTestView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.MARRIAGE_ANALYSIS && <MarriageView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.WEALTH_ANALYSIS && <WealthView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
                {currentSection === AppSection.JADE_APPRAISAL && <JadeAppraisalView onBack={() => setCurrentSection(AppSection.HOME)} onCheckCredits={checkCredits} onDeductCredit={deductCredit} />}
              </>
            )}

          </Suspense>
        </div>

        {/* 版本更新弹窗 */}
        {updateInfo.show && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div className="relative bg-white rounded-[32px] p-8 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-pink-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg rotate-3">🚀</div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">{updateInfo.title}</h3>
                <div className="inline-block px-3 py-1 bg-pink-100 text-pink-500 rounded-full text-xs font-bold mb-4">
                  v{updateInfo.version} 已就绪
                </div>
                <div className="text-sm text-gray-500 leading-relaxed text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-40 overflow-y-auto">
                  {updateInfo.message.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={getApiUrl(updateInfo.apkUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`美力实验室_v${updateInfo.version}.apk`}
                  className="w-full h-14 bg-pink-500 text-white rounded-2xl font-bold flex items-center justify-center no-underline shadow-[0_8px_20px_rgba(236,72,153,0.3)] active:scale-95 transition-transform text-lg"
                >
                  立即升级
                </a>
                <button
                  onClick={() => setUpdateInfo({ ...updateInfo, show: false })}
                  className="w-full h-12 text-gray-400 font-medium active:text-gray-600 transition-colors"
                >
                  暂不更新
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Bar - 仅在非特殊全屏页显示 */}
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
