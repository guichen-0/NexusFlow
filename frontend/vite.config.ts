import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * AI API 代理插件
 * 将 /api/ai-proxy/* 的请求转发到用户配置的外部 AI API 端点
 * 解决浏览器 CORS 限制
 */
function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', async (req, res) => {
        // 只处理 POST
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        // 从 header 读取目标 API 地址和 Authorization
        const targetBase = req.headers['x-ai-target'] as string
        const authorization = req.headers['x-ai-authorization'] as string

        if (!targetBase) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'Missing X-AI-Target header' } }))
          return
        }

        console.log('[ai-proxy] Target:', targetBase)

        // 读取请求体
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(chunk)
        }
        const body = Buffer.concat(chunks).toString()

        try {
          const cleanBase = targetBase.replace(/\/+$/, '')
          const url = `${cleanBase}/chat/completions`

          console.log('[ai-proxy] Fetching:', url)

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (authorization) {
            headers['Authorization'] = authorization
          }

          const apiRes = await fetch(url, {
            method: 'POST',
            headers,
            body,
          })

          console.log('[ai-proxy] Response status:', apiRes.status)

          // 透传响应头
          const responseHeaders: Record<string, string> = {
            'Content-Type': apiRes.headers.get('Content-Type') || 'application/json',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
          }

          res.writeHead(apiRes.status, responseHeaders)

          // 流式透传（支持 SSE）
          if (apiRes.body) {
            const reader = apiRes.body.getReader()
            const pump = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  res.write(value)
                }
              } catch (writeErr) {
                console.error('[ai-proxy] Stream write error:', writeErr)
              } finally {
                res.end()
              }
            }
            await pump()
          } else {
            const text = await apiRes.text()
            res.end(text)
          }

          console.log('[ai-proxy] Proxy completed successfully')
        } catch (err: unknown) {
          let detail = ''
          if (err instanceof Error) {
            detail = err.message
            // 提取嵌套的 cause 信息（Node.js fetch 经常把原因藏在 cause 里）
            if (err.cause) {
              const cause = err.cause as Error
              detail += ` (${cause.message || cause.code || cause})`
            }
          } else {
            detail = String(err)
          }

          console.error('[ai-proxy] Error:', detail)

          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            error: {
              message: `代理请求失败: ${detail}`,
              hint: '请检查: 1) API Base URL 格式是否正确 2) 网络是否能访问目标地址 3) 查看控制台获取详细错误'
            }
          }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), aiProxyPlugin()],
  server: {
    port: 5173,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    proxy: {
      '/api/backend/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend\/v1/, '/api/v1'),
      },
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
})
