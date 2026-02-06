/**
 * 轻量级设备指纹助手
 * 通过组合硬件和浏览器特征生成相对稳定的唯一标识
 */

/**
 * 简单的哈希函数 (MurmurHash-like)
 */
function cyrb53(str: string, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * 获取设备特征字符串
 */
function getFingerprintData(): string {
    const gl = document.createElement('canvas').getContext('webgl') as any;
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

    const features = [
        // 核心物理硬件参数 (同一部手机的所有浏览器/WebView 都一致)
        window.screen.width + 'x' + window.screen.height,
        window.devicePixelRatio || 1,
        navigator.hardwareConcurrency || 'unknown',
        renderer,
    ];

    return features.join('###');
}

/**
 * 获取稳定的设备唯一标识
 */
export async function getStableDeviceId(): Promise<string> {
    const data = getFingerprintData();
    const hash = cyrb53(data).toString(36);
    return `fp_${hash}`;
}
