# Build from the repo root:  docker build -f apps/sentinel-web/Dockerfile -t linegist .
# Works on amd64 and arm64 (OCI Ampere): the image is built on the machine's own architecture.

FROM node:22-bookworm-slim AS base
WORKDIR /repo

FROM base AS build
# Every workspace needs its package.json present for `npm ci`.
COPY package.json package-lock.json ./
COPY apps/sentinel-web/package.json apps/sentinel-web/
COPY packages/config/package.json packages/config/
COPY packages/db-client/package.json packages/db-client/
COPY packages/detector/package.json packages/detector/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci
COPY apps/sentinel-web apps/sentinel-web
COPY packages/detector packages/detector
ENV NEXT_TELEMETRY_DISABLED=1
# Next inlines NEXT_PUBLIC_* values at BUILD time, so they must be passed as build args, not only at run time.
# The Clerk publishable key is public by design (it ships to browsers); the secret key is runtime-only.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=""
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
RUN npm run build -w @anomaly/sentinel-web

# One-off job image: applies SQL migrations (needs tsx, which the slim runtime does not have).
FROM build AS migrate
WORKDIR /repo/apps/sentinel-web
CMD ["npm", "run", "db:migrate"]

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/sentinel-web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/sentinel-web/.next/static ./apps/sentinel-web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/sentinel-web/server.js"]
