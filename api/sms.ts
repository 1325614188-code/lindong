import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

// 初始化阿里云短信客户端
const createAliyunClient = () => {
    const config = new $OpenApi.Config({
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    });
    config.endpoint = "dysmsapi.aliyuncs.com";
    // NOTE: 在 ESM 环境下，SDK 类定义在 .default 属性中
    return new (Dysmsapi20170525 as any).default(config);
};

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

            // 5. 调用阿里云 SDK 发送短信
            const signName = process.env.ALIYUN_SMS_SIGN_NAME;
            const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

            if (!signName || !templateCode) {
                console.warn('[短信发送拦截] 未配置签名或模板CODE。当前验证码为:', code);
                return res.status(500).json({ error: '系统尚未配置完整的短信签名与模板CODE，无法发送短信' });
            }

            const client = createAliyunClient();
            const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
                phoneNumbers: phone,
                signName: signName,
                templateCode: templateCode,
                templateParam: `{"code":"${code}"}`,
            });
            const runtime = new $Util.RuntimeOptions({});

            try {
                const resp = await client.sendSmsWithOptions(sendSmsRequest, runtime);
                if (resp.body.code !== 'OK') {
                    console.error('[Aliyun SMS API Error]', resp.body.message);
                    return res.status(500).json({ error: `短信发送失败: ${resp.body.message}` });
                }
            } catch (smsError: any) {
                console.error('[Aliyun SMS SDK Exception]', smsError);
                return res.status(500).json({ error: '短信服务调用异常' });
            }

            console.log(`[SMS 发送成功] 手机号: ${phone}, 验证码: ${code}`);

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
