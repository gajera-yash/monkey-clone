require('dotenv').config({path: './server/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xzveyvqflkzqzthmnnud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
const supabase = createClient(supabaseUrl, supabaseKey);

const contentHtml = `
<p>India's live video chat economy is exploding. Thousands of women across Tier 2 and Tier 3 cities are earning ₹20,000–₹80,000 per month — just by going live and talking to strangers. Here's exactly how it works, what platforms pay the most, and how to start today.</p>
<p>In 2026, live video chat is no longer just entertainment — it is a legitimate income stream. With affordable smartphones and cheap 4G data available in every corner of India, creators from cities like Surat, Patna, Indore, and Bhopal are building full-time incomes through video platforms.</p>
<p>The numbers tell the story: India now has over 700 million internet users, and live streaming revenue in India is projected to cross ₹8,000 crore by 2027. The opportunity is real — the only question is where to start.</p>
<p>Platforms like Strangy connect male users who want to meet and talk to new people with female creators who are paid for that time and engagement. The earning model works in two ways:</p>
<ul>
<li><strong>Per-minute video call earnings</strong> — Every minute a user spends on a call with you, you earn coins that convert to cash.</li>
<li><strong>Virtual gifts</strong> — During live sessions or calls, users send digital gifts. Each gift has a coin value that pays out to you.</li>
</ul>
<p>No content creation skills needed. No need to dance or perform. The value is in genuine connection and conversation.</p>

<h2>Step-by-Step: How to Start Earning on Strangy</h2>
<ol>
<li><strong>Apply as a Creator:</strong> Fill out the creator signup form on Strangy. Verification is done within 24–48 hours. Your profile goes live once approved.</li>
<li><strong>Set Up Your Profile:</strong> Add a clear photo, a short bio, and your interests. Profiles with complete info get 3x more call requests from users.</li>
<li><strong>Go Live or Accept Calls:</strong> You choose when you're available. Users will send you call requests. Accept, chat, earn — it's that simple.</li>
<li><strong>Collect Coins &amp; Gifts:</strong> Every call minute and every gift adds coins to your wallet in real time. Your dashboard shows exactly what you've earned.</li>
<li><strong>Withdraw via UPI:</strong> Request a withdrawal directly to your UPI ID. Payments are processed within 48 hours — no middlemen, no delays.</li>
</ol>

<h2>5 Tips to Earn More as a New Creator</h2>
<ul>
<li><strong>Be consistent</strong> with your online hours. Users come back to creators they can reliably find. Pick a daily time slot and stick to it.</li>
<li><strong>Complete your profile fully.</strong> A real photo, a genuine bio, and listed interests dramatically increase your call rate.</li>
<li><strong>Engage, don't just answer.</strong> Ask users questions. Make the conversation feel like they called a friend, not a stranger.</li>
<li><strong>Thank gift senders publicly.</strong> When a user sends you a gift during a call, acknowledge it. It encourages more.</li>
<li><strong>Stay safe.</strong> Never share your personal phone number, address, or social profiles. Strangy handles all communication inside the platform.</li>
</ul>

<h2>Is This Safe? Frequently Asked Questions</h2>
<p><strong>Is Strangy safe for female creators?</strong><br/>Yes. All users go through registration and agree to a code of conduct. You can end any call instantly. Our moderation team reviews reports within 24 hours.</p>
<p><strong>Do I need a smartphone or laptop?</strong><br/>A smartphone with a decent camera is enough. No expensive setup needed. Most active creators use a basic Android phone.</p>
<p><strong>How do I withdraw my earnings?</strong><br/>Simply request a withdrawal in your wallet section. Payments go directly to your UPI ID — works with PhonePe, GPay, Paytm, and all major UPI apps.</p>
<p><strong>Is there a minimum withdrawal amount?</strong><br/>Yes — the minimum withdrawal is ₹500. Once you hit that threshold, you can request a payout any time.</p>
<p><strong>Can I do this part-time alongside my job or studies?</strong><br/>Absolutely. Many Strangy creators earn while studying or working. You choose your own hours — there's no fixed schedule.</p>
`;

async function insertBlog() {
  const payload = {
    title: 'Test anon long 3',
    slug: 'test-anon-long-3',
    short_description: "test",
    meta_description: 'test',
    content: contentHtml,
    tags: ['test'],
    is_published: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1200&auto=format&fit=crop',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('blogs').insert([payload]);
  if (error) {
    console.log('Error inserting:', error);
  } else {
    console.log('Successfully inserted blog!');
  }
}

insertBlog();
