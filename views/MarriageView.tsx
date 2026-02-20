
import React, { useState } from 'react';
import { analysisMarriage, generatePartnerImage } from '../services/gemini';

interface MarriageViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
}

const MarriageView: React.FC<MarriageViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [birthInfo, setBirthInfo] = useState('');
    const [gender, setGender] = useState<'男' | '女'>('女');
    const [usePhoto, setUsePhoto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [partnerImage, setPartnerImage] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!birthInfo) {
            alert('请先输入出生信息哦～');
            return;
        }

        // 检查额度
        const hasCredits = await onCheckCredits();
        if (!hasCredits) return;

        setLoading(true);
        try {
            // 扣除初始额度
            await onDeductCredit();

            const report = await analysisMarriage(birthInfo, gender);
            setResult(report);

            // 如果选择了上传照片/生成长相 (这里简化为只要勾选就生成)
            if (usePhoto) {
                // 如果开启了照片功能，再额外扣除一个额度 (根据用户要求：如果在原来的基础上增加一个使用次数额度)
                const hasExtraCredit = await onCheckCredits();
                if (hasExtraCredit) {
                    await onDeductCredit();
                    // 提取 PARTNER_DESC
                    const descMatch = report.match(/\[PARTNER_DESC:(.*?)\]/);
                    const partnerDesc = descMatch ? descMatch[1] : '一位理想的中国异性';
                    const image = await generatePartnerImage(partnerDesc, gender);
                    setPartnerImage(image);
                }
            }
        } catch (e) {
            console.error(e);
            alert('分析失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl">←</button>
                    <h2 className="text-xl font-bold">姻缘分析结果</h2>
                </div>

                {partnerImage && (
                    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-4 border-pink-200">
                        <img src={partnerImage} alt="理想另一半" className="w-full h-80 object-cover" />
                        <div className="p-3 bg-pink-50 text-center text-pink-600 font-bold text-sm">
                            ✨ AI 根据命理为您生成的理想伴侣画像 ✨
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 xhs-report">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                        {result.replace(/\[PARTNER_DESC:.*?\]/, '').trim()}
                    </div>
                </div>

                <button onClick={onBack} className="w-full h-14 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-2xl font-bold shadow-lg">
                    再次探索
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">看姻缘</h2>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col gap-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">出生信息 (新历)</label>
                    <input
                        type="text"
                        placeholder="如：1995年8月15日 14:30"
                        value={birthInfo}
                        onChange={(e) => setBirthInfo(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-pink-100 bg-pink-50/30 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">您的性别</label>
                    <div className="flex gap-4">
                        {(['女', '男'] as const).map(g => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`flex-1 h-12 rounded-xl font-bold transition-all ${gender === g ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {g === '女' ? '🚺 ' : '🚹 '}{g}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl">
                    <span className="text-sm font-bold text-rose-700">生成理想另一半画像</span>
                    <button
                        onClick={() => setUsePhoto(!usePhoto)}
                        className={`w-12 h-6 rounded-full transition-all relative ${usePhoto ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${usePhoto ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
                {usePhoto && (
                    <p className="text-[10px] text-pink-400 -mt-3">提示：生成画像将额外消耗1次额度</p>
                )}

                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-2xl font-bold mt-2 shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? '🔮 正在窥探天机...' : '开启姻缘之旅 ✨'}
                </button>
            </div>

            <div className="mt-4 p-5 bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl border border-pink-100">
                <h4 className="font-bold text-pink-700 mb-2 flex items-center gap-2">
                    <span>📜</span> 原理说明
                </h4>
                <p className="text-xs text-pink-600 leading-relaxed">
                    本功能结合中国传统八字命理精髓与现代 AI 大模型，精准换算农历并分析五行生克。我们将为您解析正缘出现的绝佳时机，并基于相术原理为您勾勒出命中注定的 Ta。
                </p>
            </div>
        </div>
    );
};

export default MarriageView;
