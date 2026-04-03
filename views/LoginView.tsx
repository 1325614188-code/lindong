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
    const [inviteCode, setInviteCode] = useState('');
    const [phone, setPhone] = useState('');
    const [smsCode, setSmsCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [wechatEnabled, setWechatEnabled] = useState(true);
    const [sendingCode, setSendingCode] = useState(false);
    const [isWechat, setIsWechat] = useState(false);
    const [isPhoneRegistered, setIsPhoneRegistered] = useState(false);
    const [nonWechatRegistrationEnabled, setNonWechatRegistrationEnabled] = useState(true);

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

    // 检查邀请码 (从 localStorage 恢复，如果有的话)
    useEffect(() => {
        const savedInvite = localStorage.getItem('last_invite_code');
        if (savedInvite) {
            setInviteCode(savedInvite);
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
                if (data.config && data.config.wechat_login_enabled === 'false') {
                    setWechatEnabled(false);
                }
                if (data.config && data.config.non_wechat_registration_enabled === 'false') {
                    setNonWechatRegistrationEnabled(false);
                }
            } catch (e) {
                console.error('Failed to fetch config', e);
            }
        };
        fetchConfig();
    }, []);

    // 检测微信环境
    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        setIsWechat(ua.includes('micromessenger'));
    }, []);

    // 处理微信回调 code (已移至 App.tsx 全局处理)
    // useEffect(() => { ... }, []);

    const handleWechatLogin = async () => {
        try {
            setLoading(true);
            const redirectUri = window.location.origin;
            const res = await fetch(getApiUrl('/api/auth_v2'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getWechatAuthUrl',
                    redirectUri: redirectUri
                })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || '获取授权链接失败');
            }
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    // 实时检查手机号是否已注册
    useEffect(() => {
        const checkPhone = async () => {
            if (isRegister && smsEnabled && /^1[3-9]\d{9}$/.test(phone)) {
                try {
                    const res = await fetch(getApiUrl('/api/sms'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'checkPhone', phone })
                    });
                    const data = await res.json();
                    if (data.isRegistered) {
                        setIsPhoneRegistered(true);
                        setError('该手机号已注册，请直接登录');
                    } else {
                        setIsPhoneRegistered(false);
                        if (error === '该手机号已注册，请直接登录') setError('');
                    }
                } catch (e) {
                    console.error('Check phone failed', e);
                }
            } else {
                setIsPhoneRegistered(false);
                if (error === '该手机号已注册，请直接登录') setError('');
            }
        };
        const timer = setTimeout(checkPhone, 500);
        return () => clearTimeout(timer);
    }, [phone, isRegister, smsEnabled]);

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
            setCountdown(180);
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
                    inviteCode: inviteCode.trim().toUpperCase(),
                    ...(isRegister && smsEnabled ? { phone, smsCode } : {})
                })
            });

            if (isRegister && inviteCode.trim()) {
                localStorage.setItem('last_invite_code', inviteCode.trim().toUpperCase());
            }

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
                                            disabled={countdown > 0 || sendingCode || phone.length !== 11 || isPhoneRegistered}
                                            className="h-12 px-4 rounded-2xl bg-pink-100 text-pink-600 font-bold text-sm disabled:opacity-50 whitespace-nowrap active:bg-pink-200 transition-colors"
                                        >
                                            {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 ml-1">
                                    💡 短信可能需要 1-3 分钟送达，请耐心等待。
                                </p>
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

                        {isRegister && (
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-400 ml-1">邀请码 / INVITE CODE</label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                    className="w-full h-12 px-4 rounded-2xl bg-pink-50/50 border border-pink-100 focus:border-pink-300 focus:bg-white focus:outline-none transition-all placeholder:text-pink-200"
                                    placeholder="输入邀请码立享专属福利"
                                />
                                <p className="text-[10px] text-pink-400 ml-1">
                                    💡 填写正确的邀请码可以帮助您的推荐人获得奖励哦！
                                </p>
                            </div>
                        )}

                        {nonWechatRegistrationEnabled || (isWechat && wechatEnabled) ? (
                            <button
                                type="submit"
                                disabled={loading || (!nonWechatRegistrationEnabled && !isWechat)}
                                className="w-full h-14 xhs-gradient text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 处理中...</>
                                ) : (isRegister ? '立即注册' : '登录账户')}
                            </button>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400 mt-4 leading-relaxed">
                                🔒 当前环境下注册功能受限<br/>请返回并在微信中打开网页进行一键登录
                            </div>
                        )}
                    </form>

                    {nonWechatRegistrationEnabled && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setIsRegister(!isRegister)}
                                className="text-pink-500 text-sm font-medium hover:underline"
                            >
                                {isRegister ? '已有账户？点击去登录' : '还没有账号？三秒注册'}
                            </button>
                        </div>
                    )}

                    {/* 微信登录按钮 - 仅在微信环境且开启配置时显示 */}
                    {isWechat && wechatEnabled && !isRegister && (
                        <div className="mt-8">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-white text-gray-400 font-medium">其他登录方式 / OTHERS</span>
                                </div>
                            </div>
                            <button
                                onClick={handleWechatLogin}
                                disabled={loading}
                                className="w-full h-12 flex items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:scale-95 transition-all text-gray-600 font-medium shadow-sm"
                            >
                                <svg className="w-6 h-6 text-[#07C160]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8.5 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm7 0c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM24 11.5c0-4.694-4.851-8.5-10.833-8.5C7.184 3 2.333 6.806 2.333 11.5c0 2.528 1.411 4.786 3.653 6.307l-.92 3.39 3.864-1.933c.607.168 1.244.258 1.903.258.118 0 .235-.003.351-.01C11.127 21.056 12.518 22 14.167 22c.162 0 .321-.01.478-.029l2.898 1.448-.69-2.541c2.096-1.393 3.414-3.52 3.414-5.878 0-1.045-.262-2.03-.734-2.91 2.657 1.18 4.467 3.364 4.467 5.91 0 1.93-.974 3.674-2.52 4.904l.507 1.868-2.127-1.063c-.412.112-.843.172-1.288.172-.087 0-.173-.002-.259-.007.411.233.856.425 1.332.569l2 .5 1-.5c2.5-1 4.5-3.5 4.5-6.5z"/>
                                </svg>
                                微信一键登录
                            </button>
                        </div>
                    )}

                    {isRegister && (
                        <div className="mt-6 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100">
                            <p className="text-[10px] text-pink-600 leading-relaxed text-center">
                                🎁 <span className="font-bold text-sm">新用户专属福利</span><br/>
                                注册成功即赠送 <span className="font-bold text-lg">3</span> 次试用额度！
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
