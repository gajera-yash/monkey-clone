const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const testId = '00000000-0000-0000-0000-' + Math.floor(Math.random() * 999999999999).toString().padStart(12, '0');
    try {
        console.log("Attempting to insert test user:", testId);
        // We insert without coins to see the default
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: testId,
                username: 'TestUser_' + Math.floor(Math.random() * 1000),
                email: 'test@example.com'
            })
            .select();
        
        if (error) throw error;
        console.log("Inserted User Data:", data);
        
        // Cleanup
        await supabase.from('profiles').delete().eq('id', testId);
        console.log("Deleted test user.");
    } catch (err) {
        console.error("Error during test insert:", err.message || err);
    }
}

testInsert();
