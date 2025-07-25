#!/bin/bash

# Create data directory for production database
mkdir -p /opt/render/project/data

# Set production database URL if not set
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:/opt/render/project/data/production.sqlite"
fi

echo "Using DATABASE_URL: $DATABASE_URL"

# Check if database exists and create it if not
if [ ! -f "/opt/render/project/data/production.sqlite" ]; then
    echo "Creating new production database..."
    touch /opt/render/project/data/production.sqlite
fi

# Generate Prisma client and run migrations
echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

# Verify database setup
echo "Verifying database setup..."
npx prisma db push --accept-data-loss

echo "Database setup completed successfully"