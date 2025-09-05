# DressUp AI - Monitoring and Logging Setup

This directory contains configuration and scripts for setting up comprehensive monitoring and logging for the DressUp AI application.

## Overview

The monitoring system includes:
- **Structured Logging**: All Cloud Functions emit structured logs with consistent event types and metadata
- **Log-Based Metrics**: 13 custom metrics extracted from structured logs for monitoring key performance indicators
- **Cloud Monitoring Dashboard**: Visual dashboard showing application health, performance, and user satisfaction
- **Alerting Policies**: Automated alerts for critical issues
- **Budget Alerts**: Cost monitoring for Vertex AI API usage

## Files

### Configuration
- `log-metrics.yaml` - Complete metrics configuration with filters, extractors, and dashboard layout
- `dashboard-config.json` - Cloud Monitoring dashboard configuration (generated)

### Scripts
- `setup-metrics.sh` - Basic bash script to create log-based metrics using gcloud CLI
- `create-log-metrics.py` - Advanced Python script with full configuration support
- `setup-dashboard.sh` - Script to create Cloud Monitoring dashboard
- `setup-budget-alerts.sh` - Script to configure budget alerts

## Quick Start

### 1. Prerequisites

```bash
# Install required tools
gcloud auth login
gcloud config set project project-friday-471118

# For Python script (optional but recommended)
pip install google-cloud-logging pyyaml
```

### 2. Deploy Structured Logging

First, deploy the Cloud Functions with structured logging:

```bash
# From project root
cd functions
npm run deploy
```

### 3. Create Log-Based Metrics

Choose one of these methods:

**Option A: Simple bash script**
```bash
cd monitoring
./setup-metrics.sh
```

**Option B: Advanced Python script (recommended)**
```bash
cd monitoring
python3 create-log-metrics.py project-friday-471118
```

### 4. Create Monitoring Dashboard

```bash
./setup-dashboard.sh
```

### 5. Set Up Budget Alerts

```bash
./setup-budget-alerts.sh
```

## Metrics Overview

### Key Performance Indicators

| Metric | Description | Use Case |
|--------|-------------|-----------|
| `generation_requests_total` | Total generation requests | Volume monitoring |
| `generation_success_rate` | Success rate percentage | Reliability tracking |
| `generation_latency_ms` | Processing time in ms | Performance monitoring |
| `vertex_ai_latency_ms` | Vertex AI API response time | External dependency tracking |
| `generation_confidence_score` | AI confidence scores | Quality assessment |
| `feedback_ratings` | User satisfaction ratings | Quality validation |

### System Health Indicators

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `error_rate` | Application error count | > 10/minute |
| `session_creation_rate` | New session rate | Baseline tracking |
| `storage_cleanup_success_rate` | Cleanup efficiency | < 95% |

### Business Intelligence

| Metric | Description | Business Value |
|--------|-------------|----------------|
| `photo_uploads_total` | Upload volume by type | Feature usage |
| `session_duration` | Average session length | User engagement |
| `garment_fetch_latency_ms` | Catalog performance | User experience |

## Event Types

The structured logging system uses these standardized event types:

### Core Events
- `SESSION_CREATED` - New user session started
- `SESSION_DELETED` - Session cleanup completed
- `PHOTO_UPLOADED` - User photo upload completed
- `GENERATION_STARTED` - AI processing initiated
- `GENERATION_COMPLETED` - AI processing finished successfully
- `GENERATION_FAILED` - AI processing failed
- `FEEDBACK_SUBMITTED` - User feedback received

### System Events  
- `VERTEX_AI_REQUEST` - API request to Vertex AI
- `VERTEX_AI_RESPONSE` - API response from Vertex AI
- `STORAGE_CLEANUP` - File cleanup operation
- `GARMENT_FETCHED` - Garment catalog query
- `ERROR_OCCURRED` - Application error

## Dashboard Layout

The monitoring dashboard is organized into sections:

### 1. Primary Metrics (Top Row)
- Generation request volume and success rate
- Average processing latency
- User satisfaction scores

### 2. Performance Monitoring (Middle Row)  
- Vertex AI API performance
- Storage system health
- Error rate trends

### 3. Business Intelligence (Bottom Row)
- Session analytics
- Feature usage patterns
- Cost tracking

## Alerting Policies

Automated alerts are configured for:

1. **High Error Rate** - More than 10 errors per minute
2. **Slow Generation** - Processing time > 5 minutes
3. **Vertex AI Failures** - API errors or slow responses
4. **Low User Satisfaction** - Average rating < 3.0
5. **Budget Overrun** - Vertex AI costs exceed threshold

## Cost Monitoring

Budget alerts track Vertex AI usage:
- **Daily Budget**: $50 (adjustable)
- **Monthly Budget**: $1500 (adjustable)  
- **Alerts at**: 50%, 75%, 90%, 100% of budget

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check Cloud Functions are deployed and receiving traffic
   - Verify structured logs are being generated with correct format
   - Ensure log filters match the structured data format

2. **Dashboard empty**
   - Generate some test traffic first
   - Metrics need data points to display charts
   - Check metric names match between config and dashboard

3. **Alerts not firing**
   - Verify alerting policies are created and enabled
   - Check notification channels are configured
   - Test with artificial metric spikes

### Log Query Examples

View structured logs:
```
jsonPayload.structuredData.eventType="GENERATION_COMPLETED"
```

Check specific session:
```
jsonPayload.structuredData.sessionId="session-1234567890-abcdef"
```

Filter by performance:
```
jsonPayload.structuredData.performance.executionTimeMs > 30000
```

## Maintenance

### Regular Tasks
1. Review dashboard metrics weekly
2. Adjust alert thresholds based on baseline performance
3. Update budget limits based on usage patterns
4. Archive old logs to control storage costs

### Scaling Considerations
- Metrics auto-scale with log volume
- Dashboard queries may need optimization for high traffic
- Consider log sampling for very high volumes (>1M requests/day)

## Support

For issues with the monitoring setup:
1. Check Cloud Console logs for setup errors
2. Verify IAM permissions for monitoring resources
3. Review structured logging output format
4. Test with sample log entries