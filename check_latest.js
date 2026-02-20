const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://naahnkzpvmjhvrdzxotp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWhua3pwdm1qaHZyZHp4b3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDY3ODksImV4cCI6MjA4NTg4Mjc4OX0.SHzf4jJFc_OoCJ21bfe0UYTsYgMy0UiRWPQQqF9oY8U'
);

async function checkLatestAccount() {
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, credits, points, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log("=== LATEST 3 USERS ===");
    console.log(users);

    if (users && users.length > 0) {
        const latestUser = users[0];
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', latestUser.id)
            .order('created_at', { ascending: false });

        console.log(`\n=== ORDERS FOR LATEST USER (${latestUser.username}) ===`);
        console.log(orders);
    }
}
checkLatestAccount();
