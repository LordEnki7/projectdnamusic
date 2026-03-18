FROM node:20-alpine AS base
WORKDIR /app

# Override .npmrc to ensure clean install in Docker
RUN echo "prefer-offline=false" > .npmrc && \
    echo "legacy-peer-deps=true" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "audit=false" >> .npmrc

COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

FROM base AS builder
WORKDIR /app

# Accept Vite env vars as build args so frontend gets them embedded
ARG VITE_STRIPE_PUBLIC_KEY
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Override .npmrc for production install
RUN echo "prefer-offline=false" > .npmrc && \
    echo "legacy-peer-deps=true" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "audit=false" >> .npmrc

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

RUN mkdir -p /app/uploads

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
