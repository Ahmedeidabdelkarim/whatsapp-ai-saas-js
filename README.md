# واتساب ستور — WhatsApp AI Store SaaS

Multi-tenant SaaS: each merchant connects a WhatsApp Business number, loads a catalog, and an AI sales assistant (Claude) answers customers **only from that catalog**.

Stack: Next.js 15 (RTL) · Prisma + PostgreSQL · Tailwind 4 · WhatsApp Cloud API · AI: Gemini free tier or Claude · Moyasar payments

## JavaScript version
This is the same project as the TypeScript one with the types removed (`.ts/.tsx` -> `.js/.jsx`). Behaviour is identical.
- `@/` imports work through `jsconfig.json`; config is `next.config.mjs`; the seed is `prisma/seed.mjs` (plain Node, no tsx needed).
- `npm test` still uses `tsx` only because tests import files without extensions.
- Tip: the conversion uses 4-space indentation. Run `npx prettier --write src tests` to reformat to your style.

## Run
```bash
npm install
cp .env.example .env        # fill it in (see below)
npx prisma db push
npm run db:seed             # demo store + plans (Basic / Standard / Diamond)
npm run dev
npm test                    # unit tests (Node 22+)
```
Demo logins: `owner@abaq.test / owner12345` · `admin@example.com / admin12345`

### Admin store and plan management
The `SUPER_ADMIN` role can see all stores, edit store names and slugs, suspend/reactivate stores, create and edit subscription plans, and view platform-wide store analytics. Store suspension blocks owner login, tenant dashboard APIs, local uploads, and new WhatsApp processing while retaining the store's data.

After updating an existing database, run `npx prisma db push` to add the store status field.

## AI provider (free option)
`AI_PROVIDER="openai"` + `OPENAI_API_KEY` (free Gemini key from https://aistudio.google.com/apikey) + `AI_MODEL="gemini-3.8-flash"`. Works with any OpenAI-compatible API (Groq, OpenRouter, Ollama: change `OPENAI_BASE_URL`).
`AI_PROVIDER="anthropic"` uses Claude (paid credit). Google's free tier may use prompts to improve their products: testing only.

### Hybrid product search (RAG)
Product recommendations use tenant-scoped database filters (active/in-stock products, category, brand, and exact price bounds) combined with text matching and cosine similarity over product embeddings. Embeddings include the product name, description, category, and brand; price and stock always come from the live database.

The semantic layer uses an OpenAI-compatible embeddings endpoint. Set `AI_EMBEDDING_API_KEY` (or reuse `OPENAI_API_KEY`), optionally `AI_EMBEDDING_BASE_URL` (defaults to `OPENAI_BASE_URL`), and optionally `AI_EMBEDDING_MODEL` (defaults to `gemini-embedding-001` for Google's endpoint or `text-embedding-3-small` otherwise). The endpoint must support `POST /embeddings`. When semantic credentials are absent or the endpoint is unavailable, the system logs the problem and uses text search instead.

After adding the `ProductEmbedding` table, apply the schema with `npx prisma db push`. New and edited products are indexed automatically; old catalog entries are backfilled in batches of up to 40 when semantic searches run. The vector is stored separately so product API responses never include it.

## Customer journey (matches the product spec)
1. First message: welcome (greeting + image/video/voice/PDF) + main menu (sections + "التحدث مع موظف").
2. Menus need no AI: section -> sub-section -> brand -> product list -> product card with [أضف للسلة] [متابعة التسوق] [التحدث مع موظف]. A short message that is just a section/brand name opens that menu.
3. Free text ("أبغى عطر رجالي تحت 300 ريال") -> AI with tools: list_categories, search_products (category / brand / price), show_product_card, add_to_cart, create_order, human_handoff.
4. Stages: استفسار فقط -> مهتم بمنتج -> تمت الإضافة للسلة -> بدأ إتمام الطلب -> طلب مكتمل (on payment) | سلة متروكة (24h silence) | طلب موظف. Every step is a `CustomerEvent`; the dashboard refreshes itself every few seconds.
5. Human handoff stays inside the same WhatsApp chat: AI -> waiting for staff -> staff connected (reply from dashboard) -> back to AI. Triggers: menu option, button, phrases like "أبي موظف", AI can't answer, session AI budget used.
6. A session = 24h of silence. The monthly conversation quota and the per-session AI token budget (Basic ~1,200) count sessions.

## Checkout without the AI
Tapping **إتمام الطلب** (or typing "ابغى أكمل الطلب") shows the cart + total and asks for the address (`Conversation.awaiting = ADDRESS`). The next plain message creates the order (stock taken atomically) and, if the merchant connected Moyasar, sends the payment link. Tapping any menu button or typing "إلغاء" cancels the wait. The AI's `create_order` tool uses the same code (`server/orders/checkout-flow.ts`).

## AI diagnostics
Dashboard → واتساب → "اختبار الذكاء الاصطناعي" runs a real request (with the real tool schemas) and prints the exact provider error. The last AI error is also saved and shown there.

## Forgot password (email OTP)
`/forgot-password` (email) -> `/verify-otp` (6-digit code) -> `/reset-password` (new password).
- The code is random, valid 10 min, 5 wrong tries max (counted atomically before comparing), one active code per user; only an HMAC of it is stored.
- A correct code becomes a 15-minute reset session in an httpOnly cookie (only its hash is stored): no secret in any URL.
- Same answers whether or not the email exists; limits: 1 code/min and 5/h per email, 10/15 min per IP.
- Gmail works directly over SMTP without Resend: enable 2-Step Verification, create a Google App Password at https://myaccount.google.com/apppasswords, then set `SMTP_USER` to the Gmail address and `SMTP_PASS` to the App Password. When `SMTP_HOST`/`SMTP_PORT` are omitted, Gmail defaults to `smtp.gmail.com:465` (SSL). Set `EMAIL_FROM` to the same Gmail address (optionally with a display name). Never use your normal Gmail password.
- Other SMTP mailboxes from hosting providers/cPanel are supported through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`; port 465 uses SSL and port 587 uses STARTTLS.
- SMTP is the only production mail transport; the app does not fall back to Resend. If SMTP is missing in production, the reset flow reports that mail is not configured. In local development without SMTP, the code is printed in the terminal (`[email:dev]`). Arabic-Indic digits (١٢٣٤٥٦) are accepted.
- A finished reset deletes all pending codes. Existing login sessions stay valid until they expire (7 days).

## Real-time dashboard
Every state change (incoming/outgoing message, handoff, stage) calls `publish(storeId, …)` (`lib/realtime/bus.ts`). The dashboard keeps one Server-Sent Events connection (`/api/realtime`, tenant-scoped by session); on an event the open page re-reads its data with `router.refresh()`: no reload, typed text is kept. A 4s DB check (`Conversation.updatedAt`) is the safety net when the worker runs in another process; if the stream drops the page polls every 12s. Events carry no message content.
Scaling out (several servers): replace the in-memory bus with Postgres LISTEN/NOTIFY or Redis pub/sub behind the same `publish`/`subscribe`. On serverless hosts SSE connections are time-limited; use a hosted channel (Pusher/Ably) instead.

**The rule:** once a conversation is HANDOFF (waiting for agent) or STAFF_ACTIVE (agent connected) the AI stays silent: checked before the AI runs, before every tool call and before the reply is sent, so a takeover during generation also wins. Only "return to AI" in the dashboard (or the customer starting a new 24h session) hands control back.

## Plans (seed values, prices are placeholders)
Basic 50 products / 500 conv / AI 1,200 tokens per session · Standard 250 / 2,500 / standard AI + voice notes · Diamond unlimited / 20,000 / high AI + voice + full CRM (customer profile + timeline). Trial has everything.

## How a message flows
Meta → `POST /api/webhooks/whatsapp` (verify signature, store a **Job**, answer 200 in ms) →
queue worker (`server/jobs/queue.ts`) → `lib/whatsapp/processor.ts` → welcome package and/or `lib/ai/agent.ts` (Claude tool loop).
Jobs retry with backoff (10s → 10min, 5 attempts). Messages of one customer run strictly in order.
The worker polls every 3s inside the Next server. On serverless set `JOB_WORKER=off` and call `GET /api/jobs/run` from a cron with `Authorization: Bearer $CRON_SECRET`.

**Bot silent?** Open dashboard → واتساب وباقة الترحيب → "فحص سريع", and read the terminal: every skip reason is logged (`[wa …] AI skipped: …`).

## Payments (Moyasar)
- **Customer orders**: merchant pastes their own `sk_…` key in dashboard → الإعدادات. After `create_order` the bot sends a Moyasar payment link in the chat; when paid the order becomes PAID and the customer gets a confirmation. Money goes to the merchant.
- **Merchant subscriptions**: `MOYASAR_SECRET_KEY` (platform key) + الاشتراك page → Moyasar checkout → plan activates for 30 days.
- Callback: `POST /api/webhooks/payments?s=PAYMENTS_WEBHOOK_SECRET`. The body is never trusted: the invoice is re-fetched from Moyasar and must be `paid` with the exact amount.
- `APP_URL` must be public (ngrok/your domain) or Moyasar cannot call back.

## Uploads
Welcome video / voice note / PDF and product images are uploaded through the authenticated `/api/uploads` endpoint (type, size, file signature, and store ownership are checked). The WhatsApp dashboard previews assets through an authenticated endpoint, so dashboard viewing does not require public bucket access. `STORAGE_DRIVER=local` stores in `UPLOAD_DIR` and serves via `/api/files/...` (needs public `APP_URL`); `s3` uses an AWS S3 bucket or compatible storage. For AWS, use the bucket's exact region, leave `S3_ENDPOINT` blank, configure `S3_PUBLIC_URL` as `https://<bucket>.s3.<region>.amazonaws.com`, and grant the app only `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::<bucket>/uploads/*`. WhatsApp must be able to fetch media from its URL; do not enable bucket listing. For production on AWS, prefer an IAM role over long-lived access keys.
Voice notes show as real voice messages only when the file is OGG/Opus.

## Follow-up campaign template
Dashboard → واتساب → "قالب حملة المتابعة" → create `cart_followup` (submitted to Meta for review). The campaign button only sends when its status is APPROVED. Marketing templates are billed by Meta per message.

## Security notes
WhatsApp token and Moyasar key are AES-256-GCM encrypted in the DB (key = `ENCRYPTION_KEY` or `AUTH_SECRET`; rotating it makes saved tokens unreadable, re-save them). Rate limits: login, register, reset, uploads, checkout, per-customer AI. The limiter is in-memory (single instance); use Redis for several instances.

## Still not done
- Staff roles / multiple staff accounts, customer image messages
- Integration tests against a real DB, E2E tests
- Session revocation after password reset (sessions are stateless JWTs, valid up to 7 days)
