
import React from 'react';
import { AppSection } from '../types';
import InstallPWA from '../components/InstallPWA';

interface HomeViewProps {
  onNavigate: (section: AppSection) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const sections = [
    { id: AppSection.TRY_ON_CLOTHES, title: '试穿衣', icon: '👗', color: 'bg-pink-100' },
    { id: AppSection.TRY_ON_ACCESSORIES, title: '试佩饰', icon: '💎', color: 'bg-purple-100' },
    { id: AppSection.HAIRSTYLE, title: '发型参考', icon: '💇‍♀️', color: 'bg-rose-100' },
    { id: AppSection.BEAUTY_SCORE, title: '颜值打分', icon: '✨', color: 'bg-orange-100' },
    { id: AppSection.COUPLE_FACE, title: '夫妻相', icon: '👩‍❤️‍👨', color: 'bg-red-100' },
    { id: AppSection.TONGUE_DIAGNOSIS, title: '趣味舌诊', icon: '👅', color: 'bg-green-100' },
    { id: AppSection.FACE_COLOR, title: '面色调理', icon: '💆‍♀️', color: 'bg-blue-100' },
    { id: AppSection.FACE_READING, title: '相术面相', icon: '🧿', color: 'bg-indigo-100' },
    { id: AppSection.FENG_SHUI, title: '摆设风水', icon: '🪑', color: 'bg-yellow-100' },
    { id: AppSection.LICENSE_PLATE, title: '五行车牌', icon: '🚗', color: 'bg-cyan-100' },
    { id: AppSection.CALENDAR, title: '出门黄历', icon: '📅', color: 'bg-[#C69C6D]', textColor: 'text-white' },
  ];

  return (
    <div className="p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">美力实验室</h1>
        <p className="text-gray-500 text-sm">✨ 发现你的独属魅力 ✨</p>
      </header>

      {/* PWA 安装按钮 */}
      <div className="mb-6">
        <InstallPWA />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => onNavigate(sec.id)}
            className={`${sec.color} ${sec.textColor || 'text-gray-800'} rounded-2xl p-4 flex flex-row items-center justify-start gap-3 shadow-sm hover:shadow-md transition-all transform active:scale-95 h-16`}
          >
            <span className="text-2xl flex-shrink-0">{sec.icon}</span>
            <span className="font-bold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
              {sec.title}
            </span>
          </button>
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
    </div>
  );
};

export default HomeView;
