-- 大额充值码表
CREATE TABLE IF NOT EXISTS recharge_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    credits INT DEFAULT 50,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 Row Level Security
ALTER TABLE recharge_codes ENABLE ROW LEVEL SECURITY;

-- 允许匿名/认证用户进行查询和更新 (实际逻辑由后端 RPC 或 API 控制，这里放开权限以保证 API 调用正常)
CREATE POLICY "Allow all for recharge_codes" ON recharge_codes FOR ALL USING (true);
