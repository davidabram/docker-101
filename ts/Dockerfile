FROM oven/bun:1.1.7-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

FROM oven/bun:1.1.7-alpine

RUN apk add --no-cache tini \
    && addgroup -S crocoder \
    && adduser -S crocoder -G crocoder

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --chown=crocoder:crocoder --from=builder /app/node_modules ./node_modules
COPY --chown=crocoder:crocoder --from=builder /app/index.ts ./
COPY --chown=crocoder:crocoder --from=builder /app/package.json ./
COPY --chown=crocoder:crocoder --from=builder /app/bun.lockb ./bun.lockb

USER crocoder

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["bun", "run", "index.ts"]
