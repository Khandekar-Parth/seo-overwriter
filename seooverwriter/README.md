# SEO Overiter - High-Performance Website Auditing & Telemetry Platform

An enterprise-grade, real-time SEO diagnostic and competitor reverse-engineering suite built according to the core technical specifications in [research.md](file:///c:/Users/parth/OneDrive/Desktop/New%20Projects/Seo%20Overiter/research.md), [task.md](file:///c:/Users/parth/OneDrive/Desktop/New%20Projects/Seo%20Overiter/task.md), and [plan.md](file:///c:/Users/parth/OneDrive/Desktop/New%20Projects/Seo%20Overiter/plan.md).

Designed with the **Obsidian Telemetry** aesthetic (deep zinc, cyber emerald accents, glassmorphic panels, and high-contrast monospace typography).

---

## 🚀 Quick Start

The platform is already running in your background session on port **3000**.

### 1. Launch in Browser
Open: [http://localhost:3000](http://localhost:3000)

### 2. Manual Start (if restarting)
```bash
cd "c:\Users\parth\OneDrive\Desktop\New Projects\Seo Overiter\seooverwriter"
npm install
npm run dev
```

---

## 🛠️ Architecture & Features

### 1. Real-Time Telemetry Crawler (`engine/crawler.js`)
- Emulates `Googlebot/2.1 (+http://www.google.com/bot.html)` to capture true crawler responses.
- Accurate network latency & TTFB calculation.
- Cheerio DOM parsing for on-page tags, scripts, CSS stylesheets, schemas, and images.

### 2. 25 Diagnostic Modules (`engine/modules.js`)
Fully compliant with the 25 diagnostic modules specified in `task.md`:
1. **Core Web Vitals & TTFB**: Server response time, compression (Gzip/Brotli), payload size.
2. **Crawlability & Indexability**: Robots.txt, meta robots, x-robots-tag, canonical directives.
3. **Information Gain & Content Depth**: Word count, lexical density, uniqueness heuristics.
4. **SERP & Snippet Simulation**: Real-time Google SERP preview with pixel length validation.
5. **E-E-A-T & Authority Signals**: Author bios, editorial dates, schema markup, trust signals.
6. **Internal Link Equity & PageRank Flow**: Link distribution, anchor text analysis.
7. **Semantic HTML5 & Accessibility (A11y)**: Heading hierarchy (H1-H6), ARIA roles, image alt tags.
8. **Schema.org Structured Data**: JSON-LD, Microdata, OpenGraph, Twitter Card detection.
9. **Duplicate Content & Canonicals**: Canonical self-referencing and loop detection.
10. **Image Optimization & Next-Gen Formats**: WebP/AVIF checks, lazy loading, missing dimensions.
11. **Mobile Responsiveness**: Viewport tag configuration, touch readiness.
12. **Security & HTTPS**: SSL/TLS status, mixed content detection, HSTS.
13. **HTTP Status Code Mapping**: Redirect loops, 4xx/5xx code detection.
14. **JavaScript Rendering Cost**: Inline scripts, heavy bundle detection.
15. **Sitemap.xml Validation**: Sitemap discovery and link health.
16. **Orphan Page & URL Depth**: URL slug depth, parameter bloat detection.
17. **International SEO (Hreflang)**: Multi-language tag verification.
18. **AEO & LLM Citation Readiness**: Perplexity, ChatGPT, and AI Search citation readiness.
19. **Content Decay & Freshness**: Publication dates, modified dates, recency signals.
20. **Keyword Cannibalization Risk**: Title vs H1 vs URL keyword overlap.
21. **Zero-Click Search Optimization**: FAQ, How-To, and table snippet readiness.
22. **Log File & Crawl Budget Simulator**: Crawl waste calculation.
23. **Security Headers & Clickjacking**: CSP, X-Frame-Options, Permissions-Policy.
24. **Social Graph Optimization**: OpenGraph & Twitter cards.
25. **Core Brand Signals**: Favicon, manifest, copyright, and brand identity.

### 3. Weighted Scoring Engine (`engine/scorer.js`)
Computes an overall composite score (0–100) and letter grade (A+ through F) using weighted categorical dimensions:
- **Technical & Crawlability** (25%)
- **Speed & Core Web Vitals** (20%)
- **On-Page & Architecture** (20%)
- **Content & E-E-A-T** (20%)
- **Trust & Authority** (15%)

Generates an automated **4-Quadrant Action Matrix**:
- 🚨 **Quick Wins** (High Impact / Low Effort)
- 🎯 **Major Projects** (High Impact / High Effort)
- 💤 **Low Priority** (Low Impact / Low Effort)
- ⚠️ **Deprioritize** (Low Impact / High Effort)

### 4. Report Generation Service (`engine/reporter.js`)
Generates comprehensive technical and executive reports in multiple formats:
- **Machine-Readable JSON (`.json`)**: Full telemetry payload, weighted scores, 4-quadrant action matrix, and all 25 modules.
- **GitHub & Notion Markdown (`.md`)**: Formatted with tables, status icons, code blocks, and priority matrices ready for engineering teams.
- **Standalone Self-Contained HTML (`.html`)**: Beautiful executive presentation with embedded styles, responsive layout, and print-ready CSS (`@media print` for saving to PDF).
- **Persistent Server Disk Storage**: Automatically logs all generated reports into the `reports/` directory with timestamped filenames.

### 5. Interactive Live Telemetry UI (`public/`)
- **Server-Sent Events (SSE)**: Real-time step-by-step diagnostic streaming at `/api/audit/stream`.
- **Obsidian Telemetry Dashboard**:
  - Live SVG Radial Health Score gauge.
  - Interactive 6-Axis Spider Radar chart (`public/js/charts.js`).
  - Diagnostic module cards with expandable code fix snippets.
  - Search and Category filters (All, Critical, Quick Wins, On-Page, Speed).
  - Competitor side-by-side battle radar.
  - Real-time Google SERP & Perplexity AI snippet preview.
  - White-Label agency report generator with custom client name & logo branding.
  - Direct 1-click Download buttons for JSON, Markdown, and Standalone HTML reports.
  - Historical server reports archive viewer with tab preview & download.

---

## 📡 API Endpoints

- `GET /api/audit?url=<target_url>`: Complete JSON audit payload.
- `GET /api/audit/stream?url=<target_url>`: Live Server-Sent Events (SSE) telemetry feed.
- `GET /api/compare?url1=<site1>&url2=<site2>`: Competitor side-by-side benchmark comparison.
- `GET /api/report/download?url=<site>&format=json|md|html`: Download report in specified format.
- `POST /api/report/download`: Download report from existing client-side audit state.
- `POST /api/report/save`: Save report to server `reports/` folder.
- `GET /api/reports`: List all archived reports stored on the server.
- `GET /reports/<filename>`: Directly view or download archived report files.
- `GET /`: Serves the Single Page Application UI.
