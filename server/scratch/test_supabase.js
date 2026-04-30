
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSignup() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  
  try {
    console.log('Attempting to create user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth Error:', authError);
      return;
    }

    console.log('User created:', authData.user.id);

    console.log('Attempting to create profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        username: 'testuser',
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile Error:', profileError);
    } else {
      console.log('Profile created successfully');
    }

    // Cleanup
    console.log('Cleaning up test user...');
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('Test completed.');

  } catch (err) {
    console.error('Script Error:', err);
  }
}

testSignup();
