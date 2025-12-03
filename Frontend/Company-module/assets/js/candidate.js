function renderCandidateDetail() {
  const detailContainer = document.querySelector("#candidateDetail");
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  const candidateId = params.get("id");
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const candidate = candidates.find((c) => c.id === candidateId) || candidates[0];

  if (!candidate) {
    detailContainer.innerHTML = `<div class="empty-state"><strong>No candidate selected.</strong> Use the shortlist page to pick a profile.</div>`;
    return;
  }

  // Get matched JD for additional context
  const jds = getStoredData(STORAGE_KEYS.jds) || [];
  const matchedJD = jds.find(jd => jd.id === candidate.matches?.jdId);

  // Analyze skills match
  const matchedSkills = candidate.matches?.matchedSkills || [];
  const unmatchedSkills = candidate.skills.filter(skill => !matchedSkills.includes(skill));
  const highlightReason = matchedSkills.length
    ? matchedSkills.slice(0, 2).join(" + ")
    : "detected skill set";

  // Generate insights
  const insights = [];
  if (candidate.matches?.finalScore >= 85) {
    insights.push("Strong overall match for the role");
  }
  if (candidate.matches?.skillMatch >= 80) {
    insights.push(`High skill alignment with ${matchedJD?.title || 'requirements'}`);
  }
  if (candidate.experience >= 5) {
    insights.push("Senior level experience");
  }
  if (matchedSkills.length >= 4) {
    insights.push("Diverse relevant skill set");
  }

  // Calculate experience timeline
  const experienceDate = new Date();
  experienceDate.setFullYear(experienceDate.getFullYear() - candidate.experience);
  const timeline = [];
  for (let i = 0; i <= candidate.experience; i++) {
    const year = experienceDate.getFullYear() + i;
    timeline.push(year);
  }

  detailContainer.innerHTML = `
    <section class="detail-grid">
      <div class="detail-section">
        <header class="candidate-header">
          <div>
            <h2>${candidate.name}</h2>
            <p class="role">${candidate.primaryRole}</p>
          </div>
          <div class="score-badge ${candidate.matches?.finalScore >= 85 ? 'high' : ''}">
            ${candidate.matches?.finalScore || 0}%
            <span>Match</span>
          </div>
        </header>

        <div class="summary-card">
          <h4>Professional Summary</h4>
          <p>${candidate.summary}</p>
        </div>

        <div class="experience-section">
          <h4>Experience Timeline</h4>
          <div class="timeline">
            ${timeline.map(year => `
              <div class="timeline-point">
                <span class="year">${year}</span>
                ${year === timeline[timeline.length - 1] ? '<span class="label">Present</span>' : ''}
              </div>
            `).join('')}
          </div>
          <p class="experience-summary">${candidate.experience} years total experience</p>
        </div>

        <div class="education-section">
          <h4>Education</h4>
          <div class="education-card">
            ${candidate.education}
          </div>
        </div>

        <div class="projects-section">
          <h4>Key Projects</h4>
          <div class="project-cards">
            ${candidate.projects.map(project => `
              <div class="project-card">
                <p>${project}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="match-insights-card">
          <h3>Match Analysis</h3>
          
          <div class="score-breakdown">
            <div class="score-item">
              <label>Overall Match</label>
              <div class="score-bar">
                <div class="score-fill" style="width: ${candidate.matches?.finalScore || 0}%">
                  ${candidate.matches?.finalScore || 0}%
                </div>
              </div>
            </div>
            <div class="score-item">
              <label>Skill Match</label>
              <div class="score-bar">
                <div class="score-fill" style="width: ${candidate.matches?.skillMatch || 0}%">
                  ${candidate.matches?.skillMatch || 0}%
                </div>
              </div>
            </div>
            <div class="score-item">
              <label>SBERT Score</label>
              <div class="score-bar">
                <div class="score-fill" style="width: ${candidate.matches?.sbertScore || 0}%">
                  ${candidate.matches?.sbertScore || 0}%
                </div>
              </div>
            </div>
          </div>

          <div class="skills-analysis">
            <h4>Skills Breakdown</h4>
            <div class="skills-grid">
              <div>
                <label>Matched Skills</label>
                <div class="chip-group">
                  ${matchedSkills.map(skill => `
                    <span class="tag matched">${skill}</span>
                  `).join('')}
                </div>
              </div>
              <div>
                <label>Additional Skills</label>
                <div class="chip-group">
                  ${unmatchedSkills.map(skill => `
                    <span class="tag unmatched">${skill}</span>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="ai-insights">
            <h4>AI Insights</h4>
            <ul class="insights-list">
              ${insights.map(insight => `
                <li class="insight-item">${insight}</li>
              `).join('')}
            </ul>
          </div>

          <div class="action-buttons">
            <button class="btn btn-primary" id="scheduleBtn">Schedule Interview</button>
            <button class="btn btn-outline" id="downloadResumeBtn">Download Resume</button>
          </div>
        </div>
      </div>
    </section>
  `;

  const downloadBtn = document.querySelector("#downloadResumeBtn");
  downloadBtn?.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = `resumes/${candidate.resumeFile}`;
    link.download = candidate.resumeFile;
    link.click();
  });

  document.querySelectorAll("[data-action='schedule-interview']").forEach((button) => {
    button.addEventListener("click", () => alert(`Interview slot request sent for ${candidate.name}`));
  });

  document.querySelectorAll("[data-action='request-update']").forEach((button) => {
    button.addEventListener("click", () => alert(`Requested updated resume from ${candidate.name}`));
  });

  document.querySelectorAll("[data-action='add-talent-pool']").forEach((button) => {
    button.addEventListener("click", () => alert(`${candidate.name} added to talent pool.`));
  });
}

// Schedule Interview Modal
function openScheduleModal(candidate) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <header class="page-header">
        <h3>Schedule Interview</h3>
        <button class="btn-close">×</button>
      </header>

      <form id="scheduleForm" class="form-grid">
        <div>
          <label>Interview Type</label>
          <select required>
            <option value="technical">Technical Round</option>
            <option value="hr">HR Round</option>
            <option value="cultural">Cultural Fit</option>
          </select>
        </div>

        <div>
          <label>Date</label>
          <input type="date" required min="${new Date().toISOString().split('T')[0]}">
        </div>

        <div>
          <label>Time</label>
          <input type="time" required>
        </div>

        <div>
          <label>Duration</label>
          <select required>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
          </select>
        </div>

        <div>
          <label>Interviewers</label>
          <input type="text" placeholder="Enter email addresses">
        </div>

        <div>
          <label>Notes</label>
          <textarea placeholder="Any special instructions or focus areas"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Schedule & Send Invites</button>
          <button type="button" class="btn btn-outline" data-action="cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.btn-close').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('#scheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: Integrate with calendar API
    alert('Interview scheduled successfully! Calendar invites will be sent shortly.');
    modal.remove();
  });

  setTimeout(() => modal.classList.add('active'), 10);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("candidate-page")) return;
  renderCandidateDetail();

  // Add event listeners after content is rendered
  const detailContainer = document.querySelector("#candidateDetail");
  if (!detailContainer) return;

  // Schedule Interview button
  detailContainer.querySelector("#scheduleBtn")?.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get("id");
    const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate) {
      openScheduleModal(candidate);
    }
  });

  // Download Resume button
  detailContainer.querySelector("#downloadResumeBtn")?.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get("id");
    const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate?.resumeFile) {
      // TODO: Integrate with file storage API
      alert(`Downloading resume: ${candidate.resumeFile}`);
    }
  });
});

