import { astro } from 'iztro';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';

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
        
        // 尝试列出公共模型 (按 regional 和 global 分两次尝试)
        const locations = [location, "global"];
        let allModelNames: string[] = [];

        for (const loc of locations) {
            const host = loc === 'global' ? 'global-aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
            const url = `https://${host}/v1beta1/projects/${project}/locations/${loc}/publishers/google/models`;
            console.log(`[Diagnostic] 正在尝试从 ${url} 获取可用模型列表...`);
            
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const names = data.models?.map((m: any) => m.name.split('/').pop()) || [];
                    console.log(`[Diagnostic Success] ${loc} 区域可用模型:`, JSON.stringify(names));
                    allModelNames = allModelNames.concat(names);
                } else {
                    const errorText = await response.text();
                    console.warn(`[Diagnostic Skip] ${loc} 区域加载失败 (${response.status}):`, errorText.substring(0, 100));
                }
            } catch (err: any) {
                console.warn(`[Diagnostic Skip] ${loc} 区域请求异常:`, err.message);
            }
        }
        
        return Array.from(new Set(allModelNames));
    } catch (e: any) {
        console.error("[Diagnostic Exception]", e.message);
    }
    return [];
}

/**
 * 适配 Vertex AI 模型路径 (复刻自参考版本配置)
 */
/**
 * 适配 Vertex AI 模型路径 (严格锁定 Flash 系列，杜绝 Pro)
 */
const getVertexModelPath = (model: string): string => {
    const mapping: Record<string, string> = {
        // 保持用户最初使用的 Key，优先映射到标准模型名
        'gemini-3-flash-preview': 'gemini-3-flash-preview', 
        'gemini-1.5-flash': 'gemini-1.5-flash',

        // 对于图像系列，尝试指向标准 Pro 版（如果 gemini-3/2.5 的自定义版本没权限）
        'gemini-2.5-flash-image': 'gemini-1.5-pro',
        'gemini-1.5-pro': 'gemini-1.5-pro',
        'gemini-2.5-pro': 'gemini-1.5-pro'
    };
    // 如果没有映射命中，直接返回模型名（支持用户直接传入自定义模型 ID）
    const mapped = mapping[model] || model;
    return `publishers/google/models/${mapped}`;
};

// 移除 Gemini API (AI Studio) 调用函数，强制走 Vertex AI 路线

/**
 * 底层 Fetch 调用 Vertex AI REST API (带多路径探测)
 */
async function callVertexAI(modelName: string, payload: any) {
    const project = process.env.GCP_PROJECT_ID;
    const defaultLocation = process.env.GCP_LOCATION || "us-central1";
    const token = await getAccessToken();

    // 1. 获取模型路径
    const modelPath = getVertexModelPath(modelName);
    
    // 2. 定义增强的探测列表 (对所有 Gemini 模型同时探测 global 和 regional 路径，增加容错性)
    const configs = [
        { host: 'aiplatform.googleapis.com', version: 'v1', loc: 'global' },
        { host: 'aiplatform.googleapis.com', version: 'v1beta1', loc: 'global' },
        { host: `${defaultLocation}-aiplatform.googleapis.com`, version: 'v1', loc: defaultLocation },
        { host: `${defaultLocation}-aiplatform.googleapis.com`, version: 'v1beta1', loc: defaultLocation },
        { host: 'global-aiplatform.googleapis.com', version: 'v1', loc: 'global' },
        { host: 'global-aiplatform.googleapis.com', version: 'v1beta1', loc: 'global' },
    ];
 
    let lastError = null;
 
    // 3. 开始多路探测
    for (const config of configs) {
        const url = `https://${config.host}/${config.version}/projects/${project}/locations/${config.loc}/${modelPath}:generateContent`;
        
        console.log(`[Vertex AI Probe] Trying URL: ${url}`);
 
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
 
            if (response.ok) {
                console.log(`[Vertex AI Success] Path found: ${config.version} @ ${config.host} (${config.loc})`);
                return await response.json();
            }
 
            const errorText = await response.text();
            console.warn(`[Vertex AI Probe failed] ${config.version} @ ${config.host} code: ${response.status}`);
            lastError = { status: response.status, text: errorText, url };
            
            // 如果是权限或计费问题 (401/403/429)，说明路径大概率对但配置有问题，直接报错不尝试其他路径
            if ([401, 403, 429].includes(response.status)) {
                break;
            }
        } catch (e: any) {
            console.error(`[Vertex AI Probe Error] ${url}:`, e.message);
            lastError = { status: 0, text: e.message, url };
        }
    }
 
    // 4. 全部失败，输出极详尽的错误诊断（包含响应正文）以便修复
    if (lastError) {
        const errorMessage = `Vertex AI 调用失败。
已尝试路径数: ${configs.length}
最后尝试 URL: ${lastError.url}
状态码: ${lastError.status}
响应正文: ${lastError.text || '无'}
模型路径: ${modelPath}`;

        console.error("[Vertex AI Final Error]", errorMessage);
        throw new Error(errorMessage);
    }

    throw new Error("Unknown error during Vertex AI call");
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
 * 计算请求的 Hash 值做为缓存 key
 */
function getCacheKey(action: string, model: string, body: any): string {
    const data = {
        action,
        model,
        params: {
            type: body.type,
            gender: body.gender,
            itemType: body.itemType,
            birthInfo: body.birthInfo,
            hairstyleName: body.hairstyleName,
            styleName: body.styleName,
            description: body.description,
            industry: body.industry
        },
        // 对图像数据取指纹（取前1000个字符和后1000个字符）以平衡速度与准确度
        imagesFingerprint: [
            body.image,
            body.baseImage,
            body.itemImage,
            body.faceImage,
            ...(body.images || [])
        ].filter(Boolean).map(img => img.substring(0, 1000) + img.substring(img.length - 1000))
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * 带有超时和自动重试的请求包装器 (强制使用 Vertex AI)
 */
async function requestWithRetry<T>(
    modelName: string,
    operation: (model: any) => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
): Promise<{ result: T; usage?: any; duration: number }> {
    let lastError: any;
    const startTime = Date.now();
    
    // 强制锁定策略：Vertex AI
    console.log(`[AI Strategy] Enforced Provider: Vertex AI (Model: ${modelName})`);

    for (let i = 0; i <= maxRetries; i++) {
        try {
            let lastUsage: any = null;
            const mockModel = {
                generateContent: async (payload: any) => {
                    const result = await callVertexAI(modelName, payload);
                    lastUsage = result.usageMetadata || result.usage;
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
            
            console.error(`[Retry Strategy] Vertex 尝试 ${i + 1}/${maxRetries + 1} 失败: ${message}`);

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

        // 尝试从缓存获取 (仅限 GET 请求模拟或特定的分析动作)
        let cacheKey = "";
        if (['analyze', 'ziWeiAnalysis', 'marriageAnalysis', 'wealthAnalysis', 'namingAnalysis', 'jadeAppraisal', 'eyeDiagnosis'].includes(action)) {
            cacheKey = getCacheKey(action, 'gemini-3-flash-preview', req.body);
            const { data: cached } = await supabase.from('gemini_cache').select('result').eq('input_hash', cacheKey).single();
            if (cached) {
                console.log(`[Cache Hit] Action: ${action}, Key: ${cacheKey}`);
                return res.status(200).json({ result: cached.result });
            }
        } else if (['tryOn', 'hairstyle', 'makeup', 'generatePartner'].includes(action)) {
            cacheKey = getCacheKey(action, 'gemini-2.5-flash-image', req.body);
            // 图像生成也支持缓存，节省昂贵生成成本
            const { data: cached } = await supabase.from('gemini_cache').select('result').eq('input_hash', cacheKey).single();
            if (cached) {
                console.log(`[Cache Hit Image] Action: ${action}, Key: ${cacheKey}`);
                return res.status(200).json({ result: cached.result });
            }
        }

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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

                return res.status(200).json({ valid: result });
            }

            case 'analyze': {
                const isFengShui = type === '摆设风水分析';
                const isBeautyScore = type === '颜值打分';
                const isFaceAge = type === '相貌年龄';

                let systemInstruction = `
          你是一位资深${isFengShui ? '风水命理大师' : '美妆生活博主'}，语气采用典型的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请针对用户上传的图片进行深度分析。
          要求：
          1. 标题要吸引人，使用【】括起来。
          ${isBeautyScore ? '2. 【重要】报告的第一行必须是分数，格式为：[SCORE:XX分]，其中 XX 是 0-100 之间的具体分数。' : ''}
          ${isFaceAge ? '2. 【重要】报告的第一行必须是结论，格式为：[AGE:XX岁]，其中 XX 是你估算的看起来的年龄。' : ''}
          3. ${isFengShui ? '按中国传统风水术语进行深度详解' : isFaceAge ? '根据照片细节、肤色等给出“分析依据”，并详细分析五官、皮肤、脸型' : '按五官逐个进行美学或健康角度的详细分析'}。
          4. 给出针对性的${isFengShui ? '改进建议或化解方案' : '变美建议、穿搭建议 or 健康调理方案'}。
        `;

                if (isFaceAge) {
                    systemInstruction = `
          你是一位资深的相貌分析专家和美学研究员。语气采用的小红书风格（多用emoji、语气助词、感叹号，排版优美，分段清晰）。
          请根据用户上传的正面脸部照片，分析其相貌年龄。
          要求：
          1. 标题吸引人，如【AI揭秘：你看起来到底多少岁？】
          2. 【重要】报告的第一行必须是结论，格式为：[AGE:XX岁]，其中 XX 是你估算的看起来的年龄数字。
          3. 包含详细的“分析依据”，解释为什么给出这个年龄结论。
          4. 分章节详细分析：
             - 【五官分析】：详细描述眼睛、鼻子、嘴巴、耳朵、眉毛的细节（如眼角细纹、紧致度等）。
             - 【皮肤状态】：分析肤色、纹理、透亮感、皮脂情况等。
             - 【脸型轮廓】：分析轮廓线条的流畅度、骨骼感、肌肉走向等。
          5. 最后给出一些维持年轻感或提升气质的针对性美学建议。
        `;
                }
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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

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

                    // 额外诊断：记录完整的候选结果，查看是否被安全拒绝或有其他原因
                    if (response.response.candidates?.[0]) {
                        console.error('[tryOn] Full candidate[0]:', JSON.stringify(response.response.candidates[0]));
                    } else {
                        console.error('[tryOn] No candidates returned at all. Model Response:', JSON.stringify(response.response));
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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

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

                    if (result && cacheKey) {
                        await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                    }

                    return res.status(200).json({ result });
                } catch (e: any) {
                    console.error("[ZiWei Error]", e.message);
                    return res.status(500).json({ error: "排盘失败: " + e.message });
                }
            }

            case 'namingAnalysis': {
                const { type, birthInfo, gender, surname, expectations, nameToScore, ownerName, industry } = req.body;
                
                let systemInstruction = "";
                let prompt = "";

                // 解析出生信息以获取八字参考 (可选，但能提高专业度)
                let baziContext = "";
                try {
                    const match = birthInfo.match(/(\d+)年(\d+)月(\d+)日\s+(\d+):(\d+)/);
                    if (match) {
                        const [_, y, m, d, h] = match;
                        const chart = astro.bySolar(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, parseInt(h), gender || '男', true, 'zh-CN');
                        baziContext = `【生辰背景】八字：${chart.eightWords.join(' ')}，五行：${chart.fiveElements}，生肖：${chart.chineseZodiac}。`;
                    }
                } catch (e) {}

                if (type === 'personal_recommend') {
                    systemInstruction = `你是一位精通易经、八字命理和姓名学的起名专家。请根据用户的生辰八字和期望，推荐5个蕴含深意、悦耳好听且符合命理的高质量名字。
风格：小红书爆款风格，排版美观，多用符号。
要求：
1. 简要分析生辰八字及五行喜忌。
2. 给出5个推荐名字，每个名字都要包含【名字】、【含义解析】、【命理契合度说明】。
3. 名字要结合用户的期望。`;
                    prompt = `姓氏：${surname}，性别：${gender}，出生信息：${birthInfo}。期望：${expectations}。${baziContext}`;
                } else if (type === 'personal_score') {
                    systemInstruction = `你是一位姓名学大师，请根据用户的生辰八字，对指定的“姓名”进行深度解析和评分（满分100）。
风格：专业且具有小红书分享感。
要求：
1. 第一行必须显示：[SCORE:XX分]。
2. 详细分析：三才五格、数理吉凶、音律美感、以及与八字的契合度。
3. 给出评价总结。`;
                    prompt = `姓名：${nameToScore}，性别：${gender}，出生信息：${birthInfo}。${baziContext}`;
                } else if (type === 'company_recommend') {
                    systemInstruction = `你是一位资深的国学起名大师，擅长根据老板命理和行业属性为公司起名。
风格：高端、大气、专业，适合小红书发布。
要求：
1. 分析老板八字对事业的影响。
2. 推荐5个公司名称，包含【字号】、【寓意深意】、【行业契合度】。
3. 名称要符合行业特征。`;
                    prompt = `老板姓名：${ownerName}，行业：${industry}，老板出生信息：${birthInfo}。${baziContext}`;
                } else if (type === 'company_score') {
                    systemInstruction = `你是一位专业的品牌起名专家，结合国学命理对公司名称进行测评。
风格：严谨、专业、具有洞察力。
要求：
1. 第一行必须显示：[SCORE:XX分]。
2. 分析字号的能量、行业匹配度、对老板命理的支持程度。
3. 给出发展建议。`;
                    prompt = `公司名字：${nameToScore}，行业：${industry}，老板出生信息：${birthInfo}。${baziContext}`;
                }

                const { result, usage, duration } = await requestWithRetry('gemini-3-flash-preview', async (model) => {
                    const response = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.8 },
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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

                return res.status(200).json({ result });
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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

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

                if (result && cacheKey) {
                    await supabase.from('gemini_cache').upsert({ input_hash: cacheKey, result });
                }

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
