import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local plugin to proxy cross-origin images for PDF generation
function imageProxyPlugin() {
  return {
    name: 'image-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/image-proxy', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url, 'http://localhost');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          
          const response = await fetch(targetUrl);
          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Upstream error: ${response.statusText}`);
            return;
          }

          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const buffer = await response.arrayBuffer();

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(Buffer.from(buffer));
        } catch (err) {
          res.statusCode = 500;
          res.end(err.message || 'Error fetching image');
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), imageProxyPlugin()],
  server: {
    host: true, // Listen on all local IPs
    proxy: {
      '/google-maps': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-maps/, '')
      }
    }
  }
})
