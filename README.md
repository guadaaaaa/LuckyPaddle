# Lucky Paddle — court booking (Next.js 14, TypeScript, Tailwind)

One private court. Four-leaf luck. A pickleball booking site where players pick a slot, pay, and get a confirmation email, plus an admin dashboard for the owner.

## Run it
    npm install
    cp .env.example .env.local
    npm run dev          # http://localhost:3000

With no keys set it runs in **placeholder mode**: checkout pretends the payment succeeded and the
confirmation email is logged to the terminal.

## Admin dashboard

Open `http://localhost:3000/admin`. In development the default password is `luckypaddle`; set
`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in `.env.local` before deploying. The dashboard shows
revenue, paid and upcoming bookings, today's occupancy, the private court's hourly schedule, and all
live bookings. It refreshes every 15 seconds.

## What to set up (in this order)
1. **Database (required before going live).** `src/lib/store.ts` keeps holds/bookings in memory, which does
   not work on Vercel (each serverless call can be a different instance). Swap its functions for
   Upstash Redis / Vercel KV / Supabase. Keep the same function names. Make "create hold" atomic
   (Redis `SET key value NX EX 600` is ideal).
2. **PayMongo.** Dashboard > Developers > API Keys: copy the secret key (`sk_test_...`) to `PAYMONGO_SECRET_KEY`.
   Then Developers > Webhooks > add `https://YOUR-DOMAIN/api/webhook/paymongo` for event
   `checkout_session.payment.paid`, and copy the signing secret to `PAYMONGO_WEBHOOK_SECRET`.
   Use test keys first; switch to live keys after PayMongo activates your account.
3. **Email (Resend).** Create a key in resend.com, verify your domain, set `RESEND_API_KEY` and `EMAIL_FROM`.
4. **Vercel.** Push to GitHub, import the repo in Vercel, add all `.env.example` variables, and set
   `NEXT_PUBLIC_APP_URL` to your live URL. Redeploy.

## Where things are
- `src/lib/config.ts` — court name, hours, price, hold minutes, photo URLs
- `src/app/api/hold` — 10-minute slot lock (extended to 30 min once the customer goes to pay)
- `src/app/api/checkout` — creates the PayMongo Checkout Session
- `src/app/api/webhook/paymongo` — marks paid and sends the email (once)
- `src/components/Booking.tsx` — booking UI with countdown
- `src/app/admin` — protected admin dashboard
- `src/app/api/admin` — admin login, logout, and dashboard data
