#!/bin/sh
set -e

echo "==> Running database migrations..."
npm run db:push 2>&1 || echo "Warning: db:push had issues, continuing..."

echo "==> Starting server..."
exec node dist/index.js
