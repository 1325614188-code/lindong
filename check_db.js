const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://naahnkzpvmjhvrdzxotp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWhua3pwdm1qaHZyZHp4b3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDY3ODksImV4cCI6MjA4NTg4Mjc4OX0.SHzf4jJFc_OoCJ21bfe0UYTsYgMy0UiRWPQQqF9oY8U'
);

async function test() {
    const { data: latestOrders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);

    console.log("Latest orders:", latestOrders);

    if (latestOrders && latestOrders.length > 0) {
        const order = latestOrders[0];
        const { data: user } = await supabase.from('users').select('id, username, credits, points').eq('id', order.user_id).single();
        console.log("User for latest order:", user);
    }
}
test();
