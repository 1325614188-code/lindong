import React, { useState, useEffect } from 'react';
import { Solar } from 'lunar-javascript';
import { analysisNaming } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface CompanyNamingViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
}

type TabType = 'recommend' | 'score';

const CompanyNamingView: React.FC<CompanyNamingViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [activeTab, setActiveTab] = useState<TabType>('recommend');
    
    // 老板生辰信息
    const date = new Date();
    const [year, setYear] = useState(date.getFullYear() - 40);
    const [month, setMonth] = useState(date.getMonth() + 1);
    const [day, setDay] = useState(date.getDate());
    const [hour, setHour] = useState(12);
    const [lunarText, setLunarText] = useState('');
    const [baZiText, setBaZiText] = useState('');

    // 公共字段
    const [industry, setIndustry] = useState('');

    // 起名字段
    const [ownerName, setOwnerName] = useState('');

    // 评分字段
    const [companyNameToScore, setCompanyNameToScore] = useState('');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    // 计算农历和八字
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

    const handleAction = async () => {
        if (!industry.trim()) {
            alert('请输入从事行业');
            return;
        }
        if (activeTab === 'recommend' && !ownerName.trim()) {
            alert('请输入老板姓名');
            return;
        }
        if (activeTab === 'score' && !companyNameToScore.trim()) {
            alert('请输入公司名称');
            return;
        }

        const birthInfo = `${year}年${month}月${day}日 ${hour}:00`;

        const hasCredits = await onCheckCredits();
        if (!hasCredits) return;

        setLoading(true);
        try {
            await onDeductCredit();

            const report = await analysisNaming({
                type: activeTab === 'recommend' ? 'company_recommend' : 'company_score',
                birthInfo,
                ownerName,
                industry,
                nameToScore: companyNameToScore
            });
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
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 hover:text-blue-600 transition-colors">
                        <span className="text-xl">←</span>
                    </button>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">公司命理分析报告</h2>
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-blue-100/50 border border-blue-50 relative overflow-hidden prose prose-sm max-w-none xhs-report">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50/50 rounded-full -ml-16 -mb-16 blur-3xl" />
                    
                    <div className="relative z-10 text-gray-700 leading-relaxed font-medium">
                        <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                </div>

                <button 
                  onClick={() => setResult(null)} 
                  className="w-full h-15 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                    返回修改 ✨
                </button>
            </div>
        );
    }

    const years = Array.from({ length: 120 }, (_, i) => 2024 - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="p-6 flex flex-col gap-6 pb-20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <span className="text-xl">←</span>
                </button>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">公司起名</h2>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
                <button
                    onClick={() => setActiveTab('recommend')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'recommend' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                    起名推荐
                </button>
                <button
                    onClick={() => setActiveTab('score')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'score' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                    名字评分
                </button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-blue-100/50 border border-blue-50 flex flex-col gap-6">
                {/* 共同部分：老板生辰与行业 */}
                <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs">📅</span>
                        老板出生信息 (新历/阳历)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">年份</span>
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">月份</span>
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                {months.map(m => <option key={m} value={m}>{m}月</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">日期</span>
                            <select
                                value={day}
                                onChange={(e) => setDay(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                {days.map(d => <option key={d} value={d}>{d}日</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 ml-2">时辰</span>
                            <select
                                value={hour}
                                onChange={(e) => setHour(parseInt(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                            >
                                {hours.map(h => <option key={h} value={h}>{h}时</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50/30 rounded-2xl p-4 space-y-1.5 border border-blue-100/30">
                        <p className="text-[11px] text-blue-500 font-black flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            {lunarText}
                        </p>
                        <p className="text-[11px] text-blue-400 font-bold ml-3.5">
                            {baZiText}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-700 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs">🏢</span>
                            从事行业
                        </label>
                        <input
                            type="text"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            placeholder="如：餐饮、科技、进出口贸易..."
                            className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                {/* 差异部分 */}
                {activeTab === 'recommend' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs">👤</span>
                                老板姓名
                            </label>
                            <input
                                type="text"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="请输入老板真实姓名"
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs">🏷️</span>
                                公司名称
                            </label>
                            <input
                                type="text"
                                value={companyNameToScore}
                                onChange={(e) => setCompanyNameToScore(e.target.value)}
                                placeholder="请输入公司全称或字号"
                                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                )}

                <button
                    onClick={handleAction}
                    disabled={loading}
                    className="w-full h-15 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black mt-4 shadow-xl shadow-blue-100 relative active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                            <>
                                <span className="animate-spin text-xl">🔮</span>
                                正在进行大局布局...
                            </>
                        ) : (
                            <>
                                <span>{activeTab === 'recommend' ? '开始公司起名' : '开始名称评分'}</span>
                                <span className="text-lg">✨</span>
                            </>
                        )}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default CompanyNamingView;
