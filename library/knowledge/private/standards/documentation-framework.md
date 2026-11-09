# Documentation Framework

Category: Standards · Schema: library v2 · Date: 2026-11-09 · Status: Active

Where each kind of documentation lives in this repo. Project rules in [`CLAUDE.md`](../../../../CLAUDE.md) win over the generic library schema where they differ.

## Map

| Kind | Location | Notes |
| --- | --- | --- |
| Buyer-facing docs | `docs/` | [`INSTALL.md`](../../../../docs/INSTALL.md), [`ADMIN.md`](../../../../docs/ADMIN.md), [`privacy/`](../../../../docs/privacy/README.md). Script-tag install leads; WordPress is one optional path. |
| API spec | [`docs/api/openapi.json`](../../../../docs/api/openapi.json) | OpenAPI 3.1 for the admin's hosted-install endpoints and the `endpoints.record` contract. |
| Decision records (ADRs) | [`docs/decisions/`](../../../../docs/decisions/README.md) | **Not** in `library/`. Overrides the schema's `knowledge/private/architecture/ADR-*` path. 7 exist: 0001–0007. |
| Glossary | [`CONTEXT.md`](../../../../CONTEXT.md) | Use these domain terms everywhere. |
| Module README | [`src/lib/consent/README.md`](../../../../src/lib/consent/README.md) | Consent library parts and entry points. |
| Changelog | [`CHANGELOG.md`](../../../../CHANGELOG.md) | Keep a Changelog format. |
| Code wiki | [`library/knowledge/private/codebase-graph/`](../codebase-graph/README.md) | `entities/`, `concepts/`, `questions/`; its `README.md` is the navigation page. |
| Internal narrative | `library/knowledge/private/<domain>/` | Current domains: [`architecture/`](../architecture/README.md), [`build-release/`](../build-release/release-process.md), [`testing/`](../testing/test-strategy.md). |
| Shared interface contracts | [`library/knowledge/private/contracts/`](../contracts/README.md) | `CTR-<###>-<slug>.md`. |
| PRDs / IRDs | [`library/requirements/`](../../../requirements/README.md), [`library/issues/`](../../../issues/README.md) | IRD numbers follow GitHub issue numbers. |
| Human scratch | `library/notes/` | Human-only; agents never read or write it. |

## Rules

- Cite code paths a document describes; keep relative links resolvable. [`src/docs.test.ts`](../../../../src/docs.test.ts) checks citations, wiki links, relative links and the OpenAPI enums.
- Refer to files that do not exist yet in backticks, not as links.
- Generic product: no store/shop/cart wording, no references to earlier projects.
- `regions.ts` is the legal source of truth over `docs/privacy/consent-law-matrix.md`.
- Lifecycle = location for PRDs/IRDs (`backlog/` → `in-work/` → `completed/`).
