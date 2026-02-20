/**
 * PWA 安装按钮组件
 * NOTE: 监听 beforeinstallprompt 事件，提供"添加到桌面"功能
 */
import React, { useState, useEffect } from 'react';

// 定义 BeforeInstallPromptEvent 类型
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showGuide, setShowGuide] = useState<null | 'ios' | 'social'>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        setIsMobile(/Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua));

        // 检查是否已经安装
        const checkIfInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
                setIsInstalled(true);
                return true;
            }
            return false;
        };

        // 检查是否在 index.html 中已经提前捕获了事件
        const checkGlobalPrompt = () => {
            if ((window as any).deferredPrompt) {
                console.log('[InstallPWA] Found early captured beforeinstallprompt event');
                setDeferredPrompt((window as any).deferredPrompt);
                return true;
            }
            return false;
        };

        if (checkGlobalPrompt()) return;

        // 轮询一小段时间，防止有些浏览器发送事件略晚
        const timer = setInterval(() => {
            if (checkGlobalPrompt()) clearInterval(timer);
        }, 1000);

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[InstallPWA] Captured beforeinstallprompt event');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            (window as any).deferredPrompt = e; // 同步给全局，防止状态丢失
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            clearInterval(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        const ua = window.navigator.userAgent;
        const isWechat = /MicroMessenger/i.test(ua);
        const isQQ = /QQ\//i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);

        if (isWechat || isQQ) {
            setShowGuide('social');
            return;
        }

        if (isIOS) {
            setShowGuide('ios');
            return;
        }

        // 优先使用最新的事件对象
        const prompt = deferredPrompt || (window as any).deferredPrompt;

        if (prompt) {
            try {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    (window as any).deferredPrompt = null;
                }
            } catch (err) {
                console.error('[PWA] Prompt error:', err);
                setShowGuide('social');
            }
        } else {
            // 如果完全没有事件（比如部分国产浏览器中），则显示手动引导
            setShowGuide('social');
        }
    };

    if (isInstalled || !isMobile) return null;

    return (
        <>
            <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
            >
                <span className="text-xl">📲</span>
                <span>把网站添加到桌面</span>
            </button>

            {/* 引导弹窗 */}
            {showGuide && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setShowGuide(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        {showGuide === 'ios' ? (
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-4">添加到主屏幕</h3>
                                <div className="space-y-4 text-left text-gray-600">
                                    <p>1. 点击浏览器底部的<span className="mx-1 text-blue-500">“分享”</span>按钮 ⬆️</p>
                                    <p>2. 在菜单中找到并点击<span className="mx-1 font-bold text-gray-800">“添加到主屏幕”</span> ➕</p>
                                    <p>3. 点击右上角的<span className="mx-1 text-blue-500 font-bold">“添加”</span>按钮</p>
                                </div>
                                <button onClick={() => setShowGuide(null)} className="mt-8 w-full py-3 bg-pink-500 text-white rounded-xl font-bold">我知道了</button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-4">如何安装？</h3>
                                <div className="space-y-4 text-left text-gray-600 text-sm">
                                    <p>1. 点击浏览器底部的菜单按钮（或右上角三个点）</p>
                                    <p>2. 在菜单中找到<span className="text-pink-500 font-bold">“添加至主屏幕”</span>或<span className="text-pink-500 font-bold">“安装应用”</span></p>
                                    <p>3. 这样就能像 App 一样从桌面快速打开啦！✨</p>
                                </div>
                                <button onClick={() => setShowGuide(null)} className="mt-8 w-full py-3 bg-pink-500 text-white rounded-xl font-bold italic">我知道了</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPWA;
