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
        const { action, type, images, gender, baseImage, itemImage, itemType, faceImage, image } = req.body;

        switch (action) {
            case 'detectPhotoContent': {
                // 用于检测用户上传的照片是否符合要求（脸部+上半身）
                const result = await requestWithRetry(async (ai) => {
                    const systemInstruction = "你是一个图像合规性审计专家。判断用户上传的图片是否同时包含【清晰的人脸】以及【至少覆盖肩膀和胸部的上半身部位】。如果是，回复 TRUE，否则回复 FALSE。只需要回复一个单词，不要说明原因。";
                    const contents = {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: image.split(',')[1] || image
                                }
                            },
                            { text: "这张图是否符合：包含人脸且包含足以试穿衣服的上半身？" }
                        ]
                    };
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents,
                        config: { systemInstruction, temperature: 0.1 }
                    });
                    return response.text.trim().toUpperCase() === 'TRUE';
                });

                return res.status(200).json({ valid: result });
            }

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

            case 'makeup': {
                // 美妆效果生成
                const { faceImage, styleName, styleDesc } = req.body;

                if (!faceImage || !styleName) {
                    return res.status(400).json({ error: '缺少人脸图片或化妆风格' });
                }

                const result = await requestWithRetry(async (ai) => {
                    const prompt = `请为图中人物化上"${styleName}"风格的妆容。
${styleDesc ? `风格特点：${styleDesc}` : ''}

【重要要求】：
1. 绝对不能改变人物的五官特征、脸型、眼睛形状等面部骨骼结构
2. 只能在原有五官基础上添加化妆效果（眼影、腮红、口红、眉毛修饰等）
3. 保持人物原本的肤色基调，妆容要自然融合
4. 生成高品质、真实感强的美妆效果图
5. 确保妆容风格特征明显，符合"${styleName}"的典型特点`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: faceImage.split(',')[1] } },
                                { text: prompt }
                            ]
                        }
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

            case 'marriageAnalysis': {
                // 八字婚姻分析
                const { birthInfo, gender } = req.body;
                const systemInstruction = `
          你是一位深谙中国传统八字命理与相术的姻缘大师。语气采用典型的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请根据用户提供的出生信息进行分析。
          要求：
          1. 标题要吸引人，使用【】括起来。
          2. 将其对应的新历换算成农历，并排出简单的八字（干支）。
          3. 分析其婚姻面相/命理特征：包括哪年或哪几年遇到另一半机会最大（流年机会）。
          4. 详细描述未来另一半的特征：包括大概年龄差异、性格特点、相貌特征（如：浓眉大眼、书生气质、甚至具体的身材特征）。
          5. 给出变美/吸引正缘的建议。
          6. 报告内容结尾需要包含一个特殊的标记 [PARTNER_DESC:xxxxx]，其中 xxxxx 是你对理想另一半相貌特征的精炼描述（用于AI生成图片），不超过100字。
        `;
                const prompt = `用户出生信息：${birthInfo}，性别：${gender}。`;

                const result = await requestWithRetry(async (ai) => {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [{ text: prompt }] },
                        config: { systemInstruction, temperature: 0.7 }
                    });
                    return response.text;
                });

                return res.status(200).json({ result });
            }

            case 'generatePartner': {
                // 根据相术描述生成理想另一半
                const { description, gender, userImage } = req.body;
                const targetGender = gender === '男' ? '女' : '男';

                const result = await requestWithRetry(async (ai) => {
                    const prompt = `你是一位顶级的形象设计师和命理专家。
请为图中这位${gender}性生成一位【命中注定、高度匹配】的中华${targetGender}性。

【目标形象要求】：
1. 必须基于以下相术描述进行创作：${description}。
2. 气质上要与原图中的人物形成绝佳的“夫妻相”或“互补美”。
3. 必须符合东方审美，容貌俊美/秀丽，气质出众。
4. 照片级别真实感（Photorealistic），背景为温馨的生活化场景或纯净背景。
5. 两个人的风格要统一，仿佛生活在同一个次元。

【如果不提供原图，请直接生成符合描述的中国${targetGender}性写真】。`;

                    const contents: any = {
                        parts: []
                    };

                    if (userImage) {
                        contents.parts.push({
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: userImage.split(',')[1]
                            }
                        });
                    }

                    contents.parts.push({ text: prompt });

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents
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

            case 'wealthAnalysis': {
                // 八字财运分析
                const { birthInfo, gender } = req.body;
                const systemInstruction = `
          你是一位资深的周易理财与职业规划大师。语气采用典型的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请根据用户提供的出生信息进行分析。
          要求：
          1. 标题要吸引人，使用【】括起来。
          2. 将其对应的新历换算成农历，并分析八字中的财星。
          3. 分析其一生财运起伏：重点指出哪年或哪几年财运比较旺（流年利财）。
          4. 给出职业建议：适合做什么行业（根据五行喜忌），是适合打工、创业还是理财。
          5. 给出具体的旺财建议（如家居摆设、幸运色等）。
        `;
                const prompt = `用户出生信息：${birthInfo}，性别：${gender}。`;

                const result = await requestWithRetry(async (ai) => {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [{ text: prompt }] },
                        config: { systemInstruction, temperature: 0.7 }
                    });
                    return response.text;
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
