import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
    const { username } = req.body;

    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 检查该用户的订单
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

    return res.status(200).json({
        user: {
            id: user.id,
            username: user.username,
            credits: user.credits,
            referrer_id: user.referrer_id,
            points: user.points,
            commission_balance: user.commission_balance
        },
        orders: orders || []
    });
}
