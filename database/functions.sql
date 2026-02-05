-- Supabase 函数：增减用户额度
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE users SET credits = credits + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
