FROM node:24.21.0-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66 AS dependencies
WORKDIR /srv/makan
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder
COPY apps/web ./apps/web
ENV API_INTERNAL_URL=http://127.0.0.1:9
RUN npm run build --workspace @makan/web

FROM node:24.21.0-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66 AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /srv/makan
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
        /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg
RUN groupadd --gid 10001 web && useradd --uid 10001 --gid web --no-create-home web
COPY --from=builder --chown=10001:10001 /srv/makan/apps/web/.next/standalone ./
COPY --from=builder --chown=10001:10001 /srv/makan/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=10001:10001 /srv/makan/apps/web/public ./apps/web/public
RUN mkdir -p /srv/makan/apps/web/.next/cache && chown -R 10001:10001 /srv/makan/apps/web/.next/cache
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=6s --start-period=20s --retries=5 CMD ["node","-e","fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/web/server.js"]
