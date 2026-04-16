import React, { useState } from 'react';
import { generateTryOnImage, detectPhotoContent } from '../services/gemini';
import { saveImageToDevice } from '../lib/download';
import { compressImage } from '../lib/image';

interface TryOnViewProps {
  type: 'clothes' | 'accessories';
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
  onCancelProcessing?: () => void;
}

const TryOnView: React.FC<TryOnViewProps> = ({ type, onBack, onCheckCredits, onDeductCredit, onCancelProcessing }) => {
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
        const base64 = reader.result as string;

        try {
          // 统一调整为全站优化后的 768px 分辨率和 0.5 质量
          const compressed = await compressImage(base64, 768, 0.5);

          if (isFaceImage) {
            // 注意：不再在这里立即调用 API 检测，仅在点击生成时检测，节省额度
            setFaceImage(compressed);
          } else {
            setItemImage(compressed);
          }
        } catch (err) {
          console.error('[TryOnView] Compression error:', err);
          if (isFaceImage) setFaceImage(base64);
          else setItemImage(base64);
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
      // 在此处进行延迟合规检测，使用低分辨率减少 Token 消耗
      setDetecting(true);
      const detectionImage = await compressImage(faceImage, 512, 0.4);
      const isValid = await detectPhotoContent(detectionImage);
      setDetecting(false);

      if (!isValid) {
        alert('检测失败：需要上传带脸部的上半身正面照片（需露出肩膀和胸部）。');
        setLoading(false);
        return;
      }

      const result = await generateTryOnImage(faceImage, itemImage, type === 'clothes' ? 'clothes' : 'earrings');
      if (result) {
        setResultImage(result);
        // 成功后扣除额度
        console.log('[TryOnView] 生成成功，开始扣除额度');
        await onDeductCredit?.();
      } else {
        console.warn('[TryOnView] 生成失败，未返回结果，不扣除额度');
        alert('生成失败，请稍后重试');
        onCancelProcessing?.(); // 失败回收
      }
    } catch (e) {
      console.error(e);
      alert('生成失败，请稍后重试');
      onCancelProcessing?.(); // 异常回收
    } finally {
      setLoading(false);
      onCancelProcessing?.(); // 保底回收
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
            onClick={() => saveImageToDevice(resultImage, 'try-on-result')}
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
