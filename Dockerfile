# Stage 1: Base stage with Playwright and Node.js
FROM mcr.microsoft.com/playwright:v1.49.0-noble AS base

# Install pnpm globally
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.5.0

WORKDIR /app

# Stage 2: Install dependencies and build compiled packages
FROM base AS builder

# Copy workspace and package configurations first for caching layer optimization
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY drizzle/package.json ./drizzle/
COPY scripts/package.json ./scripts/
COPY shared/api-client-react/package.json ./shared/api-client-react/
COPY shared/api-zod/package.json ./shared/api-zod/
COPY shared/core/package.json ./shared/core/

# Install all dependencies (including devDependencies)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Run production build compilation for the server
RUN pnpm --filter @omnibid/server build

# Stage 3: Install ONLY production dependencies to keep the runner image lightweight
FROM base AS production-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY drizzle/package.json ./drizzle/
COPY scripts/package.json ./scripts/
COPY shared/api-client-react/package.json ./shared/api-client-react/
COPY shared/api-zod/package.json ./shared/api-zod/
COPY shared/core/package.json ./shared/core/

# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

# Stage 4: Execution runner stage
FROM mcr.microsoft.com/playwright:v1.49.0-noble AS runner

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Install pnpm globally in runner stage
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.5.0

WORKDIR /app

# Copy production node_modules & workspace dependencies
COPY --from=production-deps /app /app

# Copy build artifacts and package sources (required for unbundled workspace resolutions)
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/shared ./shared

# Startup command
CMD ["pnpm", "--filter", "@omnibid/server", "start"]
