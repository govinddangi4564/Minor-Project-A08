/**
 * ============================================================================
 * UPLOAD PAGE - Resume Parsing & Candidate Creation
 * ============================================================================
 * BACKEND INTEGRATION:
 * This file should be updated to communicate with a backend API for resume
 * parsing and candidate storage.
 *
 * 1. API Endpoint for Parsing: POST /api/resumes/parse
 *    - Headers: { 'Authorization': 'Bearer <token>' }
 *    - Body: FormData containing the resume file (`multipart/form-data`).
 *    - Success Response (200 OK): Parsed candidate JSON object.
 *    - Example:
 *      const formData = new FormData();
 *      formData.append('resume', file);
 *      const response = await fetch('/api/resumes/parse', { method: 'POST', body: formData, headers });
 *
 * 2. API Endpoint for Saving Candidate: POST /api/candidates
 *    - Headers: { 'Authorization': 'Bearer <token>', 'Content-Type': 'application/json' }
 *    - Body: The JSON object of the parsed candidate.
 *    - Success Response (201 Created): The saved candidate object with a database ID.
 *
 * DATABASE SCHEMA (Example - PostgreSQL):
 *
 * CREATE TABLE candidates (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   company_id UUID REFERENCES companies(id),
 *   name VARCHAR(255) NOT NULL,
 *   email VARCHAR(255) UNIQUE,
 *   resume_text TEXT,
 *   skills JSONB,
 *   experience_years INT,
 *   uploaded_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ============================================================================
 */

/* --------------------------- Helpers (simulation for demo) --------------------------- */

function simulateSkillExtraction(skillCategories, role) {
  const skills = [];
  const addSkills = (category, count, proficiencyRange) => {
    const pool = skillCategories[category] || [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    selected.forEach((name) => {
      const [min, max] = proficiencyRange;
      const base = Math.floor(Math.random() * (max - min + 1)) + min;
      const contextBonus = Math.random() > 0.72 ? 8 : 0;
      skills.push({ name, score: Math.min(100, base + contextBonus), category, confidence: Math.round(Math.random() * 15 + 80) });
    });
  };

  if (role && role.includes("Full Stack")) {
    addSkills("languages", 3, [70, 90]);
    addSkills("frontend", 2, [75, 95]);
    addSkills("backend", 2, [75, 95]);
    addSkills("databases", 1, [70, 85]);
  } else if (role && (role.includes("Data") || role.includes("ML"))) {
    addSkills("languages", 2, [80, 95]);
    addSkills("ai_ml", 3, [85, 98]);
    addSkills("databases", 1, [75, 90]);
  } else if (role && role.includes("DevOps")) {
    addSkills("cloud", 4, [85, 98]);
    addSkills("languages", 1, [70, 85]);
  } else {
    addSkills("languages", 2, [65, 85]);
    addSkills("backend", 1, [65, 85]);
  }

  return skills;
}

function groupSkillsByCategory(extractedSkills) {
  return extractedSkills.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push({ name: s.name, score: s.score, confidence: s.confidence });
    return acc;
  }, {});
}

function generateProjects(extractedSkills, exp) {
  const projects = [];
  const domains = ["e-commerce", "fintech", "healthcare", "social media", "enterprise"];
  const actions = ["Architected", "Developed", "Implemented", "Optimized", "Led"];

  const skillsByCat = extractedSkills.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s.name);
    return acc;
  }, {});

  for (let i = 0; i < Math.min(exp, 3); i++) {
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const projectSkills = [];
    if (skillsByCat.languages) projectSkills.push(skillsByCat.languages[0]);
    if (i === 0 && skillsByCat.frontend) projectSkills.push(skillsByCat.frontend[0]);
    if (i === 1 && skillsByCat.backend) projectSkills.push(skillsByCat.backend[0]);
    if (i === 2 && skillsByCat.cloud) projectSkills.push(skillsByCat.cloud[0]);

    const impactOptions = [
      `${Math.floor(Math.random() * 40 + 60)}% performance improvement`,
      `${Math.floor(Math.random() * 500 + 500)}k daily active users`,
      `${Math.floor(Math.random() * 90 + 10)}% test coverage`
    ];

    projects.push({
      description: `${action} scalable ${domain} platform using ${projectSkills.filter(Boolean).join(' and ')}`,
      impact: impactOptions[i % impactOptions.length],
      duration: `${Math.floor(Math.random() * 12 + 3)} months`,
      complexity: Math.floor(Math.random() * 30 + 70)
    });
  }

  return projects;
}

/**
 * Simulates a backend resume parsing service.
 * TODO: Replace this with a real API call.
 *
 * Example API Call:
 * async function parseResumeAPI(file) {
 *   const formData = new FormData();
 *   formData.append('resume', file);
 *   const response = await fetch('/api/resumes/parse', {
 *     method: 'POST',
 *     body: formData,
 *     headers: { 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` }
 *   });
 *   if (!response.ok) throw new Error('Parsing failed');
 *   return await response.json();
 * }
 * @param {File} file The resume file to be "parsed".
 */
function simulateResumeParsing(file) {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const roles = ["Full Stack Developer", "Data Scientist", "DevOps Engineer", "ML Engineer"];
  const primaryRole = roles[Math.floor(Math.random() * roles.length)];

  const skillCategories = {
    languages: ["Python", "JavaScript", "Java", "C++", "TypeScript", "Go", "Rust"],
    frontend: ["React", "Vue.js", "Angular", "Next.js", "Webpack", "Tailwind"],
    backend: ["Node.js", "Django", "Spring", "FastAPI", "GraphQL"],
    cloud: ["AWS", "Azure", "GCP", "Kubernetes", "Docker", "Terraform"],
    ai_ml: ["TensorFlow", "PyTorch", "Scikit-learn", "BERT", "OpenAI", "Transformers"],
    databases: ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra"]
  };

  const experience = Math.floor(Math.random() * 9) + 1; // 1-9 years
  const extractedSkills = simulateSkillExtraction(skillCategories, primaryRole);
  const skillsByCategory = groupSkillsByCategory(extractedSkills);
  const projects = generateProjects(extractedSkills, experience);

  const skillProficiencies = extractedSkills.reduce((acc, s) => { acc[s.name] = s.score; return acc; }, {});

  const topSkills = extractedSkills.slice().sort((a, b) => b.score - a.score).slice(0, 6).map(s => s.name);

  const technicalAnalysis = (() => {
    const avgSkill = Math.round(extractedSkills.reduce((a, b) => a + b.score, 0) / Math.max(1, extractedSkills.length));
    const projScore = Math.round(projects.reduce((a, b) => a + b.complexity, 0) / Math.max(1, projects.length));
    const expScore = Math.min(95, 65 + experience * 4);
    return {
      skillProficiency: avgSkill,
      projectComplexity: projScore,
      experienceDepth: expScore,
      overallTechnicalScore: Math.round(avgSkill * 0.45 + projScore * 0.35 + expScore * 0.2)
    };
  })();

  return {
    id: `cand-${(typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().slice(0, 6) : Math.floor(Math.random() * 100000)}`,
    name: baseName.replace(/[_-]/g, ' '),
    email: `${baseName.toLowerCase().replace(/\s+/g, '')}@example.com`,
    experience,
    primaryRole,
    resumeFile: file.name,
    skills: topSkills,
    skillsByCategory,
    skillProficiencies,
    summary: `${experience}+ years experienced ${primaryRole} specializing in ${topSkills.slice(0, 3).join(', ')}.`,
    education: "Master's in Computer Science",
    projects,
    uploadedAt: new Date().toISOString(),
    technicalAnalysis,
    semanticMatch: {
      skillRelevance: Math.round(Math.random() * 15 + 80),
      projectAlignment: Math.round(Math.random() * 20 + 75),
      overallSimilarity: Math.round(Math.random() * 15 + 82)
    }
  };
}

/**
 * Simulates saving a new candidate to the database.
 * TODO: Replace this with a real API call to POST /api/candidates.
 *
 * Example API Call:
 * async function createCandidateAPI(candidateData) {
 *   const response = await fetch('/api/candidates', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}` },
 *     body: JSON.stringify(candidateData)
 *   });
 *   return await response.json();
 * }
 * @param {object} candidate The parsed candidate data.
 */
function persistCandidate(candidate, jd) {
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const enriched = {
    ...candidate,
    matches: jd ? calculateMatch(candidate, jd) : null,
  };
  candidates.push(enriched);
  setStoredData(STORAGE_KEYS.candidates, candidates);
  // Event is automatically dispatched by setStoredData
}

function appendCandidatePreview(container, candidate) {
  const getMatchStatus = (score) => {
    if (score >= 85) return { class: 'high', text: 'Strong Match' };
    if (score >= 70) return { class: 'medium', text: 'Good Match' };
    return { class: 'low', text: 'Potential Match' };
  };

  const matchStatus = getMatchStatus(candidate.technicalAnalysis && candidate.technicalAnalysis.overallTechnicalScore ? candidate.technicalAnalysis.overallTechnicalScore : (candidate.analysis && candidate.analysis.overallFit) || 0);

  const topSkills = Object.entries(candidate.skillProficiencies || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const generateInsights = (candidate) => {
    const insights = [];
    if (candidate.experience >= 5) insights.push("Senior-level experience in the field");
    if (candidate.technicalAnalysis && candidate.technicalAnalysis.skillProficiency >= 85) insights.push("Strong technical capabilities");
    if (candidate.analysis && candidate.analysis.communicationScore >= 85) insights.push("Excellent communication skills");
    if ((candidate.skills || []).length >= 6) insights.push("Diverse skill set");
    return insights;
  };

  const card = document.createElement("article");
  card.className = "candidate-card";
  card.innerHTML = `
    <div class="candidate-header">
      <div>
        <h3>${candidate.name}</h3>
        <div style="margin-top: 4px;">
          <span class="badge ${matchStatus.class}">${matchStatus.text}</span>
          <span style="margin-left: 8px; color: var(--text-muted);">${candidate.experience} years</span>
        </div>
      </div>
      <div class="match-score">
        ${(candidate.technicalAnalysis && candidate.technicalAnalysis.overallTechnicalScore) || (candidate.analysis && candidate.analysis.overallFit) || 0}<span>%</span>
      </div>
    </div>

    <p>${candidate.summary}</p>

    <div class="skill-analysis">
      <h4>Key Skills & Proficiency</h4>
      ${topSkills.map(([skill, score]) => `
        <div class="skill-score">
          <label>${skill}</label>
          <div class="score-bar">
            <div class="fill" style="width: ${score}%"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="ai-insights">
      <h4>AI Analysis</h4>
      <div style="margin-bottom: 12px;">
        <div class="skill-score">
          <label>Technical Fit</label>
          <div class="score-bar">
            <div class="fill" style="width: ${(candidate.technicalAnalysis && candidate.technicalAnalysis.skillProficiency) || (candidate.analysis && candidate.analysis.technicalScore) || 0}%"></div>
          </div>
        </div>
        <div class="skill-score">
          <label>Communication</label>
          <div class="score-bar">
            <div class="fill" style="width: ${(candidate.analysis && candidate.analysis.communicationScore) || 0}%"></div>
          </div>
        </div>
        <div class="skill-score">
          <label>Leadership</label>
          <div class="score-bar">
            <div class="fill" style="width: ${(candidate.analysis && candidate.analysis.leadershipScore) || 0}%"></div>
          </div>
        </div>
      </div>
      <ul class="insights-list">
        ${generateInsights(candidate).map(insight => `<li>• ${insight}</li>`).join('')}
      </ul>
    </div>

    <div class="candidate-footer">
      <div class="chip-group">
        ${((candidate.skills || []).slice(3) || []).map(skill => `<span class="tag">${skill}</span>`).join('')}
      </div>
      <div class="quick-actions">
        <button class="action-btn" onclick="window.location.href='candidate.html?id=${candidate.id}'">
          View Profile
        </button>
        <button class="action-btn">
          Shortlist
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);
}

/**
 * Appends a new row to the parsing log table.
 * @param {string} fileName The name of the processed file.
 * @param {string} status 'Success' or 'Error'.
 * @param {string} details Additional information about the operation.
 */
function appendToLog(fileName, status, details) {
  const logBody = document.querySelector("#parsingLogBody");
  if (!logBody) return;

  // Remove empty state if it exists
  const emptyRow = logBody.querySelector(".empty-log-row");
  if (emptyRow) emptyRow.remove();

  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td>${new Date().toLocaleTimeString()}</td>
    <td>${fileName}</td>
    <td><span class="status-${status.toLowerCase()}">${status}</span></td>
    <td>${details}</td>
  `;
  logBody.prepend(newRow); // Add new logs to the top

  // Update log count if the function exists
  if (typeof updateLogCount === 'function') {
    updateLogCount();
  }
}
/* --------------------------- Main Setup Function --------------------------- */

function setupResumeUpload() {
  /**
   * ============================================================================
   * AUTHENTICATION CHECK
   * ============================================================================
   */
  if (sessionStorage.getItem('isCompanyLoggedIn') !== 'true') {
    window.location.href = 'company-login.html';
    return;
  }

  const dropZone = document.querySelector("#resumeDropZone");
  const fileInput = document.querySelector("#resumeInput");
  const progressBar = document.querySelector("#uploadProgressBar");
  const previewList = document.querySelector("#resumePreviewList");
  const runMatchingBtn = document.querySelector("#runMatchingBtn");

  if (!dropZone || !fileInput || !progressBar || !previewList) return;

  // Initialize log with empty state
  const logBody = document.querySelector("#parsingLogBody");
  if (logBody && logBody.children.length === 0) {
    logBody.innerHTML = `<tr class="empty-log-row"><td colspan="4">No resume parsing activity has been logged in this session yet.</td></tr>`;
  }


  const handleFiles = (files) => {
    const jds = getStoredData(STORAGE_KEYS.jds) || [];
    if (!jds.length) {
      alert("Please create at least one Job Description before uploading resumes.");
      return;
    }

    const fileArray = [...files];
    if (!fileArray.length) return;

    previewList.innerHTML = "";
    progressBar.style.width = "0%";
    let processed = 0;

    const processNext = () => {
      if (processed >= fileArray.length) {
        progressBar.style.width = "100%";
        runMatchingBtn.style.display = "inline-block"; // Show button after processing
        return;
      }
      const file = fileArray[processed];
      // In a real app, you'd call your parsing API here.
      const fakeParseDelay = 300 + Math.random() * 500;
      progressBar.style.width = `${Math.round(((processed + 1) / fileArray.length) * 100)}%`;

      setTimeout(() => {
        const candidate = simulateResumeParsing(file);
        appendCandidatePreview(previewList, candidate);
        appendToLog(file.name, 'Success', `Created profile for ${candidate.name}.`);
        persistCandidate(candidate, jds[0]); // Persist with the first available JD for demo
        processed += 1;
        processNext();
      }, fakeParseDelay);
    };

    processNext();
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

  if (runMatchingBtn && !runMatchingBtn.dataset.initialized) {
    runMatchingBtn.dataset.initialized = "true";
    runMatchingBtn.addEventListener("click", () => {
      ensureMatches(); // This function is in data.js
      alert("AI matching complete! Candidate scores have been updated.");
      window.location.href = "shortlist.html"; // Redirect to see results
    });
  }
}

/**
 * ============================================================================
 * TAB BUTTON FUNCTIONALITY - Handle Resumes, Job Descriptions, Parsing Logs tabs
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

      // Load content for specific tabs if needed
      if (tabName === 'job-descriptions') {
        loadRecentJDs();
      } else if (tabName === 'parsing-logs') {
        updateLogCount();
      }
    });
  });
}

/**
 * Load and display recent job descriptions
 */
function loadRecentJDs() {
  const recentJDsContainer = document.getElementById('recentJDs');
  if (!recentJDsContainer) return;

  const jds = getStoredData(STORAGE_KEYS.jds) || [];

  if (jds.length === 0) {
    recentJDsContainer.innerHTML = '<p class="breadcrumbs">No job descriptions found. <a href="jd.html">Create your first JD</a></p>';
    return;
  }

  // Show last 5 JDs
  const recentJDs = jds.slice(-5).reverse();
  recentJDsContainer.innerHTML = recentJDs.map(jd => `
    <div class="card" style="margin-bottom: 12px; padding: 16px;">
      <h4 style="margin: 0 0 8px 0;">${jd.title}</h4>
      <p class="breadcrumbs" style="margin: 0 0 8px 0;">${jd.department} • ${jd.location || 'Not specified'}</p>
      <a href="jd.html?id=${jd.id}" class="btn-link">View Details →</a>
    </div>
  `).join('');
}

/**
 * Update the log count display
 */
function updateLogCount() {
  const logBody = document.querySelector("#parsingLogBody");
  const logCount = document.querySelector("#logCount");

  if (!logBody || !logCount) return;

  const rows = logBody.querySelectorAll('tr:not(.empty-log-row)');
  const count = rows.length;
  logCount.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

/**
 * Setup parsing logs functionality
 */
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

      // Create CSV content
      let csv = 'Timestamp,File Name,Status,Details\n';
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}"\n`;
        }
      });

      // Download CSV
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

/* Wire up on DOM ready for upload page */
document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("upload-page")) return;
  setupResumeUpload();
  initializeTabButtons();
  setupParsingLogs();
  updateLogCount();
});
