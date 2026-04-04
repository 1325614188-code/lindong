import React, { useState, useRef, useEffect } from 'react';
import {
    Camera,
    Upload,
    X,
    Loader2,
    CheckCircle2,
    ChevronLeft,
    Share2,
    ShieldCheck,
    Info,
    LayoutDashboard,
    Activity,
    Stethoscope
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeEyeImages, EyeDiagnosisResult } from '../services/eyeService';

interface EyeDiagnosisViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
}

// 拍摄场景定义
const SHOTS = [
    { id: 'center', label: '正视在前', desc: '拨开上下眼皮，眼睛向前看', icon: '👁️' },
    { id: 'up', label: '仰视向上', desc: '拨开下眼皮，眼睛往上看', icon: '⬆️' },
    { id: 'down', label: '俯视向下', desc: '拨开上眼皮，眼睛往下看', icon: '⬇️' },
    { id: 'left', label: '左视向左', desc: '拨开上下眼皮，眼睛往左看', icon: '⬅️' },
    { id: 'right', label: '右视向右', desc: '拨开上下眼皮，眼睛往右看', icon: '➡️' }
];

const EyeDiagnosisView: React.FC<EyeDiagnosisViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
    const [step, setStep] = useState<'landing' | 'upload' | 'analyzing' | 'result'>('landing');
    const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<EyeDiagnosisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentShotIndex, setCurrentShotIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 图片压缩工具函数
    const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } else {
                    resolve(base64Str);
                }
            };
            img.onerror = () => resolve(base64Str);
        });
    };

    // 自动滚动到顶部
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            // 压缩图片
            const compressed = await compressImage(base64);
            
            const newImages = [...images];
            newImages[currentShotIndex] = compressed;
            setImages(newImages);
            
            // 自动跳到下一个未上传的槽位
            const nextEmpty = newImages.findIndex((img, idx) => img === null && idx > currentShotIndex);
            if (nextEmpty !== -1) {
                setCurrentShotIndex(nextEmpty);
            }
        };
        reader.readAsDataURL(file);
    };

    const startAnalysis = async () => {
        if (images.some(img => img === null)) {
            setError("请完整上传5张照片");
            return;
        }

        const hasCredit = await onCheckCredits();
        if (!hasCredit) return;

        setStep('analyzing');
        setError(null);
        try {
            const analysisResult = await analyzeEyeImages(images as string[]);
            const deducted = await onDeductCredit();
            if (!deducted) {
                throw new Error("额度扣除失败，请重试");
            }
            setResult(analysisResult);
            setStep('result');
        } catch (err) {
            setError(err instanceof Error ? err.message : "分析失败");
            setStep('upload');
        }
    };

    // 落地页
    if (step === 'landing') {
        return (
            <div className="min-h-screen bg-[#1a1b3b] text-white flex flex-col relative overflow-hidden">
                {/* 装饰性背景 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.2),transparent_70%)]" />
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

                {/* 顶部栏 */}
                <div className="flex items-center p-4 z-10">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-8 z-10 text-center">
                    <div className="relative mb-8">
                        {/* 模拟眼睛扫描动画 */}
                        <div className="w-48 h-48 rounded-full border-2 border-purple-500/30 flex items-center justify-center relative">
                            <div className="w-40 h-40 rounded-full border border-blue-400/50 overflow-hidden relative group">
                                <img 
                                    src="https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                                    alt="Eye Scan Demo" 
                                    className="w-full h-full object-cover opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-scan" />
                            </div>
                            {/* 四角的边框修饰 */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-300 mb-4 tracking-wider">
                        AI 看眼
                    </h1>
                    <div className="bg-purple-900/40 backdrop-blur-sm border border-purple-500/30 px-6 py-2 rounded-full mb-8">
                        <p className="text-purple-100 text-sm font-medium">✨ 望眼知健康 ~</p>
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed mb-12">
                        基于中医“五轮学说”理论<br />
                        通过 5 个特定角度观察脏腑健康状态
                    </p>

                    <button 
                        onClick={() => setStep('upload')}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-bold text-lg shadow-lg shadow-purple-900/50 active:scale-95 transition-all mb-4"
                    >
                        立即检测
                    </button>
                    
                    <p className="text-[10px] text-gray-500 italic">
                        - 本程序结果仅供参考，不作为实际诊疗依据 -
                    </p>
                </div>

                <style>{`
                    @keyframes scan {
                        0% { transform: translateY(-100%); }
                        100% { transform: translateY(100%); }
                    }
                    .animate-scan {
                        animation: scan 3s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    // 上传页
    if (step === 'upload') {
        return (
            <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
                <div className="p-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b flex items-center justify-between">
                    <button onClick={() => setStep('landing')} className="text-gray-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="font-bold text-gray-800">上传照片</h2>
                    <div className="w-6" />
                </div>

                <main className="flex-1 p-6 space-y-6">
                    {/* 主要提示 */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-indigo-700 leading-relaxed">
                            <p className="font-bold mb-1 underline">拍摄环境要求：</p>
                            <p>· 光线充足，无遮挡，不要戴眼镜或隐形眼镜。</p>
                            <p>· 尽量由他人协助拍摄，确保对焦清晰。</p>
                        </div>
                    </div>

                    {/* 预览示例区 (简化的状态指示) */}
                    <div className="flex justify-between gap-2 px-2">
                        {SHOTS.map((s, idx) => (
                            <div 
                                key={s.id}
                                onClick={() => setCurrentShotIndex(idx)}
                                className={`flex-1 aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer overflow-hidden transition-all ${
                                    currentShotIndex === idx ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 bg-white'
                                }`}
                            >
                                {images[idx] ? (
                                    <img src={images[idx]!} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl">{s.icon}</span>
                                )}
                                {images[idx] && (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white p-0.5 rounded-bl-lg">
                                        <CheckCircle2 className="w-3 h-3" />
                                    </div>
                                )}
                                {currentShotIndex === idx && !images[idx] && (
                                    <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 当前选中的详细描述 */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                            <div 
                                className="h-full bg-purple-500 transition-all duration-300" 
                                style={{ width: `${(SHOTS.filter((_, i) => images[i] !== null).length / 5) * 100}%` }}
                            />
                        </div>

                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">{SHOTS[currentShotIndex].icon}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{SHOTS[currentShotIndex].label}</h3>
                        <p className="text-gray-500 text-sm mb-8">{SHOTS[currentShotIndex].desc}</p>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 active:bg-gray-100 transition-all overflow-hidden"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            {images[currentShotIndex] ? (
                                <img src={images[currentShotIndex]!} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera className="w-10 h-10 text-gray-300" />
                                    <p className="text-xs text-gray-400">点击拍照或上传</p>
                                </>
                            )}
                        </div>

                        {images[currentShotIndex] && (
                            <button 
                                onClick={() => {
                                    const next = images.findIndex((img, idx) => img === null);
                                    if (next !== -1) setCurrentShotIndex(next);
                                }}
                                className="mt-4 text-purple-600 font-bold text-sm"
                            >
                                切换下一个补拍
                            </button>
                        )}
                    </div>

                    <button 
                        disabled={images.some(img => img === null)}
                        onClick={startAnalysis}
                        className={`w-full py-5 rounded-2xl font-extrabold text-lg shadow-xl transition-all ${
                            images.every(img => img !== null) 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                        立即检测
                    </button>

                    {error && <p className="text-center text-red-500 text-xs">{error}</p>}
                    
                    <div className="text-center space-y-1 py-4">
                        <p className="text-[10px] text-gray-400">-- 我们将保障您个人隐私安全，不会保留拍摄照片 --</p>
                    </div>
                </main>
            </div>
        );
    }

    // 分析中
    if (step === 'analyzing') {
        return (
            <div className="min-h-screen bg-[#1a1b3b] text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-64 h-64 relative mb-12">
                    {/* 赛博扫描效果 */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/50 overflow-hidden">
                        <div className="grid grid-cols-5 gap-1 p-2 h-full">
                            {images.map((img, i) => (
                                <div key={i} className="bg-gray-800 rounded opacity-50 overflow-hidden">
                                    {img && <img src={img} className="w-full h-full object-cover" />}
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500 to-transparent animate-analyzing-scan" />
                    </div>
                    {/* 能量外圈 */}
                    <div className="absolute inset-[-10px] border border-blue-500/30 rounded-full animate-spin-slow" />
                </div>

                <div className="space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto" />
                    <h2 className="text-2xl font-bold tracking-tight">AI 智能望诊中</h2>
                    <p className="text-gray-400 text-sm">正在深度分析五轮特征，解读五脏六腑健康...</p>
                </div>

                <style>{`
                    @keyframes analyzing-scan {
                        0% { transform: translateY(-100%); }
                        50% { transform: translateY(100%); }
                        100% { transform: translateY(-100%); }
                    }
                    .animate-analyzing-scan {
                        animation: analyzing-scan 2s ease-in-out infinite;
                    }
                    .animate-spin-slow {
                        animation: spin 8s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    // 结果页
    if (step === 'result' && result) {
        return (
            <div className="min-h-screen bg-[#f0f2f9] flex flex-col pb-10">
                {/* 结果背景修饰 */}
                <div className="bg-[#5c4ae4] pt-12 pb-24 px-6 rounded-b-[48px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                    
                    <div className="flex items-center justify-between text-white/80 mb-8 relative z-10">
                        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <h2 className="font-bold">健康分析报告</h2>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                            <Share2 className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="text-center text-white relative z-10">
                        <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-widest">Health Score</p>
                        <div className="text-7xl font-black mb-2 flex items-baseline justify-center">
                            {result.healthScore}
                            <span className="text-xl ml-1 font-bold text-white/50">分</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                             <div className={`px-4 py-1 rounded-full text-xs font-bold ${result.healthScore >= 80 ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                状态：{result.healthScore >= 80 ? '良好' : result.healthScore >= 60 ? '一般' : '需预警'}
                             </div>
                        </div>
                    </div>
                </div>

                {/* 核心卡片 */}
                <div className="mt-[-80px] px-6 space-y-6 relative z-20">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mb-1">健康得分</p>
                            <p className="text-xs font-black text-gray-800">{result.healthScore}分</p>
                        </div>
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mb-2">
                                <Stethoscope className="w-4 h-4 text-rose-500" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mb-1">主要发现</p>
                            <p className="text-xs font-black text-gray-800 line-clamp-1">{result.mainFinding}</p>
                        </div>
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center mb-2">
                                <LayoutDashboard className="w-4 h-4 text-cyan-500" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mb-1">脏腑检测</p>
                            <p className="text-xs font-black text-gray-800">五脏六腑</p>
                        </div>
                    </div>

                    {/* 深度分析详情 */}
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                            <h3 className="font-bold text-gray-900">望眼辩证分析</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: '脾胃调理（肉轮）', content: result.detailedAnalysis.spleenStomach, icon: '🦷' },
                                { title: '心血机能（血轮）', content: result.detailedAnalysis.heart, icon: '❤️' },
                                { title: '肺气呼吸（气轮）', content: result.detailedAnalysis.lung, icon: '💨' },
                                { title: '肝胆疏泄（风轮）', content: result.detailedAnalysis.liver, icon: '🌱' },
                                { title: '肾精系统（水轮）', content: result.detailedAnalysis.kidney, icon: '💧' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                                        <h4 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">{item.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 小红书风格报告 */}
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 min-h-[300px]">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-5 bg-pink-500 rounded-full" />
                            <h3 className="font-bold text-gray-900">调理建议报告</h3>
                        </div>
                        <article className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{result.reportMarkdown}</ReactMarkdown>
                        </article>
                    </div>

                    {/* 免责声明 */}
                    <div className="bg-gray-100 rounded-2xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            本 AI 报告基于中医五轮学说理论生成，旨在提供一般性的健康参考，不能替代专业医师的面对面视诊与医疗建议。如您身体不适，请务必前往正规医疗机构就诊。
                        </p>
                    </div>

                    <button 
                        onClick={() => setStep('landing')}
                        className="w-full py-4 bg-gray-200 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default EyeDiagnosisView;
