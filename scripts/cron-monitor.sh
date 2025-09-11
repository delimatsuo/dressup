#!/bin/bash

########################################
# DressUp AI - Cron Job Monitoring Script
########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
DEPLOYMENT_URL=""
ADMIN_API_KEY=""
CONTINUOUS=false
INTERVAL=300 # 5 minutes default
WEBHOOK_URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            DEPLOYMENT_URL="$2"
            shift 2
            ;;
        --key)
            ADMIN_API_KEY="$2"
            shift 2
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --webhook)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --url URL           Deployment URL"
            echo "  --key KEY           Admin API key"
            echo "  --continuous        Run continuously"
            echo "  --interval SECONDS  Monitoring interval (default: 300)"
            echo "  --webhook URL       Webhook for alerts"
            echo "  -h, --help          Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 --url https://app.vercel.app --key \$ADMIN_API_KEY"
            echo "  $0 --url https://app.vercel.app --continuous --interval 600"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get URL if not provided
if [ -z "$DEPLOYMENT_URL" ]; then
    echo -n "Enter deployment URL: "
    read DEPLOYMENT_URL
fi

# Get API key if not provided
if [ -z "$ADMIN_API_KEY" ]; then
    echo -n "Enter ADMIN_API_KEY (optional): "
    read -s ADMIN_API_KEY
    echo
fi

DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

echo -e "${BLUE}🕒 DressUp AI - Cron Job Monitoring${NC}"
echo "===================================="
echo "URL: $DEPLOYMENT_URL"
echo "Continuous: $CONTINUOUS"
if [ "$CONTINUOUS" = true ]; then
    echo "Interval: ${INTERVAL}s"
fi
echo ""

# Function to send webhook alert
send_alert() {
    local message="$1"
    local severity="$2"
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 DressUp AI Alert: $message\", \"severity\":\"$severity\"}" \
            > /dev/null 2>&1
    fi
}

# Function to check cron health
check_cron_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "\n${BLUE}[$timestamp] Checking cron job health...${NC}"
    
    # Check if API key is available for detailed checks
    if [ -n "$ADMIN_API_KEY" ]; then
        echo -n "Getting cleanup metrics... "
        
        local response_file="/tmp/cron_metrics_$$"
        local http_code=$(curl -s \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_API_KEY" \
            -d '{"dryRun": true}' \
            -w "%{http_code}" \
            -o "$response_file" \
            "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
        
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✅ OK${NC}"
            
            # Parse and display metrics
            if command -v jq &> /dev/null; then
                local deleted_blobs=$(cat "$response_file" | jq -r '.deletedBlobs // 0' 2>/dev/null)
                local deleted_sessions=$(cat "$response_file" | jq -r '.deletedSessions // 0' 2>/dev/null)
                
                echo "  • Blobs to cleanup: $deleted_blobs"
                echo "  • Sessions to cleanup: $deleted_sessions"
                
                # Alert if too many items need cleanup
                if [ "$deleted_blobs" -gt 100 ] || [ "$deleted_sessions" -gt 50 ]; then
                    echo -e "${YELLOW}  ⚠️  High cleanup volume detected${NC}"
                    send_alert "High cleanup volume: $deleted_blobs blobs, $deleted_sessions sessions" "warning"
                fi
            fi
        else
            echo -e "${RED}❌ FAIL (HTTP $http_code)${NC}"
            send_alert "Cron metrics check failed: HTTP $http_code" "error"
        fi
        
        rm -f "$response_file"
    else
        echo -e "${YELLOW}Skipping detailed checks (no API key)${NC}"
    fi
    
    # Check general health
    echo -n "Checking system health... "
    local health_response=$(curl -s "$DEPLOYMENT_URL/api/health?detailed=true" 2>/dev/null || echo "{}")
    
    if echo "$health_response" | grep -q '"status".*"ok"'; then
        echo -e "${GREEN}✅ OK${NC}"
        
        # Check specific components
        if echo "$health_response" | grep -q '"kv".*"ok"'; then
            echo "  • KV store: OK"
        else
            echo -e "  • KV store: ${RED}ERROR${NC}"
            send_alert "KV store health check failed" "error"
        fi
        
        if echo "$health_response" | grep -q '"blob".*"ok"'; then
            echo "  • Blob storage: OK"
        else
            echo -e "  • Blob storage: ${RED}ERROR${NC}"
            send_alert "Blob storage health check failed" "error"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        send_alert "System health check failed" "error"
    fi
    
    # Check cron endpoint security
    echo -n "Verifying cron endpoint security... "
    local cron_code=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
    if [ "$cron_code" = "401" ] || [ "$cron_code" = "403" ]; then
        echo -e "${GREEN}✅ Protected${NC}"
    else
        echo -e "${RED}❌ Exposed (HTTP $cron_code)${NC}"
        send_alert "Cron endpoint security issue: HTTP $cron_code" "critical"
    fi
    
    echo -e "${BLUE}Health check completed${NC}"
}

# Function to monitor Vercel logs
monitor_vercel_logs() {
    if command -v vercel &> /dev/null; then
        echo -e "\n${BLUE}Recent cron job logs:${NC}"
        vercel logs --grep="/api/cron/cleanup" --limit 5 2>/dev/null || echo "No logs available or Vercel CLI not logged in"
    fi
}

# Function to get cleanup statistics
get_cleanup_stats() {
    if [ -n "$ADMIN_API_KEY" ] && command -v jq &> /dev/null; then
        echo -e "\n${BLUE}Cleanup Statistics (last 24 hours):${NC}"
        
        # This would need to be implemented in the API to return historical data
        # For now, just show the current metrics
        local response=$(curl -s \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_API_KEY" \
            -d '{"dryRun": true}' \
            "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "{}")
        
        if echo "$response" | jq . > /dev/null 2>&1; then
            echo "Current pending cleanup:"
            echo "$response" | jq -r '
                "• Blobs: " + (.deletedBlobs // 0 | tostring) + 
                " | Sessions: " + (.deletedSessions // 0 | tostring)
            ' 2>/dev/null || echo "Unable to parse metrics"
        fi
    fi
}

# Main monitoring function
run_monitoring() {
    check_cron_health
    monitor_vercel_logs
    get_cleanup_stats
    
    if [ "$CONTINUOUS" = true ]; then
        echo -e "\n${BLUE}Next check in ${INTERVAL}s...${NC}"
        sleep "$INTERVAL"
    fi
}

# Main execution
if [ "$CONTINUOUS" = true ]; then
    echo "Starting continuous monitoring (Ctrl+C to stop)..."
    
    # Trap Ctrl+C
    trap 'echo -e "\n${BLUE}Stopping monitoring...${NC}"; exit 0' INT
    
    while true; do
        run_monitoring
    done
else
    run_monitoring
    echo -e "\n${GREEN}✅ Monitoring complete!${NC}"
fi