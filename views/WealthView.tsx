
import React, { useState } from 'react';
import { analysisWealth } from '../services/gemini';

interface WealthViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
}

const WealthView: React.FC<WealthViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [birthInfo, setBirthInfo] = useState('');
    const [gender, setGender] = useState<'男' | '女'>('女');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!birthInfo) {
            alert('请先输入出生信息哦～');
            return;
        }

        const hasCredits = await onCheckCredits();
        if (!hasCredits) return;

        setLoading(true);
        try {
            await onDeductCredit();
            const report = await analysisWealth(birthInfo, gender);
            setResult(report);
        } catch (e) {
            console.error(e);
            alert('获取财运报告失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl">←</button>
                    <h2 className="text-xl font-bold">财运报告</h2>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 xhs-report">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                        {result}
                    </div>
                </div>

                <button onClick={onBack} className="w-full h-14 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold shadow-lg">
                    继续搞钱 💰
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">看财富</h2>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex flex-col gap-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">出生信息 (新历)</label>
                    <input
                        type="text"
                        placeholder="如：1992年5月20日 08:30"
                        value={birthInfo}
                        onChange={(e) => setBirthInfo(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">您的性别</label>
                    <div className="flex gap-4">
                        {(['女', '男'] as const).map(g => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`flex-1 h-12 rounded-xl font-bold transition-all ${gender === g ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {g === '女' ? '🚺 ' : '🚹 '}{g}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-bold mt-2 shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? '🪙 正在财位推算...' : '预测财富未来 💰'}
                </button>
            </div>

            <div className="mt-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100">
                <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                    <span>🪙</span> 搞钱指南原理
                </h4>
                <p className="text-xs text-amber-600 leading-relaxed">
                    基于生辰八字中的财星旺衰、十神分布，结合流年财位走向，利用 AI 技术为您解析一生的财富脉络。不仅提供财旺年份预测，更结合您的命理五行给出具体的转行建议和旺财局。
                </p>
            </div>
        </div>
    );
};

export default WealthView;
