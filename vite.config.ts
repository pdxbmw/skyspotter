import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { routeApiRequest } from './proxyHandlers.mjs';

function kidPlaneProxyPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      try {
        const handled = await routeApiRequest(req, res);
        if (!handled) next();
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Proxy error' }));
      }
    });
  };

  return {
    name: 'kidplane-api-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), kidPlaneProxyPlugin()],
});
