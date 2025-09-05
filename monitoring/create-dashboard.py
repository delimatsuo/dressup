#!/usr/bin/env python3
"""
DressUp AI - Advanced Monitoring Dashboard Creator
Creates sophisticated monitoring dashboards with custom widgets and layouts
"""

import json
import sys
from google.cloud import monitoring_dashboard_v1
from google.cloud.monitoring_dashboard_v1 import Dashboard
import yaml

def load_dashboard_config(config_path: str) -> dict:
    """Load dashboard configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)

def load_metrics_config(config_path: str) -> dict:
    """Load metrics configuration to validate dashboard references."""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def create_dashboard(client: monitoring_dashboard_v1.DashboardsServiceClient, project_id: str, dashboard_config: dict) -> Dashboard:
    """Create a monitoring dashboard."""
    
    # Build the dashboard object
    dashboard = Dashboard()
    dashboard.display_name = dashboard_config['displayName']
    dashboard.mosaic_layout = dashboard_config['mosaicLayout']
    
    if 'dashboardFilters' in dashboard_config:
        dashboard.dashboard_filters = dashboard_config['dashboardFilters']
    
    # Create the dashboard
    project_name = f"projects/{project_id}"
    
    try:
        result = client.create_dashboard(parent=project_name, dashboard=dashboard)
        return result
    except Exception as e:
        print(f"❌ Failed to create dashboard: {e}")
        raise

def validate_metrics_references(dashboard_config: dict, metrics_config: dict) -> list:
    """Validate that dashboard references existing metrics."""
    issues = []
    
    # Extract metric references from dashboard widgets
    referenced_metrics = set()
    tiles = dashboard_config.get('mosaicLayout', {}).get('tiles', [])
    
    for tile in tiles:
        widget = tile.get('widget', {})
        
        # Check XY chart datasets
        xy_chart = widget.get('xyChart', {})
        data_sets = xy_chart.get('dataSets', [])
        
        for data_set in data_sets:
            ts_query = data_set.get('timeSeriesQuery', {})
            ts_filter = ts_query.get('timeSeriesFilter', {})
            filter_str = ts_filter.get('filter', '')
            
            # Extract metric type from filter
            if 'metric.type=' in filter_str:
                metric_part = filter_str.split('metric.type=')[1].split(' ')[0].strip('"')
                if metric_part.startswith('logging.googleapis.com/user/'):
                    metric_name = metric_part.replace('logging.googleapis.com/user/', '')
                    referenced_metrics.add(metric_name)
        
        # Check scorecard queries
        scorecard = widget.get('scorecard', {})
        ts_query = scorecard.get('timeSeriesQuery', {})
        ts_filter = ts_query.get('timeSeriesFilter', {})
        filter_str = ts_filter.get('filter', '')
        
        if 'metric.type=' in filter_str:
            metric_part = filter_str.split('metric.type=')[1].split(' ')[0].strip('"')
            if metric_part.startswith('logging.googleapis.com/user/'):
                metric_name = metric_part.replace('logging.googleapis.com/user/', '')
                referenced_metrics.add(metric_name)
    
    # Check against defined metrics
    defined_metrics = {metric['name'] for metric in metrics_config.get('metrics', [])}
    
    for metric in referenced_metrics:
        if metric not in defined_metrics:
            issues.append(f"Dashboard references undefined metric: {metric}")
    
    return issues

def main():
    """Main function to create the monitoring dashboard."""
    
    if len(sys.argv) != 2:
        print("Usage: python3 create-dashboard.py <project_id>")
        sys.exit(1)
    
    project_id = sys.argv[1]
    dashboard_config_path = 'dashboard-config.json'
    metrics_config_path = 'log-metrics.yaml'
    
    print(f"📊 Creating advanced monitoring dashboard for DressUp AI")
    print(f"📍 Project: {project_id}")
    print(f"📄 Dashboard Config: {dashboard_config_path}")
    print(f"📄 Metrics Config: {metrics_config_path}")
    print()
    
    # Load configurations
    try:
        dashboard_config = load_dashboard_config(dashboard_config_path)
        print(f"✅ Loaded dashboard configuration")
    except FileNotFoundError:
        print(f"❌ Dashboard configuration file not found: {dashboard_config_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse dashboard JSON: {e}")
        sys.exit(1)
    
    try:
        metrics_config = load_metrics_config(metrics_config_path)
        print(f"✅ Loaded metrics configuration")
    except FileNotFoundError:
        print(f"⚠️  Metrics configuration file not found: {metrics_config_path}")
        print("    Skipping metric validation...")
        metrics_config = {'metrics': []}
    except yaml.YAMLError as e:
        print(f"❌ Failed to parse metrics YAML: {e}")
        sys.exit(1)
    
    # Validate metric references
    if metrics_config.get('metrics'):
        print("🔍 Validating metric references...")
        issues = validate_metrics_references(dashboard_config, metrics_config)
        
        if issues:
            print("⚠️  Validation issues found:")
            for issue in issues:
                print(f"   • {issue}")
            print("   Dashboard will be created but may show empty charts until metrics are available.")
        else:
            print("✅ All metric references validated")
    
    print()
    
    # Initialize the client
    try:
        client = monitoring_dashboard_v1.DashboardsServiceClient()
        print("✅ Connected to Cloud Monitoring API")
    except Exception as e:
        print(f"❌ Failed to initialize Cloud Monitoring client: {e}")
        sys.exit(1)
    
    # Create the dashboard
    try:
        print("🔧 Creating dashboard...")
        dashboard = create_dashboard(client, project_id, dashboard_config)
        
        dashboard_id = dashboard.name.split('/')[-1]
        dashboard_url = f"https://console.cloud.google.com/monitoring/dashboards/custom/{dashboard_id}?project={project_id}"
        
        print("✅ Dashboard created successfully!")
        print()
        print("📊 Dashboard Details:")
        print(f"   Name: {dashboard_config['displayName']}")
        print(f"   ID: {dashboard_id}")
        print(f"   Resource Name: {dashboard.name}")
        print()
        print("🔗 View Dashboard:")
        print(f"   {dashboard_url}")
        print()
        
        # Count widgets by type
        tiles = dashboard_config.get('mosaicLayout', {}).get('tiles', [])
        chart_count = sum(1 for tile in tiles if 'xyChart' in tile.get('widget', {}))
        scorecard_count = sum(1 for tile in tiles if 'scorecard' in tile.get('widget', {}))
        
        print("📈 Dashboard Layout:")
        print(f"   • {len(tiles)} total widgets")
        print(f"   • {chart_count} time series charts")
        print(f"   • {scorecard_count} scorecard widgets")
        print()
        
        print("🎯 Monitoring Coverage:")
        print("   • Application Performance (latency, success rate)")
        print("   • User Experience (feedback ratings, confidence scores)")
        print("   • System Health (error rates, cleanup efficiency)")
        print("   • Business Metrics (sessions, uploads, usage)")
        print("   • External Dependencies (Vertex AI performance)")
        print()
        
        if not metrics_config.get('metrics'):
            print("⚠️  Note: Metrics need to be created first!")
            print("   Run: ./setup-metrics.sh or python3 create-log-metrics.py")
        
        print("🚀 Next Steps:")
        print("   1. Create log-based metrics (if not done)")
        print("   2. Deploy Cloud Functions with structured logging")
        print("   3. Generate test traffic to populate metrics")
        print("   4. Set up alerting policies")
        print("   5. Configure notification channels")
        
    except Exception as e:
        print(f"❌ Failed to create dashboard: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()