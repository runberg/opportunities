# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Install all dependencies (skip postinstall — prisma generate runs explicitly)
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Generate Prisma client and build Next.js (standalone output)
RUN node_modules/.bin/prisma generate && npm run build

# Compile seed.ts → seed.js so the runner stage needs no ts-node
RUN node_modules/.bin/tsc --target es2017 --module commonjs --esModuleInterop --skipLibCheck prisma/seed.ts

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Next.js standalone server (includes only the runtime node_modules it needs)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma: schema + migrations for migrate deploy, compiled seed, CLI binary
COPY --from=builder /app/prisma/schema.prisma ./prisma/
COPY --from=builder /app/prisma/migrations ./prisma/migrations/
COPY --from=builder /app/prisma/seed.js ./prisma/
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

USER nextjs

# Run migrations, sync admin account, then start the standalone server
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node prisma/seed.js && node server.js"]
