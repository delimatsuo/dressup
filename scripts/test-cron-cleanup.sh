#!/bin/bash

########################################
# DressUp AI - Cron Job Testing Script
########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🕒 DressUp AI - Cron Job Testing${NC}"
echo "================================="

# Get deployment URL and admin API key
if [ -z "$1" ]; then
    echo -n "Enter deployment URL (e.g., https://your-app.vercel.app): "
    read DEPLOYMENT_URL
else
    DEPLOYMENT_URL="$1"
fi

if [ -z "$2" ]; then
    echo -n "Enter ADMIN_API_KEY (or press Enter to skip authenticated tests): "
    read -s ADMIN_API_KEY
    echo
else
    ADMIN_API_KEY="$2"
fi

# Remove trailing slash
DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

echo -e "\n${BLUE}Testing cron endpoint: ${NC}$DEPLOYMENT_URL/api/cron/cleanup"
echo "======================================================="

# Test 1: Unauthenticated GET request (should fail)
echo -e "\n${BLUE}Test 1: Unauthenticated GET request${NC}"
echo -n "GET /api/cron/cleanup (should return 401 or 403)... "
UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
if [ "$UNAUTH_RESPONSE" = "401" ] || [ "$UNAUTH_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✅ PASS (HTTP $UNAUTH_RESPONSE)${NC}"
else
    echo -e "${RED}❌ FAIL (HTTP $UNAUTH_RESPONSE - should be 401 or 403)${NC}"
fi

# Test 2: Check Vercel cron configuration
echo -e "\n${BLUE}Test 2: Vercel Configuration${NC}"
if [ -f "vercel.json" ]; then
    echo -n "Checking vercel.json cron configuration... "
    if grep -q "*/15 \* \* \* \*" vercel.json; then
        echo -e "${GREEN}✅ PASS (15-minute schedule configured)${NC}"
    else
        echo -e "${RED}❌ FAIL (cron schedule not found in vercel.json)${NC}"
    fi
    
    echo -n "Checking cleanup function runtime... "
    if grep -q "nodejs20.x" vercel.json; then
        echo -e "${GREEN}✅ PASS (Node.js runtime configured)${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js runtime not explicitly configured${NC}"
    fi
else
    echo -e "${RED}❌ vercel.json not found${NC}"
fi

# Test 3: Environment variable check
echo -e "\n${BLUE}Test 3: Environment Variables${NC}"
echo -n "CRON_SECRET configured... "
if [ -n "$CRON_SECRET" ] || [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ ASSUMED (check Vercel dashboard)${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot verify locally${NC}"
fi

# Test 4: Manual cleanup with admin key (if provided)
if [ -n "$ADMIN_API_KEY" ]; then
    echo -e "\n${BLUE}Test 4: Authenticated Manual Cleanup${NC}"
    
    # Dry run first
    echo -n "POST /api/cron/cleanup (dry run)... "
    DRY_RUN_RESPONSE=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_API_KEY" \
        -d '{"dryRun": true}' \
        -w "%{http_code}" \
        -o /tmp/dryrun_response.json \
        "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
    
    if [ "$DRY_RUN_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        
        # Show dry run results
        if [ -f "/tmp/dryrun_response.json" ]; then
            echo -e "${BLUE}Dry run results:${NC}"
            cat /tmp/dryrun_response.json | jq . 2>/dev/null || cat /tmp/dryrun_response.json
            echo ""
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $DRY_RUN_RESPONSE)${NC}"
    fi
    
    # Ask for actual cleanup
    echo -n "Run actual cleanup? (y/N): "
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -n "POST /api/cron/cleanup (actual)... "
        CLEANUP_RESPONSE=$(curl -s \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_API_KEY" \
            -d '{"cleanupBlobs": true, "cleanupSessions": true}' \
            -w "%{http_code}" \
            -o /tmp/cleanup_response.json \
            "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
        
        if [ "$CLEANUP_RESPONSE" = "200" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            
            # Show cleanup results
            if [ -f "/tmp/cleanup_response.json" ]; then
                echo -e "${BLUE}Cleanup results:${NC}"
                cat /tmp/cleanup_response.json | jq . 2>/dev/null || cat /tmp/cleanup_response.json
                echo ""
            fi
        else
            echo -e "${RED}❌ FAIL (HTTP $CLEANUP_RESPONSE)${NC}"
        fi
    fi
else
    echo -e "\n${BLUE}Test 4: Skipped (no ADMIN_API_KEY provided)${NC}"
fi

# Test 5: Health check for KV connection
echo -e "\n${BLUE}Test 5: KV Store Health${NC}"
echo -n "GET /api/health?detailed=true (KV connection)... "
HEALTH_RESPONSE=$(curl -s "$DEPLOYMENT_URL/api/health?detailed=true" 2>/dev/null || echo "{}")
if echo "$HEALTH_RESPONSE" | grep -q '"kv".*"ok"'; then
    echo -e "${GREEN}✅ PASS (KV connection healthy)${NC}"
elif echo "$HEALTH_RESPONSE" | grep -q '"kv"'; then
    echo -e "${YELLOW}⚠️  KV status unclear${NC}"
else
    echo -e "${RED}❌ FAIL (no KV status in health check)${NC}"
fi

# Test 6: Blob storage health
echo -n "Blob storage connectivity... "
if echo "$HEALTH_RESPONSE" | grep -q '"blob".*"ok"'; then
    echo -e "${GREEN}✅ PASS (Blob storage healthy)${NC}"
elif echo "$HEALTH_RESPONSE" | grep -q '"blob"'; then
    echo -e "${YELLOW}⚠️  Blob status unclear${NC}"
else
    echo -e "${RED}❌ FAIL (no blob status in health check)${NC}"
fi

# Clean up temp files
rm -f /tmp/dryrun_response.json /tmp/cleanup_response.json

echo -e "\n${BLUE}📋 Cron Job Configuration Summary${NC}"
echo "=================================="
echo "• Schedule: Every 15 minutes (*/15 * * * *)"
echo "• Endpoint: /api/cron/cleanup"
echo "• Runtime: Node.js 20.x"
echo "• Authentication: CRON_SECRET (Vercel header)"
echo "• Manual trigger: POST with ADMIN_API_KEY"
echo ""

echo -e "${BLUE}🔍 Vercel Dashboard Checklist:${NC}"
echo "• Cron jobs enabled in project settings"
echo "• CRON_SECRET environment variable set"
echo "• ADMIN_API_KEY environment variable set (for manual triggers)"
echo "• Function logs show cron executions every 15 minutes"
echo ""

echo -e "${BLUE}📊 Monitoring Commands:${NC}"
echo "# Check cron logs"
echo "vercel logs --grep='/api/cron/cleanup'"
echo ""
echo "# Monitor cleanup metrics"
echo "curl -H 'Authorization: Bearer \$ADMIN_API_KEY' \\"
echo "     '$DEPLOYMENT_URL/api/cron/cleanup' \\"
echo "     -X POST -d '{\"dryRun\": true}'"
echo ""

echo -e "${GREEN}✅ Cron job testing complete!${NC}"