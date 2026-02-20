import React, { useState, useEffect } from 'react';

interface MemberViewProps {
    user: any;
    onLogout: () => void;
    onBack: () => void;
    onUserUpdate?: (user: any) => void; // 用于同步更新父组件的 user 状态
}

const MemberView: React.FC<MemberViewProps> = ({ user, onLogout, onBack, onUserUpdate }) => {
    // NOTE: 直接使用 user.credits，不再维护独立的本地状态，避免状态不同步
    const [redeemCode, setRedeemCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copied, setCopied] = useState(false);
    const [rechargeMessage, setRechargeMessage] = useState('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
    const [referralCount, setReferralCount] = useState(0);
    const [userPoints, setUserPoints] = useState(0);
    const [pointsMessage, setPointsMessage] = useState('');

    // 获取设备ID后6位
    const getDeviceIdSuffix = (): string => {
        const deviceId = localStorage.getItem('device_id') || '';
        return deviceId.slice(-6).toUpperCase();
    };

    // 生成分享链接
    const getShareLink = (): string => {
        const baseUrl = window.location.origin;
        return `${baseUrl}?ref=${user?.id}&d=${getDeviceIdSuffix()}`;
    };

    // 加载配置
    useEffect(() => {
        fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getConfig' })
        })
            .then(res => res.json())
            .then(data => setConfig(data.config || {}))
            .catch(console.error);

        // 加载分享统计
        if (user?.id) {
            fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getReferralStats', userId: user.id })
            })
                .then(res => res.json())
                .then(data => setReferralCount(data.referralCount || 0))
                .catch(console.error);

            // 加载积分
            fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getPointsStats', userId: user.id })
            })
                .then(res => res.json())
                .then(data => setUserPoints(data.points || 0))
                .catch(console.error);
        }

        // 检查是否有待确认的订单
        const savedOrderId = localStorage.getItem('pending_order_id');
        if (savedOrderId) {
            setPendingOrderId(savedOrderId);
        }
    }, []);

    // 刷新用户信息并同步到父组件
    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUser', userId: user.id })
            });
            const data = await res.json();
            if (data.user) {
                // 通过回调同步更新父组件的 user 状态
                onUserUpdate?.({ ...user, credits: data.user.credits });
            }
        } catch (e) {
            console.error(e);
        }
    };

    // 兑换码兑换
    const handleRedeem = async () => {
        if (!redeemCode.trim()) return;
        setLoading(true);
        setMessage('');

        try {
            const deviceId = localStorage.getItem('device_id') || '';
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeem',
                    userId: user.id,
                    code: redeemCode.toUpperCase(),
                    deviceId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMessage('🎉 ' + data.message);
            setRedeemCode('');
            refreshUser();
        } catch (err: any) {
            setMessage('❌ ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 复制分享链接
    const copyShareLink = () => {
        navigator.clipboard.writeText(getShareLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 积分兑换申请
    const handlePointsRedeem = async (pointsUsed: number, rewardAmount: number) => {
        if (userPoints < pointsUsed) {
            setPointsMessage('❌ 积分不足');
            return;
        }

        setPointsMessage('提交中...');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeemPoints',
                    userId: user.id,
                    pointsUsed,
                    rewardAmount
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPointsMessage(`🎉 ${data.message}，请联系微信“${config.contact_wechat || 'sekesm'}”完成兑换`);
        } catch (err: any) {
            setPointsMessage('❌ ' + err.message);
        }
    };

    // 处理充值
    const handleRecharge = async (amount: number, creditsToAdd: number) => {
        // 检查支付宝配置
        if (!config.alipay_app_id || !config.alipay_private_key) {
            setRechargeMessage('⚠️ 支付功能配置中，请联系管理员');
            return;
        }

        setRechargeMessage(`正在创建订单...`);

        try {
            const res = await fetch('/api/alipay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createOrder',
                    userId: user.id,
                    amount,
                    credits: creditsToAdd
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // 保存订单ID用于返回后确认
            localStorage.setItem('pending_order_id', data.orderId);
            setPendingOrderId(data.orderId);

            setRechargeMessage('正在跳转支付宝...');

            // 跳转到支付宝支付页面
            window.location.href = data.payUrl;
        } catch (err: any) {
            setRechargeMessage('❌ ' + (err.message || '支付失败'));
        }
    };

    // 确认支付（支付完成后点击）
    const confirmPayment = async () => {
        if (!pendingOrderId) return;

        setLoading(true);
        setRechargeMessage('正在确认支付...');

        try {
            const res = await fetch('/api/alipay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'confirmOrder',
                    orderId: pendingOrderId,
                    userId: user.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setRechargeMessage(`✅ ${data.message}，已增加 ${data.credits} 次额度`);
            localStorage.removeItem('pending_order_id');
            setPendingOrderId(null);
            refreshUser();
        } catch (err: any) {
            setRechargeMessage('❌ ' + (err.message || '确认失败'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">会员中心</h2>
            </div>

            <div className="space-y-4">
                {/* 用户信息卡片 */}
                <div className="bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                            👤
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">@{user?.username}</h3>
                            <p className="text-white/80 text-xs">本机识别码: {getDeviceIdSuffix()}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <div className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center">
                            <span className="text-white/60 text-[10px]">剩余额度</span>
                            <span className="text-lg font-bold">{user?.credits || 0}</span>
                        </div>
                        <div className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center">
                            <span className="text-white/60 text-[10px]">推广收益(元)</span>
                            <span className="text-lg font-bold">¥{user?.commission_balance || '0.00'}</span>
                        </div>
                        <div className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center">
                            <span className="text-white/60 text-[10px]">奖励积分</span>
                            <span className="text-lg font-bold">{user?.points || 0}</span>
                        </div>
                    </div>
                </div>

                {/* 分享获客 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">📤 分享免费获得次数</h4>
                        <span className="text-sm text-pink-500 font-bold">已获得 {referralCount} 次</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                        分享专属链接，好友<span className="text-pink-500 font-bold">在手机浏览器</span>注册后您将获得1次额度 <span className="text-orange-500">⚠️ 好友必须在【手机浏览器】注册才能获得奖励（微信/QQ内注册无效）</span>
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={getShareLink()}
                            readOnly
                            className="flex-1 h-10 px-3 rounded-xl bg-gray-100 text-sm"
                        />
                        <button
                            onClick={copyShareLink}
                            className="px-4 h-10 bg-pink-500 text-white rounded-xl text-sm"
                        >
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                </div>

                {/* 推荐分佣说明 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💰</span>
                        <h4 className="font-bold">推荐赚佣金计划</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                        邀请好友体验，不仅能获得免费次数，还能赚取<span className="text-orange-500 font-bold">现金佣金</span>！
                    </p>
                    <div className="space-y-3 bg-orange-50 rounded-xl p-3">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs shrink-0">1</div>
                            <p className="text-xs text-orange-800 leading-relaxed">
                                <span className="font-bold">分享链接</span>：复制上方的分享链接发送给好友或分享到朋友圈。
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs shrink-0">2</div>
                            <p className="text-xs text-orange-800 leading-relaxed">
                                <span className="font-bold">好友注册</span>：好友通过您的专属链接完成账户注册。
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs shrink-0">3</div>
                            <p className="text-xs text-orange-800 leading-relaxed">
                                <span className="font-bold">获得佣金</span>：好友产生的任何充值消费，您都将获得<span className="text-red-500 font-bold">{config.commission_rate || '40'}%</span>的现金分佣，直接转入您的推广余额。
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-[10px] text-gray-400 text-center">
                        * 余额满额后可联系客服申请提现（微信：{config.contact_wechat || 'sekesm'}）
                    </p>
                </div>

                {/* 推荐奖励积分 (根据后台逻辑显示) */}
                {config.referral_points_enabled === 'true' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold">⭐ 推荐奖励积分</h4>
                            <span className="text-sm text-purple-500 font-bold">当前积分：{userPoints}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                            好友通过分享链接在<span className="text-pink-500 font-bold">手机浏览器</span>注册，您将获得<span className="text-purple-500 font-bold">1个积分</span>，积分可兑换奖励
                        </p>
                        <div className="bg-purple-50 rounded-xl p-3 mb-3">
                            <p className="text-xs text-purple-700 mb-1">🎁 奖励制度：</p>
                            <p className="text-xs text-purple-600">• 50积分 → 20元红包 &nbsp;&nbsp; • 100积分 → 50元红包</p>
                            <p className="text-xs text-blue-500 mt-1">💡 提示：积分仅限手机浏览器注册生效，微信/QQ内注册不计入</p>
                            <p className="text-xs text-orange-500 mt-2">⚠️ 点击兑换后，请联系微信“{config.contact_wechat || 'sekesm'}”完成兑换</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handlePointsRedeem(50, 20)}
                                disabled={userPoints < 50}
                                className={`h-16 rounded-xl border-2 transition-colors ${userPoints >= 50 ? 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' : 'border-gray-200 opacity-50 cursor-not-allowed'}`}
                            >
                                <div className="text-lg font-bold text-purple-500">50积分</div>
                                <div className="text-xs text-gray-500">→ 20元红包</div>
                            </button>
                            <button
                                onClick={() => handlePointsRedeem(100, 50)}
                                disabled={userPoints < 100}
                                className={`h-16 rounded-xl border-2 transition-colors ${userPoints >= 100 ? 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' : 'border-gray-200 opacity-50 cursor-not-allowed'}`}
                            >
                                <div className="text-lg font-bold text-purple-500">100积分</div>
                                <div className="text-xs text-gray-500">→ 50元红包</div>
                            </button>
                        </div>
                        {pointsMessage && (
                            <p className={`mt-3 text-sm text-center ${pointsMessage.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                                {pointsMessage}
                            </p>
                        )}
                    </div>
                )}

                {/* 充值 (根据后台开关显示) */}
                {config.recharge_enabled === 'true' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h4 className="font-bold mb-2">💰 充值次数</h4>

                        {/* 待确认订单提示 */}
                        {pendingOrderId && (
                            <div className="mb-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                                <p className="text-sm text-yellow-700 mb-2">📌 您有待确认的充值订单</p>
                                <button
                                    onClick={confirmPayment}
                                    disabled={loading}
                                    className="w-full h-10 bg-yellow-500 text-white rounded-xl font-bold"
                                >
                                    {loading ? '确认中...' : '已支付完成？点击确认'}
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleRecharge(9.9, 12)}
                                className="h-20 rounded-xl border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 transition-colors"
                            >
                                <div className="text-2xl font-bold text-pink-500">12次</div>
                                <div className="text-sm text-gray-500">¥9.9</div>
                            </button>
                            <button
                                onClick={() => handleRecharge(19.9, 30)}
                                className="h-20 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                            >
                                <div className="text-2xl font-bold text-purple-500">30次</div>
                                <div className="text-sm text-gray-500">¥19.9</div>
                            </button>
                        </div>
                        {rechargeMessage && (
                            <p className="mt-3 text-sm text-center text-orange-500">{rechargeMessage}</p>
                        )}
                    </div>
                )}

                {/* 兑换码 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h4 className="font-bold mb-2">🎁 兑换码</h4>
                    <p className="text-xs text-gray-400 mb-1">
                        一个兑换码可免费获得<span className="text-pink-500 font-bold">5次</span>使用额度，每月可兑换一次
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                        添加微信"<span className="text-pink-500">{config.contact_wechat || 'sekesm'}</span>"，免费获得兑换码
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={redeemCode}
                            onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="输入兑换码"
                            className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
                            maxLength={9}
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={loading}
                            className="px-4 h-10 bg-purple-500 text-white rounded-xl text-sm"
                        >
                            {loading ? '...' : '兑换'}
                        </button>
                    </div>
                    {message && (
                        <p className={`mt-2 text-sm ${message.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                            {message}
                        </p>
                    )}
                </div>

                {/* 退出登录 */}
                <button
                    onClick={onLogout}
                    className="w-full h-12 border border-gray-200 rounded-2xl text-gray-500"
                >
                    退出登录
                </button>
            </div>
        </div>
    );
};

export default MemberView;
