# BeyondMythos Interface Rebuild Design

## Goal
Rebuild the BeyondMythos root dashboard into the approved autonomous digital-property deployment command center while preserving site generation, commerce, fulfillment, portfolio strategy, and API behavior.

## Visual contract
- Dark black/teal shell with BeyondMythos brand rail and Portfolio Overview as the primary application surface.
- Navigation language: Portfolio, Sites, Products, Orders, Customers, Analytics, Settings. Links are rendered only for routes that actually exist; unsupported destinations remain non-clickable labels.
- Summary cards use real runtime values: active generated sites, recorded revenue/checkouts/orders when available, mapped domains/portfolio values, and other repository-observable counts. Do not invent subscribers, revenue, or traffic.
- Revenue Overview must use existing fulfillment/revenue dashboard data when present and show an explicit empty state when there is insufficient history.
- Top Sites ranking must derive from the current site registry and post counts, not fabricated per-site revenue.
- Existing marketplace, store, portfolio, API, and generated-site links remain accessible.

## Architecture
Keep Express and the server-rendered `renderDashboard()` path. Extend the dashboard renderer with optional existing `revenueDashboard()` data supplied by `server.js`, without changing endpoint contracts or fulfillment behavior.

## Testing
Add a Node structural contract test under the existing `tests/*.test.js` suite; it fails before the approved portfolio dashboard surfaces exist and passes after implementation.

## Review boundary
All work remains on `review/interface-rebuild-2026-08`; no merge, secret, DNS, domain, deployment-provider, payment, or production workflow changes.