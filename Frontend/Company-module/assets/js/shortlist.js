/**
 * ============================================================================
 * SHORTLIST PAGE - Candidate Filtering, Sorting, and Actions
 * ============================================================================
 *
 * This file manages the interactive candidate shortlist table, including search,
 * filtering, sorting, comparison, and exporting functionalities.
 *
 * BACKEND INTEGRATION:
 * - Fetches candidates from backend API with filter support
 * - Shortlist operations (add/remove) use backend API endpoints
 * - Authentication handled via session token
 *
 * API Endpoints:
 * - GET /api/candidates?search=...&minScore=...&sortBy=...
 * - GET /api/shortlist/
 * - POST /api/shortlist/ (add to shortlist)
 * - DELETE /api/shortlist/{id} (remove from shortlist)
 * ============================================================================
 */
import { getStoredData, setStoredData, STORAGE_KEYS } from './data.js';
import API from '../../../config/api-endpoint.js';
import { logout } from '../../../src/utils/router.js';

function setupShortlistTable() {
  const tableBody = document.querySelector("#candidateTableBody");
  if (!tableBody) return;

  const searchInput = document.querySelector("#candidateSearch");
  const matchFilter = document.querySelector("#candidateFilter");
  const deptFilter = document.querySelector("#candidateDept");
  const roleFilter = document.querySelector("#candidateRole");
  const sortSelect = document.querySelector("#candidateSort");
  const autoFilterToggle = document.querySelector("#autoFilterToggle");
  const exportBtn = document.querySelector("#exportBtn");
  const compareBtn = document.querySelector("#compareBtn");
  const runMatchingBtn = document.querySelector("#runMatchingBtn");

  let isComparing = false;
  let selectedForComparison = new Set();
  let candidatesCache = [];
  let shortlistCache = {};
  let jdsCache = []; // Cache for job descriptions

  // Make candidatesCache accessible globally for comparison modal
  window.candidatesCache = candidatesCache;

  const getToken = () => sessionStorage.getItem('companyAuthToken');

  const showMessage = (msg, type = 'info') => {
    // Simple alert for now, can be replaced with toast notification
    alert(msg);
  };

  /**
   * Fetches candidates from the backend API with optional filters
   */
  const fetchCandidates = async (filters = {}) => {
    const token = getToken();
    if (!token) {
      logout();
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.minScore) params.append('minScore', filters.minScore);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);

      const response = await fetch(`${API.company.candidates.getAll}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error('Failed to fetch candidates');
      }

      const candidates = await response.json();
      candidatesCache = candidates;
      window.candidatesCache = candidates; // Update global reference
      return candidates;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      showMessage('Failed to load candidates', 'error');
      return [];
    }
  };

  /**
   * Fetches shortlist data from the backend API
   */
  const fetchShortlist = async () => {
    const token = getToken();
    if (!token) {
      logout();
      return {};
    }

    try {
      const response = await fetch(API.company.shortlist.getAll, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error('Failed to fetch shortlist');
      }

      const shortlistArray = await response.json();
      // Convert array to object keyed by candidate_id for easier lookup
      const shortlistMap = {};
      shortlistArray.forEach(item => {
        // Use composite key: candidate_id + "_" + jd_id
        const key = `${item.candidate_id}_${item.jd_id}`;
        shortlistMap[key] = {
          id: item.id,
          shortlisted: item.shortlisted,
          jdId: item.jd_id
        };
      });
      shortlistCache = shortlistMap;
      return shortlistMap;
    } catch (error) {
      console.error('Error fetching shortlist:', error);
      return {};
    }
  };

  /**
   * Fetches job descriptions from the backend API and populates filters
   */
  const fetchJDs = async () => {
    const token = getToken();
    if (!token) {
      logout();
      return [];
    }

    try {
      const response = await fetch(API.company.jds.getAll, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error('Failed to fetch JDs');
      }

      const jds = await response.json();
      jdsCache = jds;



      // Populate Role Filter (unique titles)
      if (roleFilter) {
        const roles = [...new Set(jds.map(jd => jd.title).filter(Boolean))];
        const currentVal = roleFilter.value;
        roleFilter.innerHTML = '<option value="all">Any Role</option>';
        roles.forEach(role => {
          const option = document.createElement('option');
          option.value = role;
          option.textContent = role;
          roleFilter.appendChild(option);
        });
        if (currentVal && Array.from(roleFilter.options).some(o => o.value === currentVal)) {
          roleFilter.value = currentVal;
        }
      }

      // Populate Department Filter (unique departments)
      if (deptFilter) {
        const depts = [...new Set(jds.map(jd => jd.department).filter(Boolean))];
        const currentVal = deptFilter.value;
        deptFilter.innerHTML = '<option value="all">Any Department</option>';
        depts.forEach(dept => {
          const option = document.createElement('option');
          option.value = dept;
          option.textContent = dept;
          deptFilter.appendChild(option);
        });
        if (currentVal && Array.from(deptFilter.options).some(o => o.value === currentVal)) {
          deptFilter.value = currentVal;
        }
      }

      return jds;
    } catch (error) {
      console.error('Error fetching JDs:', error);
      return [];
    }
  };

  /**
   * Runs AI matching for all candidates against all JDs
   */
  const runMatching = async () => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

    if (runMatchingBtn) {
      runMatchingBtn.disabled = true;
      runMatchingBtn.textContent = '⏳ Running Matching...';
    }

    try {
      const response = await fetch(API.company.matching.run, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        if (response.status === 404) {
          throw new Error('No candidates or job descriptions found');
        }
        throw new Error('Failed to run matching');
      }

      const matches = await response.json();
      showMessage(`Successfully matched ${matches.length} candidates!`, 'success');

      // Refresh candidates to get updated match data
      await applyFilters();
    } catch (error) {
      console.error('Error running matching:', error);
      showMessage(error.message || 'Failed to run matching', 'error');
    } finally {
      if (runMatchingBtn) {
        runMatchingBtn.disabled = false;
        runMatchingBtn.textContent = '🤖 Run AI Matching';
      }
    }
  };

  /**
   * Applies filters and re-renders the candidate table.
   */
  const applyFilters = async () => {
    const searchTerm = searchInput?.value || "";
    const minMatch = matchFilter?.value === "all" ? 0 : parseInt(matchFilter.value, 10);
    const autoMin = autoFilterToggle?.checked ? 80 : 0;
    const effectiveMin = Math.max(minMatch, autoMin);
    const sortMode = sortSelect?.value || "score";
    const role = roleFilter?.value !== 'all' ? roleFilter?.value : null;
    const department = deptFilter?.value !== 'all' ? deptFilter?.value : null;

    // Fetch candidates with filters from backend
    const filters = {
      search: searchTerm,
      minScore: effectiveMin,
      sortBy: sortMode,
      role: role,
      department: department
    };

    const candidates = await fetchCandidates(filters);

    // Remove any selections that are no longer in the filtered dataset
    selectedForComparison = new Set([...selectedForComparison].filter((id) => candidates.some((c) => c.id === id)));
    renderRows(candidates);
  };

  const renderRows = (dataset) => {
    // Expand candidates into rows: one row per candidate-JD match
    const rows = [];
    const selectedRole = roleFilter?.value !== 'all' ? roleFilter?.value : null;

    dataset.forEach((candidate) => {
      const rejected = candidate.rejected === 'rejected';

      // Check if this candidate is already shortlisted for ANY JD
      const candidateShortlistedForAnyJD = Object.keys(shortlistCache).some(key => {
        const [candId] = key.split('_');
        return candId === candidate.id && shortlistCache[key].shortlisted;
      });

      // If candidate has matches, create one row per match
      if (candidate.matches && candidate.matches.length > 0) {
        candidate.matches.forEach((match, index) => {
          const jd = jdsCache.find(j => j.id === match.jd_id);

          // Apply JD title filtering if a specific role is selected
          if (selectedRole && (!jd || jd.title !== selectedRole)) {
            return; // Skip this match if it doesn't match the selected role
          }

          const isSelected = selectedForComparison.has(candidate.id);


          // Lookup using composite key
          const shortlistKey = `${candidate.id}_${match.jd_id}`;
          const shortlistEntry = shortlistCache[shortlistKey] || {};
          const shortlisted = shortlistEntry.shortlisted;

          // Disable checkbox if candidate is shortlisted for a DIFFERENT JD
          const isShortlistedForDifferentJD = candidateShortlistedForAnyJD && !shortlisted;
          const disableCheckbox = isShortlistedForDifferentJD;
          const checkboxTitle = disableCheckbox
            ? 'Candidate already shortlisted for another JD'
            : 'Toggle shortlist status';

          rows.push(`
            <tr data-id="${candidate.id}" data-jd-id="${match.jd_id}" class="${isSelected ? "selected" : ""} ${rejected ? 'rejected' : ''}">
              <td>
                <a href="candidate.html?id=${candidate.id}&jd_id=${match.jd_id}">${candidate.name}</a>
                <div class="breadcrumbs">${candidate.primary_role || candidate.primaryRole || ''}</div>
              </td>
              <td>${(parseInt(candidate.experience_years || candidate.experience || 0, 10) > 0) ? `${candidate.experience_years || candidate.experience} yrs` : '-'}</td>
              <td>
                ${jd ? `<span class="breadcrumbs" title="${jd.title}">${jd.title}</span>` : '<span class="breadcrumbs" style="color: #999;">Unknown JD</span>'}
              </td>
              <td>${match.skill_match || 0}%</td>
              <td>${match.sbert_score || 0}</td>
              <td>${match.final_score || 0}</td>
              <td>
                <label class="pill ${disableCheckbox ? 'disabled' : ''}">
                  <input type="checkbox" class="shortlist-toggle" ${shortlisted ? "checked" : ""} ${disableCheckbox ? "disabled" : ""} title="${checkboxTitle}"> Shortlist
                </label>
                
                ${index === 0 ? `
                  <div style="margin-top: 4px;">
                    <button class="btn btn-outline reject-btn" type="button" style="font-size: 0.9em; padding: 2px 25px;">${rejected ? 'Unreject' : 'Reject'}</button>
                    <button class="btn btn-danger delete-btn" type="button" style="font-size: 0.9em; padding: 2px 25px; margin-top: 4px;">Delete</button>
                  </div>
                ` : ''}
              </td>
              <td class="compare-checkbox-cell">
                ${index === 0 ? `
                  <label class="pill">
                    <input type="checkbox" class="compare-checkbox" ${isSelected ? "checked" : ""}> Compare
                  </label>
                ` : ''}
              </td>
            </tr>
          `);
        });
      } else {
        // No matches - show candidate with empty match data
        const isSelected = selectedForComparison.has(candidate.id);
        rows.push(`
          <tr data-id="${candidate.id}" class="${isSelected ? "selected" : ""} ${rejected ? 'rejected' : ''}">
            <td>
              <a href="candidate.html?id=${candidate.id}">${candidate.name}</a>
              <div class="breadcrumbs">${candidate.primary_role || candidate.primaryRole || ''}</div>
            </td>
            <td>${(parseInt(candidate.experience_years || candidate.experience || 0, 10) > 0) ? `${candidate.experience_years || candidate.experience} yrs` : '-'}</td>
            <td><span class="breadcrumbs" style="color: #999;">Not matched</span></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>
              <label class="pill">
                <input type="checkbox" class="shortlist-toggle" disabled title="Cannot shortlist without JD match"> Shortlist
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
        `);
      }
    });

    tableBody.innerHTML = rows.join("");

    // No longer needed with the new flow
    // if (compareBtn) compareBtn.disabled = selectedForComparison.size !== 2;
  };

  /**
   * Handles toggling the shortlist status for a candidate.
   */
  // delegated listener: toggle shortlist checkbox, reject, delete, and selection
  tableBody.addEventListener("click", async (event) => {
    const del = event.target.closest('.delete-btn');
    if (del) {
      const row = del.closest('tr');
      const candId = row.dataset.id;

      if (!confirm('Are you sure you want to delete this candidate?')) return;

      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(API.company.candidates.delete(candId), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete candidate');

        showMessage('Candidate deleted successfully', 'success');
        applyFilters(); // Refresh the list
        if (typeof renderDashboardCards === "function") renderDashboardCards();
      } catch (error) {
        console.error('Error deleting candidate:', error);
        showMessage('Failed to delete candidate', 'error');
      }
      return;
    }

    const rej = event.target.closest('.reject-btn');
    if (rej) {
      const row = rej.closest('tr');
      const candId = row.dataset.id;
      const candidate = candidatesCache.find(c => c.id === candId);
      const currentRejected = candidate?.rejected || 'none';
      const newStatus = currentRejected === 'rejected' ? 'none' : 'rejected';

      const token = getToken();
      if (!token) return;

      try {
        // Update rejection status in backend
        const response = await fetch(API.company.candidates.update(candId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rejected: newStatus,
            rejection_reason: newStatus === 'rejected' ? 'Rejected from shortlist' : null
          })
        });

        if (!response.ok) throw new Error('Failed to update rejection status');

        showMessage(`Candidate ${newStatus === 'rejected' ? 'rejected' : 'un-rejected'} successfully`, 'success');

        // Refresh the list to show updated status
        await applyFilters();
      } catch (error) {
        console.error('Error updating rejection:', error);
        showMessage('Failed to update rejection status', 'error');
      }
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
  tableBody.addEventListener("change", async (event) => {
    // shortlist toggle
    if (event.target.classList.contains("shortlist-toggle")) {
      const row = event.target.closest("tr");
      const candId = row.dataset.id;
      const isChecked = event.target.checked;
      const token = getToken();

      if (!token) return;

      if (!token) return;

      // We need jdId to construct the key
      const jdId = row.dataset.jdId;
      if (!jdId) {
        showMessage('Cannot shortlist: No job description associated', 'error');
        event.target.checked = false;
        return;
      }

      const compositeKey = `${candId}_${jdId}`;
      const currentEntry = shortlistCache[compositeKey];

      try {
        if (isChecked) {
          // Add to shortlist
          // jdId is already retrieved above

          const response = await fetch(API.company.shortlist.add, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              candidate_id: candId,
              jd_id: jdId,
              shortlisted: true
            })
          });

          if (!response.ok) throw new Error('Failed to add to shortlist');

          const result = await response.json();
          shortlistCache[compositeKey] = {
            id: result.id,
            shortlisted: true,
            jdId: jdId,
            rejected: false
          };

          showMessage('Added to shortlist', 'success');

          // Refresh the table to update checkbox states for other JDs of this candidate
          await applyFilters();
        } else {
          // Remove from shortlist
          if (!currentEntry || !currentEntry.id) {
            // Not in shortlist, just update cache
            delete shortlistCache[candId];
            return;
          }

          const response = await fetch(API.company.shortlist.remove(currentEntry.id), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) throw new Error('Failed to remove from shortlist');

          delete shortlistCache[compositeKey];
          showMessage('Removed from shortlist', 'success');

          // Refresh the table to update checkbox states for other JDs of this candidate
          await applyFilters();
        }

        if (typeof renderDashboardCards === "function") renderDashboardCards();
      } catch (error) {
        console.error('Error updating shortlist:', error);
        showMessage('Failed to update shortlist', 'error');
        event.target.checked = !isChecked; // Revert checkbox
      }
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

  runMatchingBtn?.addEventListener("click", runMatching);

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
    const candidates = candidatesCache || [];
    const rows = [
      ["Name", "Experience", "JD Title", "Skill Match", "SBERT", "Final Score"]
    ];

    candidates.forEach((c) => {
      const experience = c.experience_years || c.experience || 0;
      const expDisplay = experience > 0 ? `${experience} yrs` : '-';

      if (c.matches && c.matches.length > 0) {
        c.matches.forEach(m => {
          // Check if this specific match is shortlisted
          const shortlistKey = `${c.id}_${m.jd_id}`;
          const isShortlisted = shortlistCache[shortlistKey]?.shortlisted;

          if (isShortlisted) {
            const jd = jdsCache.find(j => j.id === m.jd_id);
            rows.push([
              `"${c.name}"`, // Quote to handle commas
              expDisplay,
              `"${jd ? jd.title : 'Unknown JD'}"`,
              `${m.skill_match || 0}%`,
              m.sbert_score || 0,
              m.final_score || 0
            ]);
          }
        });
      }
    });

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "shortlist.csv";
    link.click();
  });

  [searchInput, matchFilter, sortSelect, autoFilterToggle, roleFilter, deptFilter]
    .filter(Boolean)
    .forEach((el) => {
      const eventName = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
      el.addEventListener(eventName, applyFilters);
    });

  // Initialize: fetch data and render
  (async () => {
    await fetchJDs(); // Fetch JDs first
    await fetchShortlist();
    await applyFilters();
  })();
}

function openComparisonModal(firstId, secondId) {
  const modal = document.querySelector("#comparisonModal");
  const container = modal?.querySelector("#comparisonContainer");
  if (!modal || !container) return;

  // Access candidatesCache from the parent scope
  const candidates = window.candidatesCache || [];
  const first = candidates.find((c) => c.id === firstId);
  const second = candidates.find((c) => c.id === secondId);
  if (!first || !second) return;

  // Compare skills and find matches/differences
  const firstSkills = new Set(first.skills || []);
  const secondSkills = new Set(second.skills || []);
  const commonSkills = (first.skills || []).filter(skill => secondSkills.has(skill));
  const uniqueToFirst = (first.skills || []).filter(skill => !secondSkills.has(skill));
  const uniqueToSecond = (second.skills || []).filter(skill => !firstSkills.has(skill));

  // Calculate relative strengths
  const getStrengths = (candidate) => {
    const strengths = [];
    // Get first match from matches array
    const match = candidate.matches && candidate.matches.length > 0 ? candidate.matches[0] : null;
    
    if (match && match.final_score >= 85) strengths.push('High match score');
    if (candidate.experience_years >= 5 || candidate.experience >= 5) strengths.push('Senior experience');
    if (match && match.skill_match >= 80) strengths.push('Strong skill alignment');
    if (candidate.projects && candidate.projects.length >= 3) strengths.push('Multiple relevant projects');
    return strengths;
  };

  const renderColumn = (candidate, unique, isFirst) => {
    const strengths = getStrengths(candidate);
    // Get the first match from matches array
    const match = candidate.matches && candidate.matches.length > 0 ? candidate.matches[0] : null;

    return `
      <div class="comparison-card ${isFirst ? 'first' : 'second'}">
        <header>
          <h3>${candidate.name || 'Unknown'}</h3>
          <div class="score-pill">
            Match: ${match?.final_score || 0}%
          </div>
        </header>
        
        <div class="comparison-section">
          <h4>Summary</h4>
          <p>${candidate.summary || 'No summary available'}</p>
        </div>

        <div class="comparison-section">
          <h4>Core Info</h4>
          <ul class="info-list">
            <li><strong>Experience:</strong> ${candidate.experience_years || candidate.experience || 0} years</li>
            <li><strong>Education:</strong> ${candidate.education || 'Not specified'}</li>
            <li><strong>Skill Match:</strong> ${match?.skill_match || 0}%</li>
            <li><strong>SBERT Score:</strong> ${match?.sbert_score || 0}</li>
          </ul>
        </div>

        <div class="comparison-section">
          <h4>Skills Breakdown</h4>
          <div class="skills-grid">
            <div>
              <label>Common Skills</label>
              <div class="chip-group">
                ${commonSkills.length > 0 ? commonSkills.map(skill =>
      `<span class="tag common">${skill}</span>`
    ).join('') : '<span style="color: #999;">None</span>'}
              </div>
            </div>
            <div>
              <label>Unique Skills</label>
              <div class="chip-group">
                ${unique.length > 0 ? unique.map(skill =>
      `<span class="tag unique">${skill}</span>`
    ).join('') : '<span style="color: #999;">None</span>'}
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-section">
          <h4>Key Strengths</h4>
          <ul class="strengths-list">
            ${strengths.length > 0 ? strengths.map(strength => `
              <li>${strength}</li>
            `).join('') : '<li style="color: #999;">No strengths data available</li>'}
          </ul>
        </div>

        <div class="comparison-section">
          <h4>Projects</h4>
          <ul class="project-list">
            ${candidate.projects && candidate.projects.length > 0 ? candidate.projects.map(project => `
              <li>${project}</li>
            `).join('') : '<li style="color: #999;">No projects listed</li>'}
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
