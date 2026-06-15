# FlightWoodX 后端镜像（RFC-012 §5.1 A7）
# build context 必须是仓库根（因为依赖 pnpm workspace）：
#   docker build -f apps/api/Dockerfile -t fwx-api .
#
# 单阶段构建：不跨阶段 COPY node_modules，避免 pnpm 的 symlink 在拷贝时断链。
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# 1) 先只拷依赖清单，最大化利用 Docker 层缓存
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/parts-schema/package.json ./packages/parts-schema/

# 2) 只装 api 及其 workspace 依赖的生产依赖
RUN pnpm install --filter api... --prod --frozen-lockfile

# 3) 拷源码（api 运行时不 require parts-schema，但 pnpm 需要它存在以满足 workspace 链接）
COPY packages/parts-schema ./packages/parts-schema
COPY apps/api ./apps/api

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000

# 复用 RFC-012 A4 的健康检查端点
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
