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
BOLD='\033[1m'
NC='\033[0m'

# Configuration
DEFAULT_INTERVAL=300  # 5 minutes
DEFAULT_LOG_FILE="production-monitoring.log"
WEBHOOK_URL=""
ADMIN_API_KEY=""
DEPLOYMENT_URL=""
CONTINUOUS=false
ALERT_THRESHOLD_ERRORS=10
ALERT_THRESHOLD_RESPONSE_TIME=5000

# Parse command line arguments
show_help() {
    echo "DressUp AI - Production Monitoring Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --url URL                 Deployment URL (required)"
    echo "  --api-key KEY            Admin API key for detailed monitoring"
    echo "  --continuous             Run continuously"
    echo "  --interval SECONDS       Monitoring interval (default: 300)"
    echo "  --webhook URL            Webhook URL for alerts"
    echo "  --log-file FILE          Log file path (default: production-monitoring.log)"
    echo "  --error-threshold N      Alert threshold for errors/hour (default: 10)"
    echo "  --response-threshold MS  Alert threshold for response time (default: 5000)"
    echo "  -h, --help               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --url https://dressup.vercel.app --api-key \$ADMIN_API_KEY"
    echo "  $0 --url https://dressup.vercel.app --continuous --interval 600"
    echo "  $0 --url https://dressup.vercel.app --webhook https://hooks.slack.com/..."
    echo ""
    echo "Environment Variables:"
    echo "  ADMIN_API_KEY           Admin API key (alternative to --api-key)"
    echo "  WEBHOOK_URL             Webhook URL (alternative to --webhook)"
    echo "  DEPLOYMENT_URL          Deployment URL (alternative to --url)"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            DEPLOYMENT_URL="$2"
            shift 2
            ;;
        --api-key)
            ADMIN_API_KEY="$2"
            shift 2
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --interval)
            DEFAULT_INTERVAL="$2"
            shift 2
            ;;
        --webhook)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        --log-file)
            DEFAULT_LOG_FILE="$2"
            shift 2
            ;;
        --error-threshold)
            ALERT_THRESHOLD_ERRORS="$2"
            shift 2
            ;;
        --response-threshold)
            ALERT_THRESHOLD_RESPONSE_TIME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Use environment variables if not set via command line
DEPLOYMENT_URL=${DEPLOYMENT_URL:-$DEPLOYMENT_URL}
ADMIN_API_KEY=${ADMIN_API_KEY:-$ADMIN_API_KEY}
WEBHOOK_URL=${WEBHOOK_URL:-$WEBHOOK_URL}

# Validate required parameters
if [ -z "$DEPLOYMENT_URL" ]; then
    echo -e "${RED}Error: Deployment URL is required${NC}"
    echo "Use --url option or set DEPLOYMENT_URL environment variable"
    exit 1
fi

# Remove trailing slash
DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

# Initialize log file
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$DEFAULT_LOG_FILE"
}

# Send webhook alert
send_alert() {
    local severity="$1"
    local message="$2"
    local details="${3:-}"
    
    if [ -n "$WEBHOOK_URL" ]; then
        local payload="{\"text\":\"🚨 DressUp AI Alert [$severity]: $message\"}"
        if [ -n "$details" ]; then
            payload="{\"text\":\"🚨 DressUp AI Alert [$severity]: $message\", \"details\":\"$details\"}"
        fi
        
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            > /dev/null 2>&1 || true
    fi
    
    log_message "ALERT" "[$severity] $message $details"
}

# Check system health
check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "\n${BLUE}[$timestamp] Health Check${NC}"
    echo "==============================="
    
    # Basic health endpoint
    local start_time=$(date +%s%3N)
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    echo -n "Basic health check... "
    if [ "$health_status" = "200" ]; then
        echo -e "${GREEN}✅ OK (${response_time}ms)${NC}"
        log_message "INFO" "Health check passed: ${response_time}ms"
        
        # Check response time threshold
        if [ "$response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
            send_alert "WARNING" "Slow response time: ${response_time}ms"
        fi
    else
        echo -e "${RED}❌ FAILED (HTTP $health_status)${NC}"
        log_message "ERROR" "Health check failed: HTTP $health_status"
        send_alert "CRITICAL" "Health check failed: HTTP $health_status"
    fi
    
    # Detailed health check
    if [ -n "$ADMIN_API_KEY" ]; then
        echo -n "Detailed monitoring dashboard... "
        local dashboard_response=$(curl -s \
            -H "Authorization: Bearer $ADMIN_API_KEY" \
            "$DEPLOYMENT_URL/api/monitoring/dashboard" 2>/dev/null || echo "{}")
        
        if echo "$dashboard_response" | jq . >/dev/null 2>&1; then
            echo -e "${GREEN}✅ OK${NC}"
            
            # Parse and analyze dashboard data
            analyze_dashboard_data "$dashboard_response"
        else
            echo -e "${RED}❌ FAILED${NC}"
            log_message "ERROR" "Dashboard API failed"
        fi
    else
        echo -e "${YELLOW}Detailed monitoring skipped (no API key)${NC}"
    fi
}

# Analyze dashboard data for alerts
analyze_dashboard_data() {
    local dashboard_data="$1"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}jq not available, skipping detailed analysis${NC}"
        return
    fi
    
    # Check error rates
    local error_count=$(echo "$dashboard_data" | jq -r '.errors.counts.error // 0' 2>/dev/null)
    local warning_count=$(echo "$dashboard_data" | jq -r '.errors.counts.warning // 0' 2>/dev/null)
    local total_errors=$(echo "$dashboard_data" | jq -r '.errors.counts.total // 0' 2>/dev/null)
    
    echo "• Errors: $error_count, Warnings: $warning_count, Total: $total_errors"
    
    if [ "$error_count" -gt "$ALERT_THRESHOLD_ERRORS" ]; then
        send_alert "WARNING" "High error count: $error_count errors"
    fi
    
    # Check system status
    local system_status=$(echo "$dashboard_data" | jq -r '.system.status // "unknown"' 2>/dev/null)
    echo "• System status: $system_status"
    
    if [ "$system_status" != "healthy" ] && [ "$system_status" != "unknown" ]; then
        send_alert "CRITICAL" "System status: $system_status"
    fi
    
    # Check storage health
    local kv_status=$(echo "$dashboard_data" | jq -r '.storage.kv.status // "unknown"' 2>/dev/null)
    echo "• KV storage: $kv_status"
    
    if [ "$kv_status" = "error" ]; then
        send_alert "CRITICAL" "KV storage error"
    fi
    
    # Check active sessions
    local active_sessions=$(echo "$dashboard_data" | jq -r '.sessions.active // 0' 2>/dev/null)
    echo "• Active sessions: $active_sessions"
    
    # Check cleanup metrics
    local last_cleanup=$(echo "$dashboard_data" | jq -r '.cleanup.lastRun // "never"' 2>/dev/null)
    echo "• Last cleanup: $last_cleanup"
    
    if [ "$last_cleanup" = "never" ] || [ "$last_cleanup" = "null" ]; then
        send_alert "WARNING" "Cleanup job never ran"
    else
        # Check if cleanup is recent (within last 30 minutes)
        local cleanup_time=$(date -d "$last_cleanup" +%s 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local time_diff=$((current_time - cleanup_time))
        
        if [ "$time_diff" -gt 1800 ]; then # 30 minutes
            send_alert "WARNING" "Cleanup job stale: last run $last_cleanup"
        fi
    fi
}

# Check specific API endpoints
check_endpoints() {
    echo -e "\n${BLUE}API Endpoint Checks${NC}"
    echo "==================="
    
    # Session endpoint
    echo -n "POST /api/session... "
    local session_status=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        -o /dev/null -w "%{http_code}" \
        "$DEPLOYMENT_URL/api/session" 2>/dev/null || echo "000")
    
    if [ "$session_status" = "200" ] || [ "$session_status" = "201" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED (HTTP $session_status)${NC}"
        send_alert "ERROR" "Session API failed: HTTP $session_status"
    fi
    
    # Check cron endpoint security
    echo -n "GET /api/cron/cleanup (should be protected)... "
    local cron_status=$(curl -s -o /dev/null -w "%{http_code}" \
        "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "000")
    
    if [ "$cron_status" = "401" ] || [ "$cron_status" = "403" ]; then
        echo -e "${GREEN}✅ Protected${NC}"
    else
        echo -e "${RED}❌ Security issue (HTTP $cron_status)${NC}"
        send_alert "CRITICAL" "Cron endpoint security issue: HTTP $cron_status"
    fi
}

# Run cleanup test if admin key is available
test_cleanup() {
    if [ -z "$ADMIN_API_KEY" ]; then
        return
    fi
    
    echo -e "\n${BLUE}Cleanup Test${NC}"
    echo "============"
    
    echo -n "Running cleanup dry-run... "
    local cleanup_response=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_API_KEY" \
        -d '{"dryRun": true}' \
        "$DEPLOYMENT_URL/api/cron/cleanup" 2>/dev/null || echo "{}")
    
    if echo "$cleanup_response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        
        if command -v jq &> /dev/null; then
            local blobs_to_clean=$(echo "$cleanup_response" | jq -r '.deletedBlobs // 0')
            local sessions_to_clean=$(echo "$cleanup_response" | jq -r '.deletedSessions // 0')
            echo "• Blobs pending cleanup: $blobs_to_clean"
            echo "• Sessions pending cleanup: $sessions_to_clean"
            
            log_message "INFO" "Cleanup test: $blobs_to_clean blobs, $sessions_to_clean sessions pending"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
        send_alert "ERROR" "Cleanup test failed"
    fi
}

# Main monitoring function
run_monitoring_cycle() {
    local cycle_start=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "\n${BOLD}${BLUE}🔍 DressUp AI Production Monitoring${NC}"
    echo -e "${BOLD}${BLUE}====================================${NC}"
    echo "Time: $cycle_start"
    echo "URL: $DEPLOYMENT_URL"
    echo "Log: $DEFAULT_LOG_FILE"
    
    log_message "INFO" "Starting monitoring cycle"
    
    check_health
    check_endpoints
    test_cleanup
    
    local cycle_end=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "\n${GREEN}Monitoring cycle completed at $cycle_end${NC}"
    log_message "INFO" "Monitoring cycle completed"
    
    if [ "$CONTINUOUS" = true ]; then
        echo -e "${BLUE}Next check in ${DEFAULT_INTERVAL} seconds...${NC}"
    fi
}

# Signal handlers for graceful shutdown
cleanup_and_exit() {
    echo -e "\n${BLUE}Monitoring stopped by user${NC}"
    log_message "INFO" "Monitoring stopped by user"
    exit 0
}

trap cleanup_and_exit INT TERM

# Main execution
if [ "$CONTINUOUS" = true ]; then
    echo -e "${BLUE}Starting continuous monitoring (Ctrl+C to stop)${NC}"
    log_message "INFO" "Starting continuous monitoring with ${DEFAULT_INTERVAL}s interval"
    
    while true; do
        run_monitoring_cycle
        sleep "$DEFAULT_INTERVAL"
    done
else
    run_monitoring_cycle
    echo -e "\n${GREEN}✅ Monitoring completed successfully${NC}"
fi