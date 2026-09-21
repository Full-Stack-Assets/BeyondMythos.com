/**
 * Regression test for the /store "Buy now" handler (one-char fix, 2026-09-21).
 *
 * The inline <script> in the /store template once ended
 * `...button.disabled=false;}}</script>` — missing the closing `)` of the
 * `document.addEventListener("click", ...)` call. Browsers threw
 * `SyntaxError: missing ) after argument list` and Buy now silently did
 * nothing. This test fails on that broken source and passes on the fix.
 *
 * What it proves (no network, no Stripe):
 *  1. Every inline <script> in the /store + / templates parses.
 *  2. Running the buy-now script registers exactly one document click listener.
 *  3. A synthetic click on a [data-buy-now] button sends exactly one mocked
 *     POST to /api/create-checkout with items [{id, quantity:1}], sets the
 *     "Starting checkout..." status, disables the button, and redirects to
 *     the checkout URL returned by the mock.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const serverPath = path.join(__dirname, "..", "server.js");
const source = fs.readFileSync(serverPath, "utf8");

function inlineScripts() {
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(source)) !== null) scripts.push(match[1]);
  return scripts;
}

test("every inline storefront script parses without SyntaxError", () => {
  const scripts = inlineScripts();
  assert.ok(scripts.length > 0, "expected at least one inline <script>");
  for (const script of scripts) {
    assert.doesNotThrow(() => new vm.Script(script), "inline script must parse");
  }
});

test("buy-now listener registers and sends one mocked checkout request", async () => {
  const scripts = inlineScripts();
  const script = scripts.find((s) => s.includes("data-buy-now"));
  assert.ok(script, "expected a buy-now inline script");

  const listeners = [];
  const fetchCalls = [];
  const statusEl = { textContent: "" };
  const emailEl = { value: "buyer@example.com" };
  const buttonEl = {
    disabled: false,
    getAttribute: (name) => (name === "data-product-id" ? "201" : null),
    closest: (sel) => (sel === "[data-buy-now]" ? buttonEl : null)
  };
  const window = { location: {} };
  const document = {
    addEventListener: (type, fn) => listeners.push({ type, fn }),
    getElementById: (id) =>
      id === "checkout-status" ? statusEl : id === "checkout-email" ? emailEl : null
  };
  const fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    return { ok: true, json: async () => ({ url: "https://checkout.stripe.com/pay/cs_test_mock" }) };
  };

  const sandbox = { document, window, fetch, console };
  vm.createContext(sandbox);
  new vm.Script(script).runInContext(sandbox);

  assert.equal(
    listeners.filter((l) => l.type === "click").length,
    1,
    "exactly one document click listener is registered"
  );

  const clickListener = listeners.find((l) => l.type === "click").fn;
  await clickListener({ target: buttonEl, preventDefault: () => {} });
  await new Promise((r) => setImmediate(r));

  assert.equal(statusEl.textContent, "Starting checkout...");
  assert.equal(buttonEl.disabled, true);
  assert.equal(fetchCalls.length, 1);

  const call = fetchCalls[0];
  assert.equal(call.url, "/api/create-checkout");
  assert.equal(call.opts.method, "POST");
  const body = JSON.parse(call.opts.body);
  assert.deepEqual(body.items, [{ id: 201, quantity: 1 }]);
  assert.equal(window.location.href, "https://checkout.stripe.com/pay/cs_test_mock");
});
