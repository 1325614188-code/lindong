
/**
 * API 基础路径配置
 * 在 Web 环境由于同源策略可以使用相对路径，
 * 但在 Android/iOS App 环境（Capacitor）中必须使用绝对路径指向服务器。
 */

// 生产环境后端域名
const PROD_DOMAIN = 'https://www.qczj.xyz';

export const getApiUrl = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // 只有在 PC 端本地开发调试时（带端口号，且非移动端 UA）才使用相对路径
    // 其他情况（生产环境 Web、Android/iOS App）一律强制使用绝对路径
    const isLocalDev = window.location.hostname === 'localhost' &&
        window.location.port !== '' &&
        !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isLocalDev) {
        return `/${cleanPath}`;
    }

    return `${PROD_DOMAIN}/${cleanPath}`;
};
