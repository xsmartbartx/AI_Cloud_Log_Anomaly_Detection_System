# Build log

| ID | date | status | missing / notes |
| --- | --- | --- | --- |
| shell | 2026-10-13 | done | marketing header/footer, app shell with rail (mobile: horizontal tabs), breadcrumbs |
| detector | 2026-10-13 | done | packages/detector, 7 tests pass. Needs a labelled corpus before launch (risk 2) |
| S01 landing | 2026-10-13 | done | copy written fresh; example result is static |
| S02 pricing | 2026-10-13 | done | checkout buttons link to /go until Stripe |
| S03 docs | 2026-10-13 | done | single page |
| S04 sign-in | 2026-10-13 | partial | stub, demo user. Clerk in backend |
| S05 overview | 2026-10-13 | done | |
| S06 new scan | 2026-10-13 | done | inline results (stateless) |
| S07 result | 2026-10-13 | done | inline on S06; /app/scans/:id shows findings only if retained |
| S08 history | 2026-10-13 | done | in-memory |
| S09 rules | 2026-10-13 | done | JS regex, no safe engine yet |
| S10 usage | 2026-10-13 | partial | no checkout |
| S11 keys | 2026-10-13 | done | |
| S12 settings | 2026-10-13 | partial | members read-only |
| S14 /go | 2026-10-13 | partial | no session check |

Decisions: results render inline because scans are stateless; saved findings need retention on. Data layer is in-memory (lib/store.ts) with the signatures the Prisma layer will keep. Dev server runs with autoPort since :3000 was taken by another session.
Not done: per-screen commits (nothing committed), clone-screens PNGs (no reference screens exist for an original product), export, Console usage endpoint.
Known nit: redaction turns `Authorization: Bearer x` into `Authorization: [redacted] [redacted]`.
