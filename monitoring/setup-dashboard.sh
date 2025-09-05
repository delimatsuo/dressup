#!/bin/bash

# DressUp AI - Cloud Monitoring Dashboard Setup Script
# Creates a comprehensive monitoring dashboard for application health and performance

set -e  # Exit on any error

PROJECT_ID="project-friday-471118"
DASHBOARD_NAME="DressUp AI - Application Monitoring"
DASHBOARD_CONFIG="dashboard-config.json"

echo "📊 Setting up Cloud Monitoring Dashboard for DressUp AI"
echo "📍 Project: $PROJECT_ID"
echo "📄 Config: $DASHBOARD_CONFIG"
echo ""

# Ensure we're authenticated and project is set
gcloud config set project $PROJECT_ID

# Check if dashboard config exists
if [ ! -f "$DASHBOARD_CONFIG" ]; then
    echo "❌ Dashboard configuration file not found: $DASHBOARD_CONFIG"
    echo "Make sure you're running this script from the monitoring directory."
    exit 1
fi

echo "📋 Dashboard configuration found"
echo "🔧 Creating monitoring dashboard..."

# Create the dashboard using gcloud
DASHBOARD_ID=$(gcloud monitoring dashboards create --config-from-file="$DASHBOARD_CONFIG" --format="value(name)" --quiet)

if [ $? -eq 0 ] && [ -n "$DASHBOARD_ID" ]; then
    echo "✅ Dashboard created successfully!"
    echo ""
    echo "📊 Dashboard Details:"
    echo "   Name: $DASHBOARD_NAME"
    echo "   ID: $DASHBOARD_ID"
    echo ""
    echo "🔗 View Dashboard:"
    DASHBOARD_URL="https://console.cloud.google.com/monitoring/dashboards/custom/${DASHBOARD_ID##*/}?project=$PROJECT_ID"
    echo "   $DASHBOARD_URL"
    echo ""
    echo "📈 Dashboard includes:"
    echo "   • Generation request rate and success metrics"
    echo "   • Processing latency and performance trends"
    echo "   • User feedback and satisfaction ratings"
    echo "   • Vertex AI API performance monitoring"
    echo "   • Error rates and system health indicators"
    echo "   • Storage cleanup efficiency tracking"
    echo "   • Business intelligence scorecards"
    echo "   • Function execution time distributions"
    echo ""
    echo "⚠️  Note: Metrics will appear after:"
    echo "   1. Cloud Functions are deployed with structured logging"
    echo "   2. Log-based metrics are created (run setup-metrics.sh)"
    echo "   3. Application generates some traffic"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Deploy Cloud Functions: cd ../functions && npm run deploy"
    echo "   2. Create log metrics: ./setup-metrics.sh" 
    echo "   3. Generate test traffic to populate dashboard"
    echo "   4. Set up alerting policies based on dashboard metrics"
    echo "   5. Configure budget alerts: ./setup-budget-alerts.sh"
else
    echo "❌ Failed to create dashboard"
    echo "Check the dashboard configuration and try again."
    exit 1
fi