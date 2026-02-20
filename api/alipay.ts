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

// 生成支付宝请求参数 - 手机网站支付
function buildAlipayParams(config: Record<string, string>, orderId: string, amount: number, credits: number, returnUrl: string) {
    const now = new Date();
    // 北京时间
    const timestamp = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const bizContent = JSON.stringify({
        out_trade_no: orderId,
        total_amount: amount.toFixed(2),
        subject: `美力实验室充值 ${credits}次`,
        product_code: 'QUICK_WAP_WAY'  // 手机网站支付产品码
    });

    const params: Record<string, string> = {
        app_id: config.alipay_app_id,
        method: 'alipay.trade.wap.pay',  // 手机网站支付接口
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp,
        version: '1.0',
        biz_content: bizContent,
        return_url: returnUrl  // 支付完成后返回的页面
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
                const returnUrl = req.headers.origin || 'https://www.qczj.xyz';
                const params = buildAlipayParams(config, orderId, amount, credits, returnUrl);
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
                        .select('id, user_id, credits, amount, status')
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

                        // 推荐佣金逻辑 (40%)
                        const { data: user } = await supabase
                            .from('users')
                            .select('referrer_id')
                            .eq('id', order.user_id)
                            .single();

                        if (user?.referrer_id) {
                            const commissionAmount = Number(order.amount) * 0.4;
                            // 增加推荐人佣金余额
                            await supabase.rpc('add_commission', {
                                user_id: user.referrer_id,
                                amount: commissionAmount
                            });
                            // 记录佣金日志
                            await supabase.from('commissions').insert({
                                user_id: user.referrer_id,
                                source_user_id: order.user_id,
                                order_id: order.id,
                                amount: commissionAmount
                            });
                        }
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

            case 'confirmOrder': {
                // 用户主动确认订单（用于回调失效时）
                const { orderId, userId } = data;

                const { data: order } = await supabase
                    .from('orders')
                    .select('id, user_id, credits, amount, status')
                    .eq('trade_no', orderId)
                    .single();

                if (!order) {
                    return res.status(404).json({ error: '订单不存在' });
                }

                if (order.status === 'paid') {
                    return res.status(200).json({ success: true, message: '订单已处理', credits: order.credits });
                }

                // 更新订单为已支付
                await supabase
                    .from('orders')
                    .update({ status: 'paid', paid_at: new Date().toISOString() })
                    .eq('trade_no', orderId);

                // 增加用户额度
                await supabase.rpc('add_credits', { user_id: order.user_id, amount: order.credits });

                // 推荐佣金逻辑 (40%)
                const { data: user } = await supabase
                    .from('users')
                    .select('referrer_id')
                    .eq('id', order.user_id)
                    .single();

                if (user?.referrer_id) {
                    const commissionAmount = Number(order.amount) * 0.4;
                    await supabase.rpc('add_commission', {
                        user_id: user.referrer_id,
                        amount: commissionAmount
                    });
                    await supabase.from('commissions').insert({
                        user_id: user.referrer_id,
                        source_user_id: order.user_id,
                        order_id: order.id,
                        amount: commissionAmount
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: '充值成功',
                    credits: order.credits
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
