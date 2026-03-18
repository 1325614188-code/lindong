import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

    try {
        const { action, phone } = req.body;

        if (action === 'sendCode') {
            if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
                return res.status(400).json({ error: '无效的手机号码格式' });
            }

            // 1. 检查后台是否开启了短信注册开关
            const { data: config } = await supabase
                .from('app_config')
                .select('value')
                .eq('key', 'sms_registration_enabled')
                .single();

            if (config?.value !== 'true') {
                return res.status(403).json({ error: '系统当前未开启短信注册功能' });
            }

            // 2. 检查 60 秒防刷限制
            const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
            const { data: recentLog } = await supabase
                .from('sms_logs')
                .select('id')
                .eq('phone', phone)
                .gte('created_at', sixtySecondsAgo)
                .maybeSingle();

            if (recentLog) {
                return res.status(429).json({ error: '发送过于频繁，请 60 秒后再试' });
            }

            // 3. 生成 6 位随机验证码
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 分钟有效期

            // 4. 将验证码存入数据库
            const { error: insertError } = await supabase
                .from('sms_logs')
                .insert({
                    phone,
                    code,
                    expires_at: expiresAt,
                    type: 'register'
                });

            if (insertError) {
                throw insertError;
            }

            // 5. 调用云服务商发送短信 (Mock 模式)
            // TODO: 这里替换为真实的阿里云 / 腾讯云 SDK 调用
            console.log(`\n================================`);
            console.log(`[Mock SMS MOCK] 发送短信至: ${phone}`);
            console.log(`[Mock SMS MOCK] 验证码: \x1b[32m${code}\x1b[0m`);
            console.log(`[Mock SMS MOCK] 5分钟内有效`);
            console.log(`================================\n`);

            return res.status(200).json({ 
                success: true, 
                message: '验证码发送成功' 
            });
        }

        return res.status(400).json({ error: '无效的操作' });

    } catch (error: any) {
        console.error('[SMS Error]', error);
        return res.status(500).json({ error: error.message || '系统内部异常' });
    }
}
