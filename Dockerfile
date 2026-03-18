FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (dev + prod needed for build)
RUN npm install --legacy-peer-deps --no-audit --no-fund --prefer-online

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production --legacy-peer-deps

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
