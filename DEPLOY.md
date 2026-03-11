# Deploying to Dokploy + Hostinger

## Overview

This app is a Node.js / Express + React app with a PostgreSQL database.  
It runs as a single Docker container on port **5000**.

---

## Prerequisites

| Service | What you need |
|---------|--------------|
| **Hostinger VPS** | Ubuntu 22.04 recommended, at least 2 GB RAM |
| **Dokploy** | Installed on the VPS — see https://dokploy.com/docs |
| **Database** | External Neon DB (easiest) OR PostgreSQL on VPS |
| **Resend** | Account at resend.com — verify your domain |
| **Stripe** | Live keys from dashboard.stripe.com |
| **OpenAI** | API key from platform.openai.com |
| **Domain** | Point your domain's DNS A record to your VPS IP |

---

## Step 1 — Install Dokploy on Hostinger VPS

SSH into your VPS and run:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy's dashboard will be available at `http://<YOUR_VPS_IP>:3000`.

---

## Step 2 — Push this repo to GitHub

Dokploy deploys from a Git repository.

1. Create a private GitHub repo named `projectdna-music`
2. Push this project:

```bash
git remote add origin https://github.com/YOUR_USER/projectdna-music.git
git push -u origin main
```

---

## Step 3 — Create the app in Dokploy

1. Open Dokploy dashboard → **Projects** → **New Project**
2. Add a new **Application** → choose **Docker Compose** source
3. Connect your GitHub repo
4. Set the **Compose file path** to `docker-compose.yml`
5. Click **Save**

---

## Step 4 — Set environment variables

In Dokploy → your app → **Environment** tab, add every variable from `.env.example`.  
Required values:

```
DATABASE_URL       = postgres://user:pass@host/db?sslmode=require
SESSION_SECRET     = (run: openssl rand -hex 32)
APP_URL            = https://projectdnamusic.info
STRIPE_SECRET_KEY  = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
VITE_STRIPE_PUBLIC_KEY = pk_live_...
RESEND_API_KEY     = re_...
RESEND_FROM_EMAIL  = noreply@projectdnamusic.info
OPENAI_API_KEY     = sk-...
LOCAL_STORAGE_PATH = /app/uploads
PORT               = 5000
NODE_ENV           = production
```

---

## Step 5 — Configure the domain

1. In Dokploy → your app → **Domains** tab  
2. Add `projectdnamusic.info` → port `5000`  
3. Enable **HTTPS / Let's Encrypt**  
4. In your Hostinger DNS, point `A` record to your VPS IP

---

## Step 6 — Deploy

Click **Deploy** in Dokploy.  
The build will:
1. Install dependencies
2. Build the React frontend with Vite
3. Bundle the Express server with esbuild
4. Start with `node dist/index.js`

---

## Step 7 — Run database migrations

After the first deploy, open the **Console** tab in Dokploy for your container and run:

```bash
npm run db:push
```

This creates all database tables. Only needed on first deploy.

---

## Step 8 — Configure Stripe webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://projectdnamusic.info/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **signing secret** and set it as `STRIPE_WEBHOOK_SECRET`

---

## Step 9 — Upload your media files

Your audio files and images need to be copied to the `uploads/` volume on the server.

### Option A — SFTP upload

Use FileZilla or Cyberduck to SFTP into your VPS and upload files to:
```
/var/lib/docker/volumes/<project>_uploads_data/_data/
```

### Option B — Direct copy from Replit Object Storage

On the Replit side, export each file via the Object Storage tool and re-upload via SFTP.

### File naming

The app looks up files by filename. Make sure uploaded filenames match the  
`audioUrl` values stored in the database (just the filename part, not the full path).

For example if the DB has `audioUrl = "/public-objects/public/my-song.mp3"`,  
upload the file as `my-song.mp3` into the uploads folder.

---

## Updating the app

In Dokploy → your app → click **Redeploy**.  
Or set up **Auto-deploy on push** from GitHub.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App won't start | Check env vars — `SESSION_SECRET` and `DATABASE_URL` are required |
| Emails not sending | Verify `RESEND_API_KEY` and that `RESEND_FROM_EMAIL` domain is verified in Resend |
| Payments failing | Check `STRIPE_SECRET_KEY` is the live key (starts with `sk_live_`) |
| AI agents not working | Check `OPENAI_API_KEY` is set |
| Media files 404 | Files not uploaded to the volume yet — see Step 9 |
| Database errors | Run `npm run db:push` in the Dokploy console |
