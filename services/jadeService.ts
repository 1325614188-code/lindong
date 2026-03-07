import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MODEL_NAME = "gemini-1.5-flash"; // 使用更稳定的模型名称

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

export async function analyzeJadeImages(images: string[]): Promise<JadeAnalysisResult> {
    // 复用主项目的环境变量
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    const ai = new GoogleGenAI(apiKey);

    const imageParts = images.map((base64) => {
        const [mime, data] = base64.split(";base64,");
        return {
            inlineData: {
                mimeType: mime.split(":")[1],
                data: data,
            },
        };
    });

    const systemInstruction = `你是一位世界级的翡翠鉴定专家，拥有数十年的翡翠行业经验。
你的任务是根据用户提供的多角度、不同光影下的翡翠照片，进行严谨、客观的鉴定。

鉴定维度必须包括：
1. 真伪鉴定 (Authenticity)：观察是否有“苍蝇翅”（翠性）、“橘皮效应”、酸洗纹（B货特征）、染色迹象（C货特征）。
2. 种水评估 (Texture & Transparency)：判断是玻璃种、冰种、糯种还是豆种。
3. 颜色分析 (Color)：评估颜色的浓、阳、正、和。
4. 工艺评价 (Craftsmanship)：评价雕工的精细度、比例和艺术价值。
5. 瑕疵观察：观察是否有裂纹、棉、黑点等。

请以 JSON 格式返回结果，结构如下：
{
  "authenticity": {
    "conclusion": "鉴定结论（如：天然翡翠A货、疑似处理翡翠等）",
    "reasons": ["理由1", "理由2"],
    "riskLevel": "low | medium | high"
  },
  "quality": {
    "color": "颜色描述",
    "transparency": "水头描述",
    "texture": "种质描述",
    "craftsmanship": "工艺描述",
    "overallGrade": "综合评分/等级"
  },
  "detailedAnalysis": "详细的Markdown格式分析报告，包含专业术语解析"
}`;

    const genModel = ai.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction,
    });

    const response = await genModel.generateContent({
        contents: [
            {
                role: "user",
                parts: [
                    ...imageParts,
                    { text: "请对这些翡翠照片进行深度鉴定。请务必严谨，如果照片清晰度不足以支撑结论，请在报告中说明。" },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: "application/json",
        },
    });

    try {
        const text = response.response.text();
        return JSON.parse(text || "{}");
    } catch (e) {
        console.error("Failed to parse AI response", e);
        throw new Error("鉴定报告生成失败，请重试。");
    }
}
