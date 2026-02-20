import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const hashPassword = (password: string): string => {
    return crypto.createHash('sha256').update(password + 'meili_salt_2026').digest('hex');
};

// 默认管理员账号
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'dong2016';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, adminId, ...data } = req.body;

        // 验证管理员权限
        if (adminId) {
            const { data: admin } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', adminId)
                .single();

            if (!admin?.is_admin) {
                return res.status(403).json({ error: '无管理员权限' });
            }
        }

        switch (action) {
            case 'initAdmin': {
                // 初始化管理员账户
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', ADMIN_USERNAME)
                    .single();

                if (!existing) {
                    await supabase.from('users').insert({
                        username: ADMIN_USERNAME,
                        password_hash: hashPassword(ADMIN_PASSWORD),
                        nickname: '管理员',
                        credits: 9999,
                        is_admin: true
                    });
                }

                return res.status(200).json({ success: true });
            }

            case 'getUsers': {
                const { page = 1, pageSize = 20 } = data;

                const { data: users, count } = await supabase
                    .from('users')
                    .select('id, username, nickname, credits, points, device_id, created_at, is_admin', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range((page - 1) * pageSize, page * pageSize - 1);

                return res.status(200).json({ users, total: count });
            }

            case 'updateCredits': {
                const { userId, amount } = data;

                await supabase.rpc('add_credits', { user_id: userId, amount });

                const { data: user } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single();

                return res.status(200).json({ success: true, newCredits: user?.credits });
            }

            case 'updatePoints': {
                const { userId, amount } = data;

                await supabase.rpc('add_points', { user_id: userId, amount });

                const { data: user } = await supabase
                    .from('users')
                    .select('points')
                    .eq('id', userId)
                    .single();

                return res.status(200).json({ success: true, newPoints: user?.points });
            }

            case 'getConfig': {
                const { data: configs } = await supabase
                    .from('app_config')
                    .select('key, value');

                const configMap: Record<string, string> = {};
                configs?.forEach(c => { configMap[c.key] = c.value; });

                return res.status(200).json({ config: configMap });
            }

            case 'updateConfig': {
                const { key, value } = data;

                await supabase
                    .from('app_config')
                    .upsert({ key, value, updated_at: new Date().toISOString() });

                return res.status(200).json({ success: true });
            }

            case 'getStats': {
                const { count: userCount } = await supabase
                    .from('users')
                    .select('id', { count: 'exact', head: true });

                const { count: orderCount } = await supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'paid');

                return res.status(200).json({
                    totalUsers: userCount,
                    totalOrders: orderCount
                });
            }

            case 'getPointRedemptions': {
                // 获取积分兑换申请列表
                const { data: redemptions } = await supabase
                    .from('point_redemptions')
                    .select('*')
                    .order('created_at', { ascending: false });

                return res.status(200).json({ redemptions: redemptions || [] });
            }

            case 'processPointRedemption': {
                const { redemptionId, approved, adminNote } = data;

                // 获取兑换申请
                const { data: redemption } = await supabase
                    .from('point_redemptions')
                    .select('*')
                    .eq('id', redemptionId)
                    .single();

                if (!redemption) {
                    return res.status(404).json({ error: '兑换申请不存在' });
                }

                if (redemption.status !== 'pending') {
                    return res.status(400).json({ error: '该申请已被处理' });
                }

                if (approved) {
                    // 批准：扣除用户积分
                    await supabase.rpc('add_points', {
                        user_id: redemption.user_id,
                        amount: -redemption.points_used
                    });

                    // 更新申请状态
                    await supabase
                        .from('point_redemptions')
                        .update({
                            status: 'approved',
                            processed_at: new Date().toISOString(),
                            admin_note: adminNote || '已批准'
                        })
                        .eq('id', redemptionId);
                } else {
                    // 拒绝：不扣除积分，仅更新状态
                    await supabase
                        .from('point_redemptions')
                        .update({
                            status: 'rejected',
                            processed_at: new Date().toISOString(),
                            admin_note: adminNote || '已拒绝'
                        })
                        .eq('id', redemptionId);
                }

                return res.status(200).json({
                    success: true,
                    message: approved ? '已批准兑换申请' : '已拒绝兑换申请'
                });
            }

            case 'getCommissions': {
                // 获取佣金记录
                const { data: commissions } = await supabase
                    .from('commissions')
                    .select(`
                        id,
                        amount,
                        status,
                        created_at,
                        users:user_id(username, nickname),
                        source:source_user_id(username)
                    `)
                    .order('created_at', { ascending: false });

                return res.status(200).json({ commissions: commissions || [] });
            }

            case 'updateCommission': {
                const { userId, amount } = data;
                await supabase.rpc('add_commission', { user_id: userId, amount });
                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error('[Admin Error]', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
