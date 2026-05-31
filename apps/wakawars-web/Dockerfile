# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/wakawars-web/package.json apps/wakawars-web/package.json

RUN bun install

COPY packages/shared packages/shared
COPY apps/wakawars-web apps/wakawars-web

RUN cd packages/shared && bun run build
RUN cd apps/wakawars-web && bun run build

# Runtime stage
FROM nginx:alpine
COPY apps/wakawars-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/wakawars-web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
