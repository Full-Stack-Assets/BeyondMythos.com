#!/usr/bin/env node
"use strict";

const registry = require("../lib/registry");
const content = require("../lib/content-generator");
const { getBaseUrl } = require("../lib/config");
const { mapWithConcurrency } = require("../lib/concurrency");

const SITE_CONCURRENCY = Number(process.env.SITE_CONCURRENCY || 4);

function nicheForSite(site, niches) {
  return (
    niches.find((entry) => entry.id === site.nicheId) || {
      id: site.nicheId,
      name: site.name,
      audience: site.audience,
      categories: site.categories,
      subreddits: [site.nicheId],
      braveQueries: site.categories.map((category) => category.toLowerCase())
    }
  );
}

async function processSite(site, { baseUrl, niches }) {
  const niche = nicheForSite(site, niches);
  let archive = content.loadPostArchive(site.slug);
  if (archive.length === 0) {
    archive = await content.generatePosts(niche);
  }

  const post = await content.generateHourlyPost(niche, archive);
  const posts = [post, ...archive];

  site.postCount = posts.length;
  site.lastPostAt = post.publishedAt;
  content.writeSiteFiles(site, posts, baseUrl);
  return { slug: site.slug, title: post.title, postCount: posts.length };
}

async function main() {
  const baseUrl = getBaseUrl();
  const data = registry.loadRegistry();
  const niches = content.loadNiches();

  const results = await mapWithConcurrency(data.sites, SITE_CONCURRENCY, (site) =>
    processSite(site, { baseUrl, niches })
  );

  for (const result of results) {
    console.log(`${result.slug}: +"${result.title}" (${result.postCount} posts)`);
  }

  data.lastPostRunAt = new Date().toISOString();
  registry.saveRegistry(data);
  console.log(`Done: 1 new post added to each of ${data.sites.length} sites.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
