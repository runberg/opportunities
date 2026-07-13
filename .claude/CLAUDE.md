# Opportunities Project

## Tech Stack
- Next.js (App Router) with TypeScript
- Prisma ORM with PostgreSQL
- Tailwind CSS
- Zod for validation
- NextAuth for authentication
- Docker (3-container compose: postgres, app, nginx)

## Project Structure
The project is organised as a modular monolith:

- /src/modules/opportunities — quotes and EL handling
- /src/modules/adhoc-costs — ad hoc costs (in development)
- /src/modules/admin — admin section (users, settings, oversight)
- /src/shared/components — reusable UI components only
- /src/shared/lib — shared utilities, auth, logging
- /src/shared/types — shared TypeScript types

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