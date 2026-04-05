const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPackages() {
    try {
        console.log("Checking coin_packages table...");
        const { data, error } = await supabase
            .from('coin_packages')
            .select('*');
        
        if (error) {
            console.error("Error fetching from coin_packages:", error);
        } else {
            console.log("coin_packages data (count):", data ? data.length : 0);
            console.log("coin_packages sample:", data ? data.slice(0, 2) : []);
        }

        console.log("Checking subscription_plans table (legacy fallback)...");
        const { data: subData, error: subError } = await supabase
            .from('subscription_plans')
            .select('*');
        
        if (subError) {
            console.error("Error fetching from subscription_plans:", subError);
        } else {
            console.log("subscription_plans data (count):", subData ? subData.length : 0);
            console.log("subscription_plans sample:", subData ? subData.slice(0, 2) : []);
        }

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

checkPackages();
