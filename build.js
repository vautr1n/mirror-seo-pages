const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');

const PAGES_DIR = path.join(__dirname, 'pages');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');

// Clean dist
if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

// Copy sitemap
if (fs.existsSync(path.join(__dirname, 'sitemap.xml'))) {
  fs.copyFileSync(path.join(__dirname, 'sitemap.xml'), path.join(DIST_DIR, 'sitemap.xml'));
}

// Copy robots.txt
if (fs.existsSync(path.join(__dirname, 'robots.txt'))) {
  fs.copyFileSync(path.join(__dirname, 'robots.txt'), path.join(DIST_DIR, 'robots.txt'));
}

// Copy waitlist page as /waitlist/ and homepage (with correct canonical for each)
if (fs.existsSync(path.join(__dirname, 'waitlist.html'))) {
  const waitlistContent = fs.readFileSync(path.join(__dirname, 'waitlist.html'), 'utf-8');

  // /waitlist/ keeps its own canonical
  const waitlistDir = path.join(DIST_DIR, 'waitlist');
  fs.mkdirSync(waitlistDir, { recursive: true });
  fs.writeFileSync(path.join(waitlistDir, 'index.html'), waitlistContent);
  console.log('  ✓ /waitlist');

  // Homepage gets canonical rewritten to https://bymirror.ai/
  const homepageContent = waitlistContent
    .replace('href="https://bymirror.ai/waitlist"', 'href="https://bymirror.ai/"')
    .replace('"url": "https://bymirror.ai/waitlist"', '"url": "https://bymirror.ai/"')
    .replace('content="https://bymirror.ai/waitlist"', 'content="https://bymirror.ai/"');
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), homepageContent);
  console.log('  ✓ / (homepage, canonical fixed)');
}

let pageCount = 0;

function processDir(dir, urlPrefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDir(fullPath, urlPrefix + '/' + entry.name);
      continue;
    }

    if (!entry.name.endsWith('.md')) continue;

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { attributes: meta, body } = fm(raw);
    const htmlContent = marked(body);

    // Use filename as slug to avoid frontmatter slugs that include the directory path
    const slug = entry.name.replace('.md', '');
    const title = meta.title || slug;
    const description = meta.description || '';
    const keywords = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : (meta.keywords || '');
    const ogTitle = meta.og_title || title;
    const ogDescription = meta.og_description || description;
    const canonical = `https://bymirror.ai${urlPrefix}/${slug}/`;

    // Determine breadcrumb
    let breadcrumb = '';
    if (urlPrefix.includes('/vs')) breadcrumb = '<a href="/integrations">Integrations</a> / <a href="/integrations#competitors">Alternatives</a>';
    else if (urlPrefix.includes('/for')) breadcrumb = '<a href="/integrations">Integrations</a> / <a href="/integrations#complementary">Complementary tools</a>';
    else if (urlPrefix.includes('/use-case')) breadcrumb = '<a href="/integrations">Integrations</a> / <a href="/integrations#use-cases">Use cases</a>';
    else if (urlPrefix.includes('/blog')) breadcrumb = '<a href="/blog">Blog</a>';

    // Determine page type badge
    let badge = '';
    if (urlPrefix.includes('/vs')) badge = '<span class="badge badge-vs">VS</span>';
    else if (urlPrefix.includes('/for')) badge = '<span class="badge badge-for">FOR</span>';
    else if (urlPrefix.includes('/use-case')) badge = '<span class="badge badge-uc">USE CASE</span>';

    const html = TEMPLATE
      .replace(/{{title}}/g, title)
      .replace(/{{description}}/g, description)
      .replace(/{{keywords}}/g, keywords)
      .replace(/{{ogTitle}}/g, ogTitle)
      .replace(/{{ogDescription}}/g, ogDescription)
      .replace(/{{canonical}}/g, canonical)
      .replace(/{{breadcrumb}}/g, breadcrumb)
      .replace(/{{badge}}/g, badge)
      .replace(/{{content}}/g, htmlContent)
      .replace(/{{year}}/g, new Date().getFullYear());

    // Write to dist
    const outDir = path.join(DIST_DIR, urlPrefix.slice(1), slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    pageCount++;
    console.log(`  ✓ ${urlPrefix}/${slug}`);
  }
}

console.log('Building Mirror SEO pages...\n');
processDir(PAGES_DIR, '');

// Also build integrations hub if it exists at pages/integrations.md
const hubPath = path.join(PAGES_DIR, 'integrations.md');
if (fs.existsSync(hubPath)) {
  const raw = fs.readFileSync(hubPath, 'utf-8');
  const { attributes: meta, body } = fm(raw);
  const htmlContent = marked(body);
  const title = meta.title || 'Mirror Integrations';
  const description = meta.description || '';
  const html = TEMPLATE
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{keywords}}/g, meta.keywords ? meta.keywords.join(', ') : '')
    .replace(/{{ogTitle}}/g, meta.og_title || title)
    .replace(/{{ogDescription}}/g, meta.og_description || description)
    .replace(/{{canonical}}/g, 'https://bymirror.ai/integrations/')
    .replace(/{{breadcrumb}}/g, '')
    .replace(/{{badge}}/g, '')
    .replace(/{{content}}/g, htmlContent)
    .replace(/{{year}}/g, new Date().getFullYear());
  const outDir = path.join(DIST_DIR, 'integrations');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('  ✓ /integrations');
  pageCount++;
}

console.log(`\n✅ Built ${pageCount} pages → dist/`);
