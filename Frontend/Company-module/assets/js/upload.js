import API from '../../../config/api-endpoint.js';
import { navigateTo, routes, logout } from '../../../src/utils/router.js';
import { getStoredData, STORAGE_KEYS } from './data.js';

function setupResumeUpload() {
  if (sessionStorage.getItem('isCompanyLoggedIn') !== 'true') {
    logout();
    return;
  }

  const dropZone = document.querySelector("#resumeDropZone");
  const fileInput = document.querySelector("#resumeInput");
  const progressBar = document.querySelector("#uploadProgressBar");
  const previewList = document.querySelector("#resumePreviewList");
  const runMatchingBtn = document.querySelector("#runMatchingBtn");
  const logBody = document.querySelector("#parsingLogBody");

  if (!dropZone || !fileInput || !progressBar || !previewList) return;

  // Initialize log
  if (logBody && logBody.children.length === 0) {
    logBody.innerHTML = `<tr class="empty-log-row"><td colspan="4">No resume parsing activity has been logged in this session yet.</td></tr>`;
  }

  const getToken = () => sessionStorage.getItem('companyAuthToken');

  const appendToLog = (fileName, status, details) => {
    if (!logBody) return;
    const emptyRow = logBody.querySelector(".empty-log-row");
    if (emptyRow) emptyRow.remove();

    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td>${new Date().toLocaleTimeString()}</td>
      <td>${fileName}</td>
      <td><span class="status-${status.toLowerCase()}">${status}</span></td>
      <td>${details}</td>
    `;
    logBody.prepend(newRow);
    updateLogCount();
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file); // Backend expects 'file'

    try {
      const response = await fetch(API.company.resumes.upload, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const fetchCandidateById = async (candidateId) => {
    try {
      const response = await fetch(API.company.candidates.get(candidateId), {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch candidate data');
      }

      const candidate = await response.json();
      return candidate;
    } catch (error) {
      console.error('Error fetching candidate:', error);
      return null;
    }
  };

  const handleFiles = async (files) => {
    // Check if JDs exist (optional, but good practice)
    // const jds = await fetch(API.company.jds.getAll, { headers: { 'Authorization': `Bearer ${getToken()}` } }).then(r => r.json()).catch(() => []);
    // if (!jds.length) {
    //   alert("Please create at least one Job Description before uploading resumes.");
    //   return;
    // }

    const fileArray = [...files];
    if (!fileArray.length) return;

    previewList.innerHTML = "";
    progressBar.style.width = "0%";
    let processed = 0;
    let successCount = 0;

    for (const file of fileArray) {
      try {
        // Update progress (start)
        const progress = Math.round(((processed + 0.1) / fileArray.length) * 100);
        progressBar.style.width = `${progress}%`;

        const result = await uploadFile(file);

        // Backend returns { message, resume_id, parsed_text, candidate_id }
        // Fetch the full candidate data
        const candidate = result.candidate_id ? await fetchCandidateById(result.candidate_id) : null;

        const card = document.createElement("div");
        card.className = "card";
        card.style.padding = "1rem";
        card.style.marginBottom = "1rem";

        if (candidate) {
          // Display detailed candidate information
          const skillsHtml = candidate.skills && candidate.skills.length > 0
            ? `<div class="chip-group" style="margin-top: 8px;">
                ${candidate.skills.slice(0, 5).map(skill => `<span class="tag">${skill}</span>`).join('')}
                ${candidate.skills.length > 5 ? `<span class="tag">+${candidate.skills.length - 5} more</span>` : ''}
              </div>`
            : '';

          card.innerHTML = `
            <h4>${candidate.name || file.name}</h4>
            <p class="text-success"><i class="fas fa-check-circle"></i> Uploaded & Parsed Successfully</p>
            <div style="margin-top: 12px;">
              <p style="margin: 4px 0;"><strong>Email:</strong> ${candidate.email || 'N/A'}</p>
              ${candidate.phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${candidate.phone}</p>` : ''}
              ${candidate.experience_years ? `<p style="margin: 4px 0;"><strong>Experience:</strong> ${candidate.experience_years} years</p>` : ''}
              ${candidate.role ? `<p style="margin: 4px 0;"><strong>Role:</strong> ${candidate.role}</p>` : ''}
              ${candidate.department ? `<p style="margin: 4px 0;"><strong>Department:</strong> ${candidate.department}</p>` : ''}
              ${skillsHtml}
              ${candidate.summary ? `<p style="margin-top: 8px; font-size: 0.9em; color: #666;">${candidate.summary.substring(0, 150)}${candidate.summary.length > 150 ? '...' : ''}</p>` : ''}
            </div>
            <a href="candidate.html?id=${candidate.id}" class="btn btn-outline" style="margin-top: 12px;">View Full Profile →</a>
          `;
        } else {
          // Fallback if candidate data not available
          card.innerHTML = `
            <h4>${file.name}</h4>
            <p class="text-success"><i class="fas fa-check-circle"></i> Uploaded & Parsed Successfully</p>
          `;
        }

        previewList.appendChild(card);

        appendToLog(file.name, 'Success', candidate ? `Parsed: ${candidate.name}` : 'Resume uploaded and parsed.');
        successCount++;

      } catch (error) {
        appendToLog(file.name, 'Error', error.message);
        const card = document.createElement("div");
        card.className = "card";
        card.style.padding = "1rem";
        card.style.marginBottom = "1rem";
        card.style.borderLeft = "4px solid red";
        card.innerHTML = `
            <h4>${file.name}</h4>
            <p class="text-danger"><i class="fas fa-times-circle"></i> ${error.message}</p>
        `;
        previewList.appendChild(card);
      } finally {
        processed++;
        progressBar.style.width = `${Math.round((processed / fileArray.length) * 100)}%`;
      }
    }

    if (successCount > 0) {
      runMatchingBtn.style.display = "inline-block";
    }
  };

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove("dragover"));
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  });

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => handleFiles(event.target.files));

  if (runMatchingBtn) {
    runMatchingBtn.addEventListener("click", async () => {
      runMatchingBtn.disabled = true;
      runMatchingBtn.textContent = "Running AI Matching...";

      try {
        const response = await fetch(API.company.matching.run, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });

        if (!response.ok) throw new Error('Matching failed');

        const matches = await response.json();
        alert(`AI matching complete! Processed ${matches.length} candidates.`);
        navigateTo(routes.company.shortlist);
      } catch (error) {
        console.error(error);
        alert('Error running matching process.');
      } finally {
        runMatchingBtn.disabled = false;
        runMatchingBtn.textContent = "Run AI Matching";
      }
    });
  }
}

function initializeTabButtons() {
  const tabButtons = document.querySelectorAll('.tabs button');
  const tabContents = document.querySelectorAll('.tab-content');

  if (!tabButtons.length) return;

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      tabContents.forEach((content) => content.classList.remove('active'));

      const targetContent = document.getElementById(`tab-${tabName}`);
      if (targetContent) targetContent.classList.add('active');

      if (tabName === 'job-descriptions') {
        loadRecentJDs();
      } else if (tabName === 'parsing-logs') {
        updateLogCount();
      }
    });
  });
}

async function loadRecentJDs() {
  const recentJDsContainer = document.getElementById('recentJDs');
  if (!recentJDsContainer) return;

  try {
    const response = await fetch(API.company.jds.getAll, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` }
    });

    if (!response.ok) throw new Error('Failed to fetch JDs');

    const jds = await response.json();

    if (jds.length === 0) {
      recentJDsContainer.innerHTML = '<p class="breadcrumbs">No job descriptions found. <a href="jd.html">Create your first JD</a></p>';
      return;
    }

    // Show last 5 JDs
    const recentJDs = jds.slice(-5).reverse();
    recentJDsContainer.innerHTML = recentJDs.map(jd => `
        <div class="card" style="margin-bottom: 12px; padding: 16px;">
          <h4 style="margin: 0 0 8px 0;">${jd.title}</h4>
          <p class="breadcrumbs" style="margin: 0 0 8px 0;">${jd.department || 'General'} • ${jd.location || 'Remote'}</p>
          <a href="jd.html?id=${jd.id}" class="btn-link">View Details →</a>
        </div>
      `).join('');
  } catch (error) {
    console.error(error);
    recentJDsContainer.innerHTML = '<p class="error">Failed to load job descriptions.</p>';
  }
}

function updateLogCount() {
  const logBody = document.querySelector("#parsingLogBody");
  const logCount = document.querySelector("#logCount");
  if (!logBody || !logCount) return;
  const rows = logBody.querySelectorAll('tr:not(.empty-log-row)');
  logCount.textContent = `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;
}

async function loadRecentCandidates() {
  const previewList = document.querySelector("#resumePreviewList");
  if (!previewList) return;

  const getToken = () => sessionStorage.getItem('companyAuthToken');
  const token = getToken();

  if (!token) return;

  try {
    // Fetch recent candidates (limit to 10 most recent)
    const response = await fetch(`${API.company.candidates.getAll}?limit=10&sortBy=newest`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch candidates');

    const candidates = await response.json();

    if (candidates.length === 0) {
      previewList.innerHTML = '<p class="breadcrumbs">No candidates uploaded yet. Upload resumes to see them here.</p>';
      return;
    }

    // Display recent candidates
    previewList.innerHTML = candidates.map(candidate => {
      const skillsHtml = candidate.skills && candidate.skills.length > 0
        ? `<div class="chip-group" style="margin-top: 8px;">
            ${candidate.skills.slice(0, 5).map(skill => `<span class="tag">${skill}</span>`).join('')}
            ${candidate.skills.length > 5 ? `<span class="tag">+${candidate.skills.length - 5} more</span>` : ''}
          </div>`
        : '';

      return `
        <div class="card" style="padding: 1rem; margin-bottom: 1rem;">
          <h4>${candidate.name || 'Unknown'}</h4>
          <p class="text-success"><i class="fas fa-check-circle"></i> Previously Uploaded</p>
          <div style="margin-top: 12px;">
            <p style="margin: 4px 0;"><strong>Email:</strong> ${candidate.email || 'N/A'}</p>
            ${candidate.phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${candidate.phone}</p>` : ''}
            ${candidate.experience_years ? `<p style="margin: 4px 0;"><strong>Experience:</strong> ${candidate.experience_years} years</p>` : ''}
            ${candidate.role ? `<p style="margin: 4px 0;"><strong>Role:</strong> ${candidate.role}</p>` : ''}
            ${candidate.department ? `<p style="margin: 4px 0;"><strong>Department:</strong> ${candidate.department}</p>` : ''}
            ${skillsHtml}
            ${candidate.summary ? `<p style="margin-top: 8px; font-size: 0.9em; color: #666;">${candidate.summary.substring(0, 150)}${candidate.summary.length > 150 ? '...' : ''}</p>` : ''}
          </div>
          <a href="candidate.html?id=${candidate.id}" class="btn btn-outline" style="margin-top: 12px;">View Full Profile →</a>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent candidates:', error);
    previewList.innerHTML = '<p class="breadcrumbs">Failed to load recent candidates.</p>';
  }
}

function setupParsingLogs() {
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const exportLogsBtn = document.getElementById('exportLogsBtn');
  const logBody = document.querySelector("#parsingLogBody");

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all logs?')) {
        if (logBody) {
          logBody.innerHTML = '<tr class="empty-log-row"><td colspan="4">No resume parsing activity has been logged in this session yet.</td></tr>';
          updateLogCount();
        }
      }
    });
  }

  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', () => {
      if (!logBody) return;
      const rows = logBody.querySelectorAll('tr:not(.empty-log-row)');
      if (rows.length === 0) {
        alert('No logs to export.');
        return;
      }
      let csv = 'Timestamp,File Name,Status,Details\n';
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}"\n`;
        }
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parsing-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("upload-page")) return;
  setupResumeUpload();
  initializeTabButtons();
  setupParsingLogs();
  updateLogCount();
  loadRecentCandidates(); // Load recent candidates on page load
});
