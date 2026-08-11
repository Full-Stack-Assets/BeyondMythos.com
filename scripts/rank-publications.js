#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { rankPublications } = require("../lib/publication-ranking");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/rank-publications.js <analytics-export.json> [winner-count]");
  process.exit(2);
}
const rows = JSON.parse(fs.readFileSync(input, "utf8"));
const winnerCount = Number(process.argv[3] || 12);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), winners: rankPublications(rows, { winnerCount }) }, null, 2));
