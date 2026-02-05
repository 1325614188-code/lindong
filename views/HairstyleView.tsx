
import React, { useState } from 'react';
import { generateHairstyles } from '../services/gemini';

interface HairstyleViewProps {
  onBack: () => void;
}

const HairstyleView: React.FC<HairstyleViewProps> = ({ onBack }) => {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [gender, setGender] = useState<'女' | '男'>('女');
  const [results, setResults] = useState<{ name: string; imageUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!faceImage) return;
    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: 10 });
    try {
      // NOTE: 使用进度回调实时更新 UI，不再在最后进行全量覆盖
      await generateHairstyles(faceImage, gender, (current, total, result) => {
        setProgress({ current, total });
        if (result) {
          setResults(prev => {
            // 防止重复添加
            if (prev.some(item => item.name === result.name)) return prev;
            return [...prev, result];
          });
        }
      });
    } catch (e) {
      console.error(e);
      alert('生成失败，请重试');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="p-6 relative">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-2xl">←</button>
        <h2 className="text-xl font-bold">发型参考</h2>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <label className="w-40 h-40 mx-auto rounded-full bg-white border-2 border-dashed border-pink-200 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm">
          {faceImage ? (
            <img src={faceImage} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <span className="text-3xl block">📸</span>
              <span className="text-xs text-gray-400">点击上传正面照</span>
            </div>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => setGender('女')}
            className={`px-6 py-2 rounded-full font-bold ${gender === '女' ? 'bg-pink-500 text-white' : 'bg-white text-gray-500'}`}
          >
            女生
          </button>
          <button
            onClick={() => setGender('男')}
            className={`px-6 py-2 rounded-full font-bold ${gender === '男' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}
          >
            男生
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!faceImage || loading}
          className="w-full h-14 bg-rose-500 text-white rounded-2xl font-bold disabled:bg-gray-300 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 正在生成 {progress?.current || 0}/{progress?.total || 10}...</>
          ) : '生成10款发型参考'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {results.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm" onClick={() => setSelectedImage(item.imageUrl)}>
              <div className="aspect-[3/4] bg-gray-100">
                <img src={item.imageUrl} className="w-full h-full object-cover" />
              </div>
              <div className="p-2 text-center">
                <span className="text-sm font-bold text-gray-700">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-8 right-8 text-white text-3xl">×</button>
        </div>
      )}
    </div>
  );
};

export default HairstyleView;
