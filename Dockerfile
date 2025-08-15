###############################
# Stage 1 – Build
###############################
FROM node:20-alpine AS builder
WORKDIR /app
# Copy workspace files
COPY . .
# Install pnpm and deps offline
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile
# Build TypeScript packages
RUN pnpm build --filter @voice/server

###############################
# Stage 2 – Runtime
###############################
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3030 \
    HOST=0.0.0.0
# Copy built artifacts & node_modules from builder
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/pnpm-lock.yaml ./
EXPOSE 3030
CMD ["node", "packages/server/dist/index.js"]
