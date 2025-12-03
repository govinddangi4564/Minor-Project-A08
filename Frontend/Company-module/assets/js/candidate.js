import { getStoredData, STORAGE_KEYS } from './data.js';
import API from '../../../config/api-endpoint.js';
import { logout } from '../../../src/utils/router.js';

async function renderCandidateDetail() {
  const detailContainer = document.querySelector("#candidateDetail");
  if (!detailContainer) return;

  const params = new URLSearchParams(window.location.search);
  let candidateId = params.get("id");

  const getToken = () => sessionStorage.getItem('companyAuthToken');
  const token = getToken();

  if (!token) {
    logout();
    return;
  }

  // If no candidate ID provided, try to load last viewed or first candidate
  if (!candidateId) {
    // Try to get last viewed candidate
    const lastViewedId = sessionStorage.getItem('lastViewedCandidateId');

    if (lastViewedId) {
      candidateId = lastViewedId;
      // Update URL without reload
      window.history.replaceState({}, '', `?id=${candidateId}`);
    } else {
      // Fetch first candidate from API
      try {
        const response = await fetch(`${API.company.candidates.getAll}?limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const candidates = await response.json();
          if (candidates.length > 0) {
            candidateId = candidates[0].id;
            // Update URL without reload
            window.history.replaceState({}, '', `?id=${candidateId}`);
          }
        }
      } catch (error) {
        console.error('Error fetching first candidate:', error);
      }
    }

    // If still no candidate, show empty state
    if (!candidateId) {
      detailContainer.innerHTML = `<div class="empty-state"><strong>No candidates found.</strong> Upload resumes to get started.</div>`;
      return;
    }
  }

  // Remember this candidate as last viewed
  sessionStorage.setItem('lastViewedCandidateId', candidateId);

  // Show loading state
  detailContainer.innerHTML = `<div class="card" style="padding: 2rem; text-align: center;"><p>Loading candidate details...</p></div>`;

  try {
    // Fetch candidate data from API
    const response = await fetch(API.company.candidates.get(candidateId), {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      if (response.status === 404) {
        // Candidate not found - clear last viewed and show empty state
        sessionStorage.removeItem('lastViewedCandidateId');
        detailContainer.innerHTML = `<div class="empty-state"><strong>Candidate not found.</strong> The candidate may have been deleted. <a href="shortlist.html">Go to shortlist</a> to view available candidates.</div>`;
        return;
      }
      throw new Error('Failed to fetch candidate');
    }

    const candidate = await response.json();

    if (!candidate) {
      sessionStorage.removeItem('lastViewedCandidateId');
      detailContainer.innerHTML = `<div class="empty-state"><strong>Candidate not found.</strong> <a href="shortlist.html">Go to shortlist</a> to view available candidates.</div>`;
      return;
    }

    // Get specific match if jd_id is provided, otherwise get best match
    const targetJdId = params.get("jd_id");
    let selectedMatch = null;

    if (candidate.matches && candidate.matches.length > 0) {
      if (targetJdId) {
        selectedMatch = candidate.matches.find(m => m.jd_id === targetJdId);
      }
      // Fallback to best match (first in array) if no specific JD requested or not found
      if (!selectedMatch) {
        selectedMatch = candidate.matches[0];
      }
    }

    const bestMatch = selectedMatch; // Keep variable name for compatibility with rest of function

    // Get matched JD for additional context (if available)
    const jds = getStoredData(STORAGE_KEYS.jds) || [];
    const matchedJD = jds.find(jd => jd.id === bestMatch?.jd_id || jd.id === bestMatch?.jdId);

    // Analyze skills match
    const matchedSkills = bestMatch?.matched_skills || bestMatch?.matchedSkills || [];
    const allSkills = candidate.skills || [];
    const unmatchedSkills = allSkills.filter(skill => !matchedSkills.includes(skill));
    const highlightReason = matchedSkills.length
      ? matchedSkills.slice(0, 2).join(" + ")
      : "detected skill set";

    // Generate insights
    const insights = [];
    const finalScore = bestMatch?.final_score || bestMatch?.finalScore || 0;
    const skillMatch = bestMatch?.skill_match || bestMatch?.skillMatch || 0;
    const experienceYears = candidate.experience_years || candidate.experience || 0;

    if (finalScore >= 85) {
      insights.push("Strong overall match for the role");
    }
    if (skillMatch >= 80) {
      insights.push(`High skill alignment with ${matchedJD?.title || 'requirements'}`);
    }
    if (experienceYears >= 5) {
      insights.push("Senior level experience");
    }
    if (matchedSkills.length >= 4) {
      insights.push("Diverse relevant skill set");
    }

    // Calculate experience timeline
    const experienceDate = new Date();
    experienceDate.setFullYear(experienceDate.getFullYear() - experienceYears);
    const timeline = [];
    for (let i = 0; i <= experienceYears; i++) {
      const year = experienceDate.getFullYear() + i;
      timeline.push(year);
    }

    // Handle projects (could be array or string)
    const projects = Array.isArray(candidate.projects)
      ? candidate.projects
      : (candidate.projects ? [candidate.projects] : []);

    // Handle education (could be array or string)
    let educationHtml = 'Not specified';
    if (Array.isArray(candidate.education)) {
      const filteredEdu = candidate.education
        .filter(e => e && e.trim().length > 0 && !e.trim().match(/^[\s\u200B-\u200D\uFEFF•·-]+$/));

      if (filteredEdu.length > 0) {
        educationHtml = `
          <ul class="education-list">
            ${filteredEdu.map(e => `<li>${e.trim().replace(/^[•·-]\s*/, '')}</li>`).join('')}
          </ul>
        `;
      }
    } else if (candidate.education) {
      educationHtml = candidate.education;
    }

    const sbertScore = bestMatch?.sbert_score || bestMatch?.sbertScore || 0;

    detailContainer.innerHTML = `
    <section class="detail-grid">
      <div class="detail-section">
        <header class="candidate-header">
          <div>
            <h2>${candidate.name}</h2>
            <p class="role">${candidate.role || candidate.primary_role || candidate.primaryRole || 'Not specified'}</p>
          </div>
          <div class="score-badge ${finalScore >= 85 ? 'high' : ''}">
            ${finalScore}%
            <span>Match</span>
          </div>
        </header>

        <div class="summary-section">
          <h4>Professional Summary</h4>
          <div class="summary-card">
            <p>${candidate.summary || 'No summary available'}</p>
          </div>
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
          ${experienceYears > 0 ? `<p class="experience-summary">${experienceYears} years total experience</p>` : ''}

          <div class="experience-list-container" style="margin-top: 1.5rem;">
            <h5>Experience Details</h5>
            ${candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0
            ? `<ul class="experience-list" style="list-style-type: disc; padding-left: 1.5rem; color: var(--text-secondary);">
                  ${candidate.experience
              .filter(e => e && e.trim().length > 0)
              .map(e => `<li style="margin-bottom: 0.5rem;">${e.trim()}</li>`)
              .join('')}
                 </ul>`
            : '<p style="color: var(--text-muted); font-style: italic;">No detailed experience listed.</p>'
          }
          </div>
        </div>

        <div class="education-section">
          <h4>Education</h4>
          <div class="education-card">
            ${educationHtml}
          </div>
        </div>

        ${projects.length > 0 ? `
        <div class="projects-section">
          <h4>Key Projects</h4>
          <div class="project-list-container">
            <ul class="project-list">
              ${projects
          .filter(p => p && p.trim().length > 0 && !p.trim().match(/^[\s\u200B-\u200D\uFEFF•·-]+$/))
          .map(project => `
                  <li>${project.trim().replace(/^[•·-]\s*/, '')}</li>
                `).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="match-insights-card">
          <h3>Match Analysis</h3>
          
          <div class="score-breakdown">
            <div class="score-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0;">Overall Match</label>
                <strong style="font-size: 18px; color: var(--primary);">${finalScore}%</strong>
              </div>
              <div class="score-bar">
                <div class="score-fill" style="width: ${finalScore}%"></div>
              </div>
            </div>
            <div class="score-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0;">Skill Match</label>
                <strong style="font-size: 18px; color: var(--primary);">${skillMatch}%</strong>
              </div>
              <div class="score-bar">
                <div class="score-fill" style="width: ${skillMatch}%"></div>
              </div>
            </div>
            <div class="score-item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin: 0;">SBERT Score</label>
                <strong style="font-size: 18px; color: var(--primary);">${sbertScore}</strong>
              </div>
              <div class="score-bar">
                <div class="score-fill" style="width: ${sbertScore}%"></div>
              </div>
            </div>
          </div>

          <div class="skills-analysis">
            <h4>Skills Breakdown</h4>
            <div class="skills-grid">
              ${matchedSkills.length > 0 ? `
              <div>
                <label>Matched Skills</label>
                <div class="chip-group">
                  ${matchedSkills.map(skill => `
                    <span class="tag matched">${skill}</span>
                  `).join('')}
                </div>
              </div>
              ` : ''}
              ${unmatchedSkills.length > 0 ? `
              <div>
                <label>Additional Skills</label>
                <div class="chip-group">
                  ${unmatchedSkills.map(skill => `
                    <span class="tag unmatched">${skill}</span>
                  `).join('')}
                </div>
              </div>
              ` : ''}
              ${matchedSkills.length === 0 && unmatchedSkills.length === 0 && allSkills.length > 0 ? `
              <div>
                <label>Skills</label>
                <div class="chip-group">
                  ${allSkills.map(skill => `
                    <span class="tag">${skill}</span>
                  `).join('')}
                </div>
              </div>
              ` : ''}
            </div>
          </div>

          ${insights.length > 0 ? `
          <div class="ai-insights">
            <h4>AI Insights</h4>
            <ul class="insights-list">
              ${insights.map(insight => `
                <li class="insight-item">${insight}</li>
              `).join('')}
            </ul>
          </div>
          ` : ''}

          <div class="action-buttons">
            <button class="btn btn-primary" id="scheduleBtn">Schedule Interview</button>
            <button class="btn btn-outline" id="downloadResumeBtn">Download Resume</button>
          </div>
        </div>
      </div>
    </section>
  `;

    const downloadBtn = document.querySelector("#downloadResumeBtn");
    downloadBtn?.addEventListener("click", async () => {
      try {
        const resumeResponse = await fetch(API.company.resumes.download(candidate.resume_id), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resumeResponse.ok) throw new Error('Failed to download resume');

        const blob = await resumeResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${candidate.name}_resume.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading resume:', error);
        alert('Failed to download resume');
      }
    });

    document.querySelectorAll("[data-action='schedule-interview']").forEach((button) => {
      button.addEventListener("click", () => openScheduleModal(candidate));
    });

    document.querySelectorAll("[data-action='request-update']").forEach((button) => {
      button.addEventListener("click", () => alert(`Requested updated resume from ${candidate.name}`));
    });

    document.querySelectorAll("[data-action='add-talent-pool']").forEach((button) => {
      button.addEventListener("click", () => alert(`${candidate.name} added to talent pool.`));
    });

  } catch (error) {
    console.error('Error loading candidate:', error);
    sessionStorage.removeItem('lastViewedCandidateId');
    detailContainer.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load candidate details.</strong> 
        <p>This may happen if there are no candidates in the system yet.</p>
        <p><a href="upload.html">Upload resumes</a> to get started, or <a href="shortlist.html">view the shortlist</a>.</p>
      </div>
    `;
  }
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

  modal.querySelector('#scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    // Get form values
    const interviewType = form.querySelector('select').value;
    const date = form.querySelectorAll('input')[0].value;  // date input
    const time = form.querySelectorAll('input')[1].value;  // time input
    const duration = form.querySelectorAll('select')[1].value;
    const interviewers = form.querySelector('input[placeholder*="email"]').value;
    const notes = form.querySelector('textarea').value;
    
    // Parse interviewers (comma-separated emails)
    const interviewersList = interviewers ? interviewers.split(',').map(e => e.trim()).filter(e => e) : [];
    
    try {
      const token = sessionStorage.getItem('companyAuthToken');
      const response = await fetch(API.company.interviews || 'http://localhost:8000/api/company/interviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: candidate.id,
          interview_type: interviewType,
          scheduled_date: date,
          scheduled_time: time,
          duration_minutes: parseInt(duration),
          interviewers: interviewersList,
          notes: notes || null
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to schedule interview');
      }
      
      const result = await response.json();
      alert(`✅ Interview scheduled successfully!\n\n📅 Date: ${date}\n⏰ Time: ${time}\n⏱️ Duration: ${duration} minutes\n\n${interviewersList.length > 0 ? '📧 Email invitations will be sent to:\n' + interviewersList.join(', ') : ''}`);
      modal.remove();
      
      // Optionally refresh the candidate detail to show the scheduled interview
      await renderCandidateDetail();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert(`❌ Failed to schedule interview: ${error.message}`);
    }
  });

  setTimeout(() => modal.classList.add('active'), 10);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.body.classList.contains("candidate-page")) return;
  await renderCandidateDetail();

  // Add event listeners after content is rendered
  const detailContainer = document.querySelector("#candidateDetail");
  if (!detailContainer) return;

  // Schedule Interview button
  detailContainer.querySelector("#scheduleBtn")?.addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get("id");

    if (!candidateId) return;

    const getToken = () => sessionStorage.getItem('companyAuthToken');
    const token = getToken();

    try {
      const response = await fetch(API.company.candidates.get(candidateId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch candidate');

      const candidate = await response.json();
      if (candidate) {
        openScheduleModal(candidate);
      }
    } catch (error) {
      console.error('Error fetching candidate for schedule:', error);
    }
  });
});

