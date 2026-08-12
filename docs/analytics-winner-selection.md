# Analytics and winner selection

BeyondMythos uses one `beyondmythos.com` GA4 web stream. Every event includes `publication_slug`, derived from `/sites/<slug>/`. Register it as an event-scoped custom dimension. The deployment injector covers the existing generated corpus without committing tens of thousands of regenerated HTML files; the renderer tags future sponsor, marketplace, and product links explicitly.

Tracked events include `newsletter_signup`, `affiliate_click`, `sponsor_click`, `product_cta`, `article_scroll` at 50 and 90 percent, `outbound_click`, and `internal_recirculation`. The client does nothing until a real `GA_MEASUREMENT_ID` repository variable is configured.

Do not remove publications based on post count or modeled traffic. Export joined GA4, Search Console, and AdSense observations as a JSON array and run:

`node scripts/rank-publications.js analytics-export.json 12`

Required fields are `publication_slug`, `measurementDays`, `organicClicks`, `engagedSessions`, `newsletterSignups`, `monetizationClicks`, and `publisherRevenue`. The helper excludes rows with fewer than 28 measured days and produces decision support only; it does not delete or unpublish anything. Review topic quality, policy risk, and seasonality before approving a winner set.

Before ads, verify the Search Console domain property, link GA4 to AdSense, and install a Google-certified CMP for applicable traffic. No AdSense unit is added by this change.
