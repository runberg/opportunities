# Opportunities

Internal sales pipeline tracker — follows an opportunity from the first RFQ through quoting, engagement letters, and into production.

Built for small teams on a private network. All data stays on your own server.

## Features

### Pipeline views
- **Quotes** — track opportunities from RFQ Received → Quote Sent
- **Engagement Letters** — dedicated EL view: EL Requested → Draft Shared → Signed Shared → Countersigned
- **Production** — track progress from Pending Advance Payment → In Production → Delivered, with per-row phase indicators (Adv. Payment, FAT, SAT); add expected delivery lines (unit type, quantity, month/year) per opportunity to forecast output

### Opportunity workflow
- **Modal-based editing** — create, view, and edit opportunities in a slide-over modal without leaving the list
- **Always-editable fields** — click any field to edit it; an "Apply Changes" bar appears when there are unsaved changes
- **One-click status transitions** — Quote Accepted promotes to EL flow; EL Countersigned promotes to Production
- **Skip to EL** — on RFQ Received opportunities, skip the quoting step entirely and move directly to the EL stage; the Quote Shared column shows N/A in the EL view
- **Document management** — upload and download quote, EL, FAT, and SAT documents per opportunity

### Dashboard
- **Pipeline snapshot** — live counts per status across all three pipeline stages; click any number to drill into that cohort
- **Quote Activity** — RFQs Received, Quotes Shared, avg days to quote; trend chart by period
- **EL Activity** — ELs Requested, Drafts Shared, Signed Shared, avg days EL requested → signed; trend chart
- **Production Activity** — Countersigned, Advance Payments, FAT Passed, Delivered; trend chart
- **Drill-down tables** — clicking any KPI or chart bar opens a filtered table showing the relevant date column
- **Configurable period** — 7 days / 30 days / 90 days / year-to-date / custom date range
- **Delivery Plan** — upcoming deliveries grouped by month, starting from the current month; shows unit type, quantity, and the associated opportunity; click any row to open the opportunity detail
- **Recent Activity** — the 10 most recently changed opportunities with a one-line description of the last change

### Data management
- **Audit log** — every status change, field edit, document upload and deletion is captured as a system event with actor and timestamp; user comments sit alongside system events in the same timeline
- **Column sorting** — all tables across the app support click-to-sort on every column header
- **Full-text search** — search by title, customer, internal ID, or reference number
- **Status + pending filters** — multi-select status filter and waiting-on filter on all list views
- **CSV export** — export filtered results from any list view or drill-down modal

### Ad Hoc Agreements ⚠️ Beta

> **This module is in active development.** Functionality and data model may change between releases.

Manage agreements that fall outside the main sales pipeline — retainers, one-off work orders, or any engagement that needs its own budget and deliverable tracking.

- **Agreement lifecycle** — DRAFT → SIGNED → CLOSED; the signed state is the active state (no separate activation step)
- **Budget tracking** — set a total agreement amount; committed and remaining amounts update live as work packages are approved
- **Work packages** — add deliverables once an agreement is signed; each work package has an approval amount and its own line items and documents
- **Agreement documents** — upload draft agreements on DRAFT agreements; upload counter-signed copies when marking as signed or at any time afterwards
- **Signed date** — required when marking an agreement as signed; defaults to today
- **Audit log** — all agreement and document events appear in the system log under the Ad Hoc filter

### Email notifications
- Users can opt in to email notifications from their profile page (only visible when an admin has configured and enabled SMTP)
- Notifications fire on opportunity status changes with a 3-minute debounce — multiple rapid changes to the same opportunity produce a single email
- Template is editable by admin with placeholders: `{{title}}`, `{{internalId}}`, `{{customer}}`, `{{status}}`, `{{link}}`

### UI
- **Dark theme by default** — deep navy palette; first-time visitors see the dark login page without any flash
- **Light / Dark toggle** — in the Profile page

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | NextAuth.js (credentials, JWT) |
| Reverse proxy | Nginx |
| Runtime | Docker + Docker Compose |

---

## Deployment

The application ships as a pre-built Docker image published to the GitHub Container Registry on every release. No build step is required on the server — you only need Docker and the compose file.

Three deployment paths are covered below: standard (server has internet access), air-gapped (server has no internet access), and updating an existing installation.

---

### Standard deployment (server has internet access)

#### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux)

#### 1. Download the required files

You do not need to clone the repository. Download only the files needed to run the stack:

```bash
mkdir -p opportunities/nginx/certs && cd opportunities
curl -O https://raw.githubusercontent.com/runberg/opportunities/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/runberg/opportunities/main/.env.example
curl -o nginx/nginx.conf https://raw.githubusercontent.com/runberg/opportunities/main/nginx/nginx.conf
```

#### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and fill in all values:

```env
# Database credentials — choose any strong password
POSTGRES_USER=opportunities
POSTGRES_PASSWORD=your_strong_db_password

# Admin account — created/synced automatically on every startup
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_strong_admin_password

# Auth secret — generate a random value (see command below)
NEXTAUTH_SECRET=replace_with_random_secret

# The URL users will use to reach the app
NEXTAUTH_URL=http://192.168.1.100
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

> On Windows without OpenSSL: run this inside a Git Bash terminal, or use any password manager to generate a 32+ character random string.

> **Admin password recovery:** if you ever need to reset the admin password, update `ADMIN_PASSWORD` in `.env` and restart the stack — the seed runs on every startup and will update the account.

#### 3. Create a dedicated system user for Docker

The app container runs as a non-root user. Create a matching OS user on the server so that host-mounted directories (uploads, database data) are owned by a dedicated account with no other privileges:

```bash
# Create user — choose any name and a free UID/GID (e.g. 1500)
sudo useradd -r -u 1500 -g 1500 -m -s /sbin/nologin dockerapp
# Or on systems where the group must be created first:
sudo groupadd -g 1500 dockerapp && sudo useradd -r -u 1500 -g 1500 -M -s /sbin/nologin dockerapp
```

Find the UID and GID:

```bash
id -u dockerapp   # e.g. 1500
id -g dockerapp   # e.g. 1500
```

Set these values in `.env`:

```env
APP_UID=1500
APP_GID=1500
```

Create the uploads directory and assign ownership:

```bash
mkdir -p ./data/uploads
sudo chown -R 1500:1500 ./data/uploads
```

> The `./data/postgres` directory is managed by the Postgres container which runs as its own internal user — no manual chown needed there.

#### 4. Start

```bash
docker compose up -d
```

This pulls the pre-built app image from `ghcr.io`, starts PostgreSQL and Nginx, applies database migrations, and creates (or syncs) the admin account from the env vars you set. Check progress with:

```bash
docker compose logs -f app
```

Wait until you see `✓ Ready` in the app logs.

#### 5. Open the app

Navigate to `http://<your-server-ip>` in a browser and log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in `.env`.

#### 6. Create user accounts

Go to **Admin → Users** to create accounts for your team. Users need an account to log in — there is no self-registration.

---

### Air-gapped deployment (server has no internet access)

The server never needs to reach the internet. All three Docker images are saved on a machine that does have access, transferred to the server (USB key, file share, or any other means), and loaded locally before starting the stack.

#### Step 1 — Save images on a machine with internet access

```bash
# Pull the images you want to transfer
docker pull ghcr.io/runberg/opportunities:latest
docker pull postgres:16-alpine
docker pull nginx:alpine

# Save them to tar archives
docker save ghcr.io/runberg/opportunities:latest -o opportunities-app.tar
docker save postgres:16-alpine                   -o opportunities-postgres.tar
docker save nginx:alpine                         -o opportunities-nginx.tar
```

To pin a specific release instead of `latest`, replace `latest` with the version tag (e.g. `v0.1.0`). The matching tag is available on every GitHub release.

#### Step 2 — Transfer files to the server

Copy the following to the server (USB key, SCP, shared drive, etc.):

```
opportunities-app.tar
opportunities-postgres.tar
opportunities-nginx.tar
docker-compose.yml
.env                  ← create from .env.example and fill in values (including APP_UID / APP_GID)
nginx/nginx.conf
nginx/certs/          ← required directory, can be empty unless using HTTPS
```

Before starting the stack, follow step 3 from the standard deployment section above to create a dedicated OS user and set `APP_UID`/`APP_GID` in `.env`.

You do **not** need Git or the full source repository on the server.

#### Step 3 — Load images on the server

```bash
docker load -i opportunities-app.tar
docker load -i opportunities-postgres.tar
docker load -i opportunities-nginx.tar
```

#### Step 4 — Start the stack

```bash
docker compose up -d --pull never
```

The `--pull never` flag tells Docker Compose not to attempt pulling any images from the internet — it will use only what is already loaded locally.

Database migrations and the admin account are created automatically on first start.

---

### Updating to a new version

#### Server with internet access

```bash
docker compose pull          # pull the new app image
docker compose up -d         # restart with the new image
```

#### Air-gapped server

Repeat the save/transfer/load steps from above with the new image tag, then:

```bash
# Update the image tag in .env or docker-compose.yml if pinning a specific version
docker compose up -d --pull never
```

Database migrations run automatically on startup. All data is stored in the `./data/` directory on the host and is not affected by image updates.

> **Upgrading from an earlier version?** Run migrations manually if needed: `docker compose exec app npx prisma migrate deploy`.

---

## HTTPS (optional)

The Nginx config includes a commented-out HTTPS block. To enable it:

1. Place your certificate and key in `nginx/certs/`:
   ```
   nginx/certs/cert.pem
   nginx/certs/key.pem
   ```
   Self-signed certificates work fine on an internal network. Generate one with:
   ```bash
   openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
     -keyout nginx/certs/key.pem \
     -out nginx/certs/cert.pem \
     -subj "/CN=your-internal-hostname"
   ```

2. Edit `nginx/nginx.conf` — uncomment the `443 ssl` server block and set `server_name` to your hostname.

3. Optionally uncomment the HTTP→HTTPS redirect in the port 80 block.

4. Update `.env` to use `https://`:
   ```env
   NEXTAUTH_URL=https://your-internal-hostname
   ```

5. Restart Nginx:
   ```bash
   docker compose restart nginx
   ```

---

## Local development

For development you run Next.js directly on your machine and only run the database in Docker.

### 1. Start the database

```bash
docker compose up postgres -d
```

### 2. Configure the app environment

```bash
cp .env.example app/.env
```

Edit `app/.env`:

```env
DATABASE_URL=postgresql://opportunities:changeme@localhost:5432/opportunities
NEXTAUTH_SECRET=any-random-string-for-dev
NEXTAUTH_URL=http://localhost:3000
UPLOAD_DIR=./uploads
ADMIN_EMAIL=admin@dev.local
ADMIN_PASSWORD=change_me
```

### 3. Install dependencies and set up the database

```bash
cd app
npm install
npx prisma db push
npx prisma db seed
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set above.
