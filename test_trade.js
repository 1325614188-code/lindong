const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://naahnkzpvmjhvrdzxotp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWhua3pwdm1qaHZyZHp4b3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDY3ODksImV4cCI6MjA4NTg4Mjc4OX0.SHzf4jJFc_OoCJ21bfe0UYTsYgMy0UiRWPQQqF9oY8U'
);

function signWithRSA(content, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content, 'utf8');
    let cleanKey = privateKey.replace(/\s/g, '');
    let pemKey;
    if (cleanKey.includes('-----BEGIN')) {
        pemKey = privateKey;
    } else {
        pemKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
    }
    return sign.sign(pemKey, 'base64');
}

async function testQuery() {
    const { data: configs } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_gateway']);

    const config = {};
    configs.forEach(c => { config[c.key] = c.value; });

    const orderId = 'ML1771586681407CBVGXJ';
    const now = new Date();
    const timestamp = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const bizContent = JSON.stringify({ out_trade_no: orderId });
    const queryParams = {
        app_id: config.alipay_app_id,
        method: 'alipay.trade.query',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp,
        version: '1.0',
        biz_content: bizContent
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const signStr = sortedKeys.map(k => `${k}=${queryParams[k]}`).join('&');
    queryParams.sign = signWithRSA(signStr, config.alipay_private_key);

    const gateway = config.alipay_gateway || 'https://openapi.alipay.com/gateway.do';
    const queryString = Object.entries(queryParams)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

    const alipayRes = await fetch(`${gateway}?${queryString}`);
    const alipayData = await alipayRes.json();
    console.log("Alipay Query Response:", JSON.stringify(alipayData, null, 2));
}

testQuery();
