/**
 * 前端 Gemini 服务 - 通过后端 API 调用
 * 所有敏感的 API Key 逻辑已移至后端
 */

const API_BASE = '/api/gemini';

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

export const analyzeImage = async (
  prompt: string,
  images: string[],
  systemInstruction?: string
) => {
  const { result } = await callApi({
    action: 'analyze',
    type: prompt,
    images
  });
  return result;
};

export const generateXHSStyleReport = async (
  type: string,
  images: string[],
  additionalPrompt: string = ""
) => {
  // 从 additionalPrompt 中提取性别信息
  const genderMatch = additionalPrompt.match(/性别：(男|女)/);
  const gender = genderMatch ? genderMatch[1] : null;

  const { result } = await callApi({
    action: 'analyze',
    type,
    images,
    gender
  });
  return result;
};

export const generateTryOnImage = async (
  baseImage: string,
  itemImage: string,
  type: 'clothes' | 'earrings'
) => {
  const { result } = await callApi({
    action: 'tryOn',
    baseImage,
    itemImage,
    itemType: type
  });
  return result;
};

export const generateHairstyles = async (
  faceImage: string,
  gender: string,
  onProgress?: (current: number, total: number, result?: { name: string; imageUrl: string }) => void
): Promise<{ name: string; imageUrl: string }[]> => {
  // 发型定义
  const maleHairstyles = [
    { name: '现代纹理飞机头', desc: '经典飞机头的升级版，哑光发泥打造自然的蓬松纹理，重点在于抓出来的空气感。' },
    { name: '软狼尾', desc: '缩短脑后长度，适合通勤，通过层次修剪增加顶部蓬松度，极具少年感。' },
    { name: '法式剪裁', desc: '头顶保留一定长度向前梳理，整齐或破碎短刘海，侧面配合高渐变 (High Fade)，硬朗深邃。' },
    { name: '侧爆渐变', desc: '渐变仅围绕耳朵周围呈半圆状散开，让中间的发型更具结构感。' },
    { name: '流动感中长发', desc: '文艺气息长碎发，强调自然流动，长度在耳朵以下，发尾微卷，慵懒高级。' },
    { name: '现代英伦摩德头', desc: '层次丰富，刘海较长盖住部分额头，修饰高发际线和宽额头，不羁摇滚感。' },
    { name: '皮肤渐变圆寸', desc: '侧边剃到彻底见皮肤 (Skin Fade)，带有一两条简洁几何线条。' },
    { name: '刘海中分头', desc: '刘海向内弯曲像一个逗号，比普通中分更具设计感，刘海在眉毛上方急剧向内弯曲，剪裁干净，五官突出。' },
    { name: '侧分背头', desc: '现代侧分，轻盈造型品，保留自然光泽，侧边有长度渐变，温润专业。' },
    { name: '凌乱碎盖', desc: '头顶头发较长且覆盖额头，通过打薄营造凌乱层次感，包容脸型，自带减龄效果。' }
  ];

  const femaleHairstyleNames = ['幼兽剪 (Cub Cut)', '蝴蝶剪 (Butterfly Cut)', '伯金刘海 (Birkin Bangs)', '浮云鲍伯 (Cloud Bob)', '锁骨直切 (Blunt Collarbone)', '90年代复古碎层', '现代鲻鱼头', '人鱼剪 (Mermaid Cut)', '软精灵短发', '窗帘刘海碎发'];

  const targetHairstyles = gender === '男'
    ? maleHairstyles
    : femaleHairstyleNames.map(name => ({ name, desc: '' }));

  const results: { name: string; imageUrl: string }[] = [];
  const total = targetHairstyles.length;

  for (let i = 0; i < targetHairstyles.length; i++) {
    const item = targetHairstyles[i];
    onProgress?.(i + 1, total);

    try {
      const { result } = await callApi({
        action: 'hairstyle',
        faceImage,
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
