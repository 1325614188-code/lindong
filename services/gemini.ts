/**
 * 前端 Gemini 服务 - 通过后端 API 调用
 * 所有敏感的 API Key 逻辑已移至后端
 */

import { getApiUrl } from '../lib/api-config';
import { compressImage } from '../lib/image';

const API_BASE = getApiUrl('/api/gemini');

/**
 * 调用后端 API
 */
async function callApi(body: Record<string, any>): Promise<any> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * 检测照片是否合规（包含人脸和上半身）
 */
export const detectPhotoContent = async (image: string): Promise<boolean> => {
  // Tier A: Detection (Smallest)
  const compressed = await compressImage(image, 256, 0.5);
  const { valid } = await callApi({
    action: 'detectPhotoContent',
    image: compressed
  });
  return valid;
};

export const analyzeImage = async (
  prompt: string,
  images: string[],
  systemInstruction?: string
) => {
  // Tier B: Analysis (Balanced)
  const compressedImages = await Promise.all(
    images.map(img => compressImage(img, 512, 0.6))
  );

  const { result } = await callApi({
    action: 'analyze',
    type: prompt,
    images: compressedImages
  });
  return result;
};

export const generateXHSStyleReport = async (
  type: string,
  images: string[],
  additionalPrompt: string = ""
) => {
  // Tier B: Analysis (Balanced)
  const compressedImages = await Promise.all(
    images.map(img => compressImage(img, 512, 0.6))
  );

  // 从 additionalPrompt 中提取性别信息
  const genderMatch = additionalPrompt.match(/性别：(男|女)/);
  const gender = genderMatch ? genderMatch[1] : null;

  const { result } = await callApi({
    action: 'analyze',
    type,
    images: compressedImages,
    gender
  });
  return result;
};

export const generateTryOnImage = async (
  baseImage: string,
  itemImage: string,
  type: 'clothes' | 'earrings'
) => {
  // Tier C: Generation (High quality)
  const compressedBase = await compressImage(baseImage, 1024, 0.7);
  const compressedItem = await compressImage(itemImage, 1024, 0.7);

  const { result } = await callApi({
    action: 'tryOn',
    baseImage: compressedBase,
    itemImage: compressedItem,
    itemType: type
  });
  return result;
};

export const generateHairstyles = async (
  faceImage: string,
  gender: string,
  onProgress?: (current: number, total: number, result?: { name: string; imageUrl: string }) => void
): Promise<{ name: string; imageUrl: string }[]> => {
  // 发型定义 (缩减版以节省流量)
  const maleHairstyles = [
    { name: '现代纹理飞机头', desc: '经典飞机头的升级版，哑光发泥打造自然的蓬松纹理，重点在于抓出来的空气感。' },
    { name: '软狼尾', desc: '缩短脑后长度，适合通勤，通过层次修剪增加顶部蓬松度，极具少年感。' },
    { name: '法式剪裁', desc: '头顶保留一定长度向前梳理，整齐或破碎短刘海，侧面配合高渐变 (High Fade)，硬朗深邃。' },
    { name: '刘海中分头', desc: '刘海向内弯曲像一个逗号，比普通中分更具设计感。' }
  ];

  const femaleHairstyleNames = ['幼兽剪 (Cub Cut)', '蝴蝶剪 (Butterfly Cut)', '伯金刘海 (Birkin Bangs)', '浮云鲍伯 (Cloud Bob)'];

  const targetHairstyles = gender === '男'
    ? maleHairstyles
    : femaleHairstyleNames.map(name => ({ name, desc: '' }));

  const results: { name: string; imageUrl: string }[] = [];
  const total = targetHairstyles.length;

  for (let i = 0; i < targetHairstyles.length; i++) {
    const item = targetHairstyles[i];
    onProgress?.(i + 1, total);

    try {
      // Tier C: Generation (High quality)
      const compressedFace = await compressImage(faceImage, 1024, 0.7);

      const { result } = await callApi({
        action: 'hairstyle',
        faceImage: compressedFace,
        gender,
        hairstyleName: item.name,
        hairstyleDesc: item.desc
      });

      if (result) {
        const hairstyleResult = { name: item.name, imageUrl: result };
        results.push(hairstyleResult);
        onProgress?.(i + 1, total, hairstyleResult);
        console.log(`[Hairstyle] ${item.name} (${i + 1}/${total}) 生成成功`);
      } else {
        console.error(`[Hairstyle] ${item.name} (${i + 1}/${total}) 解析失败`);
      }
    } catch (e) {
      console.error(`[Hairstyle] ${item.name} (${i + 1}/${total}) 最终失败:`, e);
    }
  }

  return results;
};

export const generateMakeupImage = async (
  faceImage: string,
  styleName: string,
  styleDesc: string
): Promise<string | null> => {
  // Tier C: Generation (High quality)
  const compressedFace = await compressImage(faceImage, 1024, 0.7);

  const { result } = await callApi({
    action: 'makeup',
    faceImage: compressedFace,
    styleName,
    styleDesc
  });
  return result;
};

export const analysisMarriage = async (birthInfo: string, gender: string) => {
  const { result } = await callApi({
    action: 'marriageAnalysis',
    birthInfo,
    gender
  });
  return result;
};

export const generatePartnerImage = async (description: string, gender: string, userImage?: string) => {
  // Tier C: Generation (High quality)
  let compressedUserImg = undefined;
  if (userImage) {
    compressedUserImg = await compressImage(userImage, 1024, 0.7);
  }

  const { result } = await callApi({
    action: 'generatePartner',
    description,
    gender,
    userImage: compressedUserImg
  });
  return result;
};

export const analysisWealth = async (birthInfo: string, gender: string) => {
  const { result } = await callApi({
    action: 'wealthAnalysis',
    birthInfo,
    gender
  });
  return result;
};

export const analysisZiWei = async (birthInfo: string, gender: string) => {
  const { result } = await callApi({
    action: 'ziWeiAnalysis',
    birthInfo,
    gender
  });
  return result;
};

export const analysisNaming = async (params: {
  type: 'personal_recommend' | 'personal_score' | 'company_recommend' | 'company_score';
  birthInfo: string;
  gender?: string;
  surname?: string;
  expectations?: string;
  nameToScore?: string;
  ownerName?: string;
  industry?: string;
}) => {
  const { result } = await callApi({
    action: 'namingAnalysis',
    ...params
  });
  return result;
};
