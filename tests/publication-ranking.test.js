"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { rankPublications } = require("../lib/publication-ranking");

test("ranks only publications with a complete measurement window", () => {
  const winners = rankPublications([
    { publication_slug: "too-new", measurementDays: 7, organicClicks: 9999 },
    { publication_slug: "subscriber-led", measurementDays: 28, newsletterSignups: 10 },
    { publication_slug: "search-led", measurementDays: 35, organicClicks: 100 },
  ]);
  assert.deepEqual(winners.map((row) => row.publication_slug), ["subscriber-led", "search-led"]);
});
