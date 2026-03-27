-- 为 users 表增加邀请码字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 为没有邀请码的现有用户生成初始邀请码 (基于 ID 的前 8 位)
UPDATE users 
SET invite_code = UPPER(SUBSTRING(id::TEXT, 1, 8))
WHERE invite_code IS NULL;

-- 设置 invite_code 为必填 (可选，如果是新系统建议开启)
-- ALTER TABLE users ALTER COLUMN invite_code SET NOT NULL;
