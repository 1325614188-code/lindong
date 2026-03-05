import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api-config';

interface MemberViewProps {
    user: any;
    onLogout: () => void;
    onBack: () => void;
    onUserUpdate?: (user: any) => void;
}

const MemberView: React.FC<MemberViewProps> = ({ user, onLogout, onBack, onUserUpdate }) => {
    const [redeemCode, setRedeemCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copied, setCopied] = useState(false);
    const [rechargeMessage, setRechargeMessage] = useState('');
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
    const [referralCount, setReferralCount] = useState(0);
    const [referralHistory, setReferralHistory] = useState<any[]>([]);
    const [userPoints, setUserPoints] = useState(0);
    const [pointsMessage, setPointsMessage] = useState('');

    // 获取设备ID后6位
    const getDeviceIdSuffix = (): string => {
        const deviceId = localStorage.getItem('device_id') || '';
        if (!deviceId) return 'UNKNOWN';
        return deviceId.slice(-6).toUpperCase();
    };

    // 生成分享链接：固定生产域名
    const getShareLink = (): string => {
        const baseUrl = 'https://www.qczj.xyz';
        const deviceId = localStorage.getItem('device_id') || 'GUEST';

        // 计算基于 deviceId 的2位字母校验码
        let hash = 0;
        for (let i = 0; i < deviceId.length; i++) {
            hash = (hash << 5) - hash + deviceId.charCodeAt(i);
            hash |= 0;
        }
        const char1 = String.fromCharCode(65 + Math.abs(hash) % 26);
        const char2 = String.fromCharCode(65 + Math.abs(hash >> 5) % 26);

        const shortCode = `${deviceId.slice(-6).toUpperCase()}${char1}${char2}`;
        return `${baseUrl}?ref=${shortCode}`;
    };

    // 加载配置和统计
    useEffect(() => {
        const loadStats = async () => {
            try {
                const ts = Date.now();

                // 【问题4修复】将配置、统计、历史、积分 4 个请求合并为并发执行，减少约 75% 等待时间
                const requests: Promise<Response>[] = [
                    // 0: 获取配置
                    fetch(getApiUrl('/api/admin'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getConfig' })
                    }),
                ];

                if (user?.id) {
                    // 1: 分享统计
                    requests.push(fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getReferralStats', userId: user.id })
                    }));
                    // 2: 推荐历史
                    requests.push(fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getReferralHistory', userId: user.id })
                    }));
                    // 3: 积分
                    requests.push(fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getPointsStats', userId: user.id })
                    }));
                }

                // NOTE: 使用 allSettled 替代 all，确保单个请求失败不影响其他请求的结果
                const results = await Promise.allSettled(requests);

                // 处理配置
                if (results[0].status === 'fulfilled' && results[0].value.ok) {
                    const adminData = await results[0].value.json();
                    setConfig(adminData.config || {});
                }

                if (user?.id) {
                    // 处理分享统计
                    if (results[1]?.status === 'fulfilled' && results[1].value.ok) {
                        const statsData = await results[1].value.json();
                        setReferralCount(statsData.referralCount || 0);
                    }
                    // 处理推荐历史
                    if (results[2]?.status === 'fulfilled' && results[2].value.ok) {
                        const historyData = await results[2].value.json();
                        setReferralHistory(historyData.history || []);
                    }
                    // 处理积分
                    if (results[3]?.status === 'fulfilled' && results[3].value.ok) {
                        const pointsData = await results[3].value.json();
                        setUserPoints(pointsData.points || 0);
                    }
                }
            } catch (err) {
                console.error('Failed to load member stats:', err);
            }
        };

        loadStats();

        const savedOrderId = localStorage.getItem('pending_order_id');
        if (savedOrderId) setPendingOrderId(savedOrderId);
    }, [user?.id]);


    // 支付查询逻辑
    useEffect(() => {
        if (!pendingOrderId) return;
        let pollCount = 0;
        const maxPolls = 100;

        const pollStatus = async () => {
            if (pollCount >= maxPolls) {
                setRechargeMessage('⚠️ 支付超时，请联系客服');
                localStorage.removeItem('pending_order_id');
                setPendingOrderId(null);
                return;
            }
            pollCount++;

            try {
                const ts = Date.now();
                const res = await fetch(getApiUrl(`/api/alipay?t=${ts}`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'checkOrder', orderId: pendingOrderId })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'paid') {
                        setRechargeMessage(`✅ 充值成功！自动为您增加了 ${data.credits} 次额度`);
                        localStorage.removeItem('pending_order_id');
                        setPendingOrderId(null);
                        setTimeout(() => refreshUser(), 2000);
                    }
                }
            } catch (err) { console.error(err); }
        };

        const timer = setInterval(pollStatus, 3000);
        return () => clearInterval(timer);
    }, [pendingOrderId]);

    const refreshUser = async () => {
        try {
            if (!user?.id) return;
            const ts = Date.now();
            const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUser', userId: user.id })
            });
            const data = await res.json();
            if (data.user) onUserUpdate?.(data.user);
        } catch (e) { console.error(e); }
    };

    const handleRedeem = async () => {
        if (!redeemCode.trim() || !user?.id) return;
        setLoading(true);
        setMessage('');
        try {
            const deviceId = localStorage.getItem('device_id') || '';
            const ts = Date.now();
            const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeem', userId: user.id, code: redeemCode.toUpperCase(), deviceId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage('🎉 ' + data.message);
            setRedeemCode('');
            refreshUser();
        } catch (err: any) { setMessage('❌ ' + err.message); } finally { setLoading(false); }
    };

    const copyShareLink = () => {
        const link = getShareLink();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                alert('复制失败，请手动长按输入框复制：' + link);
            });
        } else {
            alert('当前浏览器不支持自动复制，请手动复制：' + link);
        }
    };

    const handlePointsRedeem = async (pointsUsed: number, rewardAmount: number) => {
        if (userPoints < pointsUsed || !user?.id) return;
        setPointsMessage('提交中...');
        try {
            const ts = Date.now();
            const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeemPoints', userId: user.id, pointsUsed, rewardAmount })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPointsMessage(`🎉 ${data.message}，请联系微信“${config.contact_wechat || 'sekesm'}”完成兑换`);
        } catch (err: any) { setPointsMessage('❌ ' + err.message); }
    };

    const handleRecharge = async (amount: number, creditsToAdd: number) => {
        if (!config.alipay_app_id || !config.alipay_private_key) {
            setRechargeMessage('⚠️ 支付功能配置中，请联系管理员');
            return;
        }
        setRechargeMessage(`正在创建订单...`);
        try {
            const res = await fetch(getApiUrl('/api/alipay'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createOrder', userId: user.id, amount, credits: creditsToAdd })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            localStorage.setItem('pending_order_id', data.orderId);
            setPendingOrderId(data.orderId);
            setRechargeMessage('正在跳转支付宝...');
            window.location.href = data.payUrl;
        } catch (err: any) { setRechargeMessage('❌ ' + (err.message || '支付失败')); }
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl p-2 active:bg-pink-50 rounded-full transition-colors">←</button>
                <h2 className="text-xl font-bold">会员中心</h2>
            </div>

            <div className="space-y-4">
                {/* 用户信息卡片 */}
                <div className="bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">👤</div>
                        <div>
                            <h3 className="text-lg font-bold">@{user?.username || '用户'}</h3>
                            <span className="text-white/80 text-[10px]">本机识别码: {getDeviceIdSuffix()}</span>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <div onClick={refreshUser} className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center cursor-pointer hover:bg-black/20 transition-all">
                            <span className="text-white/60 text-[10px]">剩余额度</span>
                            <span className="text-lg font-bold">{user?.credits || 0}</span>
                        </div>
                        <div onClick={refreshUser} className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center cursor-pointer hover:bg-black/20 transition-all">
                            <span className="text-white/60 text-[10px]">推广收益(元)</span>
                            <span className="text-lg font-bold">¥{user?.commission_balance || '0.00'}</span>
                        </div>
                        <div onClick={refreshUser} className="flex-1 bg-black/10 rounded-xl px-3 py-2 flex flex-col items-center cursor-pointer hover:bg-black/20 transition-all">
                            <span className="text-white/60 text-[10px]">奖励积分</span>
                            <span className="text-lg font-bold">{user?.points || 0}</span>
                        </div>
                    </div>
                </div>

                {/* 分享获客 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">📤 分享获得次数</h4>
                        <span className="text-sm text-pink-500 font-bold">已获得 {referralCount} 次</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">分享专属链接，好友完成注册后您将获得 1 次额度奖励！推广越多，奖励越多。</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={getShareLink()}
                            readOnly
                            className="flex-1 h-10 px-3 rounded-xl bg-gray-100 text-sm border-0 focus:ring-0"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button onClick={copyShareLink} className="px-4 h-10 bg-pink-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">
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
                    <p className="text-sm text-gray-500 mb-3">邀请好友体验，还能赚取现金佣金！</p>
                    <div className="space-y-3 bg-orange-50 rounded-xl p-3 text-xs text-orange-800">
                        <p><span className="font-bold">1. 分享链接</span>：复制上方链接发送给好友。</p>
                        <p><span className="font-bold">2. 好友注册</span>：好友通过链接完成账户注册。</p>
                        <p><span className="font-bold">3. 获得佣金</span>：好友充值，你得 <span className="text-red-500 font-bold">{config.commission_rate || '40'}%</span> 分佣。</p>
                    </div>
                    <p className="mt-3 text-[10px] text-gray-400 text-center">* 满额后联系微信：{config.contact_wechat || 'sekesm'} 提现</p>
                </div>

                {/* 积分兑换 */}
                {config.referral_points_enabled === 'true' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold">⭐ 积分兑换</h4>
                            <span className="text-sm text-purple-500 font-bold">当前积分：{userPoints}</span>
                        </div>
                        {/* 积分获取说明 */}
                        <div className="bg-purple-50 rounded-xl p-3 mb-3 text-xs text-purple-700 leading-relaxed">
                            <p className="font-bold mb-1">📣 如何获得积分？</p>
                            <p>成功分享一个新用户（好友通过你的链接注册），即可获得 <span className="font-bold text-purple-600">1 个积分</span>。积分可兑换现金红包奖励！</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 mb-3 text-xs text-purple-600">
                            <p>🎁 {config.points_threshold_1 || '50'}积分 → {config.points_reward_1 || '20'}元红包 &nbsp;&nbsp; • {config.points_threshold_2 || '100'}积分 → {config.points_reward_2 || '50'}元红包</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handlePointsRedeem(
                                    Number(config.points_threshold_1 || 50),
                                    Number(config.points_reward_1 || 20)
                                )}
                                disabled={userPoints < Number(config.points_threshold_1 || 50)}
                                className={`h-16 rounded-xl border-2 transition-all ${userPoints >= Number(config.points_threshold_1 || 50) ? 'border-purple-300 active:bg-purple-50' : 'border-gray-200 opacity-50'}`}
                            >
                                <div className="text-lg font-bold text-purple-500">{config.points_threshold_1 || '50'}积分</div>
                                <div className="text-[10px] text-gray-500">换 {config.points_reward_1 || '20'}元红包</div>
                            </button>
                            <button
                                onClick={() => handlePointsRedeem(
                                    Number(config.points_threshold_2 || 100),
                                    Number(config.points_reward_2 || 50)
                                )}
                                disabled={userPoints < Number(config.points_threshold_2 || 100)}
                                className={`h-16 rounded-xl border-2 transition-all ${userPoints >= Number(config.points_threshold_2 || 100) ? 'border-purple-300 active:bg-purple-50' : 'border-gray-200 opacity-50'}`}
                            >
                                <div className="text-lg font-bold text-purple-500">{config.points_threshold_2 || '100'}积分</div>
                                <div className="text-[10px] text-gray-500">换 {config.points_reward_2 || '50'}元红包</div>
                            </button>
                        </div>
                        {pointsMessage && <p className="mt-3 text-sm text-center text-purple-500">{pointsMessage}</p>}
                    </div>
                )}


                {/* 充值 */}
                {config.recharge_enabled === 'true' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h4 className="font-bold mb-3">💎 充值额度</h4>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <button onClick={() => handleRecharge(9.9, 12)} className="h-20 rounded-xl border-2 border-pink-100 active:bg-pink-50">
                                <div className="text-xl font-bold text-pink-500">12次</div>
                                <div className="text-sm text-gray-400">¥9.9</div>
                            </button>
                            <button onClick={() => handleRecharge(19.9, 30)} className="h-20 rounded-xl border-2 border-purple-100 active:bg-purple-50">
                                <div className="text-xl font-bold text-purple-500">30次</div>
                                <div className="text-sm text-gray-400">¥19.9</div>
                            </button>
                        </div>
                        {rechargeMessage && <p className="mt-3 text-sm text-center text-orange-500">{rechargeMessage}</p>}
                    </div>
                )}

                {/* 兑换码 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h4 className="font-bold mb-2">🎁 兑换码</h4>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={redeemCode}
                            onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="输入兑换码"
                            className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm"
                        />
                        <button onClick={handleRedeem} disabled={loading} className="px-4 h-10 bg-purple-500 text-white rounded-xl text-sm font-bold">
                            {loading ? '...' : '兑换'}
                        </button>
                    </div>
                    {message && <p className={`mt-2 text-sm ${message.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                </div>

                <button onClick={onLogout} className="w-full h-12 border border-blue-100 rounded-2xl text-blue-400 font-bold active:bg-blue-50 transition-colors">退出登录</button>

                {/* 推荐记录 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">👥</span>
                        <h4 className="font-bold">推荐记录</h4>
                    </div>
                    {referralHistory.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">暂无推荐记录</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex text-xs text-gray-400 border-b pb-2">
                                <div className="flex-1">用户</div>
                                <div className="w-20 text-center shrink-0">注册时间</div>
                                <div className="w-20 text-center shrink-0">浏览器注册</div>
                                <div className="w-16 text-right shrink-0">充值金额</div>
                            </div>
                            {referralHistory.map((record: any, index: number) => (
                                <div key={index} className="flex items-center text-sm py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex-1 font-medium text-gray-700 truncate pr-1">{record.username}</div>
                                    <div className="w-20 text-xs text-gray-500 text-center shrink-0">
                                        {new Date(record.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="w-20 text-xs text-center shrink-0">
                                        {record.register_env === 'browser'
                                            ? <span className="text-green-500">✅是</span>
                                            : (record.register_env === 'unknown' ? <span className="text-gray-400">❓未知</span> : <span className="text-red-400">❌否</span>)
                                        }
                                    </div>
                                    <div className="w-16 text-right text-orange-500 font-bold shrink-0">
                                        ¥{(record.total_recharge || 0).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberView;
