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
    const [editingCredits, setEditingCredits] = useState<{ id: string; amount: number; original: number } | null>(null);
    const [editingPoints, setEditingPoints] = useState<{ id: string; amount: number; original: number } | null>(null);
    const [pointRedemptions, setPointRedemptions] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [withdrawalList, setWithdrawalList] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [aiUsage, setAiUsage] = useState<any[]>([]);
    const [recentAiLogs, setRecentAiLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'commissions' | 'withdrawals' | 'config' | 'ai'>('users');
    const [cBoard, setCBoard] = useState<any[]>(Array(20).fill({ user: '', amount: '' }));
    const [pBoard, setPBoard] = useState<any[]>(Array(20).fill({ user: '', amount: '' }));

    // 随机数据生成器
    const generateRandomData = (type: 'commission' | 'points') => {
        const prefixes = ['user', 'vip', 'member', 'beauty', 'star', 'lucky', 'pro', 'meili', 'app', 'win', 'cool', 'fast', 'top', 'pure', 'gold', 'silver', 'spark', 'joy', 'flow', 'wave'];
        const data = Array.from({ length: 20 }, (_, i) => ({
            user: prefixes[Math.floor(Math.random() * prefixes.length)] + (Math.floor(Math.random() * 900) + 100),
            amount: type === 'commission' 
                ? Math.floor(Math.random() * 500 + 100).toString() 
                : ([20, 50, 40, 60, 80, 100, 150, 200, 250][Math.floor(Math.random() * 9)]).toString()
        }));
        if (type === 'commission') setCBoard(data);
        else setPBoard(data);
        return data;
    };

    // 排行榜数据解析辅助
    const parseLeaderboard = (data?: string) => {
        try {
            if (!data) return Array(20).fill({ user: '', amount: '' });
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return Array(20).fill({ user: '', amount: '' });
            // 补齐到 20 行
            const full = [...parsed];
            while (full.length < 20) full.push({ user: '', amount: '' });
            return full.slice(0, 20);
        } catch (e) {
            return Array(20).fill({ user: '', amount: '' });
        }
    };

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

            // 初始化本地榜单数据
            if (configData.config?.commission_leaderboard_data) {
                setCBoard(parseLeaderboard(configData.config.commission_leaderboard_data));
            }
            if (configData.config?.points_leaderboard_data) {
                setPBoard(parseLeaderboard(configData.config.points_leaderboard_data));
            }

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

            // 获取佣金提现申请
            const withdrawalsRes = await fetch(getApiUrl('/api/auth_v2'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getWithdrawalList', isAdmin: true })
            });
            const withdrawalsData = await withdrawalsRes.json();
            setWithdrawalList(withdrawalsData.list || []);

            // 获取 AI 使用统计
            const aiRes = await fetch(getApiUrl('/api/admin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getAIUsage', adminId: admin.id })
            });
            const aiData = await aiRes.json();
            setAiUsage(aiData.stats || []);
            setRecentAiLogs(aiData.recentLogs || []);
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

    // 处理提现申请
    const handleProcessWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected') => {
        if (!confirm(`确认要${status === 'approved' ? '批准并标记为已兑付' : '拒绝'}这笔提现申请吗？`)) return;

        setProcessingId(withdrawalId);
        try {
            const res = await fetch(getApiUrl('/api/auth_v2'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'processWithdrawal',
                    isAdmin: true,
                    withdrawalId,
                    status,
                    adminNote: status === 'approved' ? '管理员已线下兑付' : '不符合提现要求'
                })
            });
            if (res.ok) {
                alert('处理成功');
                loadData();
            } else {
                const data = await res.json();
                alert('处理失败: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('请求异常');
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
                    💰 流水
                </button>
                <button
                    onClick={() => setActiveTab('withdrawals')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500'}`}
                >
                    🏧 提现
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-white shadow-sm text-purple-500' : 'text-gray-500'}`}
                >
                    ⚙️ 配置
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-indigo-500' : 'text-gray-500'}`}
                >
                    🤖 AI
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
                                                <div className="cursor-pointer min-h-[1.75rem] flex items-center">
                                                    {editingCredits?.id === u.id ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={editingCredits.amount}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => setEditingCredits({ ...editingCredits, amount: parseInt(e.target.value) || 0 })}
                                                            onBlur={() => {
                                                                const diff = editingCredits.amount - editingCredits.original;
                                                                if (diff !== 0) updateCredits(u.id, diff);
                                                                else setEditingCredits(null);
                                                            }}
                                                            className="w-16 h-7 px-1.5 rounded border-2 border-pink-300 text-xs font-bold outline-none"
                                                        />
                                                    ) : (
                                                        <span 
                                                            onClick={() => setEditingCredits({ id: u.id, amount: u.credits, original: u.credits })}
                                                            className="text-pink-500 font-bold hover:bg-pink-50 px-2 py-0.5 rounded transition-colors"
                                                        >
                                                            {u.credits}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="cursor-pointer min-h-[1.75rem] flex items-center">
                                                    {editingPoints?.id === u.id ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={editingPoints.amount}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => setEditingPoints({ ...editingPoints, amount: parseInt(e.target.value) || 0 })}
                                                            onBlur={() => {
                                                                const diff = editingPoints.amount - editingPoints.original;
                                                                if (diff !== 0) updatePoints(u.id, diff);
                                                                else setEditingPoints(null);
                                                            }}
                                                            className="w-16 h-7 px-1.5 rounded border-2 border-purple-300 text-xs font-bold outline-none"
                                                        />
                                                    ) : (
                                                        <span 
                                                            onClick={() => setEditingPoints({ id: u.id, amount: u.points || 0, original: u.points || 0 })}
                                                            className="text-purple-500 font-bold hover:bg-purple-50 px-2 py-0.5 rounded transition-colors"
                                                        >
                                                            {u.points || 0}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-orange-500 font-bold text-sm">¥{u.commission_balance || '0.00'}</td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setEditingCredits({ id: u.id, amount: u.credits, original: u.credits })} 
                                                        className="text-xs text-blue-500 font-medium hover:underline"
                                                    >
                                                        调额
                                                    </button>
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

            {activeTab === 'withdrawals' && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold mb-4">🏧 佣金提现管理</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2">申请用户</th>
                                    <th className="pb-2">金额</th>
                                    <th className="pb-2">状态</th>
                                    <th className="pb-2">时间</th>
                                    <th className="pb-2">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawalList.map(req => (
                                    <tr key={req.id} className="border-b border-gray-100">
                                        <td className="py-3">
                                            <div className="font-bold">{req.username}</div>
                                            <div className="text-[10px] text-gray-400">UID: {req.user_id?.slice(0, 8)}...</div>
                                        </td>
                                        <td className="py-3 text-red-500 font-bold">¥{req.amount}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${req.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                req.status === 'approved' ? 'bg-green-100 text-green-600' :
                                                    'bg-gray-100 text-gray-400'
                                                }`}>
                                                {req.status === 'pending' ? '待处理' : req.status === 'approved' ? '已支付' : '已拒绝'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-400 text-[10px] whitespace-nowrap">{new Date(req.created_at).toLocaleString()}</td>
                                        <td className="py-3">
                                            {req.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleProcessWithdrawal(req.id, 'approved')}
                                                        disabled={processingId === req.id}
                                                        className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold active:scale-95"
                                                    >批准支付</button>
                                                    <button
                                                        onClick={() => handleProcessWithdrawal(req.id, 'rejected')}
                                                        disabled={processingId === req.id}
                                                        className="px-3 py-1 bg-gray-200 text-gray-500 rounded-lg text-xs font-bold active:scale-95"
                                                    >拒绝</button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {withdrawalList.length === 0 && (
                            <div className="py-10 text-center text-gray-400 text-xs">暂无提现申请</div>
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
                            <div className="flex flex-col gap-2 p-3 bg-pink-50 rounded-xl border border-pink-100">
                                <label className="text-sm font-bold text-pink-700">📢 网站公告 (首页滚动展示)</label>
                                <textarea
                                    value={config.announcement || ''}
                                    onChange={e => updateConfig('announcement', e.target.value)}
                                    className="w-full h-20 px-3 py-2 rounded-xl border border-pink-200 text-sm"
                                    placeholder="请输入公告内容，例如：欢迎使用美力实验室！新版 APP 已发布，请及时下载更新。✨"
                                />
                            </div>
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
                                    <p className="font-bold text-sm">强制短信注册</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后新用户注册必须发短信验证</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('sms_registration_enabled', config.sms_registration_enabled === 'true' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.sms_registration_enabled === 'true' ? 'bg-pink-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.sms_registration_enabled === 'true' ? 'left-7' : 'left-1'}`} />
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
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">微信登录开关</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后微信环境下显示“微信一键登录”</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('wechat_login_enabled', config.wechat_login_enabled === 'true' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.wechat_login_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.wechat_login_enabled === 'true' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">微信支付开关</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后充值时可选微信支付 (需配置商户参数)</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('wechat_pay_enabled', config.wechat_pay_enabled === 'true' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.wechat_pay_enabled === 'true' ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.wechat_pay_enabled === 'true' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">首页下载按钮</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后首页显示“下载 APP”按钮</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('home_download_app_enabled', config.home_download_app_enabled !== 'false' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.home_download_app_enabled !== 'false' ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.home_download_app_enabled !== 'false' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">添加到桌面显示</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后首页显示“把网站添加到桌面”</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('home_add_to_desktop_enabled', config.home_add_to_desktop_enabled !== 'false' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.home_add_to_desktop_enabled !== 'false' ? 'bg-rose-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.home_add_to_desktop_enabled !== 'false' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-sm">非微信注册开关</p>
                                    <p className="text-[10px] text-gray-500 text-nowrap">开启后允许在非微信环境进行注册登录</p>
                                </div>
                                <button
                                    onClick={() => updateConfig('non_wechat_registration_enabled', config.non_wechat_registration_enabled !== 'false' ? 'false' : 'true')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${config.non_wechat_registration_enabled !== 'false' ? 'bg-orange-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.non_wechat_registration_enabled !== 'false' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <div>
                                    <p className="font-bold text-sm text-purple-700">AI 模型服务商</p>
                                    <p className="text-[10px] text-purple-500 text-nowrap">
                                        {config.ai_provider === 'gemini' ? '当前：Gemini API (耗 API Key)' : '当前：Vertex AI (耗 GCP 赠金)'}
                                    </p>
                                </div>
                                <div className="flex bg-gray-200 p-1 rounded-lg">
                                    <button
                                        onClick={() => updateConfig('ai_provider', 'vertex')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${config.ai_provider !== 'gemini' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        Vertex
                                    </button>
                                    <button
                                        onClick={() => updateConfig('ai_provider', 'gemini')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${config.ai_provider === 'gemini' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        Gemini
                                    </button>
                                </div>
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

                            {/* 积分兑换红包配置 */}
                            <div className="mt-2 p-3 bg-purple-50 rounded-xl space-y-3">
                                <p className="text-sm font-bold text-purple-700">⭐ 积分兑换红包配置</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">档位1：所需积分</label>
                                        <input
                                            type="number"
                                            value={config.points_threshold_1 || '50'}
                                            onChange={e => updateConfig('points_threshold_1', e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-purple-200 text-center font-bold text-purple-600 bg-white"
                                            placeholder="50"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">档位1：红包金额 (元)</label>
                                        <input
                                            type="number"
                                            value={config.points_reward_1 || '20'}
                                            onChange={e => updateConfig('points_reward_1', e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-purple-200 text-center font-bold text-pink-500 bg-white"
                                            placeholder="20"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">档位2：所需积分</label>
                                        <input
                                            type="number"
                                            value={config.points_threshold_2 || '100'}
                                            onChange={e => updateConfig('points_threshold_2', e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-purple-200 text-center font-bold text-purple-600 bg-white"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">档位2：红包金额 (元)</label>
                                        <input
                                            type="number"
                                            value={config.points_reward_2 || '50'}
                                            onChange={e => updateConfig('points_reward_2', e.target.value)}
                                            className="h-9 px-3 rounded-xl border border-purple-200 text-center font-bold text-pink-500 bg-white"
                                            placeholder="50"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400">修改后实时生效，用户端即时显示新金额</p>
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

                    {/* 微信支付配置 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-green-50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-green-600 flex items-center gap-2">
                                <span>🟢</span> 微信支付多商户管理
                            </h3>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                当前激活：商户 {config.wechat_pay_active_mch === '2' ? '2' : '1'}
                            </span>
                        </div>

                        <div className="space-y-8">
                            {/* 商户 1 配置 */}
                            <div className={`space-y-4 p-5 rounded-2xl border-2 transition-all ${config.wechat_pay_active_mch !== '2' ? 'border-green-400 bg-green-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                                        <span>账户 #1 (PRIMARY)</span>
                                    </h4>
                                    {config.wechat_pay_active_mch !== '2' ? (
                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">正在使用中 ●</span>
                                    ) : (
                                        <button
                                            onClick={() => updateConfig('wechat_pay_active_mch', '1')}
                                            className="bg-white border border-green-200 text-green-600 px-4 py-1.5 rounded-xl text-[10px] font-bold hover:bg-green-500 hover:text-white transition-all shadow-sm active:scale-95"
                                        >
                                            点击并启用商户 1
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">微信 AppID #1</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_app_id || ''}
                                            onChange={e => updateConfig('wechat_app_id', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="wx..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">商户号 #1 (MCH_ID)</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_mch_id || ''}
                                            onChange={e => updateConfig('wechat_pay_mch_id', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="156..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">V3 密钥 #1</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_api_v3_key || ''}
                                            onChange={e => updateConfig('wechat_pay_api_v3_key', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="API V3 Key"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">证书序列号 #1</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_serial_no || ''}
                                            onChange={e => updateConfig('wechat_pay_serial_no', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="Serial No"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] text-gray-400 font-bold ml-1">商户私钥 #1 (PEM)</label>
                                    <textarea
                                        autoComplete="off"
                                        value={config.wechat_pay_private_key || ''}
                                        onChange={e => updateConfig('wechat_pay_private_key', e.target.value)}
                                        className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-mono leading-tight focus:border-green-300 transition-all outline-none bg-white"
                                        placeholder="-----BEGIN PRIVATE KEY-----"
                                    />
                                </div>
                            </div>

                            {/* 分割线 */}
                            <div className="border-t border-dashed border-gray-200 my-2" />

                            {/* 商户 2 配置 */}
                            <div className={`space-y-4 p-5 rounded-2xl border-2 transition-all ${config.wechat_pay_active_mch === '2' ? 'border-green-400 bg-green-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                                        <span>账户 #2 (SECONDARY)</span>
                                    </h4>
                                    {config.wechat_pay_active_mch === '2' ? (
                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">正在使用中 ●</span>
                                    ) : (
                                        <button
                                            onClick={() => updateConfig('wechat_pay_active_mch', '2')}
                                            className="bg-white border border-green-200 text-green-600 px-4 py-1.5 rounded-xl text-[10px] font-bold hover:bg-green-500 hover:text-white transition-all shadow-sm active:scale-95"
                                        >
                                            点击并启用商户 2
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">微信 AppID #2</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_app_id_2 || ''}
                                            onChange={e => updateConfig('wechat_app_id_2', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="wx..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">商户号 #2</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_mch_id_2 || ''}
                                            onChange={e => updateConfig('wechat_pay_mch_id_2', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="商户号 2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">V3 密钥 #2</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_api_v3_key_2 || ''}
                                            onChange={e => updateConfig('wechat_pay_api_v3_key_2', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="API V3 Key 2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-gray-400 font-bold ml-1">证书序列号 #2</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={config.wechat_pay_serial_no_2 || ''}
                                            onChange={e => updateConfig('wechat_pay_serial_no_2', e.target.value)}
                                            className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-green-300 transition-all outline-none bg-white"
                                            placeholder="Serial No 2"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] text-gray-400 font-bold ml-1">商户私钥 #2 (PEM)</label>
                                    <textarea
                                        autoComplete="off"
                                        value={config.wechat_pay_private_key_2 || ''}
                                        onChange={e => updateConfig('wechat_pay_private_key_2', e.target.value)}
                                        className="w-full h-24 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-mono leading-tight focus:border-green-300 transition-all outline-none bg-white"
                                        placeholder="-----BEGIN PRIVATE KEY-----"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex flex-col gap-1 shrink-0">
                                    <label className="text-[10px] font-bold text-blue-700">通用回调地址</label>
                                    <p className="text-[8px] text-blue-400">Merchant Notify URL</p>
                                </div>
                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={config.wechat_pay_notify_url || ''}
                                    onChange={e => updateConfig('wechat_pay_notify_url', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-blue-200 text-xs text-blue-600 bg-white focus:border-blue-400 outline-none transition-all"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>



                    {/* 系统杂项与排行榜 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold mb-4">🏆 数据看板与通知</h3>
                        <div className="space-y-4">
                            {/* 排行榜配置 */}
                            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-amber-800 flex items-center gap-2">
                                        <span>🏆</span> 排行榜虚拟数据配置 (各20行)
                                    </h4>
                                    <button
                                        onClick={() => {
                                            const c = generateRandomData('commission');
                                            const p = generateRandomData('points');
                                            updateConfig('commission_leaderboard_data', JSON.stringify(c));
                                            updateConfig('points_leaderboard_data', JSON.stringify(p));
                                            alert('随机数据已填充并保存 ✨');
                                        }}
                                        className="text-[10px] bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-bold hover:bg-amber-300 transition-colors"
                                    >
                                        🎲 填充并保存随机数据
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {/* 佣金榜 */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-1 sticky top-0 bg-amber-50 z-10">💰 佣金榜 (金色)</p>
                                        {cBoard.map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <span className="w-5 text-xs text-amber-600 flex items-center">{i + 1}.</span>
                                                <input
                                                    type="text"
                                                    placeholder="用户名"
                                                    value={item.user || ''}
                                                    onChange={e => {
                                                        const newData = [...cBoard];
                                                        newData[i] = { ...newData[i], user: e.target.value };
                                                        setCBoard(newData);
                                                    }}
                                                    onBlur={() => updateConfig('commission_leaderboard_data', JSON.stringify(cBoard))}
                                                    className="flex-1 h-8 px-2 rounded-lg border border-amber-200 text-xs shadow-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="金额"
                                                    value={item.amount || ''}
                                                    onChange={e => {
                                                        const newData = [...cBoard];
                                                        newData[i] = { ...newData[i], amount: e.target.value };
                                                        setCBoard(newData);
                                                    }}
                                                    onBlur={() => updateConfig('commission_leaderboard_data', JSON.stringify(cBoard))}
                                                    className="w-16 h-8 px-2 rounded-lg border border-amber-200 text-xs text-center shadow-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* 积分榜 */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 sticky top-0 bg-amber-50 z-10">⭐ 积分兑换榜 (银色)</p>
                                        {pBoard.map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <span className="w-5 text-xs text-gray-400 flex items-center">{i + 1}.</span>
                                                <input
                                                    type="text"
                                                    placeholder="用户名"
                                                    value={item.user || ''}
                                                    onChange={e => {
                                                        const newData = [...pBoard];
                                                        newData[i] = { ...newData[i], user: e.target.value };
                                                        setPBoard(newData);
                                                    }}
                                                    onBlur={() => updateConfig('points_leaderboard_data', JSON.stringify(pBoard))}
                                                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-xs shadow-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="金额"
                                                    value={item.amount || ''}
                                                    onChange={e => {
                                                        const newData = [...pBoard];
                                                        newData[i] = { ...newData[i], amount: e.target.value };
                                                        setPBoard(newData);
                                                    }}
                                                    onBlur={() => updateConfig('points_leaderboard_data', JSON.stringify(pBoard))}
                                                    className="w-16 h-8 px-2 rounded-lg border border-gray-200 text-xs text-center shadow-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[10px] text-amber-600 mt-4">* 已扩展至 20 行，由于条目较多，现已开启内部滚动查看。</p>
                            </div>

                            {/* 兑换码生成器 */}
                            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border-2 border-purple-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">🛠️</span>
                                    <h3 className="font-bold">兑换码生成助手 (算法同步)</h3>
                                </div>
                                
                                <div className="bg-purple-50 rounded-xl p-3 mb-4 text-[10px] text-purple-700 leading-relaxed">
                                    <p className="font-bold mb-1">💡 使用说明：</p>
                                    <p>生成的兑换码遵循今日日期算法（DD AA XX BBB），即发即用。建议每次生成少量并及时分配。兑换码全局唯一，一旦某人成功兑换，该字符串即作废。</p>
                                </div>

                                <div className="flex gap-2 items-end mb-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-gray-400 font-bold mb-1 ml-1">生成数量</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="50"
                                            id="gen-count"
                                            defaultValue="5"
                                            className="w-full h-10 px-4 rounded-xl border border-gray-200 focus:border-purple-300 transition-all text-sm outline-none font-bold"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const count = parseInt((document.getElementById('gen-count') as HTMLInputElement).value) || 5;
                                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                                            
                                            // 计算北京时间日期组件
                                            const now = new Date();
                                            const beijingOffset = 8 * 60; 
                                            const localOffset = now.getTimezoneOffset();
                                            const bjTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
                                            
                                            const dd = String(bjTime.getDate()).padStart(2, '0');
                                            const future = new Date(bjTime);
                                            future.setDate(bjTime.getDate() + 13);
                                            const xx = String(future.getDate()).padStart(2, '0');
                                            
                                            const results = [];
                                            for(let i=0; i<count; i++) {
                                                const aa = chars[Math.floor(Math.random()*26)] + chars[Math.floor(Math.random()*26)];
                                                const bbb = chars[Math.floor(Math.random()*26)] + chars[Math.floor(Math.random()*26)] + chars[Math.floor(Math.random()*26)];
                                                results.push(`${dd}${aa}${xx}${bbb}`);
                                            }
                                            
                                            const area = document.getElementById('gen-results') as HTMLTextAreaElement;
                                            area.value = results.join('\n');
                                        }}
                                        className="h-10 px-6 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-md"
                                    >
                                        生成今日兑换码
                                    </button>
                                </div>

                                <div className="relative">
                                    <textarea 
                                        id="gen-results"
                                        readOnly
                                        placeholder="点击生成按钮后，兑换码将显示在这里..."
                                        className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-mono text-purple-600 leading-relaxed outline-none"
                                    />
                                    <button 
                                        onClick={() => {
                                            const area = document.getElementById('gen-results') as HTMLTextAreaElement;
                                            if(!area.value) return;
                                            navigator.clipboard.writeText(area.value).then(() => {
                                                alert('兑换码列表已全部复制到剪贴板！');
                                            });
                                        }}
                                        className="absolute right-3 bottom-3 py-1.5 px-3 bg-white border border-purple-100 text-purple-500 rounded-lg text-[10px] font-bold shadow-sm active:bg-purple-50"
                                    >
                                        一键复制全部
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="space-y-6">
                    {/* AI 统计概览 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                            <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">总调用次数</div>
                            <div className="text-2xl font-black text-indigo-600">
                                {aiUsage.reduce((acc, curr) => acc + curr.usage_count, 0)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                            <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">累计 Token</div>
                            <div className="text-2xl font-black text-purple-600">
                                {(aiUsage.reduce((acc, curr) => acc + curr.total_tokens, 0) / 1000).toFixed(1)}k
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                            <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">预估支出</div>
                            <div className="text-2xl font-black text-pink-500">
                                ${aiUsage.reduce((acc, curr) => {
                                    const input = curr.prompt_tokens || 0;
                                    const output = curr.completion_tokens || 0;
                                    const isPro = curr.model_id?.includes('pro');
                                    const rates = isPro ? { in: 3.5, out: 10.5 } : { in: 0.075, out: 0.30 };
                                    return acc + (input / 1000000 * rates.in) + (output / 1000000 * rates.out);
                                }, 0).toFixed(4)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                            <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">成功率</div>
                            <div className="text-2xl font-black text-green-500">
                                {recentAiLogs.length > 0 
                                    ? Math.round((recentAiLogs.filter(l => l.status === 'success').length / recentAiLogs.length) * 100) 
                                    : 100}%
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                            <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">活动模型</div>
                            <div className="text-2xl font-black text-orange-500">{aiUsage.length}</div>
                        </div>
                    </div>

                    {/* 模型详细分配 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold mb-6 flex items-center gap-2">
                            <span>📊</span> 模型用量看板 (Tokens)
                        </h3>
                        <div className="space-y-6">
                            {aiUsage.map(model => {
                                const total = aiUsage.reduce((acc, curr) => acc + curr.total_tokens, 0);
                                const percentage = total > 0 ? (model.total_tokens / total) * 100 : 0;
                                
                                // 根据模型 ID 获取计费（默认 Flash 价格）
                                const isPro = model.model_id.includes('pro');
                                const rates = isPro ? { in: 3.5, out: 10.5 } : { in: 0.075, out: 0.30 };
                                const cost = (model.prompt_tokens / 1000000 * rates.in) + (model.completion_tokens / 1000000 * rates.out);

                                return (
                                    <div key={model.model_id} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className="text-sm font-bold text-gray-700">{model.model_id}</span>
                                                <span className="ml-2 text-[10px] text-gray-400">调用 {model.usage_count} 次</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-indigo-500">{model.total_tokens.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">Tokens</span></div>
                                                <div className="text-[10px] font-bold text-pink-500">${cost.toFixed(4)}</div>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-1000" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-4 text-[9px] text-gray-400">
                                            <span>输入: {model.prompt_tokens.toLocaleString()}</span>
                                            <span>输出: {model.completion_tokens.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {aiUsage.length === 0 && (
                                <div className="py-10 text-center text-gray-400 text-xs">暂无使用数据</div>
                            )}
                        </div>
                    </div>

                    {/* 最近活动日志 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>🕒</span> 最近调用日志
                            </h3>
                            <button 
                                onClick={loadData}
                                className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold hover:bg-indigo-100 transition-colors"
                            >
                                刷新数据
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-50">
                                        <th className="pb-3 font-bold">动作</th>
                                        <th className="pb-3 font-bold">模型</th>
                                        <th className="pb-3 font-bold">Tokens</th>
                                        <th className="pb-3 font-bold">耗时</th>
                                        <th className="pb-3 font-bold">状态</th>
                                        <th className="pb-3 font-bold">时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recentAiLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 pr-4">
                                                <div className="text-xs font-bold text-gray-700 break-all max-w-[120px] leading-tight">{log.action || 'unknown'}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                                                    {log.model_id}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-xs font-bold text-indigo-500">{log.total_tokens || 0}</div>
                                                <div className="text-[9px] text-pink-500 font-medium">
                                                    {(() => {
                                                        const isPro = log.model_id?.includes('pro');
                                                        const rates = isPro ? { in: 3.5, out: 10.5 } : { in: 0.075, out: 0.30 };
                                                        const cost = ((log.prompt_tokens || 0) / 1000000 * rates.in) + ((log.completion_tokens || 0) / 1000000 * rates.out);
                                                        return `$${cost.toFixed(5)}`;
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-[10px] text-gray-400">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                    log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {log.status === 'success' ? '成功' : '失败'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {recentAiLogs.length === 0 && (
                                <div className="py-20 text-center">
                                    <div className="text-4xl mb-2">🔭</div>
                                    <div className="text-gray-400 text-xs">尚无任何活动记录</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
