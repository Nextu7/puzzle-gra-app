#!/bin/bash

# Create data directory for production database
mkdir -p /opt/render/project/data

# Set production database URL if not set
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:/opt/render/project/data/production.sqlite"
fi

echo "Using DATABASE_URL: $DATABASE_URL"

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

echo "Database setup completed"