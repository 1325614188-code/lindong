-- Supabase 函数：增减用户额度
-- 注意：参数名必须与 API 调用时传入的名称一致

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS add_credits(UUID, INT);

-- 创建新函数
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE users SET credits = credits + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
