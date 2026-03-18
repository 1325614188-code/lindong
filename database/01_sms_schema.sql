-- 1. 为 users 表新增 phone 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- 2. 创建短信日志表 (用于验证和限流)
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  type TEXT DEFAULT 'register', -- register, login, bind etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 添加配置开关 (默认关闭，稍后在后台可以随时开启)
INSERT INTO app_config (key, value) 
VALUES ('sms_registration_enabled', 'false') 
ON CONFLICT (key) DO NOTHING;

-- 4. 开启 RLS 策略
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for sms_logs" ON sms_logs FOR ALL USING (true);
