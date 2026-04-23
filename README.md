# Opportunities

Internal sales pipeline tracker — follows an opportunity from the first RFQ through quoting, engagement letters, and into production.

Built for small teams on a private network. All data stays on your own server.

## Features

### Pipeline views
- **Quotes** — track opportunities from RFQ Received → Quote Sent
- **Engagement Letters** — dedicated EL view: EL Requested → Draft Shared → Signed Shared → Countersigned
- **Production** — track progress from Pending Advance Payment → In Production → Delivered, with per-row phase indicators (Adv. Payment, FAT, SAT)

### Opportunity workflow
- **Modal-based editing** — create, view, and edit opportunities in a slide-over modal without leaving the list
- **Always-editable fields** — click any field to edit it; an "Apply Changes" bar appears when there are unsaved changes
- **One-click status transitions** — Quote Accepted promotes to EL flow; EL Countersigned promotes to Production
- **Document management** — upload and download quote and EL documents per opportunity

### Dashboard
- **Pipeline snapshot** — live counts per status across all three pipeline stages; click any number to drill into that cohort
- **Quote Activity** — RFQs Received, Quotes Shared, avg days to quote; trend chart by period
- **EL Activity** — ELs Requested, Drafts Shared, Signed Shared, avg days EL requested → signed; trend chart
- **Production Activity** — Countersigned, Advance Payments, FAT Passed, Delivered; trend chart
- **Drill-down tables** — clicking any KPI or chart bar opens a filtered table showing the relevant date column
- **Configurable period** — 7 days / 30 days / 90 days / year-to-date / custom date range

### Data management
- **Audit log** — every status change, field edit, document upload and deletion is captured as a system event with actor and timestamp; user comments sit alongside system events in the same timeline
- **Column sorting** — all tables across the app support click-to-sort on every column header
- **Full-text search** — search by title, customer, internal ID, or reference number
- **Status + pending filters** — multi-select status filter and waiting-on filter on all list views
- **CSV export** — export filtered results from any list view or drill-down modal

### Administration
- **User management** — admin can create/edit users and assign roles (Admin / User)
- **Bulk delete** — admin can select and permanently delete opportunities

### UI
- **Light / Dark theme** — UniFi-inspired UI with a persistent theme toggle in the sidebar

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
- Git

#### 1. Clone the repository

```bash
git clone https://github.com/runberg/opportunities.git
cd opportunities
```

#### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# Database credentials — choose any strong password
POSTGRES_USER=opportunities
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_DB=opportunities

# Auth secret — generate a random value with the command below
NEXTAUTH_SECRET=replace_with_random_secret

# The URL users will use to reach the app
# Use your server's IP or hostname for internal deployment
NEXTAUTH_URL=http://192.168.1.100
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

> On Windows without OpenSSL: run this inside a Git Bash terminal, or use any password manager to generate a 32+ character random string.

#### 3. Start

```bash
docker compose up -d
```

This pulls the pre-built app image from `ghcr.io`, starts PostgreSQL and Nginx, applies database migrations, and creates the default admin user. Check progress with:

```bash
docker compose logs -f app
```

Wait until you see `✓ Ready` in the app logs.

#### 4. Open the app

Navigate to `http://<your-server-ip>` in a browser.

**Default admin credentials:**

| Field | Value |
|---|---|
| Email | `admin@opportunities.local` |
| Password | `admin123` |

> **Change this password immediately** after first login via the profile page (top-right menu → Profile).

#### 5. Create user accounts

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
.env                  ← create from .env.example and fill in values
nginx/nginx.conf
nginx/certs/          ← required directory, can be empty unless using HTTPS
```

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

Database migrations and the default admin user are created automatically on first start.

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

Open [http://localhost:3000](http://localhost:3000). Use the same default admin credentials as above.
