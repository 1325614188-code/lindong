import React, { useState, useEffect } from 'react';

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

    // 加载数据
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 初始化管理员
            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'initAdmin' })
            });

            // 获取用户列表
            const usersRes = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getUsers', adminId: admin.id })
            });
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);

            // 获取配置
            const configRes = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getConfig', adminId: admin.id })
            });
            const configData = await configRes.json();
            setConfig(configData.config || {});

            // 获取统计
            const statsRes = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getStats', adminId: admin.id })
            });
            const statsData = await statsRes.json();
            setStats(statsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 更新配置
    const updateConfig = async (key: string, value: string) => {
        try {
            await fetch('/api/admin', {
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
            await fetch('/api/admin', {
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

            {/* 配置管理 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                <h3 className="font-bold mb-4">⚙️ 系统配置</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <label className="w-24 text-sm text-gray-500">联系微信</label>
                        <input
                            type="text"
                            value={config.contact_wechat || ''}
                            onChange={e => updateConfig('contact_wechat', e.target.value)}
                            className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="w-24 text-sm text-gray-500">充值功能</label>
                        <button
                            onClick={() => updateConfig('recharge_enabled', config.recharge_enabled === 'true' ? 'false' : 'true')}
                            className={`px-4 py-2 rounded-xl ${config.recharge_enabled === 'true' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                        >
                            {config.recharge_enabled === 'true' ? '已开启' : '已关闭'}
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="w-24 text-sm text-gray-500">支付宝AppID</label>
                        <input
                            type="text"
                            value={config.alipay_app_id || ''}
                            onChange={e => updateConfig('alipay_app_id', e.target.value)}
                            className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
                            placeholder="沙箱AppID"
                        />
                    </div>
                </div>
            </div>

            {/* 用户列表 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold mb-4">👥 用户管理</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">用户名</th>
                                <th className="pb-2">昵称</th>
                                <th className="pb-2">额度</th>
                                <th className="pb-2">注册时间</th>
                                <th className="pb-2">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-gray-100">
                                    <td className="py-3">{user.username}</td>
                                    <td className="py-3">{user.nickname}</td>
                                    <td className="py-3">
                                        {editingCredits?.id === user.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={editingCredits.amount}
                                                    onChange={e => setEditingCredits({ ...editingCredits, amount: parseInt(e.target.value) || 0 })}
                                                    className="w-16 h-8 px-2 rounded border"
                                                />
                                                <button
                                                    onClick={() => updateCredits(user.id, editingCredits.amount - user.credits)}
                                                    className="px-2 h-8 bg-green-500 text-white rounded text-xs"
                                                >
                                                    保存
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-pink-500">{user.credits}</span>
                                        )}
                                    </td>
                                    <td className="py-3 text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3">
                                        {!user.is_admin && (
                                            <button
                                                onClick={() => setEditingCredits({ id: user.id, amount: user.credits })}
                                                className="text-pink-500 text-xs"
                                            >
                                                修改额度
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminView;
