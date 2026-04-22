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
- **Inline hover-edit** — click any field in the modal to edit it in place; changes save immediately
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

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/runberg/opportunities.git
cd opportunities
```

### 2. Create the environment file

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

> On Windows without OpenSSL: run the command inside a Git Bash terminal, or use any password manager to generate a 32+ character random string.

### 3. Build and start

```bash
docker compose up -d --build
```

This will:
- Pull the PostgreSQL image
- Build the Next.js application
- Apply database migrations and create the default admin user
- Start Nginx on port 80

The first build takes a few minutes. Check progress with:

```bash
docker compose logs -f app
```

Wait until you see `✓ Ready` in the app logs.

### 4. Open the app

Navigate to `http://<your-server-ip>` in a browser.

**Default admin credentials:**

| Field | Value |
|---|---|
| Email | `admin@opportunities.local` |
| Password | `admin123` |

> **Change this password immediately** after first login via the profile page (top-right menu → Profile).

### 5. Create user accounts

Go to **Admin → Users** to create accounts for your team. Users need an account to log in — there is no self-registration.

---

## Updating to a new version

```bash
git pull
docker compose up -d --build
```

Database migrations run automatically on startup. Data is stored in a Docker volume (`postgres_data`) and is not affected by rebuilds.

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
