#!/bin/bash

########################################
# DressUp AI - Deployment Verification Script
########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 DressUp AI - Deployment Verification${NC}"
echo "========================================"

# Get deployment URL (first argument or prompt)
if [ -z "$1" ]; then
    echo -n "Enter deployment URL (e.g., https://your-app.vercel.app): "
    read DEPLOYMENT_URL
else
    DEPLOYMENT_URL="$1"
fi

# Remove trailing slash
DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

echo -e "\n${BLUE}Testing deployment: ${NC}$DEPLOYMENT_URL"
echo "=============================================="

# Test health endpoint
echo -e "\n${BLUE}🏥 Testing Health Endpoint${NC}"
echo -n "GET /api/health... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED (HTTP $HEALTH_RESPONSE)${NC}"
fi

# Test detailed health endpoint
echo -n "GET /api/health?detailed=true... "
DETAILED_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health?detailed=true" 2>/dev/null || echo "000")
if [ "$DETAILED_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED (HTTP $DETAILED_HEALTH)${NC}"
fi

# Test main application
echo -e "\n${BLUE}🏠 Testing Main Application${NC}"
echo -n "GET / (main page)... "
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/" 2>/dev/null || echo "000")
if [ "$MAIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED (HTTP $MAIN_RESPONSE)${NC}"
fi

# Test session endpoint
echo -e "\n${BLUE}🔒 Testing Session Management${NC}"
echo -n "POST /api/session... "
SESSION_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/session" 2>/dev/null || echo "000")
if [ "$SESSION_RESPONSE" = "200" ] || [ "$SESSION_RESPONSE" = "201" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED (HTTP $SESSION_RESPONSE)${NC}"
fi

# Test security headers
echo -e "\n${BLUE}🛡️  Testing Security Headers${NC}"
SECURITY_HEADERS=$(curl -s -I "$DEPLOYMENT_URL/" 2>/dev/null || echo "")

echo -n "X-Content-Type-Options... "
if echo "$SECURITY_HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "X-Frame-Options... "
if echo "$SECURITY_HEADERS" | grep -q "X-Frame-Options: DENY"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "Strict-Transport-Security... "
if echo "$SECURITY_HEADERS" | grep -q "Strict-Transport-Security:"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

echo -n "Content-Security-Policy... "
if echo "$SECURITY_HEADERS" | grep -q "Content-Security-Policy:"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
fi

# Test cron job accessibility (should be protected)
echo -e "\n${BLUE}🕒 Testing Cron Job Protection${NC}"
echo -n "GET /api/cron/cleanup (should be protected)... "
CRON_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
if [ "$CRON_RESPONSE" = "401" ] || [ "$CRON_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ OK (Protected)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected response (HTTP $CRON_RESPONSE)${NC}"
fi

# Performance test
echo -e "\n${BLUE}⚡ Testing Performance${NC}"
echo -n "Page load time... "
LOAD_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$DEPLOYMENT_URL/" 2>/dev/null || echo "timeout")
if [ "$LOAD_TIME" != "timeout" ]; then
    if (( $(echo "$LOAD_TIME < 3.0" | bc -l) )); then
        echo -e "${GREEN}✅ ${LOAD_TIME}s (Good)${NC}"
    else
        echo -e "${YELLOW}⚠️  ${LOAD_TIME}s (Slow)${NC}"
    fi
else
    echo -e "${RED}❌ Timeout${NC}"
fi

echo -e "\n${BLUE}📊 Summary${NC}"
echo "=========="

if [ "$HEALTH_RESPONSE" = "200" ] && [ "$MAIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Core functionality: WORKING${NC}"
else
    echo -e "${RED}❌ Core functionality: FAILED${NC}"
fi

echo -e "\n${BLUE}🔗 Manual Testing Checklist:${NC}"
echo "• Visit: $DEPLOYMENT_URL"
echo "• Test image upload (both user photo and garment)"
echo "• Test AI try-on generation (15-30 seconds)"
echo "• Verify mobile interface on phone"
echo "• Test session restoration after page refresh"
echo "• Check browser console for errors"
echo ""
echo -e "${GREEN}✅ Deployment verification complete!${NC}"