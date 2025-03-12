---
author: David
date: Mar 12, 2025
paging: Page %d of %d
---

```
 _____   ____   _____ _  ________ _____    __  ___  __
|  __ \ / __ \ / ____| |/ /  ____|  __ \  /_ |/ _ \/_ |
| |  | | |  | | |    | ' /| |__  | |__) |  | | | | || |
| |  | | |  | | |    |  < |  __| |  _  /   | | | | || |
| |__| | |__| | |____| . \| |____| | \ \   | | |_| || |
|_____/ \____/ \_____|_|\_\______|_|  \_\  |_|\___/ |_|

```


## Content:
- Basic Dockerfile setup for Bun
- Handling dependencies and frozen lockfiles
- Multi-stage builds to reduce image size
- Adding non-root users for improved security
- Using tini for better process management
- Implementing health checks for better monitoring
- Setting environment-specific configurations (e.g., production)

---

## TS Bun App

```ts
import { Hono } from 'hono';
import { serve } from 'bun';

const app = new Hono();

app.get('/health', (c) => c.text('OK'));

app.get('/', (c) => c.text('Hello from Hono!'));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const server = serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running on http://localhost:${port}`);

const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.stop();

  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('Server closed.');
  process.exit(0);
};

['SIGTERM', 'SIGHUP', 'SIGINT'].forEach((signal) => {
  process.on(signal as NodeJS.Signals, () => shutdown(signal));
});
```
---

## Basic Setup

```dockerfile
FROM oven/bun  # Uses the official Bun image as the base

WORKDIR /app # Sets the working dir

COPY . . # Copies the entire project

RUN bun install

EXPOSE 3000 # Exposes port 3000 to access the app

CMD ["bun", "run", "index.ts"] # Specifies the command to run the app
```

---

## Don't COPY everything

```dockerfile
COPY package.json bun.lockb* ./  # Copies the lock files before installing dependencies to optimize caching

RUN bun install --frozen-lockfile || true  # Ensures dependencies are installed with an exact match from the lock file

COPY . .  # Copies the rest of the project files

RUN bun install  # Installs the required dependencies again
```

---

## Fix the version of the image

```dockerfile
FROM oven/bun:1.1.7-alpine  # Uses a specific version of Bun (1.1.7) with Alpine Linux
```

---

## Multi-stage Build

```dockerfile
FROM oven/bun:1.1.7-alpine AS builder  # Sets up the builder stage with Bun version 1.1.7-alpine

WORKDIR /app

COPY package.json bun.lockb ./  # Copies package.json and bun.lockb files to the container

RUN bun install --frozen-lockfile || true  # Installs dependencies using the lock file

COPY . .  # Copies the rest of the project files

# Let's set a production stage

FROM oven/bun:1.1.7-alpine  # Starts a new image for the final stage with the same Bun version

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules  # Copies node_modules from the builder stage

COPY --from=builder /app/index.ts ./  # Copies index.ts from the builder stage

COPY --from=builder /app/package.json ./  # Copies package.json from the builder stage

COPY --from=builder /app/bun.lockb ./bun.lockb  # Copies bun.lockb from the builder stage

EXPOSE 3000  # Exposes port 3000 to access the app

CMD ["bun", "run", "index.ts"]  # Specifies the command to run the app
```

---

## Add a Non-Root User

```dockerfile
RUN addgroup -S crocoder \  # Creates a new group named "crocoder"
      && adduser -S crocoder -G crocoder  # Creates a new user named "crocoder" and adds them to the group

COPY --chown=crocoder:crocoder --from=builder /app/node_modules ./node_modules  # Copies node_modules from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/index.ts ./  # Copies index.ts from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/package.json ./  # Copies package.json from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/bun.lockb ./bun.lockb  # Copies bun.lockb from the builder stage with proper ownership

USER crocoder  # Switches to the "crocoder" user for security reasons
```

---

## Better Signal Handling

```dockerfile
RUN apk add --no-cache tini  # Installs tini for better process management

ENTRYPOINT ["/sbin/tini", "--"]  # Uses tini to handle processes properly

CMD ["bun", "run", "index.ts"]  # Specifies the command to run the app
```

---

## Adding Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \  # Defines the health check parameters
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1  # Health check to verify if the app is responsive
```

---

## Production Environment

```dockerfile
FROM oven/bun:1.1.7-alpine AS builder  # Sets up the builder stage with Bun version 1.1.7-alpine

WORKDIR /app  # Sets the working directory to /app

COPY package.json bun.lockb ./  # Copies package.json and bun.lockb files to the container

RUN bun install --frozen-lockfile  # Installs dependencies using the lock file

COPY . .  # Copies the rest of the project files

FROM oven/bun:1.1.7-alpine  # Starts a new image for the final stage with the same Bun version

RUN apk add --no-cache tini \  # Installs tini for better process management
    && addgroup -S crocoder \  # Creates a new group named "crocoder"
    && adduser -S crocoder -G crocoder  # Creates a new user named "crocoder" and adds them to the group

ENV NODE_ENV=production  # Sets the environment to production for optimizations

WORKDIR /app  # Sets the working directory inside the container

COPY --chown=crocoder:crocoder --from=builder /app/node_modules ./node_modules  # Copies node_modules from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/index.ts ./  # Copies index.ts from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/package.json ./  # Copies package.json from the builder stage with proper ownership

COPY --chown=crocoder:crocoder --from=builder /app/bun.lockb ./bun.lockb  # Copies bun.lockb from the builder stage with proper ownership

USER crocoder  # Switches to the "crocoder" user for security reasons

EXPOSE 3000  # Exposes port 3000 to access the app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \  # Defines the health check parameters
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1  # Health check to verify if the app is responsive

ENTRYPOINT ["/sbin/tini", "--"]  # Uses tini to handle processes properly

CMD ["bun", "run", "index.ts"]  # Specifies the command to run the app
```
