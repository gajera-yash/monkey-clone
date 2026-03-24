const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDefault() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('coins')
            .limit(1);
        
        if (error) throw error;
        console.log("Sample Profile Coins:", data);

        // We can't query information_schema via anon key usually, 
        // but we can try to insert a dummy user and see what coins they get.
        // Or we can check if there's any RPC to get schema.
    } catch (err) {
        console.error("Error:", err);
    }
}

checkDefault();
