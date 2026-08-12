const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('approved BeyondMythos portfolio dashboard surfaces are present', () => {
  const dashboard = fs.readFileSync('lib/dashboard.js', 'utf8');
  for (const label of ['Portfolio Overview', 'Active Sites', 'Revenue Overview', 'Orders', 'Top Sites', 'Automation', 'Commerce', 'SaaS']) {
    assert.match(dashboard, new RegExp(label));
  }
});

test('dashboard metrics are derived from registry and fulfillment records', () => {
  const dashboard = fs.readFileSync('lib/dashboard.js', 'utf8');
  assert.match(dashboard, /const revenue = revenueDashboard\(\)/);
  assert.match(dashboard, /sites\.length/);
  assert.match(dashboard, /Revenue bars appear only after verified purchase records exist/);
  assert.doesNotMatch(dashboard, /48,293/);
  assert.doesNotMatch(dashboard, /9,721/);
});
