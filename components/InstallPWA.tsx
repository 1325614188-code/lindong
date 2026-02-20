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
    const [isMobile, setIsMobile] = useState(false);
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        setIsMobile(/Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua));

        const checkIfInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
                setIsInstalled(true);
                return true;
            }
            return false;
        };

        const checkGlobalPrompt = () => {
            if ((window as any).deferredPrompt) {
                setDeferredPrompt((window as any).deferredPrompt);
                return true;
            }
            return false;
        };

        if (checkIfInstalled()) return;
        checkGlobalPrompt();

        const timer = setInterval(() => {
            if (checkGlobalPrompt()) clearInterval(timer);
        }, 1000);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            (window as any).deferredPrompt = e;
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            (window as any).deferredPrompt = null;
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
                setShowFallback(true);
            }
        } else {
            // 如果没有捕捉到原生信号（如 iOS 或部分国产浏览器拦截）
            setShowFallback(true);
            // 3秒后自动关闭提示
            setTimeout(() => setShowFallback(false), 5000);
        }
    };

    if (isInstalled || !isMobile) return null;

    return (
        <div className="relative w-full mb-6">
            <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
            >
                <span className="text-xl">📲</span>
                <span>把网站添加到桌面</span>
            </button>

            {showFallback && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-md border border-pink-100 p-4 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div className="text-sm text-gray-700 leading-relaxed font-medium">
                            <p>由于当前浏览器限制，无法点击一键添加。</p>
                            <p className="mt-1">请点击浏览器菜单中的 <span className="text-pink-600 font-bold">“添加至主屏幕”</span> 即可完成。✨</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstallPWA;
