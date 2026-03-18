FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./

# Install ALL dependencies (including devDeps — needed for drizzle-kit db:push on startup)
RUN npm install --legacy-peer-deps --no-audit --no-fund --prefer-online

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Create uploads directory for media files
RUN mkdir -p /app/uploads

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

ENTRYPOINT ["/docker-entrypoint.sh"]
