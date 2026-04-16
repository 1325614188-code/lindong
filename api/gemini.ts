import { GoogleAuth } from 'google-auth-library';
import { astro } from 'iztro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
 * 诊断逻辑：列出该区域所有可用的模型 ID
 */
async function listAvailableModels() {
    try {
        const project = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || "us-central1";
        const token = await getAccessToken();
        
        // 尝试列出公共模型
        const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/publishers/google/models`;
        
        console.log(`[Diagnostic] 正在尝试从 ${url} 获取可用模型列表...`);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const modelNames = data.models?.map((m: any) => m.name.split('/').pop()) || [];
            console.log("[Diagnostic Success] 当前项目可用的模型 ID 列表:", JSON.stringify(modelNames));
            return modelNames;
        } else {
            const errorText = await response.text();
            console.error(`[Diagnostic Failed] 状态码: ${response.status}`, errorText);
        }
    } catch (e: any) {
        console.error("[Diagnostic Exception]", e.message);
    }
    return [];
}

/**
 * 适配 Vertex AI 模型路径 (确保 Vertex 逻辑不被改动)
 */
const getVertexModelPath = (model: string): string => {
    const mapping: Record<string, string> = {
        'gemini-3-flash-preview': 'gemini-2.5-flash', // 极其重要：映射回 Vertex 之前的稳定版本以保持行为一致
        'gemini-2.5-flash-image': 'gemini-2.5-flash-image',
        'gemini-1.5-flash': 'gemini-2.5-flash', 
        'gemini-1.5-pro': 'gemini-2.5-flash' // 锁死 Pro：将 Pro 请求强行降级为 Flash，杜绝高额扣费
    };
    const mapped = mapping[model] || 'gemini-2.5-flash'; // 兜底也使用 Flash
    return `publishers/google/models/${mapped}`;
};

/**
 * 适配 Gemini API (AI Studio) 模型名称
 */
const getGeminiModelName = (model: string): string => {
    // 隔离策略：Gemini 模式下直接使用传入的名称，不进行任何强制降级
    return model;
};

/**
 * 随机获取一个 Gemini API Key (1-100)
 */
function getRandomGeminiKey(): string {
    const randomIndex = Math.floor(Math.random() * 100) + 1;
    const key = process.env[`GEMINI_API_KEY${randomIndex}`] || process.env.GEMINI_API_KEY;
    if (!key) {
        // 尝试按序找一个存在的
        for (let i = 1; i <= 100; i++) {
            const k = process.env[`GEMINI_API_KEY${i}`];
            if (k) return k;
        }
    }
    return key || "";
}

/**
 * 获取当前的 AI 服务商配置
 */
async function getAIProvider(): Promise<string> {
    try {
        const { data } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'ai_provider')
            .maybeSingle();
        return data?.value || 'vertex';
    } catch (e) {
        return 'vertex';
    }
}

/**
 * 底层 Fetch 调用 Gemini API (AI Studio)
 */
async function callGeminiAPI(modelName: string, payload: any) {
    const apiKey = getRandomGeminiKey();
    if (!apiKey) throw new Error("未配置 GEMINI_API_KEY");

    // 隔离处理：使用专用的 Gemini 模型映射
    const apiModelName = getGeminiModelName(modelName); 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelName}:generateContent?key=${apiKey}`;

    console.log(`[Gemini API Request] URL: ${url.split('?')[0]} (Model: ${apiModelName})`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Goog-Api-Client': 'antigravity-optimizer' // 标记流量来源
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * 底层 Fetch 调用 Vertex AI REST API (v1beta1)
 */
async function callVertexAI(modelName: string, payload: any) {
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || "us-central1";
    const token = await getAccessToken();

    // 隔离处理：使用专用的 Vertex 模型映射
    const modelPath = getVertexModelPath(modelName);
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
        // 如果遇到 404，触发诊断逻辑
        if (response.status === 404) {
            console.error(`[Vertex AI API 404] 模型 ${modelName} 未找到，启动模型列表诊断...`);
            await listAvailableModels();
        }
        throw new Error(`Vertex API Error (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * 记录 Gemini 使用情况
 */
async function logUsage(data: {
    action: string;
    model_id: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    duration_ms?: number;
    status: 'success' | 'error';
    error_message?: string;
}) {
    try {
        await supabase.from('gemini_usage_logs').insert([data]);
    } catch (e) {
        console.error("[Usage Log Error] 记录失败:", e);
    }
}

/**
 * 带有超时和自动重试的请求包装器
 */
async function requestWithRetry<T>(
    modelName: string,
    operation: (model: any) => Promise<T>,
    maxRetries = 2,
    initialDelay = 1000
): Promise<{ result: T; usage?: any; duration: number }> {
    let lastError: any;
    const provider = await getAIProvider();
    const startTime = Date.now();
    console.log(`[AI Strategy] Current Provider: ${provider}`);

    for (let i = 0; i <= maxRetries; i++) {
        try {
            let lastUsage: any = null;
            const mockModel = {
                generateContent: async (payload: any) => {
                    const result = provider === 'gemini' 
                        ? await callGeminiAPI(modelName, payload)
                        : await callVertexAI(modelName, payload);
                    lastUsage = result.usageMetadata || result.usage; // 适配不同 API 返回格式
                    return { response: result };
                }
            };
            const result = await operation(mockModel);
            return { 
                result, 
                usage: lastUsage, 
                duration: Date.now() - startTime 
            };
        } catch (error: any) {
            lastError = error;
            const message = error?.message || "";
            const isRateLimit = message.includes("429");
            
            console.error(`[Retry Strategy] 尝试 ${i + 1}/${maxRetries + 1} 失败: ${message}`);

            // 遇到 404, 401, 403 或 429(频率限制) 时停止重试
            if (message.includes("404") || message.includes("401") || message.includes("403") || isRateLimit) {
                if (isRateLimit) {
                    console.warn("[Retry Strategy] 触发 429 频率限制，绝对停止重试并返回原始错误，以保护额度。");
                }
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
                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
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

                // 异步记录日志
                logUsage({
                    action,
                    model_id: 'gemini-3-flash-preview',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
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

                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
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

                logUsage({
                    action: `${action}:${type}`,
                    model_id: 'gemini-3-flash-preview',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'tryOn': {
                const { result, usage, duration } = await requestWithRetry('gemini-2.5-flash-image', async (model) => {
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
                    console.log(`[tryOn] Gemini Response Parts: ${parts.length}`);
                    
                    for (const part of parts) {
                        if (part.inlineData) {
                            console.log('[tryOn] Found inlineData in response');
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                        if (part.text) {
                            console.warn('[tryOn] Model returned text instead of image:', part.text);
                        }
                    }
                    console.error('[tryOn] No inlineData found in candidate parts');
                    return null;
                });

                logUsage({
                    action,
                    model_id: 'gemini-2.5-flash-image',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'hairstyle':
            case 'makeup': {
                const isHairstyle = action === 'hairstyle';
                const { hairstyleName, hairstyleDesc, styleName, styleDesc } = req.body;
                const name = isHairstyle ? hairstyleName : styleName;
                const desc = isHairstyle ? hairstyleDesc : styleDesc;

                const { result, usage, duration } = await requestWithRetry('gemini-2.5-flash-image', async (model) => {
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
                    console.log(`[${action}] Gemini Response Parts: ${parts.length}`);

                    for (const part of parts) {
                        if (part.inlineData) {
                            console.log(`[${action}] Found inlineData in response`);
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                        if (part.text) {
                            console.warn(`[${action}] Model returned text instead of image:`, part.text);
                        }
                    }
                    console.error(`[${action}] No inlineData found in candidate parts`);
                    return null;
                });

                logUsage({
                    action,
                    model_id: 'gemini-2.5-flash-image',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'marriageAnalysis':
            case 'wealthAnalysis': {
                const isMarriage = action === 'marriageAnalysis';
                const { birthInfo, gender } = req.body;
                const systemInstruction = isMarriage 
                    ? `你是一位姻缘大师，分析用户出生信息。给出一份小红书风格的报告数据。末尾一定要包含 [PARTNER_DESC:xxxxx] 格式。`
                    : `你是一位财运解析大师，分析用户出生信息。给出一份小红书风格的报告数据。`;
                
                const prompt = `用户信息：${birthInfo}，性别：${gender}。`;

                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });
                    return response.response.candidates[0].content.parts[0].text;
                });

                logUsage({
                    action,
                    model_id: 'gemini-3-flash-preview',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'ziWeiAnalysis': {
                const { birthInfo, gender } = req.body;
                // birthInfo: "YYYY年MM月DD日 HH:00"
                console.log(`[ZiWei Request] Received birthInfo: "${birthInfo}", gender: "${gender}"`);
                
                // 改进正则表达式：更加严密地匹配 YYYY年MM月DD日 HH:mm
                // 支持一位或两位数字，且明确限制空格后的位置
                const match = birthInfo.match(/(\d+)年(\d+)月(\d+)日\s+(\d+):(\d+)/);
                
                if (!match) {
                    console.error(`[ZiWei Error] 格式解析失败: "${birthInfo}"`);
                    return res.status(400).json({ error: '无效的出生日期格式，期望: YYYY年MM月DD日 HH:mm' });
                }
                
                const [_, y, m, d, h, min] = match;
                const hourNum = parseInt(h);

                // 防御性校验：确保小时在 0-23 之间
                if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
                    console.error(`[ZiWei Error] 非法的小时值: ${h} (来自输入 "${birthInfo}")`);
                    return res.status(400).json({ error: `非法的小时数值: ${h}` });
                }

                try {
                    // 使用 iztro 进行排盘
                    const chart = astro.bySolar(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, hourNum, gender, true, 'zh-CN');
                    
                    // 简化星盘数据给 AI
                    const payloadData = {
                        basic: {
                            gender: chart.gender,
                            solarDate: chart.solarDate,
                            lunarDate: chart.lunarDate,
                            baZi: chart.eightWords || chart.fiveElements, // 尽量提供八字或五行局
                            chineseZodiac: chart.chineseZodiac
                        },
                        palaces: chart.palaces.map(p => ({
                            name: p.name,
                            isLifePalace: p.isLifePalace,
                            majorStars: p.majorStars?.map(s => s.name) || [],
                            minorStars: p.minorStars?.map(s => s.name) || [],
                            adjectiveStars: p.adjectiveStars?.map(s => s.name) || [] // 替代不存在的 lucky/bad stars
                        }))
                    };

                    console.log(`[ZiWei] Payload generated for AI with ${payloadData.palaces.length} palaces.`);

                    const systemInstruction = `
                        你是一位精通紫微斗数的命理大师。
                        请根据提供的星盘 JSON 数据，为用户生成一份极具专业度且富有温度的【紫微斗数深度解析报告】。
                        风格要求：小红书爆款风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
                        
                        报告应包含：
                        1. 【命格总述】：整体运势格局。
                        2. 【核心星位】：解析命宫、财帛宫、官禄宫、夫妻宫的重点星曜影响。
                        3. 【财运与事业】：给出的具体建议。
                        4. 【感情寄语】：针对姻缘的分析。
                        5. 【大师锦囊】：给用户的一句建议。
                    `;
                    
                    const prompt = `排盘详情：${JSON.stringify(payloadData)}`;

                    const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
                        const response = await model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.7 },
                            systemInstruction: { parts: [{ text: systemInstruction }] }
                        });
                        return response.response.candidates[0].content.parts[0].text;
                    });

                    logUsage({
                        action,
                        model_id: 'gemini-3-flash-preview',
                        prompt_tokens: usage?.promptTokenCount,
                        completion_tokens: usage?.candidatesTokenCount,
                        total_tokens: usage?.totalTokenCount,
                        duration_ms: duration,
                        status: 'success'
                    });

                    return res.status(200).json({ result });
                } catch (e: any) {
                    console.error("[ZiWei Error]", e.message);
                    return res.status(500).json({ error: "排盘失败: " + e.message });
                }
            }

            case 'generatePartner': {
                const { description, gender, userImage } = req.body;
                const targetGender = gender === '男' ? '女' : '男';

                const { result, usage, duration } = await requestWithRetry('gemini-2.5-flash-image', async (model) => {
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
                    console.log(`[generatePartner] Gemini Response Parts: ${partsOut.length}`);

                    for (const part of partsOut) {
                        if (part.inlineData) {
                            console.log('[generatePartner] Found inlineData in response');
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                        if (part.text) {
                            console.warn('[generatePartner] Model returned text:', part.text);
                        }
                    }
                    console.error('[generatePartner] No inlineData found in candidate parts');
                    return null;
                });

                logUsage({
                    action,
                    model_id: 'gemini-2.5-flash-image',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'textAnalysis': {
                const { prompt } = req.body;
                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 }
                    });
                    return response.response.candidates[0].content.parts[0].text;
                });

                logUsage({
                    action,
                    model_id: 'gemini-3-flash-preview',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            case 'jadeAppraisal':
            case 'eyeDiagnosis': {
                const isJade = action === 'jadeAppraisal';
                
                // 定义明确的 JSON 结构要求
                const jadeSchema = `{
                    "authenticity": { "conclusion": "鉴定结论", "reasons": ["原因1", "原因2"], "riskLevel": "high|medium|low" },
                    "quality": { "color": "颜色描述", "transparency": "透明度", "texture": "种地", "craftsmanship": "做工", "overallGrade": "综合等级" },
                    "detailedAnalysis": "深度分析正文(Markdown)"
                }`;
                const eyeSchema = `{
                    "healthScore": 85,
                    "mainFinding": "核心发现",
                    "visceraStatus": "脏腑情况概述",
                    "detailedAnalysis": { "spleenStomach": "...", "heart": "...", "lung": "...", "liver": "...", "kidney": "..." },
                    "suggestions": ["建议1", "建议2"],
                    "reportMarkdown": "完整报告正文(Markdown)"
                }`;

                const systemInstruction = isJade 
                    ? `你是一位翡翠鉴定专家。请分析用户上传的翡翠照片，并**严格按照以下 JSON 格式**返回报告。不要输出 JSON 以外的任何文字：\n${jadeSchema}`
                    : `你是一位中医望诊专家。请分析用户上传的眼睛照片，并**严格按照以下 JSON 格式**返回报告。不要输出 JSON 以外的任何文字：\n${eyeSchema}`;

                if (!images || !Array.isArray(images)) {
                    return res.status(400).json({ error: 'Images array is required' });
                }

                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
                    const response = await model.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                ...images.map((img: string) => ({
                                    inlineData: { mimeType: 'image/jpeg', data: img.includes(',') ? img.split(',')[1] : img }
                                })),
                                { text: "请开始深度分析并返回 JSON 报告。" }
                            ]
                        }],
                        generationConfig: { 
                            temperature: 0.2, // 降低随机性以保证 JSON 格式
                            responseMimeType: "application/json" // 强制定向 JSON 输出
                        },
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    });

                    let text = response.response.candidates[0].content.parts[0].text || "";
                    console.log(`[${action}] Raw Response Sample: ${text.substring(0, 100)}...`);

                    // 尝试清洗并解析 JSON
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    const cleanJson = jsonMatch ? jsonMatch[0] : text;

                    try {
                        return JSON.parse(cleanJson);
                    } catch (e) {
                        console.error(`[${action}] JSON Parse Failed:`, e);
                        return { error: "AI 报告解析失败", raw: text };
                    }
                });

                logUsage({
                    action,
                    model_id: 'gemini-3-flash-preview',
                    prompt_tokens: usage?.promptTokenCount,
                    completion_tokens: usage?.candidatesTokenCount,
                    total_tokens: usage?.totalTokenCount,
                    duration_ms: duration,
                    status: 'success'
                });

                return res.status(200).json({ result });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[API Error]', error.message);
        
        // 错误日志记录
        logUsage({
            action: req.body?.action || 'unknown',
            model_id: 'unknown',
            status: 'error',
            error_message: error.message
        });

        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
