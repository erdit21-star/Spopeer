# ── Stage 1: install production deps ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json* ./server/
RUN npm ci --omit=dev && cd server && npm ci --omit=dev

# ── Stage 2: runtime ──
FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY public ./public
COPY server ./server
COPY package.json ./

RUN addgroup -S spopeer && adduser -S spopeer -G spopeer \
    && mkdir -p server/uploads server/logs \
    && chown -R spopeer:spopeer /app

USER spopeer
ENV NODE_ENV=production
EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/server.js"]
