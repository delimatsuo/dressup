#!/usr/bin/env python3
"""
DressUp AI - Monitoring Pipeline Validation
Comprehensive validation of monitoring setup including logs, metrics, dashboard, and budgets
"""

import sys
import json
import time
import yaml
import argparse
from typing import Dict, List, Any, Optional
from google.cloud import logging
from google.cloud import monitoring_v3
from google.cloud import billing_budgets_v1
from google.cloud import monitoring_dashboard_v1
import requests

class MonitoringValidator:
    """Validates the complete monitoring pipeline for DressUp AI."""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.project_name = f"projects/{project_id}"
        
        # Initialize clients
        self.logging_client = logging.Client(project=project_id)
        self.monitoring_client = monitoring_v3.MetricServiceClient()
        self.dashboard_client = monitoring_dashboard_v1.DashboardsServiceClient()
        
        # Test results
        self.results = {
            'structured_logging': {'passed': 0, 'failed': 0, 'tests': []},
            'log_metrics': {'passed': 0, 'failed': 0, 'tests': []},
            'dashboard': {'passed': 0, 'failed': 0, 'tests': []},
            'budgets': {'passed': 0, 'failed': 0, 'tests': []},
            'overall': {'passed': 0, 'failed': 0}
        }
    
    def log_test_result(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Log a test result."""
        self.results[category]['tests'].append({
            'name': test_name,
            'passed': passed,
            'details': details
        })
        
        if passed:
            self.results[category]['passed'] += 1
            self.results['overall']['passed'] += 1
            print(f"✅ {test_name}")
        else:
            self.results[category]['failed'] += 1
            self.results['overall']['failed'] += 1
            print(f"❌ {test_name}")
            if details:
                print(f"   Details: {details}")
    
    def test_structured_logging(self) -> None:
        """Test structured logging functionality."""
        print("\n🔍 Testing Structured Logging...")
        
        # Test 1: Check for structured logs from Cloud Functions
        try:
            filter_str = (
                'resource.type="cloud_function" AND '
                'jsonPayload.structuredData.eventType:*'
            )
            
            entries = list(self.logging_client.list_entries(
                filter_=filter_str,
                page_size=10,
                max_results=10
            ))
            
            if entries:
                self.log_test_result(
                    'structured_logging',
                    'Structured logs present',
                    True,
                    f"Found {len(entries)} structured log entries"
                )
                
                # Test 2: Validate log structure
                sample_entry = entries[0]
                payload = sample_entry.payload
                
                if hasattr(payload, 'get') and payload.get('structuredData'):
                    structured_data = payload['structuredData']
                    required_fields = ['eventType', 'timestamp', 'functionName']
                    
                    missing_fields = [field for field in required_fields 
                                    if field not in structured_data]
                    
                    if not missing_fields:
                        self.log_test_result(
                            'structured_logging',
                            'Log structure validation',
                            True,
                            f"All required fields present: {required_fields}"
                        )
                    else:
                        self.log_test_result(
                            'structured_logging',
                            'Log structure validation',
                            False,
                            f"Missing fields: {missing_fields}"
                        )
                else:
                    self.log_test_result(
                        'structured_logging',
                        'Log structure validation',
                        False,
                        "No structured data found in log payload"
                    )
            else:
                self.log_test_result(
                    'structured_logging',
                    'Structured logs present',
                    False,
                    "No structured logs found. Deploy Cloud Functions first."
                )
        
        except Exception as e:
            self.log_test_result(
                'structured_logging',
                'Structured logging access',
                False,
                f"Error accessing logs: {e}"
            )
    
    def test_log_metrics(self) -> None:
        """Test log-based metrics creation and functionality."""
        print("\n📊 Testing Log-Based Metrics...")
        
        # Load expected metrics from config
        try:
            with open('log-metrics.yaml', 'r') as f:
                metrics_config = yaml.safe_load(f)
            expected_metrics = [metric['name'] for metric in metrics_config.get('metrics', [])]
        except FileNotFoundError:
            print("⚠️  log-metrics.yaml not found, using default metric list")
            expected_metrics = [
                'session_creation_rate', 'generation_requests_total',
                'generation_success_rate', 'generation_latency_ms',
                'vertex_ai_latency_ms', 'feedback_ratings', 'error_rate'
            ]
        
        # Test 1: Check if metrics exist
        try:
            metrics = self.monitoring_client.list_metric_descriptors(name=self.project_name)
            user_metrics = [
                metric.type.replace('logging.googleapis.com/user/', '')
                for metric in metrics
                if metric.type.startswith('logging.googleapis.com/user/')
            ]
            
            found_metrics = [metric for metric in expected_metrics if metric in user_metrics]
            missing_metrics = [metric for metric in expected_metrics if metric not in user_metrics]
            
            self.log_test_result(
                'log_metrics',
                'Log metrics existence',
                len(found_metrics) > 0,
                f"Found: {len(found_metrics)}, Missing: {len(missing_metrics)}"
            )
            
            if missing_metrics:
                print(f"   Missing metrics: {', '.join(missing_metrics[:5])}")
                if len(missing_metrics) > 5:
                    print(f"   ... and {len(missing_metrics) - 5} more")
        
        except Exception as e:
            self.log_test_result(
                'log_metrics',
                'Log metrics access',
                False,
                f"Error accessing metrics: {e}"
            )
        
        # Test 2: Check for metric data
        if found_metrics:
            try:
                # Test one of the core metrics for data
                test_metric = f"logging.googleapis.com/user/{found_metrics[0]}"
                
                interval = monitoring_v3.TimeInterval({
                    "end_time": {"seconds": int(time.time())},
                    "start_time": {"seconds": int(time.time() - 3600)},  # Last hour
                })
                
                results = self.monitoring_client.list_time_series(
                    request={
                        "name": self.project_name,
                        "filter": f'metric.type="{test_metric}"',
                        "interval": interval,
                    }
                )
                
                time_series = list(results)
                self.log_test_result(
                    'log_metrics',
                    'Metric data availability',
                    len(time_series) > 0,
                    f"Found {len(time_series)} time series for {found_metrics[0]}"
                )
                
            except Exception as e:
                self.log_test_result(
                    'log_metrics',
                    'Metric data query',
                    False,
                    f"Error querying metric data: {e}"
                )
    
    def test_dashboard(self) -> None:
        """Test dashboard creation and configuration."""
        print("\n📈 Testing Monitoring Dashboard...")
        
        # Test 1: Check if dashboard exists
        try:
            dashboards = self.dashboard_client.list_dashboards(parent=self.project_name)
            dressup_dashboards = [
                dashboard for dashboard in dashboards
                if 'DressUp AI' in dashboard.display_name
            ]
            
            self.log_test_result(
                'dashboard',
                'Dashboard existence',
                len(dressup_dashboards) > 0,
                f"Found {len(dressup_dashboards)} DressUp AI dashboard(s)"
            )
            
            # Test 2: Validate dashboard configuration
            if dressup_dashboards:
                dashboard = dressup_dashboards[0]
                
                # Check for required widgets
                if dashboard.mosaic_layout:
                    tiles = dashboard.mosaic_layout.tiles
                    widget_types = []
                    
                    for tile in tiles:
                        if tile.widget.xy_chart:
                            widget_types.append('xy_chart')
                        if tile.widget.scorecard:
                            widget_types.append('scorecard')
                    
                    self.log_test_result(
                        'dashboard',
                        'Dashboard widget configuration',
                        len(widget_types) > 0,
                        f"Found {len(widget_types)} widgets: {set(widget_types)}"
                    )
                    
                    # Test 3: Check for key metrics in dashboard
                    metric_references = []
                    for tile in tiles:
                        widget = tile.widget
                        
                        # Check XY charts
                        if widget.xy_chart:
                            for dataset in widget.xy_chart.data_sets:
                                filter_str = dataset.time_series_query.time_series_filter.filter
                                if 'logging.googleapis.com/user/' in filter_str:
                                    metric_references.append(filter_str)
                        
                        # Check scorecards
                        if widget.scorecard:
                            filter_str = widget.scorecard.time_series_query.time_series_filter.filter
                            if 'logging.googleapis.com/user/' in filter_str:
                                metric_references.append(filter_str)
                    
                    self.log_test_result(
                        'dashboard',
                        'Dashboard metric references',
                        len(metric_references) > 0,
                        f"Found {len(metric_references)} metric references"
                    )
                else:
                    self.log_test_result(
                        'dashboard',
                        'Dashboard layout validation',
                        False,
                        "Dashboard has no mosaic layout"
                    )
        
        except Exception as e:
            self.log_test_result(
                'dashboard',
                'Dashboard access',
                False,
                f"Error accessing dashboard: {e}"
            )
    
    def test_budget_alerts(self) -> None:
        """Test budget alerts configuration."""
        print("\n💰 Testing Budget Alerts...")
        
        try:
            from google.cloud import billing
            
            # Get billing account
            billing_client = billing.CloudBillingClient()
            project_billing = billing_client.get_project_billing_info(
                name=f"projects/{self.project_id}"
            )
            
            if not project_billing.billing_enabled:
                self.log_test_result(
                    'budgets',
                    'Billing enabled',
                    False,
                    "Billing is not enabled for this project"
                )
                return
            
            self.log_test_result(
                'budgets',
                'Billing enabled',
                True,
                "Project has billing enabled"
            )
            
            # Check for budgets (this requires the billing budgets API)
            try:
                budgets_client = billing_budgets_v1.BudgetServiceClient()
                billing_account = project_billing.billing_account_name
                
                budgets = budgets_client.list_budgets(parent=billing_account)
                budget_list = list(budgets)
                
                dressup_budgets = [
                    budget for budget in budget_list
                    if 'DressUp AI' in budget.display_name
                ]
                
                self.log_test_result(
                    'budgets',
                    'Budget alerts existence',
                    len(dressup_budgets) > 0,
                    f"Found {len(dressup_budgets)} DressUp AI budget(s)"
                )
                
                # Validate budget configuration
                for budget in dressup_budgets:
                    threshold_count = len(budget.threshold_rules)
                    self.log_test_result(
                        'budgets',
                        f'Budget threshold configuration - {budget.display_name}',
                        threshold_count >= 4,  # Expect at least 4 thresholds
                        f"Has {threshold_count} threshold rules"
                    )
                
            except Exception as e:
                self.log_test_result(
                    'budgets',
                    'Budget alerts access',
                    False,
                    f"Error accessing budgets: {e}"
                )
        
        except Exception as e:
            self.log_test_result(
                'budgets',
                'Billing API access',
                False,
                f"Error accessing billing API: {e}"
            )
    
    def test_end_to_end_flow(self) -> None:
        """Test end-to-end monitoring flow if possible."""
        print("\n🔄 Testing End-to-End Monitoring Flow...")
        
        # This would require actual application traffic
        # For now, we'll just validate the pipeline structure
        
        pipeline_components = [
            ('Cloud Functions', 'structured_logging'),
            ('Log-based Metrics', 'log_metrics'),
            ('Monitoring Dashboard', 'dashboard'),
            ('Budget Alerts', 'budgets')
        ]
        
        working_components = []
        for component_name, category in pipeline_components:
            if self.results[category]['passed'] > 0:
                working_components.append(component_name)
        
        self.log_test_result(
            'overall',
            'Monitoring pipeline completeness',
            len(working_components) >= 3,  # At least 3 components working
            f"Working components: {', '.join(working_components)}"
        )
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate a comprehensive validation report."""
        
        total_tests = self.results['overall']['passed'] + self.results['overall']['failed']
        success_rate = (self.results['overall']['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            'project_id': self.project_id,
            'validation_timestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'overall_status': 'PASS' if success_rate >= 75 else 'FAIL',
            'success_rate': f"{success_rate:.1f}%",
            'total_tests': total_tests,
            'passed_tests': self.results['overall']['passed'],
            'failed_tests': self.results['overall']['failed'],
            'categories': {}
        }
        
        for category in ['structured_logging', 'log_metrics', 'dashboard', 'budgets']:
            category_total = self.results[category]['passed'] + self.results[category]['failed']
            category_success = (self.results[category]['passed'] / category_total * 100) if category_total > 0 else 0
            
            report['categories'][category] = {
                'status': 'PASS' if category_success >= 75 else 'FAIL',
                'success_rate': f"{category_success:.1f}%",
                'passed': self.results[category]['passed'],
                'failed': self.results[category]['failed'],
                'tests': self.results[category]['tests']
            }
        
        return report
    
    def run_validation(self) -> Dict[str, Any]:
        """Run complete validation suite."""
        print(f"🔍 Starting DressUp AI Monitoring Validation")
        print(f"📍 Project: {self.project_id}")
        print("=" * 60)
        
        # Run all test suites
        self.test_structured_logging()
        self.test_log_metrics()
        self.test_dashboard()
        self.test_budget_alerts()
        self.test_end_to_end_flow()
        
        # Generate report
        report = self.generate_validation_report()
        
        print("\n" + "=" * 60)
        print("📋 VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Overall Status: {'🟢 PASS' if report['overall_status'] == 'PASS' else '🔴 FAIL'}")
        print(f"Success Rate: {report['success_rate']}")
        print(f"Tests Passed: {report['passed_tests']}/{report['total_tests']}")
        print()
        
        for category, data in report['categories'].items():
            status_emoji = "🟢" if data['status'] == 'PASS' else "🔴"
            category_name = category.replace('_', ' ').title()
            print(f"{status_emoji} {category_name}: {data['success_rate']} ({data['passed']}/{data['passed'] + data['failed']})")
        
        print()
        
        if report['overall_status'] == 'PASS':
            print("🎉 Monitoring pipeline validation successful!")
            print("✅ Your DressUp AI monitoring system is ready for production.")
        else:
            print("⚠️  Monitoring pipeline needs attention.")
            print("📋 Review failed tests and ensure all components are properly deployed.")
        
        return report

def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(description='Validate DressUp AI monitoring pipeline')
    parser.add_argument('project_id', help='GCP Project ID')
    parser.add_argument('--report-file', help='Save validation report to file')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    try:
        validator = MonitoringValidator(args.project_id)
        report = validator.run_validation()
        
        # Save report if requested
        if args.report_file:
            with open(args.report_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"\n📄 Validation report saved to: {args.report_file}")
        
        # Exit with appropriate code
        sys.exit(0 if report['overall_status'] == 'PASS' else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Validation failed with error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()