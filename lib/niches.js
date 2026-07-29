const fs = require("fs");
const path = require("path");

const NICHES_PATH = path.join(__dirname, "..", "data", "niches.json");

function loadNiches() {
  return JSON.parse(fs.readFileSync(NICHES_PATH, "utf8"));
}

function pickNiche(usedNicheIds, options = {}) {
  const { allowReuseWhenExhausted = true } = options;
  const niches = loadNiches();
  const unused = niches.filter((niche) => !usedNicheIds.has(niche.id));
  const pool = unused.length > 0 ? unused : allowReuseWhenExhausted ? niches : [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { loadNiches, pickNiche, NICHES_PATH };
