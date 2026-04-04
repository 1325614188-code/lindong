
import React, { useState, useEffect } from 'react';

interface BigFiveViewProps {
    onBack: () => void;
    onCheckCredits?: () => Promise<boolean>;
    onDeductCredit?: () => Promise<boolean>;
}

interface Question {
    q: string;
    dimension: 'O' | 'C' | 'E' | 'A' | 'N';
    reverse?: boolean;
}

// BFI-50 大五人格量表 50题
const BIG_FIVE_QUESTIONS: Question[] = [
    // 外向性 (Extraversion)
    { q: '我是派对中的灵魂人物（爱热闹）', dimension: 'E' },
    { q: '我不爱多说话', dimension: 'E', reverse: true },
    { q: '在周围人中间感到自在', dimension: 'E' },
    { q: '我喜欢躲在后台（保持低调）', dimension: 'E', reverse: true },
    { q: '我喜欢开启谈话', dimension: 'E' },
    { q: '我没什么话好说', dimension: 'E', reverse: true },
    { q: '我喜欢跟很多人交谈', dimension: 'E' },
    { q: '我保持安静并不想引人注目', dimension: 'E', reverse: true },
    { q: '我不介意成为关注焦点', dimension: 'E' },
    { q: '在陌生人周围我感到拘束', dimension: 'E', reverse: true },

    // 宜人性 (Agreeableness)
    { q: '我对他人深表同情', dimension: 'A' },
    { q: '我不怎么关心他人', dimension: 'A', reverse: true },
    { q: '我有一颗柔软的心（易被感动）', dimension: 'A' },
    { q: '我对他人的处境漠不关心', dimension: 'A', reverse: true },
    { q: '我对他人的感受很敏感', dimension: 'A' },
    { q: '我有时对他人的痛苦无动于衷', dimension: 'A', reverse: true },
    { q: '我愿意为他人腾出时间', dimension: 'A' },
    { q: '我对别人的烦恼不感兴趣', dimension: 'A', reverse: true },
    { q: '我让别人感到舒心', dimension: 'A' },
    { q: '我觉得很多人都不值得我信任', dimension: 'A', reverse: true },

    // 尽责性 (Conscientiousness)
    { q: '我总是做好了充分准备', dimension: 'C' },
    { q: '我常把东西乱丢', dimension: 'C', reverse: true },
    { q: '我注重细节', dimension: 'C' },
    { q: '我经常把事情弄得一团糟', dimension: 'C', reverse: true },
    { q: '我立刻处理家务活', dimension: 'C' },
    { q: '我经常忘记把东西放回原位', dimension: 'C', reverse: true },
    { q: '我做事很有条理', dimension: 'C' },
    { q: '我有时会逃避责任', dimension: 'C', reverse: true },
    { q: '我喜欢按计划行事', dimension: 'C' },
    { q: '我经常由于缺乏毅力无果而终', dimension: 'C', reverse: true },

    // 神经质 (Neuroticism) - 或称 情绪稳定性
    { q: '我很容易感到压力', dimension: 'N' },
    { q: '我大多数时候都很放松', dimension: 'N', reverse: true },
    { q: '我经常感到焦虑（烦恼）', dimension: 'N' },
    { q: '我很少感到沮丧', dimension: 'N', reverse: true },
    { q: '我很容易感到不悦（心烦）', dimension: 'N' },
    { q: '我的情绪通常非常平稳', dimension: 'N', reverse: true },
    { q: '我的情绪变化很快', dimension: 'N' },
    { q: '我很少感到不知所措', dimension: 'N', reverse: true },
    { q: '我经常担心事情会变糟', dimension: 'N' },
    { q: '我通常能很好地应对挫折', dimension: 'N', reverse: true },

    // 开放性 (Openness)
    { q: '我有丰富的词汇量（表达能力强）', dimension: 'O' },
    { q: '我对抽象概念理解困难', dimension: 'O', reverse: true },
    { q: '我有活泼的想象力', dimension: 'O' },
    { q: '我对各种思想没有太大兴趣', dimension: 'O', reverse: true },
    { q: '我常有极佳的创意', dimension: 'O' },
    { q: '我不善于思考抽象问题', dimension: 'O', reverse: true },
    { q: '我有过人的理解力', dimension: 'O' },
    { q: '我很少花心思做各种假设', dimension: 'O', reverse: true },
    { q: '我对各种事物都充满好奇', dimension: 'O' },
    { q: '我觉得传统观念比新思想更可靠', dimension: 'O', reverse: true },
];

const BigFiveView: React.FC<BigFiveViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState<any>(null);

    // 自动滚动到顶部
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentIdx, showResult]);

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentIdx]: score }));
        if (currentIdx < BIG_FIVE_QUESTIONS.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }
    };

    const calculateResult = () => {
        const scores = { O: 0, C: 0, E: 0, A: 0, N: 0 };
        const counts = { O: 0, C: 0, E: 0, A: 0, N: 0 };

        BIG_FIVE_QUESTIONS.forEach((q, idx) => {
            let val = answers[idx] || 3;
            if (q.reverse) {
                val = 6 - val; // 反向计分: 1->5, 2->4, 5->1
            }
            scores[q.dimension] += val;
            counts[q.dimension] += 1;
        });

        // 转换为百分比得分 (1-5分量表，单题满分5，最低1)
        const percentages = {
            O: Math.round(((scores.O / counts.O) - 1) / 4 * 100),
            C: Math.round(((scores.C / counts.C) - 1) / 4 * 100),
            E: Math.round(((scores.E / counts.E) - 1) / 4 * 100),
            A: Math.round(((scores.A / counts.A) - 1) / 4 * 100),
            N: Math.round(((scores.N / counts.N) - 1) / 4 * 100),
        };

        const analysis = {
            O: percentages.O > 70 ? '高开放性：你充满好奇心，思想开放，敢于挑战权威和传统。' : percentages.O < 30 ? '低开放性：你稳重踏实，更倾向于已有的、具体的、传统的事物。' : '中等开放性：你在创意和务实之间找到了很好的平衡点。',
            C: percentages.C > 70 ? '高尽责性：你极其自律，做事有条不紊，是极度可靠的成就者。' : percentages.C < 30 ? '低尽责性：你随性洒脱，不喜欢被规则束缚，有时可能显得效率不高。' : '中等尽责性：你既能处理好工作，也能给自己留出灵活的空间。',
            E: percentages.E > 70 ? '高外向性：你从社交中获取能量，热衷交际，活力四射。' : percentages.E < 30 ? '低外向性：你是一个内向者，通过独处恢复精力，享受深度安静。' : '中等外向性：你是混合型人格，在独处和社交之间切换自如。',
            A: percentages.A > 70 ? '高宜人性：你是一个利他主义者，善解人意，非常受周围人喜爱。' : percentages.A < 30 ? '低宜人性：你竞争意识强，说话直爽，有时会显得有些冷漠。' : '中等宜人性：你懂得关心他人，但也能在必要时守住自己的原则。',
            N: percentages.N > 70 ? '高神经质：你情绪敏感，能够快速察觉环境变化，但也容易焦虑焦虑。' : percentages.N < 30 ? '低神经质（极稳）：你情绪极度稳定，抗压能力惊人，能够冷静面对各种挑战。' : '中等情绪波动：你的情绪状态处于大众普通水平。',
        };

        setResultData({ percentages, analysis });
        setShowResult(true);
    };

    const progress = ((currentIdx + 1) / BIG_FIVE_QUESTIONS.length) * 100;
    const allAnswered = Object.keys(answers).length === BIG_FIVE_QUESTIONS.length;

    if (showResult && resultData) {
        return (
            <div className="p-6 flex flex-col gap-6 bg-[#fafafa] min-h-screen pb-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl p-2 bg-white rounded-xl shadow-sm">←</button>
                    <h2 className="text-xl font-bold">OCEAN 人格分析报告</h2>
                </div>

                <div className="bg-gradient-to-br from-violet-600 to-indigo-500 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 text-[160px] opacity-10 font-black italic">OCEAN</div>
                    <p className="text-xs font-bold tracking-[0.3em] opacity-80 mb-2 uppercase">Personality Insights</p>
                    <h1 className="text-3xl font-black mb-4 leading-tight">发现你潜意识里的<br/>五大精神支柱</h1>
                    <div className="flex gap-2">
                         {Object.keys(resultData.percentages).map(k => (
                             <span key={k} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">{k}</span>
                         ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm space-y-8">
                    {/* 五大维度雷达图代之以进度条 */}
                    <div className="space-y-6">
                        {[
                            { key: 'O', label: '开放性 (Openness)', color: 'bg-indigo-500' },
                            { key: 'C', label: '尽责性 (Conscientiousness)', color: 'bg-emerald-500' },
                            { key: 'E', label: '外向性 (Extraversion)', color: 'bg-amber-500' },
                            { key: 'A', label: '宜人性 (Agreeableness)', color: 'bg-rose-500' },
                            { key: 'N', label: '情绪性 (Neuroticism)', color: 'bg-sky-500' },
                        ].map(trait => (
                            <div key={trait.key}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-bold text-gray-700">{trait.label}</span>
                                    <span className="text-sm font-black italic text-indigo-600">{resultData.percentages[trait.key]}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${trait.color}`} 
                                        style={{ width: `${resultData.percentages[trait.key]}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                                    {resultData.analysis[trait.key]}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={onBack} className="w-full h-16 bg-violet-600 text-white rounded-[24px] font-black shadow-lg shadow-violet-200 active:scale-95 transition-all">
                    返回实验室
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6 bg-[#f8f9ff] min-h-screen">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl p-2 bg-white rounded-xl shadow-sm">←</button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-violet-900 italic">Big Five / OCEAN</h2>
                    <p className="text-[10px] text-violet-300 font-bold tracking-widest uppercase">国际标准大五人格测试</p>
                </div>
            </div>

            {/* 顶层进度条 */}
            <div className="w-full bg-violet-100 rounded-full h-1">
                <div className="bg-violet-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center -mt-4">
                 <span className="text-[40px] font-black text-violet-600/20 italic">{currentIdx + 1}</span>
                 <span className="text-[10px] font-bold text-violet-400 uppercase">Step / 50</span>
            </div>

            {/* 题目卡片 */}
            <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-violet-100/50 min-h-[220px] flex items-center justify-center text-center relative border border-violet-50">
                 <p className="text-[20px] leading-relaxed font-bold text-slate-800">
                    {BIG_FIVE_QUESTIONS[currentIdx].q}
                </p>
            </div>

            {/* 5级李克特量表按钮 */}
            <div className="flex flex-col gap-3">
                {[
                    { score: 5, label: '完全符合', color: 'bg-violet-600' },
                    { score: 4, label: '比较符合', color: 'bg-violet-500' },
                    { score: 3, label: '中立 / 不一定', color: 'bg-slate-400' },
                    { score: 2, label: '不太符合', color: 'bg-slate-500' },
                    { score: 1, label: '完全不符', color: 'bg-slate-600' },
                ].map((opt) => (
                    <button
                        key={opt.score}
                        onClick={() => handleAnswer(opt.score)}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center font-bold transition-all
                            ${answers[currentIdx] === opt.score 
                                ? `${opt.color} text-white shadow-lg scale-[1.02] ring-2 ring-offset-2 ring-violet-200` 
                                : 'bg-white text-slate-500 hover:bg-violet-50 active:scale-95'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-4 mt-2">
                <button
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex-1 py-4 rounded-2xl bg-white text-violet-600 font-black border-2 border-violet-100 disabled:opacity-30"
                >
                    PREV
                </button>
                {allAnswered ? (
                    <button
                        onClick={calculateResult}
                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black shadow-lg animate-pulse"
                    >
                        EXPLORE MY SOUL
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIdx(prev => Math.min(BIG_FIVE_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentIdx === BIG_FIVE_QUESTIONS.length - 1}
                        className="flex-1 py-4 rounded-2xl bg-violet-100 text-violet-600 font-black disabled:opacity-30"
                    >
                        NEXT
                    </button>
                )}
            </div>
        </div>
    );
};

export default BigFiveView;
