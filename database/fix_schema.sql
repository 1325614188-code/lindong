-- ==========================================
-- 4. 修复缺失的数据库表
-- ==========================================

-- 佣金提现申请表 (修复 PGRST205 错误)
CREATE TABLE IF NOT EXISTS commission_withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    username TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending/approved/rejected
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 确保积分兑换表存在
CREATE TABLE IF NOT EXISTS point_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    username TEXT,
    points_used INT NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending/approved/rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    admin_note TEXT
);

-- 授予权限（如果是在普通角色下运行）
-- GRANT ALL ON TABLE commission_withdrawals TO postgres;
-- GRANT ALL ON TABLE commission_withdrawals TO anon;
-- GRANT ALL ON TABLE commission_withdrawals TO authenticated;
-- GRANT ALL ON TABLE commission_withdrawals TO service_role;

-- GRANT ALL ON TABLE point_redemptions TO postgres;
-- GRANT ALL ON TABLE point_redemptions TO anon;
-- GRANT ALL ON TABLE point_redemptions TO authenticated;
-- GRANT ALL ON TABLE point_redemptions TO service_role;

-- 5. 补充订单表缺失字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
