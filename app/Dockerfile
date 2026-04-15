FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Run migrations, then seed (idempotent), then start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed 2>/dev/null || true && npm start"]
