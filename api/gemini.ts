import { GoogleGenAI } from "@google/genai";

// 从环境变量加载多个 API Key (支持 GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2...)
const getApiKeys = (): string[] => {
    const keys: string[] = [];

    // 检查原始变量
    if (process.env.GEMINI_API_KEY) {
        keys.push(...process.env.GEMINI_API_KEY.split(",").map(k => k.trim()).filter(k => k.length > 0));
    }

    // 动态检查 GEMINI_API_KEY1 到 GEMINI_API_KEY100
    for (let i = 1; i <= 100; i++) {
        const key = process.env[`GEMINI_API_KEY${i}`];
        if (key) {
            keys.push(key.trim());
        }
    }

    return keys;
};

let currentKeyIndex = 0;

const getClient = (): GoogleGenAI => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error("未配置 GEMINI_API_KEY");
    const key = keys[currentKeyIndex % keys.length];
    return new GoogleGenAI({ apiKey: key });
};

const switchKey = (): void => {
    const keys = getApiKeys();
    if (keys.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        console.log(`[API Rotation] 切换到 Key 索引: ${currentKeyIndex}`);
    }
};

/**
 * 带有超时和自动轮换 Key 的请求包装器
 */
async function requestWithRetry<T>(
    operation: (ai: GoogleGenAI) => Promise<T>,
    maxRetries = 5,
    initialDelay = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const ai = getClient();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("API 请求超时")), 30000)
            );
            return await Promise.race([operation(ai), timeoutPromise]) as T;
        } catch (error: any) {
            lastError = error;
            const status = error?.status || error?.code || error?.response?.status;
            const isOverloaded = status === 503 || error?.message?.includes("overloaded");
            const isRateLimit = status === 429 || error?.message?.includes("Rate limit");

            console.error(`[API Error] 尝试 ${i + 1}/${maxRetries + 1}, 错误: ${error?.message || error}`);

            if (i < maxRetries && (isOverloaded || isRateLimit || error?.message === "API 请求超时")) {
                if (getApiKeys().length > 1) {
                    switchKey();
                }
                const delay = initialDelay * Math.pow(2, i);
                console.log(`[Retry] 等待 ${delay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, type, images, gender, baseImage, itemImage, itemType, faceImage } = req.body;

        switch (action) {
            case 'analyze': {
                // 图像分析 (颜值打分、舌诊、面诊等)
                const isBeautyScore = type === '颜值打分';
                const isFengShui = type === '摆设风水分析';

                let analysisStyle = '';
                if (isFengShui) {
                    analysisStyle = '按中国传统风水术语（如：明堂、青龙白虎位、煞气、避讳、聚气等）进行深度详解和布局建议。';
                } else {
                    analysisStyle = '按五官（眼睛、鼻子、嘴巴、脸型、眉毛等）逐个进行美学或健康角度的详细分析。';
                }

                const systemInstruction = `
          你是一位资深${isFengShui ? '风水命理大师' : '美妆生活博主'}，语气采用典型的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请针对用户上传的图片进行深度分析。
          要求：
          1. 标题要吸引人，使用【】括起来。
          ${isBeautyScore ? '2. 【重要】报告的第一行必须是分数，格式为：[SCORE:XX分]，其中 XX 是 0-100 之间的具体分数。' : ''}
          ${isBeautyScore ? '3.' : '2.'} ${analysisStyle}
          ${isBeautyScore ? '4.' : '3.'} 给出针对性的${isFengShui ? '改进建议或化解方案' : '变美建议、穿搭建议或健康调理方案'}。
          ${isBeautyScore ? '5.' : '4.'} 结尾要有互动感。
          ${isBeautyScore ? '6.' : '5.'} 报告内容详尽且专业，文字要贴心。
        `;
                const prompt = `分析类型：${type}。${gender ? `性别：${gender}` : ''}`;

                const result = await requestWithRetry(async (ai) => {
                    const contents = {
                        parts: [
                            ...images.map((img: string) => ({
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: img.split(',')[1] || img
                                }
                            })),
                            { text: prompt }
                        ]
                    };
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents,
                        config: { systemInstruction, temperature: 0.7 }
                    });
                    return response.text;
                });

                return res.status(200).json({ result });
            }

            case 'tryOn': {
                // AI 试穿/试戴
                const result = await requestWithRetry(async (ai) => {
                    const prompt = itemType === 'clothes'
                        ? '将图中人物的衣服换成另一张图中的款式，保持人物面容和环境不变，生成高品质穿搭效果图。输出图片比例必须为9:16竖版。'
                        : '在图中人物的耳朵上戴上另一张图中的耳坠。如果是正面，请在左右两侧耳朵都展示出来。效果要自然，光影和谐。';

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: baseImage.split(',')[1] } },
                                { inlineData: { mimeType: 'image/jpeg', data: itemImage.split(',')[1] } },
                                { text: prompt }
                            ]
                        },
                        // 仅对试穿衣服使用 9:16 竖版比例
                        ...(itemType === 'clothes' ? { config: { outputOptions: { aspectRatio: '9:16' } } } : {})
                    } as any);

                    for (const part of response.candidates?.[0]?.content?.parts || []) {
                        if (part.inlineData) {
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                    }
                    return null;
                });

                return res.status(200).json({ result });
            }

            case 'hairstyle': {
                // 发型生成 (单个)
                const { hairstyleName, hairstyleDesc } = req.body;

                const result = await requestWithRetry(async (ai) => {
                    const prompt = `为图中这位${gender}性生成一种具体的时尚发型：${hairstyleName}。
          ${hairstyleDesc ? `发型具体特征描述：${hairstyleDesc}` : ''}
          要求：
          1. 发型必须与原图中的脸型和五官完美融合。
          2. 确保发型特征非常明显，与其他发型有显著区别。
          3. 生成高品质、真实感强的效果图。
          4. 仅仅改变发型，保持人脸特征不变。`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: faceImage.split(',')[1] } },
                                { text: prompt }
                            ]
                        }
                    });

                    for (const part of response.candidates?.[0]?.content?.parts || []) {
                        if (part.inlineData) {
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                    }
                    return null;
                });

                return res.status(200).json({ result });
            }

            case 'textAnalysis': {
                // 纯文本分析 (五行车牌等)
                const { prompt } = req.body;

                if (!prompt) {
                    return res.status(400).json({ error: '缺少分析内容' });
                }

                const result = await requestWithRetry(async (ai) => {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [{ text: prompt }] },
                        config: { temperature: 0.7 }
                    });
                    return response.text;
                });

                return res.status(200).json({ result });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[API Error]', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
