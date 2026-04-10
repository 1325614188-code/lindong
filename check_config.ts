import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://naahnkzpvmjhvrdzxotp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWhua3pwdm1qaHZyZHp4b3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDY3ODksImV4cCI6MjA4NTg4Mjc4OX0.SHzf4jJFc_OoCJ21bfe0UYTsYgMy0UiRWPQQqF9oY8U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: configs, error } = await supabase
        .from('app_config')
        .select('key, value');
    
    if (error) {
        console.error('Error fetching configs:', error);
        return;
    }

    console.log('--- Current app_config keys ---');
    configs?.forEach(c => {
        console.log(`${c.key}: ${c.value ? (c.value.length > 20 ? c.value.substring(0, 20) + '...' : c.value) : '[EMPTY]'}`);
    });
}

main();
