# Multi-Agent Workflow

GitHub is the source of truth. Do not have multiple agents edit the same files simultaneously.

Antigravity: feature/ui-* mobile UI.
Codex: feature/backend-* and fixes; architecture/integration/final review.
Gemini: AI receipt prompts/schema/research; code changes through branches/PRs.
Claude Code: QA/security/review branches.

Flow: issue -> read AGENTS/docs -> branch -> implement -> test -> commit -> PR -> independent review -> human merge.

Suggested important-feature review: Builder -> Codex -> Claude -> human -> merge.
