const fs = require('fs');
const path = require('path');

const registryPath = path.join(process.cwd(), 'data', 'blog-sites.json');
const publicDir = path.join(process.cwd(), 'public');
const outputPath = path.join(publicDir, 'index.html');
const backendUrl = (process.env.BEYONDMYTHOS_BACKEND_URL || '').replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const sites = Array.isArray(registry.sites) ? registry.sites : [];
const sorted = [...sites].sort((a, b) => new Date(b.lastPostAt || b.createdAt || 0) - new Date(a.lastPostAt || a.createdAt || 0));

const cards = sorted.map((site) => {
  const categories = (site.categories || []).slice(0, 4).map(escapeHtml).join(' · ');
  return `<article class="card">
    <div class="eyebrow">${escapeHtml(site.design || 'dispatch')}</div>
    <h2><a href="./sites/${encodeURIComponent(site.slug)}/">${escapeHtml(site.name)}</a></h2>
    <p>${escapeHtml(site.tagline)}</p>
    <div class="meta">${Number(site.postCount || 0)} posts${categories ? ` · ${categories}` : ''}</div>
    <a class="button" href="./sites/${encodeURIComponent(site.slug)}/">Open publication →</a>
  </article>`;
}).join('\n');

const backendLinks = backendUrl ? `<nav class="backend-links">
  <a href="${escapeHtml(backendUrl)}/store">Store</a>
  <a href="${escapeHtml(backendUrl)}/portfolio">Portfolio</a>
</nav>` : '<p class="backend-note">Commerce and account services are being moved to a dedicated backend.</p>';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BeyondMythos</title>
  <meta name="description" content="Independent AI-assisted publications from BeyondMythos.">
  <link rel="canonical" href="https://beyondmythos.com/">
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#090d18;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1180px;margin:auto;padding:56px 22px 80px}header{display:flex;gap:24px;align-items:flex-end;justify-content:space-between;border-bottom:1px solid #27304a;padding-bottom:30px;margin-bottom:34px}h1{font-size:clamp(42px,8vw,86px);line-height:.92;margin:0;letter-spacing:-.05em}.lede{max-width:620px;color:#a7b0c5;font-size:18px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{border:1px solid #27304a;background:#0e1424;border-radius:16px;padding:22px}.card h2{margin:8px 0 10px;font-size:24px}.card h2 a{color:#fff;text-decoration:none}.card p{color:#a7b0c5;min-height:48px;line-height:1.5}.eyebrow,.meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#7dd3fc}.meta{color:#768199;margin:18px 0}.button,.backend-links a{display:inline-block;color:#0b1020;background:#7dd3fc;padding:10px 13px;border-radius:9px;text-decoration:none;font-weight:700}.backend-links{display:flex;gap:10px;flex-wrap:wrap}.backend-note{color:#768199;font-size:14px}footer{margin-top:48px;color:#768199;border-top:1px solid #27304a;padding-top:22px}@media(max-width:680px){header{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <main class="wrap">
    <header>
      <div><div class="eyebrow">Independent publishing network</div><h1>Beyond<br>Mythos</h1></div>
      <div><p class="lede">A living network of niche publications. New sites and stories are generated into this repository and published directly through GitHub Pages.</p>${backendLinks}</div>
    </header>
    <section class="grid">${cards || '<p>No publications are registered yet.</p>'}</section>
    <footer>${sites.length} publications · Static frontend hosted with GitHub Pages</footer>
  </main>
</body>
</html>`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote ${outputPath} with ${sites.length} publications.`);
