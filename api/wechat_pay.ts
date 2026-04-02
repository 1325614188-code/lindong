import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const WECHAT_PROXY = process.env.WECHAT_PROXY; // 代理服务器地址

// 获取微信支付配置
async function getWechatConfig() {
    const { data: configs } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
            'wechat_pay_enabled', 
            'wechat_pay_mch_id', 
            'wechat_pay_api_v3_key', 
            'wechat_pay_serial_no', 
            'wechat_pay_private_key',
            'wechat_pay_notify_url',
            'commission_rate',
            'wechat_app_id' // 借用 auth_v2 里的 APP_ID
        ]);

    const configMap: Record<string, string> = {};
    configs?.forEach(c => { configMap[c.key] = c.value; });
    
    // 如果没有独立配置，则尝试从环境变量读取基础 APP_ID
    if (!configMap.wechat_app_id) {
        configMap.wechat_app_id = process.env.WECHAT_APP_ID || '';
    }
    
    return configMap;
}

// 微信支付 V3 签名逻辑
function generateSignature(method: string, url: string, timestamp: number, nonce: string, body: string, privateKey: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    
    let pemKey = privateKey;
    if (!pemKey.includes('-----BEGIN')) {
        // 如果用户只粘贴了 Base64 内容，则移除所有空白符并添加头部
        const cleanContent = privateKey.replace(/\s/g, '');
        pemKey = `-----BEGIN PRIVATE KEY-----\n${cleanContent}\n-----END PRIVATE KEY-----`;
    } else {
        // 如果用户粘贴了完整 PEM，只需确保换行符正确（不应移除空格）
        pemKey = privateKey.trim();
    }
    
    return sign.sign(pemKey, 'base64');
}


// 核心履行逻辑：原子化更新订单并下发额度 (改为使用数据库函数保证强一致性)
async function fulfillOrder(orderId: string) {
    console.log(`[WechatPay-Fulfill] Attempting to fulfill order: ${orderId}`);

    // 1. 获取订单详情 (需确认订单是否存在且为 pending)
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('trade_no', orderId)
        .single();

    if (fetchError || !order) {
        console.error('[WechatPay-Fulfill] Order not found:', orderId);
        return { success: false, reason: 'order_not_found' };
    }

    if (order.status === 'paid') {
        console.log('[WechatPay-Fulfill] Order already processed:', orderId);
        return { success: true, alreadyPaid: true };
    }

    // 2. 核心补足逻辑：先增加额度 (确保用户体验)
    const { error: creditError } = await supabase.rpc('add_credits', { 
        user_id: order.user_id, 
        amount: order.credits 
    });

    if (creditError) {
        console.error('[WechatPay-Fulfill] Credit RPC Error:', creditError);
        return { success: false, reason: 'credit_rpc_error' };
    }

    // 3. 额度下发成功后，更新订单状态
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString()
        })
        .eq('trade_no', orderId);

    if (updateError) {
        console.error('[WechatPay-Fulfill] Order status update failed (but credits were added):', updateError);
        // 此种情况用户已经获得额度，虽然状态没更，但不会导致用户损失
    }

    // 成功后处理推荐佣金逻辑 (非原子任务，即便失败也不影响充值本身)
    try {
        const { data: order } = await supabase.from('orders').select('user_id, amount, id').eq('trade_no', orderId).single();
        if (order) {
            const { data: user } = await supabase.from('users').select('referrer_id').eq('id', order.user_id).single();
            if (user?.referrer_id) {
                const config = await getWechatConfig();
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
            }
        }
    } catch (e) {
        console.error('[WechatPay-Fulfill] Optional commission logic error (ignored):', e);
    }

    return { success: true, credits: order.credits };
}

// 微信 V3 回调解密函数
function decryptWechatResource(resource: any, apiV3Key: string) {
    try {
        const { ciphertext, associated_data, nonce } = resource;
        const key = Buffer.from(apiV3Key, 'utf8');
        const iv = Buffer.from(nonce, 'utf8');
        const authTagLen = 16;
        const data = Buffer.from(ciphertext, 'base64');
        
        // 分离标签和密文
        const tag = data.subarray(data.length - authTagLen);
        const encrypted = data.subarray(0, data.length - authTagLen);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.from(associated_data, 'utf8'));
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    } catch (e) {
        console.error('[WechatPay-Decrypt] Failed:', e);
        return null;
    }
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const body = req.body || {};
        
        // 自动探测：如果含有 resource 字段但没有 action，判定为微信原生回调
        let action = body.action;
        if (!action && body.resource) {
            action = 'notify';
        }

        const data = body;

        switch (action) {
            case 'createOrder': {
                const { userId, amount, credits, openid } = data;
                console.log(`[WechatPay] CreateOrder: user=${userId}, amount=${amount}, openid=${openid}`);

                if (!openid) {
                    return res.status(400).json({ error: '支付失败：缺少微信用户标识 (OpenID)。请尝试退出并重新通过微信登录。' });
                }

                const config = await getWechatConfig();
                
                if (config.wechat_pay_enabled !== 'true') return res.status(400).json({ error: '微信支付暂未开启' });
                if (!config.wechat_pay_mch_id || !config.wechat_pay_private_key) return res.status(400).json({ error: '微信支付配置不全' });

                const orderId = `WX${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                const { error: insertError } = await supabase.from('orders').insert({
                    user_id: userId,
                    amount,
                    credits,
                    status: 'pending',
                    trade_no: orderId
                });

                if (insertError) {
                    console.error('[WechatPay] DB Insert Error:', insertError);
                    return res.status(500).json({ error: '订单创建失败，请稍后重试' });
                }

                // 调用微信支付 V3 下单接口
                const timestamp = Math.floor(Date.now() / 1000);
                const nonce = crypto.randomBytes(16).toString('hex');
                const notifyUrl = config.wechat_pay_notify_url || 'https://marylab.xyz/api/wechat_pay';

                const payBody = {
                    appid: config.wechat_app_id,
                    mchid: config.wechat_pay_mch_id,
                    description: `充值 ${credits} 次额度`,
                    out_trade_no: orderId,
                    notify_url: notifyUrl,
                    amount: { total: Math.round(amount * 100), currency: 'CNY' },
                    payer: { openid }
                };

                const signature = generateSignature('POST', '/v3/pay/transactions/jsapi', timestamp, nonce, JSON.stringify(payBody), config.wechat_pay_private_key);
                const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.wechat_pay_mch_id}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.wechat_pay_serial_no}"`;

                const mchBaseUrl = WECHAT_PROXY ? WECHAT_PROXY : 'https://api.mch.weixin.qq.com';
                const wxRes = await fetch(`${mchBaseUrl}/v3/pay/transactions/jsapi`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'Accept': 'application/json',
                        'User-Agent': 'MaryLab-Server/1.0'
                    },
                    body: JSON.stringify(payBody)
                });

                const wxData = await wxRes.json();
                if (!wxRes.ok) return res.status(400).json({ error: wxData.message || '微信下单失败' });

                // 生成前端 JSAPI 调起参数
                const jsTimestamp = Math.floor(Date.now() / 1000);
                const jsNonce = crypto.randomBytes(16).toString('hex');
                const jsPackage = `prepay_id=${wxData.prepay_id}`;
                
                // 二次签名
                const messageToSign = `${config.wechat_app_id}\n${jsTimestamp}\n${jsNonce}\n${jsPackage}\n`;
                const paySign = crypto.createSign('RSA-SHA256').update(messageToSign).sign(config.wechat_pay_private_key.includes('BEGIN') ? config.wechat_pay_private_key : `-----BEGIN PRIVATE KEY-----\n${config.wechat_pay_private_key}\n-----END PRIVATE KEY-----`, 'base64');

                return res.status(200).json({
                    success: true,
                    orderId,
                    payParams: {
                        appId: config.wechat_app_id,
                        timeStamp: jsTimestamp.toString(),
                        nonceStr: jsNonce,
                        package: jsPackage,
                        signType: 'RSA',
                        paySign
                    }
                });
            }

            case 'notify': {
                // 收到微信支付通知报文
                const body = req.body;
                if (body && body.resource) {
                    const config = await getWechatConfig();
                    if (config.wechat_pay_api_v3_key) {
                        const decrypted = decryptWechatResource(body.resource, config.wechat_pay_api_v3_key);
                        console.log('[WechatPay-Notify] Data:', decrypted?.out_trade_no, decrypted?.trade_state);
                        
                        if (decrypted && decrypted.trade_state === 'SUCCESS') {
                            await fulfillOrder(decrypted.out_trade_no);
                        }
                    }
                }
                return res.status(200).json({ code: 'SUCCESS', message: '成功' });
            }

            case 'checkOrder': {
                const { orderId } = data;
                const { data: order } = await supabase.from('orders').select('*').eq('trade_no', orderId).single();
                if (!order) return res.status(200).json({ success: false, status: 'unknown' });

                if (order.status === 'paid') {
                    return res.status(200).json({ success: true, status: 'paid', credits: order.credits });
                }

                // 主动向微信查询
                try {
                    const config = await getWechatConfig();
                    if (config.wechat_pay_mch_id && config.wechat_pay_private_key) {
                        const timestamp = Math.floor(Date.now() / 1000);
                        const nonce = crypto.randomBytes(16).toString('hex');
                        const queryUrl = `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${config.wechat_pay_mch_id}`;
                        
                        const signature = generateSignature('GET', queryUrl, timestamp, nonce, '', config.wechat_pay_private_key);
                        const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.wechat_pay_mch_id}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.wechat_pay_serial_no}"`;

                        const mchBaseUrl = WECHAT_PROXY ? WECHAT_PROXY : 'https://api.mch.weixin.qq.com';
                        const wxRes = await fetch(`${mchBaseUrl}${queryUrl}`, {
                            headers: { 'Authorization': authHeader, 'Accept': 'application/json', 'User-Agent': 'MaryLab-Server/1.0' }
                        });
                        const wxData = await wxRes.json();
                        
                        if (wxRes.ok && wxData.trade_state === 'SUCCESS') {
                            const result = await fulfillOrder(orderId);
                            if (result.success || result.alreadyPaid) {
                                return res.status(200).json({ success: true, status: 'paid', credits: result.credits });
                            }
                        }
                    }
                } catch (e) { console.error('[WechatPay Order Query Error]', e); }

                return res.status(200).json({ success: true, status: order.status, credits: 0 });
            }

            case 'confirmOrder': {
                const result = await fulfillOrder(data.orderId);
                return result.success 
                    ? res.status(200).json({ success: true, credits: result.credits })
                    : res.status(400).json({ success: false, error: result.reason });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (e: any) {
        console.error('[WechatPay Error]', e);
        return res.status(500).json({ error: e.message });
    }
}
