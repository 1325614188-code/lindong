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

// 检测环境：微信、QQ、普通浏览器
const getEnvironment = (userAgent: string): 'wechat' | 'qq' | 'browser' | 'other' => {
    if (userAgent.includes('MicroMessenger')) return 'wechat';
    // QQ 内部浏览器包含 "QQ/" 且通常不包含 "MQQBrowser"（QQ浏览器）
    // 或者包含 "QQ/" 且是在移动端设备上
    if (userAgent.includes('QQ/') && !userAgent.includes('MQQBrowser')) return 'qq';

    const mobileKeywords = [
        'Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry',
        'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile', 'mobile'
    ];
    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));

    return isMobile ? 'browser' : 'other';
};

// 检测是否为移动设备 (保留兼容性，但逻辑已整合进 getEnvironment)
const isMobileDevice = (userAgent: string): boolean => {
    return getEnvironment(userAgent) !== 'other';
};

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, ...data } = req.body;

        switch (action) {
            case 'register': {
                const { username: rawUsername, password: rawPassword, nickname, deviceId, referrerId: rawReferrerId } = data;
                const referrerId = rawReferrerId && rawReferrerId.trim() !== '' ? rawReferrerId : null;
                const username = rawUsername?.trim();
                const password = rawPassword?.trim();

                if (!username || !password) {
                    return res.status(400).json({ error: '用户名和密码不能为空' });
                }

                const userAgent = req.headers['user-agent'] || '';
                const env = getEnvironment(userAgent);
                const isBrowser = env === 'browser';

                // 检查用户名是否已存在
                const { data: existing, error: checkError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', username)
                    .maybeSingle(); // 使用 maybeSingle 避免无结果时报错

                if (checkError) throw checkError;
                if (existing) {
                    return res.status(400).json({ error: '用户名已存在' });
                }

                // 检查设备是否已有首个用户
                const { data: device } = await supabase
                    .from('devices')
                    .select('first_user_id')
                    .eq('device_id', deviceId)
                    .maybeSingle();

                const isFirstOnDevice = !device;
                // 只有【手机浏览器】首次注册才赠送额度 (排除微信和QQ)
                const initialCredits = (isFirstOnDevice && isBrowser) ? 5 : 0;

                // 解析真实推荐人ID (处理 8 位短码)
                let realReferrerId = referrerId;
                if (referrerId && referrerId.length < 32) {
                    const suffix = referrerId.substring(0, 6);

                    const { data: potentialReferrers } = await supabase
                        .from('users')
                        .select('id, device_id, is_admin')
                        .ilike('device_id', `%${suffix}%`)
                        .order('created_at', { ascending: true })
                        .limit(50);

                    if (potentialReferrers && potentialReferrers.length > 0) {
                        let matchedUsers: any[] = [];

                        for (const pr of potentialReferrers) {
                            if (!pr.device_id) continue;
                            let hash = 0;
                            for (let i = 0; i < pr.device_id.length; i++) {
                                hash = (hash << 5) - hash + pr.device_id.charCodeAt(i);
                                hash |= 0;
                            }
                            const char1 = String.fromCharCode(65 + Math.abs(hash) % 26);
                            const char2 = String.fromCharCode(65 + Math.abs(hash >> 5) % 26);
                            const expectedShortCode = `${suffix.toUpperCase()}${char1}${char2}`;

                            if (expectedShortCode === referrerId) {
                                matchedUsers.push(pr);
                            }
                        }

                        if (matchedUsers.length > 0) {
                            // 优先级：1. 管理员 2. 也是最早注册的账号
                            const adminUser = matchedUsers.find(u => u.is_admin);
                            if (adminUser) {
                                realReferrerId = adminUser.id;
                            } else {
                                realReferrerId = matchedUsers[0].id;
                            }
                        }
                    }

                    // 如果短码解析失败（没找到对应 UUID），为了防止数据库 UUID 类型报错，将其置空
                    if (realReferrerId === referrerId) {
                        realReferrerId = null;
                    }
                }

                // 创建用户
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        username,
                        password_hash: hashPassword(password),
                        nickname: nickname || username,
                        credits: initialCredits,
                        device_id: deviceId,
                        referrer_id: realReferrerId || null
                    })
                    .select()
                    .single();

                if (userError) throw userError;

                // 尝试静默记录注册环境(若用户尚未在数据库创建 register_env 字段，此行报错将被忽略，防止注册崩溃)
                await supabase.from('users').update({ register_env: env }).eq('id', newUser.id);

                // 记录设备首个用户
                if (isFirstOnDevice) {
                    await supabase.from('devices').insert({
                        device_id: deviceId,
                        first_user_id: newUser.id
                    });
                }

                // 如果有推荐人标识，且该设备是首次注册，给推荐人增加次数
                if (realReferrerId && isFirstOnDevice) {
                    // 检查推荐人是否存在
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', realReferrerId)
                        .single();

                    if (referrer) {
                        // 双重检查：确保该设备从未产生过推荐奖励（防止并发或逻辑绕过）
                        const { data: existingReward } = await supabase
                            .from('referral_rewards')
                            .select('id')
                            .eq('device_id', deviceId)
                            .limit(1)
                            .maybeSingle();

                        if (!existingReward) {
                            // 使用 add_credits 函数增加次数
                            await supabase.rpc('add_credits', { user_id: realReferrerId, amount: 1 });

                            // 检查是否开启了积分奖励
                            const { data: config } = await supabase
                                .from('app_config')
                                .select('value')
                                .eq('key', 'referral_points_enabled')
                                .single();

                            if (config?.value === 'true') {
                                // 增加1个推荐积分
                                await supabase.rpc('add_points', { user_id: realReferrerId, amount: 1 });
                            }

                            // 记录奖励
                            await supabase.from('referral_rewards').insert({
                                referrer_id: realReferrerId,
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
                const { username: rawUsername, password: rawPassword } = data;
                const username = rawUsername?.trim();
                const password = rawPassword?.trim();

                if (!username || !password) {
                    return res.status(400).json({ error: '用户名和密码不能为空' });
                }

                // 使用 * 选择，避免因缺少某些后期加入的字段（如 points, commission_balance）导致整个查询失败
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .eq('password_hash', hashPassword(password))
                    .maybeSingle();

                if (error) {
                    console.error('[Login Error Detail]', error);
                    // 额外尝试只查询基础字段，以确认是否是字段缺失问题
                    const { error: basicError } = await supabase.from('users').select('id').limit(1);
                    if (basicError) {
                        return res.status(500).json({ error: `数据库连接异常: ${basicError.message}` });
                    }
                    return res.status(500).json({ error: `登录服务异常 (可能是数据库字段缺失): ${error.message}` });
                }

                if (!user) {
                    return res.status(401).json({ error: '用户名或密码错误' });
                }

                // 确保返回给前端的对象包含默认值
                const safeUser = {
                    ...user,
                    points: user.points ?? 0,
                    commission_balance: user.commission_balance ?? 0
                };

                return res.status(200).json({
                    success: true,
                    user: safeUser
                });
            }

            case 'getUser': {
                const { userId } = data;

                if (!userId) {
                    return res.status(400).json({ error: 'Missing userId' });
                }

                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error || !user) {
                    console.error('[getUser Error]', error);
                    return res.status(404).json({ error: 'User not found' });
                }

                const safeUser = {
                    ...user,
                    points: user.points ?? 0,
                    commission_balance: user.commission_balance ?? 0
                };

                return res.status(200).json({ user: safeUser });
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

                if (!userId) {
                    return res.status(400).json({ error: 'Missing userId' });
                }

                // 扣除额度
                const { error: rpcError } = await supabase.rpc('add_credits', { user_id: userId, amount: -1 });
                if (rpcError) {
                    console.error('[deductCredit RPC Error]', rpcError);
                    throw rpcError;
                }

                // 获取并返回最新额度
                const { data: user } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single();

                return res.status(200).json({ success: true, credits: user?.credits });
            }


            case 'getReferralHistory': {
                const { userId } = data;

                // 查询通过我的链接注册的所有用户
                const { data: users, error: usersError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('referrer_id', userId)
                    .order('created_at', { ascending: false });

                if (usersError) {
                    return res.status(500).json({ error: 'Failed to fetch referral history' });
                }

                if (!users || users.length === 0) {
                    return res.status(200).json({ history: [] });
                }

                const userIds = users.map(u => u.id);

                // 查询这些用户的所有已付款订单
                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select('user_id, amount')
                    .in('user_id', userIds)
                    .eq('status', 'paid');

                if (ordersError) {
                    return res.status(500).json({ error: 'Failed to fetch order history' });
                }

                // 组装数据
                const history = users.map(u => {
                    const userOrders = orders?.filter(o => o.user_id === u.id) || [];
                    const totalRecharge = userOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

                    // 隐藏部分用户名保护隐私
                    const displayUsername = u.username.length > 4
                        ? `${u.username.substring(0, 2)}***${u.username.substring(u.username.length - 2)}`
                        : `${u.username.substring(0, 1)}***`;

                    return {
                        id: u.id,
                        username: displayUsername, // 脱敏处理
                        created_at: u.created_at,
                        register_env: u.register_env || 'unknown',
                        total_recharge: totalRecharge
                    };
                });

                return res.status(200).json({ history });
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

            case 'getPointsStats': {
                const { userId } = data;

                const { data: user } = await supabase
                    .from('users')
                    .select('points')
                    .eq('id', userId)
                    .single();

                return res.status(200).json({
                    points: user?.points || 0
                });
            }

            case 'redeemPoints': {
                const { userId, pointsUsed, rewardAmount } = data;

                // 获取用户信息
                const { data: user } = await supabase
                    .from('users')
                    .select('points, username')
                    .eq('id', userId)
                    .single();

                if (!user) {
                    return res.status(404).json({ error: '用户不存在' });
                }

                // 检查积分是否足够
                if (user.points < pointsUsed) {
                    return res.status(400).json({ error: '积分不足' });
                }

                // 检查是否有待处理的兑换申请
                const { data: pendingRedemption } = await supabase
                    .from('point_redemptions')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('status', 'pending')
                    .single();

                if (pendingRedemption) {
                    return res.status(400).json({ error: '您有待处理的兑换申请，请等待管理员处理' });
                }

                // 创建兑换申请
                const { error: insertError } = await supabase
                    .from('point_redemptions')
                    .insert({
                        user_id: userId,
                        username: user.username,
                        points_used: pointsUsed,
                        reward_amount: rewardAmount,
                        status: 'pending'
                    });

                if (insertError) throw insertError;

                return res.status(200).json({
                    success: true,
                    message: '兑换申请已提交，请联系管理员微信完成兑换'
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
