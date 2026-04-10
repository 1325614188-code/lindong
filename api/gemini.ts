import { GoogleAuth } from 'google-auth-library';

/**
 * 获取 GCP Access Token
 */
async function getAccessToken() {
    const keyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;
    const project = process.env.GCP_PROJECT_ID;

    if (!keyStr || !project) {
        throw new Error("GCP_SERVICE_ACCOUNT_KEY 或 GCP_PROJECT_ID 未配置");
    }

    try {
        let sanitizedKey = keyStr.trim();
        if (sanitizedKey.startsWith('"') && sanitizedKey.endsWith('"')) {
            sanitizedKey = sanitizedKey.substring(1, sanitizedKey.length - 1).replace(/\\"/g, '"');
        }
        
        const credentials = JSON.parse(sanitizedKey);
        const auth = new GoogleAuth({
            credentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        return tokenResponse.token;
    } catch (e: any) {
        console.error("[Auth Error] 获取 Access Token 失败:", e.message);
        throw e;
    }
}

/**
 * 适配 Vertex AI 模型名称
 */
const getModelName = (model: string): string => {
    const mapping: Record<string, string> = {
        'gemini-3-flash-preview': 'gemini-3-flash',
        'gemini-2.5-flash-image': 'gemini-2.5-flash-image',
        'gemini-1.5-flash': 'gemini-2.0-flash',
        'gemini-1.5-pro': 'gemini-2.0-pro'
    };
    const mapped = mapping[model] || model;
    // 强制使用完整路径模式
    return `publishers/google/models/${mapped}`;
};

/**
 * 底层 Fetch 调用 Vertex AI REST API (v1beta1)
 */
async function callVertexAI(modelName: string, payload: any) {
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || "us-central1";
    const token = await getAccessToken();

    const modelPath = getModelName(modelName);
    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/${modelPath}:generateContent`;

    console.log(`[Vertex AI Request] URL: ${url}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Vertex AI API Error] Status: ${response.status}`, errorText);
        throw new Error(`Vertex API Error (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * 带有超时和自动重试的请求包装器
 */
async function requestWithRetry<T>(
    modelName: string,
    operation: (model: any) => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            // 模拟 SDK 接口
            const mockModel = {
                generateContent: async (payload: any) => {
                    const result = await callVertexAI(modelName, payload);
                    return { response: result };
                }
            };

            return await operation(mockModel);

        } catch (error: any) {
            lastError = error;
            const message = error?.message || "";
            
            console.error(`[Retry Strategy] 尝试 ${i + 1}/${maxRetries + 1} 失败: ${message}`);

            if (message.includes("404") || message.includes("401") || message.includes("403")) {
                throw error;
            }

            if (i < maxRetries) {
                const delay = initialDelay * Math.pow(2, i); 
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, type, images, gender, baseImage, itemImage, itemType, faceImage, image } = req.body;

        switch (action) {
            case 'detectPhotoContent': {
                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const systemInstruction = "你是一个图像合规性审计专家。判断用户上传的图片是否同时包含【清晰的人脸】以及【至少覆盖肩膀和胸部的上半身部位】。如果是，回复 TRUE，否则回复 FALSE。只需要回复一个单词，不要说明原因。";
                    const contents = [{
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] || image } },
                            { text: "这张图是否符合：包含人脸且包含足以试穿衣服的上半身？" }
                        ]
                    }];
                    const response = await model.generateContent({
                        contents,
                        generationConfig: { temperature: 0.1 },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });
                    const resultText = response.response.candidates[0].content.parts[0].text || "";
                    return resultText.trim().toUpperCase().includes('TRUE');
                });
                return res.status(200).json({ valid: result });
            }

            case 'analyze': {
                const isFengShui = type === '摆设风水分析';
                const isBeautyScore = type === '颜值打分';
                const systemInstruction = `
          你是一位资深${isFengShui ? '风水命理大师' : '美妆生活博主'}，语气采用典型的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请针对用户上传的图片进行深度分析。
          要求：
          1. 标题要吸引人，使用【】括起来。
          ${isBeautyScore ? '2. 【重要】报告的第一行必须是分数，格式为：[SCORE:XX分]，其中 XX 是 0-100 之间的具体分数。' : ''}
          3. ${isFengShui ? '按中国传统风水术语进行深度详解' : '按五官逐个进行美学或健康角度的详细分析'}。
          4. 给出针对性的${isFengShui ? '改进建议或化解方案' : '变美建议、穿搭建议 or 健康调理方案'}。
        `;
                const prompt = `分析类型：${type}。${gender ? `性别：${gender}` : ''}`;

                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const contents = [{
                        role: 'user',
                        parts: [
                            ...images.map((img: string) => ({
                                inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
                            })),
                            { text: prompt }
                        ]
                    }];
                    const response = await model.generateContent({
                        contents,
                        generationConfig: { temperature: 0.7 },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });
                    return response.response.candidates[0].content.parts[0].text;
                });
                return res.status(200).json({ result });
            }

            case 'tryOn': {
                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const prompt = itemType === 'clothes'
                        ? '将图中人物的衣服换成另一张图中的款式，保持人物面容和环境不变，生成高品质穿搭效果图。输出图片比例必须为9:16竖版。'
                        : '在图中人物的耳朵上戴上另一张图中的耳坠。效果要自然，光影和谐。';

                    const response = await model.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: baseImage.split(',')[1] } },
                                { inlineData: { mimeType: 'image/jpeg', data: itemImage.split(',')[1] } },
                                { text: prompt }
                            ]
                        }],
                        generationConfig: { temperature: 0.4 }
                    });

                    const parts = response.response.candidates?.[0]?.content?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
                    }
                    return null;
                });
                return res.status(200).json({ result });
            }

            case 'hairstyle':
            case 'makeup': {
                const isHairstyle = action === 'hairstyle';
                const { hairstyleName, hairstyleDesc, styleName, styleDesc } = req.body;
                const name = isHairstyle ? hairstyleName : styleName;
                const desc = isHairstyle ? hairstyleDesc : styleDesc;

                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const prompt = isHairstyle 
                        ? `为图中这位${gender}性生成发型：${name}。特点：${desc}。保持人脸特征不变。`
                        : `为图中人物化上"${name}"风格妆容。特点：${desc}。不可改变五官骨骼。`;

                    const response = await model.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: faceImage.split(',')[1] } },
                                { text: prompt }
                            ]
                        }]
                    });

                    const parts = response.response.candidates?.[0]?.content?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
                    }
                    return null;
                });
                return res.status(200).json({ result });
            }

            case 'marriageAnalysis':
            case 'wealthAnalysis': {
                const isMarriage = action === 'marriageAnalysis';
                const { birthInfo, gender } = req.body;
                const systemInstruction = isMarriage 
                    ? `你是一位姻缘大师，分析用户出生信息。给出一份小红书风格的报告。末尾包含 [PARTNER_DESC:xxxxx]`
                    : `你是一位财运解析大师，分析用户出生信息。给出一份小红书风格的报告。`;
                
                const prompt = `用户信息：${birthInfo}，性别：${gender}。`;

                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });
                    return response.response.candidates[0].content.parts[0].text;
                });
                return res.status(200).json({ result });
            }

            case 'generatePartner': {
                const { description, gender, userImage } = req.body;
                const targetGender = gender === '男' ? '女' : '男';

                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const prompt = `生成一位高度匹配的中华${targetGender}性。描述：${description}。照片级真实。`;
                    const parts: any[] = [];
                    if (userImage) {
                        parts.push({ inlineData: { mimeType: 'image/jpeg', data: userImage.split(',')[1] } });
                    }
                    parts.push({ text: prompt });

                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts }]
                    });

                    const partsOut = response.response.candidates?.[0]?.content?.parts || [];
                    for (const part of partsOut) {
                        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
                    }
                    return null;
                });
                return res.status(200).json({ result });
            }

            case 'textAnalysis': {
                const { prompt } = req.body;
                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 }
                    });
                    return response.response.candidates[0].content.parts[0].text;
                });
                return res.status(200).json({ result });
            }

            case 'jadeAppraisal':
            case 'eyeDiagnosis': {
                const isJade = action === 'jadeAppraisal';
                const systemInstruction = isJade ? "你是一位翡翠鉴定专家，请以JSON格式返回分析。" : "你是一位中医望诊专家，分析眼睛照片，请以JSON格式返回分析。";

                const result = await requestWithRetry('gemini-1.5-flash', async (model) => {
                    const response = await model.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                ...images.map((img: string) => ({
                                    inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
                                })),
                                { text: "请开始深度分析。" }
                            ]
                        }],
                        generationConfig: { temperature: 0.7 },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });

                    let text = response.response.candidates[0].content.parts[0].text || "";
                    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) text = jsonMatch[1] || jsonMatch[0];

                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        return { error: "解析失败", raw: text };
                    }
                });
                return res.status(200).json({ result });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[API Error]', error.message);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
