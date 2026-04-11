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
    Gem
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeJadeImages, JadeAnalysisResult } from '../services/jadeService';

interface JadeAppraisalViewProps {
    onBack: () => void;
    onCheckCredits: () => Promise<boolean>;
    onDeductCredit: () => Promise<boolean>;
    onCancelProcessing?: () => void;
}

const JadeAppraisalView: React.FC<JadeAppraisalViewProps> = ({ onBack, onCheckCredits, onDeductCredit, onCancelProcessing }) => {
    const [images, setImages] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<JadeAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + images.length > 6) {
            setError("最多只能上传6张照片");
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
        setError(null);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        if (images.length <= 1) setResult(null);
    };

    const startAnalysis = async () => {
        if (images.length === 0) return;

        // 1. 检查额度
        const hasCredit = await onCheckCredits();
        if (!hasCredit) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            const analysisResult = await analyzeJadeImages(images);

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
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Gem className="text-emerald-600 w-5 h-5" />
                    <h2 className="font-bold text-gray-800">翡翠鉴别</h2>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <main className="p-4 space-y-6">
                {/* Upload Section */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        上传鉴定照片
                    </h2>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="space-y-2">
                            <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-sm font-medium text-slate-700">点击上传照片</p>
                            <p className="text-[10px] text-slate-400">支持多角度、微距、透光照 (最多6张)</p>
                        </div>
                    </div>

                    {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        disabled={images.length === 0 || isAnalyzing}
                        onClick={startAnalysis}
                        className={`w-full mt-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${images.length > 0 && !isAnalyzing
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                : 'bg-slate-100 text-slate-400'
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

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">种质</p>
                                    <p className="text-sm font-bold">{result.quality.texture}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">水头</p>
                                    <p className="text-sm font-bold">{result.quality.transparency}</p>
                                </div>
                            </div>

                            <div className="mt-4 prose prose-sm max-w-none text-slate-600 border-t pt-4">
                                <ReactMarkdown>{result.detailedAnalysis}</ReactMarkdown>
                            </div>
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
