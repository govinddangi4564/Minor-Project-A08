/**
 * ============================================================================
 * DASHBOARD PAGE - Analytics & Metrics
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * Replace getStoredData() calls with API endpoints for real-time analytics
 * 
 * API ENDPOINTS:
 * 
 * 1. GET /api/dashboard/stats
 *    Headers: { 'Authorization': 'Bearer <token>' }
 *    Response: {
 *      resumes_scanned: 150,
 *      shortlisted: 25,
 *      avg_match_score: 78,
 *      active_jds: 5,
 *      trends: { 
 *        weekly_growth: 12, 
 *        conversion_rate: 8,
 *        top_department: "Engineering",
 *        top_skill: "Python"
 *      }
 *    }
 * 
 * 2. GET /api/dashboard/skills-distribution?days=7
 *    Response: { 
 *      skills: [
 *        { name: "Python", count: 45, percentage: 30 },
 *        { name: "React", count: 32, percentage: 21 },
 *        ...
 *      ] 
 *    }
 * 
 * 3. GET /api/dashboard/match-trends?days=7&jd_id=xxx
 *    Response: { 
 *      trends: [
 *        { date: "2025-01-15", avg_score: 85, shortlisted_count: 5, total_candidates: 12 },
 *        { date: "2025-01-16", avg_score: 82, shortlisted_count: 3, total_candidates: 8 },
 *        ...
 *      ],
 *      jd_breakdown: [
 *        { jd_id: "jd-1", jd_title: "Full Stack Developer", daily_scores: [...] },
 *        ...
 *      ]
 *    }
 * 
 * DATABASE QUERIES (Backend Implementation):
 * 
 * 1. Dashboard Stats:
 *    SELECT 
 *      COUNT(DISTINCT c.id) as resumes_scanned,
 *      COUNT(DISTINCT CASE WHEN s.shortlisted = true THEN s.candidate_id END) as shortlisted,
 *      AVG(cm.final_score) as avg_match_score,
 *      COUNT(DISTINCT jd.id) as active_jds
 *    FROM candidates c
 *    LEFT JOIN candidate_matches cm ON c.id = cm.candidate_id
 *    LEFT JOIN shortlist s ON c.id = s.candidate_id
 *    LEFT JOIN job_descriptions jd ON jd.status = 'active'
 *    WHERE c.uploaded_at >= NOW() - INTERVAL '7 days';
 * 
 * 2. Skills Distribution:
 *    SELECT 
 *      skill_name as name,
 *      COUNT(*) as count,
 *      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM candidates), 2) as percentage
 *    FROM (
 *      SELECT UNNEST(c.skills) as skill_name
 *      FROM candidates c
 *      WHERE c.uploaded_at >= NOW() - INTERVAL :days DAY
 *    ) skills
 *    GROUP BY skill_name
 *    ORDER BY count DESC
 *    LIMIT 10;
 * 
 * 3. Match Trends (Last 7 days):
 *    SELECT 
 *      DATE(c.uploaded_at) as date,
 *      AVG(cm.final_score) as avg_score,
 *      COUNT(DISTINCT CASE WHEN s.shortlisted = true THEN c.id END) as shortlisted_count,
 *      COUNT(DISTINCT c.id) as total_candidates
 *    FROM candidates c
 *    LEFT JOIN candidate_matches cm ON c.id = cm.candidate_id
 *    LEFT JOIN shortlist s ON c.id = s.candidate_id
 *    WHERE c.uploaded_at >= NOW() - INTERVAL '7 days'
 *      AND (:jd_id IS NULL OR cm.jd_id = :jd_id)
 *    GROUP BY DATE(c.uploaded_at)
 *    ORDER BY date ASC;
 * 
 * PERFORMANCE OPTIMIZATION:
 * - Cache dashboard stats for 5 minutes
 * - Use materialized views for complex aggregations
 * - Index on: candidates.uploaded_at, shortlist.shortlisted, candidate_matches.calculated_at
 * 
 * REAL-TIME UPDATES:
 * - Use WebSocket or Server-Sent Events for live updates
 * - Push notifications when new candidates are uploaded
 * - Auto-refresh every 30 seconds if tab is active
 * ============================================================================
 */

function renderDashboardCards(filteredCandidates) {
  const dashboardEl = document.querySelector("#dashboardCards");
  if (!dashboardEl) return;

  // TODO: Replace with API call
  // const stats = await fetch('/api/company/dashboard/stats', {
  //   headers: { 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` }
  // }).then(r => r.json());
  // 
  // dashboardEl.innerHTML = `
  //   <div class="card">
  //     <h3>Resumes Scanned</h3>
  //     <div class="metric">${stats.resumes_scanned}</div>
  //     <div class="trend positive">
  //        ▲ ${stats.trends.weekly_growth} new this week
  //     </div>
  //   </div>
  //   ...
  // `;

  const jds = getStoredData(STORAGE_KEYS.jds) || [];
  const candidates = filteredCandidates || getStoredData(STORAGE_KEYS.candidates) || [];
  const shortlist = getStoredData(STORAGE_KEYS.shortlist) || {};

  // Calculate key metrics
  const scanned = candidates.length;
  const shortlisted = Object.values(shortlist).filter((entry) => entry.shortlisted).length;
  const avgScore = candidates.length
    ? Math.round(
      candidates.reduce((acc, c) => acc + (c.matches?.finalScore || 0), 0) / candidates.length
    )
    : 0;
  const activeJDs = jds.length;

  // Calculate growth rates and trends
  const weeklyGrowth = Math.round(scanned * 0.15); // Simulated 15% weekly growth
  const conversionRate = Math.round((shortlisted / scanned) * 100) || 0;

  // Get top performing department
  const deptPerformance = jds.reduce((acc, jd) => {
    const deptCandidates = candidates.filter(c => c.matches?.jdId === jd.id);
    const avgDeptScore = deptCandidates.length
      ? deptCandidates.reduce((sum, curr) => sum + (curr.matches?.finalScore || 0), 0) / deptCandidates.length
      : 0;
    if (!acc.topDept || avgDeptScore > acc.topScore) {
      acc.topDept = jd.department;
      acc.topScore = Math.round(avgDeptScore);
    }
    return acc;
  }, { topDept: '', topScore: 0 });

  // Get highest matched skill
  const skillCounts = candidates.reduce((acc, candidate) => {
    candidate.skills?.forEach(skill => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {});
  const topSkill = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  dashboardEl.innerHTML = `
    <div class="card">
      <h3>Resumes Scanned</h3>
      <div class="metric">${scanned}</div>
      <div class="trend ${weeklyGrowth >= 0 ? 'positive' : 'negative'}">
        ${weeklyGrowth >= 0 ? '▲' : '▼'} ${Math.abs(weeklyGrowth)} new this week
      </div>
    </div>
    <div class="card">
      <h3>Candidates Shortlisted</h3>
      <div class="metric">${shortlisted}</div>
      <div class="trend ${conversionRate >= 10 ? 'positive' : ''}">
        ${conversionRate}% conversion rate
      </div>
    </div>
    <div class="card">
      <h3>Average Match Score</h3>
      <div class="metric">${avgScore}%</div>
      <div class="trend positive">
        Top skill: ${topSkill}
      </div>
    </div>
    <div class="card">
      <h3>Department Insights</h3>
      <div class="metric">${activeJDs} Active JDs</div>
      <div class="trend positive">
        ${deptPerformance.topDept}: ${deptPerformance.topScore}% avg match
      </div>
    </div>
  `;
}

function renderDashboardCharts(filteredCandidates) {
  if (typeof Chart === "undefined") return;
  const skillsCtx = document.querySelector("#skillsChart");
  const matchCtx = document.querySelector("#matchChart");
  if (!skillsCtx || !matchCtx) return;

  // TODO: Replace with API call
  // const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` };
  // const skillsData = await fetch('/api/company/dashboard/skills-distribution', { headers })
  //   .then(r => r.json());
  // const trendsData = await fetch('/api/company/dashboard/match-trends', { headers })
  //   .then(r => r.json());

  const candidates = filteredCandidates || getStoredData(STORAGE_KEYS.candidates) || [];
  const jds = getStoredData(STORAGE_KEYS.jds) || [];

  const skillCounts = {};
  candidates.forEach((candidate) => {
    candidate.skills.forEach((skill) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (skillsCtx._chart) {
    skillsCtx._chart.destroy();
  }

  skillsCtx._chart = new Chart(skillsCtx, {
    type: "doughnut",
    data: {
      labels: topSkills.map(([skill]) => skill),
      datasets: [
        {
          data: topSkills.map(([, count]) => count),
          backgroundColor: [
            "#60a5fa",
            "#818cf8",
            "#f472b6",
            "#facc15",
            "#34d399",
            "#2dd4bf",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });

  // Generate last 7 days labels (Mon, Tue, Wed, etc.)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const dayLabels = [];
  const dayDates = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayIndex = date.getDay();
    dayLabels.push(daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1]);
    dayDates.push(date.toISOString().split('T')[0]);
  }

  // Get shortlist data
  const shortlist = getStoredData(STORAGE_KEYS.shortlist) || {};

  // Calculate data for each day and each JD
  const jdDataMap = {};
  const shortlistedCounts = new Array(7).fill(0);
  const matchScoreData = new Array(7).fill(0);
  const matchScoreCounts = new Array(7).fill(0);

  jds.forEach((jd) => {
    jdDataMap[jd.id] = {
      name: jd.title,
      scores: new Array(7).fill(0),
      counts: new Array(7).fill(0),
    };
  });

  // Process candidates by upload date
  const totalCandidatesPerDay = new Array(7).fill(0);

  candidates.forEach((candidate) => {
    if (!candidate.uploadedAt) return;

    const uploadDate = new Date(candidate.uploadedAt);
    const uploadDateStr = uploadDate.toISOString().split('T')[0];

    // Find which day index this candidate belongs to
    const dayIndex = dayDates.findIndex((date) => date === uploadDateStr);
    if (dayIndex === -1) return; // Not in last 7 days

    totalCandidatesPerDay[dayIndex]++;

    // Track shortlisted count
    if (shortlist[candidate.id]?.shortlisted) {
      shortlistedCounts[dayIndex]++;
    }

    // Track match scores per JD
    if (candidate.matches?.jdId && jdDataMap[candidate.matches.jdId]) {
      const jdData = jdDataMap[candidate.matches.jdId];
      const score = candidate.matches.finalScore || 0;
      jdData.scores[dayIndex] += score;
      jdData.counts[dayIndex]++;
    }

    // Overall average match score
    if (candidate.matches?.finalScore) {
      matchScoreData[dayIndex] += candidate.matches.finalScore;
      matchScoreCounts[dayIndex]++;
    }
  });

  // Calculate shortlisted percentage (normalized to 0-100 scale)
  const shortlistedPercentages = shortlistedCounts.map((count, idx) =>
    totalCandidatesPerDay[idx] > 0 ? Math.round((count / totalCandidatesPerDay[idx]) * 100) : 0
  );

  // Calculate averages
  const avgMatchScores = matchScoreData.map((sum, idx) =>
    matchScoreCounts[idx] > 0 ? Math.round(sum / matchScoreCounts[idx]) : 0
  );

  // Prepare datasets for chart
  const datasets = [
    {
      label: "Average Match Score",
      data: avgMatchScores,
      borderColor: "#3b82f6", // Blue
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "#3b82f6",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
    },
    {
      label: "Shortlisted %",
      data: shortlistedPercentages,
      borderColor: "#10b981", // Green
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "#10b981",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
    },
  ];

  // Add JD-specific lines if there are multiple JDs
  if (jds.length > 0) {
    jds.forEach((jd, idx) => {
      const jdData = jdDataMap[jd.id];
      if (jdData) {
        const jdAverages = jdData.scores.map((sum, dayIdx) =>
          jdData.counts[dayIdx] > 0 ? Math.round(sum / jdData.counts[dayIdx]) : 0
        );

        // Only add if there's meaningful data
        if (jdAverages.some(score => score > 0)) {
          const colors = [
            "#8b5cf6", // Purple
            "#f59e0b", // Amber
            "#ef4444", // Red
            "#06b6d4", // Cyan
          ];
          datasets.push({
            label: jd.title,
            data: jdAverages,
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length] + "33",
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: colors[idx % colors.length],
            borderDash: [5, 5],
          });
        }
      }
    });
  }

  if (matchCtx._chart) {
    matchCtx._chart.destroy();
  }

  matchCtx._chart = new Chart(matchCtx, {
    type: "line",
    data: {
      labels: dayLabels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "center",
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: {
            size: 14,
            weight: "bold",
          },
          bodyFont: {
            size: 12,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.05)",
            drawBorder: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.05)",
            drawBorder: false,
          },
          ticks: {
            stepSize: 10,
            font: {
              size: 11,
            },
          },
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
    },
  });
}

function populateQuickFilters() {
  const filterRole = document.querySelector("#filterRole");
  const filterDept = document.querySelector("#filterDept");
  const filterDate = document.querySelector("#filterDate");
  const pill = document.querySelector("#filterResultPill");

  if (!filterRole || !filterDept || !filterDate || !pill) return;

  // TODO: Replace with API call
  // const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` };
  // const jds = await fetch('/api/jds', { headers }).then(r => r.json());
  const jds = getStoredData(STORAGE_KEYS.jds) || [];

  const uniqueRoles = [...new Set(jds.map((jd) => jd.title))];
  filterRole.innerHTML = `<option value="all">All Roles</option>${uniqueRoles
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("")} `;

  const uniqueDepts = [...new Set(jds.map((jd) => jd.department))];
  filterDept.innerHTML = `<option value="all">All Departments</option>${uniqueDepts
    .map((dept) => `<option value="${dept}">${dept}</option>`)
    .join("")} `;

  filterDate.innerHTML = `
    <option value="all">Any time</option>
    <option value="7">Last 7 days</option>
    <option value="30">Last 30 days</option>
    <option value="90">Last 90 days</option>
  `;

  const applyFilters = () => {
    // TODO: Replace with API call with query params
    // const params = new URLSearchParams({
    //   role: filterRole.value,
    //   department: filterDept.value,
    //   days: filterDate.value
    // });
    // const candidates = await fetch(`/api/candidates?${params}`, { headers })
    //   .then(r => r.json());

    const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
    const selectedRole = filterRole.value;
    const selectedDept = filterDept.value;
    const selectedDate = parseInt(filterDate.value, 10);

    const filtered = candidates.filter((candidate) => {
      const matchesRole =
        selectedRole === "all" || candidate.matches?.jdTitle === selectedRole;
      const jd = jds.find((item) => item.id === candidate.matches?.jdId);
      const matchesDept = selectedDept === "all" || jd?.department === selectedDept;
      const matchesDate =
        filterDate.value === "all" ||
        (candidate.uploadedAt &&
          Date.now() - new Date(candidate.uploadedAt).getTime() < selectedDate * 86400000);
      return matchesRole && matchesDept && matchesDate;
    });

    pill.textContent = `${filtered.length} candidates match filters`;

    // Refresh cards and charts with filtered data
    renderDashboardCards(filtered);
    renderDashboardCharts(filtered);
  };

  [filterRole, filterDept, filterDate].forEach((el) => el.addEventListener("change", applyFilters));
  applyFilters();
}

/**
 * ============================================================================
 * DASHBOARD REFRESH FUNCTION - Updates all dashboard components
 * ============================================================================
 * 
 * This function is called automatically when data changes via the 'dataUpdated' event.
 * It uses debouncing to prevent excessive refreshes when multiple updates occur quickly.
 * 
 * BACKEND INTEGRATION:
 * When using API endpoints, this function should:
 * 1. Fetch fresh data from /api/dashboard/stats
 * 2. Fetch chart data from /api/dashboard/match-trends
 * 3. Update all UI components with new data
 * 
 * Example:
 * async function refreshDashboard() {
 *   if (!document.body.classList.contains("dashboard-page")) return;
 *   
 *   try {
 *     const [stats, trends] = await Promise.all([
 *       fetch('/api/dashboard/stats').then(r => r.json()),
 *       fetch('/api/dashboard/match-trends?days=7').then(r => r.json())
 *     ]);
 *     
 *     renderDashboardCards(stats);
 *     renderDashboardCharts(trends);
 *   } catch (error) {
 *     console.error('Failed to refresh dashboard:', error);
 *   }
 * }
 * ============================================================================
 */
// Debounce function to prevent excessive refreshes
let refreshTimeout = null;
function refreshDashboard() {
  if (!document.body.classList.contains("dashboard-page")) return;

  // Clear existing timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  // Debounce: wait 100ms before refreshing (in case multiple updates happen quickly)
  refreshTimeout = setTimeout(() => {
    console.log("Refreshing dashboard...");
    renderDashboardCards();
    renderDashboardCharts();
    refreshTimeout = null;
  }, 100);
}

// Set up event listeners early (before DOMContentLoaded)
// Listen for storage changes (when data is updated in other tabs/pages)
window.addEventListener("storage", (e) => {
  if (
    e.key === STORAGE_KEYS.candidates ||
    e.key === STORAGE_KEYS.jds ||
    e.key === STORAGE_KEYS.shortlist
  ) {
    console.log("Storage event detected:", e.key);
    refreshDashboard();
  }
});

// Custom event listener for same-tab updates
document.addEventListener("dataUpdated", (e) => {
  console.log("Data updated event detected:", e.detail?.key);
  refreshDashboard();
});

// Refresh when page becomes visible (user switches back to tab)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.body.classList.contains("dashboard-page")) {
    console.log("Page visible, refreshing dashboard");
    refreshDashboard();
  }
});

// Helper function to dispatch data update event (make it globally available)
window.notifyDataUpdate = function () {
  document.dispatchEvent(new CustomEvent("dataUpdated"));
};

/**
 * ============================================================================
 * TAB BUTTON FUNCTIONALITY - Handle Overview, Benchmarks, Reports tabs
 * ============================================================================
 */
function initializeTabButtons() {
  const tabButtons = document.querySelectorAll('.tabs button');
  const tabContents = document.querySelectorAll('.tab-content');

  if (!tabButtons.length) return;

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Get the tab name from data-tab attribute
      const tabName = button.getAttribute('data-tab');

      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.classList.remove('active');
      });

      // Show the selected tab content
      const targetContent = document.getElementById(`tab-${tabName}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      console.log(`Switched to ${tabName} tab`);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dashboard-page")) return;
  populateQuickFilters();
  initializeTabButtons();
});
