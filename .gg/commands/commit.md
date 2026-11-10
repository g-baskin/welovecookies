---
name: commit
description: Check, review, commit and push We Love Cookies changes on a feature branch
---

1. Branch guard: run `git branch --show-current`. If it is `main` or `dev` (or not `feature/*`), STOP and say so. Changes go on a `feature/*` branch with a PR into `dev` (CLAUDE.md "Branches").

2. Build if needed: if `git status` shows changes under `src/lib/consent/`, run `npm run build` so the committed `dist/` matches (`src/lib/consent/dist.test.ts` fails otherwise). Commit the rebuilt `dist/` files with the change.

3. Run each check on its own, unpiped:
   - `npm run test`
   - `npm run check`
   - `npm run lint`
   - `npm run format:check` (on failure run `npm run format`, then check the wiki citations of any file it reformatted, since line numbers shift)
   Fix ALL failures and re-run what failed. If one cannot be fixed, STOP before committing and say which and why. After UI or admin changes, also run `npm run test:e2e` (one Playwright run at a time: it uses ports 4174 and 8788).

4. Review changes: run `git status`, `git diff --staged` and `git diff`.

5. Fast review gate: spawn ONE subagent with the full diff. Instructions: review ONLY the diff for real bugs, regressions, leftover debug code and unintended changes. Score each issue 0-100 confidence (pre-existing issues and stylistic nitpicks are false positives, score low). Report ONLY issues with confidence >= 80, with file:line and a one-line fix. If none, reply `CLEAR`. This is a last check, not a deep audit; be fast.

6. If `CLEAR`, continue without asking. If issues >= 80 were reported, show them and ask with `ask_user` (one `choice` question, `id: "land"`): "Fix it first, then commit & push" (recommended) or "Commit & push anyway". On fix-first: fix, re-run step 3, then continue (no re-review).

7. Stage with `git add <specific files>`; never `git add -A` or `git add .`. Never stage secrets, `.dev.vars`, `.gg/plans/`, `.gg-checklist.json` or files the user did not change on purpose.

8. Commit message: one line starting with Add/Update/Fix/Remove/Refactor, specific and concise. `git commit -m "<message>"`, never `--no-verify`.

9. Push the feature branch: `git push` if it has an upstream, otherwise `git push -u origin <branch>`. Never push to `main` or `dev` and never force-push. Opening or merging the PR is a separate step the user asks for.
