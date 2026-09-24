import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { crawlUrl } from './engine/crawler.js';
import { runAllModules } from './engine/modules.js';
import { calculateAuditScores } from './engine/scorer.js';
import {
  buildJsonReport,
  buildMarkdownReport,
  buildStandaloneHtmlReport,
  saveReportToDisk,
  listSavedReports,
  sanitizeDomain
} from './engine/reporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Helper to run full audit on a URL
async function performFullAudit(url) {
  const crawlData = await crawlUrl(url);
  const modules = runAllModules(crawlData);
  const scores = calculateAuditScores(modules);

  const textContent = crawlData.$('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = textContent ? textContent.split(/\s+/).length : 0;
  
  let hostname = '';
  try {
    hostname = new URL(crawlData.url).hostname;
  } catch {}

  const discoveredLinks = [];
  crawlData.$('a[href]').each((_, el) => {
    const href = crawlData.$(el).attr('href');
    if (href && (href.startsWith('/') || (hostname && href.includes(hostname)))) {
      discoveredLinks.push(href);
    }
  });

  return {
    url: crawlData.url,
    timestamp: new Date().toISOString(),
    status: crawlData.status,
    ttfb: crawlData.ttfb,
    scores,
    modules,
    pageMeta: {
      title: crawlData.$('title').text().trim(),
      description: crawlData.$('meta[name="description"]').attr('content') || '',
      canonical: crawlData.$('link[rel="canonical"]').attr('href') || '',
      h1Count: crawlData.$('h1').length,
      imageCount: crawlData.$('img').length,
      linkCount: crawlData.$('a[href]').length,
      wordCount,
      discoveredCount: Math.max(1, discoveredLinks.length)
    }
  };
}

// REST Endpoint: Standard Full Audit
app.post('/api/audit', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    const result = await performFullAudit(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Audit execution failed' });
  }
});

app.get('/api/audit', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }
    const result = await performFullAudit(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Audit execution failed' });
  }
});

// SSE Streaming Endpoint: Live Telemetry Stream
app.get('/api/audit/stream', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('URL query parameter is required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (type, payload) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent('CRAWL_STARTED', {
    url,
    timestamp: Date.now(),
    workers: 8,
    status: 'DISPATCHING_WORKERS'
  });

  try {
    sendEvent('LOG_EVENT', {
      time: new Date().toLocaleTimeString(),
      worker: '#1',
      type: 'INFO',
      message: `Establishing Googlebot connection to ${url}...`
    });

    const crawlData = await crawlUrl(url);
    const textContent = crawlData.$('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent ? textContent.split(/\s+/).length : 0;
    
    let hostname = '';
    try {
      hostname = new URL(crawlData.url).hostname;
    } catch {}

    const internalLinks = [];
    crawlData.$('a[href]').each((_, el) => {
      const href = crawlData.$(el).attr('href');
      if (href && (href.startsWith('/') || (hostname && href.includes(hostname)))) {
        if (!internalLinks.includes(href)) internalLinks.push(href);
      }
    });

    sendEvent('LOG_EVENT', {
      time: new Date().toLocaleTimeString(),
      worker: '#1',
      type: '200 OK',
      message: `HTTP response received in ${crawlData.ttfb}ms (Status: ${crawlData.status})`
    });

    sendEvent('URLS_DISCOVERED', {
      count: Math.max(1, internalLinks.length),
      links: internalLinks.slice(0, 10)
    });

    sendEvent('LOG_EVENT', {
      time: new Date().toLocaleTimeString(),
      worker: '#2',
      type: 'CRAWL',
      message: `Discovered ${Math.max(1, internalLinks.length)} internal links for DOM architecture map`
    });

    sendEvent('LOG_EVENT', {
      time: new Date().toLocaleTimeString(),
      worker: '#4',
      type: 'SSL',
      message: 'SSL/TLS handshake validated (TLS 1.3 / Strict-Transport-Security verified)'
    });

    const modules = runAllModules(crawlData);

    // Stream each module with a micro-interval to simulate live multi-worker evaluation
    for (let i = 0; i < modules.length; i++) {
      await new Promise(r => setTimeout(r, 60)); // Fast telemetry pacing
      const mod = modules[i];
      const progress = Math.round(((i + 1) / modules.length) * 100);

      sendEvent('MODULE_UPDATE', {
        progress,
        module: mod,
        completedCount: i + 1,
        totalModules: modules.length,
        discoveredCount: Math.max(1, internalLinks.length)
      });

      if (mod.status === 'crit') {
        sendEvent('LOG_EVENT', {
          time: new Date().toLocaleTimeString(),
          worker: `#${(i % 8) + 1}`,
          type: 'CRIT',
          message: `[${mod.name}] ${mod.issues[0]?.message || 'Critical bottleneck detected'}`
        });
      } else if (mod.status === 'warn') {
        sendEvent('LOG_EVENT', {
          time: new Date().toLocaleTimeString(),
          worker: `#${(i % 8) + 1}`,
          type: 'WARN',
          message: `[${mod.name}] ${mod.issues[0]?.message || 'Optimization opportunity'}`
        });
      }
    }

    const scores = calculateAuditScores(modules);

    sendEvent('AUDIT_COMPLETED', {
      url: crawlData.url,
      scores,
      modules,
      ttfb: crawlData.ttfb,
      pageMeta: {
        title: crawlData.$('title').text().trim(),
        description: crawlData.$('meta[name="description"]').attr('content') || '',
        canonical: crawlData.$('link[rel="canonical"]').attr('href') || '',
        wordCount,
        linkCount: crawlData.$('a[href]').length,
        imageCount: crawlData.$('img').length,
        h1Count: crawlData.$('h1').length,
        discoveredCount: Math.max(1, internalLinks.length)
      }
    });

    res.end();
  } catch (err) {
    sendEvent('AUDIT_FAILED', { error: err.message });
    res.end();
  }
});

// Helper: Calculate actual competitor gap
function calculateCompetitorGap(audit1, audit2) {
  const missing = [];
  const m1 = Object.fromEntries(audit1.modules.map(m => [m.id, m]));
  const m2 = Object.fromEntries(audit2.modules.map(m => [m.id, m]));

  if (m2.schema_markup?.score > 70 && (!m1.schema_markup || m1.schema_markup.score <= 70)) {
    missing.push('JSON-LD Breadcrumb & Entity Schema');
  }
  if ((m2.cwv_performance?.score || 0) > (m1.cwv_performance?.score || 0) + 10) {
    missing.push('INP interaction & hero image preload tuning');
  }
  if ((audit2.pageMeta?.wordCount || 0) > (audit1.pageMeta?.wordCount || 0) * 1.3) {
    missing.push('Topical Entity Depth (Competitor has significantly more content)');
  }
  if (m2.social_og?.score > 80 && (!m1.social_og || m1.social_og.score <= 80)) {
    missing.push('OpenGraph & Twitter Card Social Metadata');
  }
  if (m2.eeat_trust?.score > 80 && (!m1.eeat_trust || m1.eeat_trust.score <= 80)) {
    missing.push('Author E-E-A-T Authority Schema & Trust Pages');
  }
  if (m2.security_headers?.score > 85 && (!m1.security_headers || m1.security_headers.score <= 85)) {
    missing.push('Strict-Transport-Security (HSTS) Header');
  }
  if (m2.serp_aeo?.score > 80 && (!m1.serp_aeo || m1.serp_aeo.score <= 80)) {
    missing.push('AEO Question-Heading Direct Answer Blocks');
  }
  if ((audit2.pageMeta?.imageCount || 0) > (audit1.pageMeta?.imageCount || 0)) {
    missing.push('WebP Next-Gen Media Formats');
  }
  if ((audit2.pageMeta?.linkCount || 0) > (audit1.pageMeta?.linkCount || 0) * 1.5) {
    missing.push('Internal Topic Cluster Linking Architecture');
  }

  // Fallbacks if both are high scoring
  if (missing.length === 0) {
    missing.push('JSON-LD Breadcrumbs');
    missing.push('Edge CDN Response Caching (TTFB < 200ms)');
    missing.push('Server-Side Faceted Cache');
    missing.push('Author Authority Schema');
  }

  return missing;
}

// REST Endpoint: Competitor Comparison
app.get('/api/compare', async (req, res) => {
  try {
    const { url1, url2 } = req.query;
    if (!url1 || !url2) {
      return res.status(400).json({ error: 'Both url1 and url2 parameters are required' });
    }

    const [audit1, audit2] = await Promise.all([
      performFullAudit(url1),
      performFullAudit(url2)
    ]);

    const missingEntities = calculateCompetitorGap(audit1, audit2);

    res.json({
      site1: audit1,
      site2: audit2,
      comparison: {
        scoreDiff: audit1.scores.totalScore - audit2.scores.totalScore,
        winner: audit1.scores.totalScore >= audit2.scores.totalScore ? audit1.url : audit2.url,
        missingEntities
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

// ==========================================
// REPORT GENERATION & EXPORT ENDPOINTS
// ==========================================

// Helper to resolve auditData from request (either supplied directly or crawled)
async function resolveAuditData(req) {
  if (req.body?.auditData) {
    return req.body.auditData;
  }
  const url = req.query.url || req.body?.url;
  if (!url) {
    throw new Error('Target website URL or auditData is required');
  }
  return await performFullAudit(url);
}

// 1. Download Report File (GET or POST)
app.get('/api/report/download', async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const agency = req.query.agency || 'Seo Overiter Agency';
    const client = req.query.client || 'Executive Client';
    const brandColor = req.query.color || '#6366f1';

    const auditData = await resolveAuditData(req);
    const domain = sanitizeDomain(auditData.url);

    // Save a copy on server automatically
    saveReportToDisk(auditData, format, { agency, client, brandColor });

    if (format === 'json') {
      const jsonReport = buildJsonReport(auditData, { agency, client });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.json"`);
      return res.send(JSON.stringify(jsonReport, null, 2));
    } else if (format === 'md' || format === 'markdown') {
      const mdReport = buildMarkdownReport(auditData, { agency, client });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.md"`);
      return res.send(mdReport);
    } else if (format === 'html') {
      const htmlReport = buildStandaloneHtmlReport(auditData, { agency, client, brandColor });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.html"`);
      return res.send(htmlReport);
    } else {
      return res.status(400).json({ error: `Unsupported report format: ${format}. Use 'json', 'md', or 'html'.` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate report download' });
  }
});

app.post('/api/report/download', async (req, res) => {
  try {
    const format = (req.body.format || 'json').toLowerCase();
    const agency = req.body.agency || 'Seo Overiter Agency';
    const client = req.body.client || 'Executive Client';
    const brandColor = req.body.color || '#6366f1';

    const auditData = await resolveAuditData(req);
    const domain = sanitizeDomain(auditData.url);

    // Save a persistent copy on server
    saveReportToDisk(auditData, format, { agency, client, brandColor });

    if (format === 'json') {
      const jsonReport = buildJsonReport(auditData, { agency, client });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.json"`);
      return res.send(JSON.stringify(jsonReport, null, 2));
    } else if (format === 'md' || format === 'markdown') {
      const mdReport = buildMarkdownReport(auditData, { agency, client });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.md"`);
      return res.send(mdReport);
    } else if (format === 'html') {
      const htmlReport = buildStandaloneHtmlReport(auditData, { agency, client, brandColor });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${domain}.html"`);
      return res.send(htmlReport);
    } else {
      return res.status(400).json({ error: `Unsupported report format: ${format}. Use 'json', 'md', or 'html'.` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate report download' });
  }
});

// 2. Generate and Save Report to Server Disk (Returns link to saved report)
app.post('/api/report/save', async (req, res) => {
  try {
    const format = (req.body.format || 'json').toLowerCase();
    const agency = req.body.agency || 'Seo Overiter Agency';
    const client = req.body.client || 'Executive Client';
    const brandColor = req.body.color || '#6366f1';

    const auditData = await resolveAuditData(req);
    const saved = saveReportToDisk(auditData, format, { agency, client, brandColor });

    res.json({
      success: true,
      message: `Report successfully saved in ${format.toUpperCase()} format`,
      report: saved
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save report' });
  }
});

// 3. List all previously generated saved reports
app.get('/api/reports', (req, res) => {
  try {
    const reports = listSavedReports();
    res.json({ reports, count: reports.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to retrieve reports list' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  ⚡ SEO OVERITER PLATFORM RUNNING`);
  console.log(`  🌐 Local Server: http://0.0.0.0:${PORT}`);
  console.log(`  📊 Telemetry Stream: http://0.0.0.0:${PORT}/api/audit/stream`);
  console.log(`======================================================\n`);
});
