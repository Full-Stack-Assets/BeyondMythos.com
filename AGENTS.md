# AOC Repository Instructions

These provider-neutral instructions govern BeyondMythos.

## Authority and scope

- Human Authority is final for consequential actions.
- AOC governance comes from `Full-Stack-Assets/Canon`; this repository is authoritative for BeyondMythos implementation, content state, and deployment evidence.
- Keep Aether Portfolio separate from the AOC control plane.

## Publishing and revenue boundary

- Changes to hourly generation, hourly posting, Pages deployment, tracked public content, or workflow triggers can publish externally and must be treated as consequential.
- Template, generated, affiliate, sponsor, product, and editorial content must be identifiable and source-backed where claims require evidence.
- Stripe remains authoritative for checkout and payment state; never trust client-supplied prices.
- The static GitHub Pages frontend does not prove that the separate backend API is live.
- Preserve the current rule that backend-provider selection requires an explicit production decision.

## Required workflow

1. Run AOC preflight and identify whether the change can trigger publication, checkout, fulfillment, or external communication.
2. Inspect affected workflows, content generators, store catalog, tests, and deployment boundaries.
3. Make the smallest reviewable change and avoid triggering production workflows during preparation.
4. Run `npm test` and the applicable Pages verification scripts.
5. Record test evidence, content provenance, and live-versus-local limitations.

## Human Authority gates

Production workflow dispatch, public publication, backend deployment or provider selection, Stripe live writes, pricing changes, paid campaigns, sponsor commitments, customer communication, protected-branch merges, and credential changes require explicit approval.

Never commit API keys, webhook secrets, customer access secrets, payment data, or subscriber personal data.
