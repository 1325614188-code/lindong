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
        let msg = `分析失败: ${response.status}`;
        if (response.status === 413) {
            msg = "照片体积过大，请尝试重新拍摄或压缩图片后再试。";
        } else if (response.status === 504) {
            msg = "分析超时，请确保网络状况良好并稍后重试。";
        } else {
            try {
                const error = await response.json();
                msg = error.error || msg;
            } catch (e) {
                // 如果不是 JSON，直接保持默认状态码提示
            }
        }
        throw new Error(msg);
    }

    const { result } = await response.json();

    if (result.error) {
        throw new Error(result.error);
    }

    return result;
}
