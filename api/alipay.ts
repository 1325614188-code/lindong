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
        .in('key', ['alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_gateway', 'alipay_notify_url', 'commission_rate']);

    const configMap: Record<string, string> = {};
    configs?.forEach(c => { configMap[c.key] = c.value; });
    return configMap;
}

// RSA 签名 - 支持支付宝 PKCS#8 格式私钥
function signWithRSA(content: string, privateKey: string): string {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content, 'utf8');
    let cleanKey = privateKey.replace(/\s/g, '');
    let pemKey: string;
    if (cleanKey.includes('-----BEGIN')) {
        pemKey = privateKey;
    } else {
        pemKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
    }
    return sign.sign(pemKey, 'base64');
}

// 生成支付宝请求参数 - 手机网站支付
function buildAlipayParams(config: Record<string, string>, orderId: string, amount: number, credits: number, returnUrl: string) {
    const now = new Date();
    const timestamp = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const bizContent = JSON.stringify({
        out_trade_no: orderId,
        total_amount: amount.toFixed(2),
        subject: `美力实验室充值 ${credits}次`,
        product_code: 'QUICK_WAP_WAY'
    });

    const params: Record<string, string> = {
        app_id: config.alipay_app_id,
        method: 'alipay.trade.wap.pay',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp,
        version: '1.0',
        biz_content: bizContent,
        return_url: returnUrl
    };

    if (config.alipay_notify_url) {
        params.notify_url = config.alipay_notify_url;
    }

    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    params.sign = signWithRSA(signStr, config.alipay_private_key);
    return params;
}

/**
 * 核心履行逻辑：原子化更新订单并下发额度
 * 使用 .eq('status', 'pending') 确保只有第一个到达的请求能执行成功
 */
async function fulfillOrder(orderId: string) {
    console.log(`[FulfillOrder] Attempting to fulfill order: ${orderId}`);

    // 1. 获取订单详情
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('trade_no', orderId)
        .single();

    if (fetchError || !order) {
        console.error('[FulfillOrder] Order not found:', orderId);
        return { success: false, reason: 'order_not_found' };
    }

    if (order.status === 'paid') {
        console.log('[FulfillOrder] Order already paid, skipping:', orderId);
        return { success: true, alreadyPaid: true, credits: order.credits };
    }

    // 2. 原子化更新状态：核心防重逻辑
    // 只有当前状态是 pending 时才更新为 paid
    const { data: updateData, error: updateError, count } = await supabase
        .from('orders')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString()
        })
        .eq('trade_no', orderId)
        .eq('status', 'pending') // 关键：原子性锁
        .select();

    // 如果没有行被更新（count 为 0），说明状态已经被其他进程抢先更改了
    if (updateError || !updateData || updateData.length === 0) {
        console.warn('[FulfillOrder] Race condition detected or update failed. Order may have been processed by another request.');
        return { success: false, reason: 'race_condition_or_fail' };
    }

    console.log('[FulfillOrder] Status locked successfully. Proceeding with fulfillment.');

    // 3. 增加用户额度
    const { error: creditError } = await supabase.rpc('add_credits', { user_id: order.user_id, amount: order.credits });
    if (creditError) console.error('[FulfillOrder] Credit RPC Error:', creditError);

    // 4. 推荐佣金逻辑
    const { data: user } = await supabase
        .from('users')
        .select('referrer_id')
        .eq('id', order.user_id)
        .single();

    if (user?.referrer_id) {
        try {
            const config = await getAlipayConfig();
            const rate = parseInt(config.commission_rate || '40') / 100;
            const commissionAmount = Number(order.amount) * rate;

            const { error: commissionError } = await supabase.rpc('add_commission', {
                user_id: user.referrer_id,
                amount: commissionAmount
            });

            if (!commissionError) {
                await supabase.from('commissions').insert({
                    user_id: user.referrer_id,
                    source_user_id: order.user_id,
                    order_id: order.id,
                    amount: commissionAmount,
                    status: 'completed'
                });
            }
        } catch (e) { console.error('[FulfillOrder] Commission Error:', e); }
    }

    return { success: true, credits: order.credits };
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let body = req.body || {};
        const query = req.query || {};
        const isAlipayNotify = body.trade_no && body.out_trade_no && (body.trade_status || body.notify_id);
        const action = isAlipayNotify ? 'notify' : (body.action || query.action);
        const data = body;

        console.log(`[Alipay Handler] Action: ${action}, Method: ${req.method}, Notify: ${isAlipayNotify}`);

        switch (action) {
            case 'createOrder': {
                const { userId, amount, credits } = data;
                const config = await getAlipayConfig();
                if (!config.alipay_app_id || !config.alipay_private_key) {
                    return res.status(400).json({ error: '支付宝配置不完整' });
                }
                const orderId = `ML${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                await supabase.from('orders').insert({
                    user_id: userId,
                    amount,
                    credits,
                    status: 'pending',
                    trade_no: orderId
                });
                const returnUrl = req.headers.origin || 'https://qczj.xyz';
                const params = buildAlipayParams(config, orderId, amount, credits, returnUrl);
                const gateway = config.alipay_gateway || 'https://openapi.alipay.com/gateway.do';
                const queryString = Object.entries(params)
                    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                    .join('&');
                const payUrl = `${gateway}?${queryString}`;
                return res.status(200).json({ success: true, orderId, payUrl });
            }

            case 'notify': {
                const { out_trade_no, trade_status } = data;
                if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
                    await fulfillOrder(out_trade_no);
                }
                return res.status(200).send('success');
            }

            case 'checkOrder': {
                const { orderId } = data;
                const { data: order } = await supabase.from('orders').select('*').eq('trade_no', orderId).single();
                if (!order) return res.status(200).json({ success: false, status: 'unknown' });

                if (order.status === 'paid') {
                    return res.status(200).json({ success: true, status: 'paid', credits: order.credits });
                }

                // 主动查询
                try {
                    const config = await getAlipayConfig();
                    if (config.alipay_app_id && config.alipay_private_key) {
                        const now = new Date();
                        const timestamp = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
                        const bizContent = JSON.stringify({ out_trade_no: orderId });
                        const queryParams: Record<string, string> = {
                            app_id: config.alipay_app_id,
                            method: 'alipay.trade.query',
                            format: 'JSON', charset: 'utf-8', sign_type: 'RSA2',
                            timestamp, version: '1.0', biz_content: bizContent
                        };
                        const sortedKeys = Object.keys(queryParams).sort();
                        const signStr = sortedKeys.map(k => `${k}=${queryParams[k]}`).join('&');
                        queryParams.sign = signWithRSA(signStr, config.alipay_private_key);
                        const gateway = config.alipay_gateway || 'https://openapi.alipay.com/gateway.do';
                        const queryString = Object.entries(queryParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

                        const alipayRes = await fetch(`${gateway}?${queryString}`);
                        const alipayData = await alipayRes.json();
                        const tradeResponse = alipayData.alipay_trade_query_response;

                        if (tradeResponse && tradeResponse.code === '10000' && (tradeResponse.trade_status === 'TRADE_SUCCESS' || tradeResponse.trade_status === 'TRADE_FINISHED')) {
                            const result = await fulfillOrder(orderId);
                            if (result.success || result.alreadyPaid) {
                                return res.status(200).json({ success: true, status: 'paid', credits: result.credits });
                            }
                        }
                    }
                } catch (e) { console.error('[Alipay Active Query] Error:', e); }

                return res.status(200).json({ success: true, status: order.status, credits: 0 });
            }

            case 'confirmOrder': {
                const { orderId } = data;
                const result = await fulfillOrder(orderId);
                if (result.success || result.alreadyPaid) {
                    return res.status(200).json({ success: true, message: '充值成功', credits: result.credits });
                }
                return res.status(400).json({ success: false, error: '订单履行失败或已被处理' });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[Alipay Error]', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
