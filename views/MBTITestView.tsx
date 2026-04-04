
import React, { useState } from 'react';

interface MBTITestViewProps {
    onBack: () => void;
    onCheckCredits?: () => Promise<boolean>;
    onDeductCredit?: () => Promise<boolean>;
}

// MBTI 80道测试题目
const MBTI_QUESTIONS = [
    // E vs I (外向 vs 内向) - 20题
    { q: '在社交聚会中，你通常感到精力充沛', dimension: 'EI', direction: 'E' },
    { q: '你喜欢成为众人瞩目的焦点', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢独处或与少数亲密朋友在一起', dimension: 'EI', direction: 'I' },
    { q: '你需要独处时间来恢复精力', dimension: 'EI', direction: 'I' },
    { q: '你喜欢主动认识新朋友', dimension: 'EI', direction: 'E' },
    { q: '你说话前会仔细思考', dimension: 'EI', direction: 'I' },
    { q: '你喜欢热闹的环境', dimension: 'EI', direction: 'E' },
    { q: '你更擅长倾听而非表达', dimension: 'EI', direction: 'I' },
    { q: '你在团队中经常发言', dimension: 'EI', direction: 'E' },
    { q: '你享受安静独处的时光', dimension: 'EI', direction: 'I' },
    { q: '你容易与陌生人攀谈', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢书面沟通而非口头交流', dimension: 'EI', direction: 'I' },
    { q: '你喜欢参加大型派对或活动', dimension: 'EI', direction: 'E' },
    { q: '你在人群中待久了会感到疲惫', dimension: 'EI', direction: 'I' },
    { q: '你善于活跃气氛', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢深入交流而非闲聊', dimension: 'EI', direction: 'I' },
    { q: '你会主动组织社交活动', dimension: 'EI', direction: 'E' },
    { q: '你觉得独自思考比讨论更有效', dimension: 'EI', direction: 'I' },
    { q: '你喜欢边说边想', dimension: 'EI', direction: 'E' },
    { q: '你倾向于先观察再行动', dimension: 'EI', direction: 'I' },
    // S vs N (感觉 vs 直觉) - 20题
    { q: '你更关注当下的实际情况', dimension: 'SN', direction: 'S' },
    { q: '你喜欢想象未来的可能性', dimension: 'SN', direction: 'N' },
    { q: '你注重细节和具体事实', dimension: 'SN', direction: 'S' },
    { q: '你容易看到事物的整体模式', dimension: 'SN', direction: 'N' },
    { q: '你更信任实际经验', dimension: 'SN', direction: 'S' },
    { q: '你喜欢探索新想法和理论', dimension: 'SN', direction: 'N' },
    { q: '你做事注重实用性', dimension: 'SN', direction: 'S' },
    { q: '你经常有突发的灵感', dimension: 'SN', direction: 'N' },
    { q: '你喜欢按既定方式做事', dimension: 'SN', direction: 'S' },
    { q: '你对抽象概念感兴趣', dimension: 'SN', direction: 'N' },
    { q: '你更相信看得见摸得着的东西', dimension: 'SN', direction: 'S' },
    { q: '你喜欢探索事物背后的深层含义', dimension: 'SN', direction: 'N' },
    { q: '你更擅长记住具体细节', dimension: 'SN', direction: 'S' },
    { q: '你常常展望遥远的未来', dimension: 'SN', direction: 'N' },
    { q: '你喜欢循序渐进地学习', dimension: 'SN', direction: 'S' },
    { q: '你喜欢思考"如果...会怎样"', dimension: 'SN', direction: 'N' },
    { q: '你注重事物的实际应用', dimension: 'SN', direction: 'S' },
    { q: '你容易发现事物之间的联系', dimension: 'SN', direction: 'N' },
    { q: '你更关心"是什么"而非"可能是什么"', dimension: 'SN', direction: 'S' },
    { q: '你喜欢隐喻和象征性的表达', dimension: 'SN', direction: 'N' },
    // T vs F (思考 vs 情感) - 20题
    { q: '做决定时你更依赖逻辑分析', dimension: 'TF', direction: 'T' },
    { q: '你很在意他人的感受', dimension: 'TF', direction: 'F' },
    { q: '你认为公平比和谐更重要', dimension: 'TF', direction: 'T' },
    { q: '你容易感受到他人的情绪', dimension: 'TF', direction: 'F' },
    { q: '你喜欢分析问题的利弊', dimension: 'TF', direction: 'T' },
    { q: '你更看重人际关系的和谐', dimension: 'TF', direction: 'F' },
    { q: '你能够客观地批评他人', dimension: 'TF', direction: 'T' },
    { q: '你经常赞美和鼓励他人', dimension: 'TF', direction: 'F' },
    { q: '你认为理性比感性更可靠', dimension: 'TF', direction: 'T' },
    { q: '你做决定时会考虑对他人的影响', dimension: 'TF', direction: 'F' },
    { q: '你更擅长解决技术问题', dimension: 'TF', direction: 'T' },
    { q: '你善于调解人际冲突', dimension: 'TF', direction: 'F' },
    { q: '你认为规则比例外更重要', dimension: 'TF', direction: 'T' },
    { q: '你在做决定时会考虑个人价值观', dimension: 'TF', direction: 'F' },
    { q: '你喜欢找出争论中的逻辑漏洞', dimension: 'TF', direction: 'T' },
    { q: '你容易对他人产生同情心', dimension: 'TF', direction: 'F' },
    { q: '你认为事实比感受更重要', dimension: 'TF', direction: 'T' },
    { q: '你更关心他人的需要', dimension: 'TF', direction: 'F' },
    { q: '你在批评时直言不讳', dimension: 'TF', direction: 'T' },
    { q: '你很难拒绝别人的请求', dimension: 'TF', direction: 'F' },
    // J vs P (判断 vs 感知) - 20题
    { q: '你喜欢按计划行事', dimension: 'JP', direction: 'J' },
    { q: '你喜欢保持选择的开放性', dimension: 'JP', direction: 'P' },
    { q: '你做事有条理有系统', dimension: 'JP', direction: 'J' },
    { q: '你享受临时起意的活动', dimension: 'JP', direction: 'P' },
    { q: '你喜欢事先做好规划', dimension: 'JP', direction: 'J' },
    { q: '你能很好地适应变化', dimension: 'JP', direction: 'P' },
    { q: '你喜欢尽早完成任务', dimension: 'JP', direction: 'J' },
    { q: '你经常在截止日期前才完成工作', dimension: 'JP', direction: 'P' },
    { q: '你的生活作息很规律', dimension: 'JP', direction: 'J' },
    { q: '你喜欢随心所欲地生活', dimension: 'JP', direction: 'P' },
    { q: '你会提前安排日程', dimension: 'JP', direction: 'J' },
    { q: '你更喜欢灵活应变', dimension: 'JP', direction: 'P' },
    { q: '完成任务给你带来满足感', dimension: 'JP', direction: 'J' },
    { q: '你喜欢同时进行多项任务', dimension: 'JP', direction: 'P' },
    { q: '你的物品摆放整齐有序', dimension: 'JP', direction: 'J' },
    { q: '你觉得规则可以灵活变通', dimension: 'JP', direction: 'P' },
    { q: '你喜欢有明确的目标', dimension: 'JP', direction: 'J' },
    { q: '你享受探索过程中的不确定性', dimension: 'JP', direction: 'P' },
    { q: '你常常列清单来管理任务', dimension: 'JP', direction: 'J' },
    { q: '你更喜欢顺其自然', dimension: 'JP', direction: 'P' },
];

// MBTI 类型描述
const MBTI_DESCRIPTIONS: Record<string, { title: string; traits: string; careers: string; industries: string; earning: string }> = {
    'INTJ': { title: '建筑师', traits: '独立、战略性思维、高标准', careers: '科学家、战略顾问、系统架构师、投资分析师', industries: '科技、金融、咨询、研究', earning: '💰💰💰💰💰 极强的赚钱潜力，善于规划长期财富' },
    'INTP': { title: '逻辑学家', traits: '分析能力强、创新、独立思考', careers: '程序员、数据科学家、研究员、哲学家', industries: '科技、学术、研发、游戏开发', earning: '💰💰💰💰 技术型人才收入可观' },
    'ENTJ': { title: '指挥官', traits: '领导力强、果断、高效', careers: 'CEO、企业家、律师、项目经理', industries: '商业、管理、法律、金融', earning: '💰💰💰💰💰 天生的商业领袖，赚钱能力顶级' },
    'ENTP': { title: '辩论家', traits: '创新、口才好、思维敏捷', careers: '创业者、营销专家、产品经理、律师', industries: '创业、广告、媒体、科技', earning: '💰💰💰💰 善于发现商机，但需坚持执行' },
    'INFJ': { title: '提倡者', traits: '有远见、富有同情心、理想主义', careers: '心理咨询师、作家、教育家、人力资源', industries: '教育、心理健康、非营利组织、艺术', earning: '💰💰💰 重视意义大于金钱，但能在专业领域获得认可' },
    'INFP': { title: '调停者', traits: '理想主义、创造力、同理心强', careers: '作家、艺术家、心理咨询师、设计师', industries: '创意产业、心理咨询、教育、社会服务', earning: '💰💰💰 追求热爱的事业，财富随之而来' },
    'ENFJ': { title: '主人公', traits: '有魅力、善于激励他人、责任感强', careers: '培训师、教师、人力资源、政治家', industries: '教育、培训、公关、管理', earning: '💰💰💰💰 出色的领导力带来晋升机会' },
    'ENFP': { title: '竞选者', traits: '热情、创造力、善于交际', careers: '创意总监、记者、公关专家、演员', industries: '媒体、娱乐、广告、创业', earning: '💰💰💰 创意和人脉是最大资产' },
    'ISTJ': { title: '物流师', traits: '可靠、有条理、注重细节', careers: '会计师、审计员、项目经理、行政管理', industries: '金融、政府、制造业、物流', earning: '💰💰💰💰 稳扎稳打，财务规划能力强' },
    'ISFJ': { title: '守卫者', traits: '忠诚、细心、乐于助人', careers: '护士、教师、行政助理、客服经理', industries: '医疗、教育、社会服务、零售', earning: '💰💰💰 稳定的职业发展路径' },
    'ESTJ': { title: '总经理', traits: '组织力强、务实、领导力', careers: '经理、军官、法官、财务总监', industries: '管理、法律、金融、政府', earning: '💰💰💰💰 管理岗位薪资可观' },
    'ESFJ': { title: '执政官', traits: '热心、善于社交、有责任心', careers: '销售经理、活动策划、人力资源、医生', industries: '销售、医疗、教育、酒店服务', earning: '💰💰💰 人际关系网络带来机遇' },
    'ISTP': { title: '鉴赏家', traits: '灵活、善于解决问题、实践能力强', careers: '工程师、飞行员、机械师、法医', industries: '工程、航空、技术维修、调查', earning: '💰💰💰💰 技术专业人才稀缺' },
    'ISFP': { title: '探险家', traits: '艺术感、温和、活在当下', careers: '艺术家、设计师、摄影师、造型师', industries: '艺术、设计、时尚、美容', earning: '💰💰💰 创意作品可创造独特价值' },
    'ESTP': { title: '企业家', traits: '精力充沛、行动派、善于应变', careers: '销售、运动员、消防员、企业家', industries: '销售、体育、娱乐、创业', earning: '💰💰💰💰 敢于冒险可获高回报' },
    'ESFP': { title: '表演者', traits: '热情、风趣、享受生活', careers: '演员、主持人、销售、活动策划', industries: '娱乐、销售、餐饮、旅游', earning: '💰💰💰 魅力是最大的资本' },
};

const MBTITestView: React.FC<MBTITestViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [result, setResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentQuestion]: score }));
        if (currentQuestion < MBTI_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const calculateResult = async () => {
        // 计算各维度得分
        const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

        MBTI_QUESTIONS.forEach((q, idx) => {
            const answer = answers[idx] || 3;
            const weight = answer - 3; // -2 到 +2
            if (q.direction === 'E' || q.direction === 'S' || q.direction === 'T' || q.direction === 'J') {
                scores[q.direction as keyof typeof scores] += weight;
            } else {
                scores[q.direction as keyof typeof scores] += weight;
            }
        });

        // 确定类型
        const type =
            (scores.E > scores.I ? 'E' : 'I') +
            (scores.S > scores.N ? 'S' : 'N') +
            (scores.T > scores.F ? 'T' : 'F') +
            (scores.J > scores.P ? 'J' : 'P');

        setResult(type);
        setShowResult(true);
    };

    const progress = ((currentQuestion + 1) / MBTI_QUESTIONS.length) * 100;
    const allAnswered = Object.keys(answers).length === MBTI_QUESTIONS.length;

    if (showResult && result) {
        const desc = MBTI_DESCRIPTIONS[result] || MBTI_DESCRIPTIONS['INTJ'];
        return (
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl">←</button>
                    <h2 className="text-xl font-bold">天赋测试结果</h2>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white text-center">
                    <p className="text-sm opacity-80 mb-2">你的MBTI类型是</p>
                    <h1 className="text-5xl font-bold mb-2">{result}</h1>
                    <p className="text-2xl">{desc.title}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">🧠 性格特点</h3>
                        <p className="text-gray-600 text-sm">{desc.traits}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">💼 适合职业</h3>
                        <p className="text-gray-600 text-sm">{desc.careers}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">🏢 推荐行业</h3>
                        <p className="text-gray-600 text-sm">{desc.industries}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">💰 赚钱能力</h3>
                        <p className="text-gray-600 text-sm">{desc.earning}</p>
                    </div>
                </div>

                <button onClick={onBack} className="w-full h-14 bg-purple-500 text-white rounded-2xl font-bold">
                    返回首页
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">天赋测试</h2>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center">{currentQuestion + 1} / {MBTI_QUESTIONS.length}</p>

            {/* 题目 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm min-h-[120px] flex items-center justify-center">
                <p className="text-lg text-center font-medium text-gray-800">
                    {MBTI_QUESTIONS[currentQuestion].q}
                </p>
            </div>

            {/* 答案选项 */}
            <div className="flex flex-col gap-3">
                {[
                    { score: 5, label: '非常同意', color: 'bg-purple-500' },
                    { score: 4, label: '比较同意', color: 'bg-purple-400' },
                    { score: 3, label: '一般', color: 'bg-gray-400' },
                    { score: 2, label: '比较不同意', color: 'bg-pink-400' },
                    { score: 1, label: '非常不同意', color: 'bg-pink-500' },
                ].map(opt => (
                    <button
                        key={opt.score}
                        onClick={() => handleAnswer(opt.score)}
                        className={`w-full py-3 rounded-xl text-white font-bold transition-all ${opt.color} ${answers[currentQuestion] === opt.score ? 'ring-4 ring-offset-2 ring-purple-300' : ''}`}
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
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold"
                    >
                        查看结果 ✨
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.min(MBTI_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentQuestion === MBTI_QUESTIONS.length - 1}
                        className="flex-1 py-3 rounded-xl border-2 border-purple-500 text-purple-500 font-bold disabled:opacity-50"
                    >
                        下一题
                    </button>
                )}
            </div>
        </div>
    );
};

export default MBTITestView;
