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

