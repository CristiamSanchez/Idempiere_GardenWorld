import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function localCorsProxyPlugin(): Plugin {
  return {
    name: 'local-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/local-proxy', async (req, res) => {
        // Handle preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing ?url= query parameter' }));
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            const headers: Record<string, string> = {};

            for (const [k, v] of Object.entries(req.headers)) {
              const lower = k.toLowerCase();
              if (
                lower !== 'host' &&
                lower !== 'origin' &&
                lower !== 'referer' &&
                lower !== 'content-length' &&
                typeof v === 'string'
              ) {
                headers[k] = v;
              }
            }

            try {
              const fetchRes = await fetch(targetUrl, {
                method: req.method,
                headers,
                body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : body,
              });

              res.statusCode = fetchRes.status;
              fetchRes.headers.forEach((v, k) => {
                const lower = k.toLowerCase();
                if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
                  res.setHeader(k, v);
                }
              });
              res.setHeader('Access-Control-Allow-Origin', '*');
              const resBuffer = await fetchRes.arrayBuffer();
              res.end(Buffer.from(resBuffer));
            } catch (fetchErr: any) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Error en Proxy Local al conectar con el servidor iDempiere: ' + fetchErr.message,
                  targetUrl,
                })
              );
            }
          });
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localCorsProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
