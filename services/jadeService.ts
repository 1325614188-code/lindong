import { getApiUrl } from "../lib/api-config";

export interface JadeAnalysisResult {
    authenticity: {
        conclusion: string;
        reasons: string[];
        riskLevel: "low" | "medium" | "high";
    };
    quality: {
        color: string; // 色
        transparency: string; // 水
        texture: string; // 种
        craftsmanship: string; // 工
        overallGrade: string;
    };
    detailedAnalysis: string; // Markdown content
}

const API_BASE = getApiUrl('/api/gemini');

export async function analyzeJadeImages(images: string[]): Promise<JadeAnalysisResult> {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'jadeAppraisal',
            images
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `鉴定失败: ${response.status}`);
    }

    const { result } = await response.json();

    if (result.error) {
        throw new Error(result.error);
    }

    return result;
}
