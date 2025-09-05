# DressUp AI - Monitoring Deployment Guide

This guide provides step-by-step instructions for deploying the complete monitoring and logging infrastructure for DressUp AI.

## 🎯 Overview

The monitoring system provides:
- **Structured Logging**: Comprehensive event tracking across all Cloud Functions
- **Log-Based Metrics**: 13+ custom metrics for performance and business intelligence
- **Real-Time Dashboard**: Visual monitoring of application health and user experience
- **Budget Alerts**: Cost monitoring and alerts for Vertex AI usage
- **End-to-End Validation**: Automated testing of the entire monitoring pipeline

## 📋 Prerequisites

### 1. Required Tools
```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud auth login
gcloud config set project project-friday-471118

# Python dependencies (for advanced scripts)
pip install google-cloud-logging google-cloud-monitoring google-cloud-billing-budgets pyyaml

# Node.js (for Cloud Functions)
node --version  # Should be 20+
npm --version
```

### 2. Required Permissions
Ensure your account has these IAM roles:
- Cloud Functions Developer
- Logging Admin
- Monitoring Admin  
- Billing Account Administrator
- Project Editor

### 3. Enable Required APIs
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable billingbudgets.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## 🚀 Deployment Steps

### Step 1: Deploy Cloud Functions with Structured Logging

```bash
# Build and deploy Cloud Functions
cd functions
npm install
npm run build
npm run deploy

# Verify deployment
gcloud functions list --filter="name~dressup"
```

**Expected Output**: All Cloud Functions deployed successfully with structured logging enabled.

### Step 2: Create Log-Based Metrics

Choose your preferred method:

#### Option A: Simple Bash Script
```bash
cd ../monitoring
./setup-metrics.sh
```

#### Option B: Advanced Python Script (Recommended)
```bash
python3 create-log-metrics.py project-friday-471118
```

**Expected Output**: 13+ log-based metrics created in Cloud Logging.

**Verify**: Visit [Cloud Logging Metrics](https://console.cloud.google.com/logs/metrics?project=project-friday-471118)

### Step 3: Create Monitoring Dashboard

#### Option A: Simple Bash Script
```bash
./setup-dashboard.sh
```

#### Option B: Advanced Python Script (Recommended)
```bash
python3 create-dashboard.py project-friday-471118
```

**Expected Output**: Comprehensive dashboard created with 10+ widgets.

**Verify**: Visit [Cloud Monitoring Dashboards](https://console.cloud.google.com/monitoring/dashboards?project=project-friday-471118)

### Step 4: Set Up Budget Alerts

#### Option A: Interactive Bash Script
```bash
./setup-budget-alerts.sh
```

#### Option B: Advanced Python Script
```bash
python3 create-budget-alerts.py project-friday-471118 --daily-budget 50 --monthly-budget 1500
```

**Expected Output**: 3 budget alerts created (daily, monthly, Vertex AI specific).

**Verify**: Visit [Billing Budgets](https://console.cloud.google.com/billing/budgets?project=project-friday-471118)

### Step 5: Validate Complete Setup

Run comprehensive validation:

```bash
python3 validate-monitoring.py project-friday-471118 --report-file validation-report.json
```

**Expected Output**: Validation report showing >75% success rate across all components.

## 📊 Dashboard Overview

After deployment, your dashboard will include:

### Primary Metrics (Top Row)
- **Generation Request Rate**: Real-time processing volume
- **Success Rate**: Reliability percentage across request types
- **P95 Latency**: 95th percentile processing times
- **User Satisfaction**: Average feedback ratings

### Performance Monitoring (Middle Row)
- **Vertex AI Latency**: External API performance
- **Error Rate**: Application errors by type
- **Storage Efficiency**: Cleanup success rates

### Business Intelligence (Bottom Row)
- **Active Sessions**: Real-time user activity
- **Photo Uploads**: Feature usage metrics
- **AI Confidence**: Model performance quality
- **Files Cleaned**: Privacy compliance tracking

## 💰 Budget Alert Configuration

The system monitors these cost centers:

### Alert Thresholds
- **50%**: Early warning
- **75%**: Attention required
- **90%**: Action needed
- **100%**: Budget exceeded
- **110%**: Emergency threshold

### Monitored Services
- **Vertex AI** (primary cost driver)
- **Cloud Functions** (execution costs)
- **Cloud Storage** (file storage)
- **Cloud Logging** (log storage)
- **Cloud Monitoring** (metrics/dashboard)

## 🔍 Validation Checklist

Use this checklist to verify complete deployment:

### ✅ Structured Logging
- [ ] Cloud Functions deployed successfully
- [ ] Structured logs visible in Cloud Logging
- [ ] Event types include: SESSION_CREATED, GENERATION_STARTED, etc.
- [ ] Log entries contain required fields: eventType, timestamp, sessionId

### ✅ Log-Based Metrics
- [ ] 13+ custom metrics created in Cloud Logging
- [ ] Metrics include: generation_requests_total, generation_success_rate
- [ ] Metric filters match structured log format
- [ ] Time series data appears after traffic generation

### ✅ Monitoring Dashboard
- [ ] "DressUp AI - Application Monitoring" dashboard exists
- [ ] Dashboard contains 10+ widgets (charts and scorecards)
- [ ] Widgets reference correct metric types
- [ ] Dashboard accessible via Cloud Console

### ✅ Budget Alerts
- [ ] Daily and monthly budgets created
- [ ] Budget filters include Vertex AI services
- [ ] Threshold rules configured (50%, 75%, 90%, 100%, 110%)
- [ ] Email notifications set up (optional)

### ✅ End-to-End Flow
- [ ] Test traffic generates structured logs
- [ ] Log-based metrics populate from structured logs
- [ ] Dashboard widgets display metric data
- [ ] Budget tracking shows cost allocation

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. No Structured Logs Appearing
```bash
# Check Cloud Function deployment
gcloud functions describe processImageWithGemini --region=us-central1

# Verify function is receiving traffic
gcloud logging read 'resource.type="cloud_function"' --limit=10

# Test structured logging format
gcloud logging read 'jsonPayload.structuredData.eventType:*' --limit=5
```

#### 2. Metrics Not Populating
```bash
# Check if metrics exist
gcloud logging metrics list --filter="name~generation"

# Verify metric filters
gcloud logging metrics describe generation_requests_total

# Test metric queries
gcloud monitoring metrics list --filter="metric.type~logging.googleapis.com/user"
```

#### 3. Dashboard Widgets Empty
```bash
# Generate test traffic
curl -X POST https://us-central1-project-friday-471118.cloudfunctions.net/createSession

# Check metric data availability
gcloud monitoring time-series list --filter='metric.type="logging.googleapis.com/user/session_creation_rate"'
```

#### 4. Budget Alerts Not Working
```bash
# Verify billing account
gcloud billing projects describe project-friday-471118

# Check budget configuration
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID

# Test with small spend to trigger alerts
```

## 📈 Performance Baselines

Expected performance benchmarks:

### Generation Metrics
- **Success Rate**: >95%
- **P95 Latency**: <5 minutes
- **Confidence Score**: >0.7

### System Health
- **Error Rate**: <1%
- **Storage Cleanup**: >98% success
- **API Availability**: >99.9%

### User Experience
- **Average Rating**: >3.5/5
- **Session Duration**: >5 minutes
- **Upload Success**: >99%

## 🔧 Maintenance

### Daily Tasks
- [ ] Review dashboard for anomalies
- [ ] Check error logs for new issues
- [ ] Monitor budget utilization

### Weekly Tasks
- [ ] Analyze user feedback trends
- [ ] Review performance baselines
- [ ] Update alert thresholds if needed

### Monthly Tasks
- [ ] Budget review and adjustment
- [ ] Performance trend analysis
- [ ] Monitoring system health check

## 🆘 Support and Resources

### Documentation Links
- [Cloud Monitoring Docs](https://cloud.google.com/monitoring/docs)
- [Cloud Logging Docs](https://cloud.google.com/logging/docs)
- [Budget Alerts Docs](https://cloud.google.com/billing/docs/how-to/budgets)

### Emergency Contacts
- **Monitoring Issues**: Check Cloud Console Status Page
- **Billing Issues**: Contact Google Cloud Billing Support
- **Application Issues**: Review error logs and dashboard

### Useful Commands
```bash
# Quick health check
python3 validate-monitoring.py project-friday-471118

# View recent structured logs
gcloud logging read 'jsonPayload.structuredData.eventType:*' --limit=20

# Check current spend
gcloud billing projects get-billing-info project-friday-471118

# Dashboard direct link
open "https://console.cloud.google.com/monitoring/dashboards?project=project-friday-471118"
```

---

## 🎉 Deployment Complete!

Your DressUp AI monitoring infrastructure is now fully deployed and operational. The system will provide:

- **Real-time visibility** into application performance
- **Proactive alerting** for issues and cost overruns
- **Business intelligence** for usage patterns
- **Compliance tracking** for privacy requirements

Monitor the dashboard regularly and adjust thresholds based on actual usage patterns. The system is designed to scale with your application growth while maintaining comprehensive visibility into all aspects of the DressUp AI platform.