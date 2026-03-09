# Static site with server-side caching

This adds a minimal Node.js static server that serves files from the repository root with sensible caching headers, ETag support, and gzip compression.

Quick start:

```bash
npm install
npm start
```

Server behavior:
- `index.html` (root): `Cache-Control: no-cache, private, max-age=0, must-revalidate` — ensures clients revalidate the entry HTML.
- Other static assets: `Cache-Control: public, max-age=31536000, immutable` — long cache for assets.
- ETag and Last-Modified are enabled (handled by Express static).
- Responses are gzip-compressed via `compression` middleware.

Notes:
- For production, build assets with hashed filenames and keep `Cache-Control` long for those files.
- Consider putting the site behind a CDN (Cloudflare, Fastly, Netlify) for better caching and edge performance.
