import React, { useState } from 'react';

interface DownloadAppViewProps {
  onBack: () => void;
}

const DownloadAppView: React.FC<DownloadAppViewProps> = ({ onBack }) => {
  const [copied, setCopied] = useState(false);
  const downloadUrl = `${window.location.origin}/app.apk`;

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert('复制失败，请手动选择复制'));
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col p-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-2xl p-2 -ml-2 text-gray-700 active:scale-95 transition-transform">←</button>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-500">
          客户端下载
        </h2>
      </div>

      <div className="flex flex-col items-center flex-1">
        {/* App 图标或视觉图区域 */}
        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-pink-100 flex-shrink-0 relative">
          <span className="text-5xl relative z-10">✨</span>
          <div className="absolute inset-0 bg-pink-400 rounded-3xl opacity-20 blur-xl"></div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">美力实验室</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium">你的专属 AI 颜究院 · 原生极速版</p>

        {/* 核心特性卡片区 */}
        <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-pink-100 mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">🚀</div>
            <div>
              <p className="font-bold text-gray-800 text-sm">极致流畅体验</p>
              <p className="text-xs text-gray-500 mt-0.5">原生架构，生成速度与界面响应全面提升</p>
            </div>
          </div>
          <div className="w-full h-px bg-gray-50"></div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">🖼️</div>
            <div>
              <p className="font-bold text-gray-800 text-sm">一键存图至相册</p>
              <p className="text-xs text-gray-500 mt-0.5">打破网页限制，无缝保存高清穿搭与美妆大图</p>
            </div>
          </div>
          <div className="w-full h-px bg-gray-50"></div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">🛡️</div>
            <div>
              <p className="font-bold text-gray-800 text-sm">稳定不走丢</p>
              <p className="text-xs text-gray-500 mt-0.5">将美力装进口袋，随时随地开启你的魔法换装</p>
            </div>
          </div>
        </div>

        {/* 下载按钮与链接区 */}
        <div className="w-full mt-auto mb-10">
          <a
            href="/app.apk"
            download="app.apk"
            className="w-full block text-center py-4 bg-gradient-to-r from-pink-500 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-transform text-lg mb-4"
          >
            ⏬ 免费下载 Android 版
          </a>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
            <p className="text-xs text-gray-500 font-bold mb-1">或者复制固定纯净下载链接：</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={downloadUrl}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none"
              />
              <button 
                onClick={handleCopy}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors w-20 shrink-0"
              >
                {copied ? '已复制 ✔️' : '复制'}
              </button>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
            * 仅支持 Android 设备。iOS 用户请点击首页下方"添加到主屏幕"安装 PWA 轻应用。
          </p>
        </div>

      </div>
    </div>
  );
};

export default DownloadAppView;
