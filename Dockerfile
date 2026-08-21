# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/control-plane/package.json apps/control-plane/
COPY packages/core/package.json packages/core/
COPY packages/adapters/discord/package.json packages/adapters/discord/
COPY packages/adapters/dynamodb/package.json packages/adapters/dynamodb/
COPY packages/adapters/ec2/package.json packages/adapters/ec2/
COPY packages/adapters/s3/package.json packages/adapters/s3/
COPY packages/adapters/minecraft/package.json packages/adapters/minecraft/
COPY infra/package.json infra/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json tsconfig.json ./
COPY apps/control-plane apps/control-plane
COPY packages packages

RUN pnpm --filter @lghs/control-plane... run build \
  && pnpm --filter @lghs/control-plane deploy --prod --legacy /out

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
USER node
CMD ["node", "dist/main.js"]
