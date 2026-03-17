import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export const saveImageToDevice = async (base64Data: string, filenamePre: string) => {
  const isMobileApp = Capacitor.isNativePlatform();

  // Validate format
  let cleanBase64 = base64Data;
  if (base64Data.includes(',')) {
    cleanBase64 = base64Data.split(',')[1];
  }

  const filename = `${filenamePre}_${Date.now()}.png`;

  if (isMobileApp) {
    try {
      // 1. Write the file to the app's cache directory first
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: cleanBase64,
        directory: Directory.Cache,
      });

      // 2. Try to save it to gallery if on Android/iOS via Share plugin or media plugin
      // Capacitor's core filesystem doesn't easily save directly to the public photo gallery out of the box
      // But we can trigger the native share sheet to let users "Save to Images"
      await Share.share({
        title: '保存图片',
        text: '您的换装图片已生成',
        url: savedFile.uri,
        dialogTitle: '保存或分享图片',
      });
      return true;
    } catch (e: any) {
      console.error('Save to device failed:', e);
      alert('保存或分享图片失败。');
      return false;
    }
  } else {
    // Fallback for Web/Browser
    try {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error('Web download failed:', e);
      return false;
    }
  }
};
