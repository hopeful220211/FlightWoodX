# FlightWoodX 后端镜像（RFC-012 A7 + RFC-014 W9）
# build context 必须是仓库根（依赖 pnpm workspace）：
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
COPY packages/shared/package.json ./packages/shared/

# 2) 装 api 及其 workspace 依赖（含 dev：@fwx/shared 的 tsup 用于构建 CJS）
RUN pnpm install --filter api... --frozen-lockfile

# 3) 拷源码
COPY packages/parts-schema ./packages/parts-schema
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# 4) 构建 @fwx/shared 的 CJS（api 运行时 require @fwx/shared/runtime-cjs 做 IR 校验）
RUN pnpm --filter @fwx/shared build:cjs

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000

# 复用 RFC-012 A4 的健康检查端点
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
