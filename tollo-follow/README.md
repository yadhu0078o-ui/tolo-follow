# Tollo Follow

A full-stack Instagram-growth marketplace — accounts, checkout, order tracking, and an admin panel — built for a hackathon.

## What's real vs. mocked

- **Real:** user accounts (signup/login with hashed passwords + signed session tokens), a real SQLite database, order creation, order tracking with live-updating delivery progress, and a full admin panel with live stats.
- **Mocked, on purpose:** the card payment gateway mimics Stripe's own *test mode* (same test card numbers, same decline reasons) — no real processor is called and no real money moves. The UPI flow shows a QR code and lets the buyer mark an order "paid," after which it sits as **pending verification** until an admin manually confirms — this is how real small UPI-based SMM panels work, since there's no automatic bank webhook for a scanned QR without a merchant account.

## Stack

- **Backend:** plain Node.js — no npm packages required at all. Uses Node's built-in `node:sqlite` for the database and built-in `crypto` for password hashing and session tokens.
- **Frontend:** plain HTML/CSS/JS single-page app, no build step, no framework, no dependencies.

This means deployment is just: upload the code, run `node server.js`. Nothing to install, nothing that can fail to `npm install` at demo time.

## Run it locally

```bash
cd backend
node server.js
```

Then open **http://localhost:4000** — the backend also serves the frontend.

An admin account is auto-created on first run:
- **Email:** `admin@tollofollow.com`
- **Password:** `admin123`

Change or remove this before showing the project to anyone outside your team.

## Test payments

**Card checkout** (instant):
| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined — "Your card was declined" |
| `4000 0000 0000 9995` | Declined — "Insufficient funds" |
| `4000 0000 0000 0069` | Declined — "Card has expired" |

Any expiry in the future and any 3-digit CVC works with these.

**UPI checkout**: scan (or ignore) the QR, click "I've completed the payment," then log in as admin and click **Verify** on that order in the admin panel. Once verified, the order starts "delivering" automatically — progress ticks up every few seconds until it hits 100%.

## Deploying so you have a live link

Pick any host that runs Node 22+. **Render** is the easiest free option:

1. Push this project to a GitHub repo.
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo.
3. Set:
   - **Root directory:** `backend`
   - **Build command:** *(leave empty — nothing to install)*
   - **Start command:** `node server.js`
   - **Node version:** 22 (Render usually auto-detects from `package.json`'s `engines` field, already set here)
4. Deploy. Render gives you a public `https://your-app.onrender.com` link.

Railway and Fly.io work the same way — root directory `backend`, start command `node server.js`, no build step.

**One thing to know about free tiers:** the database is a file (`backend/data/tollo.db`). Some free hosts (like Render's free tier) wipe the filesystem on redeploy/restart, so orders you create for a demo won't survive a redeploy. That's fine for a hackathon demo — just don't redeploy between creating demo orders and presenting.

## Project structure

```
tollo-follow/
  backend/
    server.js       — HTTP server + all API routes
    db.js            — database schema + queries (node:sqlite)
    auth.js          — password hashing + session tokens (node:crypto)
    payments.js       — mock Stripe-test-mode card gateway
    package.json
  frontend/
    public/
      index.html
      css/style.css
      js/api.js       — API client
      js/app.js        — SPA router + all views
```

## Changing prices or branding

Package pricing lives in one place: the `PACKAGES` array near the top of `backend/server.js`. The same numbers are duplicated as a fallback in `frontend/public/js/app.js` (`PACKAGES_FALLBACK`) in case the API call fails — update both if you change pricing.
