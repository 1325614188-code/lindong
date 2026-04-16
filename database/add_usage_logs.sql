-- 创建 Gemini 使用日志表
CREATE TABLE IF NOT EXISTS gemini_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,           -- 例如 'tryOn', 'analyze', 'hairstyle'
    model_id TEXT NOT NULL,         -- 使用的模型 ID
    prompt_tokens INT DEFAULT 0,    -- 输入 Token 数
    completion_tokens INT DEFAULT 0, -- 输出 Token 数
    total_tokens INT DEFAULT 0,     -- 总 Token 数
    duration_ms INT,                -- 响应耗时 (毫秒)
    status TEXT DEFAULT 'success',  -- success | error
    api_key_last_chars TEXT,       -- 记录 API Key 的最后几位，方便排查哪个 Key 的问题
    error_message TEXT,            -- 错误消息 (如果有)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE gemini_usage_logs ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入 (由后端 API 触发)
CREATE POLICY "Allow insert for service" ON gemini_usage_logs FOR INSERT WITH CHECK (true);

-- 允许管理员查询统计
CREATE POLICY "Allow select for all" ON gemini_usage_logs FOR SELECT USING (true);

-- 建立索引以优化查询
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON gemini_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON gemini_usage_logs(action);
