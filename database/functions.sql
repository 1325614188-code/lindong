-- Supabase 函数：增减用户额度和积分
-- 注意：参数名必须与 API 调用时传入的名称一致

-- ==========================================
-- 1. 用户额度相关
-- ==========================================

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS add_credits(UUID, INT);

-- 创建增减额度函数
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE users SET credits = credits + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 原子化履约订单：加额度 + 改状态
CREATE OR REPLACE FUNCTION fulfill_order_v1(order_trade_no TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_credits INT;
  v_status TEXT;
BEGIN
  -- 1. 获取订单并锁定行
  SELECT user_id, credits, status INTO v_user_id, v_credits, v_status 
  FROM orders WHERE trade_no = order_trade_no FOR UPDATE;

  IF v_status = 'paid' THEN
    RETURN json_build_object('success', true, 'already_paid', true);
  END IF;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- 2. 增加用户额度
  UPDATE users SET credits = credits + v_credits WHERE id = v_user_id;

  -- 3. 更新订单状态
  UPDATE orders SET status = 'paid', paid_at = NOW() WHERE trade_no = order_trade_no;

  RETURN json_build_object('success', true, 'credits', v_credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 临时迁移函数：补充 orders 表的 payment_method 字段
CREATE OR REPLACE FUNCTION fix_orders_table()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. 推荐奖励积分相关
-- ==========================================

-- 用户表新增积分字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- 积分兑换申请表
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

-- 删除旧积分函数（如果存在）
DROP FUNCTION IF EXISTS add_points(UUID, INT);

-- 创建增减积分函数
CREATE OR REPLACE FUNCTION add_points(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE users SET points = points + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. 佣金收益相关
-- ==========================================

-- 用户表新增佣金余额字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_balance DECIMAL(10,2) DEFAULT 0.00;

-- 佣金记录表
CREATE TABLE IF NOT EXISTS commissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),          -- 获得佣金的人（推荐人）
    source_user_id UUID REFERENCES users(id),   -- 产生佣金的人（被推荐人）
    order_id UUID REFERENCES orders(id),        -- 关联订单
    amount DECIMAL(10,2) NOT NULL,              -- 佣金金额
    status TEXT DEFAULT 'available',            -- 状态
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建增减佣金余额函数
CREATE OR REPLACE FUNCTION add_commission(user_id UUID, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE users SET commission_balance = commission_balance + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
