import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');

// 手动解析 .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 找不到 Supabase 配置');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVersion() {
    console.log('🚀 正在更新数据库版本为 1.2...');
    const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'latest_version', value: '1.2', updated_at: new Date().toISOString() });

    if (error) {
        console.error('❌ 更新失败:', error);
    } else {
        console.log('✅ 数据库版本已成功更新为 1.2');
    }
}

updateVersion();
