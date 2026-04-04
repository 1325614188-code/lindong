
import React, { useState, useEffect } from 'react';

interface EQTestViewProps {
    onBack: () => void;
    onCheckCredits?: () => Promise<boolean>;
    onDeductCredit?: () => Promise<boolean>;
}

// 50道情商测试题目
const EQ_QUESTIONS = [
    // 1. 自我意识 (1-10)
    { q: '我能准确识别自己当前的情绪状态', dimension: '自我意识' },
    { q: '我清楚自己的优缺点和能力边界', dimension: '自我意识' },
    { q: '当情绪波动时，我通常能理解其背后的原因', dimension: '自我意识' },
    { q: '我对自己的价值观和目标有清晰的认识', dimension: '自我意识' },
    { q: '我对他人的评价能够客观看待，不盲目自信或自卑', dimension: '自我意识' },
    { q: '在面临压力时，我能意识到身体发出的紧张信号', dimension: '自我意识' },
    { q: '我经常反思自己的言行对他人产生的影响', dimension: '自我意识' },
    { q: '我敢于承认自己的错误，而不是掩饰', dimension: '自我意识' },
    { q: '我清楚哪些人或事容易触动我的情绪底线', dimension: '自我意识' },
    { q: '我能在紧急情况下保持对自我感受的觉察', dimension: '自我意识' },

    // 2. 自我管理 (11-20)
    { q: '在生气时，我通常能控制住冲动而不爆粗口或摔东西', dimension: '自我管理' },
    { q: '面对突发变化，我能迅速调整心态去适应', dimension: '自我管理' },
    { q: '我能坚持完成枯燥但重要的任务', dimension: '自我管理' },
    { q: '即使感到沮丧，我也能尽量保持乐观的态度', dimension: '自我管理' },
    { q: '我善于排解压力，不会让负面情绪积压太久', dimension: '自我管理' },
    { q: '我能在诱惑面前保持自律，专注于长远目标', dimension: '自我管理' },
    { q: '批评他人的时候，我能控制语气，做到对事不对人', dimension: '自我管理' },
    { q: '遭遇失败后，我能很快打起精神重新开始', dimension: '自我管理' },
    { q: '我很少因一时的情绪而做出事后后悔的重大决定', dimension: '自我管理' },
    { q: '我能在快节奏的工作中保持内心的平静', dimension: '自我管理' },

    // 3. 自我激励 (21-30)
    { q: '即使没有外界奖励，我也能对工作保持热情', dimension: '自我激励' },
    { q: '当遇到困难时，我首先想到的是如何解决而不是放弃', dimension: '自我激励' },
    { q: '我喜欢挑战新事物，并以此作为成长的动力', dimension: '自我激励' },
    { q: '我总能找到让自己重新投入工作的理由', dimension: '自我激励' },
    { q: '我追求卓越，不仅仅是为了获得赞美', dimension: '自我激励' },
    { q: '我相信通过努力可以改变现状，而不是怨天尤人', dimension: '自我激励' },
    { q: '我对自己的目标充满信心，并稳步推进', dimension: '自我激励' },
    { q: '我经常设定具有挑战性的目标并努力达成', dimension: '自我激励' },
    { q: '我享受克服困难带来的成就感', dimension: '自我激励' },
    { q: '即使周围人都不看好，我也会坚持我认为正确的事情', dimension: '自我激励' },

    // 4. 共情能力 (31-40)
    { q: '我能轻易察觉到朋友情绪的细微变化', dimension: '共情能力' },
    { q: '当别人向我诉苦时，我能站在对方角度去理解', dimension: '共情能力' },
    { q: '我善于倾听，而不是急于给建议', dimension: '共情能力' },
    { q: '我能理解不同背景和观点的人', dimension: '共情能力' },
    { q: '看到他人受伤或难过，我会感同身受', dimension: '共情能力' },
    { q: '我能敏锐地判断出一个人是否在强颜欢笑', dimension: '共情能力' },
    { q: '在社交场合，我能注意到那些被冷落的人', dimension: '共情能力' },
    { q: '我很少会说出让他人感到难堪的话', dimension: '共情能力' },
    { q: '我能读懂他人的身体语言及其隐含的意思', dimension: '共情能力' },
    { q: '我愿意花时间去理解家人的真正需求', dimension: '共情能力' },

    // 5. 社交技巧 (41-50)
    { q: '我能轻松地处理团队中的冲突和争论', dimension: '社交技巧' },
    { q: '我善于表达自己的意见，同时不让对方感到受威胁', dimension: '社交技巧' },
    { q: '在陌生环境中，我能主动发起谈话', dimension: '社交技巧' },
    { q: '我具有一定的说服力和影响力', dimension: '社交技巧' },
    { q: '我能和不同性格的人建立良好的合作关系', dimension: '社交技巧' },
    { q: '大家通常认为我是一个可靠且好相处的人', dimension: '社交技巧' },
    { q: '我善于调动团队成员的积极性', dimension: '社交技巧' },
    { q: '我能在复杂的人际关系中找到平衡点', dimension: '社交技巧' },
    { q: '我经常被邀请参加朋友的聚会，因为我能给派对加分', dimension: '社交技巧' },
    { q: '我懂得在合适的时机赞美他人', dimension: '社交技巧' },
];

const EQTestView: React.FC<EQTestViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [finalReport, setFinalReport] = useState<any>(null);

    // 自动滚动到顶部
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentQuestion, showResult]);

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentQuestion]: score }));
        if (currentQuestion < EQ_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const calculateResult = async () => {
        const hasCredits = await onCheckCredits?.();
        if (!hasCredits) return;

        // 计算总分
        let totalScore = 0;
        const dimensionScores: Record<string, number> = {
            '自我意识': 0,
            '自我管理': 0,
            '自我激励': 0,
            '共情能力': 0,
            '社交技巧': 0
        };

        EQ_QUESTIONS.forEach((q, idx) => {
            const score = answers[idx] || 3;
            totalScore += score;
            dimensionScores[q.dimension] += score;
        });

        // 归并结果
        let level = '';
        let analysis = '';
        let strengths = '';
        let weaknesses = '';
        let suggestions = '';

        if (totalScore >= 200) {
            level = '卓越情商';
            analysis = '你具备极高的情绪智慧，是社交和职场中的领军人物。你不仅能完美掌控自己，还能深刻影响他人。';
            strengths = '洞察力极强、情绪稳定、具备强大的人格魅力和领导力。';
            weaknesses = '有时可能因为过于完美而让周围人感到压力，或因顾及他人感受而牺牲过度。';
            suggestions = '尝试在特定场合展现更为真实放松的一面，在决策中更平衡感性与理性的比例。';
        } else if (totalScore >= 160) {
            level = '高情商';
            analysis = '你的情商表现非常出色，能够游刃有余地处理大多数社交场合，情绪调节能力强。';
            strengths = '同理心旺盛、人际关系和谐、善于自我调节。';
            weaknesses = '在极端压力下，偶尔会有情绪波动的风险。';
            suggestions = '进一步深化对潜意识情绪的察觉，提升在高压环境下的情绪抗压能力。';
        } else if (totalScore >= 120) {
            level = '中等情商';
            analysis = '你具备基础的情绪管理意识，但在复杂的人际博弈或大幅情绪波动面前，仍有进步空间。';
            strengths = '待人友善、具备一定的沟通技巧、工作态度积极。';
            weaknesses = '有时容易被情绪左右，或在社交中显得有些被动。';
            suggestions = '建议多进行正念冥想练习，提高自我察觉能力；学习更积极的沟通技巧，勇敢表达需求。';
        } else {
            level = '情商待提升';
            analysis = '你目前可能正处于情绪敏感期，或者在人际交往中遇到了一些阻碍，需要更多地关注内心世界。';
            strengths = '内心单纯、执着、在特定领域专注力强。';
            weaknesses = '容易冲动、不擅长捕捉他人暗示、自我调节方式单一。';
            suggestions = '系统性地学习情绪管理课程；尝试每日记录情绪日记；多参加社交活动练习倾听。';
        }

        setFinalReport({
            totalScore,
            level,
            analysis,
            strengths,
            weaknesses,
            suggestions,
            dimensionScores
        });
        setShowResult(true);
        await onDeductCredit?.();
    };

    const progress = ((currentQuestion + 1) / EQ_QUESTIONS.length) * 100;
    const allAnswered = Object.keys(answers).length === EQ_QUESTIONS.length;

    if (showResult && finalReport) {
        return (
            <div className="p-6 flex flex-col gap-6 bg-pink-50 min-h-screen pb-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl p-2 bg-white rounded-full shadow-sm">←</button>
                    <h2 className="text-xl font-bold">情商测试报告</h2>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-rose-400 rounded-[40px] p-8 text-white text-center shadow-xl">
                    <p className="text-sm opacity-90 mb-2 uppercase tracking-widest font-bold">Your EQ Grade</p>
                    <h1 className="text-6xl font-black mb-2">{finalReport.totalScore}</h1>
                    <p className="text-2xl font-bold bg-white/20 inline-block px-6 py-1 rounded-full">{finalReport.level}</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm space-y-6">
                    <section>
                        <h3 className="text-pink-600 font-black mb-3 flex items-center gap-2">
                             <span className="w-2 h-6 bg-pink-500 rounded-full"></span> 总体分析
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{finalReport.analysis}</p>
                    </section>

                    <div className="grid grid-cols-1 gap-4">
                        <section className="bg-green-50 p-4 rounded-2xl border border-green-100">
                            <h3 className="text-green-700 font-bold mb-2 flex items-center gap-2">✨ 核心优势</h3>
                            <p className="text-green-800 text-sm">{finalReport.strengths}</p>
                        </section>
                        <section className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <h3 className="text-orange-700 font-bold mb-2 flex items-center gap-2">⚠️ 需要注意</h3>
                            <p className="text-orange-800 text-sm">{finalReport.weaknesses}</p>
                        </section>
                    </div>

                    <section>
                        <h3 className="text-pink-600 font-black mb-3 flex items-center gap-2">
                             <span className="w-2 h-6 bg-pink-500 rounded-full"></span> 改进建议
                        </h3>
                        <div className="bg-pink-50/50 p-4 rounded-2xl text-pink-900 text-sm italic leading-relaxed border-l-4 border-pink-400">
                            "{finalReport.suggestions}"
                        </div>
                    </section>

                    <section>
                        <h3 className="text-pink-600 font-black mb-3 flex items-center gap-2">
                             <span className="w-2 h-6 bg-pink-500 rounded-full"></span> 维度得分
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(finalReport.dimensionScores).map(([key, value]: [any, any]) => (
                                <div key={key}>
                                    <div className="flex justify-between text-xs mb-1 font-bold">
                                        <span className="text-gray-500">{key}</span>
                                        <span className="text-pink-500">{value}/50 分</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-pink-500 h-full rounded-full transition-all duration-1000" 
                                            style={{ width: `${(value / 50) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <button onClick={onBack} className="w-full h-16 bg-pink-500 text-white rounded-[24px] font-black shadow-lg active:scale-95 transition-all text-lg">
                    完成并开启魅力人生
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6 bg-pink-50 min-h-screen">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl p-2 -ml-2">←</button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-gray-800">深度情商测试</h2>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Emotional Intelligence Assessment</p>
                </div>
            </div>

            {/* 进度控制 */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <span className="text-[24px] font-black text-pink-500">{currentQuestion + 1} <span className="text-xs text-gray-400">/ {EQ_QUESTIONS.length}</span></span>
                    <span className="text-[10px] font-black text-pink-300 uppercase tracking-tighter">Processing...</span>
                </div>
                <div className="w-full bg-gray-200/50 rounded-full h-3 p-1">
                    <div className="bg-gradient-to-r from-pink-400 to-rose-400 h-full rounded-full transition-all duration-300 shadow-sm" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* 题目内容 */}
            <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-pink-100/50 min-h-[220px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                 {/* 装饰图标 */}
                 <div className="absolute -top-6 -right-6 text-7xl opacity-5 grayscale">🎭</div>
                 
                 <p className="text-sm text-pink-400 font-bold mb-4 uppercase tracking-[0.2em]">[{EQ_QUESTIONS[currentQuestion].dimension}]</p>
                 <p className="text-[20px] leading-relaxed font-bold text-gray-800">
                    {EQ_QUESTIONS[currentQuestion].q}
                </p>
            </div>

            {/* 选项 */}
            <div className="grid grid-cols-1 gap-3">
                {[
                    { score: 5, label: '非常符合', icon: '🌟' },
                    { score: 4, label: '比较符合', icon: '✨' },
                    { score: 3, label: '一般', icon: '⚖️' },
                    { score: 2, label: '不太符合', icon: '🌫️' },
                    { score: 1, label: '完全不符', icon: '🌑' },
                ].map((opt) => (
                    <button
                        key={opt.score}
                        onClick={() => handleAnswer(opt.score)}
                        className={`w-full py-4 px-6 rounded-3xl flex items-center justify-between font-bold transition-all border-2 ${answers[currentQuestion] === opt.score ? 'bg-pink-500 text-white border-pink-400 shadow-lg scale-[1.02]' : 'bg-white text-gray-600 border-transparent hover:border-pink-100 active:scale-95'}`}
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-lg">{opt.icon}</span>
                            {opt.label}
                        </span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion] === opt.score ? 'border-white bg-white/20' : 'border-gray-100'}`}>
                             {answers[currentQuestion] === opt.score && <div className="w-3 h-3 bg-white rounded-full"></div>}
                        </div>
                    </button>
                ))}
            </div>

            {/* 底部导航 */}
            <div className="flex gap-4 mt-4">
                <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="flex-1 py-4 rounded-3xl bg-white border-2 border-pink-100 text-pink-500 font-black disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                >
                    上一题
                </button>
                {allAnswered ? (
                    <button
                        onClick={calculateResult}
                        className="flex-[2] py-4 rounded-3xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black shadow-lg shadow-pink-200 animate-pulse active:scale-95 transition-all text-center"
                    >
                        生成深度报告 ✨
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.min(EQ_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentQuestion === EQ_QUESTIONS.length - 1}
                        className="flex-1 py-4 rounded-3xl bg-pink-100 text-pink-600 font-black disabled:opacity-30 transition-all active:scale-95"
                    >
                        下一题
                    </button>
                )}
            </div>
        </div>
    );
};

export default EQTestView;
