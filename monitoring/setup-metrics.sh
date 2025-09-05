#!/bin/bash

# DressUp AI - Cloud Logging Metrics Setup Script
# Creates log-based metrics for monitoring and alerting

set -e  # Exit on any error

PROJECT_ID="project-friday-471118"
REGION="us-central1"

echo "🔧 Setting up Cloud Logging Metrics for DressUp AI"
echo "📍 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo ""

# Ensure we're authenticated and project is set
gcloud config set project $PROJECT_ID

echo "📊 Creating log-based metrics..."

# Session Metrics
echo "Creating session metrics..."
gcloud logging metrics create session_creation_rate \
  --description="Rate of session creation events" \
  --log-filter='jsonPayload.structuredData.eventType="SESSION_CREATED"' \
  --quiet

gcloud logging metrics create session_duration \
  --description="Session duration tracking" \
  --log-filter='jsonPayload.structuredData.eventType="SESSION_DELETED"' \
  --quiet

# Generation Metrics  
echo "Creating generation metrics..."
gcloud logging metrics create generation_requests_total \
  --description="Total number of generation requests" \
  --log-filter='jsonPayload.structuredData.eventType="GENERATION_STARTED"' \
  --quiet

gcloud logging metrics create generation_success_rate \
  --description="Generation completion success rate" \
  --log-filter='jsonPayload.structuredData.eventType="GENERATION_COMPLETED"' \
  --quiet

gcloud logging metrics create generation_failure_rate \
  --description="Generation failure rate" \
  --log-filter='jsonPayload.structuredData.eventType="GENERATION_FAILED"' \
  --quiet

# Performance Metrics
echo "Creating performance metrics..."
gcloud logging metrics create generation_latency_ms \
  --description="Generation processing latency in milliseconds" \
  --log-filter='jsonPayload.structuredData.eventType="GENERATION_COMPLETED" AND jsonPayload.structuredData.performance.executionTimeMs > 0' \
  --quiet

gcloud logging metrics create vertex_ai_latency_ms \
  --description="Vertex AI API response latency in milliseconds" \
  --log-filter='jsonPayload.structuredData.eventType="VERTEX_AI_RESPONSE" AND jsonPayload.structuredData.duration > 0' \
  --quiet

# Quality Metrics
echo "Creating quality metrics..."
gcloud logging metrics create generation_confidence_score \
  --description="AI generation confidence scores" \
  --log-filter='jsonPayload.structuredData.eventType="GENERATION_COMPLETED" AND jsonPayload.structuredData.metrics.confidence > 0' \
  --quiet

gcloud logging metrics create feedback_ratings \
  --description="User feedback ratings" \
  --log-filter='jsonPayload.structuredData.eventType="FEEDBACK_SUBMITTED"' \
  --quiet

# Storage & Cleanup Metrics
echo "Creating storage metrics..."
gcloud logging metrics create storage_cleanup_files_deleted \
  --description="Number of files deleted during storage cleanup" \
  --log-filter='jsonPayload.structuredData.eventType="STORAGE_CLEANUP"' \
  --quiet

gcloud logging metrics create storage_cleanup_success_rate \
  --description="Storage cleanup success rate" \
  --log-filter='jsonPayload.structuredData.eventType="STORAGE_CLEANUP" AND jsonPayload.structuredData.successRate >= 0' \
  --quiet

# Error Metrics
echo "Creating error metrics..."
gcloud logging metrics create error_rate \
  --description="Application error rate by type" \
  --log-filter='jsonPayload.structuredData.eventType="ERROR_OCCURRED"' \
  --quiet

# Business Metrics
echo "Creating business metrics..."
gcloud logging metrics create photo_uploads_total \
  --description="Total photo uploads by type" \
  --log-filter='jsonPayload.structuredData.eventType="PHOTO_UPLOADED"' \
  --quiet

gcloud logging metrics create garment_fetch_latency_ms \
  --description="Garment catalog fetch latency in milliseconds" \
  --log-filter='jsonPayload.structuredData.eventType="GARMENT_FETCHED" AND jsonPayload.structuredData.duration > 0' \
  --quiet

echo ""
echo "✅ Log-based metrics created successfully!"
echo ""
echo "📊 Created metrics:"
echo "   • session_creation_rate"
echo "   • session_duration" 
echo "   • generation_requests_total"
echo "   • generation_success_rate"
echo "   • generation_failure_rate"
echo "   • generation_latency_ms"
echo "   • vertex_ai_latency_ms"
echo "   • generation_confidence_score"
echo "   • feedback_ratings"
echo "   • storage_cleanup_files_deleted"
echo "   • storage_cleanup_success_rate"
echo "   • error_rate"
echo "   • photo_uploads_total"
echo "   • garment_fetch_latency_ms"
echo ""
echo "🔗 View metrics in Cloud Console:"
echo "   https://console.cloud.google.com/logs/metrics?project=$PROJECT_ID"
echo ""
echo "📈 Next steps:"
echo "   1. Deploy Cloud Functions with structured logging"
echo "   2. Create monitoring dashboard (run setup-dashboard.sh)"
echo "   3. Configure alerting policies"
echo "   4. Set up budget alerts for Vertex AI usage"