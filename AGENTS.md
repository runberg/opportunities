# Opportunities Project

Read the shared ../AGENTS.md when available. This is the canonical project guide;
the former .claude/CLAUDE.md contained the same guidance and is not required.

## Tech Stack
- Next.js (App Router) with TypeScript
- Prisma ORM with PostgreSQL
- Tailwind CSS
- Zod for validation
- NextAuth for authentication
- Docker (3-container compose: postgres, app, nginx)

## Project Structure
The project is organised as a modular monolith:

- /app/src/modules/opportunities — quotes and EL handling
- /app/src/modules/adhoc-costs — ad hoc costs
- /app/src/modules/inventory — inventory
- /app/src/modules/adhoc — existing ad hoc functionality; inspect its role before changing module boundaries
- /app/src/modules/admin — admin section (users, settings, oversight)
- /app/src/shared/components — reusable UI components only
- /app/src/shared/lib — shared utilities, auth, logging
- /app/src/shared/types — shared TypeScript types

When adding new features, place code in the correct module.
Do not mix module-specific logic into shared areas. Changes to one
module should not require changes inside another module unless the
shared layer itself needs updating.

## Project Conventions
- Logging: always use `writeLog` from `@/shared/lib/system-log` —
  never console.log
- Auth: use `requireSession()` / `requireAdmin()` from
  `@/shared/lib/api` for all protected API routes. Both return a
  discriminated union `{ session, error: null }` or
  `{ session: null, error: NextResponse }` — use the standard
  `if (result.error) return result.error` pattern
- Validation: all API input must be validated with Zod schemas
- API responses: always use NextResponse.json() with appropriate
  status codes
- Database: all queries go through Prisma — no raw SQL unless
  absolutely necessary

## Deployment
- Deployed via Docker Compose (postgres, app, nginx)
- Images published to ghcr.io/runberg/opportunities
- Database data persisted to /srv/docker/opportunities/data/postgres
- Uploads persisted to /srv/docker/opportunities/data/uploads
- Postgres port restricted to localhost in production

## When These Guidelines Conflict
These conventions are meant to support good practice, not override it.
If following any guideline above would block a fix, force a worse
design, or go against general best practice for the situation at
hand, do not silently follow it and do not silently deviate either.
Stop and explain the conflict, then ask how to proceed.

## Local development and validation
- The Next.js application and package.json are in app/. Run npm scripts from app/,
  not from the repository root. Preserve package-lock.json and use npm ci when
  activating the project; do not install dependencies merely to archive it.
- Relevant checks are npm run lint and npm run build from app/. Review the
  project Dockerfiles/Compose manifests before starting services or migrations.
- Prisma migrations, seeds and database changes need an explicitly selected
  development database. Do not use production credentials for local checks.
- Dormant migration data/configuration is in ignored .local-state/ archives.
  Restore only needed data; archives and secret values must never be committed.
- Documentation/ignore-only maintenance requires a diff/path review, not a new
  dependency installation or Docker build.
