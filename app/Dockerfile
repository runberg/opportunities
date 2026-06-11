FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Install dependencies (skip postinstall — prisma generate runs explicitly below)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Generate Prisma client, build Next.js, create uploads directory
RUN npx prisma generate && npm run build && mkdir -p /app/uploads

# Transfer ownership to non-root user before dropping privileges
RUN chown -R nextjs:nodejs /app

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

USER nextjs

# Run migrations, sync admin account from env, then start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
