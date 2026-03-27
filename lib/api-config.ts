
/**
 * API 基础路径配置
 * 在 Web 环境由于同源策略可以使用相对路径，
 * 但在 Android/iOS App 环境（Capacitor）中必须使用绝对路径指向服务器。
 */

// 生产环境后端域名
const PROD_DOMAIN = 'https://marylab.xyz';

export const getApiUrl = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // 只有在 PC 端本地开发调试时（带端口号，且非移动端 UA）才使用相对路径
    // 或者在生产环境的 Web 浏览器中，为了解决 www 和非 www 的 CORS 问题，也优先使用相对路径
    const isWeb = typeof window !== 'undefined' && 
                 (window.location.protocol === 'http:' || window.location.protocol === 'https:');
    
    const isApp = typeof window !== 'undefined' && 
                 (window.location.hostname === 'localhost' && window.location.port === '' || 
                  window.location.protocol === 'capacitor:');

    // 如果是 Web 环境（无论是本地 localhost 还是生产环境域名），使用相对路径
    // 这能自动处理 www.marylab.xyz 和 marylab.xyz 的切换，并解决跨域问题
    if (isWeb) {
        return `/${cleanPath}`;
    }

    // 只有在 App 环境（Capacitor）中由于没有 host 概念，才强制指向服务器域名
    return `${PROD_DOMAIN}/${cleanPath}`;
};
