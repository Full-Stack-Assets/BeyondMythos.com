const fs = require("fs");
const path = require("path");

const STRATEGY_PATH = path.join(__dirname, "..", "data", "portfolio-strategy.json");

function loadPortfolioStrategy() {
  const raw = fs.readFileSync(STRATEGY_PATH, "utf8");
  return JSON.parse(raw);
}

function listPortfolioDomains(strategy = loadPortfolioStrategy()) {
  return strategy.tiers.flatMap((tier) =>
    (tier.domains || []).map((domain) => ({
      tierId: tier.id,
      tierLabel: tier.label,
      ...domain
    }))
  );
}

function summarizePortfolio(strategy = loadPortfolioStrategy()) {
  const domains = listPortfolioDomains(strategy);
  const byRole = domains.reduce((acc, domain) => {
    acc[domain.role] = (acc[domain.role] || 0) + 1;
    return acc;
  }, {});

  const byKpi = domains.reduce((acc, domain) => {
    acc[domain.northStarKpi] = (acc[domain.northStarKpi] || 0) + 1;
    return acc;
  }, {});

  return {
    updatedAt: strategy.updatedAt,
    tierCount: strategy.tiers.length,
    domainCount: domains.length,
    roleCounts: byRole,
    kpiCounts: byKpi,
    weeklyThemes: strategy.campaignCalendar?.weeklyThemes?.length || 0,
    phases: (strategy.executionPhases || []).length
  };
}

module.exports = {
  STRATEGY_PATH,
  loadPortfolioStrategy,
  listPortfolioDomains,
  summarizePortfolio
};
