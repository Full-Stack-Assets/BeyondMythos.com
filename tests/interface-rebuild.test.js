const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('approved BeyondMythos portfolio dashboard surfaces are present', () => {
  const dashboard = fs.readFileSync('lib/dashboard.js', 'utf8');
  for (const label of ['Portfolio Overview', 'Active Sites', 'Revenue Overview', 'Orders', 'Top Sites', 'Automation', 'Commerce', 'SaaS']) {
    assert.match(dashboard, new RegExp(label));
  }
});
