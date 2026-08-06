# Security Policy

## Vulnerability reporting

Use a private GitHub security advisory when available. Do not publish credentials, exploit details, customer data, or unreleased vulnerability information in a public issue.

## Generated content

Generated files are untrusted until repository tests and deterministic syntax validation pass. Content automation must not receive production deployment credentials and must not push directly to the production branch.

## Secrets

Store provider, payment, and deployment credentials only in GitHub Actions or hosting-platform secret stores. Rotate any credential that appears in logs, generated files, commits, pull requests, or screenshots.
