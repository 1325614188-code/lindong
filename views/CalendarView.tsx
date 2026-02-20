import ReactMarkdown from 'react-markdown';

import React, { useState } from 'react';
import { analyzeImage } from '../services/gemini';


interface CalendarViewProps {
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
  const [todo, setTodo] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  const handleCheck = async () => {
    if (!todo) return;

    // 检查额度
    const hasCredits = await onCheckCredits?.();
    if (!hasCredits) return;

    setLoading(true);
    try {
      const systemInstruction = "你是一位精通传统黄历和时尚穿搭的博主。语气亲切，富有生活气息。";
      const prompt = `今天是${today}。我想做的事情是：${todo}。请结合今日黄历背景，给出吉凶建议，并推荐今天适合穿什么颜色的衣服来提升好运，最后用小红书风格排版。`;
      const res = await analyzeImage(prompt, [], systemInstruction);
      if (res) {
        setReport(res);
        // 成功后扣除额度
        console.log('[CalendarView] 分析成功，开始扣除额度');
        await onDeductCredit?.();
      } else {
        alert('系统繁忙，请稍后再试');
      }
    } catch (e) {
      console.error(e);
      alert('系统繁忙，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-2xl">←</button>
        <h2 className="text-xl font-bold">出门黄历</h2>
      </div>

      <div className="bg-[#C69C6D] text-white p-6 rounded-3xl shadow-xl mb-8">
        <p className="text-sm opacity-80 mb-1">公历：{today}</p>
        <h3 className="text-2xl font-bold mb-4">今日万事如意 ✨</h3>
        <div className="bg-white/10 p-4 rounded-xl">
          <label className="block text-sm font-bold mb-2">今天打算去干嘛？</label>
          <input
            type="text"
            value={todo}
            onChange={(e) => setTodo(e.target.value)}
            placeholder="如：去面试、约会、搬家..."
            className="w-full bg-white text-gray-800 p-3 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={!todo || loading}
        className="w-full h-14 bg-[#C69C6D] text-white rounded-2xl font-bold shadow-lg mb-6 flex items-center justify-center gap-2"
      >
        {loading ? '正在夜观天象...' : '查看吉凶 & 穿搭建议'}
      </button>

      {report && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-50 prose max-w-none">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
