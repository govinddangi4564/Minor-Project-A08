/**
 * ============================================================================
 * SHORTLIST PAGE - Candidate Filtering, Sorting, and Actions
 * ============================================================================
 *
 * This file manages the interactive candidate shortlist table, including search,
 * filtering, sorting, comparison, and exporting functionalities.
 *
 * BACKEND INTEGRATION (TODO):
 * - Replace `getStoredData` with API calls to fetch candidates based on filters.
 * - The `applyFilters` function should construct a query and call the backend.
 * - Shortlisting a candidate should send a POST/DELETE request to the shortlist API.
 * - Exporting should trigger a backend job to generate and email a CSV.
 *
 * API Endpoints:
 * - GET /api/candidates?search=...&minScore=...&sortBy=...
 *   - Query Params: search (string), minScore (int), sortBy (string: 'score' | 'experience').
 *   - Response: A paginated list of candidate objects.
 *
 * - POST /api/shortlist
 *   - Body: { candidateId: 'uuid', jdId: 'uuid', shortlisted: true }
 *   - Response: Success message.
 *
 * DATABASE QUERIES (for GET /api/candidates):
 * - A flexible SQL query would be built on the backend:
 *   SELECT c.*, cm.final_score, cm.skill_match_percent
 *   FROM candidates c
 *   LEFT JOIN candidate_matches cm ON c.id = cm.candidate_id
 *   WHERE (c.name ILIKE '%<search>%' OR c.skills::text ILIKE '%<search>%')
 *   AND cm.final_score >= <minScore>
 *   ORDER BY cm.final_score DESC;
 * ============================================================================
 */
function populateShortlistFilters() {
  const deptFilter = document.querySelector("#candidateDept");
  const roleFilter = document.querySelector("#candidateRole");
  if (!deptFilter || !roleFilter) return;

  const jds = getStoredData(STORAGE_KEYS.jds) || [];

  const uniqueDepts = [...new Set(jds.map((jd) => jd.department))];
  const uniqueRoles = [...new Set(jds.map((jd) => jd.title))];

  deptFilter.innerHTML =
    '<option value="all">Any Department</option>' +
    uniqueDepts.map((dept) => `<option value="${dept}">${dept}</option>`).join("");
  roleFilter.innerHTML =
    '<option value="all">Any Role</option>' +
    uniqueRoles.map((role) => `<option value="${role}">${role}</option>`).join("");
}

function setupShortlistTable() {
  const tableBody = document.querySelector("#candidateTableBody");
  if (!tableBody) return;

  populateShortlistFilters();

  const searchInput = document.querySelector("#candidateSearch");
  const matchFilter = document.querySelector("#candidateFilter");
  const deptFilter = document.querySelector("#candidateDept");
  const roleFilter = document.querySelector("#candidateRole");
  const sortSelect = document.querySelector("#candidateSort");
  const autoFilterToggle = document.querySelector("#autoFilterToggle");
  const exportBtn = document.querySelector("#exportBtn");
  const compareBtn = document.querySelector("#compareBtn");

  let isComparing = false;
  let selectedForComparison = new Set();

  const getCandidates = () => getStoredData(STORAGE_KEYS.candidates) || [];
  const shortlist = () => getStoredData(STORAGE_KEYS.shortlist) || {};
  const jds = () => getStoredData(STORAGE_KEYS.jds) || [];

  /**
   * Applies filters and re-renders the candidate table.
   * TODO: Replace this with a single API call that passes filter criteria as query params.
   *
   * Example API Call:
   * async function fetchFilteredCandidates() {
   *   const params = new URLSearchParams({ searchTerm, minMatch, sortMode });
   *   const response = await fetch(`/api/candidates?${params}`);
   *   const data = await response.json();
   *   renderRows(data.candidates);
   * }
   */
  const applyFilters = () => {
    const allCandidates = getCandidates();
    const allJds = jds();
    const searchTerm = (searchInput?.value || "").toLowerCase();
    const minMatch = matchFilter?.value === "all" ? 0 : parseInt(matchFilter.value, 10);
    const autoMin = autoFilterToggle?.checked ? 80 : 0;
    const effectiveMin = Math.max(minMatch, autoMin);
    const sortMode = sortSelect?.value || "score";
    const selectedDept = deptFilter?.value;
    const selectedRole = roleFilter?.value;

    const filtered = allCandidates
      .filter((candidate) => {
        const matchesSearch =
          !searchTerm ||
          candidate.name.toLowerCase().includes(searchTerm) ||
          candidate.skills.some((skill) => skill.toLowerCase().includes(searchTerm));
        
        const finalScore = candidate.matches?.finalScore || 0;
        
        const jd = allJds.find(j => j.id === candidate.matches?.jdId);

        const deptOk = !selectedDept || selectedDept === 'all' || (jd && jd.department === selectedDept);
        const roleOk = !selectedRole || selectedRole === 'all' || (jd && jd.title === selectedRole);

        return matchesSearch && finalScore >= effectiveMin && deptOk && roleOk;
      })
      .sort((a, b) => {
        if (sortMode === "experience") {
          return b.experience - a.experience;
        }
        if (sortMode === "newest") {
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        }
        return (b.matches?.finalScore || 0) - (a.matches?.finalScore || 0);
      });

    // Remove any selections that are no longer in the filtered dataset
    selectedForComparison = new Set([...selectedForComparison].filter((id) => filtered.some((c) => c.id === id)));
    renderRows(filtered);
  };

  const renderRows = (dataset) => {
    tableBody.innerHTML = dataset
      .map((candidate) => {
        const isSelected = selectedForComparison.has(candidate.id);
        const shortlistEntry = shortlist()[candidate.id] || {};
        const shortlisted = shortlistEntry.shortlisted;
        const rejected = shortlistEntry.rejected;
        return `
          <tr data-id="${candidate.id}" class="${isSelected ? "selected" : ""} ${rejected ? 'rejected' : ''}">
            <td>
              <a href="candidate.html?id=${candidate.id}">${candidate.name}</a>
              <div class="breadcrumbs">${candidate.primaryRole}</div>
            </td>
            <td>${candidate.experience} yrs</td>
            <td>${candidate.matches?.skillMatch || 0}%</td>
            <td>${candidate.matches?.sbertScore || 0}</td>
            <td>${candidate.matches?.finalScore || 0}</td>
                <td>
                  <label class="pill">
                    <input type="checkbox" class="shortlist-toggle" ${shortlisted ? "checked" : ""}> Shortlist
                  </label>
                  
                  <button class="btn btn-outline reject-btn" type="button">${rejected ? 'Unreject' : 'Reject'}</button>
                  <button class="btn btn-danger delete-btn" type="button">Delete</button>
                </td>
                <td class="compare-checkbox-cell">
                  <label class="pill">
                    <input type="checkbox" class="compare-checkbox" ${isSelected ? "checked" : ""}> Compare
                  </label>
                </td>
          </tr>
        `;
      })
      .join("");

    // No longer needed with the new flow
    // if (compareBtn) compareBtn.disabled = selectedForComparison.size !== 2;
  };

  /**
   * Handles toggling the shortlist status for a candidate.
   * TODO: Replace with an API call to update the shortlist status in the database.
   *
   * Example API Call:
   * await fetch('/api/shortlist', {
   *   method: 'POST',
   *   body: JSON.stringify({ candidateId: candId, shortlisted: event.target.checked })
   * });
   */
  // delegated listener: toggle shortlist checkbox, reject, delete, and selection
  tableBody.addEventListener("click", (event) => {
    const del = event.target.closest('.delete-btn');
    if (del) {
      const row = del.closest('tr');
      const candId = row.dataset.id;
      // remove candidate from storage
      const all = getCandidates();
      const updated = all.filter(c => c.id !== candId);
      setStoredData(STORAGE_KEYS.candidates, updated);
      // also clear shortlist entry
      const currentShortlist = shortlist();
      delete currentShortlist[candId];
      setStoredData(STORAGE_KEYS.shortlist, currentShortlist);
      applyFilters();
      if (typeof renderDashboardCards === "function") renderDashboardCards();
      // Event is automatically dispatched by setStoredData
      return;
    }

    const rej = event.target.closest('.reject-btn');
    if (rej) {
      const row = rej.closest('tr');
      const candId = row.dataset.id;
      const currentShortlist = shortlist();
      currentShortlist[candId] = currentShortlist[candId] || {};
      const now = !currentShortlist[candId].rejected;
      // mark rejected and remove shortlisted if rejecting
      currentShortlist[candId].rejected = now;
      if (now) currentShortlist[candId].shortlisted = false;
      setStoredData(STORAGE_KEYS.shortlist, currentShortlist);
      applyFilters();
      return;
    }

    // If not in comparing mode, default row click navigates to detail page
    if (!isComparing && !event.target.closest('input') && !event.target.closest('button') && !event.target.closest('a')) {
      // Default behavior: navigate to candidate detail page
      const row = event.target.closest('tr');
      const link = row.querySelector('a');
      if (link) window.location.href = link.href;
    }
  });

  // listen for shortlist checkbox and compare-checkbox changes
  tableBody.addEventListener("change", (event) => {
    // shortlist toggle
    if (event.target.classList.contains("shortlist-toggle")) {
      const row = event.target.closest("tr");
      const candId = row.dataset.id;
      const currentShortlist = shortlist();
      currentShortlist[candId] = currentShortlist[candId] || {};
      currentShortlist[candId].shortlisted = event.target.checked;
      // if shortlisted, ensure rejected is false
      if (event.target.checked) currentShortlist[candId].rejected = false;
      currentShortlist[candId].jdId = getCandidates().find((c) => c.id === candId)?.matches?.jdId;
      setStoredData(STORAGE_KEYS.shortlist, currentShortlist);
      if (typeof renderDashboardCards === "function") renderDashboardCards();
      // Event is automatically dispatched by setStoredData
      return;
    }

    // compare checkbox
    if (event.target.classList.contains('compare-checkbox')) {
      const row = event.target.closest('tr');
      const candId = row.dataset.id;
      if (event.target.checked) {
        if (selectedForComparison.size >= 2) {
          event.target.checked = false; // prevent checking
          alert('You can only select two candidates for comparison.');
          return;
        }
        selectedForComparison.add(candId);
        row.classList.add('selected');
      } else {
        selectedForComparison.delete(candId);
        row.classList.remove('selected');
      }

      if (selectedForComparison.size === 2) {
        const [firstId, secondId] = Array.from(selectedForComparison.values());
        openComparisonModal(firstId, secondId);

        // Reset state after comparison
        isComparing = false;
        compareBtn.classList.remove('active');
        compareBtn.textContent = 'Compare Candidates';
        document.body.classList.remove('is-comparing');
        selectedForComparison.clear();
        setTimeout(applyFilters, 100); // Re-render to hide checkboxes
      }
    }
  });

  compareBtn?.addEventListener("click", () => {
    isComparing = !isComparing; // Toggle compare mode
    selectedForComparison.clear();
    applyFilters(); // Re-render to clear any previous selections

    if (isComparing) {
      compareBtn.classList.add('active');
      compareBtn.textContent = 'Cancel Comparison';
      document.body.classList.add('is-comparing');
      // Optionally, show a toast/notification
    } else {
      compareBtn.classList.remove('active');
      compareBtn.textContent = 'Compare Candidates';
      document.body.classList.remove('is-comparing');
    }
  });

  /**
   * Exports the current view of candidates to a CSV file.
   * TODO: In a real application, this should trigger a backend endpoint.
   * The backend would generate the CSV from the database and either return it
   * as a file stream or email it to the user.
   *
   * Example API Call:
   * `window.location.href = '/api/export/shortlist?format=csv';`
   */
  exportBtn?.addEventListener("click", () => {
    const candidates = getCandidates();
    const rows = [
      ["Name", "Experience", "Skill Match", "SBERT", "Final Score"],
      ...candidates.map((c) => [
        c.name,
        `${c.experience} yrs`,
        `${c.matches?.skillMatch || 0}%`,
        c.matches?.sbertScore || 0,
        c.matches?.finalScore || 0,
      ]),
    ];
    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "shortlist.csv";
    link.click();
  });

  [searchInput, matchFilter, deptFilter, roleFilter, sortSelect, autoFilterToggle]
    .filter(Boolean)
    .forEach((el) => {
      const eventName = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
      el.addEventListener(eventName, applyFilters);
    });

  applyFilters();
}

function openComparisonModal(firstId, secondId) {
  const modal = document.querySelector("#comparisonModal");
  const container = modal?.querySelector("#comparisonContainer");
  if (!modal || !container) return;
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const first = candidates.find((c) => c.id === firstId);
  const second = candidates.find((c) => c.id === secondId);
  if (!first || !second) return;

  // Compare skills and find matches/differences
  const firstSkills = new Set(first.skills);
  const secondSkills = new Set(second.skills);
  const commonSkills = first.skills.filter(skill => secondSkills.has(skill));
  const uniqueToFirst = first.skills.filter(skill => !secondSkills.has(skill));
  const uniqueToSecond = second.skills.filter(skill => !firstSkills.has(skill));

  // Calculate relative strengths
  const getStrengths = (candidate) => {
    const strengths = [];
    if (candidate.matches?.finalScore >= 85) strengths.push('High match score');
    if (candidate.experience >= 5) strengths.push('Senior experience');
    if (candidate.matches?.skillMatch >= 80) strengths.push('Strong skill alignment');
    if (candidate.projects?.length >= 3) strengths.push('Multiple relevant projects');
    return strengths;
  };

  const renderColumn = (candidate, unique, isFirst) => {
    const strengths = getStrengths(candidate);
    const matchedSkills = candidate.matches?.matchedSkills || [];

    return `
      <div class="comparison-card ${isFirst ? 'first' : 'second'}">
        <header>
          <h3>${candidate.name}</h3>
          <div class="score-pill">
            Match: ${candidate.matches?.finalScore || 0}%
          </div>
        </header>
        
        <div class="comparison-section">
          <h4>Summary</h4>
          <p>${candidate.summary}</p>
        </div>

        <div class="comparison-section">
          <h4>Core Info</h4>
          <ul class="info-list">
            <li><strong>Experience:</strong> ${candidate.experience} years</li>
            <li><strong>Education:</strong> ${candidate.education}</li>
            <li><strong>Skill Match:</strong> ${candidate.matches?.skillMatch || 0}%</li>
            <li><strong>SBERT Score:</strong> ${candidate.matches?.sbertScore || 0}</li>
          </ul>
        </div>

        <div class="comparison-section">
          <h4>Skills Breakdown</h4>
          <div class="skills-grid">
            <div>
              <label>Common Skills</label>
              <div class="chip-group">
                ${commonSkills.map(skill =>
      `<span class="tag common">${skill}</span>`
    ).join('')}
              </div>
            </div>
            <div>
              <label>Unique Skills</label>
              <div class="chip-group">
                ${unique.map(skill =>
      `<span class="tag unique">${skill}</span>`
    ).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-section">
          <h4>Key Strengths</h4>
          <ul class="strengths-list">
            ${strengths.map(strength => `
              <li>${strength}</li>
            `).join('')}
          </ul>
        </div>

        <div class="comparison-section">
          <h4>Projects</h4>
          <ul class="project-list">
            ${candidate.projects.map(project => `
              <li>${project}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="comparison-grid">
      ${renderColumn(first, uniqueToFirst, true)}
      ${renderColumn(second, uniqueToSecond, false)}
    </div>
  `;

  modal.classList.add("active");
  modal.querySelector(".btn-close").addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) modal.classList.remove("active");
    },
    { once: true }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("shortlist-page")) return;
  setupShortlistTable();
});
