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
                setDeferredPrompt((window as any).deferredPrompt);
                return true;
            }
            return false;
        };

        if (checkGlobalPrompt()) return;

        // 持续轮询，直到捕捉到事件
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
                console.error('[PWA] Native prompt failed:', err);
            }
        }
    };

    // 只有在【未安装】且【已捕捉到原生安装信号】时才显示按钮
    // 这保证了点击按钮必然弹出系统原生安装框，不再有任何“手动操作”
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;
    if (isInstalled || !isMobile || !activePrompt) return null;

    return (
        <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 mb-6"
        >
            <span className="text-xl">📲</span>
            <span>把网站添加到桌面</span>
        </button>
    );
};

export default InstallPWA;
