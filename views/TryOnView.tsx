
import React, { useState } from 'react';
import { generateTryOnImage } from '../services/gemini';

interface TryOnViewProps {
  type: 'clothes' | 'accessories';
  onBack: () => void;
}

const TryOnView: React.FC<TryOnViewProps> = ({ type, onBack }) => {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!faceImage || !itemImage) return;
    setLoading(true);
    try {
      const result = await generateTryOnImage(faceImage, itemImage, type === 'clothes' ? 'clothes' : 'earrings');
      setResultImage(result);
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
        <h2 className="text-xl font-bold">{type === 'clothes' ? '虚拟试穿' : '配饰试戴'}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-500">1. 上传人脸照片</p>
          <label className="aspect-[3/4] rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer">
            {faceImage ? (
              <img src={faceImage} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setFaceImage)} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-500">2. 上传{type === 'clothes' ? '服装' : '耳坠'}照片</p>
          <label className="aspect-[3/4] rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer">
            {itemImage ? (
              <img src={itemImage} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{type === 'clothes' ? '👗' : '👂'}</span>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setItemImage)} />
          </label>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!faceImage || !itemImage || loading}
        className="w-full h-14 bg-pink-500 text-white rounded-2xl font-bold disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 生成中...</>
        ) : '开始魔法生成 ✨'}
      </button>

      {resultImage && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-center font-bold text-gray-700">锵锵！这是你的试穿效果图：</p>
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img src={resultImage} className="w-full" />
          </div>
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = resultImage;
              link.download = 'try-on-result.png';
              link.click();
            }}
            className="text-pink-500 font-bold border-2 border-pink-500 rounded-xl p-3"
          >
            保存到相册
          </button>
        </div>
      )}
    </div>
  );
};

export default TryOnView;
