const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
        if (error) {
            console.log("RPC get_table_columns failed, trying inspect query...");
            const { data: cols, error: err } = await supabase
                .from('profiles')
                .select('*')
                .limit(0);
            
            if (err) throw err;
            console.log("Successfully connected to profiles table.");
        } else {
            console.log("Columns:", data);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

checkSchema();
