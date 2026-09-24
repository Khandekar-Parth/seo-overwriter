/**
 * Seo Overiter - SVG Chart Generators
 * High-performance vector charts for Radial Score Gauge & 6-Axis Spider Radar
 */

export function renderRadialGauge(container, score) {
  if (!container) return;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = '#10b981'; // Emerald
  if (score < 60) strokeColor = '#ef4444'; // Crimson
  else if (score < 80) strokeColor = '#f59e0b'; // Amber

  container.innerHTML = `
    <svg width="170" height="170" viewBox="0 0 170 170" style="transform: rotate(-90deg);">
      <!-- Background Track -->
      <circle
        cx="85"
        cy="85"
        r="${radius}"
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.08)"
        stroke-width="10"
      />
      <!-- Active Progress Stroke -->
      <circle
        cx="85"
        cy="85"
        r="${radius}"
        fill="transparent"
        stroke="${strokeColor}"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        style="transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease;"
        filter="drop-shadow(0 0 8px ${strokeColor}44)"
      />
    </svg>
    <div class="gauge-number">
      <div class="gauge-val" style="color: ${strokeColor};">${score}</div>
      <div class="gauge-label">out of 100</div>
    </div>
  `;
}

export function renderSpiderRadar(container, scores1, scores2) {
  if (!container) return;
  const axes = [
    { label: 'Technical', key: 'technical' },
    { label: 'Speed/CWV', key: 'speed' },
    { label: 'On-Page', key: 'onpage' },
    { label: 'Content', key: 'content' },
    { label: 'Trust', key: 'trust' },
    { label: 'AEO Ready', key: 'aeo' }
  ];

  const center = 160;
  const radius = 110;
  const totalAxes = axes.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Background Web concentric rings
  let gridRings = '';
  [0.25, 0.5, 0.75, 1].forEach(rFactor => {
    const r = radius * rFactor;
    let points = [];
    for (let i = 0; i < totalAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    gridRings += `<polygon points="${points.join(' ')}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>`;
  });

  // Axis lines & labels
  let axisLines = '';
  axes.forEach((axis, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const labelX = center + (radius + 24) * Math.cos(angle);
    const labelY = center + (radius + 24) * Math.sin(angle);

    axisLines += `
      <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
      <text x="${labelX}" y="${labelY}" fill="#94a3b8" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="middle" dominant-baseline="central">${axis.label}</text>
    `;
  });

  // Calculate polygon coordinates for dataset
  const getPoints = (data) => {
    return axes.map((axis, i) => {
      const val = data[axis.key] || 75;
      const r = (val / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const poly1 = getPoints(scores1);
  const poly2 = getPoints(scores2);

  container.innerHTML = `
    <svg width="320" height="320" viewBox="0 0 320 320">
      ${gridRings}
      ${axisLines}
      <!-- Site 1 Polygon (Blue/Indigo) -->
      <polygon points="${poly1}" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" stroke-width="2" filter="drop-shadow(0 0 8px rgba(99,102,241,0.4))"/>
      <!-- Site 2 Polygon (Amber/Orange) -->
      <polygon points="${poly2}" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" stroke-width="2" filter="drop-shadow(0 0 8px rgba(245,158,11,0.4))"/>
    </svg>
  `;
}
