const express = require("express");
const cors = require("cors");
const path = require("path");
const Stripe = require("stripe");
const registry = require("./lib/registry");
const { renderDashboard } = require("./lib/dashboard");
const { generateBlogSite } = require("./lib/blog-site-generator");
const { getBaseUrl } = require("./lib/config");
const { contentModeLabel } = require("./lib/content-provider");
const { listProducts, listCategories, listProductTypes } = require("./lib/products");
const { buildCheckoutLineItems } = require("./lib/checkout");
const { purchasePayloadFromSession } = require("./lib/stripe-webhooks");
const { getMarketplaceLinks, getSponsorSlot, affiliateDisclosure } = require("./lib/monetization");
const { recordNewsletterSignup } = require("./lib/newsletter");
const { loadPortfolioStrategy, summarizePortfolio, listPortfolioDomains } = require("./lib/portfolio");
const {
  recordCheckoutStarted,
  recordPurchase,
  requestCustomerAccess,
  customerAccess,
  resolveDigitalAccess,
  recoverPurchaseAccess,
  markPurchaseRefunded,
  revenueDashboard
} = require("./lib/fulfillment");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const normalized = origin.replace(/\/+$/, "");
            return callback(null, allowedOrigins.includes(normalized));
          }
        }
      : undefined
  )
);
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook is not configured" });
  }

  const signature = req.get("stripe-signature");
  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return res.json({ received: true });
  }

  const session = event.data?.object;
  if (!session?.id || session.payment_status !== "paid") {
    return res.json({ received: true });
  }

  try {
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ["data.price.product"]
    });
    const purchasePayload = purchasePayloadFromSession({
      session,
      lineItems: lineItemsResponse?.data || []
    });

    if (!purchasePayload.email || !purchasePayload.items.length) {
      console.warn("Stripe webhook ignored due to incomplete purchase payload", {
        sessionId: session.id
      });
      return res.json({ received: true, ignored: true });
    }

    const result = recordPurchase(purchasePayload);
    if (result.error) {
      console.warn("Stripe webhook purchase record rejected:", {
        sessionId: session.id,
        error: result.error
      });
      return res.json({ received: true, ignored: true });
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook purchase sync failed:", error.message);
    return res.status(500).json({ error: "Failed to process Stripe webhook" });
  }
});
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let stripeClient;
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = Stripe(key);
  return stripeClient;
}

function getStripeWebhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPortfolioPage(strategy, summary, revenue) {
  const tierSections = strategy.tiers
    .map(
      (tier) => `<section style="margin:1.4rem 0;padding:1rem;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:rgba(255,255,255,.02)">
        <h2 style="margin:0 0 .35rem">${escapeHtml(tier.label)}</h2>
        <p style="margin:.2rem 0 1rem;color:#94a3b8">${escapeHtml(tier.goal)}</p>
        <div style="display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          ${(tier.domains || [])
            .map(
              (domain) => `<article style="border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:.8rem;background:rgba(255,255,255,.02)">
              <strong>${escapeHtml(domain.domain)}</strong>
              <p style="margin:.45rem 0;color:#94a3b8;font-size:.92rem">${escapeHtml(domain.role)} · KPI: ${escapeHtml(domain.northStarKpi)}</p>
              <p style="margin:.45rem 0;font-size:.9rem;color:#cbd5e1"><strong>Offers:</strong> ${escapeHtml((domain.topOffers || []).slice(0, 3).join(", "))}</p>
            </article>`
            )
            .join("")}
        </div>
      </section>`
    )
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BeyondMythos Portfolio Strategy</title><style>body{margin:0;background:#0b1020;color:#eef2ff;font-family:Inter,system-ui,sans-serif}a{color:#60a5fa}.wrap{max-width:1140px;margin:auto;padding:2rem 1.25rem 4rem}.kpi{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin:1rem 0}.kpi div{border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:.8rem;background:rgba(255,255,255,.03)}code{color:#f97316}</style></head><body><main class="wrap"><p><a href="/">← Live stream</a></p><h1>Portfolio operating model</h1><p>Unified strategy for growth, monetization, campaign operations, and domain governance.</p><div class="kpi"><div><strong>${summary.domainCount}</strong><p>Mapped domains</p></div><div><strong>${summary.tierCount}</strong><p>Operating tiers</p></div><div><strong>${summary.weeklyThemes}</strong><p>Weekly campaign themes</p></div><div><strong>${revenue.totals.conversionRate}</strong><p>Checkout conversion</p></div></div>${tierSections}<section style="margin-top:1.4rem;padding:1rem;border:1px solid rgba(148,163,184,.2);border-radius:12px"><h2 style="margin:0 0 .6rem">Execution phases</h2><ol>${(strategy.executionPhases || []).map((phase) => `<li><strong>${escapeHtml(phase.id)}.</strong> ${escapeHtml(phase.name)} — ${escapeHtml(phase.focus)}</li>`).join("")}</ol><p style="color:#94a3b8">Machine-readable strategy and KPI endpoints: <code>/api/portfolio/strategy</code> and <code>/api/portfolio/dashboard</code>.</p></section></main></body></html>`;
}

function authorizeCron(req) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const header = req.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const cronHeader = (req.get("x-cron-secret") || "").trim();
  return bearer === secret || cronHeader === secret;
}

app.get("/", (req, res) => {
  const sites = registry.listSites();
  res.set("Cache-Control", "no-store");
  res.type("html").send(renderDashboard(sites, getBaseUrl(), summarizePortfolio()));
});

app.get("/portfolio", (req, res) => {
  const strategy = loadPortfolioStrategy();
  const summary = summarizePortfolio(strategy);
  const revenue = revenueDashboard();
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
  res.type("html").send(renderPortfolioPage(strategy, summary, revenue));
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "BeyondMythos API is running",
    contentMode: contentModeLabel()
  });
});

app.get("/api/blog-sites", (req, res) => {
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=15");
  res.json({
    count: registry.listSites().length,
    lastGeneratedAt: registry.loadRegistry().lastGeneratedAt,
    sites: registry.listSites()
  });

  app.get("/api/portfolio/strategy", (req, res) => {
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=120");
    const strategy = loadPortfolioStrategy();
    res.json({
      strategy,
      summary: summarizePortfolio(strategy)
    });
  });

  app.get("/api/portfolio/dashboard", (req, res) => {
    res.set("Cache-Control", "no-store");
    const strategy = loadPortfolioStrategy();
    res.json({
      updatedAt: new Date().toISOString(),
      summary: summarizePortfolio(strategy),
      domainCount: listPortfolioDomains(strategy).length,
      revenue: revenueDashboard()
    });
  });
});

app.post("/api/blog-sites/generate", async (req, res) => {
  if (!authorizeCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await generateBlogSite();
    res.status(201).json({ ok: true, site: result.site });
  } catch (error) {
    if (error.code === "NICHES_EXHAUSTED") {
      return res.status(409).json({ error: error.message });
    }
    console.error("Blog site generation failed:", error);
    res.status(500).json({ error: "Failed to generate blog site" });
  }
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/store", (req, res) => {
  const products = listProducts({ type: "digital" });
  const markets = getMarketplaceLinks();
  const cards = products
    .map(
      (product) => `<article id="product-${product.id}"><span style="display:inline-block;padding:.2rem .45rem;border:1px solid rgba(96,165,250,.5);border-radius:999px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#93c5fd">${escapeHtml(product.offerTier)}</span><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p><strong>$${product.price.toFixed(2)}</strong><div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.7rem"><button data-buy-now data-product-id="${product.id}" style="cursor:pointer;padding:.45rem .7rem;border-radius:.6rem;border:1px solid rgba(96,165,250,.45);background:#2563eb;color:#fff">Buy now</button><a href="/api/store/products?type=digital&tier=${encodeURIComponent(product.offerTier)}">API details</a></div></article>`
    )
    .join("");
  res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BeyondMythos Store</title><style>body{margin:0;background:#0b1020;color:#eef2ff;font-family:Inter,system-ui,sans-serif}.wrap{max-width:1100px;margin:auto;padding:2rem 1.25rem 4rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}article{border:1px solid rgba(148,163,184,.2);border-radius:1rem;padding:1rem;background:rgba(255,255,255,.04)}a{color:#60a5fa}p{color:#94a3b8}.markets{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0 2rem}.trust{border:1px solid rgba(148,163,184,.2);border-radius:1rem;padding:1rem;margin:1rem 0 2rem;background:rgba(249,115,22,.08)}.checkout{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin:1rem 0}.checkout input{padding:.5rem .65rem;border-radius:.5rem;border:1px solid rgba(148,163,184,.4);background:#0f172a;color:#eef2ff}.checkout button{cursor:pointer}</style></head><body><main class="wrap"><p><a href="/">← Live stream</a></p><h1>Digital products and creator tools</h1><p>Guides, templates, prompt packs, launch kits, and automation assets for niche-site operators.</p><div class="checkout"><label for="checkout-email">Checkout email</label><input id="checkout-email" type="email" placeholder="you@example.com" autocomplete="email" /><span id="checkout-status" style="color:#93c5fd;font-size:.9rem"></span></div><div class="trust"><strong>Delivery and recovery</strong><p>After purchase, request account access at <code>/api/customer/access/request</code> to retrieve your digital products and renew expired links.</p></div><div class="markets">${markets.map((link) => `<a href="${escapeHtml(link.url)}" rel="noopener nofollow">${escapeHtml(link.label)}</a>`).join("")}</div><section class="grid">${cards}</section></main><script>document.addEventListener("click",async function(event){var button=event.target.closest("[data-buy-now]");if(!button)return;event.preventDefault();var status=document.getElementById("checkout-status");var emailField=document.getElementById("checkout-email");var email=emailField&&emailField.value?emailField.value.trim():"";button.disabled=true;if(status)status.textContent="Starting checkout...";try{var response=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,site:"beyondmythos.com",items:[{id:Number(button.getAttribute("data-product-id")),quantity:1}]})});var payload=await response.json();if(!response.ok||!payload.url){throw new Error(payload&&payload.error?payload.error:"Checkout failed");}window.location.href=payload.url;}catch(error){if(status)status.textContent=error.message||"Checkout failed";button.disabled=false;}}</script></body></html>`);
});

app.get("/api/store/config", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  res.json({
    name: process.env.STORE_NAME || "BeyondMythos",
    tagline: "Creator tools, merch, and gear — shipped or delivered instantly",
    primaryColor: "#2563eb",
    secondaryColor: "#f97316",
    categories: listCategories(),
    types: listProductTypes(),
    offerTiers: ["entry", "core", "premium"]
  });
});

app.get("/api/store/products", async (req, res) => {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
  const filters = {};
  if (req.query.type) filters.type = String(req.query.type);
  if (req.query.category) filters.category = String(req.query.category);
  if (req.query.fulfillment) filters.fulfillment = String(req.query.fulfillment);
  if (req.query.tier) filters.tier = String(req.query.tier);
  const products = listProducts(filters);
  res.json({ count: products.length, products });
});

app.get("/api/monetization/config", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  res.json({
    sponsorEnabled: Boolean(getSponsorSlot()),
    marketplaces: getMarketplaceLinks(),
    disclosure: affiliateDisclosure(),
    digitalProductCount: listProducts({ type: "digital" }).length
  });
});

app.post("/api/newsletter/subscribe", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const site = String(req.body?.site || "").trim();
  const hp = String(req.body?.website || "").trim();
  if (hp) return res.json({ ok: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const recorded = recordNewsletterSignup({ email, site: site || "beyondmythos.com" });
  if (recorded.error) {
    return res.status(400).json({ error: recorded.error });
  }

  const webhookUrl = (process.env.NEWSLETTER_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    console.log("Newsletter signup captured in local queue:", { email, site });
    return res.status(202).json({ ok: true, mode: "queued-local" });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, site, source: "beyondmythos", createdAt: new Date().toISOString() })
    });
    if (!response.ok) throw new Error(`newsletter webhook returned ${response.status}`);
    res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Newsletter subscription failed:", error.message);
    res.status(502).json({ error: "Newsletter provider failed" });
  }
});

app.post("/api/create-checkout", async (req, res) => {
  const items = req.body && Array.isArray(req.body.items) ? req.body.items : null;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const site = String(req.body?.site || "beyondmythos.com").trim().toLowerCase();
  recordCheckoutStarted({ site, email, items });
  const { lineItems, error: validationError } = buildCheckoutLineItems(items);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const configuredFrontendUrl = (process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");
  const requestOrigin = (req.get("origin") || "").trim().replace(/\/+$/, "");
  const frontendUrl = configuredFrontendUrl || requestOrigin;
  if (!frontendUrl) {
    return res.status(500).json({ error: "Missing FRONTEND_URL configuration" });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY configuration" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email || undefined,
      metadata: {
        email,
        site
      },
      success_url: `${frontendUrl}/success`,
      cancel_url: `${frontendUrl}/cancel`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session failed:", error.message);
    res.status(502).json({ error: "Failed to create checkout session" });
  }
});

app.post("/api/purchases/record", (req, res) => {
  if (!authorizeCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = recordPurchase({
    email: req.body?.email,
    items: req.body?.items,
    site: req.body?.site,
    provider: req.body?.provider,
    providerSessionId: req.body?.providerSessionId,
    status: req.body?.status
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

app.post("/api/customer/access/request", (req, res) => {
  const result = requestCustomerAccess(req.body?.email);
  if (result.error) return res.status(404).json({ error: result.error });
  res.status(202).json(result);
});

app.get("/api/customer/access", (req, res) => {
  const token = String(req.query.token || "");
  const result = customerAccess(token);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

app.post("/api/purchases/recover", (req, res) => {
  const result = recoverPurchaseAccess({
    email: req.body?.email,
    purchaseId: req.body?.purchaseId
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(202).json(result);
});

app.get("/api/digital-access/:purchaseId/:productId", (req, res) => {
  const result = resolveDigitalAccess({
    purchaseId: req.params.purchaseId,
    productId: req.params.productId,
    token: req.query.token
  });
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

app.post("/api/purchases/refund", (req, res) => {
  if (!authorizeCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const result = markPurchaseRefunded({
    purchaseId: req.body?.purchaseId,
    reason: req.body?.reason
  });
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

app.get("/api/revenue/dashboard", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(revenueDashboard());
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = app;
