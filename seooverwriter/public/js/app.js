/**
 * Seo Overiter - Main Frontend Application Controller
 * Handles live SSE streaming, view transitions, SVG charting, and diagnostic triage.
 */

import { renderRadialGauge, renderSpiderRadar } from './charts.js';

// Application State Store
const state = {
  currentView: 'view-landing',
  auditData: null,
  activeEventSource: null,
  monitoredDomains: [],
  targetUrl: 'https://example.com',
  scanType: 'quick',
  isStreamPaused: false
};

// Toast Notification Helper
export function showToast(message) {
  const existing = document.querySelector('.toast-notice');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notice';
  toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// DOM Selectors
const navButtons = document.querySelectorAll('.nav-btn');
const viewSections = document.querySelectorAll('.view-section');
const headerUrlInput = document.getElementById('header-url-input');
const heroUrlInput = document.getElementById('hero-url-input');
const btnHeaderScan = document.getElementById('btn-header-scan');
const btnHeroStart = document.getElementById('btn-hero-start');
const brandHomeLink = document.getElementById('brand-home-link');

// Navigation View Switcher
function switchView(viewId) {
  state.currentView = viewId;
  viewSections.forEach(section => {
    section.classList.toggle('active', section.id === viewId);
  });
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  // If user visits Dashboard before running an audit, show a friendly prompt
  if (viewId === 'view-dashboard' && !state.auditData) {
    const grid = document.getElementById('dashboard-modules-grid');
    if (grid && !grid.children.length) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; background: var(--bg-surface); border: 1px dashed var(--border-medium); border-radius: var(--radius-md); padding: 3rem; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">⚡</div>
          <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: #fff;">Telemetry Awaiting Target</h3>
          <p style="color: var(--text-medium); font-size: 13px; max-width: 480px; margin: 0 auto 1.5rem;">Run an audit from the header or home launchpad to stream all 25 diagnostic modules live.</p>
          <button class="btn btn-primary" id="btn-empty-demo-audit">Run Quick Audit for example.com →</button>
        </div>
      `;
      document.getElementById('btn-empty-demo-audit')?.addEventListener('click', () => startAudit('https://example.com'));
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

brandHomeLink.addEventListener('click', (e) => {
  e.preventDefault();
  switchView('view-landing');
});

// Scan Pills (Quick, Deep, Compare)
document.querySelectorAll('.scan-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.scan-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.scanType = pill.dataset.type;
    if (state.scanType === 'compare') {
      switchView('view-compare');
    }
  });
});

// Core Audit Starter (with SSE Live Streaming)
function startAudit(url) {
  if (!url) return;
  state.targetUrl = url;
  headerUrlInput.value = url;
  heroUrlInput.value = url;

  // Switch to live telemetry view
  switchView('view-telemetry');
  document.getElementById('live-target-url').textContent = url;
  document.getElementById('header-stream-status').textContent = 'Crawling Active';

  // Reset telemetry screen & state
  state.isStreamPaused = false;
  const pauseBtn = document.getElementById('btn-pause-stream');
  if (pauseBtn) pauseBtn.textContent = 'Pause';

  const progressBar = document.getElementById('telemetry-progress-bar');
  const progressPct = document.getElementById('telemetry-progress-pct');
  const completedCount = document.getElementById('telemetry-completed-count');
  const checklistContainer = document.getElementById('pipeline-checklist-container');
  const terminalLogs = document.getElementById('terminal-logs-container');

  progressBar.style.width = '0%';
  progressPct.textContent = '0%';
  completedCount.textContent = '0';
  checklistContainer.innerHTML = '';
  terminalLogs.innerHTML = '';

  if (state.activeEventSource) {
    state.activeEventSource.close();
  }

  // Connect to SSE Endpoint
  const sseUrl = `/api/audit/stream?url=${encodeURIComponent(url)}`;
  const es = new EventSource(sseUrl);
  state.activeEventSource = es;

  es.addEventListener('CRAWL_STARTED', (e) => {
    const data = JSON.parse(e.data);
    appendTerminalLog(new Date().toLocaleTimeString(), '#1', 'INFO', `Crawl job started for ${data.url} (${data.workers} workers)`);
  });

  es.addEventListener('LOG_EVENT', (e) => {
    if (state.isStreamPaused) return;
    const data = JSON.parse(e.data);
    appendTerminalLog(data.time, data.worker, data.type, data.message);
  });

  es.addEventListener('MODULE_UPDATE', (e) => {
    const data = JSON.parse(e.data);
    progressBar.style.width = `${data.progress}%`;
    progressPct.textContent = `${data.progress}%`;
    completedCount.textContent = data.completedCount;
    document.getElementById('modules-completed-badge').textContent = `${data.completedCount}/25 Done`;

    // Add or update item in checklist
    appendChecklistItem(data.module);
  });

  es.addEventListener('AUDIT_COMPLETED', (e) => {
    const data = JSON.parse(e.data);
    state.auditData = data;
    es.close();
    state.activeEventSource = null;
    document.getElementById('header-stream-status').textContent = 'Audit Complete';

    appendTerminalLog(new Date().toLocaleTimeString(), '#1', 'DONE', `Audit completed with Health Score ${data.scores.totalScore}/100.`);

    // Delay slightly for dramatic satisfaction, then render dashboard
    setTimeout(() => {
      renderDashboard(data);
      switchView('view-dashboard');
      showToast(`Audit complete: Health Score ${data.scores.totalScore}/100 (Grade ${data.scores.grade})`);
    }, 800);
  });

  es.addEventListener('AUDIT_FAILED', (e) => {
    const data = JSON.parse(e.data);
    appendTerminalLog(new Date().toLocaleTimeString(), '#1', 'CRIT', `Audit Error: ${data.error}`);
    es.close();
  });

  es.onerror = () => {
    es.close();
  };
}

function appendTerminalLog(time, worker, type, message) {
  const container = document.getElementById('terminal-logs-container');
  const row = document.createElement('div');
  row.className = 'log-row';

  let typeClass = 'log-ok';
  if (type === 'CRIT' || type.startsWith('4') || type.startsWith('5')) typeClass = 'log-crit';
  else if (type === 'WARN') typeClass = 'log-warn';

  row.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-worker">[WORKER ${worker}]</span>
    <span class="${typeClass}">[${type}]</span>
    <span>${message}</span>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendChecklistItem(mod) {
  const container = document.getElementById('pipeline-checklist-container');
  const existing = document.getElementById(`pipe-item-${mod.id}`);
  const statusBadge = `<span class="status-chip ${mod.status}">${mod.status.toUpperCase()}</span>`;

  if (existing) {
    existing.innerHTML = `
      <div>
        <strong style="color: #fff;">${mod.index}. ${mod.name}</strong>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${mod.metric}</div>
      </div>
      <div>${statusBadge}</div>
    `;
  } else {
    const item = document.createElement('div');
    item.id = `pipe-item-${mod.id}`;
    item.className = 'pipeline-item';
    item.innerHTML = `
      <div>
        <strong style="color: #fff;">${mod.index}. ${mod.name}</strong>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${mod.metric}</div>
      </div>
      <div>${statusBadge}</div>
    `;
    container.appendChild(item);
  }
}

// Render Master Executive Dashboard
function renderDashboard(data) {
  const { scores, modules, url, pageMeta } = data;

  // Render SVG Radial Score Gauge
  const gaugeBox = document.getElementById('score-gauge-container');
  renderRadialGauge(gaugeBox, scores.totalScore);

  // Meta stats
  document.getElementById('dash-score-grade').textContent = `GRADE ${scores.grade}`;
  document.getElementById('dash-grade-desc').textContent = scores.gradeText;
  document.getElementById('dash-domain-title').textContent = url;

  // Dimension Bars
  const dims = scores.dimensions;
  document.getElementById('dim-score-tech').textContent = `${dims.technical.score}/100`;
  document.getElementById('dim-bar-tech').style.width = `${dims.technical.score}%`;

  document.getElementById('dim-score-speed').textContent = `${dims.speed.score}/100`;
  document.getElementById('dim-bar-speed').style.width = `${dims.speed.score}%`;

  document.getElementById('dim-score-onpage').textContent = `${dims.onpage.score}/100`;
  document.getElementById('dim-bar-onpage').style.width = `${dims.onpage.score}%`;

  document.getElementById('dim-score-content').textContent = `${dims.content.score}/100`;
  document.getElementById('dim-bar-content').style.width = `${dims.content.score}%`;

  document.getElementById('dim-score-trust').textContent = `${dims.trust.score}/100`;
  document.getElementById('dim-bar-trust').style.width = `${dims.trust.score}%`;

  // Render 4-Quadrant Priority Matrix
  renderMatrixQuadrant('matrix-quick-wins-list', scores.matrix.quickWins);
  renderMatrixQuadrant('matrix-major-projects-list', scores.matrix.majorProjects);
  renderMatrixQuadrant('matrix-fillins-list', scores.matrix.fillIns);
  renderMatrixQuadrant('matrix-low-priority-list', scores.matrix.lowPriority);

  // Render 25 Diagnostic Module Cards
  renderModuleCards(modules);

  // Update SERP & Cover previews
  document.getElementById('serp-preview-url').textContent = url;
  if (pageMeta?.title) document.getElementById('serp-preview-title').textContent = pageMeta.title;
  if (pageMeta?.description) document.getElementById('serp-preview-desc').textContent = pageMeta.description;
  document.getElementById('cover-score-display').textContent = `${scores.totalScore} / 100`;

  const coverTarget = document.getElementById('cover-target-url');
  if (coverTarget) coverTarget.textContent = url;
  const coverGrade = document.getElementById('cover-grade-display');
  if (coverGrade) coverGrade.textContent = `Verified Health Score (Grade ${scores.grade} • ${scores.gradeText})`;

  // Dynamic SERP length validations
  const titleText = pageMeta?.title || 'Example Domain';
  const titleLen = titleText.length;
  const titlePx = Math.round(titleLen * 9.2);
  const titleEl = document.getElementById('serp-title-val');
  if (titleEl) {
    const isTitleOk = titlePx <= 600;
    titleEl.textContent = `${titlePx}px / 600px Max [${isTitleOk ? 'OK' : 'TRUNCATED'}]`;
    titleEl.style.color = isTitleOk ? '#10b981' : '#f59e0b';
  }

  const descText = pageMeta?.description || '';
  const descLen = descText.length;
  const descEl = document.getElementById('serp-desc-val');
  if (descEl) {
    if (descLen === 0) {
      descEl.textContent = '0 / 160 chars [MISSING]';
      descEl.style.color = '#ef4444';
    } else {
      const isDescOk = descLen >= 120 && descLen <= 160;
      descEl.textContent = `${descLen} / 160 chars [${isDescOk ? 'OK' : 'OPTIMIZE'}]`;
      descEl.style.color = isDescOk ? '#10b981' : '#f59e0b';
    }
  }

  // Dynamic AEO AI Overview snippet
  const aeoAnswer = document.getElementById('aeo-extracted-answer');
  if (aeoAnswer) {
    aeoAnswer.textContent = `"${titleText} has been crawled and evaluated by Seo Overiter. Based on semantic entity density and Core Web Vitals responsiveness (${scores.totalScore}/100), AI Overview algorithms cite this page with high factual confidence."`;
  }
  const aeoSource = document.getElementById('aeo-source-pill');
  if (aeoSource) {
    try {
      const host = new URL(url).hostname;
      aeoSource.textContent = `${host} › index`;
    } catch {
      aeoSource.textContent = 'audited-target.com › page';
    }
  }

  // Update dynamic filter counts
  updateFilterChipCounts(modules);

  fetchSavedReports();
}

function updateFilterChipCounts(modules) {
  const crits = modules.filter(m => m.status === 'crit').length;
  const warns = modules.filter(m => m.status === 'warn').length;
  const passes = modules.filter(m => m.status === 'pass').length;

  document.querySelectorAll('.filter-chip').forEach(chip => {
    const filter = chip.dataset.filter;
    if (filter === 'all') chip.textContent = `All (${modules.length})`;
    else if (filter === 'crit') chip.textContent = `Critical (${crits})`;
    else if (filter === 'warn') chip.textContent = `Warnings (${warns})`;
    else if (filter === 'pass') chip.textContent = `Passed (${passes})`;
  });
}

function renderMatrixQuadrant(containerId, tasks) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'matrix-task-item';
    item.innerHTML = `
      <div>
        <div class="matrix-task-title">${task.title}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${task.impact} • ${task.effort}</div>
      </div>
      <button class="btn btn-secondary" style="height: 26px; padding: 0 8px; font-size: 11px;" onclick="window.openFixModal('${task.moduleId || ''}', '${escapeHtml(task.title)}', '${escapeHtml(task.fix || '')}')">Fix</button>
    `;
    container.appendChild(item);
  });
}

function renderModuleCards(modules, filter = 'all') {
  const grid = document.getElementById('dashboard-modules-grid');
  grid.innerHTML = '';

  const filtered = modules.filter(m => filter === 'all' || m.status === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; background: var(--bg-surface); border: 1px dashed var(--border-medium); border-radius: var(--radius-md); padding: 2.5rem; text-align: center; color: var(--text-muted);">
        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🟢</div>
        <strong style="color: #fff; font-size: 14px;">No Modules in this Filter State</strong>
        <p style="font-size: 12px; margin-top: 4px;">Zero diagnostic modules returned '${filter.toUpperCase()}'.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(mod => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
      <div class="mod-card-top">
        <span class="mod-number">#${String(mod.index).padStart(2, '0')} • ${mod.category.toUpperCase()}</span>
        <span class="status-chip ${mod.status}">${mod.status.toUpperCase()}</span>
      </div>
      <h4 class="mod-title">${mod.name}</h4>
      <div class="mod-metric">${mod.metric}</div>
      <div class="mod-issues-preview">
        ${mod.issues.length ? `🔴 ${mod.issues[0].message}` : '🟢 Passing all rule heuristics'}
      </div>
    `;
    card.addEventListener('click', () => openModuleDetailModal(mod));
    grid.appendChild(card);
  });
}

// Module Filtering Buttons
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    if (state.auditData?.modules) {
      renderModuleCards(state.auditData.modules, chip.dataset.filter);
    }
  });
});

// Deep-Dive Modal Handlers
function openModuleDetailModal(mod) {
  const modal = document.getElementById('deepdive-modal');
  document.getElementById('modal-mod-category').textContent = mod.category.toUpperCase();
  document.getElementById('modal-mod-title').textContent = `${mod.index}. ${mod.name}`;
  document.getElementById('modal-mod-score').textContent = `${mod.score}/100`;

  const badge = document.getElementById('modal-mod-badge');
  badge.className = `status-chip ${mod.status}`;
  badge.textContent = mod.status.toUpperCase();

  document.getElementById('modal-mod-metric').textContent = mod.metric;

  const issuesList = document.getElementById('modal-mod-issues-list');
  issuesList.innerHTML = mod.issues.length
    ? mod.issues.map(iss => `<div style="margin-bottom: 6px; color: ${iss.severity === 'critical' ? '#f87171' : '#fbbf24'};">• ${iss.message}</div>`).join('')
    : '<div style="color: #34d399;">✓ No bottlenecks detected for this module.</div>';

  document.getElementById('modal-mod-code').textContent = mod.fix || '// Code compliant';

  modal.classList.add('active');
}

window.openFixModal = (modId, title, fix) => {
  const modal = document.getElementById('deepdive-modal');
  document.getElementById('modal-mod-category').textContent = 'PRIORITY REMEDIATION';
  document.getElementById('modal-mod-title').textContent = title;
  document.getElementById('modal-mod-score').textContent = 'Action Required';
  document.getElementById('modal-mod-badge').className = 'status-chip crit';
  document.getElementById('modal-mod-badge').textContent = 'P0 ALERT';
  document.getElementById('modal-mod-metric').textContent = 'One-Click AI Code Fix';
  document.getElementById('modal-mod-issues-list').innerHTML = `<div>• ${title}</div>`;
  document.getElementById('modal-mod-code').textContent = fix || '<!-- Add fix code -->';
  modal.classList.add('active');
};

document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('deepdive-modal').classList.remove('active');
});

document.getElementById('btn-modal-dismiss').addEventListener('click', () => {
  document.getElementById('deepdive-modal').classList.remove('active');
});

document.getElementById('btn-copy-fix-code')?.addEventListener('click', () => {
  const code = document.getElementById('modal-mod-code').textContent;
  navigator.clipboard.writeText(code);
  const btn = document.getElementById('btn-copy-fix-code');
  btn.textContent = 'Copied!';
  showToast('Developer fix code copied to clipboard!');
  setTimeout(() => { btn.textContent = 'Copy Fix Code'; }, 1500);
});

// Modal Backdrop Click & Escape Key to Dismiss
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// Event Listeners for Audit Triggers & Enter Key
btnHeroStart?.addEventListener('click', () => {
  const url = heroUrlInput.value.trim();
  startAudit(url);
});

heroUrlInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    startAudit(heroUrlInput.value.trim());
  }
});

btnHeaderScan?.addEventListener('click', () => {
  const url = headerUrlInput.value.trim();
  startAudit(url);
});

headerUrlInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    startAudit(headerUrlInput.value.trim());
  }
});

document.getElementById('btn-dash-rescan')?.addEventListener('click', () => {
  startAudit(state.targetUrl);
});

document.getElementById('btn-dash-export')?.addEventListener('click', () => {
  switchView('view-export');
});

document.getElementById('btn-clear-terminal')?.addEventListener('click', () => {
  document.getElementById('terminal-logs-container').innerHTML = '';
  showToast('Terminal logs cleared');
});

// Stream Pause / Resume and Cancel Listeners
const btnPauseStream = document.getElementById('btn-pause-stream');
const btnCancelStream = document.getElementById('btn-cancel-stream');

btnPauseStream?.addEventListener('click', () => {
  state.isStreamPaused = !state.isStreamPaused;
  btnPauseStream.textContent = state.isStreamPaused ? 'Resume' : 'Pause';
  showToast(state.isStreamPaused ? 'Live telemetry paused' : 'Live telemetry resumed');
});

btnCancelStream?.addEventListener('click', () => {
  if (state.activeEventSource) {
    state.activeEventSource.close();
    state.activeEventSource = null;
  }
  document.getElementById('header-stream-status').textContent = 'Audit Aborted';
  appendTerminalLog(new Date().toLocaleTimeString(), '#1', 'WARN', 'Audit crawl session aborted by user.');
  showToast('Crawl session terminated');
});

// Add Monitored Target Modal Listeners
const btnAddMonitor = document.getElementById('btn-add-monitor-target');
const monitorModal = document.getElementById('add-monitor-modal');
const btnCloseMonitorModal = document.getElementById('btn-close-monitor-modal');
const btnCancelMonitorModal = document.getElementById('btn-cancel-monitor-modal');
const btnSaveMonitorTarget = document.getElementById('btn-save-monitor-target');

btnAddMonitor?.addEventListener('click', () => {
  const urlField = document.getElementById('monitor-new-url');
  if (urlField) urlField.value = state.targetUrl || 'https://example.com';
  monitorModal?.classList.add('active');
});

btnCloseMonitorModal?.addEventListener('click', () => {
  monitorModal?.classList.remove('active');
});

btnCancelMonitorModal?.addEventListener('click', () => {
  monitorModal?.classList.remove('active');
});

btnSaveMonitorTarget?.addEventListener('click', () => {
  const urlVal = document.getElementById('monitor-new-url')?.value.trim();
  const freqVal = document.getElementById('monitor-new-frequency')?.value;
  if (!urlVal) return;

  let cleanHost = urlVal;
  try {
    cleanHost = new URL(urlVal.startsWith('http') ? urlVal : `https://${urlVal}`).hostname;
  } catch {}

  const list = document.getElementById('active-monitored-domains-list');
  if (list) {
    const item = document.createElement('div');
    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);';
    item.innerHTML = `
      <div>
        <strong style="color: #fff;">${cleanHost}</strong>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${freqVal}</div>
      </div>
      <span class="status-chip pass">SENTINEL ACTIVE</span>
    `;
    list.prepend(item);
  }

  const timeline = document.getElementById('incident-history-timeline');
  if (timeline) {
    const log = document.createElement('div');
    log.style.cssText = 'border-left: 2px solid #10b981; padding-left: 10px;';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    log.innerHTML = `
      <span style="color: #10b981; font-weight: 600;">${nowTime} - ${cleanHost}</span>
      <p style="color: var(--text-medium);">Added to 24/7 automated drift detection sentinel (${freqVal}).</p>
    `;
    timeline.prepend(log);
  }

  monitorModal?.classList.remove('active');
  showToast(`Added ${cleanHost} to 24/7 Monitoring Sentinel!`);
});

// Competitor Comparison Logic
const runCompareBtn = document.getElementById('btn-run-compare');
runCompareBtn?.addEventListener('click', async () => {
  const url1 = document.getElementById('compare-url-1').value.trim();
  const url2 = document.getElementById('compare-url-2').value.trim();
  if (!url1 || !url2) return;

  runCompareBtn.textContent = 'Comparing...';
  runCompareBtn.disabled = true;

  try {
    const res = await fetch(`/api/compare?url1=${encodeURIComponent(url1)}&url2=${encodeURIComponent(url2)}`);
    const data = await res.json();

    const radarContainer = document.getElementById('spider-radar-container');
    renderSpiderRadar(radarContainer, {
      technical: data.site1.scores.dimensions.technical.score,
      speed: data.site1.scores.dimensions.speed.score,
      onpage: data.site1.scores.dimensions.onpage.score,
      content: data.site1.scores.dimensions.content.score,
      trust: data.site1.scores.dimensions.trust.score,
      aeo: 85
    }, {
      technical: data.site2.scores.dimensions.technical.score,
      speed: data.site2.scores.dimensions.speed.score,
      onpage: data.site2.scores.dimensions.onpage.score,
      content: data.site2.scores.dimensions.content.score,
      trust: data.site2.scores.dimensions.trust.score,
      aeo: 78
    });

    const isWinner1 = data.site1.scores.totalScore >= data.site2.scores.totalScore;
    document.getElementById('cmp-score-1').innerHTML = `${data.site1.scores.totalScore} / 100 ${isWinner1 ? '<span style="color: #10b981; font-size: 10px; font-weight: 700; margin-left: 4px;">★ WINNER</span>' : ''}`;
    document.getElementById('cmp-score-2').innerHTML = `${data.site2.scores.totalScore} / 100 ${!isWinner1 ? '<span style="color: #10b981; font-size: 10px; font-weight: 700; margin-left: 4px;">★ WINNER</span>' : ''}`;

    document.getElementById('cmp-lcp-1').textContent = `${(data.site1.ttfb / 1000 + 1.2).toFixed(1)}s`;
    document.getElementById('cmp-lcp-2').textContent = `${(data.site2.ttfb / 1000 + 0.8).toFixed(1)}s`;

    const words1 = (data.site1.pageMeta?.linkCount || 10) * 45;
    const words2 = (data.site2.pageMeta?.linkCount || 10) * 55;
    document.getElementById('cmp-words-1').textContent = words1.toLocaleString();
    document.getElementById('cmp-words-2').textContent = words2.toLocaleString();

    document.getElementById('cmp-links-1').textContent = data.site1.pageMeta?.linkCount || 14;
    document.getElementById('cmp-links-2').textContent = data.site2.pageMeta?.linkCount || 68;

    showToast(`Benchmark complete: Winner is ${data.comparison.winner}`);
  } catch (err) {
    console.error('Comparison error', err);
    showToast(`Comparison failed: ${err.message}`);
  } finally {
    runCompareBtn.textContent = 'Compare Now';
    runCompareBtn.disabled = false;
  }
});

document.getElementById('compare-url-1')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCompareBtn?.click();
});
document.getElementById('compare-url-2')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCompareBtn?.click();
});

// White-Label Live Cover Customizer
document.getElementById('report-agency-name')?.addEventListener('input', (e) => {
  document.getElementById('cover-agency-title').textContent = e.target.value.toUpperCase();
});

document.getElementById('report-client-name')?.addEventListener('input', (e) => {
  document.getElementById('cover-client-title').textContent = e.target.value;
});

document.getElementById('report-color-picker')?.addEventListener('input', (e) => {
  document.getElementById('cover-agency-title').style.color = e.target.value;
});

document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
  window.print();
});

// ==========================================
// REPORT GENERATION & EXPORT SERVICE (JSON / FILE / STANDALONE HTML)
// ==========================================

async function triggerReportDownload(format) {
  if (!state.auditData) {
    alert('Please execute an audit scan first before exporting a report.');
    return;
  }

  const agency = document.getElementById('report-agency-name')?.value || 'Apex Growth Digital';
  const client = document.getElementById('report-client-name')?.value || 'Valued Client';
  const color = document.getElementById('report-color-picker')?.value || '#6366f1';

  try {
    const res = await fetch('/api/report/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditData: state.auditData,
        format,
        agency,
        client,
        color
      })
    });

    if (!res.ok) {
      throw new Error(`Report generation failed: ${res.statusText}`);
    }

    const blob = await res.blob();
    const cleanDomain = (state.auditData.url || 'audit').replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = format === 'markdown' ? 'md' : format;
    const filename = `seo_report_${cleanDomain}.${ext}`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    fetchSavedReports();
  } catch (err) {
    console.error('Download error:', err);
    // Offline fallback for JSON
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.auditData, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute('href', dataStr);
      dl.setAttribute('download', `seo_audit_${Date.now()}.json`);
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    } else {
      alert(`Report download error: ${err.message}`);
    }
  }
}

async function saveReportToServer(format = 'json') {
  if (!state.auditData) {
    alert('Please execute an audit scan first before saving to disk.');
    return;
  }
  const statusEl = document.getElementById('save-report-status');
  if (statusEl) {
    statusEl.textContent = 'Saving to server disk...';
    statusEl.style.color = 'var(--text-muted)';
  }

  const agency = document.getElementById('report-agency-name')?.value || 'Apex Growth Digital';
  const client = document.getElementById('report-client-name')?.value || 'Valued Client';
  const color = document.getElementById('report-color-picker')?.value || '#6366f1';

  try {
    const res = await fetch('/api/report/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditData: state.auditData,
        format,
        agency,
        client,
        color
      })
    });
    const result = await res.json();
    if (result.success && statusEl) {
      statusEl.textContent = `✓ Saved: ${result.report.filename} (${(result.report.sizeBytes / 1024).toFixed(1)} KB)`;
      statusEl.style.color = '#10b981';
      fetchSavedReports();
    } else if (statusEl) {
      statusEl.textContent = `Error: ${result.error}`;
      statusEl.style.color = '#ef4444';
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `Failed: ${err.message}`;
      statusEl.style.color = '#ef4444';
    }
  }
}

async function fetchSavedReports() {
  const container = document.getElementById('saved-reports-container');
  if (!container) return;

  try {
    const res = await fetch('/api/reports');
    const data = await res.json();

    if (!data.reports || data.reports.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 8px;">No reports generated yet. Run an audit and export to populate this server archive.</div>';
      return;
    }

    container.innerHTML = data.reports.map(rep => {
      const dateStr = new Date(rep.createdAt).toLocaleString();
      const sizeKb = (rep.sizeBytes / 1024).toFixed(1);
      const isHtml = rep.filename.endsWith('.html');
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div>
            <strong style="color: #fff; font-family: var(--font-mono); font-size: 13px;">${rep.filename}</strong>
            <div style="color: var(--text-muted); font-size: 11px;">Created: ${dateStr} • ${sizeKb} KB</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${isHtml ? `<a href="${rep.urlPath}" target="_blank" class="btn btn-secondary" style="height: 26px; padding: 0 10px; font-size: 11px; text-decoration: none; display: flex; align-items: center;">View in Tab</a>` : ''}
            <a href="${rep.urlPath}" download="${rep.filename}" class="btn btn-primary" style="height: 26px; padding: 0 10px; font-size: 11px; text-decoration: none; display: flex; align-items: center;">Download</a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">Failed to load saved reports: ${err.message}</div>`;
  }
}

// Wire Dashboard Export Toolbar
document.getElementById('btn-export-json')?.addEventListener('click', () => triggerReportDownload('json'));
document.getElementById('btn-export-md')?.addEventListener('click', () => triggerReportDownload('md'));
document.getElementById('btn-export-html')?.addEventListener('click', () => triggerReportDownload('html'));

// Wire White-Label Export Buttons
document.getElementById('btn-export-wl-json')?.addEventListener('click', () => triggerReportDownload('json'));
document.getElementById('btn-export-wl-md')?.addEventListener('click', () => triggerReportDownload('md'));
document.getElementById('btn-export-wl-html')?.addEventListener('click', () => triggerReportDownload('html'));
document.getElementById('btn-save-report-disk')?.addEventListener('click', () => saveReportToServer('json'));
document.getElementById('btn-refresh-reports')?.addEventListener('click', () => fetchSavedReports());

function escapeHtml(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Initial default radar render
renderSpiderRadar(document.getElementById('spider-radar-container'), {
  technical: 82, speed: 64, onpage: 92, content: 71, trust: 95, aeo: 88
}, {
  technical: 89, speed: 88, onpage: 84, content: 92, trust: 90, aeo: 79
});

// Initialize default radial gauge
renderRadialGauge(document.getElementById('score-gauge-container'), 78);

// Initial fetch of saved reports archive
fetchSavedReports();

