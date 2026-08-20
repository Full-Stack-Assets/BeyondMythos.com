const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

async function withServer(run) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("server exposes the storefront and portfolio routes on a fresh process", async () => {
  await withServer(async (origin) => {
    const checks = [
      ["/healthz", "application/json"],
      ["/store", "text/html"],
      ["/portfolio", "text/html"],
      ["/api/portfolio/strategy", "application/json"],
      ["/api/portfolio/dashboard", "application/json"]
    ];

    for (const [pathname, expectedType] of checks) {
      const response = await fetch(`${origin}${pathname}`);
      assert.equal(response.status, 200, `${pathname} should be available`);
      assert.match(
        response.headers.get("content-type") || "",
        new RegExp(expectedType.replace("/", "\\/")),
        `${pathname} should return ${expectedType}`
      );
    }
  });
});

test("portfolio APIs do not depend on calling the blog-sites endpoint first", async () => {
  await withServer(async (origin) => {
    const strategyResponse = await fetch(`${origin}/api/portfolio/strategy`);
    const strategyPayload = await strategyResponse.json();
    assert.equal(strategyResponse.status, 200);
    assert.ok(strategyPayload.summary.domainCount > 0);

    const dashboardResponse = await fetch(`${origin}/api/portfolio/dashboard`);
    const dashboardPayload = await dashboardResponse.json();
    assert.equal(dashboardResponse.status, 200);
    assert.equal(dashboardPayload.domainCount, strategyPayload.summary.domainCount);
  });
});
