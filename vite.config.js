import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves api/*.js (Vercel Functions in production) from the dev server, so
// `npm run dev` can answer /api requests. Each file exports handlers named after
// HTTP methods that take a Request and return a Response.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost')
        const name = pathname.match(/^\/api\/([a-z0-9-]+)$/)?.[1]
        if (!name) return next()
        try {
          const handlers = await server.ssrLoadModule(`/api/${name}.js`)
          const handler = handlers[req.method]
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const headers = Object.entries(req.headers).filter(([, value]) => typeof value === 'string')
          const response = await handler(new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          }))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Server-only secrets from .env.local for the dev API (Vite only exposes
  // VITE_-prefixed variables to the client)
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY ??= env.ANTHROPIC_API_KEY

  return {
    plugins: [react(), devApi()],
    server: {
      host: true, // or '0.0.0.0' to listen on all addresses // Optional: specify a port, default is 5173
    },
    // Strip console.log/debug from production bundles; warn/error stay.
    esbuild: command === 'build' ? { pure: ['console.log', 'console.debug'] } : undefined,
  }
})
