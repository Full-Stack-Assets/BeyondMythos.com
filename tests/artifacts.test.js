#!/usr/bin/env node
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITES_PATH = path.join(ROOT, "data", "blog-sites.json");
const POSTS_DIR = path.join(ROOT, "data", "posts");
const GENERATED_DIR = path.join(ROOT, "public", "sites");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertCompleteHtml(filePath) {
  assert.ok(fs.existsSync(filePath), `Missing generated file: ${path.relative(ROOT, filePath)}`);
  const html = fs.readFileSync(filePath, "utf8");
  assert.match(html, /<!doctype html>/i, `${path.relative(ROOT, filePath)} is not a complete HTML document`);
  assert.match(html, /<html\b/i, `${path.relative(ROOT, filePath)} is missing an html root`);
  assert.match(html, /<\/html>\s*$/i, `${path.relative(ROOT, filePath)} appears truncated`);
  assert.doesNotMatch(
    html,
    /\{\{[^}]+\}\}|<%=?[^%]+%>|Answer paragraph\.|undefined|null\/posts\//,
    `${path.relative(ROOT, filePath)} contains an unresolved template value`
  );
}

function assertPostShape(post, siteSlug, index) {
  const label = `${siteSlug} post ${index}`;
  for (const field of ["slug", "title", "dek", "takeaway", "whatHappened", "whyItMatters", "howToThink", "category", "publishedAt"]) {
    assert.equal(typeof post[field], "string", `${label} is missing string field ${field}`);
    assert.ok(post[field].trim().length > 0, `${label} has an empty ${field}`);
  }
  assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label} has an invalid slug`);
  assert.ok(Array.isArray(post.pros) && post.pros.length > 0, `${label} has no pros`);
  assert.ok(Array.isArray(post.cons) && post.cons.length > 0, `${label} has no cons`);
  assert.ok(Array.isArray(post.faq) && post.faq.length > 0, `${label} has no FAQ entries`);
  assert.ok(Array.isArray(post.sources) && post.sources.length > 0, `${label} has no sources`);
  for (const source of post.sources) {
    assert.equal(typeof source.label, "string", `${label} has a source without a label`);
    assert.match(source.url, /^https?:\/\//, `${label} has a non-HTTP source URL`);
  }
  assert.ok(Number.isFinite(Date.parse(post.publishedAt)), `${label} has an invalid publishedAt timestamp`);
}

describe("generated site artifacts", () => {
  const catalog = readJson(SITES_PATH);
  const sites = catalog.sites;

  it("has a non-empty site catalog with unique ids and slugs", () => {
    assert.ok(Array.isArray(sites) && sites.length > 0, "data/blog-sites.json has no sites");
    assert.equal(new Set(sites.map((site) => site.id)).size, sites.length, "Site ids must be unique");
    assert.equal(new Set(sites.map((site) => site.slug)).size, sites.length, "Site slugs must be unique");
  });

  for (const site of sites) {
    describe(site.slug, () => {
      const postsPath = path.join(POSTS_DIR, `${site.slug}.json`);
      const siteDir = path.join(GENERATED_DIR, site.slug);

      it("has a valid persisted post collection", () => {
        assert.ok(fs.existsSync(postsPath), `Missing ${path.relative(ROOT, postsPath)}`);
        const posts = readJson(postsPath);
        assert.ok(Array.isArray(posts), `${path.relative(ROOT, postsPath)} must contain an array`);
        assert.equal(posts.length, site.postCount, `${site.slug} postCount does not match persisted posts`);
        assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length, `${site.slug} contains duplicate post slugs`);
        posts.forEach((post, index) => assertPostShape(post, site.slug, index));
      });

      it("has complete home and about pages", () => {
        assertCompleteHtml(path.join(siteDir, "index.html"));
        assertCompleteHtml(path.join(siteDir, "about.html"));
      });

      it("has one complete generated HTML page for every persisted post", () => {
        const posts = readJson(postsPath);
        for (const post of posts) {
          assertCompleteHtml(path.join(siteDir, "posts", `${post.slug}.html`));
        }
      });
    });
  }
});
