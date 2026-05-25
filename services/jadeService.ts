import { getApiUrl } from "../lib/api-config";
import { compressImage } from "../lib/image";

export interface JadeAnalysisResult {
    authenticity: {
        conclusion: string;
        reasons: string[];
        riskLevel: "low" | "medium" | "high";
        probability?: string; // 天然A货可能性百分比，如：98%
    };
    quality: {
        color: string; // 色
        transparency: string; // 水
        texture: string; // 种
        craftsmanship: string; // 工
        overallGrade: string;
    };
    valuation?: {
        priceRange: string;
        collectibility: string;
    };
    detailedAnalysis: string; // Markdown content
}

const API_BASE = getApiUrl('/api/gemini');

export async function analyzeJadeImages(images: string[]): Promise<JadeAnalysisResult> {
    const compressedImages = await Promise.all(
        images.map(img => compressImage(img, 512, 0.6))
    );

    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'jadeAppraisal',
            images: compressedImages
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
