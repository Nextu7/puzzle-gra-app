#!/bin/bash

# Health Check Script for Puzzle Game App
# Usage: ./scripts/check-health.sh [URL]

APP_URL=${1:-"https://puzzle-gra-app.onrender.com"}

echo "🔍 Checking health of Puzzle Game App at: $APP_URL"
echo "================================================="

# Check health endpoint
echo "📊 Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" "$APP_URL/api/health")
HTTP_STATUS=$(echo $HEALTH_RESPONSE | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check: PASSED"
    echo $HEALTH_RESPONSE | sed 's/HTTP_STATUS:[0-9]*//' | jq '.'
else
    echo "❌ Health check: FAILED (HTTP $HTTP_STATUS)"
    echo $HEALTH_RESPONSE | sed 's/HTTP_STATUS:[0-9]*//'
fi

echo ""

# Check if main app loads
echo "🌐 Checking main application..."
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")

if [ "$MAIN_RESPONSE" = "200" ] || [ "$MAIN_RESPONSE" = "302" ]; then
    echo "✅ Main app: ACCESSIBLE (HTTP $MAIN_RESPONSE)"
else
    echo "❌ Main app: NOT ACCESSIBLE (HTTP $MAIN_RESPONSE)"
fi

echo ""

# Check database connectivity by attempting to access a simple API
echo "🗄️  Checking database connectivity..."
DB_CHECK=$(curl -s -w "HTTP_STATUS:%{http_code}" "$APP_URL/api/puzzle-config?productId=test")
DB_HTTP_STATUS=$(echo $DB_CHECK | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$DB_HTTP_STATUS" = "200" ] || [ "$DB_HTTP_STATUS" = "401" ] || [ "$DB_HTTP_STATUS" = "400" ]; then
    echo "✅ Database: CONNECTED (API responding)"
else
    echo "❌ Database: CONNECTION ISSUES (HTTP $DB_HTTP_STATUS)"
fi

echo ""
echo "================================================="
echo "Health check completed!"

# Return appropriate exit code
if [ "$HTTP_STATUS" = "200" ] && ([ "$MAIN_RESPONSE" = "200" ] || [ "$MAIN_RESPONSE" = "302" ]); then
    echo "🎉 Overall status: HEALTHY"
    exit 0
else
    echo "⚠️  Overall status: NEEDS ATTENTION"
    exit 1
fi