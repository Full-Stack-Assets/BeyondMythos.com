# Automated Content Rollback

When generated content causes a production defect after merge:

1. Revert the content pull request merge commit through a new pull request.
2. Run repository tests and generated-data syntax validation.
3. Review the preview or affected static files before merging the revert.
4. Preserve the failed candidates and workflow logs for analysis.
5. Add a regression test or deterministic validator for the failure class.
6. Re-enable generation only after the new guard is verified.

Never force-push the production branch or hide the failed release by rewriting history.
