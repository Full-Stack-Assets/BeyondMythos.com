"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

test("injects one fail-closed analytics client into a Pages tree", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "beyondmythos-analytics-"));
  fs.writeFileSync(path.join(root, "index.html"), "<html><body>Hello</body></html>");
  const script = path.join(__dirname, "..", "scripts", "inject-pages-analytics.js");
  const result = spawnSync(process.execPath, [script, root], { env: { ...process.env, GA_MEASUREMENT_ID: "G-TEST123" } });
  assert.equal(result.status, 0, result.stderr.toString());
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const client = fs.readFileSync(path.join(root, "portfolio-analytics.js"), "utf8");
  assert.equal((html.match(/portfolio-analytics\.js/g) || []).length, 1);
  assert.match(client, /G-TEST123/);
  fs.rmSync(root, { recursive: true, force: true });
});
