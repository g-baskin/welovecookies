---
type: question
title: 'Is the public endpoint rate limit always on?'
question: 'Should the admin warn when PUBLIC_LIMITER is missing, given public endpoints are then unlimited apart from the privacy-form limits?'
answer_quality: draft
created: 2026-11-09
updated: 2026-11-09
status: developing
tags:
  - question
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/admin-request-security]]"
sources:
  - admin/src/index.ts:93-97
  - admin/src/db.ts:18-19
  - admin/wrangler.jsonc:18-20
---

# Is the public endpoint rate limit always on?

**Question:** Should the admin warn when PUBLIC_LIMITER is missing, given public endpoints are then unlimited apart from the privacy-form limits?

## Answer

Unanswered. `limited()` returns false when `env.PUBLIC_LIMITER` is absent (`admin/src/index.ts:94`), so `/api/consent*` has no per-IP limit then. The shipped `admin/wrangler.jsonc:20` defines it, and the limit is per Cloudflare location (`admin/wrangler.jsonc:18`). The tracking check (`admin/src/tracking.ts:45-115`) does not report a missing binding. Needs an owner decision; not a bug claim.

## Confidence

Low that it matters in practice (binding ships by default); evidence of the code path is exact.
