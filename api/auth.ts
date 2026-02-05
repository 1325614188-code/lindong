import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 密码加密
const hashPassword = (password: string): string => {
    return crypto.createHash('sha256').update(password + 'meili_salt_2026').digest('hex');
};

// 验证兑换码格式 - 使用北京时间 (UTC+8)
const validateRedeemCode = (code: string): boolean => {
    if (code.length !== 9) return false;

    // 获取北京时间
    const now = new Date();
    const beijingOffset = 8 * 60; // UTC+8 分钟
    const localOffset = now.getTimezoneOffset(); // 本地偏移（分钟，西为正）
    const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);

    const dayOfMonth = beijingTime.getDate();
    const futureDay = new Date(beijingTime);
    futureDay.setDate(futureDay.getDate() + 13);

    const expectedDD = String(dayOfMonth).padStart(2, '0');
    const expectedXX = String(futureDay.getDate()).padStart(2, '0');

    const DD = code.substring(0, 2);
    const AA = code.substring(2, 4);
    const XX = code.substring(4, 6);
    const BBB = code.substring(6, 9);

    // 验证格式
    if (DD !== expectedDD) return false;
    if (!/^[A-Z]{2}$/.test(AA)) return false;
    if (XX !== expectedXX) return false;
    if (!/^[A-Z]{3}$/.test(BBB)) return false;

    return true;
};

// 生成设备ID (前端传入的fingerprint)
const generateDeviceId = (): string => {
    return crypto.randomBytes(16).toString('hex');
};

// 检测是否为移动设备
const isMobileDevice = (userAgent: string): boolean => {
    const mobileKeywords = [
        'Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry',
        'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile', 'mobile'
    ];
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
};

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, ...data } = req.body;

        switch (action) {
            case 'register': {
                const { username, password, nickname, deviceId, referrerId } = data;
                const userAgent = req.headers['user-agent'] || '';
                const isMobile = isMobileDevice(userAgent);

                // 检查用户名是否已存在
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', username)
                    .single();

                if (existing) {
                    return res.status(400).json({ error: '用户名已存在' });
                }

                // 检查设备是否已有首个用户
                const { data: device } = await supabase
                    .from('devices')
                    .select('first_user_id')
                    .eq('device_id', deviceId)
                    .single();

                const isFirstOnDevice = !device;
                // 只有移动端首次注册才赠送额度
                const initialCredits = (isFirstOnDevice && isMobile) ? 5 : 0;

                // 创建用户
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        username,
                        password_hash: hashPassword(password),
                        nickname: nickname || username,
                        credits: initialCredits,
                        device_id: deviceId,
                        referrer_id: referrerId || null
                    })
                    .select()
                    .single();

                if (userError) throw userError;

                // 记录设备首个用户
                if (isFirstOnDevice) {
                    await supabase.from('devices').insert({
                        device_id: deviceId,
                        first_user_id: newUser.id
                    });
                }

                // 如果有推荐人，且是移动端注册，给推荐人增加次数
                if (referrerId && isMobile) {
                    // 检查推荐人是否存在
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', referrerId)
                        .single();

                    if (referrer) {
                        // 检查是否已经奖励过（同一设备只奖励一次）
                        const { data: existingReward } = await supabase
                            .from('referral_rewards')
                            .select('id')
                            .eq('referrer_id', referrerId)
                            .eq('device_id', deviceId)
                            .single();

                        if (!existingReward) {
                            // 使用 add_credits 函数增加次数
                            await supabase.rpc('add_credits', { user_id: referrerId, amount: 1 });

                            // 记录奖励
                            await supabase.from('referral_rewards').insert({
                                referrer_id: referrerId,
                                new_user_id: newUser.id,
                                device_id: deviceId
                            });
                        }
                    }
                }

                return res.status(200).json({
                    success: true,
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        nickname: newUser.nickname,
                        credits: newUser.credits
                    },
                    message: isFirstOnDevice ? '注册成功，已赠送5次使用额度！' : '注册成功'
                });
            }

            case 'login': {
                const { username, password } = data;

                const { data: user, error } = await supabase
                    .from('users')
                    .select('id, username, nickname, credits, is_admin')
                    .eq('username', username)
                    .eq('password_hash', hashPassword(password))
                    .single();

                if (error || !user) {
                    return res.status(401).json({ error: '用户名或密码错误' });
                }

                return res.status(200).json({
                    success: true,
                    user
                });
            }

            case 'getUser': {
                const { userId } = data;

                const { data: user, error } = await supabase
                    .from('users')
                    .select('id, username, nickname, credits, device_id, created_at')
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                return res.status(200).json({ user });
            }

            case 'redeem': {
                const { userId, code, deviceId } = data;
                const userAgent = req.headers['user-agent'] || '';
                const isMobile = isMobileDevice(userAgent);

                // 检查是否为移动端
                if (!isMobile) {
                    return res.status(400).json({ error: '兑换码只能在手机端使用' });
                }

                // 验证兑换码格式
                if (!validateRedeemCode(code)) {
                    return res.status(400).json({ error: '无效的兑换码' });
                }

                // 检查兑换码是否已被使用
                const { data: existingRedemption } = await supabase
                    .from('redemptions')
                    .select('id')
                    .eq('code', code)
                    .single();

                if (existingRedemption) {
                    return res.status(400).json({ error: '该兑换码已被使用' });
                }

                // 检查本月是否已兑换过
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { data: monthlyRedemption } = await supabase
                    .from('redemptions')
                    .select('id')
                    .eq('device_id', deviceId)
                    .gte('used_at', startOfMonth.toISOString())
                    .single();

                if (monthlyRedemption) {
                    return res.status(400).json({ error: '本月已兑换过，请下月再试' });
                }

                // 记录兑换
                await supabase.from('redemptions').insert({
                    code,
                    device_id: deviceId,
                    user_id: userId
                });

                // 增加用户次数
                await supabase.rpc('add_credits', { user_id: userId, amount: 5 });

                return res.status(200).json({
                    success: true,
                    message: '兑换成功，已增加5次使用额度！'
                });
            }

            case 'useCredit': {
                const { userId } = data;

                // 检查用户额度
                const { data: user } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single();

                if (!user || user.credits <= 0) {
                    return res.status(400).json({ error: '使用额度不足', needCredits: true });
                }

                return res.status(200).json({ success: true, credits: user.credits });
            }

            case 'deductCredit': {
                const { userId } = data;

                await supabase.rpc('add_credits', { user_id: userId, amount: -1 });

                return res.status(200).json({ success: true });
            }

            case 'getUser': {
                const { userId } = data;

                const { data: user } = await supabase
                    .from('users')
                    .select('id, username, nickname, credits, is_admin')
                    .eq('id', userId)
                    .single();

                if (!user) {
                    return res.status(404).json({ error: '用户不存在' });
                }

                return res.status(200).json({ user });
            }

            case 'getReferralStats': {
                const { userId } = data;

                // 统计通过分享获得的奖励次数
                const { count } = await supabase
                    .from('referral_rewards')
                    .select('*', { count: 'exact', head: true })
                    .eq('referrer_id', userId);

                return res.status(200).json({
                    referralCount: count || 0
                });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[Auth Error]', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
