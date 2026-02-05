import React, { useState, useEffect } from 'react';

interface MemberViewProps {
    user: any;
    onLogout: () => void;
    onBack: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ user, onLogout, onBack }) => {
    const [credits, setCredits] = useState(user?.credits || 0);
    const [redeemCode, setRedeemCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copied, setCopied] = useState(false);

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
    }, []);

    // 刷新用户信息
    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUser', userId: user.id })
            });
            const data = await res.json();
            if (data.user) {
                setCredits(data.user.credits);
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

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">会员中心</h2>
            </div>

            <div className="space-y-4">
                {/* 用户信息卡片 */}
                <div className="bg-gradient-to-r from-pink-400 to-purple-500 rounded-3xl p-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                            👤
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{user?.nickname || user?.username}</h3>
                            <p className="text-white/80 text-sm">@{user?.username}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-white/80">剩余额度</span>
                        <span className="text-3xl font-bold">{credits} 次</span>
                    </div>
                </div>

                {/* 分享获客 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h4 className="font-bold mb-2">📤 分享免费获得次数</h4>
                    <p className="text-sm text-gray-500 mb-3">
                        分享专属链接，好友注册后您将获得1次额度
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

                {/* 兑换码 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h4 className="font-bold mb-2">🎁 兑换码</h4>
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

                {/* 充值 (根据后台开关显示) */}
                {config.recharge_enabled === 'true' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h4 className="font-bold mb-2">💰 充值次数</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="h-20 rounded-xl border-2 border-pink-200 hover:border-pink-400 transition-colors">
                                <div className="text-2xl font-bold text-pink-500">12次</div>
                                <div className="text-sm text-gray-500">¥9.9</div>
                            </button>
                            <button className="h-20 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors">
                                <div className="text-2xl font-bold text-purple-500">30次</div>
                                <div className="text-sm text-gray-500">¥19.9</div>
                            </button>
                        </div>
                    </div>
                )}

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
