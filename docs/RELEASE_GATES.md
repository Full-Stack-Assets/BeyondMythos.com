# Release Gates

Generated content may reach production only through a reviewed pull request.

Required gates:

- Repository tests pass.
- Generated JSON parses successfully.
- Generated JavaScript passes `node --check`.
- No deployment credentials are available to the generation step.
- The pull request preview and changed content are reviewed.
- Sources, images, claims, and monetization disclosures are appropriate.
- Production deployment occurs only after merge.

A failed gate must not modify `main` or trigger a production deployment.
