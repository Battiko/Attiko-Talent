FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/scrapers/package.json ./packages/scrapers/
RUN pnpm install --frozen-lockfile --filter @attiko/api... 2>/dev/null || pnpm install --filter @attiko/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @attiko/shared build 2>/dev/null || true
RUN pnpm --filter @attiko/db build 2>/dev/null || true
RUN pnpm --filter @attiko/scrapers build 2>/dev/null || true
RUN pnpm --filter @attiko/api build
RUN pnpm deploy --filter @attiko/api --prod --legacy /deploy

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy .
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
