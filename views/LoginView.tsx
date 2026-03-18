import React, { useState, useEffect } from 'react';
import { getStableDeviceId } from '../lib/fingerprint';
import { getApiUrl } from '../lib/api-config';

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
    const [phone, setPhone] = useState('');
    const [smsCode, setSmsCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);

    // 获取设备ID
    const getDeviceId = async (): Promise<string> => {
        try {
            let deviceId = localStorage.getItem('device_id');
            if (!deviceId || deviceId.startsWith('dev_')) {
                deviceId = await getStableDeviceId();
                localStorage.setItem('device_id', deviceId);
            }
            return deviceId || 'UNKNOWN';
        } catch (e) {
            console.error('Failed to get device ID:', e);
            return 'ERROR_ID';
        }
    };

    // 检查推荐人
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            if (ref) {
                setReferrerId(ref);
                localStorage.setItem('referrer_id', ref);
            } else {
                const savedRef = localStorage.getItem('referrer_id');
                if (savedRef) {
                    setReferrerId(savedRef);
                }
            }
        } catch (e) {
            console.error('Failed to parse referral:', e);
        }
    }, []);

    // 检查配置
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const ts = Date.now();
                const res = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getPublicConfig' })
                });
                const data = await res.json();
                if (data.config && data.config.sms_registration_enabled === 'true') {
                    setSmsEnabled(true);
                }
            } catch (e) {
                console.error('Failed to fetch config', e);
            }
        };
        fetchConfig();
    }, []);

    // 短信倒计时
    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setError('请输入正确的手机号');
            return;
        }
        setError('');
        setSendingCode(true);
        try {
            const res = await fetch(getApiUrl('/api/sms'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sendCode', phone })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCountdown(60);
        } catch (e: any) {
            setError(e.message || '发送验证码失败');
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('请输入用户名和密码');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const deviceId = await getDeviceId();
            const ts = Date.now();
            const response = await fetch(getApiUrl(`/api/auth_v2?t=${ts}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isRegister ? 'register' : 'login',
                    username: username.trim(),
                    password,
                    deviceId,
                    referrerId,
                    ...(isRegister && smsEnabled ? { phone, smsCode } : {})
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '操作失败，请稍后重试');
            }

            // 保存用户信息
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (err: any) {
            setError(err.message || '网络连接异常，请检查网络');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-6 pb-24">
            <div className="w-full max-w-md animate-in fade-in duration-500">
                <button
                    onClick={onBack}
                    className="text-2xl mb-4 p-2 active:bg-white/20 rounded-full transition-colors"
                    aria-label="返回中心"
                >
                    ←
                </button>

                <div className="bg-white rounded-3xl p-8 shadow-2xl border border-pink-100">
                    <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        {isRegister ? '注册新账户' : '欢迎回来'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-4 rounded-2xl mb-6 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isRegister && smsEnabled && (
                            <>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-400 ml-1">手机号 / PHONE</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-transparent focus:border-pink-300 focus:bg-white focus:outline-none transition-all"
                                        placeholder="请输入手机号码"
                                        maxLength={11}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-400 ml-1">验证码 / CODE</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={smsCode}
                                            onChange={e => setSmsCode(e.target.value)}
                                            className="flex-1 h-12 px-4 rounded-2xl bg-gray-50 border border-transparent focus:border-pink-300 focus:bg-white focus:outline-none transition-all"
                                            placeholder="6位验证码"
                                            maxLength={6}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={countdown > 0 || sendingCode || phone.length !== 11}
                                            className="h-12 px-4 rounded-2xl bg-pink-100 text-pink-600 font-bold text-sm disabled:opacity-50 whitespace-nowrap active:bg-pink-200 transition-colors"
                                        >
                                            {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-400 ml-1">用户名 / USERNAME</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-transparent focus:border-pink-300 focus:bg-white focus:outline-none transition-all"
                                placeholder="请输入用户名"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-400 ml-1">密码 / PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-transparent focus:border-pink-300 focus:bg-white focus:outline-none transition-all"
                                placeholder="请输入密码"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 xhs-gradient text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 处理中...</>
                            ) : (isRegister ? '立即注册' : '登录账户')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-pink-500 text-sm font-medium hover:underline"
                        >
                            {isRegister ? '已有账户？点击去登录' : '还没有账号？三秒注册'}
                        </button>
                    </div>

                    {isRegister && (
                        <div className="mt-6 p-4 bg-pink-50 rounded-2xl">
                            <p className="text-[10px] text-pink-600 leading-relaxed text-center">
                                🎁 <span className="font-bold">新用户福利</span>：首台设备注册赠送 <span className="font-bold text-lg">5</span> 次使用额度，快来体验吧！
                            </p>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-gray-300 text-xs">
                    © 2026 美力实验室 AI 版权所有
                </p>
            </div>
        </div>
    );
};

export default LoginView;
