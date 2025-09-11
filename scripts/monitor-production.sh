#!/bin/bash

########################################
# DressUp AI - Production Monitoring Script
########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_URL="https://dressup-nine.vercel.app"
HEALTH_ENDPOINT="/api/health"
INTERVAL=30 # seconds

# Parse command line arguments
URL=${1:-$DEFAULT_URL}
DETAILED=${2:-false}

if [ "$2" == "--detailed" ] || [ "$2" == "-d" ]; then
    DETAILED=true
fi

echo -e "${BLUE}🔍 DressUp AI Production Monitor${NC}"
echo "=================================="
echo "Monitoring: $URL"
echo "Detailed mode: $DETAILED"
echo "Press Ctrl+C to stop"
echo ""

# Function to check health status
check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local health_url="$URL$HEALTH_ENDPOINT"
    
    if [ "$DETAILED" == "true" ]; then
        health_url="$health_url?detailed=true"
    fi
    
    echo -e "${BLUE}[$timestamp]${NC} Checking health..."
    
    # Make the request and capture both response and HTTP status
    local response=$(curl -s -w "\n%{http_code}" "$health_url" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ $? -eq 0 ] && [ ! -z "$http_code" ]; then
        case $http_code in
            200)
                echo -e "${GREEN}✅ Service Healthy${NC} (HTTP $http_code)"
                ;;
            503)
                echo -e "${RED}❌ Service Unhealthy${NC} (HTTP $http_code)"
                ;;
            429)
                echo -e "${YELLOW}⚠️  Rate Limited${NC} (HTTP $http_code)"
                ;;
            *)
                echo -e "${YELLOW}⚠️  Unexpected Status${NC} (HTTP $http_code)"
                ;;
        esac
        
        # Parse and display key information
        if command -v jq &> /dev/null; then
            local status=$(echo "$body" | jq -r '.status // "unknown"')
            local uptime=$(echo "$body" | jq -r '.uptime // 0')
            
            echo "   Status: $status"
            echo "   Uptime: ${uptime}s"
            
            if [ "$DETAILED" == "true" ]; then
                echo "   Services:"
                echo "     Database: $(echo "$body" | jq -r '.services.database // "unknown"')"
                echo "     Storage:  $(echo "$body" | jq -r '.services.storage // "unknown"')"
                echo "     AI:       $(echo "$body" | jq -r '.services.ai // "unknown"')"
                echo "     Cache:    $(echo "$body" | jq -r '.services.cache // "unknown"')"
                
                local total_sessions=$(echo "$body" | jq -r '.metrics.totalSessions // 0')
                local active_sessions=$(echo "$body" | jq -r '.metrics.activeSessions // 0')
                local error_rate=$(echo "$body" | jq -r '.metrics.errorRate // 0')
                
                echo "   Metrics:"
                echo "     Total Sessions: $total_sessions"
                echo "     Active Sessions: $active_sessions" 
                echo "     Error Rate: ${error_rate}%"
            fi
        else
            # Basic parsing without jq
            echo "   Raw response: $body"
        fi
        
    else
        echo -e "${RED}❌ Connection Failed${NC}"
        echo "   Could not reach $health_url"
    fi
    
    echo ""
}

# Function to run continuous monitoring
monitor_continuously() {
    while true; do
        check_health
        sleep $INTERVAL
    done
}

# Function to run single check
run_single_check() {
    check_health
    
    # Additional endpoint tests for single check
    echo -e "${BLUE}Additional Endpoint Tests:${NC}"
    
    # Test main page
    echo -n "Main page... "
    if curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    # Test API routes (basic connectivity)
    echo -n "API routes... "
    if curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" | grep -q -E "200|503"; then
        echo -e "${GREEN}✅ Accessible${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
}

# Handle command line options
case "${3:-}" in
    "--once"|"-o")
        run_single_check
        exit 0
        ;;
    "--help"|"-h")
        echo "Usage: $0 [URL] [--detailed|-d] [--once|-o|--help|-h]"
        echo ""
        echo "Options:"
        echo "  URL           Production URL (default: $DEFAULT_URL)"
        echo "  --detailed    Show detailed service and metric information"
        echo "  --once        Run single check instead of continuous monitoring"
        echo "  --help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Monitor default URL"
        echo "  $0 https://my-app.vercel.app         # Monitor custom URL"
        echo "  $0 --detailed                       # Detailed monitoring"
        echo "  $0 https://my-app.vercel.app -d -o  # Single detailed check"
        exit 0
        ;;
    *)
        # Default: continuous monitoring
        monitor_continuously
        ;;
esac