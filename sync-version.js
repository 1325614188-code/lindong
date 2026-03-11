import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;

// 读取 package.json 获取版本号
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version; // e.g., "1.2.0"
const shortVersion = version.split('.').slice(0, 2).join('.'); // e.g., "1.2"

console.log(`🚀 正在同步项目版本号: ${version} (${shortVersion})`);

// 1. 同步 version.ts
const versionTsPath = path.join(rootDir, 'version.ts');
if (fs.existsSync(versionTsPath)) {
    fs.writeFileSync(versionTsPath, `export const APP_VERSION = '${shortVersion}';\n`);
    console.log('✅ version.ts 同步成功');
}

// 2. 同步 App.tsx
const appTsxPath = path.join(rootDir, 'App.tsx');
let appTsx = fs.readFileSync(appTsxPath, 'utf8');
// 同时支持旧的常量替换和确保导入存在（如果还没改的话）
appTsx = appTsx.replace(/const CURRENT_VERSION = '[\d.]+';/, `const CURRENT_VERSION = '${shortVersion}';`);
fs.writeFileSync(appTsxPath, appTsx);
console.log('✅ App.tsx 同步成功');

// 2. 同步 AdminView.tsx
const adminViewPath = path.join(rootDir, 'views', 'AdminView.tsx');
if (fs.existsSync(adminViewPath)) {
    let adminView = fs.readFileSync(adminViewPath, 'utf8');
    adminView = adminView.replace(/本地版本: v[\d.]+/g, `本地版本: v${shortVersion}`);
    fs.writeFileSync(adminViewPath, adminView);
    console.log('✅ AdminView.tsx 同步成功');
}

// 4. 同步 Android build.gradle
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
    let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    // 自动增加 versionCode
    buildGradle = buildGradle.replace(/versionCode (\d+)/, (match, p1) => `versionCode ${parseInt(p1) + 1}`);
    buildGradle = buildGradle.replace(/versionName "[\d.]+"/, `versionName "${shortVersion}"`);
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('✅ Android build.gradle 同步并自动增加 versionCode 成功');
}

// 4. 同步 iOS project.pbxproj
const pbxprojPath = path.join(rootDir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (fs.existsSync(pbxprojPath)) {
    let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
    pbxproj = pbxproj.replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${shortVersion};`);
    fs.writeFileSync(pbxprojPath, pbxproj);
    console.log('✅ iOS project.pbxproj 同步成功');
}

console.log('✨ 所有版本号同步完成！记得提交代码。');
