/**
 * DATA_DIR support: the fulfillment layer honors the DATA_DIR env var so
 * production can point commerce state at a persistent disk instead of the
 * repo's data/ directory. Defaults to data/commerce-state.json when unset.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.CUSTOMER_ACCESS_SECRET = "test-access-secret-for-data-dir";
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bm-data-dir-"));
process.env.DATA_DIR = dataDir;

const fulfillment = require("../lib/fulfillment");

test.after(() => {
  delete process.env.DATA_DIR;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("commerce state path honors DATA_DIR and the directory is created", () => {
  const expected = path.join(dataDir, "commerce-state.json");
  assert.equal(fulfillment.commerceStatePath(), expected);
  const state = fulfillment.loadCommerceState();
  assert.deepEqual(state, { customers: [], purchases: [], events: [] });
  assert.ok(fs.existsSync(expected), "state file is created inside DATA_DIR");
});

test("purchases recorded under DATA_DIR round-trip through the default path helpers", () => {
  const purchase = fulfillment.recordPurchase({
    email: "data-dir-buyer@example.com",
    items: [{ id: 301, quantity: 1 }],
    site: "beyondmythos.com",
    provider: "test",
    providerSessionId: `data_dir_${Date.now()}`
  });
  assert.ok(purchase.purchase);
  assert.equal(purchase.purchase.id, fulfillment.loadCommerceState().purchases[0].id);
  assert.ok(
    fs.readFileSync(fulfillment.commerceStatePath(), "utf8").includes("data-dir-buyer@example.com")
  );
});

test("without DATA_DIR the path falls back to the repo data directory", () => {
  delete process.env.DATA_DIR;
  try {
    assert.equal(
      fulfillment.commerceStatePath(),
      path.join(__dirname, "..", "data", "commerce-state.json")
    );
  } finally {
    process.env.DATA_DIR = dataDir;
  }
});
