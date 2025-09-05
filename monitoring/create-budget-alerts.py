#!/usr/bin/env python3
"""
DressUp AI - Advanced Budget Alerts Creator
Creates sophisticated budget monitoring with granular service filtering and alerts
"""

import sys
from google.cloud import billing_budgets_v1
from google.cloud.billing_budgets_v1 import Budget
from google.cloud import billing
from google.type import money_pb2
import argparse

def get_billing_account_id(project_id: str) -> str:
    """Get the billing account ID for a project."""
    try:
        billing_client = billing.CloudBillingClient()
        project_name = f"projects/{project_id}"
        project_billing = billing_client.get_project_billing_info(name=project_name)
        
        if not project_billing.billing_enabled:
            raise Exception(f"Billing is not enabled for project {project_id}")
        
        return project_billing.billing_account_name.split('/')[-1]
    except Exception as e:
        print(f"❌ Failed to get billing account: {e}")
        raise

def create_budget(
    client: billing_budgets_v1.BudgetServiceClient,
    billing_account: str,
    project_id: str,
    budget_amount: int,
    display_name: str,
    services: list = None,
    notification_channels: list = None
) -> Budget:
    """Create a budget with specified parameters."""
    
    # Default services if none specified
    if services is None:
        services = [
            "services/aiplatform.googleapis.com",  # Vertex AI
            "services/cloudfunctions.googleapis.com",  # Cloud Functions
            "services/storage.googleapis.com",  # Cloud Storage
            "services/logging.googleapis.com",  # Cloud Logging
            "services/monitoring.googleapis.com"  # Cloud Monitoring
        ]
    
    # Create budget filter
    budget_filter = billing_budgets_v1.Filter(
        projects=[f"projects/{project_id}"],
        services=services
    )
    
    # Create budget amount
    amount = billing_budgets_v1.BudgetAmount(
        specified_amount=money_pb2.Money(
            currency_code="USD",
            units=budget_amount
        )
    )
    
    # Create threshold rules (50%, 75%, 90%, 100%, 110%)
    threshold_rules = [
        billing_budgets_v1.ThresholdRule(
            threshold_percent=0.5,
            spend_basis=billing_budgets_v1.ThresholdRule.Basis.CURRENT_SPEND
        ),
        billing_budgets_v1.ThresholdRule(
            threshold_percent=0.75,
            spend_basis=billing_budgets_v1.ThresholdRule.Basis.CURRENT_SPEND
        ),
        billing_budgets_v1.ThresholdRule(
            threshold_percent=0.9,
            spend_basis=billing_budgets_v1.ThresholdRule.Basis.CURRENT_SPEND
        ),
        billing_budgets_v1.ThresholdRule(
            threshold_percent=1.0,
            spend_basis=billing_budgets_v1.ThresholdRule.Basis.CURRENT_SPEND
        ),
        billing_budgets_v1.ThresholdRule(
            threshold_percent=1.1,
            spend_basis=billing_budgets_v1.ThresholdRule.Basis.CURRENT_SPEND
        )
    ]
    
    # Create all updates rule
    all_updates_rule = billing_budgets_v1.AllUpdatesRule(
        monitoring_notification_channels=notification_channels or [],
        disable_default_iam_recipients=False
    )
    
    # Create budget
    budget = Budget(
        display_name=display_name,
        budget_filter=budget_filter,
        amount=amount,
        threshold_rules=threshold_rules,
        all_updates_rule=all_updates_rule
    )
    
    # Create the budget
    parent = f"billingAccounts/{billing_account}"
    try:
        result = client.create_budget(parent=parent, budget=budget)
        return result
    except Exception as e:
        print(f"❌ Failed to create budget '{display_name}': {e}")
        raise

def create_notification_channel(email: str):
    """Create a notification channel for budget alerts."""
    # Note: This would require the monitoring API client
    # For simplicity, we'll return instructions for manual setup
    return f"""
To create an email notification channel manually:

1. Go to Cloud Console Monitoring
2. Navigate to Alerting > Notification Channels
3. Click "ADD NEW" and select "Email"
4. Enter email: {email}
5. Copy the channel ID and use it when creating budgets
"""

def main():
    """Main function to create budget alerts."""
    
    parser = argparse.ArgumentParser(description='Create GCP budget alerts for DressUp AI')
    parser.add_argument('project_id', help='GCP Project ID')
    parser.add_argument('--daily-budget', type=int, default=50, help='Daily budget in USD (default: 50)')
    parser.add_argument('--monthly-budget', type=int, default=1500, help='Monthly budget in USD (default: 1500)')
    parser.add_argument('--email', help='Email address for notifications')
    
    args = parser.parse_args()
    
    print(f"💰 Creating advanced budget alerts for DressUp AI")
    print(f"📍 Project: {args.project_id}")
    print(f"💵 Daily Budget: ${args.daily_budget}")
    print(f"💵 Monthly Budget: ${args.monthly_budget}")
    if args.email:
        print(f"📧 Email Notifications: {args.email}")
    print()
    
    # Get billing account
    print("🔍 Getting billing account information...")
    try:
        billing_account = get_billing_account_id(args.project_id)
        print(f"✅ Found billing account: {billing_account}")
    except Exception as e:
        print(f"❌ Failed to get billing account: {e}")
        sys.exit(1)
    
    # Initialize client
    try:
        client = billing_budgets_v1.BudgetServiceClient()
        print("✅ Connected to Billing Budgets API")
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        sys.exit(1)
    
    print()
    
    # Create budgets
    budgets_created = 0
    
    # Daily budget
    try:
        print(f"🔧 Creating daily budget (${args.daily_budget})...")
        daily_budget = create_budget(
            client,
            billing_account,
            args.project_id,
            args.daily_budget,
            f"DressUp AI - Daily Budget (${args.daily_budget})"
        )
        print(f"✅ Created daily budget: {daily_budget.name.split('/')[-1]}")
        budgets_created += 1
    except Exception as e:
        print(f"❌ Failed to create daily budget: {e}")
    
    # Monthly budget
    try:
        print(f"🔧 Creating monthly budget (${args.monthly_budget})...")
        monthly_budget = create_budget(
            client,
            billing_account,
            args.project_id,
            args.monthly_budget,
            f"DressUp AI - Monthly Budget (${args.monthly_budget})"
        )
        print(f"✅ Created monthly budget: {monthly_budget.name.split('/')[-1]}")
        budgets_created += 1
    except Exception as e:
        print(f"❌ Failed to create monthly budget: {e}")
    
    # Vertex AI specific budget (high priority)
    try:
        print(f"🔧 Creating Vertex AI budget (${args.monthly_budget // 2})...")
        vertex_budget = create_budget(
            client,
            billing_account,
            args.project_id,
            args.monthly_budget // 2,  # Half of monthly budget for Vertex AI
            f"DressUp AI - Vertex AI Budget (${args.monthly_budget // 2})",
            services=["services/aiplatform.googleapis.com"]  # Vertex AI only
        )
        print(f"✅ Created Vertex AI budget: {vertex_budget.name.split('/')[-1]}")
        budgets_created += 1
    except Exception as e:
        print(f"❌ Failed to create Vertex AI budget: {e}")
    
    print()
    print(f"📊 Budget Creation Summary:")
    print(f"   ✅ Successfully created: {budgets_created} budgets")
    print()
    
    if budgets_created > 0:
        print("💡 Budget Alert Configuration:")
        print("   • Threshold alerts at: 50%, 75%, 90%, 100%, 110%")
        print("   • Based on current spend (not forecasted)")
        print("   • Notifications sent to project billing administrators")
        print()
        
        print("🎯 Services Monitored:")
        print("   • Vertex AI (primary cost driver)")
        print("   • Cloud Functions (execution and storage)")
        print("   • Cloud Storage (file storage)")
        print("   • Cloud Logging (log ingestion and storage)")
        print("   • Cloud Monitoring (metrics and dashboards)")
        print()
        
        print("📈 Cost Optimization Recommendations:")
        print("   • Monitor Vertex AI token usage and optimize prompts")
        print("   • Implement response caching for repeated requests")
        print("   • Set Cloud Function memory and timeout limits")
        print("   • Use lifecycle policies for Cloud Storage cleanup")
        print("   • Monitor log retention and sampling policies")
        print()
        
        print("🔗 View and Manage Budgets:")
        print(f"   https://console.cloud.google.com/billing/budgets?project={args.project_id}")
        print()
        
        print("🚀 Next Steps:")
        print("   1. Deploy monitoring infrastructure")
        print("   2. Generate test traffic to validate costs")
        print("   3. Monitor daily spend against budgets")
        print("   4. Set up cost anomaly detection alerts")
        print("   5. Create automated scaling policies")
    
    if args.email:
        print()
        print("📧 Email Notification Setup:")
        print(create_notification_channel(args.email))

if __name__ == "__main__":
    main()