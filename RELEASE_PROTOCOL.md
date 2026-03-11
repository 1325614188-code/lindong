# APP 版本更新管理制度 (Release Protocol)

为了确保 APP 版本号的一致性，防止出现“已安装新版但仍提示更新”的问题，特制定本制度。

## 1. 核心制度：版本号确认机制
> [!IMPORTANT]
> **AI 助理职责**：每当涉及功能更新、Bug 修复或准备打包时，AI 助理必须主动询问：“本次更新的版本号是多少？”

## 2. 操作流程：单一数据源管理
本项目采用 `package.json` 作为唯一版本来源。更新步骤如下：

1. **修改版本号**：在 `package.json` 中修改 `"version"` 字段（例如 `"1.3.0"`）。
2. **执行同步**：在终端运行 `npm run sync-version`。
   - 该脚本会自动更新 `App.tsx`、`AdminView.tsx`、安卓 `build.gradle` 和 iOS 配置，确保全项目同步。
3. **打包构建**：
   - 运行 `npm run build`
   - 运行 `npx cap copy`
   - 使用工具重新导出安装包（如 Android Studio）。
4. **后台配置**：在管理后台将“最新版本号”同步更新为对应版本号。

## 3. 约定说明
- 本制度已作为项目的核心开发规范，记录在 [RELEASE_PROTOCOL.md](file:///d:/kaifaruanjian/meilishiyanshi/RELEASE_PROTOCOL.md)。
- 以后如果您发布指示，我会优先检查版本号。
