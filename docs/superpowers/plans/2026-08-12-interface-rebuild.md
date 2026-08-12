# BeyondMythos Interface Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved BeyondMythos portfolio/deployment dashboard on an isolated review branch while preserving all existing automation and commerce behavior.

**Architecture:** Keep the Express server and string-rendered dashboard. Feed the renderer existing revenue-dashboard data and recompose the root HTML/CSS around truthful site, portfolio, order, and revenue signals.

**Tech Stack:** Node.js, Express, CommonJS, existing Node test runner.

## Global Constraints
- Branch: `review/interface-rebuild-2026-08` only.
- Do not change generated-site automation, checkout semantics, fulfillment, secrets, DNS, domains, or deployment providers.
- No fabricated revenue, subscriber, or traffic values.
- Preserve all current routes and API contracts.

---

### Task 1: Lock the interface contract
**Files:**
- Create: `tests/interface-rebuild.test.js`

- [ ] Assert the dashboard source includes Portfolio Overview, Active Sites, Revenue Overview, Orders, Top Sites, and the Automation/Commerce/SaaS capability labels.
- [ ] Open a draft PR and verify existing `npm test` fails before implementation.

### Task 2: Supply truthful operating metrics
**Files:**
- Modify: `server.js`
- Modify: `lib/dashboard.js`

- [ ] Pass existing `revenueDashboard()` output into `renderDashboard()` on the root route.
- [ ] Keep the renderer argument optional so existing tests/callers remain compatible.

### Task 3: Rebuild root dashboard
**Files:**
- Modify: `lib/dashboard.js`

- [ ] Build the dark teal sidebar and Portfolio Overview composition.
- [ ] Derive Active Sites and Top Sites from the registry data.
- [ ] Derive order/revenue values only from supplied revenue dashboard data and display an honest empty/zero state otherwise.
- [ ] Preserve existing site, store, portfolio, marketplace, and API links.
- [ ] Keep mobile/responsive behavior usable.

### Task 4: Verify
- [ ] Confirm `npm test` passes in PR CI.
- [ ] Confirm the diff does not alter payment or deployment authority.
- [ ] Keep the PR draft and do not merge or deploy.