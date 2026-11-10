# We Love Cookies admin on your own server (docs/ADMIN-SELF-HOSTED.md). Build from the repository root:
#   docker build -f admin/Dockerfile -t welovecookies-admin .
FROM node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json .npmrc tsconfig.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY admin/src admin/src
COPY src/lib/consent src/lib/consent
RUN npm run admin:node:build

FROM node:24-slim
ENV NODE_ENV=production \
	WLC_DB_PATH=/data/welovecookies.db \
	WLC_HOST=0.0.0.0 \
	PORT=8787
WORKDIR /app
COPY --from=build /src/admin/node-dist admin/node-dist
COPY admin/migrations admin/migrations
COPY dist/welovecookies.min.js dist/welovecookies.min.js
RUN mkdir -p /data && chown node:node /data && chmod 700 /data
USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
	CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/wlc.css').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--disable-warning=ExperimentalWarning", "admin/node-dist/server.mjs"]
