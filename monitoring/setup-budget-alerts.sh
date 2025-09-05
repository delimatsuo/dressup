#!/bin/bash

# DressUp AI - GCP Budget Alerts Setup Script
# Creates budget alerts for Vertex AI usage monitoring

set -e  # Exit on any error

PROJECT_ID="project-friday-471118"
BILLING_ACCOUNT_ID=""  # Will be detected automatically
DAILY_BUDGET=50        # $50 daily budget
MONTHLY_BUDGET=1500    # $1500 monthly budget

echo "💰 Setting up GCP Budget Alerts for DressUp AI"
echo "📍 Project: $PROJECT_ID"
echo "💵 Daily Budget: \$${DAILY_BUDGET}"
echo "💵 Monthly Budget: \$${MONTHLY_BUDGET}"
echo ""

# Ensure we're authenticated and project is set
gcloud config set project $PROJECT_ID

# Get billing account ID automatically
echo "🔍 Detecting billing account..."
BILLING_ACCOUNT_ID=$(gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)" 2>/dev/null | sed 's/billingAccounts\///')

if [ -z "$BILLING_ACCOUNT_ID" ]; then
    echo "❌ Could not detect billing account for project $PROJECT_ID"
    echo "Make sure:"
    echo "   1. Billing is enabled for this project"
    echo "   2. You have billing permissions"
    echo "   3. The project exists and is accessible"
    exit 1
fi

echo "✅ Found billing account: $BILLING_ACCOUNT_ID"
echo ""

# Function to create a budget with alerts
create_budget() {
    local budget_name=$1
    local budget_amount=$2
    local time_period=$3
    local display_name="$4"
    
    echo "🔧 Creating budget: $display_name"
    
    # Create budget configuration
    cat > "/tmp/${budget_name}_budget.yaml" << EOF
displayName: "$display_name"
budgetFilter:
  projects:
  - "projects/$PROJECT_ID"
  services:
  - "services/aiplatform.googleapis.com"  # Vertex AI
  - "services/cloudfunctions.googleapis.com"  # Cloud Functions
  - "services/storage.googleapis.com"  # Cloud Storage
amount:
  specifiedAmount:
    currencyCode: "USD"
    units: "$budget_amount"
thresholdRules:
- thresholdPercent: 0.5
  spendBasis: CURRENT_SPEND
- thresholdPercent: 0.75
  spendBasis: CURRENT_SPEND
- thresholdPercent: 0.9
  spendBasis: CURRENT_SPEND
- thresholdPercent: 1.0
  spendBasis: CURRENT_SPEND
- thresholdPercent: 1.1
  spendBasis: CURRENT_SPEND
allUpdatesRule:
  monitoring_notification_channels: []
  disable_default_iam_recipients: false
EOF

    # Create the budget
    BUDGET_ID=$(gcloud billing budgets create \
        --billing-account="$BILLING_ACCOUNT_ID" \
        --budget-from-file="/tmp/${budget_name}_budget.yaml" \
        --format="value(name)" \
        --quiet)
    
    if [ $? -eq 0 ] && [ -n "$BUDGET_ID" ]; then
        echo "✅ Created budget: $display_name"
        echo "   Budget ID: ${BUDGET_ID##*/}"
        echo ""
    else
        echo "❌ Failed to create budget: $display_name"
    fi
    
    # Clean up temp file
    rm -f "/tmp/${budget_name}_budget.yaml"
}

# Create notification channel for budget alerts (email)
echo "📧 Setting up notification channels..."

# Check if user wants to add email notifications
echo "📨 Would you like to add email notifications for budget alerts? (y/n)"
read -p "Enter your choice: " add_email

if [ "$add_email" = "y" ] || [ "$add_email" = "Y" ]; then
    echo "📧 Enter email address for budget alerts:"
    read -p "Email: " email_address
    
    if [ -n "$email_address" ]; then
        echo "🔧 Creating email notification channel..."
        
        CHANNEL_ID=$(gcloud alpha monitoring channels create \
            --display-name="DressUp AI Budget Alerts" \
            --type=email \
            --channel-labels=email_address="$email_address" \
            --description="Budget alerts for DressUp AI Vertex AI usage" \
            --format="value(name)" \
            --quiet)
        
        if [ $? -eq 0 ] && [ -n "$CHANNEL_ID" ]; then
            echo "✅ Created email notification channel"
            echo "   Channel ID: ${CHANNEL_ID##*/}"
            echo "   Email: $email_address"
            echo ""
            
            # Update budget configs to include notification channel
            NOTIFICATION_CHANNEL="$CHANNEL_ID"
        else
            echo "⚠️  Failed to create email notification channel"
            echo "   Budget alerts will be sent to project owners only"
            NOTIFICATION_CHANNEL=""
        fi
    fi
else
    echo "📧 Skipping email notifications - alerts will go to project owners"
    NOTIFICATION_CHANNEL=""
fi

echo ""

# Create daily budget
create_budget "daily" "$DAILY_BUDGET" "MONTH" "DressUp AI - Daily Budget (\$${DAILY_BUDGET})"

# Create monthly budget  
create_budget "monthly" "$MONTHLY_BUDGET" "MONTH" "DressUp AI - Monthly Budget (\$${MONTHLY_BUDGET})"

echo "📊 Budget Alert Summary:"
echo ""
echo "💵 Budgets Created:"
echo "   • Daily Budget: \$${DAILY_BUDGET}"
echo "     - 50% alert at \$$(($DAILY_BUDGET * 50 / 100))"
echo "     - 75% alert at \$$(($DAILY_BUDGET * 75 / 100))"  
echo "     - 90% alert at \$$(($DAILY_BUDGET * 90 / 100))"
echo "     - 100% alert at \$${DAILY_BUDGET}"
echo "     - 110% alert at \$$(($DAILY_BUDGET * 110 / 100))"
echo ""
echo "   • Monthly Budget: \$${MONTHLY_BUDGET}"
echo "     - 50% alert at \$$(($MONTHLY_BUDGET * 50 / 100))"
echo "     - 75% alert at \$$(($MONTHLY_BUDGET * 75 / 100))"
echo "     - 90% alert at \$$(($MONTHLY_BUDGET * 90 / 100))"
echo "     - 100% alert at \$${MONTHLY_BUDGET}"
echo "     - 110% alert at \$$(($MONTHLY_BUDGET * 110 / 100))"
echo ""

echo "🎯 Services Monitored:"
echo "   • Vertex AI (primary cost driver)"
echo "   • Cloud Functions (execution costs)"
echo "   • Cloud Storage (file storage costs)"
echo ""

echo "🔗 View Budgets:"
echo "   https://console.cloud.google.com/billing/budgets?project=$PROJECT_ID"
echo ""

echo "⚙️  Budget Configuration:"
echo "   • Alerts sent to project owners by default"
if [ -n "$NOTIFICATION_CHANNEL" ]; then
    echo "   • Additional alerts sent to: $email_address"
fi
echo "   • Threshold alerts at 50%, 75%, 90%, 100%, 110%"
echo "   • Based on current spend (not forecasted)"
echo ""

echo "📈 Cost Optimization Tips:"
echo "   • Monitor Vertex AI usage in dashboard"
echo "   • Use generation confidence scores to optimize API calls"
echo "   • Implement request caching for repeated generations"
echo "   • Set up automatic scaling limits on Cloud Functions"
echo "   • Regular cleanup of Cloud Storage files"
echo ""

echo "🚀 Next Steps:"
echo "   1. Deploy monitoring infrastructure"
echo "   2. Test budget alerts with small spend"
echo "   3. Monitor actual vs. projected costs"
echo "   4. Adjust budgets based on usage patterns"
echo "   5. Set up cost anomaly detection"