-- 美力实验室数据库表结构
-- 在 Supabase SQL 编辑器中执行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  credits INT DEFAULT 5,
  device_id TEXT,
  referrer_id UUID REFERENCES users(id),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 设备记录表 (用于追踪首次注册)
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  first_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 兑换码使用记录表
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code, device_id)
);

-- 分享奖励记录表
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  new_user_id UUID REFERENCES users(id),
  device_id TEXT NOT NULL,
  rewarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  credits INT NOT NULL,
  status TEXT DEFAULT 'pending',
  trade_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 应用配置表
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初始化配置数据
INSERT INTO app_config (key, value) VALUES
  ('contact_wechat', 'sekesm'),
  ('recharge_enabled', 'true'),
  ('referral_points_enabled', 'true'),
  ('alipay_app_id', ''),
  ('alipay_private_key', ''),
  ('alipay_public_key', '')
ON CONFLICT (key) DO NOTHING;

-- 创建管理员账户 (密码需要在后端加密后更新)
-- 临时使用明文，后续通过 API 初始化

-- 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许匿名用户通过 API 访问
CREATE POLICY "Allow insert for anon" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for anon" ON users FOR SELECT USING (true);
CREATE POLICY "Allow update for anon" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow all for devices" ON devices FOR ALL USING (true);
CREATE POLICY "Allow all for redemptions" ON redemptions FOR ALL USING (true);
CREATE POLICY "Allow all for referral_rewards" ON referral_rewards FOR ALL USING (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for app_config" ON app_config FOR ALL USING (true);
