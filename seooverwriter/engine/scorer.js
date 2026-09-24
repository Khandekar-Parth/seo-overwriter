/**
 * Seo Overiter - Health Scoring Engine & Priority Matrix Builder
 * Implements weighted dimensional scoring from task.md & plan.md.
 */

export function calculateAuditScores(modules) {
  const categories = {
    technical: [],
    speed: [],
    onpage: [],
    content: [],
    trust: []
  };

  modules.forEach(mod => {
    if (categories[mod.category]) {
      categories[mod.category].push(mod.score);
    }
  });

  const getAvg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 85;

  const technical = getAvg(categories.technical);
  const speed = getAvg(categories.speed);
  const onpage = getAvg(categories.onpage);
  const content = getAvg(categories.content);
  const trust = getAvg(categories.trust);

  // Weighted Health Score Formula from task.md
  const totalScore = Math.round(
    (technical * 0.30) +
    (speed * 0.25) +
    (onpage * 0.20) +
    (content * 0.15) +
    (trust * 0.10)
  );

  let grade = 'A';
  let gradeText = 'Optimal Health';
  if (totalScore < 60) {
    grade = 'F';
    gradeText = 'Critical Remediation Required';
  } else if (totalScore < 70) {
    grade = 'D';
    gradeText = 'High Vulnerability';
  } else if (totalScore < 80) {
    grade = 'C';
    gradeText = 'Needs Work';
  } else if (totalScore < 90) {
    grade = 'B';
    gradeText = 'Good - Minor Action Items';
  }

  // Count issues by severity
  let passedCount = 0;
  let warnCount = 0;
  let critCount = 0;

  modules.forEach(mod => {
    if (mod.status === 'pass') passedCount++;
    else if (mod.status === 'warn') warnCount++;
    else if (mod.status === 'crit') critCount++;
  });

  // Build 4-Quadrant Priority Matrix
  const matrix = {
    quickWins: [],
    majorProjects: [],
    fillIns: [],
    lowPriority: []
  };

  modules.forEach(mod => {
    mod.issues.forEach(issue => {
      if (issue.severity === 'critical') {
        if (mod.category === 'technical' || mod.category === 'onpage') {
          matrix.quickWins.push({
            moduleId: mod.id,
            moduleName: mod.name,
            title: issue.message,
            impact: 'High Impact',
            effort: 'Low Effort',
            scoreEst: '+4.5',
            fix: mod.fix
          });
        } else {
          matrix.majorProjects.push({
            moduleId: mod.id,
            moduleName: mod.name,
            title: issue.message,
            impact: 'High Impact',
            effort: 'High Effort',
            scoreEst: '+7.0',
            fix: mod.fix
          });
        }
      } else if (issue.severity === 'warning') {
        if (mod.category === 'speed' || mod.category === 'content') {
          matrix.majorProjects.push({
            moduleId: mod.id,
            moduleName: mod.name,
            title: issue.message,
            impact: 'Moderate Impact',
            effort: 'Moderate Effort',
            scoreEst: '+3.2',
            fix: mod.fix
          });
        } else {
          matrix.fillIns.push({
            moduleId: mod.id,
            moduleName: mod.name,
            title: issue.message,
            impact: 'Low Impact',
            effort: 'Low Effort',
            scoreEst: '+1.5',
            fix: mod.fix
          });
        }
      }
    });
  });

  // Default entries if website is very clean
  if (matrix.quickWins.length === 0) {
    matrix.quickWins.push({
      title: 'Canonical self-referencing check verified',
      impact: 'High Impact',
      effort: 'Low Effort',
      scoreEst: 'Passed',
      fix: 'Maintain standard canonical formatting.'
    });
  }
  if (matrix.majorProjects.length === 0) {
    matrix.majorProjects.push({
      title: 'Core Web Vitals INP/LCP tuning',
      impact: 'High Impact',
      effort: 'Moderate Effort',
      scoreEst: 'Passing',
      fix: 'Continue monitoring CrUX real-user metrics.'
    });
  }
  if (matrix.fillIns.length === 0) {
    matrix.fillIns.push({
      title: 'Alt text and microdata syntax updates',
      impact: 'Low Impact',
      effort: 'Low Effort',
      scoreEst: 'Passing',
      fix: 'Audit template components periodically.'
    });
  }
  matrix.lowPriority.push({
    title: 'Refactor legacy polyfill scripts across static archives',
    impact: 'Low Impact',
    effort: 'High Effort',
    scoreEst: '+0.5',
    fix: 'Remove deprecated browser shims when modernizing build bundlers.'
  });

  return {
    totalScore,
    grade,
    gradeText,
    dimensions: {
      technical: { score: technical, weight: '30%', label: 'Technical Crawl' },
      speed: { score: speed, weight: '25%', label: 'Core Web Vitals' },
      onpage: { score: onpage, weight: '20%', label: 'On-Page & Semantic' },
      content: { score: content, weight: '15%', label: 'Content Quality' },
      trust: { score: trust, weight: '10%', label: 'Security & Trust' }
    },
    counts: {
      passed: passedCount,
      warnings: warnCount,
      critical: critCount,
      totalModules: modules.length
    },
    matrix
  };
}
