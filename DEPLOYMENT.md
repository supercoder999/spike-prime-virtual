# Deploying to Google Cloud Run with spikeprimevirtual.com

## Architecture

```
                   ┌──────────────────┐
  spikeprimevirtual.com   │  Cloud Run       │
  ─────────────────────►  │  (frontend)      │   nginx serving React SPA
                          │  port 8080       │
                          └──────────────────┘

  api.spikeprimevirtual.com  ┌──────────────────┐
  ──────────────────────────►│  Cloud Run       │   FastAPI backend
                             │  (backend)       │
                             │  port 8080       │
                             └──────────────────┘
                                    │
                                    ▼
                             Google Firestore
```

## Prerequisites

1. **Google Cloud CLI** — [install](https://cloud.google.com/sdk/docs/install)
2. **Docker** — installed and running
3. **GCP project** with billing enabled

```bash
# Login & create project (one-time)
gcloud auth login
gcloud projects create spikeprime-prod --name="Spike Prime Virtual"
gcloud config set project spikeprime-prod
gcloud billing accounts list
gcloud billing projects link spikeprime-prod --billing-account=<BILLING_ACCOUNT_ID>
```

## Step 1 — Deploy

```bash
chmod +x deploy.sh
./deploy.sh          # deploys both frontend + backend
# or
./deploy.sh frontend # frontend only
./deploy.sh backend  # backend only
```

The script will:
- Enable required GCP APIs (Cloud Run, Artifact Registry, Cloud Build)
- Create an Artifact Registry repository
- Build & push Docker images
- Deploy both services to Cloud Run

## Step 2 — Set Backend Secrets

After the first deploy, set your API keys:

```bash
gcloud run services update spikeprime-backend \
  --region=us-central1 \
  --set-env-vars="\
GEMINI_API_KEY=<your-gemini-key>,\
GCP_PROJECT_ID=spikeprime-prod,\
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json"
```

> **Tip:** For production Firestore, create a service account key and mount it
> as a Cloud Run secret volume instead of embedding credentials.

## Step 3 — Map Custom Domain

### 3a. Verify domain ownership

```bash
# Google will ask you to add a TXT record at name.com to prove ownership
gcloud domains verify spikeprimevirtual.com
```

Follow the prompts — you'll add a TXT record at name.com (see Step 4).

### 3b. Create domain mappings

```bash
# Frontend: spikeprimevirtual.com
gcloud beta run domain-mappings create \
  --service=spikeprime-frontend \
  --domain=spikeprimevirtual.com \
  --region=us-central1

# Frontend: www.spikeprimevirtual.com
gcloud beta run domain-mappings create \
  --service=spikeprime-frontend \
  --domain=www.spikeprimevirtual.com \
  --region=us-central1

# Backend API: api.spikeprimevirtual.com
gcloud beta run domain-mappings create \
  --service=spikeprime-backend \
  --domain=api.spikeprimevirtual.com \
  --region=us-central1
```

After each mapping, Cloud Run will show you the required DNS records.
They will look like this:

| Type  | Host | Value |
|-------|------|-------|
| CNAME | www  | ghs.googlehosted.com. |
| CNAME | api  | ghs.googlehosted.com. |
| A     | @    | (IP shown by gcloud)  |
| AAAA  | @    | (IPv6 shown by gcloud)|

## Step 4 — Configure DNS at name.com

1. Log in to [name.com](https://www.name.com)
2. Go to **My Domains** → **spikeprimevirtual.com** → **DNS Records**
3. **Delete** any existing A/AAAA/CNAME records for `@`, `www`, `api`
4. **Add** these records:

### Domain Verification (TXT)
| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT  | @    | `google-site-verification=<token from Step 3a>` | 300 |

### Root Domain (spikeprimevirtual.com)
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A    | @    | `<IPv4 from gcloud>` | 300 |
| AAAA | @    | `<IPv6 from gcloud>` | 300 |

### WWW Subdomain (www.spikeprimevirtual.com)
| Type  | Host | Value | TTL |
|-------|------|-------|-----|
| CNAME | www  | ghs.googlehosted.com. | 300 |

### API Subdomain (api.spikeprimevirtual.com)
| Type  | Host | Value | TTL |
|-------|------|-------|-----|
| CNAME | api  | ghs.googlehosted.com. | 300 |

5. **Save** and wait 5-30 minutes for propagation.

## Step 5 — SSL Certificate

Cloud Run provisions a free **managed SSL certificate** automatically after
DNS records propagate. Check status:

```bash
gcloud beta run domain-mappings describe \
  --domain=spikeprimevirtual.com --region=us-central1
```

SSL provisioning can take up to 24 hours (usually much faster).

## Step 6 — Verify

```bash
curl -I https://spikeprimevirtual.com
curl -I https://api.spikeprimevirtual.com/api/health
```

Open https://spikeprimevirtual.com in your browser.

## Updating After Changes

```bash
./deploy.sh              # rebuild & deploy both
./deploy.sh frontend     # frontend only
./deploy.sh backend      # backend only
```

## Firestore Setup for Production

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Add your GCP project
3. Create a Firestore database (production mode)
4. Create a service account with `Cloud Datastore User` role
5. Download the key JSON and set it as a Cloud Run env var or secret

## Cost Estimate

Cloud Run pricing is pay-per-use:
- **Free tier**: 2 million requests/month, 360k vCPU-seconds, 180k GiB-seconds
- With `min-instances=0`, you only pay when the service is handling requests
- Estimated cost for low-traffic site: **$0-5/month**
