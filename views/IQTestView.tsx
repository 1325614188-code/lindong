
import React, { useState, useEffect, useCallback } from 'react';

interface IQTestViewProps {
    onBack: () => void;
    onCheckCredits?: () => Promise<boolean>;
    onDeductCredit?: () => Promise<boolean>;
}

// 60道智力测试题目 (模拟瑞文 SPM 结构)
const IQ_QUESTIONS = [
    // A组: 视觉辨别 (1-12)
    { q: '找出规律：1, 3, 5, 7, ?', options: ['8', '9', '10', '11'], answer: 1, type: '基础规律' },
    { q: '找出不属于同一类的一项：', options: ['苹果', '香蕉', '西红柿', '葡萄'], answer: 2, type: '分类逻辑' },
    { q: '图形推理：圆 -> 球，正方形 -> ?', options: ['长方形', '正方体', '三角形', '圆柱体'], answer: 1, type: '类比推理' },
    { q: '字母序列：A, D, G, J, ?', options: ['K', 'L', 'M', 'N'], answer: 2, type: '字母序列' },
    { q: '找出规律：100, 90, 81, 73, ?', options: ['66', '65', '64', '63'], answer: 0, type: '递减规律' },
    { q: '左、上、右、? (顺时针旋转)', options: ['下', '左', '上', '后'], answer: 0, type: '空间旋转' },
    { q: '老师之于学生，医生之于 ?', options: ['护士', '病人', '药物', '医院'], answer: 1, type: '类比逻辑' },
    { q: '计算：(15 + 25) / 2 = ?', options: ['15', '20', '25', '30'], answer: 1, type: '基础数学' },
    { q: '由 A, B, C 组成的字符串，下一个是：ABC, BCA, CAB, ?', options: ['ABC', 'BCA', 'CAB', 'CBA'], answer: 0, type: '循环规律' },
    { q: '找出不同的数字：', options: ['2', '4', '6', '7'], answer: 3, type: '奇偶辨识' },
    { q: '如果所有A是B，所有B是C，那么所有A是 ?', options: ['A', 'B', 'C', '不确定'], answer: 2, type: '三段论' },
    { q: '找出镜像："MOM" 的镜像依然是 "MOM"，"WOW" 呢？', options: ['WOW', 'MOM', 'NON', 'W0W'], answer: 0, type: '对称逻辑' },

    // B组: 类推关系 (13-24)
    { q: '数字矩阵：[2, 4], [3, 9], [4, ?]', options: ['12', '14', '16', '20'], answer: 2, type: '平方规律' },
    { q: '寒冷之于冰雪，炎热之于 ?', options: ['太阳', '汗水', '夏天', '凉爽'], answer: 1, type: '因果关联' },
    { q: '找出规律：1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '15'], answer: 2, type: '斐波那契' },
    { q: '方向类比：北对南，左对 ?', options: ['上', '下', '右', '后'], answer: 2, type: '方位类比' },
    { q: '下列哪个数字填入括号最合适：3, 6, 12, ( ), 48', options: ['18', '24', '30', '36'], answer: 1, type: '等比数列' },
    { q: '手之于指，脚之于 ?', options: ['袜', '指', '趾', '鞋'], answer: 2, type: '肢体类比' },
    { q: '如果 1=5, 2=25, 3=125, 4=625, 那么 5=? ', options: ['3125', '2500', '1', '525'], answer: 2, type: '逻辑陷阱' },
    { q: '找出规律：A1, B2, C3, ?', options: ['D3', 'D4', 'E5', 'C4'], answer: 1, type: '组合规律' },
    { q: '白、灰、黑 属于：', options: ['彩色', '无彩色', '暖色', '冷色'], answer: 1, type: '色彩常识' },
    { q: '12 / 0.5 = ?', options: ['6', '12', '24', '48'], answer: 2, type: '除法逻辑' },
    { q: '找出不同类的一项：', options: ['水瓶', '书包', '电脑', '桌子'], answer: 2, type: '物品属性' },
    { q: '如果明天是星期一，那么昨天是星期 ?', options: ['六', '日', '五', '四'], answer: 0, type: '时间推理' },

    // C组: 比较与变化 (25-36)
    { q: '找出规律：8, 4, 2, 1, ?', options: ['0', '0.5', '-1', '0.25'], answer: 1, type: '等比缩减' },
    { q: '如果 "READ" 对应 "DAER"，那么 "BOOK" 对应 ?', options: ['KOOB', 'BOOO', 'KOKO', 'DOOK'], answer: 0, type: '反写逻辑' },
    { q: '下列哪个图形不属于此处？(想像)', options: ['正方形', '菱形', '长方形', '圆形'], answer: 3, type: '几何连贯性' },
    { q: '找出规律：1, 4, 9, 16, 25, ?', options: ['30', '36', '42', '49'], answer: 1, type: '平方数' },
    { q: '如果 5 个人 5 天能做 5 个玩具，那么 100 个人做 100 个玩具需要几天？', options: ['1', '5', '100', '20'], answer: 1, type: '速算陷阱' },
    { q: '时钟在 3:15 时，分针和时针的角度是：', options: ['0度', '大于0度', '90度', '180度'], answer: 1, type: '空间逻辑' },
    { q: '找出规律：2, 3, 5, 7, 11, ?', options: ['12', '13', '15', '17'], answer: 1, type: '质数序列' },
    { q: '如果 A > B 且 B > C，那么 A ? C', options: ['>', '<', '=', '不确定'], answer: 0, type: '比较传递' },
    { q: '找出缺失项：红, 橙, ?, 绿, 青, 蓝, 紫', options: ['粉', '白', '黄', '黑'], answer: 2, type: '光谱常识' },
    { q: '如果今天是 12 月 31 日，那么 2 天后是：', options: ['1月1日', '1月2日', '1月3日', '2月1日'], answer: 1, type: '历法推理' },
    { q: '找出规律：O, T, T, F, F, S, S, E, N, ?', options: ['T', 'S', 'O', 'E'], answer: 0, type: '首字母(1-10)' },
    { q: '如果 3 个猫 3 分钟抓 3 个老鼠，10 个猫抓 10 个老鼠要几分钟？', options: ['3', '10', '30', '1'], answer: 0, type: '效率逻辑' },

    // D组: 排列与组合 (37-48)
    { q: '计算：2 + 2 * 2 = ?', options: ['4', '6', '8', '2'], answer: 1, type: '运算优先级' },
    { q: '找出规律：Z, Y, X, W, ?', options: ['V', 'U', 'T', 'S'], answer: 0, type: '倒序字母' },
    { q: '一支铅笔有几面？(普通六棱柱型)', options: ['2', '6', '7', '8'], answer: 3, type: '空间观察' },
    { q: '下列哪个词最独特：', options: ['耳朵', '鼻子', '眼睛', '嘴巴'], answer: 1, type: '器官逻辑' },
    { q: '找出规律：1, 3, 6, 10, 15, ?', options: ['20', '21', '22', '25'], answer: 1, type: '增量规律' },
    { q: '如果 A=1, B=2, AB=12, 那么 BA=? ', options: ['21', '3', '12', 'B1'], answer: 0, type: '符号编码' },
    { q: '小王比小张高，小李比小王高，谁最矮？', options: ['小王', '小张', '小李', '一样'], answer: 1, type: '比较推理' },
    { q: '一个正方体有几个顶点？', options: ['4', '6', '8', '12'], answer: 2, type: '立体几何' },
    { q: '找出规律：121, 232, 343, 454, ?', options: ['565', '545', '676', '555'], answer: 0, type: '数字对称' },
    { q: '下列数字中哪个最接近 π 的值？', options: ['3', '3.14', '3.14159', '22/7'], answer: 2, type: '常识数值' },
    { q: '如果 6 个人在 10 小时内挖出 2 个坑，3 个人在 5 小时内挖出几个坑？', options: ['0.5', '1', '2', '4'], answer: 0, type: '比例缩放' },
    { q: '找出不同类：', options: ['氧气', '二氧化碳', '氮气', '黄金'], answer: 3, type: '元素属性' },

    // E组: 抽象推理与演绎 (49-60)
    { q: '找出规律：1, 2, 6, 24, 120, ?', options: ['600', '720', '840', '1000'], answer: 1, type: '阶乘序列' },
    { q: '如果 A x B = 12, A + B = 7, 则 A, B 是？', options: ['2,6', '3,4', '5,2', '1,12'], answer: 1, type: '方程逻辑' },
    { q: '下列哪一项能让立方体折叠完整？(想像)', options: ['6面正方形', '5面正方形+1圆', '4面', '7面'], answer: 0, type: '展开图' },
    { q: '找出规律：1, 2, 4, 7, 11, ?', options: ['15', '16', '17', '18'], answer: 1, type: '阶差增量' },
    { q: '如果所有的马都有腿，所有的狗也有腿，那么马是狗吗？', options: ['是', '不是', '不一定', '逻辑错误'], answer: 2, type: '逻辑误区' },
    { q: '找出数字间的联系：(2, 5, 10), (3, 10, 31), (4, 17, ?)', options: ['65', '68', '50', '60'], answer: 1, type: '变阶规律' },
    { q: '在 1 到 100 之间，数字 9 出现了几次？', options: ['10', '11', '19', '20'], answer: 3, type: '统计逻辑' },
    { q: '找出规律：1/2, 2/3, 3/4, 4/5, ?', options: ['1', '5/6', '6/5', '5/5'], answer: 1, type: '分数规律' },
    { q: '如果 X 是 Y 的母亲，Y 是 Z 的父亲，那么 X 与 Z 的关系是？', options: ['母子', '祖孙', '父女', '兄弟'], answer: 1, type: '血缘推理' },
    { q: '找出不同的一项：', options: ['直线', '曲线', '射线', '线段'], answer: 1, type: '几何分类' },
    { q: '大之于小，如同强之于 ?', options: ['更强', '超强', '弱', '壮'], answer: 2, type: '反义类推' },
    { q: '如果 0+0=0, 1+1=2, 2+2=4... 11+11=?', options: ['22', '121', '4', '1111'], answer: 0, type: '返璞归真' },
];

const IQTestView: React.FC<IQTestViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [timeLeft, setTimeLeft] = useState(2400); // 40分钟 = 2400秒
    const [isCounting, setIsCounting] = useState(false);

    // 加载进度
    useEffect(() => {
        const saved = localStorage.getItem('iq_test_progress');
        if (saved) {
            const { idx, ans, time } = JSON.parse(saved);
            setCurrentIdx(idx);
            setAnswers(ans);
            setTimeLeft(time);
        }
        setIsCounting(true);
    }, []);

    // 保存进度
    useEffect(() => {
        if (isCounting) {
            localStorage.setItem('iq_test_progress', JSON.stringify({
                idx: currentIdx,
                ans: answers,
                time: timeLeft
            }));
        }
    }, [currentIdx, answers, timeLeft, isCounting]);

    // 计时器逻辑
    useEffect(() => {
        let timer: any;
        if (isCounting && timeLeft > 0 && !showResult) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && !showResult) {
            // 时间到自动交卷
            handleFinish();
        }
        return () => clearInterval(timer);
    }, [isCounting, timeLeft, showResult]);

    const handleAnswer = (optIdx: number) => {
        setAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
        if (currentIdx < IQ_QUESTIONS.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }
    };

    const handleFinish = async () => {
        setIsCounting(false);
        // 清理进度
        localStorage.removeItem('iq_test_progress');
        setShowResult(true);
    };

    const getIQReport = () => {
        let correctCount = 0;
        IQ_QUESTIONS.forEach((q, i) => {
            if (answers[i] === q.answer) correctCount++;
        });

        // 标化分计算 (简化模型: 70基准 + 答对题数占比 * 90)
        const iqScore = Math.round(70 + (correctCount / IQ_QUESTIONS.length) * 90);
        
        let level = '中等智力';
        let desc = '你的思维能力处于大众平均水平。';
        let color = 'from-blue-400 to-sky-500';

        if (iqScore >= 140) {
            level = '天才级别 (Genius)';
            desc = '你的智力表现极为显著，具备极强的逻辑构架和抽象思维能力，属于全球顶尖 1% 范畴。';
            color = 'from-purple-600 to-indigo-600';
        } else if (iqScore >= 120) {
            level = '优秀 (Superior)';
            desc = '你具备出色的思维敏捷度和逻辑整合能力，解决复杂问题的效率远高于常人。';
            color = 'from-indigo-400 to-blue-500';
        } else if (iqScore >= 110) {
            level = '中上 (High Average)';
            desc = '你能够较好地处理逻辑关系，认知能力稳健且具备较强的学习潜能。';
            color = 'from-blue-500 to-cyan-500';
        } else if (iqScore < 90) {
            level = '仍有潜力 (Potential)';
            desc = '可能由于测试时的状态或偏好，你的表现略低于平均，建议多进行逻辑思维训练。';
            color = 'from-gray-400 to-slate-500';
        }

        return { correctCount, iqScore, level, desc, color };
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = ((Object.keys(answers).length / IQ_QUESTIONS.length) * 100);
    const report = showResult ? getIQReport() : null;

    if (showResult && report) {
        return (
            <div className="p-6 flex flex-col gap-6 bg-slate-50 min-h-screen">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl p-2 bg-white rounded-full">←</button>
                    <h2 className="text-xl font-bold">IQ 智力测评报告</h2>
                </div>

                <div className={`bg-gradient-to-br ${report.color} rounded-[40px] p-8 text-white text-center shadow-lg`}>
                    <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Standard IQ Score</p>
                    <h1 className="text-7xl font-black mb-3">{report.iqScore}</h1>
                    <p className="text-xl font-bold bg-white/20 inline-block px-6 py-1 rounded-full">{report.level}</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm space-y-6">
                    <section>
                        <h3 className="text-slate-800 font-black mb-2 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 测评解读
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{report.desc}</p>
                    </section>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">正确题数</p>
                            <p className="text-2xl font-black text-blue-600">{report.correctCount} / 60</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">完成时间</p>
                            <p className="text-2xl font-black text-blue-600">{formatTime(2400 - timeLeft)}</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p className="text-[10px] text-amber-600 font-bold mb-1">💡 专家建议</p>
                        <p className="text-xs text-amber-700 leading-relaxed italic">
                            智力并非固定不变，通过深度的逻辑练习、跨领域学习和保持好奇心，认知边界仍可不断拓宽。
                        </p>
                    </div>
                </div>

                <button onClick={onBack} className="w-full h-16 bg-slate-800 text-white rounded-[24px] font-black shadow-lg active:scale-95 transition-all">
                    返回实验室
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-2xl p-2 -ml-2">←</button>
                <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Time:</span>
                    <span className={`text-[15px] font-black ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Question</p>
                        <h3 className="text-2xl font-black text-slate-800">{currentIdx + 1} <span className="text-xs text-gray-300">/ 60</span></h3>
                    </div>
                    <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase">Progress</p>
                         <p className="text-xs font-bold text-slate-500">{Math.round(progress)}%</p>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Question Area */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/50 min-h-[200px] flex flex-col items-center justify-center text-center relative">
                 <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-[10px] lowercase font-bold text-slate-400 italic">type: {IQ_QUESTIONS[currentIdx].type}</span>
                 </div>
                 <p className="text-[20px] font-bold text-slate-800 leading-relaxed mt-4">
                    {IQ_QUESTIONS[currentIdx].q}
                </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
                {IQ_QUESTIONS[currentIdx].options.map((opt, oIdx) => (
                    <button
                        key={oIdx}
                        onClick={() => handleAnswer(oIdx)}
                        className={`py-5 px-4 rounded-3xl font-bold transition-all border-2 flex items-center justify-center text-center leading-tight
                            ${answers[currentIdx] === oIdx 
                                ? 'bg-blue-500 text-white border-blue-400 shadow-lg scale-[1.05]' 
                                : 'bg-white text-slate-600 border-transparent active:scale-95'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mt-auto pb-6">
                <button
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 text-slate-400 font-black disabled:opacity-30 active:scale-95 transition-all text-sm"
                >
                    Prev
                </button>
                {Object.keys(answers).length === 60 ? (
                    <button
                        onClick={handleFinish}
                        className="flex-[2] py-4 rounded-2xl bg-slate-800 text-white font-black shadow-lg shadow-slate-300 animate-bounce active:scale-95 transition-all text-center"
                    >
                        Submit Results
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIdx(prev => Math.min(IQ_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentIdx === IQ_QUESTIONS.length - 1}
                        className="flex-1 py-4 rounded-2xl bg-blue-100 text-blue-600 font-black disabled:opacity-30 active:scale-95 transition-all text-sm"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

export default IQTestView;
