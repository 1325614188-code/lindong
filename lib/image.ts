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
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 计算缩放比例
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // 压缩并输出 jpeg 格式，因为它比 png 更小
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = (e) => reject(e);
    });
};
