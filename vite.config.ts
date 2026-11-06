import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFile } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'

function pingApiPlugin(): Plugin {
  const handlePingRequest = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/ping')) {
      return next()
    }

    const urlObj = new URL(req.url, 'http://localhost')
    const rawIp = (urlObj.searchParams.get('ip') || '').trim()

    // Remove protocolo e porta caso existam (ex: http://192.168.1.1:8080 -> 192.168.1.1)
    const cleanHost = rawIp
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split(':')[0]
      .trim()

    // Validação estrita de endereço IPv4 ou hostname seguro
    if (!cleanHost || !/^[a-zA-Z0-9.-]+$/.test(cleanHost)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ online: false, error: 'IP inválido' }))
      return
    }

    const isWin = process.platform === 'win32'
    const args = isWin ? ['-n', '1', '-w', '1500', cleanHost] : ['-c', '1', '-W', '2', cleanHost]

    execFile('ping', args, { timeout: 3000 }, (error, stdout) => {
      const output = stdout ? stdout.toString() : ''
      // No Windows/Linux, um ping respondido com sucesso sempre inclui TTL= (ou ttl=)
      const hasTtl = /ttl\s*=/i.test(output)
      const online = !error && hasTtl

      // Extrai o tempo de resposta se disponível (ex: tempo=2ms, tempo<1ms, time=2ms)
      const timeMatch = output.match(/(?:tempo|time)\s*[=<]\s*([0-9]+\s*ms)/i)
      const latency = timeMatch ? timeMatch[1].replace(/\s+/g, '') : undefined

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ online, ip: cleanHost, latency }))
    })
  }

  return {
    name: 'vite-plugin-ping-api',
    configureServer(server) {
      server.middlewares.use(handlePingRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handlePingRequest)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pingApiPlugin()],
})
