const { getMarketplaceLinks, getSponsorSlot, affiliateDisclosure } = require('./monetization');
const { listProducts } = require('./products');
const { revenueDashboard } = require('./fulfillment');

function renderDashboard(sites, baseUrl, portfolio = null) {
  const revenue = revenueDashboard();
  const totals = revenue.totals || {};
  const marketplaces = getMarketplaceLinks();
  const sponsor = getSponsorSlot();
  const digitalProducts = listProducts({ type: 'digital' });
  const rankedSites = [...sites]
    .sort((a, b) => Number(b.postCount || 0) - Number(a.postCount || 0))
    .slice(0, 5);
  const funnelBySite = new Map(
    (revenue.topFunnels || []).map((row) => [String(row.site || '').toLowerCase(), row])
  );
  const revenueRows = (revenue.topFunnels || []).slice(0, 6);
  const maxRevenue = Math.max(1, ...revenueRows.map((row) => Number(row.revenueCents || 0)));

  const siteRows = sites.length
    ? sites
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .map((site) => {
          const mainUrl = `/sites/${site.slug}/`;
          const funnel = funnelBySite.get(String(site.name || site.slug || '').toLowerCase()) ||
            funnelBySite.get(String(site.slug || '').toLowerCase());
          return `<article class="property-row">
            <div class="property-index">${escapeHtml(String(site.name || site.slug || '?').slice(0, 2).toUpperCase())}</div>
            <div class="property-copy">
              <div class="property-title"><a href="${escapeHtml(mainUrl)}" target="_blank" rel="noopener">${escapeHtml(site.name)}</a></div>
              <p>${escapeHtml(site.tagline || 'Generated digital property')}</p>
            </div>
            <div class="property-stat"><strong>${Number(site.postCount || 0)}</strong><span>posts</span></div>
            <div class="property-stat"><strong>${funnel ? formatMoney(funnel.revenueCents) : '—'}</strong><span>recorded revenue</span></div>
            <time datetime="${escapeHtml(site.createdAt || '')}">${escapeHtml(formatRelative(site.createdAt))}</time>
          </article>`;
        })
        .join('\n')
    : `<div class="empty-state"><strong>No digital properties are registered yet.</strong><span>The generator will populate this surface after the first verified site record is created.</span></div>`;

  const topSites = rankedSites.length
    ? rankedSites
        .map((site, index) => {
          const funnel = funnelBySite.get(String(site.name || site.slug || '').toLowerCase()) ||
            funnelBySite.get(String(site.slug || '').toLowerCase());
          return `<div class="rank-row">
            <span class="rank">${index + 1}</span>
            <div><strong>${escapeHtml(site.name)}</strong><small>${Number(site.postCount || 0)} published posts</small></div>
            <b>${funnel ? formatMoney(funnel.revenueCents) : `${Number(site.postCount || 0)} posts`}</b>
          </div>`;
        })
        .join('')
    : '<div class="empty-compact">No ranked properties yet.</div>';

  const revenueBars = revenueRows.length
    ? revenueRows
        .map((row) => {
          const percentage = Math.max(4, Math.round((Number(row.revenueCents || 0) / maxRevenue) * 100));
          return `<div class="revenue-row">
            <span>${escapeHtml(row.site || 'Unknown')}</span>
            <div class="bar-track"><i style="width:${percentage}%"></i></div>
            <strong>${formatMoney(row.revenueCents)}</strong>
          </div>`;
        })
        .join('')
    : `<div class="chart-empty"><span class="zero-line"></span><strong>$0.00 recorded</strong><small>Revenue bars appear only after verified purchase records exist.</small></div>`;

  const productCards = digitalProducts
    .slice(0, 4)
    .map((product) => `<a class="product-card" href="/store#product-${product.id}">
      <span>${escapeHtml(product.offerTier || 'digital')}</span>
      <strong>${escapeHtml(product.name)}</strong>
      <small>${escapeHtml(product.description)}</small>
      <b>$${Number(product.price || 0).toFixed(2)}</b>
    </a>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#07100e">
  <meta name="description" content="BeyondMythos autonomous digital property deployment dashboard">
  <title>BeyondMythos · Portfolio Overview</title>
  <style>
    :root{color-scheme:dark;--bg:#050a09;--panel:#0a1311;--panel2:#0c1815;--line:rgba(104,255,214,.12);--line2:rgba(104,255,214,.24);--text:#f1fbf7;--muted:#7e9990;--teal:#64f4ce;--amber:#f1b86a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}html{background:var(--bg);scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--text);background:radial-gradient(circle at 18% -10%,rgba(40,255,198,.12),transparent 30rem),radial-gradient(circle at 95% 12%,rgba(40,255,198,.06),transparent 24rem),linear-gradient(180deg,#07100e,#030605 72%)}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.035;background-image:linear-gradient(rgba(255,255,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.16) 1px,transparent 1px);background-size:44px 44px}a{color:inherit;text-decoration:none}.app{position:relative;display:grid;min-height:100vh;grid-template-columns:230px minmax(0,1fr)}.rail{position:sticky;top:0;height:100vh;padding:22px 16px;border-right:1px solid var(--line);background:rgba(3,9,7,.88);backdrop-filter:blur(18px);display:flex;flex-direction:column;z-index:2}.brand{display:flex;align-items:center;gap:11px;padding:0 6px 19px;border-bottom:1px solid var(--line)}.brand-mark{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line2);border-radius:12px;background:linear-gradient(145deg,rgba(100,244,206,.2),rgba(100,244,206,.03));color:var(--teal);font-weight:900;box-shadow:0 0 30px rgba(100,244,206,.08)}.brand strong{display:block;font-size:13px}.brand small{display:block;margin-top:4px;color:#527067;font-size:8px;text-transform:uppercase;letter-spacing:.18em}.nav{display:grid;gap:5px;margin-top:18px}.nav a{display:flex;align-items:center;gap:11px;padding:10px 11px;border:1px solid transparent;border-radius:11px;color:#718980;font-size:11px}.nav a:before{content:"";width:8px;height:8px;border:1px solid currentColor;border-radius:3px}.nav a:hover,.nav a.active{border-color:var(--line);background:linear-gradient(90deg,rgba(100,244,206,.11),rgba(100,244,206,.02));color:#dffbf2}.nav a.active:before{background:var(--teal);border-color:var(--teal);box-shadow:0 0 12px rgba(100,244,206,.7)}.plan{margin-top:auto;padding:13px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025)}.plan span,.plan strong,.plan small{display:block}.plan span{color:var(--teal);font-size:8px;text-transform:uppercase;letter-spacing:.16em}.plan strong{margin-top:7px;font-size:12px}.plan small{margin-top:4px;color:var(--muted);font-size:9px;line-height:1.5}.main{min-width:0;padding:24px clamp(18px,3vw,42px) 52px}.topbar{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;padding-bottom:22px;border-bottom:1px solid var(--line)}.eyebrow{margin:0;color:var(--teal);font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.2em}.topbar h1{margin:8px 0 0;font-size:clamp(2rem,4.5vw,4rem);letter-spacing:-.055em}.top-actions{display:flex;gap:8px;flex-wrap:wrap}.top-actions a{padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025);color:#9bb3aa;font-size:9px;text-transform:uppercase;letter-spacing:.12em}.top-actions a.primary{border-color:rgba(100,244,206,.25);background:rgba(100,244,206,.09);color:#caffef}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.metric{min-height:114px;padding:17px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,rgba(14,28,24,.96),rgba(7,14,12,.94));box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.metric span{display:block;color:#698078;font-size:8px;text-transform:uppercase;letter-spacing:.15em}.metric strong{display:block;margin-top:13px;font-size:clamp(1.55rem,3vw,2.3rem);letter-spacing:-.04em}.metric small{display:block;margin-top:8px;color:#4e6d63;font-size:8px}.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:14px;margin-top:14px}.panel{min-width:0;padding:18px;border:1px solid var(--line);border-radius:18px;background:rgba(8,18,15,.88)}.panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px}.panel-head h2{margin:6px 0 0;font-size:15px}.panel-head>a,.panel-head>span{color:#5f8276;font-size:8px;text-transform:uppercase;letter-spacing:.13em}.revenue-chart{display:grid;gap:13px;margin-top:22px}.revenue-row{display:grid;grid-template-columns:105px minmax(0,1fr) 76px;gap:10px;align-items:center;font-size:9px}.revenue-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#89a097}.revenue-row>strong{text-align:right;color:#c8e5db;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.bar-track{height:10px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.045)}.bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2ec99e,#77f2cf);box-shadow:0 0 16px rgba(100,244,206,.18)}.chart-empty{min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--muted)}.zero-line{width:min(90%,440px);height:2px;background:linear-gradient(90deg,transparent,rgba(100,244,206,.35),transparent)}.chart-empty strong{margin-top:20px;color:#b8d2c9}.chart-empty small{margin-top:8px;max-width:330px;line-height:1.55}.rank-list{display:grid;gap:10px;margin-top:19px}.rank-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:1px solid rgba(104,255,214,.08);border-radius:12px;background:rgba(255,255,255,.018)}.rank{display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:9px;background:rgba(100,244,206,.1);color:var(--teal);font-size:9px;font-weight:800}.rank-row strong,.rank-row small{display:block}.rank-row strong{font-size:10px}.rank-row small{margin-top:3px;color:#587168;font-size:8px}.rank-row b{color:#9ab8ad;font-size:9px;font-weight:600}.properties{margin-top:14px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:rgba(8,18,15,.88)}.properties-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;padding:18px;border-bottom:1px solid var(--line)}.properties-head h2{margin:6px 0 0;font-size:15px}.properties-head span{color:#5f8276;font-size:8px;text-transform:uppercase;letter-spacing:.13em}.property-row{display:grid;grid-template-columns:38px minmax(0,1fr) 82px 116px 70px;gap:12px;align-items:center;padding:13px 18px;border-top:1px solid rgba(104,255,214,.06)}.property-row:first-of-type{border-top:0}.property-index{display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:10px;background:rgba(100,244,206,.06);color:var(--teal);font-size:8px;font-weight:850}.property-title{display:flex;gap:8px;align-items:center}.property-title a{font-size:11px;font-weight:650}.property-title span{padding:3px 5px;border-radius:999px;background:rgba(241,184,106,.1);color:var(--amber);font-size:6px;text-transform:uppercase;letter-spacing:.1em}.property-copy p{margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#60786f;font-size:8px}.property-stat strong,.property-stat span{display:block}.property-stat strong{font-size:10px}.property-stat span{margin-top:3px;color:#4f695f;font-size:7px}.property-row time{color:#50685f;font-size:8px;text-align:right}.empty-state{padding:44px 18px;text-align:center}.empty-state strong,.empty-state span{display:block}.empty-state span{margin-top:8px;color:var(--muted);font-size:10px}.commerce{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,.55fr);gap:14px;margin-top:14px}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.product-card{position:relative;min-height:145px;padding:14px;border:1px solid rgba(104,255,214,.08);border-radius:13px;background:rgba(255,255,255,.018)}.product-card span,.product-card strong,.product-card small,.product-card b{display:block}.product-card span{color:var(--teal);font-size:7px;text-transform:uppercase;letter-spacing:.14em}.product-card strong{margin-top:10px;font-size:10px}.product-card small{margin-top:6px;color:#5c756c;font-size:8px;line-height:1.5}.product-card b{position:absolute;right:13px;bottom:12px;color:#a9c5bb;font-size:9px}.market-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.market-links a{padding:7px 9px;border:1px solid var(--line);border-radius:999px;color:#8aa69c;font-size:8px}.sponsor{margin-top:15px;padding:13px;border:1px solid rgba(241,184,106,.16);border-radius:13px;background:rgba(241,184,106,.05)}.sponsor strong,.sponsor span,.sponsor a{display:block}.sponsor strong{font-size:10px}.sponsor span{margin-top:5px;color:#876f54;font-size:8px}.sponsor a{margin-top:8px;color:var(--amber);font-size:8px}.capabilities{max-width:900px;margin:40px auto 0;text-align:center}.capabilities>p{margin:0;font-size:clamp(1.35rem,2.7vw,2.2rem);line-height:1.45;letter-spacing:-.035em;color:#c9dbd5}.capability-pills{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:18px}.capability-pills span{padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.02);color:#789289;font-size:9px}.footer{margin-top:32px;padding-top:18px;border-top:1px solid var(--line);color:#4f675f;font-size:8px;line-height:1.7}.footer a{color:#79a697}.empty-compact{padding:25px;text-align:center;color:var(--muted);font-size:9px}
    @media(max-width:1080px){.metrics{grid-template-columns:repeat(2,1fr)}.dashboard-grid,.commerce{grid-template-columns:1fr}.property-row{grid-template-columns:38px minmax(0,1fr) 70px}.property-row .property-stat:nth-of-type(2),.property-row time{display:none}}
    @media(max-width:760px){.app{display:block}.rail{position:static;width:100%;height:auto;flex-direction:row;align-items:center;padding:12px 14px;border-right:0;border-bottom:1px solid var(--line)}.brand{padding:0;border:0}.brand div,.nav,.plan{display:none}.main{padding:18px 14px 40px}.topbar{align-items:flex-start}.top-actions a:not(.primary){display:none}.property-row{padding-inline:12px}.product-grid{grid-template-columns:1fr}}
    @media(max-width:520px){.metrics{grid-template-columns:1fr}.revenue-row{grid-template-columns:82px minmax(0,1fr)}.revenue-row>strong{display:none}.property-row{grid-template-columns:34px minmax(0,1fr)}.property-stat{display:none}}
  </style>
</head>
<body data-base-url="${escapeHtml(baseUrl || '')}">
  <div class="app">
    <aside class="rail">
      <a class="brand" href="/"><span class="brand-mark">BM</span><div><strong>BeyondMythos</strong><small>Deployment engine</small></div></a>
      <nav class="nav" aria-label="Portfolio navigation">
        <a class="active" href="#overview">Portfolio</a><a href="#properties">Sites</a><a href="#commerce">Products</a><a href="/api/portfolio/dashboard">Orders</a><a href="/api/customer/access/request">Customers</a><a href="#revenue">Analytics</a><a href="/portfolio">Settings</a>
      </nav>
      <div class="plan"><span>Review mode</span><strong>Autonomous property operations</strong><small>No secrets, payment authority, deployment targets, or domain settings are changed by this interface branch.</small></div>
    </aside>

    <main class="main" id="overview">
      <header class="topbar">
        <div><p class="eyebrow">Autonomous digital property deployment engine</p><h1>Portfolio Overview</h1></div>
        <div class="top-actions"><a href="/api/status">System status</a><a href="/portfolio">Strategy</a><a class="primary" href="/store">Open Commerce</a></div>
      </header>

      <section class="metrics" aria-label="Portfolio metrics">
        <article class="metric"><span>Active Sites</span><strong>${sites.length}</strong><small>Current registry records</small></article>
        <article class="metric"><span>Total Revenue</span><strong>${formatMoney(totals.netRevenueCents || 0)}</strong><small>Net of recorded refunds</small></article>
        <article class="metric"><span>Orders</span><strong>${Number(totals.purchasesCompleted || 0)}</strong><small>Verified paid purchases</small></article>
        <article class="metric"><span>Mapped Domains</span><strong>${Number(portfolio && portfolio.domainCount || 0)}</strong><small>Portfolio strategy records</small></article>
      </section>

      <section class="dashboard-grid">
        <article class="panel" id="revenue">
          <div class="panel-head"><div><p class="eyebrow">Commerce telemetry</p><h2>Revenue Overview</h2></div><a href="/api/portfolio/dashboard">Live JSON →</a></div>
          <div class="revenue-chart">${revenueBars}</div>
        </article>
        <article class="panel">
          <div class="panel-head"><div><p class="eyebrow">Network ranking</p><h2>Top Sites</h2></div><span>Posts / verified revenue</span></div>
          <div class="rank-list">${topSites}</div>
        </article>
      </section>

      <section class="properties" id="properties">
        <div class="properties-head"><div><p class="eyebrow">Operating properties</p><h2>Deployment registry</h2></div><span>${sites.length} current records</span></div>
        ${siteRows}
      </section>

      <section class="commerce" id="commerce">
        <article class="panel">
          <div class="panel-head"><div><p class="eyebrow">Product catalog</p><h2>Commerce inventory</h2></div><a href="/store">View store →</a></div>
          <div class="product-grid">${productCards || '<div class="empty-compact">No digital products are configured.</div>'}</div>
        </article>
        <article class="panel">
          <div class="panel-head"><div><p class="eyebrow">Distribution</p><h2>Marketplace connections</h2></div><span>${marketplaces.length} links</span></div>
          <div class="market-links">${marketplaces.map((link) => `<a href="${escapeHtml(link.url)}" rel="noopener nofollow">${escapeHtml(link.label)}</a>`).join('') || '<span class="empty-compact">No marketplace links configured.</span>'}</div>
          ${sponsor ? `<div class="sponsor"><strong>${escapeHtml(sponsor.name)}</strong><span>${escapeHtml(sponsor.tagline)}</span><a href="${escapeHtml(sponsor.url)}" rel="sponsored nofollow noopener">Sponsor destination →</a></div>` : ''}
          <p class="footer">${escapeHtml(affiliateDisclosure())}</p>
        </article>
      </section>

      <section class="capabilities">
        <p>Launch, operate, and scale digital properties with governed content, commerce, fulfillment, and verifiable operating records.</p>
        <div class="capability-pills"><span>Automation</span><span>Commerce</span><span>SaaS</span></div>
      </section>

      <footer class="footer">API: <a href="/api/status">/api/status</a> · Registry: <a href="/api/blog-sites">/api/blog-sites</a> · Portfolio: <a href="/api/portfolio/dashboard">/api/portfolio/dashboard</a>. This review branch changes presentation only and does not deploy generated properties.</footer>
    </main>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(cents) {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatRelative(iso) {
  const timestamp = new Date(iso || '').getTime();
  if (!Number.isFinite(timestamp)) return 'recorded';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

module.exports = { renderDashboard };
