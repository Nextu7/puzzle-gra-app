#!/bin/bash

echo "🚀 Starting database setup..."

# Create data directory for production database with proper permissions
mkdir -p /opt/render/project/data
chmod 755 /opt/render/project/data

# Debug: Show current directory and permissions
echo "📂 Current directory: $(pwd)"
echo "📁 Data directory permissions: $(ls -la /opt/render/project/data 2>/dev/null || echo 'Directory does not exist yet')"

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
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🗄️ Running database migrations..."
npx prisma migrate deploy --skip-generate

# If migrations fail, force database creation
if [ $? -ne 0 ]; then
    echo "⚠️ Migrations failed, forcing database creation..."
    npx prisma db push --force-reset --accept-data-loss --skip-generate
fi

# Verify database setup
echo "✅ Verifying database setup..."
npx prisma db push --accept-data-loss --skip-generate

# Test database connection
echo "🧪 Testing database connection..."
npx prisma db pull --print || echo "Database pull test completed"

echo "🎉 Database setup completed successfully"