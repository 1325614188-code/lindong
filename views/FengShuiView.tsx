import ReactMarkdown from 'react-markdown';

import React, { useState } from 'react';
import { generateXHSStyleReport } from '../services/gemini';


interface FengShuiViewProps {
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
}

const FengShuiView: React.FC<FengShuiViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
  const [image, setImage] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    // 检查额度
    const hasCredits = await onCheckCredits?.();
    if (!hasCredits) return;

    setLoading(true);
    try {
      const res = await generateXHSStyleReport("摆设风水分析", [image], "分析图中办公桌或家居摆设的布局，给出风水评分和改进建议。");
      if (res) {
        setReport(res);
        // 成功后扣除额度
        console.log('[FengShuiView] 分析成功，开始扣除额度');
        await onDeductCredit?.();
      } else {
        alert('分析失败');
      }
    } catch (e) {
      console.error(e);
      alert('分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-2xl">←</button>
        <h2 className="text-xl font-bold">家居摆设风水</h2>
      </div>

      <div className="mb-6">
        <label className="w-full aspect-video rounded-2xl bg-white border-2 border-dashed border-yellow-200 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm">
          {image ? (
            <img src={image} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <span className="text-4xl block mb-2">🪴</span>
              <p className="text-sm text-gray-400">拍照上传办公桌或房间一角</p>
            </div>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </label>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!image || loading}
        className="w-full h-14 bg-yellow-500 text-white rounded-2xl font-bold shadow-lg mb-6"
      >
        {loading ? '风水大师分析中...' : '开始风水诊断'}
      </button>

      {report && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-yellow-50 prose max-w-none">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default FengShuiView;
