
import React from 'react';
import { AppSection } from '../types';
import InstallPWA from '../components/InstallPWA';
import { getApiUrl } from '../lib/api-config';


interface HomeViewProps {
  onNavigate: (section: AppSection) => void;
  onShowLogin: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onShowLogin }) => {
  const [announcement, setAnnouncement] = React.useState('✨ 发现你的独属魅力 ✨');
  const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);
  const [downloadEnabled, setDownloadEnabled] = React.useState(true);
  const [pwaEnabled, setPwaEnabled] = React.useState(true);

  React.useEffect(() => {
    fetch(getApiUrl('/api/auth_v2'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPublicConfig' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.config?.announcement) {
          setAnnouncement(data.config.announcement);
        }
        if (data.config?.home_download_app_enabled === 'false') {
          setDownloadEnabled(false);
        }
        if (data.config?.home_add_to_desktop_enabled === 'false') {
          setPwaEnabled(false);
        }
      })
      .catch(err => console.error('[HomeView] Failed to fetch announcement', err));
  }, []);

  const categories = [
    {
      title: '美学研究',
      bg: 'bg-rose-50/40',
      border: 'border-rose-200',
      accent: 'text-rose-600',
      items: [
        { id: AppSection.ADVANCED_TRY_ON, title: '沉浸换装', icon: '✨', color: 'bg-indigo-100/80', border: 'border-indigo-300', textColor: 'text-indigo-900', isNew: true },
        { id: AppSection.TRY_ON_ACCESSORIES, title: '试佩饰', icon: '💎', color: 'bg-purple-100/80', border: 'border-purple-200' },
        { id: AppSection.HAIRSTYLE, title: '发型参考', icon: '💇‍♀️', color: 'bg-rose-100/80', border: 'border-rose-200' },
        { id: AppSection.MAKEUP, title: '美妆效果', icon: '💄', color: 'bg-fuchsia-100/80', border: 'border-fuchsia-200' },
        { id: AppSection.BEAUTY_SCORE, title: '颜值打分', icon: '✨', color: 'bg-orange-100/80', border: 'border-orange-200' },
        { id: AppSection.JADE_APPRAISAL, title: '翡翠鉴别', icon: '📿', color: 'bg-emerald-100/80', border: 'border-emerald-200' },
      ]
    },
    {
      title: '健康望诊',
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200',
      accent: 'text-emerald-600',
      items: [
        { id: AppSection.AI_EYE_DIAGNOSIS, title: 'AI看眼', icon: '👁️', color: 'bg-indigo-50/80', border: 'border-indigo-100', isNew: true },
        { id: AppSection.TONGUE_DIAGNOSIS, title: '趣味舌诊', icon: '👅', color: 'bg-green-100/80', border: 'border-green-200' },
        { id: AppSection.FACE_COLOR, title: '面色调理', icon: '💆‍♀️', color: 'bg-blue-100/80', border: 'border-blue-200' },
        { id: AppSection.DEPRESSION_TEST, title: '抑郁自测', icon: '💙', color: 'bg-sky-100/80', border: 'border-sky-200' },
      ]
    },
    {
      title: '传统玄学',
      bg: 'bg-amber-50/40',
      border: 'border-amber-200',
      accent: 'text-amber-700',
      items: [
        { id: AppSection.COUPLE_FACE, title: '夫妻相', icon: '👩‍❤️‍👨', color: 'bg-red-100/80', border: 'border-red-200' },
        { id: AppSection.FACE_READING, title: '相术面相', icon: '🧿', color: 'bg-indigo-100/80', border: 'border-indigo-200' },
        { id: AppSection.FENG_SHUI, title: '摆设风水', icon: '🪑', color: 'bg-yellow-100/80', border: 'border-yellow-300' },
        { id: AppSection.LICENSE_PLATE, title: '五行车牌', icon: '🚗', color: 'bg-cyan-100/80', border: 'border-cyan-200' },
        { id: AppSection.CALENDAR, title: '出门黄历', icon: '📅', color: 'bg-[#C69C6D]/80', border: 'border-[#A67C4D]', textColor: 'text-white' },
        { id: AppSection.MARRIAGE_ANALYSIS, title: '看姻缘', icon: '💘', color: 'bg-rose-50/80', border: 'border-rose-100' },
        { id: AppSection.WEALTH_ANALYSIS, title: '看财富', icon: '💰', color: 'bg-amber-50/80', border: 'border-amber-100' },
      ]
    },
    {
      title: '心理测评',
      bg: 'bg-violet-50/40',
      border: 'border-violet-200',
      accent: 'text-violet-600',
      items: [
        { id: AppSection.MBTI_TEST, title: '天赋测试', icon: '🧠', color: 'bg-violet-100/80', border: 'border-violet-200' },
        { id: AppSection.EQ_TEST, title: '情商测试', icon: '🎭', color: 'bg-pink-100/80', border: 'border-pink-200', isNew: true },
        { id: AppSection.IQ_TEST, title: '智力测评', icon: '🧬', color: 'bg-sky-100/80', border: 'border-sky-200', isNew: true },
      ]
    }
  ];

  // 检测是否在原生 App 环境（Capacitor）
  const isApp = (window as any).Capacitor?.isNative;

  const handleDownloadClick = () => {
    setShowDownloadDialog(true);
  };

  const confirmDownload = () => {
    setShowDownloadDialog(false);
    onNavigate(AppSection.APP_DOWNLOAD);
  };

  const goToLogin = () => {
    setShowDownloadDialog(false);
    onShowLogin();
  };

  return (
    <div className="p-6 pb-20">
      <header className="mb-8 text-center">
        <h1 className="text-4xl art-title mb-2">✨ 美力实验室 ✨</h1>
        <div className="bg-white/50 backdrop-blur-sm border border-pink-100 rounded-full py-1 px-4 overflow-hidden relative h-8 flex items-center">
          <div className="whitespace-nowrap inline-block animate-marquee hover:pause text-gray-500 text-sm font-medium">
            <span className="inline-block px-4">{announcement}</span>
            <span className="inline-block px-4">{announcement}</span>
          </div>
        </div>
      </header>

      <div className="mb-8 flex gap-3 items-start justify-stretch">
        {!isApp && downloadEnabled && (
          <button
            onClick={handleDownloadClick}
            className="flex-1 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-transform active:scale-95 text-[11px] font-bold no-underline"
          >
            <span className="text-xl">📦</span>
            下载 APP
          </button>
        )}
        {pwaEnabled && (
          <div className="flex-1">
            <InstallPWA />
          </div>
        )}
      </div>

      <div className="space-y-10">
        {categories.map((cat, catIdx) => (
          <div 
            key={catIdx} 
            className={`${cat.bg} ${cat.border} border-2 border-dashed rounded-[32px] p-6 relative pt-8`}
          >
            {/* Category Title Badge */}
            <div className={`absolute -top-4 left-6 px-4 py-1.5 rounded-full bg-white border ${cat.border} shadow-sm z-10`}>
              <span className={`text-xs font-black tracking-widest ${cat.accent}`}>{cat.title}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cat.items.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => onNavigate(sec.id)}
                  className={`${sec.color} ${sec.border} border-b-4 border-r-2 ${sec.textColor || 'text-gray-800'} rounded-2xl p-4 flex flex-row items-center justify-start gap-3 shadow-sm hover:shadow-md transition-all transform active:scale-95 h-16 relative overflow-hidden group`}
                >
                  {sec.isNew && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg z-10">NEW</div>
                  )}
                  <span className="text-2xl flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform">{sec.icon}</span>
                  <span className="font-black text-[13px] whitespace-nowrap overflow-hidden text-ellipsis relative z-10">
                    {sec.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-5 bg-white rounded-3xl border border-pink-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-sm">❤️</div>
          <p className="font-bold text-gray-800">今日小贴士</p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          自信的女孩最美丽！不论AI给出什么评价，你都是这世上独一无二的风景～ 记得每天都要开心鸭！🦆
        </p>
      </div>

      {/* 下载提示对话框 */}
      {showDownloadDialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl">🎁</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">温馨提示</h3>
              
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                建议您先在<span className="text-pink-500 font-bold border-b-2 border-pink-200 mx-1">当前页面完成注册/登录</span>后再去下载 App。<br /><br />
                这样可以确保您的<span className="text-orange-500 font-bold">推荐奖励关系</span>被正确保存，并能享受完整会员服务哦！✨
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={confirmDownload}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-transform"
                >
                  我已经了解，前往下载页
                </button>
                <button
                  onClick={goToLogin}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  先去注册/登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
