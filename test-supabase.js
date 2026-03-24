const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching coin_transactions schema...");
  // Test schema by inserting a fake row (or just checking error)
  const { data, error } = await supabase
    .from('coin_transactions')
    .insert({
        user_id: '12345678-1234-1234-1234-123456789012', // dummy uuid
        transaction_type: 'purchase',
        coins_amount: 100,
        coins_balance_after: 100,
        description: 'Test',
        payment_status: 'completed'
    })
    .select();
    
  console.log("Insert result:", { data, error });
}

test();
