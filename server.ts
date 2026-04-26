import { serve } from 'bun'
import { join } from 'node:path'
// @ts-ignore - file produced by `vite build`; may not exist before first build
import handler from './dist/server/server.js'

const PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIR = './dist/client'

serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== '/') {
      const file = Bun.file(join(CLIENT_DIR, url.pathname))
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
        })
      }
    }
    return handler.fetch(request)
  },
})

console.log(`server running on http://localhost:${PORT}`)
