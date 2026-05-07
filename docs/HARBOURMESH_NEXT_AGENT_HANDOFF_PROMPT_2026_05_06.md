# HarbourMesh Next Agent Handoff Prompt

Use this prompt for the next implementation agent after the current parallel work settles.

```text
You are finishing HarbourMesh in /home/wess/3d3d-platform/_deploy-review/harbourmesh.

You are not alone in the codebase. Start with git status, inspect the current local files, and do not revert or overwrite edits made by other agents. Do not run destructive commands. Do not delete files. Do not touch git beyond the explicit operations Ken authorizes in the current chat.

Read these first:

1. docs/HARBOURMESH_COMPLETION_STATUS_2026_05_06.md
2. docs/HARBOURMESH_NB_LAUNCH_PLAN_2026_05_06.md
3. README.md
4. server/README.md

Treat docs/ARCHITECTURE_AUDIT.md, docs/SECURITY_AUDIT.md, docs/DEPLOYMENT_GUIDE.md, and docs/DZIP_FORMAT.md as historical or aspirational unless you revalidate them against current source.

Current snapshot from the documentation handoff:

- HarbourMesh is a strong NB pilot foundation, not a public launch.
- Current verification after the account-session, ownership, contribution-history, and account-owned device-provenance slices recorded app lint, app type-check, full app tests, app build, app audit, server tests, server type-check, server build, server audit, Settings account browser smokes, local API ownership smoke, local API contribution-history smoke, and local two-account/two-device aggregate smoke as passing; rerun checks after your changes before claiming current success.
- Account/session/export/settings, ownership, account-private contribution history, and account-owned device provenance work exists across `app/src/lib/account-session.ts`, `app/src/lib/account-contributions.ts`, `app/src/lib/device-registration.ts`, `app/src/lib/community-*`, `server/src/account-ownership.ts`, `server/src/account-contributions.ts`, `server/src/device-repository.ts`, server community repositories, and the PostGIS migration. Preserve and build on it.
- Remaining launch blockers include fleet/team authorization, broader per-account/fleet access policies, full browser/mobile route sweep, real Signal K/hardware proof, full hydrography/offline chart products, production deployment/monitoring/backups, official-chart legal handling, and security/privacy launch review.

Recommended first implementation target:

Extend the new account-scoped private reads and account-owned device provenance into real fleet/team access policy controls while keeping the existing pilot API key path compatible. The first safe boundaries, account-scoped contribution history and account-owned Boat Node registration, now exist; the next slice should prove shared/team access without leaking raw account or device IDs into public products.

Verification expectations:

- app: npm run lint, npm run type-check, npm run test:run, npm audit --omit=dev --audit-level=high, npm run build
- server: npm test, npm run type-check, npm audit --omit=dev --audit-level=high, npm run build
- browser: verify the affected Settings/Community/Navigation flows at 1280px and 360px, with console errors/warnings reported honestly
- API smoke: verify account register/login/me with HARBOURMESH_ACCOUNT_SESSION_SIGNING_KEY and invite-code settings if account/session behavior changed; verify `/api/account/community/contributions` and account-owned `/api/devices/register` behavior if contribution, device, or ownership behavior changed

Do not claim NB beta readiness until current-source checks pass, account/session/export behavior is verified, browser/mobile checks pass, live Signal K or real vessel telemetry has been exercised, and two users/devices can contribute and receive privacy-scrubbed aggregate community data.

Final response should list exact files changed, verification commands actually run, results, and anything still unfinished.
```

## Handoff Notes

Keep implementation changes in app/server narrowly scoped to the active objective. If docs need to be updated after implementation, prefer updating `docs/HARBOURMESH_COMPLETION_STATUS_2026_05_06.md` and `docs/HARBOURMESH_NB_LAUNCH_PLAN_2026_05_06.md` with concrete verification evidence rather than expanding the older February audit files.
