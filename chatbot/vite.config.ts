import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 로컬 개발 환경(npm run dev)에서 Vercel 서버리스 함수(/api/chat)를 동일하게 처리할 수 있도록
 * 요청을 가로채 api/chat.ts의 핸들러를 실행해 주는 Vite 플러그인
 */
function localApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/chat' && req.method === 'POST') {
          try {
            // .env.local 변경 사항을 실시간 반영
            const envLocalPath = path.resolve(process.cwd(), '.env.local');
            if (fs.existsSync(envLocalPath)) {
              const content = fs.readFileSync(envLocalPath, 'utf-8');
              const match = content.match(/^\s*OPENAI_API_KEY\s*=\s*(.*?)\s*$/m);
              if (match && match[1]) {
                const parsedKey = match[1].replace(/^["']|["']$/g, '').trim();
                if (parsedKey) {
                  process.env.OPENAI_API_KEY = parsedKey;
                }
              }
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });

            req.on('end', async () => {
              try {
                const body = bodyStr ? JSON.parse(bodyStr) : {};

                // VercelRequest / VercelResponse 인터페이스 호환 객체
                const vercelReq = Object.assign(req, {
                  body,
                  query: {},
                  cookies: {},
                });

                const vercelRes = Object.assign(res, {
                  status(statusCode: number) {
                    res.statusCode = statusCode;
                    return this;
                  },
                  json(data: unknown) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                  send(data: unknown) {
                    res.end(typeof data === 'string' ? data : JSON.stringify(data));
                    return this;
                  },
                });

                // Vite의 ssrLoadModule을 통해 TypeScript 모듈 api/chat.ts를 로드하여 실행
                const chatModule = await server.ssrLoadModule('/api/chat.ts');
                const handler = chatModule.default;
                await handler(vercelReq, vercelRes);
              } catch (handlerError: any) {
                console.error('[Local API] Error handling request:', handlerError);
                res.statusCode = handlerError?.status || 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(
                  JSON.stringify({
                    error: handlerError?.message || '로컬 API 처리 중 오류가 발생했습니다.',
                  })
                );
              }
            });
          } catch (streamError) {
            next(streamError);
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  return {
    plugins: [react(), localApiPlugin()],
  };
});
