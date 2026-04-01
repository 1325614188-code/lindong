import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api-config';

interface MemberViewProps {
    user: any;
    onLogout: () => void;
    onBack: () => void;
    onUserUpdate?: (user: any) => void;
}

const ScrollingLeaderboard: React.FC<{ title: string; dataString?: string; type: 'gold' | 'silver' }> = ({ title, dataString, type }) => {
    const data = React.useMemo(() => {
        try {
            const parsed = JSON.parse(dataString || '[]');
            return Array.isArray(parsed) ? parsed.filter((item: any) => item.user || item.amount) : [];
        } catch (e) {
            return [];
        }
    }, [dataString]);

    if (data.length === 0) return null;

    const bgClass = type === 'gold' ? 'bg-amber-50 border-amber-200 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]' : 'bg-gray-50 border-gray-200 shadow-[inset_0_0_10px_rgba(156,163,175,0.1)]';
    const titleClass = type === 'gold' ? 'text-amber-800' : 'text-gray-600';
    const accentClass = type === 'gold' ? 'bg-amber-500/10 text-amber-700' : 'bg-gray-500/10 text-gray-500';

    return (
        <div className={`flex-1 rounded-2xl border ${bgClass} p-3 overflow-hidden h-[180px] flex flex-col relative`}>
            <h5 className={`text-[11px] font-bold mb-3 text-center ${titleClass} flex items-center justify-center gap-1`}>
                {type === 'gold' ? '🏆' : '🥈'} {title}
            </h5>
            <div className="flex-1 overflow-hidden relative">
                <style>{`
                    @keyframes vertical-scroll {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(-50%); }
                    }
                    .animate-vertical-scroll {
                        animation: vertical-scroll 40s linear infinite;
                    }
                    .animate-vertical-scroll:hover {
                        animation-play-state: paused;
                    }
                `}</style>
                <div className="animate-vertical-scroll space-y-2">
                    {/* 重复两遍实现无缝滚动 */}
                    {[...data, ...data].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] py-1.5 border-b border-black/5 last:border-0">
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center font-bold text-[8px] ${accentClass}`}>
                                {(i % data.length) + 1}
                            </span>
                            <span className="flex-1 truncate px-2 text-gray-500 font-medium">@{item.user}</span>
                            <span className="font-bold text-orange-500 shrink-0">¥{item.amount}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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

    // 获取邀请码 (来自用户信息)
    const getInviteCode = (): string => {
        return user?.invite_code || '------';
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

    const copyInviteCode = () => {
        const code = getInviteCode();
        if (code === '------') {
            alert('请先登录以获取邀请码');
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                alert('复制失败，请手动记录邀请码：' + code);
            });
        } else {
            alert('请手动记录邀请码：' + code);
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

    const handleAlipay = async (amount: number, creditsToAdd: number) => {
        if (!config.alipay_app_id || !config.alipay_private_key) {
            setRechargeMessage('⚠️ 支付宝功能配置中，请联系管理员');
            return;
        }
        setRechargeMessage(`正在创建支付宝订单...`);
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

    const handleWechatPay = async (amount: number, creditsToAdd: number) => {
        if (config.wechat_pay_enabled !== 'true') {
            setRechargeMessage('⚠️ 微信支付暂未开启');
            return;
        }
        
        const isWechat = /MicroMessenger/i.test(navigator.userAgent);
        if (!isWechat) {
            setRechargeMessage('⚠️ 请在微信内打开此页面进行微信支付');
            return;
        }

        setRechargeMessage(`正在创建微信订单...`);
        try {
            // 如果用户没有 wechat_openid，说明是用户名登录且未绑定微信，需要先授权获取 openid
            if (!user.wechat_openid) {
                setRechargeMessage('⚠️ 请先点击“绑定微信”，完成后即可支付...');
                const res = await fetch(getApiUrl('/api/auth_v2'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getWechatAuthUrl', redirectUri: window.location.href.split('?')[0] })
                });
                const data = await res.json();
                if (data.url) {
                    setRechargeMessage('正在跳转微信授权绑定...');
                    window.location.href = data.url;
                    return;
                }
                throw new Error(data.error || '获取授权链接失败');
            }

            const res = await fetch(getApiUrl('/api/wechat_pay'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createOrder', userId: user.id, amount, credits: creditsToAdd, openid: user.wechat_openid })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setRechargeMessage('正在调起微信支付...');
            
            // @ts-ignore
            if (typeof WeixinJSBridge !== "undefined") {
                // @ts-ignore
                WeixinJSBridge.invoke(
                    'getBrandWCPayRequest', 
                    data.payParams,
                    (res: any) => {
                        if (res.err_msg === "get_brand_wcpay_request:ok") {
                            setRechargeMessage('✅ 支付成功，同步中...');
                            localStorage.setItem('pending_order_id', data.orderId);
                            setPendingOrderId(data.orderId);
                        } else {
                            setRechargeMessage('❌ 支付已取消或失败');
                        }
                    }
                );
            } else {
                setRechargeMessage('❌ 微信支付环境异常');
            }
        } catch (err: any) { setRechargeMessage('❌ ' + (err.message || '支付失败')); }
    };

    const [showPaySelect, setShowPaySelect] = useState<{amount: number, credits: number} | null>(null);

    const handleRechargeClick = (amount: number, credits: number) => {
        const alipayEnabled = config.alipay_app_id && config.alipay_private_key;
        const wechatEnabled = config.wechat_pay_enabled === 'true';

        if (alipayEnabled && wechatEnabled) {
            setShowPaySelect({ amount, credits });
        } else if (wechatEnabled) {
            handleWechatPay(amount, credits);
        } else if (alipayEnabled) {
            handleAlipay(amount, credits);
        } else {
            setRechargeMessage('⚠️ 暂未开启任何支付方式，请联系客服');
        }
    };

    const [withdrawalMessage, setWithdrawalMessage] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    const handleWithdrawal = async () => {
        const balance = Number(user?.commission_balance || 0);
        if (balance < 100) {
            setWithdrawalMessage('❌ 佣金满 100 元即可申请提现哦');
            setTimeout(() => setWithdrawalMessage(''), 3000);
            return;
        }

        if (!confirm(`确认申请提现全部佣金 ¥${balance} 吗？`)) return;

        setWithdrawing(true);
        setWithdrawalMessage('提交申请中...');
        try {
            const ts = Date.now();
            const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'requestCommissionWithdrawal', userId: user.id, amount: balance })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setWithdrawalMessage('🎉 ' + data.message);
            setTimeout(() => {
                setWithdrawalMessage('');
                refreshUser();
            }, 3000);
        } catch (err: any) {
            setWithdrawalMessage('❌ ' + err.message);
            setTimeout(() => setWithdrawalMessage(''), 3000);
        } finally {
            setWithdrawing(false);
        }
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

                {/* 邀请获客 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-pink-100">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎁</span>
                            <h4 className="font-bold">我的专属邀请码</h4>
                        </div>
                        <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold">已获奖励 {referralCount} 次</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 font-medium">让好友在注册时填写您的邀请码，双方均可获得奖励！</p>
                    
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div className="flex-1">
                            <div className="text-[10px] text-gray-400 font-bold ml-1 mb-1">PROMO CODE</div>
                            <div className="text-2xl font-black tracking-widest text-pink-500 ml-1">
                                {getInviteCode()}
                            </div>
                        </div>
                        <button 
                            onClick={copyInviteCode}
                            className="px-6 h-12 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2"
                        >
                            {copied ? '✅ 已复制' : '复制奖励码'}
                        </button>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-gray-400 font-medium">
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✔</span> 全平台通用
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✔</span> 永久有效
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✔</span> 上不封顶
                        </div>
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
                        <p><span className="font-bold">1. 分享奖励码</span>：复制您的专属邀请码发送给好友。</p>
                        <p><span className="font-bold">2. 好友注册</span>：好友在账户注册界面填入此码。</p>
                        <p><span className="font-bold">3. 获得奖励</span>：对方注册立得 5 次额度，好友充值你再得 <span className="text-red-500 font-bold">{config.commission_rate || '40'}%</span> 分佣。</p>
                    </div>

                    <div className="mt-4">
                        <button
                            onClick={handleWithdrawal}
                            disabled={withdrawing}
                            className={`w-full h-11 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${Number(user?.commission_balance || 0) >= 100 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                        >
                            <span className="text-lg">💰</span>
                            {withdrawing ? '处理中...' : (Number(user?.commission_balance || 0) >= 100 ? '申请提现' : '满100元起提')}
                        </button>
                        {withdrawalMessage && <p className={`mt-2 text-center text-xs font-medium ${withdrawalMessage.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>{withdrawalMessage}</p>}
                    </div>

                    <p className="mt-4 text-[10px] text-gray-400 text-center">* 满额后可直接点击上方按钮或联系微信：{config.contact_wechat || 'sekesm'} 提现</p>
                </div>

                {/* 实时榜单 (中间区域) */}
                <div className="flex gap-3 px-1">
                    <ScrollingLeaderboard 
                        title="推荐赚佣金榜" 
                        dataString={config.commission_leaderboard_data} 
                        type="gold" 
                    />
                    <ScrollingLeaderboard 
                        title="积分兑换榜" 
                        dataString={config.points_leaderboard_data} 
                        type="silver" 
                    />
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
                            <p>每成功邀请一位新用户（好友注册时填入你的邀请码），即可获得 <span className="font-bold text-purple-600">1 个积分</span>。积分可兑换现金红包奖励！</p>
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
                    <div className="bg-white rounded-2xl p-4 shadow-sm relative">
                        <h4 className="font-bold mb-3 italic">💎 充值额度 (限时特惠)</h4>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div 
                                onClick={() => handleRechargeClick(9.9, 12)} 
                                className="h-20 rounded-xl border-2 border-pink-100 active:bg-pink-50 flex flex-col items-center justify-center cursor-pointer hover:border-pink-300 transition-all"
                            >
                                <div className="text-xl font-bold text-pink-500">12次</div>
                                <div className="text-sm text-gray-400 font-medium">¥9.9</div>
                            </div>
                            <div 
                                onClick={() => handleRechargeClick(19.9, 30)} 
                                className="h-20 rounded-xl border-2 border-purple-100 active:bg-purple-50 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 transition-all"
                            >
                                <div className="text-xl font-bold text-purple-500">30次</div>
                                <div className="text-sm text-gray-400 font-medium">¥19.9</div>
                            </div>
                        </div>

                        {/* 支付方式选择弹窗 */}
                        {showPaySelect && (
                            <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl z-20 border-t border-pink-50 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h5 className="font-bold text-sm">选择支付方式</h5>
                                    <button onClick={() => setShowPaySelect(null)} className="text-gray-400 text-lg">×</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => { handleAlipay(showPaySelect.amount, showPaySelect.credits); setShowPaySelect(null); }}
                                        className="h-12 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <span className="text-base text-nowrap">支</span> 支付宝支付
                                    </button>
                                    <button 
                                        onClick={() => { handleWechatPay(showPaySelect.amount, showPaySelect.credits); setShowPaySelect(null); }}
                                        className="h-12 bg-green-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <span className="text-base text-nowrap">微</span> 微信支付
                                    </button>
                                </div>
                            </div>
                        )}

                        {rechargeMessage && <p className="mt-3 text-[10px] text-center text-orange-500 font-medium bg-orange-50 py-2 rounded-lg">{rechargeMessage}</p>}
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
                        <p className="text-sm text-gray-400 text-center py-4">暂无被邀请记录</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex text-xs text-gray-400 border-b pb-2">
                                <div className="flex-1">受邀用户</div>
                                <div className="w-20 text-center shrink-0">注册时间</div>
                                <div className="w-20 text-center shrink-0">注册终端</div>
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
