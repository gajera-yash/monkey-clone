require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching schema...");
    const { data, error } = await supabase.from('reports').select('*').limit(1);
    
    if (error) {
        console.error("Error:", error.message);
    } else {
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty. Inserting dummy to get schema.");
            const { error: insertErr } = await supabase.from('reports').insert({}).select();
            console.log("Insert Error (usually contains column info if violates null):", insertErr);
        }
    }
    process.exit(0);
}

check();
