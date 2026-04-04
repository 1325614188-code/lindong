import { getApiUrl } from "../lib/api-config";

export interface EyeDiagnosisResult {
    healthScore: number;
    mainFinding: string;
    visceraStatus: string;
    detailedAnalysis: {
        spleenStomach: string;
        heart: string;
        lung: string;
        liver: string;
        kidney: string;
    };
    suggestions: string[];
    reportMarkdown: string;
}

const API_BASE = getApiUrl('/api/gemini');

export async function analyzeEyeImages(images: string[]): Promise<EyeDiagnosisResult> {
    if (images.length < 5) {
        throw new Error("请上传全部5张照片进行分析");
    }

    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'eyeDiagnosis',
            images
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `分析失败: ${response.status}`);
    }

    const { result } = await response.json();

    if (result.error) {
        throw new Error(result.error);
    }

    return result;
}
