---
type: question
title: "Does a test check that dist/ matches src/?"
question: "CLAUDE.md said no test checks dist matches src, but dist.test.ts does. Which is current?"
answer_quality: solid
created: "2026-11-09"
updated: "2026-11-09"
status: mature
tags:
  - question
  - consent
  - hand-authored
  - partial_scan
related:
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-index]]"
  - "[[entities/tool-build-consent]]"
sources:
  - "src/lib/consent/dist.test.ts:1-21"
  - "tools/build-consent.mjs:19-45"
---

# Does a test check that dist/ matches src/?

> Hand-authored seed page (no graph driver).

**Question:** CLAUDE.md said "No test checks that `dist` matches `src`", yet `src/lib/consent/dist.test.ts:12-20` rebuilds into a temp dir with `tools/build-consent.mjs` and asserts that the committed `dist/welovecookies.min.js` and `dist/welovecookies.mjs` are byte-identical to the fresh build. The test was added in `ebe465d` ("Test the banner UI, script-tag config and committed dist").

## Answer

Answered 2026-11-09: yes, for the two JS bundles. `tools/build-consent.mjs:19-45` builds only the scripts when given an output folder, so the WordPress zip is not compared. CLAUDE.md and ADR 0005 were updated to say so.

## Confidence

Solid: read from the test and the build script.
