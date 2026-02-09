#!/bin/bash

# Test Script for Studio30 Backend Optimizations
# Usage: ./test-server.sh

echo "🧪 Testing Studio30 Backend Optimizations"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2

    echo -n "Testing $name... "

    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /dev/null "$BASE_URL$endpoint")
    status_code=$(echo "$response" | tail -n 2 | head -n 1)
    time_total=$(echo "$response" | tail -n 1)

    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓${NC} (${time_total}s)"
        return 0
    else
        echo -e "${RED}✗${NC} (Status: $status_code)"
        return 1
    fi
}

# Function to test cache
test_cache() {
    local endpoint=$1
    local name=$2

    echo ""
    echo "Testing Cache for $name:"
    echo "------------------------"

    # First request (should be MISS)
    echo -n "  First request (MISS): "
    cache_header=$(curl -s -I "$BASE_URL$endpoint" | grep -i "X-Cache" | cut -d: -f2 | tr -d '[:space:]')
    if [ "$cache_header" = "MISS" ]; then
        echo -e "${GREEN}✓ MISS${NC}"
    else
        echo -e "${YELLOW}⚠ $cache_header${NC}"
    fi

    # Second request (should be HIT)
    sleep 0.5
    echo -n "  Second request (HIT):  "
    cache_header=$(curl -s -I "$BASE_URL$endpoint" | grep -i "X-Cache" | cut -d: -f2 | tr -d '[:space:]')
    if [ "$cache_header" = "HIT" ]; then
        echo -e "${GREEN}✓ HIT${NC}"
    else
        echo -e "${YELLOW}⚠ $cache_header${NC}"
    fi
}

# Function to test compression
test_compression() {
    echo ""
    echo "Testing Compression:"
    echo "-------------------"

    echo -n "  Gzip compression: "
    encoding=$(curl -s -I -H "Accept-Encoding: gzip" "$BASE_URL/api/dashboard/stats" | grep -i "Content-Encoding" | cut -d: -f2 | tr -d '[:space:]')
    if [ "$encoding" = "gzip" ]; then
        echo -e "${GREEN}✓ Enabled${NC}"
    else
        echo -e "${RED}✗ Not enabled${NC}"
    fi
}

# Check if server is running
echo "1. Checking if server is running..."
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo "   Start server with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing Endpoints:"
echo "--------------------"
test_endpoint "/api/dashboard/stats" "Dashboard Stats"
test_endpoint "/api/analytics/summary" "Analytics Summary"
test_endpoint "/api/stock/kpis" "Stock KPIs"
test_endpoint "/api/stock/ranking" "Stock Ranking"
test_endpoint "/api/installments" "Installments"

# Test cache
test_cache "/api/dashboard/stats" "Dashboard"

# Test compression
test_compression

echo ""
echo "3. Performance Summary:"
echo "----------------------"
echo ""

# Benchmark dashboard endpoint
echo "Benchmarking /api/dashboard/stats (5 requests):"
for i in {1..5}; do
    time=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/api/dashboard/stats")
    echo "  Request $i: ${time}s"
done

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Testing Complete!${NC}"
echo ""
echo "For detailed optimization docs, see:"
echo "  server/OPTIMIZATIONS.md"
echo ""
