/**
 * Google AI Studio 批量生成 API Key 修复脚本
 * 
 * 修复说明：
 * 1. 增加了更灵活的选择器，兼容不同的按钮结构（button/div/span）。
 * 2. 增加了多级回退匹配，处理不同的 UI 文本变化。
 * 3. 优化了等待逻辑，提高生成成功率。
 */

(async () => {
  // ======= 配置区域 =======
  const COUNT = 86;           // 目标生成数量
  const DELAY = 3000;         // 每次生成的间隔时间 (毫秒)
  const PROJECT_NAME = "";    // 项目名称。留空 "" 则使用默认选中的项目；如果输入名称，脚本会尝试在下拉框中选择它。
  // ========================

  console.log(`🚀 开始批量生成任务: 计划生成 ${COUNT} 个 API Key...`);
  if (PROJECT_NAME) console.log(`指定项目名称: ${PROJECT_NAME}`);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (let i = 1; i <= COUNT; i++) {
    console.log(`正在处理第 ${i}/${COUNT} 个...`);

    // 1. 寻找顶层的 "Create API key" 按钮 (可能有多个，取最明显的一个)
    let mainCreateBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.trim() === 'Create API key'
    );
    
    // 如果找不到精确匹配，尝试模糊匹配
    if (!mainCreateBtn) mainCreateBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create API key'));

    if (!mainCreateBtn) {
      console.error("❌ 未找到顶层 'Create API key' 按钮。");
      break;
    }
    mainCreateBtn.click();

    // 2. 等待弹窗加载
    await sleep(2000);

    // 3. (可选) 选择指定的项目
    if (PROJECT_NAME) {
        let dropdown = document.querySelector('mat-select') || document.querySelector('[role="combobox"]') || document.querySelector('.mat-mdc-select');
        if (dropdown && !dropdown.innerText.includes(PROJECT_NAME)) {
            console.log(`正在选择项目: ${PROJECT_NAME}...`);
            dropdown.click();
            await sleep(1000);
            let option = Array.from(document.querySelectorAll('mat-option, [role="option"]')).find(opt => 
                opt.innerText.includes(PROJECT_NAME)
            );
            if (option) {
                option.click();
                await sleep(500);
            } else {
                console.warn(`⚠️ 未能在列表中找到项目 "${PROJECT_NAME}"，将使用当前选中项。`);
            }
        }
    }

    // 4. 寻找确认生成按钮
    let confirmBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => {
      const text = (el.innerText || el.textContent || "").trim();
      return (
        text === 'Create key' || 
        text === 'Create API key in existing project' || 
        text === 'Create API key in a new project' ||
        text.includes('In existing project')
      );
    });

    if (confirmBtn) {
      console.log("找到确认按钮，正在生成...");
      confirmBtn.click();
    } else {
      console.error("❌ 未找到确认生成按钮。");
      console.log("当前可见按钮文本:", Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0));
      break;
    }

    // 4. 等待生成结果弹窗并关闭
    let success = false;
    for (let retry = 0; retry < 30; retry++) {
      // 寻找关闭按钮
      const closeBtn = document.querySelector('button[aria-label="Close"]') || 
                       document.querySelector('button[aria-label="Close dialog"]') ||
                       document.querySelector('.close-button') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Close');
      
      if (closeBtn) {
        console.log(`✅ 第 ${i} 个 API Key 生成成功！`);
        await sleep(500);
        closeBtn.click();
        success = true;
        break;
      }
      await sleep(500);
    }

    if (!success) {
      console.warn(`⚠️ 第 ${i} 个可能生成超时或触发表率限制，请检查页面状态。`);
      break;
    }

    // 5. 冷却
    await sleep(DELAY);
  }

  console.log("🏁 批量生成任务结束。请刷新页面查看已生成的 Key。");
})();
