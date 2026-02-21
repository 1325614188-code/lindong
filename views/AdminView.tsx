import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api-config';

interface AdminViewProps {
    admin: any;
    onBack: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ admin, onBack }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, totalOrders: 0 });
    const [editingCredits, setEditingCredits] = useState<{ id: string; amount: number } | null>(null);
    const [editingPoints, setEditingPoints] = useState<{ id: string; amount: number } | null>(null);
    const [pointRedemptions, setPointRedemptions] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'commissions' | 'config'>('users');

    // 加载数据
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 初始化管理员
            await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'initAdmin' })
            });

            // 获取用户列表
            const usersRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUsers', adminId: admin.id })
            });
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);

            // 获取配置
            const configRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getConfig', adminId: admin.id })
            });
            const configData = await configRes.json();
            setConfig(configData.config || {});

            // 获取统计
            const statsRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getStats', adminId: admin.id })
            });
            const statsData = await statsRes.json();
            setStats(statsData);

            // 获取积分兑换申请
            const redemptionsRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getPointRedemptions', adminId: admin.id })
            });
            const redemptionsData = await redemptionsRes.json();
            setPointRedemptions(redemptionsData.redemptions || []);

            // 获取佣金记录
            const commissionsRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getCommissions', adminId: admin.id })
            });
            const commissionsData = await commissionsRes.json();
            setCommissions(commissionsData.commissions || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 更新配置
    const updateConfig = async (key: string, value: string) => {
        try {
            await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateConfig', adminId: admin.id, key, value })
            });
            setConfig({ ...config, [key]: value });
        } catch (e) {
            console.error(e);
        }
    };

    // 更新用户额度
    const updateCredits = async (userId: string, amount: number) => {
        try {
            await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateCredits', adminId: admin.id, userId, amount })
            });
            setEditingCredits(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    // 更新用户积分
    const updatePoints = async (userId: string, amount: number) => {
        try {
            await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updatePoints', adminId: admin.id, userId, amount })
            });
            setEditingPoints(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    // 处理积分兑换申请
    const processRedemption = async (redemptionId: string, approved: boolean) => {
        setProcessingId(redemptionId);
        try {
            await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'processPointRedemption',
                    adminId: admin.id,
                    redemptionId,
                    approved
                })
            });
            loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">管理后台</h2>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-pink-400 to-pink-500 rounded-2xl p-4 text-white">
                    <div className="text-white/80 text-sm">注册用户</div>
                    <div className="text-3xl font-bold">{stats.totalUsers}</div>
                </div>
                <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl p-4 text-white">
                    <div className="text-white/80 text-sm">付费订单</div>
                    <div className="text-3xl font-bold">{stats.totalOrders}</div>
                </div>
            </div>

            {/* Tab 切换 */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-500'}`}
                >
                    👥 用户管理
                </button>
                <button
                    onClick={() => setActiveTab('commissions')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'commissions' ? 'bg-white shadow-sm text-orange-500' : 'text-gray-500'}`}
                >
                    💰 佣金流水
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-white shadow-sm text-purple-500' : 'text-gray-500'}`}
                >
                    ⚙️ 系统配置
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-6">
                    {/* 积分兑换申请 */}
                    {pointRedemptions.filter(r => r.status === 'pending').length > 0 && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                            <h3 className="font-bold mb-4 font-bold text-pink-500">🌟 积分兑换申请 ({pointRedemptions.filter(r => r.status === 'pending').length})</h3>
                            <div className="space-y-3">
                                {pointRedemptions.filter(r => r.status === 'pending').map(redemption => (
                                    <div key={redemption.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                                        <div>
                                            <p className="font-bold text-sm">@{redemption.username || redemption.user_id}</p>
                                            <p className="text-xs text-gray-500">
                                                {redemption.points_used}积分 → {redemption.reward_amount}元红包
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => processRedemption(redemption.id, true)}
                                                disabled={processingId === redemption.id}
                                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold"
                                            >
                                                {processingId === redemption.id ? '...' : '批准'}
                                            </button>
                                            <button
                                                onClick={() => processRedemption(redemption.id, false)}
                                                disabled={processingId === redemption.id}
                                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold"
                                            >
                                                拒绝
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 用户列表 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold mb-4">👥 用户管理</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-2">用户名</th>
                                        <th className="pb-2 text-nowrap">额度</th>
                                        <th className="pb-2 text-nowrap">积分</th>
                                        <th className="pb-2 text-nowrap">收益</th>
                                        <th className="pb-2">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-gray-100">
                                            <td className="py-3">
                                                <div className="font-bold">{u.nickname || '未命名'}</div>
                                                <div className="text-[10px] text-gray-400">@{u.username}</div>
                                            </td>
                                            <td className="py-3">
                                                <div onClick={() => setEditingCredits({ id: u.id, amount: u.credits })} className="cursor-pointer">
                                                    {editingCredits?.id === u.id ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={editingCredits.amount}
                                                            onChange={e => setEditingCredits({ ...editingCredits, amount: parseInt(e.target.value) || 0 })}
                                                            onBlur={() => updateCredits(u.id, editingCredits.amount - u.credits)}
                                                            className="w-14 h-7 px-1 rounded border text-xs"
                                                        />
                                                    ) : (
                                                        <span className="text-pink-500 font-bold">{u.credits}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div onClick={() => setEditingPoints({ id: u.id, amount: u.points || 0 })} className="cursor-pointer">
                                                    {editingPoints?.id === u.id ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={editingPoints.amount}
                                                            onChange={e => setEditingPoints({ ...editingPoints, amount: parseInt(e.target.value) || 0 })}
                                                            onBlur={() => updatePoints(u.id, editingPoints.amount - u.points)}
                                                            className="w-14 h-7 px-1 rounded border text-xs"
                                                        />
                                                    ) : (
                                                        <span className="text-purple-500 font-bold">{u.points || 0}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-orange-500 font-bold">¥{u.commission_balance || '0.00'}</td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingCredits({ id: u.id, amount: u.credits })} className="text-xs text-blue-500">点此调额</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'commissions' && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold mb-4 capitalize">💰 推广佣金明细</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2">获利用户</th>
                                    <th className="pb-2">来源</th>
                                    <th className="pb-2">金额</th>
                                    <th className="pb-2">时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.map(req => (
                                    <tr key={req.id} className="border-b border-gray-100">
                                        <td className="py-3 font-bold">{req.users?.nickname || req.users?.username}</td>
                                        <td className="py-3 text-gray-500 text-xs">{req.source_user?.username} 充值</td>
                                        <td className="py-3 text-green-600 font-bold">+{req.amount}元</td>
                                        <td className="py-3 text-gray-400 text-[10px]">{new Date(req.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {commissions.length === 0 && (
                            <div className="py-10 text-center text-gray-400 text-xs">暂无佣金记录</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="space-y-6">
                    {/* 配置管理 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold mb-4">⚙️ 系统配置</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <label className="w-28 text-sm text-gray-500 shrink-0">联系微信</label>
                                <input
                                    type="text"
                                    value={config.contact_wechat || ''}
                                    onChange={e => updateConfig('contact_wechat', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
                                    placeholder="例如: sekesm"
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">充值开关</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">控制会员中心充值入口</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('recharge_enabled', config.recharge_enabled === 'true' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.recharge_enabled === 'true' ? 'bg-pink-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.recharge_enabled === 'true' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">推荐奖励积分</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">控制注册是否赠送积分</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('referral_points_enabled', config.referral_points_enabled === 'true' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.referral_points_enabled === 'true' ? 'bg-purple-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.referral_points_enabled === 'true' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                <label className="w-28 text-sm font-bold shrink-0">佣金比例 (%)</label>
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={config.commission_rate || '40'}
                                        onChange={e => updateConfig('commission_rate', e.target.value)}
                                        className="w-20 h-10 px-3 rounded-xl border border-gray-200 text-center font-bold text-orange-500"
                                        placeholder="40"
                                    />
                                    <span className="text-sm text-gray-500">好友支付后返还给推荐人的比例</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 支付宝配置 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold mb-4">💰 支付宝配置</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <label className="w-28 text-sm text-gray-500 shrink-0">AppID</label>
                                <input
                                    type="text"
                                    value={config.alipay_app_id || ''}
                                    onChange={e => updateConfig('alipay_app_id', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
                                    placeholder="支付宝应用AppID"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-500">应用私钥 (明文)</label>
                                <textarea
                                    value={config.alipay_private_key || ''}
                                    onChange={e => updateConfig('alipay_private_key', e.target.value)}
                                    className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono"
                                    placeholder="MIIEvgIBADANBgkqhkiG9w0BAQEFAASC..."
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-500">支付宝公钥 (明文)</label>
                                <textarea
                                    value={config.alipay_public_key || ''}
                                    onChange={e => updateConfig('alipay_public_key', e.target.value)}
                                    className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono"
                                    placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="w-28 text-sm text-gray-500 shrink-0">支付网关</label>
                                <input
                                    type="text"
                                    value={config.alipay_gateway || 'https://openapi.alipay.com/gateway.do'}
                                    onChange={e => updateConfig('alipay_gateway', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm"
                                    placeholder="https://openapi.alipay.com/gateway.do"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="w-28 text-sm text-gray-500 shrink-0">回调地址</label>
                                <input
                                    type="text"
                                    value={config.alipay_notify_url || ''}
                                    onChange={e => updateConfig('alipay_notify_url', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm"
                                    placeholder="https://yourdomain.com/api/alipay/notify"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
