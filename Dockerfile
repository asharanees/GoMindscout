# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile || (pnpm approve-builds --all && pnpm install --frozen-lockfile)

ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL=
ENV PORT=20292
ENV BASE_PATH=/
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL
RUN pnpm --filter @workspace/api-server run build
RUN pnpm --filter @workspace/mentorbridge run build

FROM base AS app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app /app
EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]

FROM caddy:2-alpine AS caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/artifacts/mentorbridge/dist/public /srv
