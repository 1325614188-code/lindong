import React, { useState } from 'react';
import { getStableDeviceId } from '../lib/fingerprint';

interface LoginViewProps {
    onLogin: (user: any) => void;
    onBack: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onBack }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [referrerId, setReferrerId] = useState<string | null>(null);

    // 获取设备ID
    const getDeviceId = async (): Promise<string> => {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId || deviceId.startsWith('dev_')) {
            deviceId = await getStableDeviceId();
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    };

    // 检查URL中的推荐人
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            setReferrerId(ref);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const deviceId = await getDeviceId();
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isRegister ? 'register' : 'login',
                    username,
                    password,
                    deviceId,
                    referrerId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '操作失败');
            }

            // 保存用户信息
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <button onClick={onBack} className="text-2xl mb-4">←</button>

                <div className="bg-white rounded-3xl p-8 shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        {isRegister ? '注册新账户' : '登录'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">用户名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-pink-400 focus:outline-none"
                                placeholder="请输入用户名"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-500 mb-1">密码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-pink-400 focus:outline-none"
                                placeholder="请输入密码"
                                required
                            />
                        </div>

                        {/* 移除昵称项 */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 xhs-gradient text-white rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 处理中...</>
                            ) : (isRegister ? '注册' : '登录')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-pink-500 text-sm"
                        >
                            {isRegister ? '已有账户？去登录' : '没有账户？去注册'}
                        </button>
                    </div>

                    {isRegister && (
                        <p className="mt-4 text-xs text-gray-400 text-center">
                            🎁 首台设备注册赠送5次使用额度
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginView;
