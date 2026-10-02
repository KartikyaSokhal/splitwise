# Architecture Decisions

ADR-001 React Native + Expo: one mobile codebase and fast iteration.

ADR-002 Express: lightweight familiar API layer.

ADR-003 Supabase/PostgreSQL deferred to Phase 2: persistence, history, groups, and authentication are not launch dependencies.

ADR-004 Backend-mediated Gemini: protects API keys and centralizes validation.

ADR-005 No mandatory login: preserves speed and low friction.

ADR-006 Integer minor units: avoids floating-point money errors.

ADR-007 Manual fallback: AI/network failure must not make the app unusable.

ADR-008 Total-only manual flow first: entering a total and selecting equal/custom shares is the release-critical flow; item entry is optional.

ADR-009 One local deterministic calculator: a pure, tested TypeScript module calculates final shares. The MVP does not expose a duplicate calculation API.

ADR-010 Native sharing: use the platform share sheet. WhatsApp is a supported destination, not a calculation or mandatory integration dependency.

ADR-011 Receipt extraction is an editable draft: backend validation can reject unsafe AI output, but it never silently finalizes amounts or splits.
