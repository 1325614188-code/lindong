import React, { useState, useEffect } from 'react';
import { generateTryOnImage, detectPhotoContent } from '../services/gemini';
import { saveImageToDevice } from '../lib/download';

interface AdvancedTryOnViewProps {
  onBack: () => void;
  onCheckCredits?: () => Promise<boolean>;
  onDeductCredit?: () => Promise<boolean>;
}

interface SavedLook {
  id: string;
  faceImage: string;
  itemImage: string;
  resultImage: string;
  createdAt: number;
}

const PRESET_CLOTHES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop', // 黄色时尚上衣
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=400&fit=crop', // 优雅白裙 
  'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop', // 红色礼服
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop', // 休闲牛仔夹克
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop', // 黑色职业装
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop'  // 女鞋搭配
];

const AdvancedTryOnView: React.FC<AdvancedTryOnViewProps> = ({ onBack, onCheckCredits, onDeductCredit }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'lookbook'>('create');
  
  // 数字分身状态
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [detectingAvatar, setDetectingAvatar] = useState(false);
  
  // 试穿衣物状态
  const [selectedItemImage, setSelectedItemImage] = useState<string | null>(null);
  
  // 生成状态
  const [loading, setLoading] = useState(false);
  const [currentResultImage, setCurrentResultImage] = useState<string | null>(null);
  const [loadingTipsIndex, setLoadingTipsIndex] = useState(0);

  // 历史记录
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

  const loadingTips = [
    "AI 正在测量您的身形比例...",
    "正在分析衣物材质与纹理...",
    "光影渲染中，请稍候...",
    "调整衣物褶皱，力求自然真实...",
    "马上就好啦，魔法即将完成 ✨!"
  ];

  // 初始化加载数据
  useEffect(() => {
    const savedAvatar = localStorage.getItem('tryon_avatar');
    if (savedAvatar) {
      setAvatarImage(savedAvatar);
    }
    
    const savedHistoryStr = localStorage.getItem('tryon_history');
    if (savedHistoryStr) {
      try {
        const history = JSON.parse(savedHistoryStr);
        setSavedLooks(history);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // 切换 Loading 提示文案
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTipsIndex((prev) => (prev + 1) % loadingTips.length);
      }, 2000);
    } else {
      setLoadingTipsIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;
        setDetectingAvatar(true);
        // 先乐观更新 UI
        const prevAvatar = avatarImage;
        setAvatarImage(imageData);

        try {
          // 这里借用已有的 detectPhotoContent
          const isValid = await detectPhotoContent(imageData);
          if (!isValid) {
            alert('检测建议：请上传带脸部的上半身正面清晰照片，以获得最佳试穿效果。');
            // 可以选择恢复上一张，或者允许用户继续尝试。这里倾向于稍微宽松，仅作提示。
          }
          // 保存数字分身
          try { localStorage.setItem('tryon_avatar', imageData); } catch(e) { console.warn('无法保存分身：', e); }
        } catch (error) {
          console.error('[AdvancedTryOnView] Detection error:', error);
          try { localStorage.setItem('tryon_avatar', imageData); } catch(e) {} // 万一接口挂了也允许保存
        } finally {
          setDetectingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomItemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedItemImage(reader.result as string);
        setCurrentResultImage(null); // 上传新衣服后清除旧结果
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = async (url: string) => {
    try {
      // 需要将预设图片的 url 转为 base64, 以便传递给 AI 接口
      // 由于存在跨域问题，如果直接使用线上 URL 可能会报错。如果是本地项目内的图则好转。
      // 这里采用将图片画入 canvas 导出为 base64 的通用方式。注意：要求图片服务器允许 CORS
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          setSelectedItemImage(dataURL);
          setCurrentResultImage(null);
        }
      };
      img.onerror = () => {
        // 如果跨域失败，退化为直接传 URL（要求后端支持直接接收 URL）
        setSelectedItemImage(url); 
        setCurrentResultImage(null);
      };
      
    } catch (e) {
      console.warn("Could not load preset image properly");
      setSelectedItemImage(url);
    }
  };

  const handleGenerate = async () => {
    if (!avatarImage || !selectedItemImage) return;

    const hasCredits = await onCheckCredits?.();
    if (!hasCredits) return;

    setLoading(true);
    setCurrentResultImage(null);
    try {
      const result = await generateTryOnImage(avatarImage, selectedItemImage, 'clothes');
      
      // 判断是否生成失败（例如效果图和原图完全一致）
      if (result && result === avatarImage) {
        alert('生成效果与原图一致，判定为生成失败，本次不扣除使用次数，请尝试重新生成或更换图片');
        return;
      }

      if (result) {
        setCurrentResultImage(result);
        
        // 保存到历史记录
        const newLook: SavedLook = {
          id: Date.now().toString(),
          faceImage: avatarImage,
          itemImage: selectedItemImage,
          resultImage: result,
          createdAt: Date.now()
        };
        let updatedLooks = [newLook, ...savedLooks];
        setSavedLooks(updatedLooks);

        // 利用循环自动缩减历史记录直到能够成功保存（解决 QuotaExceededError）
        let saved = false;
        while (!saved && updatedLooks.length > 0) {
          try {
            localStorage.setItem('tryon_history', JSON.stringify(updatedLooks));
            saved = true;
          } catch (e: any) {
            console.warn("localStorage 容量不足，自动清理旧换装记录...");
            if (updatedLooks.length > 1) {
              updatedLooks.pop(); // 移除最旧的一条记录
            } else {
              console.warn("单条记录过大或已无可用空间");
              break;
            }
          }
        }
        
        // 如果发生了记录清理，更新 state
        if (updatedLooks.length !== savedLooks.length + 1) {
          setSavedLooks([...updatedLooks]);
        }

        await onDeductCredit?.();
      } else {
        alert('生成失败，请稍后重试');
      }
    } catch (e) {
      console.error(e);
      alert('生成过程中出现网络异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedLook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定删除这个试穿记录吗？")) {
       const newLooks = savedLooks.filter(look => look.id !== id);
       setSavedLooks(newLooks);
       localStorage.setItem('tryon_history', JSON.stringify(newLooks));
    }
  };

  const downloadImage = async (base64Str: string) => {
    await saveImageToDevice(base64Str, 'my_look');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white px-4 pt-6 pb-2 shrink-0 shadow-sm z-10 sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-2xl p-2 -ml-2 text-gray-700">←</button>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-500">
            沉浸换装 ✦ DOPPl
          </h2>
          <div className="w-8"></div> {/* 占位以居中标题 */}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'create' ? 'bg-white text-pink-600 shadow' : 'text-gray-500'}`}
            onClick={() => setActiveTab('create')}
          >
            试试新衣
          </button>
          <button
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'lookbook' ? 'bg-white text-pink-600 shadow' : 'text-gray-500'}`}
            onClick={() => setActiveTab('lookbook')}
          >
            我的造型 ({savedLooks.length})
          </button>
        </div>
      </div>

      {/* 主体内容滚动区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        
        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="flex flex-col gap-8 pb-10">
            
            {/* 1. 数字分身区域 */}
            <section>
              <div className="flex justify-between items-end mb-3">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span className="text-xl">👩</span> 你的数字分身
                </h3>
                <label className="text-xs text-pink-500 font-bold bg-pink-50 px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-transform">
                  {avatarImage ? '重新上传' : '立即上传'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
              
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden shrink-0 relative border-2 border-dashed border-gray-200">
                  {avatarImage ? (
                    <>
                      <img src={avatarImage} className={`w-full h-full object-cover ${detectingAvatar ? 'blur-sm grayscale' : ''}`} />
                      {detectingAvatar && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl text-gray-300">👤</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {avatarImage ? (
                    <>
                      <p className="font-bold text-gray-800 mb-1">分身已就绪 ✨</p>
                      <p className="text-xs text-gray-500 leading-relaxed">我们将保存该分身，以后的试穿只需挑选衣服即可，享受无缝换装体验。</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-gray-500 mb-1">尚无分身</p>
                      <p className="text-xs text-gray-400">请上传一张清晰的正面半身照作为你的专属模特。</p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* 2. 挑选衣物区域 */}
            <section>
              <div className="flex justify-between items-end mb-3">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span className="text-xl">👗</span> 挑选新造型
                </h3>
                <label className="text-xs text-indigo-500 font-bold bg-indigo-50 px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-transform">
                  + 上传自己的衣服
                  <input type="file" className="hidden" accept="image/*" onChange={handleCustomItemUpload} />
                </label>
              </div>

              {/* 已选中的衣服预览 */}
              {selectedItemImage && (
                <div className="mb-4 bg-white p-3 rounded-2xl shadow-sm border border-indigo-100 flex gap-4 items-center">
                   <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                     <img src={selectedItemImage} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-indigo-700 text-sm">已选择该服饰参与生成</p>
                     <p className="text-xs text-gray-500 mt-1">您可以继续在下方自由切换款式。</p>
                   </div>
                </div>
              )}

              {/* 预设灵感库瀑布流 */}
              <div className="columns-2 gap-3 space-y-3">
                {PRESET_CLOTHES.map((url, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectPreset(url)}
                    className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm active:scale-95 transition-transform"
                  >
                    <img src={url} className="w-full object-cover rounded-2xl border border-gray-100 h-40" />
                    {/* 选中态遮罩 */}
                    {selectedItemImage === url && (
                      <div className="absolute inset-0 bg-indigo-500/30 border-4 border-indigo-500 rounded-2xl flex items-center justify-center">
                        <div className="bg-indigo-500 text-white p-2 rounded-full shadow-lg">
                          ✔️ 选中
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. 结果或生成按钮区域 (Sticky Bottom 也可以， 这里放内容文档流) */}
            <div className="mt-4">
              {currentResultImage && !loading ? (
                <div className="bg-white p-4 rounded-3xl shadow-xl border border-pink-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <p className="text-center font-bold text-gray-800 mb-4 text-lg">✨ 上身效果出炉 ✨</p>
                   <div className="rounded-2xl overflow-hidden mb-4 relative aspect-[3/4] bg-gray-100">
                     <img src={currentResultImage} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex flex-col gap-3">
                     <button
                       onClick={() => downloadImage(currentResultImage)}
                       className="w-full py-3.5 text-white font-bold bg-pink-500 rounded-xl shadow-md active:scale-95 transition-transform hover:bg-pink-600"
                     >
                       保存穿搭大图
                     </button>
                     <div className="flex gap-3">
                       <button
                         onClick={handleGenerate}
                         className="flex-1 py-3 text-pink-600 font-bold border-2 border-pink-100 bg-pink-50 rounded-xl active:scale-95 transition-transform hover:bg-pink-100"
                       >
                         重新生成
                       </button>
                       <button
                         onClick={() => {
                           setAvatarImage(null);
                           setSelectedItemImage(null);
                           setCurrentResultImage(null);
                           localStorage.removeItem('tryon_avatar');
                         }}
                         className="flex-1 py-3 text-gray-600 font-bold border-2 border-gray-200 bg-gray-50 rounded-xl active:scale-95 transition-transform hover:bg-gray-100"
                       >
                         从头再来
                       </button>
                     </div>
                   </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!avatarImage || !selectedItemImage || loading}
                  className="w-full h-16 bg-gradient-to-r from-pink-500 to-indigo-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 transition-all flex flex-col items-center justify-center shadow-lg active:scale-[0.98] relative overflow-hidden"
                >
                  {loading ? (
                    <div className="flex flex-col items-center">
                       <div className="flex gap-2 items-center">
                         <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                         <span className="tracking-widest">AI 处理中</span>
                       </div>
                       <span className="text-xs text-white/80 font-normal mt-1 animate-pulse">
                         {loadingTips[loadingTipsIndex]}
                       </span>
                    </div>
                  ) : (
                    '点击开启魔法换装 ✦'
                  )}
                  {/* 跑马灯光效 */}
                  {loading && (
                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                  )}
                </button>
              )}
              {(!avatarImage || !selectedItemImage) && !loading && (
                 <p className="text-center text-xs text-gray-400 mt-3">需先上传数字分身并选择一件衣服</p>
              )}
            </div>

          </div>
        )}

        {/* Lookbook Tab */}
        {activeTab === 'lookbook' && (
          <div className="pb-10">
            {savedLooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <span className="text-6xl mb-4">📓</span>
                <p className="text-gray-500 font-bold">你的穿搭画册还是空的哦</p>
                <p className="text-sm text-gray-400 mt-2">快去试试新衣服吧！</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {savedLooks.map(look => (
                  <div key={look.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col relative group">
                    <div className="aspect-[3/4] bg-gray-100 relative">
                       <img src={look.resultImage} className="w-full h-full object-cover" />
                       <button 
                         onClick={(e) => deleteSavedLook(look.id, e)}
                         className="absolute top-2 right-2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 lg:opacity-100 active:scale-90"
                       >×</button>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                       <div className="flex -space-x-2">
                         <div className="w-6 h-6 rounded-full border border-white overflow-hidden bg-gray-200">
                           <img src={look.faceImage} className="w-full h-full object-cover" />
                         </div>
                         <div className="w-6 h-6 rounded-full border border-white overflow-hidden bg-gray-200">
                           <img src={look.itemImage} className="w-full h-full object-cover" />
                         </div>
                       </div>
                       <button 
                         onClick={() => downloadImage(look.resultImage)}
                         className="text-pink-500 font-bold text-sm bg-pink-50 px-2 py-1 rounded-lg"
                       >
                         保存
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdvancedTryOnView;
