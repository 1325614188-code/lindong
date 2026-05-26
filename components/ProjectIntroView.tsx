import React from 'react';
import { AppSection } from '../types';
import { projectIntroData } from '../lib/project-intro-data';
import { ArrowLeft, Cpu, Sparkles, AlertCircle } from 'lucide-react';

interface ProjectIntroViewProps {
  section: AppSection;
  onStart: () => void;
  onBack: () => void;
  userCredits?: number;
  isStandalone?: boolean;
  onShowMember?: () => void;
}

const ProjectIntroView: React.FC<ProjectIntroViewProps> = ({
  section,
  onStart,
  onBack,
  userCredits = 0,
  isStandalone = false,
  onShowMember,
}) => {
  const data = projectIntroData[section];

  // 安全防御，如果数据不存在，直接返回空
  if (!data || !data.title) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse text-pink-300">
        加载中...
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f7f9fa] flex flex-col relative pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]`}>
      {/* 沉浸式顶部渐变色块 */}
      <div className={`absolute top-0 left-0 right-0 h-48 bg-gradient-to-br ${data.bgGradient} opacity-90 rounded-b-[40px] shadow-lg`} />

      {/* 顶部安全返回头 */}
      <div className="flex items-center justify-between px-4 py-4 relative z-10 w-full">
        {isStandalone ? (
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10">
            🛡️
          </div>
        ) : (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">
          科学原理 & 介绍
        </span>
        <div className="w-10" /> {/* 占位平衡 */}
      </div>

      {/* 主体卡片滑动区 */}
      <main className="flex-1 px-4 relative z-10 -mt-16 overflow-y-auto pb-24">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-xl border border-white/40 space-y-6">
          
          {/* 头部标题与图标 */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md text-3xl mb-1 border border-slate-50 animate-bounce">
              {data.icon}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {data.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              {data.description}
            </p>
          </div>

          {/* 【图文结合】核心插图展示区 */}
          {data.image && (
            <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-100 aspect-[16/10] bg-slate-50">
              <img
                src={data.image}
                alt={data.title}
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              
              {/* 装饰性科技微动画边角 */}
              <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md border border-white/30 rounded-lg px-2 py-0.5 flex items-center gap-1 shadow-sm">
                <Cpu className="w-3 h-3 text-pink-500 animate-spin" />
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">
                  AI Model Active
                </span>
              </div>
            </div>
          )}

          {/* 科学原理科普区 */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3>核心工作原理</h3>
            </div>
            <ul className="space-y-3">
              {data.principles.map((p, idx) => {
                const [title, desc] = p.split('：');
                return (
                  <li key={idx} className="flex items-start gap-3 group">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${data.bgGradient} text-white text-[11px] font-black flex items-center justify-center shadow-sm`}>
                      {idx + 1}
                    </span>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {desc ? (
                        <>
                          <strong className="text-slate-800 font-bold block mb-0.5">
                            {title}
                          </strong>
                          <span>{desc}</span>
                        </>
                      ) : (
                        <span>{p}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 积分与额度贴士 */}
          {data.needCredits && (
            <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0 animate-pulse" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-pink-700">本次测试需要消耗额度</p>
                <p className="text-[10px] text-pink-500 leading-relaxed">
                  本分析涉及高级 AI 多模态大模型及图像重塑运算，将消耗 1 次额度。
                  {userCredits > 0 ? (
                    <span className="font-bold">（您当前剩余额度: {userCredits} 次）</span>
                  ) : (
                    <span>（额度不足时可在会员中心充值）</span>
                  )}
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 底部悬浮操作按钮栏 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-gradient-to-t from-white via-white to-white/0 flex items-center justify-between px-6 pb-2 z-40">
        {isStandalone ? (
          <button
            onClick={onShowMember}
            className="flex-1 max-w-[120px] py-3.5 rounded-2xl border border-emerald-200 text-emerald-700 font-bold text-sm bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm text-center mr-3 flex items-center justify-center gap-1"
          >
            👤 会员中心
          </button>
        ) : (
          <button
            onClick={onBack}
            className="flex-1 max-w-[120px] py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm bg-white active:bg-slate-50 transition-colors shadow-sm text-center mr-3"
          >
            返回首页
          </button>
        )}
        
        <button
          onClick={onStart}
          className={`flex-2 flex-1 py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r ${data.bgGradient} shadow-lg hover:shadow-xl active:scale-95 transition-all text-center tracking-wider flex items-center justify-center gap-1.5`}
        >
          让我们开始吧！
          <Sparkles className="w-4 h-4 text-white/95" />
        </button>
      </div>
    </div>
  );
};

export default ProjectIntroView;
