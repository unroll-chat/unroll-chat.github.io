import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  plugins: [
    tailwindcss(),
    {
      name: 'unroll-dev-proxy',
      configureServer(server) {
        // Dev proxy: fetches share pages server-side (like curl).
        // No CORS issues because the Vite server makes the request.
        server.middlewares.use('/api/fetch', async (req, res) => {
          const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
          const target = url.searchParams.get('url');

          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
            return;
          }

          try {
            const response = await fetch(target, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
              redirect: 'follow',
            });

            if (!response.ok) {
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'text/plain');
              res.end(`Upstream returned ${response.status}`);
              return;
            }

            const html = await response.text();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(html);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Fetch failed: ${msg}`);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
