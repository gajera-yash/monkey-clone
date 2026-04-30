
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  try {
    console.log('Checking profiles table...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      console.log('Profiles table exists.');
      if (data && data.length > 0) {
        console.log('Sample profile columns:', Object.keys(data[0]));
      } else {
        console.log('Profiles table is empty.');
      }
    }

    console.log('\nChecking coin_transactions table...');
    const { data: ctData, error: ctError } = await supabase
      .from('coin_transactions')
      .select('*')
      .limit(1);

    if (ctError) {
      console.error('Error fetching coin_transactions:', ctError);
    } else {
      console.log('coin_transactions table exists.');
    }

  } catch (err) {
    console.error('Script Error:', err);
  }
}

checkSchema();
