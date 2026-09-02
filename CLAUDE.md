# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Next.js app (nextjs-app/)
npm run dev          # dev server on :3000
npm run build        # production build (also the type check)
npm run migrate      # apply system.db migrations (runs at container start)

# Background processor (background-processor/)
npm run dev          # tsc + run the poll loop
npm test             # jest: carrier/tracking-number heuristics, email link extraction,
                     #       html stripping, journey->command mapping, analyzer (model mocked)
```

Local dev needs `.env` in both dirs (see the `.env.example` files). Keep
`EMAIL_TEST_MODE=1` locally: emails are logged (verification codes included)
and mailbox creation is faked. The processor needs `OPENAI_API_KEY`; without
it every refresh is reported as an error status and forwarded emails get no
label (the loops keep running). To exercise the IMAP inbound path locally
use a GreenMail container (see README "Run").

## What this is

The 8exgh/cargopax product (forward shipment emails to your
`<name>@cargopax.ca`, get tracked and notified) rebuilt on the
`starter-sites` / `inventory-shopify` stack with no AWS: Cognito → own
auth, SES/S3/Lambda inbound → Migadu mailbox per account polled over IMAP,
SES outbound → Gmail SMTP, push notifications dropped. The README has the
full mapping table and sequence diagrams.

## Architecture

CQRS + Event Sourcing in the `inventory-shopify` / `starter-sites` shape
(Dymitruk / Dilger): commands load an aggregate's events, replay them,
validate, append; queries replay; a background processor polls "to-do"
queries over HTTP with an API key and reports back with commands. No read
models: every query is a replay (one aggregate per account, fine at this
scale).

- `nextjs-app/types/events.ts` — event types and the `AccountState` shape (trackers keyed by `trackerId`, journey dates, pending notification changes, mailbox, forwarded emails, groups, verification)
- `nextjs-app/lib/commands/event-replay.ts` — the fold
- `nextjs-app/lib/commands/account-commands.ts` — all command handlers; `aggregate_id = tenantId`; `handleUpdateTrackingShipmentStatus` appends only changed dates, delivered last
- `nextjs-app/lib/queries/account-queries.ts` — dashboard view, the processor's to-dos (`getRefreshRequests`, `getMailboxesToPoll`, `getEmailMessagesToProcess`, `getEmailMessageContent`), the jobs' to-dos, `isAllowedTrackingUrl`
- `nextjs-app/lib/tracking/carrier.ts` — carrier domain map, per-carrier tracking-number formats, and `carriersForTrackingNumber` (mirrored in `background-processor/src/utils/carrier.ts`; keep in sync)
- `nextjs-app/lib/tracking/tracking-input.ts` + `components/TrackingInput.tsx` — the dashboard box takes a link or a bare number: the carrier is detected and the dropdown selects itself, overlapping formats ask the user, and a link's host always beats the dropdown
- `nextjs-app/lib/jobs.ts` — the in-process jobs (8examples "pump"): verification / welcome / owner / shipment-update / reset emails, mailbox provisioning and retired-mailbox deletion
- `nextjs-app/lib/mail.ts` — Gmail SMTP (nodemailer), `notifyOwner` → `NOTIFY_EMAIL` (sbennett@8examples.com)
- `nextjs-app/lib/push.ts` + `public/sw.js` + `components/PushNotifications.tsx` — web push (VAPID, `VAPID_*` env). Subscriptions are events (`web_push_subscription_registered`/`_removed`, the original's device-registration shape); trackers keep a separate `pendingPushChanges` list so push and email never eat each other's work; a 404/410 from the push service drops the subscription. iOS only delivers to a Home Screen install, so the UI shows install steps to iOS-in-a-tab rather than a dead button.
- `nextjs-app/lib/migadu.ts`, `lib/mailbox.ts` — Migadu adapter (mailboxes + domain endpoints, `parseMigaduRecords`); address rules, reserved list, availability check
- `nextjs-app/lib/mail-domain.ts` + `lib/cloudflare.ts` — converges MAIL_DOMAIN on Migadu each pump (add domain → read required DNS → publish to Cloudflare when the zone is ours → activate), caches for 6h, and reports the records to publish by hand otherwise (`GET /api/queries/mail-domain?recheck=1`). Ported from 8examples' `ensureMailboxDns`/`createZoneRecords`.
- `nextjs-app/lib/auth/middleware.ts` — `requireAuth`, `requireApiKey`, `requireVerifiedUser` (any member), `requireVerifiedAdmin` (403 `forbidden`). **`authenticateRequest` resolves the user from the users table on every request**, so role and the role itself come from the database, never the JWT: a demotion or removal takes effect immediately instead of when a week-old token expires.
- `nextjs-app/components/OrganizationSettings.tsx` / `MemberSettings.tsx` / `OrganizationLogo.tsx` — organization name, logo (stored as the `organization_logo_set` event's blob, served only to that organization; the `<img>` cannot send a bearer token so the component fetches it and uses a blob URL), and people management
- `background-processor/src/jobs/mailbox-poll.ts` — IMAP poll per account (`utils/imap-client.ts`: imapflow + mailparser, UID cursor, UIDVALIDITY reset)
- `background-processor/src/jobs/email-processing.ts` — links (`utils/email-url-extractor.ts`) → label (`computeLabel`) → `start-tracking-shipment` → `mark-email-message-as-processed`
- `background-processor/src/jobs/tracker-refresh.ts` — Bing `#package_tr_ans` for UPS/FedEx/USPS/DHL, carrier page fallback → `utils/tracker-html-analyzer.ts` (`ShipmentJourneySchema`, Responses API + `zodTextFormat`, `OPENAI_MODEL` default `gpt-5.4-mini`) → `utils/shipment-status.ts` → `update-tracking-shipment-status`

Conventions worth keeping:

- One organization per tenant. Signup makes the registrant its admin; everyone else is invited and is **read-only by default, except refreshing a status** - that is deliberate, not an oversight. The last admin cannot be demoted or removed (`countAdmins`).
- Roles live in `users.role` (with the credentials), organization facts live in the stream. Adding a role check means `requireVerifiedAdmin`, not reading `payload.role`.

- Event names are snake_case and follow the original cargopax backend where a concept exists there.
- Web push needs no Apple/Firebase accounts, just the VAPID keypair in devops (`CARGO_PAX_VAPID_*`); `app/manifest.ts` + `public/icon-*.png` exist so the iOS Home Screen install looks right, and `send-test-push` is how you confirm an install took.
- The mark (kraft parcel with a map pin) is drawn once in `scripts/generate-icons.mjs`; `public/logo.svg`, `app/icon.svg`, `app/favicon.ico`, the manifest/apple/maskable PNGs and the monochrome `badge-96.png` are all its output - rerun it, never hand-edit them. `components/Brand.tsx` pairs the mark with the two-tone wordmark; `/social-card` embeds the same SVG.
- Outbound side effects always pair with a marker event; a failed send leaves no marker and retries on the next pump. Shipment-update emails batch every pending change per tracker and wait until its scrape completes.
- Mailbox passwords, verification codes and reset tokens are stored in events in plaintext (owner decision, same as 8examples). Codes/tokens are single-use and expire.
- Only carrier hosts (or `TRACKING_ALLOWED_HOSTS`) are ever loaded in the browser; email-found links must be on a carrier host and carry a token in that carrier's real tracking-number format (`TRACKING_NUMBER_PATTERNS` in `carrier.ts`). A pasted url still gets a best-effort number when nothing matches.
- `background-processor/package.json` pins `deepmerge-ts` via `overrides` (mailparser → html-to-text pulls a version with a stack-exhaustion advisory); `npm audit` is clean and mailparser's html→text path is verified.
- "Delivered" without a readable date is recorded as delivered on the day it was observed (UPS's sample number does this).
- Route files export only `GET`/`POST` (Next rejects other exports).
- The UI keeps the JWT in localStorage, like the other 8examples sites; `/api/queries/account` answers 403 `needsVerification` for unverified accounts and the dashboard routes to `/verify`.

## Public pages

`app/(marketing)/` is a separate root layout from `app/(site)/`: server
components, no client JavaScript, prerendered. `/login` is the sign-in page;
`/` is public. `/shared-package-tracking` is the team-focused product page,
`/faq` carries the visible FAQ/FAQPage data, `/blog/feed.xml` is the RSS
feed, and `/social-card` renders the shared Open Graph image. `lib/seo.tsx`
holds the canonical/metadata/JSON-LD helpers and
`lib/blog.tsx` the posts.

Canonical URLs come from `getSiteUrl()` (build-time `NEXT_PUBLIC_SITE_URL`,
default `https://cargopax.ca`), **not** `getAppBaseUrl()` - the latter is a
runtime variable for emailed links, and prerendered pages would bake in
`http://localhost:3000`. The Dockerfile takes `NEXT_PUBLIC_SITE_URL` as a
build arg for that reason.

## Deployment

`.github/workflows/build-and-deploy.yml` → ghcr.io `cargo-pax-backend` /
`cargo-pax-processor` → `repository_dispatch` `cargo-pax-deploy` to
`8exgh/devops` (`deploy-cargo-pax.yml`, server7 port 3056, `/opt/cargo-pax/data`).
Images are Node 22 on Debian slim (better-sqlite3 has no Node 20 prebuilds
any more; the processor image installs Debian's chromium and runs as an
unprivileged user with `--no-sandbox`).

Secrets (all in `8exgh/devops`): `CARGO_PAX_JWT_SECRET`,
`CARGO_PAX_BACKGROUND_PROCESSOR_API_KEY`, `GMAIL_8EXAMPLES_USER`,
`GMAIL_8EXAMPLES_APP_PASSWORD`, `MIGADU_8EXAMPLES_ADMIN_EMAIL`,
`MIGADU_8EXAMPLES_API_KEY`, `OPENAI_API_KEY`. This repo needs `DEPLOY_TOKEN`.
The processor reads inboxes with credentials from the app; no mail secrets.

Mail-domain setup is code now (`lib/mail-domain.ts`), but `cargopax.ca`
itself is not ready: as of 2026-08-23 its nameservers are Google Cloud DNS
and its MX still points at SES (`inbound-smtp.us-east-1.amazonaws.com`) for
the original AWS app. Cutting that over is an owner decision (it stops the
old product receiving mail); the alternative is pointing `MAIL_DOMAIN` at a
subdomain or another Migadu-hosted domain. Until the domain is live every
registration records `mailbox_provision_failed` with the domain's real
reason and retries (backoff up to hourly); the dashboard shows "Setting up
(retrying)". README "Before production" has the checklist.
