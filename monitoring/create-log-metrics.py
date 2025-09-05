#!/usr/bin/env python3
"""
DressUp AI - Advanced Log-Based Metrics Creator
Creates sophisticated log-based metrics with value extractors and label extractors
"""

import yaml
import json
from google.cloud import logging_v2
from google.cloud.logging_v2 import LogMetric
from typing import Dict, Any, List
import sys

def load_metrics_config(config_path: str) -> Dict[str, Any]:
    """Load metrics configuration from YAML file."""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def create_log_metric(client: logging_v2.MetricsServiceV2Client, project_id: str, metric_config: Dict[str, Any]) -> None:
    """Create a single log-based metric."""
    
    # Build the metric object
    metric = LogMetric(
        name=metric_config['name'],
        description=metric_config['description'],
        filter=metric_config['filter']
    )
    
    # Add value extractor if specified
    if 'valueExtractor' in metric_config:
        metric.value_extractor = metric_config['valueExtractor']
    
    # Add label extractors if specified
    if 'labelExtractors' in metric_config:
        metric.label_extractors = metric_config['labelExtractors']
    
    # Add metric descriptor if specified
    if 'metricDescriptor' in metric_config:
        descriptor = metric_config['metricDescriptor']
        if 'metricKind' in descriptor:
            # Map string values to enum values
            kind_map = {
                'GAUGE': LogMetric.MetricDescriptor.MetricKind.GAUGE,
                'DELTA': LogMetric.MetricDescriptor.MetricKind.DELTA,
                'CUMULATIVE': LogMetric.MetricDescriptor.MetricKind.CUMULATIVE
            }
            metric.metric_descriptor.metric_kind = kind_map.get(
                descriptor['metricKind'], 
                LogMetric.MetricDescriptor.MetricKind.GAUGE
            )
            
        if 'valueType' in descriptor:
            # Map string values to enum values
            type_map = {
                'INT64': LogMetric.MetricDescriptor.ValueType.INT64,
                'DOUBLE': LogMetric.MetricDescriptor.ValueType.DOUBLE,
                'DISTRIBUTION': LogMetric.MetricDescriptor.ValueType.DISTRIBUTION
            }
            metric.metric_descriptor.value_type = type_map.get(
                descriptor['valueType'],
                LogMetric.MetricDescriptor.ValueType.INT64
            )
    
    # Create the metric
    project_name = f"projects/{project_id}"
    
    try:
        result = client.create_log_metric(parent=project_name, metric=metric)
        print(f"✅ Created metric: {metric_config['name']}")
        return result
    except Exception as e:
        if "already exists" in str(e).lower():
            print(f"⚠️  Metric already exists: {metric_config['name']}")
            # Update the existing metric
            try:
                metric_name = f"{project_name}/metrics/{metric_config['name']}"
                result = client.update_log_metric(metric_name=metric_name, metric=metric)
                print(f"📝 Updated metric: {metric_config['name']}")
                return result
            except Exception as update_e:
                print(f"❌ Failed to update metric {metric_config['name']}: {update_e}")
        else:
            print(f"❌ Failed to create metric {metric_config['name']}: {e}")

def main():
    """Main function to create all log-based metrics."""
    
    if len(sys.argv) != 2:
        print("Usage: python3 create-log-metrics.py <project_id>")
        sys.exit(1)
    
    project_id = sys.argv[1]
    config_path = 'log-metrics.yaml'
    
    print(f"🔧 Setting up advanced log-based metrics for DressUp AI")
    print(f"📍 Project: {project_id}")
    print(f"📄 Config: {config_path}")
    print()
    
    # Load configuration
    try:
        config = load_metrics_config(config_path)
    except FileNotFoundError:
        print(f"❌ Configuration file not found: {config_path}")
        print("Make sure you're running this script from the monitoring directory.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"❌ Failed to parse YAML configuration: {e}")
        sys.exit(1)
    
    # Initialize the client
    try:
        client = logging_v2.MetricsServiceV2Client()
    except Exception as e:
        print(f"❌ Failed to initialize Google Cloud Logging client: {e}")
        print("Make sure you have the google-cloud-logging package installed:")
        print("pip install google-cloud-logging")
        sys.exit(1)
    
    # Create metrics
    metrics_config = config.get('metrics', [])
    successful_metrics = 0
    failed_metrics = 0
    
    print(f"📊 Creating {len(metrics_config)} log-based metrics...")
    print()
    
    for metric_config in metrics_config:
        try:
            create_log_metric(client, project_id, metric_config)
            successful_metrics += 1
        except Exception as e:
            print(f"❌ Failed to create metric {metric_config.get('name', 'unknown')}: {e}")
            failed_metrics += 1
    
    print()
    print("📈 Summary:")
    print(f"   ✅ Successfully created/updated: {successful_metrics} metrics")
    if failed_metrics > 0:
        print(f"   ❌ Failed: {failed_metrics} metrics")
    
    print()
    print("🔗 View metrics in Cloud Console:")
    print(f"   https://console.cloud.google.com/logs/metrics?project={project_id}")
    
    print()
    print("📋 Created metrics for monitoring:")
    for metric_config in metrics_config:
        print(f"   • {metric_config['name']}: {metric_config['description']}")
    
    if 'dashboardMetrics' in config:
        print()
        print("📊 Dashboard metric categories:")
        dashboard_metrics = config['dashboardMetrics']
        for category, metrics in dashboard_metrics.items():
            print(f"   {category.title()}:")
            for metric in metrics:
                print(f"     - {metric}")
    
    print()
    print("🚀 Next steps:")
    print("   1. Deploy Cloud Functions with structured logging")
    print("   2. Generate some test traffic to populate metrics")
    print("   3. Create monitoring dashboard")
    print("   4. Set up alerting policies")
    print("   5. Configure budget alerts for Vertex AI")

if __name__ == "__main__":
    main()