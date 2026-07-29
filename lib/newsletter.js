const fs = require("fs");
const path = require("path");

const NEWSLETTER_STATE_PATH = path.join(__dirname, "..", "data", "newsletter-signups.json");

function ensureStateFile() {
  if (fs.existsSync(NEWSLETTER_STATE_PATH)) return;
  fs.writeFileSync(NEWSLETTER_STATE_PATH, `${JSON.stringify({ signups: [] }, null, 2)}\n`, "utf8");
}

function loadNewsletterState() {
  ensureStateFile();
  const raw = fs.readFileSync(NEWSLETTER_STATE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return {
    signups: Array.isArray(parsed.signups) ? parsed.signups : []
  };
}

function saveNewsletterState(state) {
  const next = {
    signups: Array.isArray(state.signups) ? state.signups : []
  };
  fs.writeFileSync(NEWSLETTER_STATE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function recordNewsletterSignup({ email, site }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedSite = String(site || "beyondmythos.com").trim().toLowerCase();
  if (!normalizedEmail) return { error: "Valid email required" };

  const state = loadNewsletterState();
  const existing = state.signups.find((entry) => entry.email === normalizedEmail && entry.site === normalizedSite);
  if (existing) {
    existing.updatedAt = new Date().toISOString();
    saveNewsletterState(state);
    return { signup: existing, existing: true };
  }

  const signup = {
    id: `sub_${Date.now().toString(36)}`,
    email: normalizedEmail,
    site: normalizedSite,
    source: "site-newsletter",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.signups.push(signup);
  saveNewsletterState(state);
  return { signup, existing: false };
}

module.exports = {
  NEWSLETTER_STATE_PATH,
  loadNewsletterState,
  saveNewsletterState,
  recordNewsletterSignup
};
