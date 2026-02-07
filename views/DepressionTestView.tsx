
import React, { useState } from 'react';

interface DepressionTestViewProps {
    onBack: () => void;
    onCheckCredits?: () => Promise<boolean>;
    onDeductCredit?: () => Promise<void>;
}

// 抑郁症自测50道题目 (基于PHQ-9和其他量表扩展)
const DEPRESSION_QUESTIONS = [
    // 情绪相关
    { q: '最近两周，你是否经常感到心情低落、沮丧或绝望', category: 'mood' },
    { q: '你是否感到生活没有意义', category: 'mood' },
    { q: '你是否经常感到悲伤而无法自控', category: 'mood' },
    { q: '你是否容易因小事而想哭', category: 'mood' },
    { q: '你是否感到内心空虚', category: 'mood' },
    { q: '你是否感到对未来没有希望', category: 'mood' },
    { q: '你是否感到自己是个失败者', category: 'mood' },
    { q: '你是否经常感到莫名的恐惧或不安', category: 'mood' },
    // 兴趣相关
    { q: '你是否对以前喜欢的事情失去了兴趣', category: 'interest' },
    { q: '你是否感到做什么都提不起劲', category: 'interest' },
    { q: '你是否不再期待任何事情', category: 'interest' },
    { q: '你是否感到生活变得乏味无聊', category: 'interest' },
    { q: '你是否很难从愉快的活动中获得满足感', category: 'interest' },
    { q: '你是否不再想参加社交活动', category: 'interest' },
    // 睡眠相关
    { q: '你是否有入睡困难', category: 'sleep' },
    { q: '你是否经常在半夜醒来', category: 'sleep' },
    { q: '你是否早醒后难以再入睡', category: 'sleep' },
    { q: '你是否睡得过多（每天超过10小时）', category: 'sleep' },
    { q: '你是否即使睡了很久仍感到疲惫', category: 'sleep' },
    { q: '你是否做噩梦或睡眠质量差', category: 'sleep' },
    // 精力相关
    { q: '你是否经常感到疲倦、没有精力', category: 'energy' },
    { q: '你是否感到身体沉重、四肢乏力', category: 'energy' },
    { q: '你是否即使休息也无法恢复精力', category: 'energy' },
    { q: '你是否感到完成日常任务都很困难', category: 'energy' },
    { q: '你是否感到反应变慢了', category: 'energy' },
    { q: '你是否感到头脑不够清醒', category: 'energy' },
    // 食欲相关
    { q: '你的食欲是否明显下降', category: 'appetite' },
    { q: '你是否比平时吃得多很多', category: 'appetite' },
    { q: '你的体重是否有明显变化', category: 'appetite' },
    { q: '你是否对食物失去兴趣', category: 'appetite' },
    // 自我评价
    { q: '你是否经常责怪自己', category: 'self' },
    { q: '你是否觉得自己不如别人好', category: 'self' },
    { q: '你是否对自己感到失望', category: 'self' },
    { q: '你是否觉得自己是别人的负担', category: 'self' },
    { q: '你是否对自己的外表感到不满', category: 'self' },
    { q: '你是否感到自己毫无价值', category: 'self' },
    // 注意力相关
    { q: '你是否难以集中注意力', category: 'attention' },
    { q: '你是否难以做出决定', category: 'attention' },
    { q: '你是否经常走神发呆', category: 'attention' },
    { q: '你是否记忆力明显下降', category: 'attention' },
    { q: '你是否难以完成需要思考的任务', category: 'attention' },
    // 行为动作相关
    { q: '你的动作是否变得比平时慢', category: 'behavior' },
    { q: '你是否经常坐立不安', category: 'behavior' },
    { q: '你是否减少了与朋友家人的联系', category: 'behavior' },
    { q: '你是否不想出门或离开家', category: 'behavior' },
    // 严重症状
    { q: '你是否有过"不如死了算了"的想法', category: 'severe' },
    { q: '你是否想过伤害自己', category: 'severe' },
    { q: '你是否感到活着没有意义', category: 'severe' },
    { q: '你是否经常想到死亡', category: 'severe' },
    { q: '你是否有过伤害自己的行为', category: 'severe' },
];

const DepressionTestView: React.FC<DepressionTestViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [totalScore, setTotalScore] = useState(0);

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentQuestion]: score }));
        if (currentQuestion < DEPRESSION_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const calculateResult = async () => {
        // 检查额度
        const hasCredits = await onCheckCredits?.();
        if (!hasCredits) return;

        // 计算总分
        let score = 0;
        Object.values(answers).forEach((a: number) => {
            score += a;
        });

        setTotalScore(score);
        setShowResult(true);
        await onDeductCredit?.();
    };

    const getResultLevel = (score: number): { level: string; color: string; emoji: string; desc: string; advice: string } => {
        const maxScore = DEPRESSION_QUESTIONS.length * 3;
        const percentage = (score / maxScore) * 100;

        if (percentage <= 20) {
            return {
                level: '情绪健康',
                color: 'from-green-400 to-emerald-500',
                emoji: '😊',
                desc: '恭喜你！你的情绪状态非常健康，没有抑郁倾向。',
                advice: '继续保持积极乐观的生活态度，多运动、多社交、保持良好的作息习惯。'
            };
        } else if (percentage <= 40) {
            return {
                level: '轻微情绪波动',
                color: 'from-yellow-400 to-orange-400',
                emoji: '🙂',
                desc: '你有一些轻微的情绪波动，这是正常的生活压力反应。',
                advice: '建议适当调整作息，增加运动和社交活动，培养一些兴趣爱好。如果持续感到困扰，可以与朋友倾诉。'
            };
        } else if (percentage <= 60) {
            return {
                level: '中度情绪困扰',
                color: 'from-orange-400 to-red-400',
                emoji: '😔',
                desc: '你可能正在经历一定程度的情绪困扰，需要关注自己的心理健康。',
                advice: '建议寻求家人朋友的支持，考虑咨询专业的心理咨询师。保持规律作息，适当运动，避免独处太久。'
            };
        } else if (percentage <= 80) {
            return {
                level: '明显抑郁倾向',
                color: 'from-red-400 to-red-600',
                emoji: '😢',
                desc: '你可能存在明显的抑郁倾向，建议尽快寻求专业帮助。',
                advice: '强烈建议尽快预约专业心理医生或精神科医生进行评估和治疗。请告诉身边的亲朋好友你的感受，不要独自承担。'
            };
        } else {
            return {
                level: '严重抑郁倾向',
                color: 'from-red-600 to-purple-700',
                emoji: '🆘',
                desc: '你的测试结果显示可能存在严重的抑郁倾向，请立即寻求专业帮助。',
                advice: '请立即联系心理危机干预热线（全国：400-161-9995）或前往医院精神科就诊。你不是一个人，专业帮助可以让你好起来。'
            };
        }
    };

    const progress = ((currentQuestion + 1) / DEPRESSION_QUESTIONS.length) * 100;
    const allAnswered = Object.keys(answers).length === DEPRESSION_QUESTIONS.length;

    if (showResult) {
        const result = getResultLevel(totalScore);
        const maxScore = DEPRESSION_QUESTIONS.length * 3;
        return (
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl">←</button>
                    <h2 className="text-xl font-bold">抑郁自测结果</h2>
                </div>

                <div className={`bg-gradient-to-br ${result.color} rounded-3xl p-6 text-white text-center`}>
                    <p className="text-6xl mb-3">{result.emoji}</p>
                    <h1 className="text-2xl font-bold mb-2">{result.level}</h1>
                    <p className="text-lg opacity-90">得分：{totalScore} / {maxScore}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">📊 测试解读</h3>
                        <p className="text-gray-600 text-sm">{result.desc}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">💡 建议</h3>
                        <p className="text-gray-600 text-sm">{result.advice}</p>
                    </div>
                </div>

                <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200">
                    <p className="text-sm text-pink-700">
                        ⚠️ 声明：本测试仅供参考，不能替代专业医学诊断。如有需要，请咨询专业心理医生。
                    </p>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 font-bold mb-1">🆘 心理援助热线</p>
                    <p className="text-sm text-blue-600">全国心理援助热线：400-161-9995</p>
                    <p className="text-sm text-blue-600">北京心理危机研究与干预中心：010-82951332</p>
                </div>

                <button onClick={onBack} className="w-full h-14 bg-blue-500 text-white rounded-2xl font-bold">
                    返回首页
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">抑郁自测</h2>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center">{currentQuestion + 1} / {DEPRESSION_QUESTIONS.length}</p>

            {/* 题目 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm min-h-[120px] flex items-center justify-center">
                <p className="text-lg text-center font-medium text-gray-800">
                    {DEPRESSION_QUESTIONS[currentQuestion].q}
                </p>
            </div>

            {/* 答案选项 */}
            <div className="flex flex-col gap-3">
                {[
                    { score: 0, label: '完全没有', color: 'bg-green-500' },
                    { score: 1, label: '偶尔有', color: 'bg-yellow-500' },
                    { score: 2, label: '经常有', color: 'bg-orange-500' },
                    { score: 3, label: '几乎每天', color: 'bg-red-500' },
                ].map(opt => (
                    <button
                        key={opt.score}
                        onClick={() => handleAnswer(opt.score)}
                        className={`w-full py-3 rounded-xl text-white font-bold transition-all ${opt.color} ${answers[currentQuestion] === opt.score ? 'ring-4 ring-offset-2 ring-blue-300' : ''}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* 导航按钮 */}
            <div className="flex gap-3">
                <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold disabled:opacity-50"
                >
                    上一题
                </button>
                {allAnswered ? (
                    <button
                        onClick={calculateResult}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold"
                    >
                        查看结果 📊
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.min(DEPRESSION_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentQuestion === DEPRESSION_QUESTIONS.length - 1}
                        className="flex-1 py-3 rounded-xl border-2 border-blue-500 text-blue-500 font-bold disabled:opacity-50"
                    >
                        下一题
                    </button>
                )}
            </div>
        </div>
    );
};

export default DepressionTestView;
