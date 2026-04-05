const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    try {
        console.log("Fetching packages from subscription_plans...");
        const { data: legacy, error: fetchError } = await supabase
            .from('subscription_plans')
            .select('*');
        
        if (fetchError) throw fetchError;
        if (!legacy || legacy.length === 0) {
            console.log("No legacy packages found.");
            return;
        }

        console.log(`Found ${legacy.length} packages. Migrating...`);

        for (const pkg of legacy) {
            const newPkg = {
                id: pkg.id,
                coins: pkg.coins,
                price_inr: pkg.price_monthly_inr || pkg.price || 0,
                label: pkg.name || pkg.label || `${pkg.coins} Coins`,
                is_popular: pkg.is_popular || false,
                is_active: pkg.is_active !== undefined ? pkg.is_active : true,
                display_order: pkg.sort_order || pkg.display_order || 0
            };

            console.log(`Inserting package: ${newPkg.label} (${newPkg.coins} Coins)...`);
            const { error: insertError } = await supabase
                .from('coin_packages')
                .upsert(newPkg);
            
            if (insertError) {
                console.error(`Error inserting ${newPkg.id}:`, insertError);
            } else {
                console.log(`Success!`);
            }
        }

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration fatal error:", err);
    }
}

migrate();
