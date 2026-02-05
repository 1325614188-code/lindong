import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 获取支付宝配置
async function getAlipayConfig() {
    const { data: configs } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_gateway', 'alipay_notify_url']);

    const configMap: Record<string, string> = {};
    configs?.forEach(c => { configMap[c.key] = c.value; });
    return configMap;
}

// RSA 签名 - 支持支付宝 PKCS#8 格式私钥
function signWithRSA(content: string, privateKey: string): string {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content, 'utf8');

    // 清理私钥：移除可能的换行和空格
    let cleanKey = privateKey.replace(/\s/g, '');

    // 判断并添加正确的 PEM 头部和尾部
    let pemKey: string;
    if (cleanKey.includes('-----BEGIN')) {
        // 已经有头部，直接使用
        pemKey = privateKey;
    } else {
        // 支付宝使用 PKCS#8 格式
        pemKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
    }

    return sign.sign(pemKey, 'base64');
}

// 生成支付宝请求参数
function buildAlipayParams(config: Record<string, string>, orderId: string, amount: number, credits: number) {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    const bizContent = JSON.stringify({
        out_trade_no: orderId,
        total_amount: amount.toFixed(2),
        subject: `美力实验室充值 ${credits}次`,
        product_code: 'FAST_INSTANT_TRADE_PAY'
    });

    const params: Record<string, string> = {
        app_id: config.alipay_app_id,
        method: 'alipay.trade.page.pay',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp,
        version: '1.0',
        biz_content: bizContent
    };

    if (config.alipay_notify_url) {
        params.notify_url = config.alipay_notify_url;
    }

    // 按字母排序拼接待签名字符串
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');

    // 签名
    params.sign = signWithRSA(signStr, config.alipay_private_key);

    return params;
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action, ...data } = req.body;

        switch (action) {
            case 'createOrder': {
                const { userId, amount, credits } = data;

                // 获取支付宝配置
                const config = await getAlipayConfig();
                if (!config.alipay_app_id || !config.alipay_private_key) {
                    return res.status(400).json({ error: '支付宝配置不完整' });
                }

                // 生成订单号
                const orderId = `ML${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

                // 创建订单记录
                await supabase.from('orders').insert({
                    user_id: userId,
                    amount,
                    credits,
                    status: 'pending',
                    trade_no: orderId
                });

                // 生成支付宝支付参数
                const params = buildAlipayParams(config, orderId, amount, credits);
                const gateway = config.alipay_gateway || 'https://openapi.alipay.com/gateway.do';

                // 构建支付URL
                const queryString = Object.entries(params)
                    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                    .join('&');
                const payUrl = `${gateway}?${queryString}`;

                return res.status(200).json({
                    success: true,
                    orderId,
                    payUrl
                });
            }

            case 'notify': {
                // 支付宝异步通知处理
                const { out_trade_no, trade_status } = data;

                if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
                    // 更新订单状态
                    const { data: order } = await supabase
                        .from('orders')
                        .select('user_id, credits, status')
                        .eq('trade_no', out_trade_no)
                        .single();

                    if (order && order.status === 'pending') {
                        // 更新订单为已支付
                        await supabase
                            .from('orders')
                            .update({ status: 'paid', paid_at: new Date().toISOString() })
                            .eq('trade_no', out_trade_no);

                        // 增加用户额度
                        await supabase.rpc('add_credits', { user_id: order.user_id, amount: order.credits });
                    }
                }

                // 返回 success 告知支付宝已收到通知
                return res.status(200).send('success');
            }

            case 'checkOrder': {
                const { orderId } = data;

                const { data: order } = await supabase
                    .from('orders')
                    .select('status, credits')
                    .eq('trade_no', orderId)
                    .single();

                return res.status(200).json({
                    success: true,
                    status: order?.status || 'unknown',
                    credits: order?.credits || 0
                });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[Alipay Error]', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
