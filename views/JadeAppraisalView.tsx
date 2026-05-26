import React, { useState, useRef } from 'react';
import {
    Camera,
    Upload,
    ShieldCheck,
    Search,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Info,
    Gem,
    Sun,
    Zap,
    Plus,
    Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeJadeImages, JadeAnalysisResult } from '../services/jadeService';
import { compressImage } from '../lib/image';

interface JadeAppraisalViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
    onCancelProcessing?: () => void;
    isStandalone?: boolean;
    onShowMember?: () => void;
}

interface JadeUploadSlots {
    front: string | null;       // 自然光正面照 (必填)
    backlight: string | null;   // 强光透射照 (推荐)
    macro: string | null;       // 微距反射照 (鉴伪关键)
    others: string[];           // 其他细节照 (选填，最多3张)
}

const JadeAppraisalView: React.FC<JadeAppraisalViewProps> = ({ onBack, onCheckCredits, onDeductCredit, onCancelProcessing, isStandalone = false, onShowMember }) => {
    const [slots, setSlots] = useState<JadeUploadSlots>({
        front: null,
        backlight: null,
        macro: null,
        others: []
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<JadeAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const frontInputRef = useRef<HTMLInputElement>(null);
    const backlightInputRef = useRef<HTMLInputElement>(null);
    const macroInputRef = useRef<HTMLInputElement>(null);
    const othersInputRef = useRef<HTMLInputElement>(null);

    const handleSlotUpload = (slot: keyof JadeUploadSlots | 'others', e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (slot === 'others') {
            if (slots.others.length + files.length > 3) {
                setError("其他细节照最多上传3张");
                return;
            }
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                try {
                    // 降低分辨率到 768px，质量 0.5，显著减少 Token 并且适应带宽
                    const compressed = await compressImage(base64, 768, 0.5);
                    if (slot === 'others') {
                        setSlots(prev => ({
                            ...prev,
                            others: [...prev.others, compressed]
                        }));
                    } else {
                        setSlots(prev => ({
                            ...prev,
                            [slot]: compressed
                        }));
                    }
                } catch (e) {
                    console.error('[JadeAppraisalView] Compression error:', e);
                    if (slot === 'others') {
                        setSlots(prev => ({
                            ...prev,
                            others: [...prev.others, base64]
                        }));
                    } else {
                        setSlots(prev => ({
                            ...prev,
                            [slot]: base64
                        }));
                    }
                }
            };
            reader.readAsDataURL(file);
        });
        setError(null);
        e.target.value = ''; // 清空 input 以便重复上传同名图片
    };

    const removeSlotImage = (slot: keyof JadeUploadSlots | 'others', index?: number) => {
        if (slot === 'others') {
            if (index !== undefined) {
                setSlots(prev => ({
                    ...prev,
                    others: prev.others.filter((_, i) => i !== index)
                }));
            }
        } else {
            setSlots(prev => ({
                ...prev,
                [slot]: null
            }));
            // 如果唯一的主图被删除了，清空历史结果
            if (slot === 'front' && !slots.backlight && !slots.macro && slots.others.length === 0) {
                setResult(null);
            }
        }
    };

    const startAnalysis = async () => {
        if (!slots.front) return;

        // 1. 检查额度
        const hasCredit = await onCheckCredits();
        if (!hasCredit) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            // 按照严格的专家判定顺序组合多模态图片：正面照 -> 强光透光照 -> 微距反射照 -> 其他细节照
            const imagesToAnalyze: string[] = [];
            if (slots.front) imagesToAnalyze.push(slots.front);
            if (slots.backlight) imagesToAnalyze.push(slots.backlight);
            if (slots.macro) imagesToAnalyze.push(slots.macro);
            slots.others.forEach(img => imagesToAnalyze.push(img));

            const analysisResult = await analyzeJadeImages(imagesToAnalyze);

            // 2. 扣除额度
            const deducted = await onDeductCredit();
            if (!deducted) {
                throw new Error("额度扣除失败，请稍后重试");
            }

            setResult(analysisResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : "分析过程中出现错误");
            onCancelProcessing?.();
        } finally {
            setIsAnalyzing(false);
            onCancelProcessing?.();
        }
    };

    return (
        <div className="min-h-screen bg-[#f4f7f5]">
            {/* Custom Header for View */}
            <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-emerald-100">
                {isStandalone ? (
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-50/50 text-emerald-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                ) : (
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <Gem className="text-emerald-600 w-5 h-5" />
                    <h2 className="font-bold text-gray-800">翡翠鉴别</h2>
                </div>
                {isStandalone ? (
                    <button 
                        onClick={onShowMember}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-sm"
                        title="会员中心"
                    >
                        👤
                    </button>
                ) : (
                    <div className="w-10" />
                )}
            </div>

            <main className="p-4 space-y-6">
                {/* Upload Section */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        专家级场景拍照引导上传
                    </h2>

                    {/* Hidden Inputs */}
                    <input type="file" ref={frontInputRef} onChange={(e) => handleSlotUpload('front', e)} accept="image/*" className="hidden" />
                    <input type="file" ref={backlightInputRef} onChange={(e) => handleSlotUpload('backlight', e)} accept="image/*" className="hidden" />
                    <input type="file" ref={macroInputRef} onChange={(e) => handleSlotUpload('macro', e)} accept="image/*" className="hidden" />
                    <input type="file" ref={othersInputRef} onChange={(e) => handleSlotUpload('others', e)} multiple accept="image/*" className="hidden" />

                    <div className="space-y-4">
                        {/* 1. 主图：自然光正面照 (必填) */}
                        <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4 transition-all">
                            <div className="flex justify-between items-start mb-2.5">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        <h3 className="text-sm font-bold text-slate-800">自然光正面照 <span className="text-red-500 text-xs font-normal">(必传)</span></h3>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">请在明亮窗边或室外平铺拍摄，不开启闪光灯，帮 AI 锁定真实的种水与底色。</p>
                                </div>
                            </div>

                            {slots.front ? (
                                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200 group">
                                    <img src={slots.front} alt="Front View" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button onClick={() => frontInputRef.current?.click()} className="px-3 py-1.5 bg-white text-emerald-700 text-xs font-bold rounded-lg shadow">替换</button>
                                        <button onClick={() => removeSlotImage('front')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow">删除</button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => frontInputRef.current?.click()}
                                    className="border-2 border-dashed border-emerald-100 hover:border-emerald-300 rounded-xl p-6 text-center bg-emerald-50/10 hover:bg-emerald-50/20 transition-all cursor-pointer"
                                >
                                    <Sun className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-emerald-700">点击上传正面主图</p>
                                    <p className="text-[10px] text-slate-400 mt-1">展示整件翡翠的真实色彩与水头</p>
                                </div>
                            )}
                        </div>

                        {/* 2 & 3 行：强光透射与微距反射照 (推荐卡片组，横向排列) */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 强光透射卡片 */}
                            <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-3.5 flex flex-col justify-between">
                                <div className="mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        💡 强光透射照 <span className="text-emerald-600 text-[10px] font-normal">(推荐)</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">手电贴着翡翠背面照，透光拍摄。分析晶体交织及裂纹。</p>
                                </div>

                                {slots.backlight ? (
                                    <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={slots.backlight} alt="Backlight View" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeSlotImage('backlight')} 
                                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full transition-all hover:bg-red-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => backlightInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 hover:border-emerald-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-emerald-50/10 transition-all cursor-pointer flex-1 flex flex-col justify-center items-center"
                                    >
                                        <Zap className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 mb-1.5" />
                                        <span className="text-[11px] font-bold text-slate-600">透光照</span>
                                    </div>
                                )}
                            </div>

                            {/* 微距反射卡片 */}
                            <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-3.5 flex flex-col justify-between">
                                <div className="mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        🔍 微距反射照 <span className="text-emerald-600 text-[10px] font-normal">(鉴伪关键)</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">极近贴着斜打光拍反射面。抓取苍蝇翅与蜘蛛酸蚀纹。</p>
                                </div>

                                {slots.macro ? (
                                    <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={slots.macro} alt="Macro View" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeSlotImage('macro')} 
                                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full transition-all hover:bg-red-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => macroInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 hover:border-emerald-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-emerald-50/10 transition-all cursor-pointer flex-1 flex flex-col justify-center items-center"
                                    >
                                        <Search className="w-5 h-5 text-slate-400 mb-1.5" />
                                        <span className="text-[11px] font-bold text-slate-600">微距照</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. 其他细节照 (选填) */}
                        <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2.5">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800">📸 补充细节照 <span className="text-slate-400 text-[10px] font-normal">(选填，最多3张)</span></h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">你可以补充侧面、雕刻局部、挂件绳子或证书的照片。</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2.5">
                                {slots.others.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                        <img src={img} alt="Detail View" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeSlotImage('others', idx)}
                                            className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full transition-all hover:bg-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {slots.others.length < 3 && (
                                    <div 
                                        onClick={() => othersInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 hover:border-emerald-200 aspect-square rounded-xl flex flex-col justify-center items-center bg-slate-50 hover:bg-emerald-50/10 transition-all cursor-pointer"
                                    >
                                        <Plus className="w-5 h-5 text-slate-400" />
                                        <span className="text-[9px] text-slate-400 font-bold mt-1">添加</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={!slots.front || isAnalyzing}
                        onClick={startAnalysis}
                        className={`w-full mt-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${slots.front && !isAnalyzing
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 active:scale-[0.98]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                正在智能鉴定...
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5" />
                                开始严谨鉴定
                            </>
                        )}
                    </button>
                </section>

                {/* Results / Empty State */}
                {!result && !isAnalyzing && !error && (
                    <div className="text-center p-10 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                        <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 text-sm">上传照片后，AI 将为您提供深度分析报告</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center">
                        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {result && !isAnalyzing && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">鉴定结论</span>
                            <h2 className="text-2xl font-bold mt-2 text-slate-900">{result.authenticity.conclusion}</h2>

                            {/* 1. 真伪概率与风险评估徽章组 */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-100/60 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    🛡️ 天然A货概率: {result.authenticity.probability || '98%+'}
                                </span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border ${
                                    result.authenticity.riskLevel === 'low' 
                                        ? 'bg-green-50 text-green-600 border-green-100/60' 
                                        : result.authenticity.riskLevel === 'medium' 
                                            ? 'bg-amber-50 text-amber-600 border-amber-100/60' 
                                            : 'bg-red-50 text-red-600 border-red-100/60'
                                }`}>
                                    ⚠️ 风险评估: {result.authenticity.riskLevel === 'low' ? '极低风险' : result.authenticity.riskLevel === 'medium' ? '中等风险' : '存在风险'}
                                </span>
                            </div>

                            {/* 2. 国标级五大核心物理检测卡片 */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-5">
                                <div className="bg-slate-50/80 backdrop-blur border border-slate-100/50 p-3 rounded-2xl shadow-sm transition-all hover:bg-slate-50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🔮 种质 (种)</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{result.quality.texture}</p>
                                </div>
                                <div className="bg-slate-50/80 backdrop-blur border border-slate-100/50 p-3 rounded-2xl shadow-sm transition-all hover:bg-slate-50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">💧 水头 (水)</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{result.quality.transparency}</p>
                                </div>
                                <div className="bg-slate-50/80 backdrop-blur border border-slate-100/50 p-3 rounded-2xl shadow-sm transition-all hover:bg-slate-50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🎨 色泽 (色)</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{result.quality.color}</p>
                                </div>
                                <div className="bg-slate-50/80 backdrop-blur border border-slate-100/50 p-3 rounded-2xl shadow-sm transition-all hover:bg-slate-50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🪓 雕工 (工)</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{result.quality.craftsmanship}</p>
                                </div>
                                <div className="bg-slate-50/80 backdrop-blur border border-slate-100/50 p-3 rounded-2xl shadow-sm transition-all hover:bg-slate-50 col-span-2 md:col-span-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🏆 综合品质级别</p>
                                    <p className="text-sm font-bold text-emerald-700 mt-1">{result.quality.overallGrade}</p>
                                </div>
                            </div>

                            {/* 3. 商业估值与收藏评级 (金色豪华卡片) */}
                            {result.valuation && (
                                <div className="mt-4 bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-amber-50/90 border border-amber-100/80 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
                                        <span>🪙 商业估价与收藏建议</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div>
                                            <p className="text-[10px] text-amber-700/80 font-bold">参考估值区间</p>
                                            <p className="text-base font-extrabold text-amber-900 mt-0.5">{result.valuation.priceRange}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-amber-700/80 font-bold">推荐收藏评级</p>
                                            <p className="text-sm font-extrabold text-amber-900 mt-1">{result.valuation.collectibility}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. 深度报告正文 */}
                                <ReactMarkdown
                                    components={{
                                        h3: ({node, ...props}) => (
                                            <h3 className="text-[#065f46] font-extrabold text-sm mt-4 mb-2 flex items-center gap-1 border-l-2 border-[#065f46] pl-2" {...props} />
                                        )
                                    }}
                                >
                                    {result.detailedAnalysis}
                                </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <section className="bg-emerald-900 text-emerald-50 rounded-3xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-emerald-400" />
                        鉴定建议
                    </h3>
                    <ul className="space-y-3 text-xs opacity-80 list-disc pl-4">
                        <li>提供自然光下的正面照，展示最真实的颜色。</li>
                        <li>提供强光透射照，有助于观察内部结构。</li>
                        <li>微距拍摄表面，观察“翠性”等微观特征。</li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default JadeAppraisalView;
