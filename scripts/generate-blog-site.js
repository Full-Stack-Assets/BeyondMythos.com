#!/usr/bin/env node
"use strict";

const { generateBlogSite } = require("../lib/blog-site-generator");

async function main() {
  const result = await generateBlogSite();
  console.log(JSON.stringify({ ok: true, site: result.site }, null, 2));
  console.log(`Published to the portfolio path: ${result.site.localUrl || result.site.url}`);
}

main().catch((error) => {
  if (error.code === "NICHES_EXHAUSTED") {
    console.log(error.message);
    console.log("Skipping this run — no duplicate sites will be created.");
    process.exit(0);
  }
  console.error(error.message || error);
  process.exit(1);
});
