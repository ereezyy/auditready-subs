# AuditReady Subs

Certificate-of-insurance tracking for a small general contractor. Import the subs you paid, let each one upload an ACORD 25 without an account, confirm the reading, and see which payments an auditor could add back to workers' comp payroll.

The product is from Eddy Woods LLC. The working name is AuditReady Subs.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run samples:generate
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

No API keys are required. Missing keys use the mocks described below.

Demo workspace (created the first time the local database is opened):

- Email: `demo@northline.example`
- Password: `northline-demo`

Or use "Open the Northline Builders demo workspace" on the landing page.

`DEMO_TODAY=2026-11-25` is in `.env.example` so the bundled certificates stay in the designed state: Herrera covered, Lakeside expiring in 14 days, Holm expired. Clear it to use the real date.

## Demo path

1. Sign up, or sign in as the demo contractor.
2. Import `samples/subs.csv` (also linked from Import).
3. Open a sub's upload link and upload `samples/acord-herrera.pdf` or the PNG.
4. Confirm the reading. Status uses only confirmed certificates.
5. On Uncovered dollars, import `samples/payments.csv`.
6. Download the audit packet.
7. Billing, choose a plan, complete the simulated test checkout.
8. Reminders, then Send due reminders. The note lands in the outbox and the server log.

## Scripts

```bash
npm test          # extraction parsing, uncovered dollars, plan limits
npm run lint
npm run typecheck
npm run build
npm run samples:generate
npm run stripe:products   # test mode only; refuses sk_live_
```

## What is mocked when keys are missing

| Piece | With keys | Without keys |
| --- | --- | --- |
| Database, auth, files | Supabase (Postgres, Auth, Storage) | `.data/db.json`, scrypt passwords, HMAC session cookie, files in `.data/blobs` |
| Email | Resend | Printed to the server log and saved in the in-app outbox |
| Payments | Stripe Checkout and Billing, test keys only | A simulated checkout page that writes the plan locally. No card, no live product |
| Certificate reading | `EXTRACTION_API_URL` plus `EXTRACTION_API_KEY`, an OpenAI-compatible chat completions endpoint | PDF text parser, plus a fixed reading when the filename matches a bundled sample |
| Reminders | `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` | The same route is open in local dev when `CRON_SECRET` is unset. The Reminders page can send what is due |
| Demo clock | | `DEMO_TODAY=YYYY-MM-DD` |

`FORCE_MOCKS=1` keeps the mocks even if keys are present.

Live Stripe keys (`sk_live_`, `rk_live_`, `pk_live_`) throw. This build does not create live products.

## Plans

| Plan | Price | Subcontractors |
| --- | --- | --- |
| Free | $0 | 3 |
| Starter | $19/month | 15 |
| Pro | $39/month | 50 |
| Plus | $79/month | Unlimited |
| Audit Rescue | $149 once | Does not raise the cap. Unlocks the audit packet |

New accounts get 14 days of Pro without a card. After that, the free cap applies. Reminders send during the trial and on a paid plan. The audit packet is available on the trial, a paid plan, or Audit Rescue.

A payment is uncovered when the sub did not have both workers' comp and general liability in force on that date, on a certificate you confirmed. The payroll add-back is the portion with no workers' comp.

Reminders go out at 30, 14, 7, and 0 days. The note lists the limits from Requirements and the no-login upload link, and it copies the sub's insurance agent when that email is on file.

## Deploy checklist

Do not deploy this demo until the items below are set. This repository was not deployed.

1. Create a Supabase project and run `supabase/migrations/001_init.sql`.
2. Confirm the `certificates` storage bucket exists (the migration inserts it) and that RLS is enabled. The policies are in that file. The server uses the service role; the policies protect the anon and authenticated keys.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Set a long `AUTH_SECRET`. Leave `DEMO_TODAY` empty.
5. Create Stripe **test** products with `STRIPE_SECRET_KEY=sk_test_... npm run stripe:products`. Copy the printed price ids. Point the webhook at `/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
6. Set `RESEND_API_KEY` and a verified `EMAIL_FROM`. Until you do, mail is not delivered.
7. Set `EXTRACTION_API_URL` (for example `https://api.openai.com/v1`) and `EXTRACTION_API_KEY` if scanned images need a vision model. PDFs with a text layer still parse locally.
8. Set `CRON_SECRET`. `vercel.json` schedules `/api/cron/reminders` daily at 13:00 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET`.
9. Set `NEXT_PUBLIC_APP_URL` to the public origin so upload links in emails are right.
10. Run `npm run build` on the host. The local `.data` directory is not used once Supabase is configured, and it is gitignored.

## Not in this version

- Minnesota contractor license check
- QuickBooks OAuth (bring a CSV)
- A second user on the same contractor account
- Endorsement-form review beyond the additional-insured and waiver checkboxes
- Production email, live Stripe, or a public deploy

AuditReady Subs keeps records. It does not issue certificates or give insurance advice.
