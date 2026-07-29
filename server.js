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
const { getMarketplaceLinks, getSponsorSlot, affiliateDisclosure } = require("./lib/monetization");

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  res.type("html").send(renderDashboard(sites, getBaseUrl()));
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
      (product) => `<article id="product-${product.id}"><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p><strong>$${product.price.toFixed(2)}</strong><a href="/api/store/products?type=digital">API details</a></article>`
    )
    .join("");
  res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BeyondMythos Store</title><style>body{margin:0;background:#0b1020;color:#eef2ff;font-family:Inter,system-ui,sans-serif}.wrap{max-width:1100px;margin:auto;padding:2rem 1.25rem 4rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}article{border:1px solid rgba(148,163,184,.2);border-radius:1rem;padding:1rem;background:rgba(255,255,255,.04)}a{color:#60a5fa}p{color:#94a3b8}.markets{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0 2rem}</style></head><body><main class="wrap"><p><a href="/">← Live stream</a></p><h1>Digital products and creator tools</h1><p>Guides, templates, prompt packs, launch kits, and automation assets for niche-site operators.</p><div class="markets">${markets.map((link) => `<a href="${escapeHtml(link.url)}" rel="noopener nofollow">${escapeHtml(link.label)}</a>`).join("")}</div><section class="grid">${cards}</section></main></body></html>`);
});

app.get("/api/store/config", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  res.json({
    name: process.env.STORE_NAME || "BeyondMythos",
    tagline: "Creator tools, merch, and gear — shipped or delivered instantly",
    primaryColor: "#2563eb",
    secondaryColor: "#f97316",
    categories: listCategories(),
    types: listProductTypes()
  });
});

app.get("/api/store/products", async (req, res) => {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
  const filters = {};
  if (req.query.type) filters.type = String(req.query.type);
  if (req.query.category) filters.category = String(req.query.category);
  if (req.query.fulfillment) filters.fulfillment = String(req.query.fulfillment);
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

  const webhookUrl = (process.env.NEWSLETTER_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    console.log("Newsletter signup captured without provider:", { email, site });
    return res.status(202).json({ ok: true, mode: "unconfigured" });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, site, source: "storeforge", createdAt: new Date().toISOString() })
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
      success_url: `${frontendUrl}/success`,
      cancel_url: `${frontendUrl}/cancel`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session failed:", error.message);
    res.status(502).json({ error: "Failed to create checkout session" });
  }
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
