/**
 * 图像处理工具类
 */

/**
 * 压缩图片并转为 Base64
 * @param base64Str 原始 Base64 字符串
 * @param maxWidth 最大宽度
 * @param quality 压缩质量 (0-1)
 * @returns 压缩后的 Base64 字符串
 */
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', quality);
                
                // 仅在开发环境下输出压缩日志
                if (process.env.NODE_ENV !== 'production') {
                    const originalSize = Math.round(base64Str.length / 1024);
                    const compressedSize = Math.round(compressed.length / 1024);
                    console.log(`[Image] Compressed: ${originalSize}KB -> ${compressedSize}KB, Ratio: ${Math.round(compressedSize/originalSize*100)}%, Time: ${Date.now() - startTime}ms`);
                }
                
                resolve(compressed);
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = (e) => reject(e);
    });
};
