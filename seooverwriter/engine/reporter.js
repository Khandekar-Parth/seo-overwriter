/**
 * Seo Overiter - Executive & Technical Report Generation Service
 * Generates comprehensive audit reports in JSON, Markdown (.md), and Standalone HTML formats.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Clean domain name for filenames
 */
export function sanitizeDomain(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  } catch {
    return 'audit_target';
  }
}

/**
 * 1. JSON Report Builder
 * Standardized, machine-readable JSON structure with metadata, scores, matrix, and modules.
 */
export function buildJsonReport(auditData, options = {}) {
  const { agency = 'Seo Overiter Agency', client = 'Executive Client' } = options;

  return {
    meta: {
      generator: 'Seo Overiter Diagnostic Engine v2.4',
      generatedAt: new Date().toISOString(),
      agency,
      client,
      targetUrl: auditData.url,
      httpStatus: auditData.status,
      ttfbMs: auditData.ttfb,
      pageMeta: auditData.pageMeta || {}
    },
    executiveSummary: {
      overallHealthScore: auditData.scores.totalScore,
      letterGrade: auditData.scores.grade,
      gradeDescription: auditData.scores.gradeText,
      dimensions: auditData.scores.dimensions
    },
    actionMatrix: {
      summary: {
        quickWinsCount: auditData.scores.matrix.quickWins.length,
        majorProjectsCount: auditData.scores.matrix.majorProjects.length,
        fillInsCount: auditData.scores.matrix.fillIns.length,
        lowPriorityCount: auditData.scores.matrix.lowPriority.length
      },
      quickWins: auditData.scores.matrix.quickWins,
      majorProjects: auditData.scores.matrix.majorProjects,
      fillIns: auditData.scores.matrix.fillIns,
      lowPriority: auditData.scores.matrix.lowPriority
    },
    diagnosticModules: auditData.modules.map(mod => ({
      id: mod.id,
      index: mod.index,
      category: mod.category,
      name: mod.name,
      score: mod.score,
      status: mod.status,
      metric: mod.metric,
      issueCount: mod.issues ? mod.issues.length : 0,
      issues: mod.issues || [],
      recommendedFix: mod.fix || null
    }))
  };
}

/**
 * 2. Markdown Report Builder
 * Professional, GitHub/Notion-ready Markdown document with tables and code blocks.
 */
export function buildMarkdownReport(auditData, options = {}) {
  const { agency = 'Seo Overiter Agency', client = 'Valued Client' } = options;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dims = auditData.scores.dimensions;

  let md = `# SEO Audit & Technical Diagnostic Report\n\n`;
  md += `**Target Website**: [${auditData.url}](${auditData.url})\n`;
  md += `**Prepared For**: ${client}\n`;
  md += `**Auditing Agency**: ${agency}\n`;
  md += `**Date of Audit**: ${dateStr}\n`;
  md += `**Engine**: Seo Overiter Googlebot Telemetry Crawler v2.4\n\n`;

  md += `---\n\n`;
  md += `## 🏆 Executive Summary\n\n`;
  md += `| Metric | Result | Target Standard |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Overall Health Score** | **${auditData.scores.totalScore} / 100** | $\\ge 85$ |\n`;
  md += `| **SEO Grade** | **${auditData.scores.grade}** (${auditData.scores.gradeText}) | Grade A / A+ |\n`;
  md += `| **Initial TTFB** | **${auditData.ttfb} ms** | $\\le 200$ ms |\n`;
  md += `| **HTTP Status Code** | **${auditData.status} OK** | 200 OK |\n\n`;

  md += `### Categorical Dimension Scores\n\n`;
  md += `- **Technical Crawlability & Directives (25%)**: ${dims.technical.score}/100\n`;
  md += `- **Speed & Core Web Vitals (20%)**: ${dims.speed.score}/100\n`;
  md += `- **On-Page & Semantic Architecture (20%)**: ${dims.onpage.score}/100\n`;
  md += `- **Content Quality & Information Gain (20%)**: ${dims.content.score}/100\n`;
  md += `- **Security & Trust Signals (15%)**: ${dims.trust.score}/100\n\n`;

  md += `---\n\n`;
  md += `## 🎯 4-Quadrant Impact vs. Effort Action Matrix\n\n`;

  md += `### 1. 🚀 Quick Wins (High Impact • Low Effort)\n`;
  if (auditData.scores.matrix.quickWins.length === 0) {
    md += `*No critical quick wins detected. Great job!*\n\n`;
  } else {
    auditData.scores.matrix.quickWins.forEach(item => {
      md += `- **${item.title}** (${item.impact} / ${item.effort})\n`;
      if (item.fix) md += `  \`\`\`html\n  ${item.fix}\n  \`\`\`\n`;
    });
    md += `\n`;
  }

  md += `### 2. 🏗️ Major Projects (High Impact • High Effort)\n`;
  if (auditData.scores.matrix.majorProjects.length === 0) {
    md += `*No critical major projects outstanding.*\n\n`;
  } else {
    auditData.scores.matrix.majorProjects.forEach(item => {
      md += `- **${item.title}** (${item.impact} / ${item.effort})\n`;
    });
    md += `\n`;
  }

  md += `### 3. ☕ Fill-Ins (Low Impact • Low Effort)\n`;
  if (auditData.scores.matrix.fillIns.length === 0) {
    md += `*None.*\n\n`;
  } else {
    auditData.scores.matrix.fillIns.forEach(item => {
      md += `- **${item.title}** (${item.impact} / ${item.effort})\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 📋 Detailed 25-Module Diagnostic Breakdown\n\n`;

  auditData.modules.forEach(mod => {
    const statusIcon = mod.status === 'pass' ? '🟢 PASS' : mod.status === 'warn' ? '🟡 WARN' : '🔴 CRIT';
    md += `### ${mod.index}. ${mod.name} [${statusIcon}]\n\n`;
    md += `- **Category**: ${mod.category.toUpperCase()}\n`;
    md += `- **Metric Readout**: ${mod.metric}\n`;
    md += `- **Module Score**: ${mod.score}/100\n`;

    if (mod.issues && mod.issues.length > 0) {
      md += `\n**Identified Issues:**\n`;
      mod.issues.forEach(iss => {
        md += `- ${iss.severity === 'critical' ? '🔴' : '⚠️'} ${iss.message}\n`;
      });
    }

    if (mod.fix) {
      md += `\n**Recommended Developer Code Fix:**\n\`\`\`html\n${mod.fix}\n\`\`\`\n`;
    }
    md += `\n`;
  });

  md += `---\n*Generated automatically by Seo Overiter - Enterprise SEO Telemetry Suite.*\n`;
  return md;
}

/**
 * 3. Standalone Self-Contained HTML Report Builder
 * An ultra-modern, responsive HTML document with embedded styles, printable to PDF (@media print).
 */
export function buildStandaloneHtmlReport(auditData, options = {}) {
  const {
    agency = 'Seo Overiter Agency',
    client = 'Executive Client',
    brandColor = '#6366f1'
  } = options;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dims = auditData.scores.dimensions;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${auditData.url} | ${agency}</title>
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: #12141c;
      --card-border: #1e2230;
      --brand: ${brandColor};
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --pass: #10b981;
      --warn: #f59e0b;
      --crit: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 2.5rem 1.5rem;
    }
    .report-wrap {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header-banner {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 2.5rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .agency-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: 0.5rem;
    }
    .report-title {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }
    .target-url {
      font-family: monospace;
      color: var(--text-muted);
      font-size: 14px;
    }
    .score-circle {
      text-align: center;
      background: var(--card-bg);
      border: 2px solid var(--pass);
      border-radius: 16px;
      padding: 1.5rem 2.5rem;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.2);
    }
    .score-num {
      font-size: 3rem;
      font-weight: 900;
      color: var(--pass);
      font-family: monospace;
      line-height: 1;
    }
    .score-sub {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1.5rem;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dim-row {
      margin-bottom: 0.85rem;
    }
    .dim-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .bar-track {
      height: 8px;
      background: #1e2230;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .matrix-box {
      border-left: 3px solid var(--brand);
      padding-left: 12px;
      margin-bottom: 12px;
    }
    .matrix-title {
      font-weight: 600;
      font-size: 14px;
    }
    .matrix-desc {
      font-size: 12px;
      color: var(--text-muted);
    }
    .module-item {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .mod-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: monospace;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: var(--pass); border: 1px solid var(--pass); }
    .badge-warn { background: rgba(245, 158, 11, 0.2); color: var(--warn); border: 1px solid var(--warn); }
    .badge-crit { background: rgba(239, 68, 68, 0.2); color: var(--crit); border: 1px solid var(--crit); }
    pre {
      background: #06070a;
      border: 1px solid #1f2433;
      border-radius: 6px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      color: #93c5fd;
      margin-top: 8px;
    }
    .btn-print {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--brand);
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .header-banner, .card, .module-item { border: 1px solid #ddd; background: #fff; color: #000; }
      .score-circle { border-color: #000; box-shadow: none; }
      .score-num { color: #000; }
      .btn-print { display: none; }
      .bar-track { background: #eee; }
      pre { background: #f8f9fa; color: #222; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="report-wrap">
    <header class="header-banner">
      <div>
        <div class="agency-name">${agency}</div>
        <h1 class="report-title">Website SEO Diagnostic Report</h1>
        <div class="target-url">Audit Target: <strong>${auditData.url}</strong></div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Prepared for: ${client} • Date: ${dateStr}</div>
      </div>
      <div class="score-circle">
        <div class="score-num">${auditData.scores.totalScore}</div>
        <div class="score-sub">Grade ${auditData.scores.grade} (${auditData.scores.gradeText})</div>
      </div>
    </header>

    <div class="grid-2">
      <!-- Dimensions -->
      <div class="card">
        <div class="card-title">Categorical Dimension Health</div>

        <div class="dim-row">
          <div class="dim-header">
            <span>Technical Crawlability (25%)</span>
            <strong>${dims.technical.score}/100</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${dims.technical.score}%; background: #10b981;"></div></div>
        </div>

        <div class="dim-row">
          <div class="dim-header">
            <span>Speed & Core Web Vitals (20%)</span>
            <strong>${dims.speed.score}/100</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${dims.speed.score}%; background: #f59e0b;"></div></div>
        </div>

        <div class="dim-row">
          <div class="dim-header">
            <span>On-Page & Architecture (20%)</span>
            <strong>${dims.onpage.score}/100</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${dims.onpage.score}%; background: #10b981;"></div></div>
        </div>

        <div class="dim-row">
          <div class="dim-header">
            <span>Content & E-E-A-T (20%)</span>
            <strong>${dims.content.score}/100</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${dims.content.score}%; background: #f59e0b;"></div></div>
        </div>

        <div class="dim-row">
          <div class="dim-header">
            <span>Security & Trust Policies (15%)</span>
            <strong>${dims.trust.score}/100</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${dims.trust.score}%; background: #10b981;"></div></div>
        </div>
      </div>

      <!-- Quick Action Summary -->
      <div class="card">
        <div class="card-title">Top Priority Quick Wins</div>
        ${auditData.scores.matrix.quickWins.slice(0, 3).map(w => `
          <div class="matrix-box" style="border-color: #10b981;">
            <div class="matrix-title">${w.title}</div>
            <div class="matrix-desc">Impact: ${w.impact} • Effort: ${w.effort}</div>
          </div>
        `).join('')}

        <div class="card-title" style="margin-top: 1.5rem;">Major Strategic Projects</div>
        ${auditData.scores.matrix.majorProjects.slice(0, 2).map(m => `
          <div class="matrix-box" style="border-color: var(--brand);">
            <div class="matrix-title">${m.title}</div>
            <div class="matrix-desc">Impact: ${m.impact} • Effort: ${m.effort}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Detailed 25 Modules Section -->
    <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 1rem;">Complete 25-Point Diagnostic Pipeline</h2>
    ${auditData.modules.map(mod => `
      <div class="module-item">
        <div class="mod-header">
          <div>
            <strong>#${mod.index}. ${mod.name}</strong>
            <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">(${mod.category.toUpperCase()})</span>
          </div>
          <span class="badge badge-${mod.status}">${mod.status.toUpperCase()} • ${mod.score}/100</span>
        </div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">Metric: ${mod.metric}</div>
        ${mod.issues && mod.issues.length ? `
          <div style="font-size: 13px; color: #f87171; margin-bottom: 6px;">
            ${mod.issues.map(iss => `<div>• ${iss.message}</div>`).join('')}
          </div>
        ` : '<div style="font-size: 13px; color: #34d399;">✓ Passed all checks with no bottlenecks.</div>'}
        ${mod.fix ? `<pre>${escapeHtml(mod.fix)}</pre>` : ''}
      </div>
    `).join('')}

    <footer style="margin-top: 3rem; text-align: center; font-size: 12px; color: var(--text-muted);">
      Report generated by <strong>Seo Overiter</strong> • Powered by ${agency}
    </footer>
  </div>

  <button class="btn-print" onclick="window.print()">🖨️ Print or Save as PDF</button>
</body>
</html>`;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 4. File Persistence Service
 * Saves the report into the server's `reports/` folder.
 */
export function saveReportToDisk(auditData, format = 'json', options = {}) {
  const domain = sanitizeDomain(auditData.url);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `report_${domain}_${timestamp}.${format}`;
  const filepath = path.join(REPORTS_DIR, filename);

  let content = '';
  if (format === 'json') {
    content = JSON.stringify(buildJsonReport(auditData, options), null, 2);
  } else if (format === 'md') {
    content = buildMarkdownReport(auditData, options);
  } else if (format === 'html') {
    content = buildStandaloneHtmlReport(auditData, options);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  fs.writeFileSync(filepath, content, 'utf8');
  return {
    filename,
    filepath,
    urlPath: `/reports/${filename}`,
    format,
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    timestamp: new Date().toISOString()
  };
}

/**
 * List all saved reports in `reports/`
 */
export function listSavedReports() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  const files = fs.readdirSync(REPORTS_DIR);
  return files
    .filter(f => f.startsWith('report_'))
    .map(f => {
      const stat = fs.statSync(path.join(REPORTS_DIR, f));
      return {
        filename: f,
        urlPath: `/reports/${f}`,
        sizeBytes: stat.size,
        createdAt: stat.birthtime
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}
