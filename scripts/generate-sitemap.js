const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Simple .env parser since we might not have dotenv as direct dependency
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    // Ignore comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const DOMAIN = 'https://strangy.in';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Key not found. Please ensure .env contains REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const staticRoutes = [
  '/',
  '/chat',
  '/safety',
  '/about',
  '/terms',
  '/privacy',
  '/help',
  '/contact',
  '/report-bug',
  '/community',
  '/blog'
];

async function generateSitemap() {
  console.log('Generating sitemap...');
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Add static routes
  staticRoutes.forEach(route => {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${DOMAIN}${route}</loc>\n`;
    sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    sitemap += `    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>\n`;
    sitemap += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;
    sitemap += `  </url>\n`;
  });

  // Fetch blogs
  try {
    const { data: blogs, error } = await supabase
      .from('blogs')
      .select('slug, updated_at, created_at')
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching blogs for sitemap:', error.message);
    } else if (blogs && blogs.length > 0) {
      blogs.forEach(blog => {
        const date = blog.updated_at || blog.created_at;
        const lastmod = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${DOMAIN}/blog/${blog.slug}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.7</priority>\n`;
        sitemap += `  </url>\n`;
      });
      console.log(`Added ${blogs.length} blogs to sitemap.`);
    }
  } catch (err) {
    console.error('Failed to query blogs:', err.message);
  }

  sitemap += `</urlset>`;

  const publicPath = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }

  fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully at public/sitemap.xml');
}

generateSitemap();
