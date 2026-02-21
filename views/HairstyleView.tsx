
import React, { useState } from 'react';
import { getApiUrl } from '../lib/api-config';

interface HairstyleViewProps {
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
}

// 男生发型风格
const MALE_HAIRSTYLES = [
  { id: 'pompadour', name: '现代纹理飞机头', desc: '经典飞机头的升级版，哑光发泥打造自然的蓬松纹理', icon: '✈️' },
  { id: 'wolf', name: '软狼尾', desc: '缩短脑后长度，适合通勤，极具少年感', icon: '🐺' },
  { id: 'french', name: '复古油头', desc: '经典背梳造型，光亮整齐，绅士复古', icon: '🎩' },
  { id: 'fade', name: '侧爆渐变', desc: '渐变围绕耳朵呈半圆状散开，结构感强', icon: '💈' },
  { id: 'medium', name: '流动感中长发', desc: '文艺气息长碎发，发尾微卷，慵懒高级', icon: '🌊' },
  { id: 'mod', name: '现代英伦摩德头', desc: '层次丰富，刘海盖额，不羁摇滚感', icon: '🎸' },
  { id: 'buzz', name: '皮肤渐变圆寸', desc: '侧边彻底见皮肤，带简洁几何线条', icon: '⚡' },
  { id: 'comma', name: '刘海中分头', desc: '刘海向内弯曲像逗号，五官突出', icon: '🔥' },
  { id: 'sideback', name: '侧分背头', desc: '现代侧分，保留自然光泽，温润专业', icon: '👔' },
  { id: 'messy', name: '凌乱碎盖', desc: '覆盖额头，凌乱层次感，自带减龄效果', icon: '😎' },
];

// 女生发型风格
const FEMALE_HAIRSTYLES = [
  { id: 'cub', name: '幼兽剪', desc: '短发带有柔软卷度，俏皮可爱', icon: '🐱' },
  { id: 'butterfly', name: '蝴蝶剪', desc: '层次分明蓬松自然，浪漫灵动', icon: '🦋' },
  { id: 'birkin', name: '伯金刘海', desc: '空气感刘海，法式慵懒优雅', icon: '🇫🇷' },
  { id: 'cloudbob', name: '浮云鲍伯', desc: '蓬松饱满短发，甜美温柔', icon: '☁️' },
  { id: 'collarbone', name: '锁骨直切', desc: '齐锁骨长度，干练知性', icon: '✨' },
  { id: 'retro90', name: '90年代复古碎层', desc: '复古层次感，港风气质', icon: '📼' },
  { id: 'mullet', name: '现代鲻鱼头', desc: '前短后长，个性张扬', icon: '🔥' },
  { id: 'mermaid', name: '人鱼剪', desc: '长发大波浪，仙气飘飘', icon: '🧜‍♀️' },
  { id: 'pixie', name: '软精灵短发', desc: '超短修颜，干净利落', icon: '🧚' },
  { id: 'curtain', name: '窗帘刘海碎发', desc: '八字刘海显脸小，温柔甜美', icon: '🌸' },
];

const HairstyleView: React.FC<HairstyleViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [gender, setGender] = useState<'女' | '男'>('女');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hairstyles = gender === '男' ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!faceImage || !selectedStyle) return;

    // 检查额度
    const hasCredits = await onCheckCredits?.();
    if (!hasCredits) return;

    setLoading(true);
    try {
      const style = hairstyles.find(s => s.id === selectedStyle);

      // 调用后端 API
      const response = await fetch(getApiUrl('/api/gemini'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hairstyle',
          faceImage,
          gender,
          hairstyleName: style?.name || '',
          hairstyleDesc: style?.desc || ''
        })
      });

      const data = await response.json();
      if (data.result) {
        setResultImage(data.result);
        // 成功后扣除额度
        console.log('[HairstyleView] 生成成功，开始扣除额度');
        await onDeductCredit?.();
      } else {
        console.warn('[HairstyleView] 生成失败，未返回结果');
        alert('生成失败，请稍后重试');
      }
    } catch (e) {
      console.error(e);
      alert('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-2xl">←</button>
        <h2 className="text-xl font-bold">发型参考</h2>
      </div>

      {/* 上传照片 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-gray-500">1. 上传正面人脸照片</p>
        <label className="aspect-[3/4] max-w-[200px] mx-auto rounded-2xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
          {faceImage ? (
            <img src={faceImage} className="w-full h-full object-cover" />
          ) : (
            <>
              <span className="text-4xl">📸</span>
              <span className="text-xs text-gray-400 mt-2 px-2 text-center">请上传清晰的正面照片</span>
            </>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>
      </div>

      {/* 选择性别 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-gray-500">2. 选择性别</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setGender('女'); setSelectedStyle(null); }}
            className={`px-6 py-2 rounded-full font-bold transition-all ${gender === '女' ? 'bg-pink-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            👩 女生
          </button>
          <button
            onClick={() => { setGender('男'); setSelectedStyle(null); }}
            className={`px-6 py-2 rounded-full font-bold transition-all ${gender === '男' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            👨 男生
          </button>
        </div>
      </div>

      {/* 选择发型风格 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-500">3. 选择发型风格</p>
        <div className="grid grid-cols-2 gap-3">
          {hairstyles.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${selectedStyle === style.id
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-200 bg-white hover:border-rose-300'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{style.icon}</span>
                <span className="font-bold text-xs">{style.name}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={!faceImage || !selectedStyle || loading}
        className="w-full h-14 bg-rose-500 text-white rounded-2xl font-bold disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 生成中...</>
        ) : '生成发型效果 💇'}
      </button>

      {/* 结果展示 */}
      {resultImage && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-center font-bold text-gray-700">💇 这是你的发型效果图：</p>
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img src={resultImage} className="w-full" />
          </div>
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = resultImage;
              link.download = 'hairstyle-result.png';
              link.click();
            }}
            className="text-rose-500 font-bold border-2 border-rose-500 rounded-xl p-3"
          >
            保存到相册
          </button>
        </div>
      )}
    </div>
  );
};

export default HairstyleView;
