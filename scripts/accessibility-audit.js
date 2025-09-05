const { chromium } = require('playwright');
const { injectAxe, checkA11y, getViolations, reportViolations } = require('axe-playwright');

const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 }
];

const pages = [
  { name: 'Home', path: '/' },
];

async function runAccessibilityAudit() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const violations = {};
  
  console.log('🔍 Starting Accessibility Audit...\n');
  
  for (const viewport of viewports) {
    console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize(viewport);
    
    for (const pageInfo of pages) {
      const url = `http://localhost:3000${pageInfo.path}`;
      console.log(`  📄 Checking ${pageInfo.name} page...`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await injectAxe(page);
        
        const results = await getViolations(page, null, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
          }
        });
        
        const key = `${viewport.name}-${pageInfo.name}`;
        violations[key] = results;
        
        if (results.length > 0) {
          console.log(`    ⚠️  Found ${results.length} issues`);
        } else {
          console.log(`    ✅ No issues found`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
    console.log('');
  }
  
  // Generate detailed report
  console.log('📊 Generating Detailed Report...\n');
  
  let totalViolations = 0;
  let criticalCount = 0;
  let seriousCount = 0;
  let moderateCount = 0;
  let minorCount = 0;
  
  const uniqueViolations = new Map();
  
  for (const [key, results] of Object.entries(violations)) {
    for (const violation of results) {
      totalViolations++;
      
      // Track unique violations
      if (!uniqueViolations.has(violation.id)) {
        uniqueViolations.set(violation.id, {
          ...violation,
          pages: []
        });
      }
      uniqueViolations.get(violation.id).pages.push(key);
      
      // Count by severity
      switch (violation.impact) {
        case 'critical':
          criticalCount++;
          break;
        case 'serious':
          seriousCount++;
          break;
        case 'moderate':
          moderateCount++;
          break;
        case 'minor':
          minorCount++;
          break;
      }
    }
  }
  
  console.log('='.repeat(60));
  console.log('ACCESSIBILITY AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Issues Found: ${totalViolations}`);
  console.log(`Unique Issue Types: ${uniqueViolations.size}`);
  console.log('');
  console.log('By Severity:');
  console.log(`  🔴 Critical: ${criticalCount}`);
  console.log(`  🟠 Serious: ${seriousCount}`);
  console.log(`  🟡 Moderate: ${moderateCount}`);
  console.log(`  🟢 Minor: ${minorCount}`);
  console.log('');
  
  if (uniqueViolations.size > 0) {
    console.log('='.repeat(60));
    console.log('DETAILED VIOLATIONS');
    console.log('='.repeat(60));
    
    // Sort by impact severity
    const sortedViolations = Array.from(uniqueViolations.values()).sort((a, b) => {
      const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return severityOrder[a.impact] - severityOrder[b.impact];
    });
    
    for (const violation of sortedViolations) {
      const impactEmoji = {
        critical: '🔴',
        serious: '🟠',
        moderate: '🟡',
        minor: '🟢'
      }[violation.impact];
      
      console.log(`\n${impactEmoji} [${violation.impact.toUpperCase()}] ${violation.help}`);
      console.log(`   ID: ${violation.id}`);
      console.log(`   Description: ${violation.description}`);
      console.log(`   WCAG: ${violation.tags.join(', ')}`);
      console.log(`   Help: ${violation.helpUrl}`);
      console.log(`   Found on: ${violation.pages.join(', ')}`);
      console.log(`   Elements affected: ${violation.nodes.length}`);
      
      // Show first few affected elements
      violation.nodes.slice(0, 3).forEach(node => {
        console.log(`     - ${node.target}`);
        if (node.failureSummary) {
          console.log(`       Fix: ${node.failureSummary}`);
        }
      });
      
      if (violation.nodes.length > 3) {
        console.log(`     ... and ${violation.nodes.length - 3} more`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (criticalCount > 0) {
    console.log('🔴 CRITICAL: Address critical issues immediately:');
    console.log('   - These prevent users from accessing core functionality');
    console.log('   - May result in legal compliance issues');
  }
  
  if (seriousCount > 0) {
    console.log('🟠 SERIOUS: Fix serious issues before deployment:');
    console.log('   - Significant barriers for users with disabilities');
    console.log('   - Impact user experience severely');
  }
  
  if (moderateCount > 0) {
    console.log('🟡 MODERATE: Address moderate issues soon:');
    console.log('   - Create frustration for some users');
    console.log('   - Should be fixed but not blocking');
  }
  
  if (minorCount > 0) {
    console.log('🟢 MINOR: Fix minor issues when possible:');
    console.log('   - Small improvements to accessibility');
    console.log('   - Best practice violations');
  }
  
  if (totalViolations === 0) {
    console.log('✅ Excellent! No accessibility violations found.');
    console.log('   Continue following best practices:');
    console.log('   - Test with real screen readers');
    console.log('   - Conduct user testing with people with disabilities');
    console.log('   - Stay updated with WCAG guidelines');
  }
  
  await browser.close();
  
  // Return status code based on violations
  process.exit(criticalCount > 0 ? 1 : 0);
}

runAccessibilityAudit().catch(console.error);