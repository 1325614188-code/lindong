
import React, { useState } from 'react';
import { generateTryOnImage, detectPhotoContent } from '../services/gemini';

interface TryOnViewProps {
  type: 'clothes' | 'accessories';
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
}

const TryOnView: React.FC<TryOnViewProps> = ({ type, onBack, onCheckCredits, onDeductCredit }) => {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [detecting, setDetecting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFaceImage: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;

        if (isFaceImage) {
          setDetecting(true);
          setFaceImage(imageData); // 先显示预览，增强反馈感
          try {
            const isValid = await detectPhotoContent(imageData);
            if (!isValid) {
              alert('检测失败：需要上传带脸部的上半身正面照片（需露出肩膀和胸部）。');
              setFaceImage(null);
            }
          } catch (error) {
            console.error('[TryOnView] Detection error:', error);
            // 如果检测接口报错，为了不影响核心流程，默认放行或提示重传
            // 这里选择允许，但在生成逻辑里会有 AI 最终把关
          } finally {
            setDetecting(false);
          }
        } else {
          setItemImage(imageData);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!faceImage || !itemImage) return;

    // 检查额度
    const hasCredits = await onCheckCredits?.();
    if (!hasCredits) return;

    setLoading(true);
    try {
      const result = await generateTryOnImage(faceImage, itemImage, type === 'clothes' ? 'clothes' : 'earrings');
      if (result) {
        setResultImage(result);
        // 成功后扣除额度
        console.log('[TryOnView] 生成成功，开始扣除额度');
        await onDeductCredit?.();
      } else {
        console.warn('[TryOnView] 生成失败，未返回结果，不扣除额度');
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
        <h2 className="text-xl font-bold">{type === 'clothes' ? '虚拟试穿' : '配饰试戴'}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-500">1. 上传上半身人脸照片</p>
          <label className="aspect-[3/4] rounded-2xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
            {faceImage ? (
              <div className="relative w-full h-full">
                <img src={faceImage} className={`w-full h-full object-cover ${detecting ? 'opacity-50 grayscale' : ''}`} />
                {detecting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-white">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-bold">检测照片中...</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="text-3xl">👤</span>
                <span className="text-xs text-gray-400 mt-2 px-2 text-center">请上传清晰的上半身照片</span>
              </>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
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
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, false)} />
          </label>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!faceImage || !itemImage || loading || detecting}
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
