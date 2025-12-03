import API from '../../../config/api-endpoint.js';
import { navigateTo, routes, logout } from '../../../src/utils/router.js';
import { getStoredData, STORAGE_KEYS } from './data.js';

/**
 * ============================================================================
 * DASHBOARD PAGE - Analytics & Metrics
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * API endpoints for real-time analytics
 * 
 * API ENDPOINTS:
 * 
 * 1. GET /api/company/dashboard/stats
 * 2. GET /api/company/dashboard/skills-distribution
 * 3. GET /api/company/dashboard/match-trends
 * 
 * ============================================================================
 */

async function renderDashboardCards() {
  const dashboardEl = document.querySelector("#dashboardCards");
  if (!dashboardEl) return;

  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) {
    console.error('No auth token found');
    return;
  }

  try {
    const response = await fetch(API.company.dashboard.stats, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error('Failed to fetch stats');
    }

    const stats = await response.json();

    // Default values if stats are missing or null
    const scanned = stats.resumes_scanned || 0;
    const shortlisted = stats.shortlisted || 0;
    const avgScore = Math.round(stats.avg_match_score || 0);
    const activeJDs = stats.active_jds || 0;

    // Trends (optional, handle if missing)
    const weeklyGrowth = stats.trends?.weekly_growth || 0;
    const conversionRate = stats.trends?.conversion_rate || 0;
    const topDept = stats.trends?.top_department || 'N/A';
    const topScore = stats.trends?.top_dept_score || 0;
    const topSkill = stats.trends?.top_skill || 'N/A';

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
            ${topDept}: ${topScore}% avg match
          </div>
        </div>
      `;
  } catch (error) {
    console.error('Error rendering dashboard cards:', error);
    dashboardEl.innerHTML = '<p class="error">Failed to load dashboard stats.</p>';
  }
}

async function renderDashboardCharts() {
  if (typeof Chart === "undefined") return;
  const skillsCtx = document.querySelector("#skillsChart");
  const matchCtx = document.querySelector("#matchChart");
  if (!skillsCtx || !matchCtx) return;

  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) return;

  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch data in parallel - use 30 days to ensure we have data
    const [skillsRes, trendsRes] = await Promise.all([
      fetch(API.company.dashboard.skills + '?days=30', { headers }),
      fetch(API.company.dashboard.trends + '?days=30', { headers })
    ]);

    const skillsData = await skillsRes.json();
    const trendsData = await trendsRes.json();

    // --- Render Skills Chart ---
    const topSkills = skillsData.skills || [];

    if (skillsCtx._chart) {
      skillsCtx._chart.destroy();
    }

    skillsCtx._chart = new Chart(skillsCtx, {
      type: "doughnut",
      data: {
        labels: topSkills.map((s) => s.name),
        datasets: [
          {
            data: topSkills.map((s) => s.count),
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

    // --- Render Trends Chart ---
    const trends = trendsData.trends || [];
    const jdBreakdown = trendsData.jd_breakdown || [];

    const dayLabels = trends.map(t => t.date);
    const avgMatchScores = trends.map(t => t.avg_score);
    const shortlistedCounts = trends.map(t => t.shortlisted_count); // Or calculate percentage if needed

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
      // You can add shortlisted count or percentage here if available in the API response in a compatible format
    ];

    // Add JD-specific lines
    if (jdBreakdown.length > 0) {
      const colors = ["#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
      jdBreakdown.forEach((jd, idx) => {
        datasets.push({
          label: jd.jd_title,
          data: jd.daily_scores, // Ensure backend returns this array aligned with dates
          borderColor: colors[idx % colors.length],
          backgroundColor: colors[idx % colors.length] + "33",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: colors[idx % colors.length],
          borderDash: [5, 5],
        });
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

  } catch (error) {
    console.error('Error rendering dashboard charts:', error);
  }
}

async function populateQuickFilters() {
  const filterRole = document.querySelector("#filterRole");
  const filterDept = document.querySelector("#filterDept");
  const filterDate = document.querySelector("#filterDate");
  const pill = document.querySelector("#filterResultPill");

  if (!filterRole || !filterDept || !filterDate || !pill) return;

  const token = sessionStorage.getItem('companyAuthToken');
  let jds = [];

  if (token) {
    try {
      const response = await fetch(API.company.jds.getAll, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        jds = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch JDs for filters:', error);
    }
  }

  // Fallback to local storage if API fails or returns empty (optional, depending on migration strategy)
  if (!jds.length) {
    jds = getStoredData(STORAGE_KEYS.jds) || [];
  }

  const uniqueRoles = [...new Set(jds.map((jd) => jd.title))];
  filterRole.innerHTML = `<option value="all">All Roles</option>${uniqueRoles
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("")} `;

  const uniqueDepts = [...new Set(jds.map((jd) => jd.department))];
  filterDept.innerHTML = `<option value="all">All Departments</option>${uniqueDepts
    .map((dept) => `<option value="${dept}">${dept}</option>`)
    .join("")} `;

  filterDate.innerHTML = `
    <option value="all" selected>Any time</option>
    <option value="7">Last 7 days</option>
    <option value="30">Last 30 days</option>
    <option value="90">Last 90 days</option>
  `;

  const applyFilters = async () => {
    const selectedRole = filterRole.value;
    const selectedDept = filterDept.value;
    const selectedDate = filterDate.value;

    // Fetch candidates from API with match data
    let candidates = [];
    if (token) {
      try {
        const params = new URLSearchParams();
        if (selectedRole !== 'all') params.append('role', selectedRole);
        if (selectedDept !== 'all') params.append('department', selectedDept);
        if (selectedDate !== 'all') params.append('days', selectedDate);

        const response = await fetch(`${API.company.candidates.getAll}?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          candidates = await response.json();
        }
      } catch (error) {
        console.error('Failed to fetch candidates for filters:', error);
      }
    }

    // Fallback to localStorage if API fails
    if (!candidates.length) {
      candidates = getStoredData(STORAGE_KEYS.candidates) || [];
    }

    // Filter candidates based on selections
    const filtered = candidates.filter((candidate) => {
      const matchesRole =
        selectedRole === "all" ||
        candidate.role === selectedRole ||
        candidate.matches?.jdTitle === selectedRole;

      const jd = jds.find((item) => item.id === candidate.matches?.jd_id);
      const matchesDept = selectedDept === "all" ||
        candidate.department === selectedDept ||
        jd?.department === selectedDept;

      const matchesDate =
        selectedDate === "all" ||
        (candidate.uploaded_at &&
          Date.now() - new Date(candidate.uploaded_at).getTime() < parseInt(selectedDate) * 86400000);

      return matchesRole && matchesDept && matchesDate;
    });

    pill.textContent = `${filtered.length} candidates match filters`;
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
 * BENCHMARKS TAB - Render dynamic benchmarks from backend
 * ============================================================================
 */
async function renderBenchmarks() {
  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) {
    console.error('No auth token found');
    return;
  }

  try {
    const response = await fetch(API.company.dashboard.benchmarks, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error('Failed to fetch benchmarks');
    }

    const data = await response.json();

    // Update Match Score
    const matchScore = data.match_score;
    document.getElementById('benchmarkMatchScore').textContent = `${matchScore.company_value}%`;
    document.getElementById('benchmarkMatchIndustry').textContent = `Industry average: ${matchScore.industry_average}%`;

    // Update Time to Hire
    const timeToHire = data.time_to_hire;
    document.getElementById('benchmarkTimeToHire').textContent = `${timeToHire.company_value} days`;
    document.getElementById('benchmarkTimeIndustry').textContent = `Industry average: ${timeToHire.industry_average} days`;

    // Update Conversion Rate
    const conversionRate = data.conversion_rate;
    document.getElementById('benchmarkConversionRate').textContent = `${conversionRate.company_value}%`;
    document.getElementById('benchmarkConversionIndustry').textContent = `Industry average: ${conversionRate.industry_average}%`;

    // Update Quality Score
    const qualityScore = data.quality_score;
    document.getElementById('benchmarkQualityScore').textContent = `${qualityScore.company_value}/10`;
    document.getElementById('benchmarkQualityIndustry').textContent = `Industry average: ${qualityScore.industry_average}/10`;

    // Update trend indicators based on performance
    updateTrendIndicator('benchmarkMatchTrend', matchScore.percentage_diff, 'Your average match score');
    updateTrendIndicator('benchmarkTimeTrend', -timeToHire.percentage_diff, 'Average processing time'); // Negative because lower is better
    updateTrendIndicator('benchmarkConversionTrend', conversionRate.percentage_diff, 'Resume to shortlist');
    updateTrendIndicator('benchmarkQualityTrend', qualityScore.percentage_diff, 'Candidate quality rating');

  } catch (error) {
    console.error('Error rendering benchmarks:', error);
  }
}

function updateTrendIndicator(elementId, percentDiff, baseText) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (percentDiff > 0) {
    element.className = 'trend positive';
    element.textContent = `${baseText} (+${percentDiff.toFixed(1)}%)`;
  } else if (percentDiff < 0) {
    element.className = 'trend negative';
    element.textContent = `${baseText} (${percentDiff.toFixed(1)}%)`;
  } else {
    element.className = 'trend';
    element.textContent = baseText;
  }
}

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

      // Load data when switching to specific tabs
      if (tabName === 'benchmarks') {
        renderBenchmarks();
      } else if (tabName === 'reports') {
        // Reports tab is already initialized with event listeners
      }

      console.log(`Switched to ${tabName} tab`);
    });
  });
}

/**
 * ============================================================================
 * REPORTS TAB - Report generation and export functionality
 * ============================================================================
 */
async function updateReportSummary(saveToHistory = false) {
  const reportType = document.getElementById('reportType')?.value || 'summary';
  const dateRange = document.getElementById('reportDateRange')?.value || '7';

  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) {
    console.error('No auth token found');
    return null;
  }

  try {
    const params = new URLSearchParams({
      report_type: reportType,
      date_range: dateRange
    });

    const response = await fetch(`${API.company.dashboard.reportSummary}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return null;
      }
      throw new Error('Failed to fetch report summary');
    }

    const data = await response.json();

    // Update report summary
    document.getElementById('reportTotalResumes').textContent = data.total_resumes;
    document.getElementById('reportShortlisted').textContent = data.shortlisted;
    document.getElementById('reportAvgScore').textContent = data.avg_score;
    document.getElementById('reportTopDept').textContent = data.top_department || 'N/A';
    document.getElementById('reportTopSkill').textContent = data.top_skill || 'N/A';

    // Save to history if requested
    if (saveToHistory) {
      await saveReportToHistory(reportType, dateRange, data);
    }

    console.log('Report summary updated:', data);
    return data;
  } catch (error) {
    console.error('Error updating report summary:', error);
    return null;
  }
}

async function saveReportToHistory(reportType, dateRange, reportData) {
  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) return;

  try {
    const reportName = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`;

    console.log('Saving report to history:', { reportType, dateRange, reportData });

    const response = await fetch(API.company.dashboard.reportHistory, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        report_name: reportName,
        report_type: reportType,
        date_range: dateRange,
        report_data: reportData ? JSON.stringify(reportData) : null
      })
    });

    if (response.ok) {
      const savedReport = await response.json();
      console.log('Report saved to history:', savedReport);
      await loadReportHistory(); // Refresh the history table
    } else {
      const error = await response.text();
      console.error('Failed to save report:', error);
    }
  } catch (error) {
    console.error('Error saving report to history:', error);
  }
}

async function loadReportHistory() {
  const token = sessionStorage.getItem('companyAuthToken');
  if (!token) return;

  try {
    const response = await fetch(API.company.dashboard.reportHistory, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report history');
    }

    const reports = await response.json();

    // Store report data in a global map for easy access
    window.reportDataMap = new Map();
    reports.forEach(report => {
      console.log('Processing report:', report.id, 'data:', report.report_data);
      if (report.report_data) {
        try {
          let parsedData = JSON.parse(report.report_data);

          // Handle double-stringified data (backward compatibility)
          if (typeof parsedData === 'string') {
            console.log('Data is double-stringified, parsing again');
            parsedData = JSON.parse(parsedData);
          }

          console.log('Parsed report data:', parsedData);
          window.reportDataMap.set(report.id, parsedData);
        } catch (e) {
          console.error('Error parsing report data for report', report.id, e);
        }
      } else {
        console.warn('No report_data for report:', report.id);
      }
    });

    console.log('Report data map size:', window.reportDataMap.size);

    // Update the report history table
    const tbody = document.getElementById('reportHistoryTableBody');
    if (!tbody) return;

    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="padding: 12px; text-align: center;">No reports generated yet</td></tr>';
      return;
    }

    tbody.innerHTML = reports.map(report => `
      <tr>
        <td style="padding: 12px;">${report.report_name}</td>
        <td style="padding: 12px;">${new Date(report.generated_at).toLocaleDateString()}</td>
        <td style="padding: 12px;">${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}</td>
        <td style="padding: 12px;">
          <button class="btn-link" data-report-id="${report.id}" data-action="view">View</button> |
          <button class="btn-link" data-report-id="${report.id}" data-action="download" data-report-type="${report.report_type}" data-date-range="${report.date_range}">Download</button>
        </td>
      </tr>
    `).join('');

    console.log('Report history loaded:', reports.length, 'reports');
  } catch (error) {
    console.error('Error loading report history:', error);
  }
}

function initializeReportsTab() {
  const generateBtn = document.getElementById('generateReport');
  const exportBtn = document.getElementById('exportReport');
  const reportTypeSelect = document.getElementById('reportType');
  const reportDateRangeSelect = document.getElementById('reportDateRange');

  // Generate Report button
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      console.log('Generating report...');
      await updateReportSummary(true); // Save to history
    });
  }

  // Export PDF button
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const reportType = document.getElementById('reportType')?.value || 'summary';
      const dateRange = document.getElementById('reportDateRange')?.value || '7';

      const token = sessionStorage.getItem('companyAuthToken');
      if (!token) {
        console.error('No auth token found');
        alert('Please log in to export reports');
        return;
      }

      try {
        console.log('Generating PDF report...');

        const params = new URLSearchParams({
          report_type: reportType,
          date_range: dateRange
        });

        const response = await fetch(`${API.company.dashboard.exportPDF}?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout();
            return;
          }
          throw new Error('Failed to generate PDF');
        }

        // Get the PDF blob
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hr_analytics_report_${reportType}_${dateRange}days.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('PDF report downloaded successfully');
      } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF. Please try again.');
      }
    });
  }

  // Report action buttons
  const reportActions = {
    'viewAnalyticsReport': () => console.log('Viewing Analytics Report'),
    'viewTrendsReport': () => console.log('Viewing Trends Report'),
    'viewDepartmentReport': () => console.log('Viewing Department Report'),
    'viewCandidateReport': () => console.log('Viewing Candidate Report'),
    'downloadCSVExport': () => downloadCSVReport()
  };

  Object.entries(reportActions).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', handler);
    }
  });

  // Report history view/download buttons - using event delegation on tbody
  const reportHistoryTbody = document.getElementById('reportHistoryTableBody');
  if (reportHistoryTbody) {
    reportHistoryTbody.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-link')) {
        const action = e.target.dataset.action;
        const reportId = e.target.dataset.reportId;

        if (action === 'view') {
          // Get report data from the map
          const data = window.reportDataMap?.get(reportId);

          if (data) {
            try {
              document.getElementById('reportTotalResumes').textContent = data.total_resumes || 0;
              document.getElementById('reportShortlisted').textContent = data.shortlisted || 0;
              document.getElementById('reportAvgScore').textContent = data.avg_score || 0;
              document.getElementById('reportTopDept').textContent = data.top_department || 'N/A';
              document.getElementById('reportTopSkill').textContent = data.top_skill || 'N/A';
              console.log('Loaded report from history:', data);
            } catch (error) {
              console.error('Error displaying report data:', error);
              alert('Failed to load report data');
            }
          } else {
            console.error('No report data found for ID:', reportId);
            alert('Report data not available');
          }
        } else if (action === 'download') {
          // Download the report as PDF
          const reportType = e.target.dataset.reportType;
          const dateRange = e.target.dataset.dateRange;

          const token = sessionStorage.getItem('companyAuthToken');
          if (!token) {
            alert('Please log in to download reports');
            return;
          }

          try {
            const params = new URLSearchParams({
              report_type: reportType,
              date_range: dateRange
            });

            const response = await fetch(`${API.company.dashboard.exportPDF}?${params}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hr_analytics_report_${reportType}_${dateRange}days.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              console.log('Report downloaded from history');
            } else {
              throw new Error('Failed to download report');
            }
          } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report');
          }
        }
      }
    });
  }

  // Load report history on initialization
  loadReportHistory();

  // Auto-load default report (last 7 days summary) on initialization
  updateReportSummary(false); // Don't save to history on auto-load
}

function downloadCSVReport() {
  const reportType = document.getElementById('reportType')?.value || 'summary';
  const dateRange = document.getElementById('reportDateRange')?.value || '7';

  // Create CSV content (simplified example)
  const csvContent = `Report Type,Date Range,Total Resumes,Shortlisted,Avg Score
${reportType},${dateRange},${document.getElementById('reportTotalResumes').textContent},${document.getElementById('reportShortlisted').textContent},${document.getElementById('reportAvgScore').textContent}`;

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${reportType}_${dateRange}days.csv`;
  a.click();
  window.URL.revokeObjectURL(url);

  console.log('CSV report downloaded');
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dashboard-page")) return;
  renderDashboardCards();
  renderDashboardCharts();
  populateQuickFilters();
  initializeTabButtons();
  initializeReportsTab();
});
