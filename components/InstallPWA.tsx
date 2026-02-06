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
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // 检查是否已经安装为 PWA
        const checkIfInstalled = () => {
            // 检查 display-mode: standalone（已安装的 PWA）
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
                return true;
            }
            // iOS Safari 的检测方式
            if ((window.navigator as any).standalone === true) {
                setIsInstalled(true);
                return true;
            }
            return false;
        };

        if (checkIfInstalled()) {
            return;
        }

        // 监听安装提示事件
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallButton(true);
        };

        // 监听安装成功事件
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallButton(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    /**
     * 处理安装按钮点击
     */
    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        // 显示安装提示
        await deferredPrompt.prompt();

        // 等待用户响应
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallButton(false);
        }

        setDeferredPrompt(null);
    };

    // 如果已安装或不支持安装，不显示按钮
    if (isInstalled || !showInstallButton) {
        return null;
    }

    return (
        <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
        >
            <span className="text-xl">📲</span>
            <span>把网站添加到桌面</span>
        </button>
    );
};

export default InstallPWA;
