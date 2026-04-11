
import React, { useState, useEffect } from 'react';
import { Solar } from 'lunar-javascript';
import { analysisZiWei } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface ZiWeiViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
}

const ZiWeiView: React.FC<ZiWeiViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    // 日期选择状态
    const date = new Date();
    const [year, setYear] = useState(date.getFullYear() - 25);
    const [month, setMonth] = useState(date.getMonth() + 1);
    const [day, setDay] = useState(date.getDate());
    const [hour, setHour] = useState(12);
    const [lunarText, setLunarText] = useState('');
    const [baZiText, setBaZiText] = useState('');

    const [gender, setGender] = useState<'男' | '女'>('女');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    // 计算农历和八字 (实时反馈)
    useEffect(() => {
        try {
            const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
            const lunar = solar.getLunar();
            const shiChen = lunar.getTimeZhi() + '时';
            setLunarText(`农历：${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()} ${shiChen}`);
            setBaZiText(`八字：${lunar.getYearInGanZhi()} ${lunar.getMonthInGanZhi()} ${lunar.getDayInGanZhi()} ${lunar.getTimeInGanZhi()}`);
        } catch (e) {
            setLunarText('日期无效');
            setBaZiText('');
        }
    }, [year, month, day, hour]);

    const handleAnalyze = async () => {
        const birthInfo = `${year}年${month}月${day}日 ${hour}:00`;

        // 检查额度
        const hasCredits = await onCheckCredits();
        if (!hasCredits) return;

        setLoading(true);
        try {
            // 扣除初始额度
            await onDeductCredit();

            const report = await analysisZiWei(birthInfo, gender);
            setResult(report);
        } catch (e) {
            console.error(e);
            alert('分析失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="p-6 flex flex-col gap-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        <span className="text-xl">←</span>
                    </button>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">紫微命理分析</h2>
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/50 border border-indigo-50 relative overflow-hidden prose prose-sm max-w-none xhs-report">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50/50 rounded-full -ml-16 -mb-16 blur-3xl" />
                    
                    <div className="relative z-10 text-gray-700 leading-relaxed font-medium">
                        <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                </div>

                <button 
                  onClick={() => setResult(null)} 
                  className="w-full h-15 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                >
                    再次解析 ✨
                </button>
            </div>
        );
    }

    // 生成选项
    const years = Array.from({ length: 120 }, (_, i) => 2024 - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="p-6 flex flex-col gap-6 pb-20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 hover:text-indigo-600 transition-colors">
                    <span className="text-xl">←</span>
                </button>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">紫微斗数</h2>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-indigo-100/50 border border-indigo-50 flex flex-col gap-6">
                <div>
                    <label className="block text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs">📅</span>
                        出生信息 (新历/阳历)
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">年份</span>
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                            >
                                {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">月份</span>
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                            >
                                {months.map(m => <option key={m} value={m}>{m}月</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">日期</span>
                            <select
                                value={day}
                                onChange={(e) => setDay(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                            >
                                {days.map(d => <option key={d} value={d}>{d}日</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">时辰</span>
                            <select
                                value={hour}
                                onChange={(e) => setHour(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                            >
                                {hours.map(h => <option key={h} value={h}>{h}时</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50/30 rounded-2xl p-4 space-y-1.5 border border-indigo-100/30">
                        <p className="text-[11px] text-indigo-500 font-black flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                            {lunarText}
                        </p>
                        <p className="text-[11px] text-indigo-400 font-bold ml-3.5">
                            {baZiText}
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-xs">👤</span>
                        生辰性别
                    </label>
                    <div className="flex gap-4">
                        {(['女', '男'] as const).map(g => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`flex-1 h-14 rounded-2xl font-black transition-all transform active:scale-95 flex items-center justify-center gap-2 ${gender === g ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100 scale-[1.02]' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                            >
                                <span className={gender === g ? 'opacity-100' : 'opacity-40 grayscale'}>
                                    {g === '女' ? '🚺' : '🚹'}
                                </span>
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full h-15 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-2xl font-black mt-4 shadow-xl shadow-indigo-100 overflow-hidden relative group active:scale-95 transition-all disabled:opacity-50"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                            <>
                                <span className="animate-spin text-xl">🔮</span>
                                正在进行紫微排盘...
                            </>
                        ) : (
                            <>
                                <span>开启紫微分析</span>
                                <span className="text-lg">✨</span>
                            </>
                        )}
                    </span>
                </button>
            </div>

            <div className="mt-2 p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-[32px] border border-indigo-100/50">
                <h4 className="font-black text-indigo-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">📜</span> 
                    <span className="tracking-tight">传承与科技</span>
                </h4>
                <p className="text-xs text-indigo-600/80 leading-relaxed font-medium">
                    紫微斗数是中国传统命理学的重要组成部分，被称为“中华第一神数”。我们结合传统排盘算法与先进 AI，为您精准勾勒人生的星图轨迹。
                </p>
            </div>
        </div>
    );
};

export default ZiWeiView;
