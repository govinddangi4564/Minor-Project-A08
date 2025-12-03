/**
 * ============================================================================
 * DATA LAYER - Backend & Database Integration Guide
 * ============================================================================
 * 
 * BACKEND API ENDPOINTS (Replace localStorage with these):
 * 
 * 1. Job Descriptions (JD) API:
 *    - GET    /api/jds              → Fetch all JDs
 *    - GET    /api/jds/:id          → Fetch single JD
 *    - POST   /api/jds              → Create new JD
 *    - PUT    /api/jds/:id          → Update JD
 *    - DELETE /api/jds/:id           → Delete JD
 * 
 * 2. Candidates API:
 *    - GET    /api/candidates       → Fetch all candidates (with pagination)
 *    - GET    /api/candidates/:id   → Fetch single candidate
 *    - POST   /api/candidates       → Upload & parse resume
 *    - PUT    /api/candidates/:id    → Update candidate data
 * 
 * 3. Shortlist API:
 *    - GET    /api/shortlist        → Get shortlisted candidates
 *    - POST   /api/shortlist        → Add to shortlist
 *    - DELETE /api/shortlist/:id     → Remove from shortlist
 * 
 * 4. Matching/AI API:
 *    - POST   /api/matching/run     → Run SBERT matching for all candidates
 *    - POST   /api/matching/candidate/:id → Match single candidate
 * 
 * DATABASE SCHEMA SUGGESTIONS:
 * 
 * Table: job_descriptions
 *   - id (UUID, PK)
 *   - title (VARCHAR)
 *   - department (VARCHAR)
 *   - location (VARCHAR)
 *   - description (TEXT)
 *   - keywords (JSON/ARRAY)
 *   - created_at (TIMESTAMP)
 *   - updated_at (TIMESTAMP)
 *   - created_by (FK → users)
 * 
 * Table: candidates
 *   - id (UUID, PK)
 *   - name (VARCHAR)
 *   - email (VARCHAR, UNIQUE)
 *   - resume_file_path (VARCHAR)
 *   - resume_text (TEXT) - Extracted text from NLP parsing
 *   - skills (JSON/ARRAY)
 *   - experience (INTEGER)
 *   - education (TEXT)
 *   - summary (TEXT)
 *   - projects (JSON/ARRAY)
 *   - uploaded_at (TIMESTAMP)
 *   - parsed_at (TIMESTAMP)
 * 
 * Table: candidate_matches
 *   - id (UUID, PK)
 *   - candidate_id (FK → candidates)
 *   - jd_id (FK → job_descriptions)
 *   - skill_match_percent (INTEGER)
 *   - sbert_score (FLOAT) - Semantic similarity score
 *   - final_score (INTEGER)
 *   - matched_skills (JSON/ARRAY)
 *   - calculated_at (TIMESTAMP)
 * 
 * Table: shortlist
 *   - id (UUID, PK)
 *   - candidate_id (FK → candidates)
 *   - jd_id (FK → job_descriptions)
 *   - shortlisted (BOOLEAN)
 *   - shortlisted_at (TIMESTAMP)
 *   - shortlisted_by (FK → users)
 * 
 * ============================================================================
 */

export const STORAGE_KEYS = {
  jds: "ats_hr_jds",           // TODO: Replace with API call to GET /api/jds
  candidates: "ats_hr_candidates", // TODO: Replace with API call to GET /api/candidates
  shortlist: "ats_hr_shortlist",   // TODO: Replace with API call to GET /api/shortlist
  theme: "ats_hr_theme",           // Keep in localStorage (client preference)
  reports: "ats_hr_reports",       // TODO: Replace with API call to GET /api/reports
};

const defaultJDs = [
  {
    id: "jd-fullstack",
    title: "Full Stack Developer",
    department: "Engineering",
    location: "Remote",
    createdAt: "2025-10-12",
    keywords: ["JavaScript", "React", "Node.js", "REST", "SQL", "AWS"],
    description:
      "We are looking for a full stack developer proficient with modern JavaScript tooling, cloud infrastructure, and CI/CD pipelines.",
  },
  {
    id: "jd-datasci",
    title: "Senior Data Scientist",
    department: "AI Labs",
    location: "Bengaluru",
    createdAt: "2025-09-20",
    keywords: ["Python", "NLP", "SBERT", "TensorFlow", "Transformers", "MLOps"],
    description:
      "Lead NLP initiatives using SBERT and transformer models, own experimentation pipelines, and drive insights for product team.",
  },
  {
    id: "jd-qa",
    title: "QA Automation Engineer",
    department: "Quality",
    location: "Hyderabad",
    createdAt: "2025-08-30",
    keywords: ["Selenium", "Cypress", "Python", "CI/CD", "API Testing"],
    description:
      "Maintain automated test suites across web & API layers, ensure deployment quality, and contribute to QA strategy.",
  },
];

const defaultCandidates = [
  {
    id: "cand-ashwin",
    name: "Ashwin Rao",
    email: "ashwin.rao@example.com",
    experience: 5,
    primaryRole: "Full Stack Developer",
    resumeFile: "Ashwin_Rao_FullStack.pdf",
    skills: ["JavaScript", "React", "Node.js", "GraphQL", "Docker", "AWS"],
    summary:
      "Full stack engineer with 5 years of experience building B2B SaaS products, focused on React, Node.js, and AWS infrastructure.",
    education: "B.Tech Computer Science - IIT Madras",
    projects: [
      "Implemented resume parsing service using NLP for 1M+ candidates",
      "Built internal analytics dashboards with React and D3",
    ],
  },
  {
    id: "cand-nisha",
    name: "Nisha Patel",
    email: "nisha.patel@example.com",
    experience: 7,
    primaryRole: "Senior Data Scientist",
    resumeFile: "Nisha_Patel_DataScience.pdf",
    skills: [
      "Python",
      "NLP",
      "SBERT",
      "Transformers",
      "TensorFlow",
      "Data Visualization",
    ],
    summary:
      "Data scientist specializing in NLP, transformer architectures, and model deployment. Led AI initiatives delivering 20% boost in lead conversion.",
    education: "MS Data Science - Carnegie Mellon University",
    projects: [
      "SBERT-based semantic search for support tickets",
      "Multi-model MLOps platform for continuous training",
    ],
  },
  {
    id: "cand-ikram",
    name: "Ikram Hussain",
    email: "ikram.hussain@example.com",
    experience: 4,
    primaryRole: "QA Automation Engineer",
    resumeFile: "Ikram_Hussain_QA.pdf",
    skills: ["Selenium", "Cypress", "Python", "REST", "CI/CD"],
    summary:
      "Automation engineer focused on building scalable test frameworks using Selenium, Cypress, and Python. Experienced with CI/CD pipelines.",
    education: "B.E. Information Technology - Anna University",
    projects: [
      "Created Cypress e2e test orchestration for microservices",
      "Designed API contract tests improving release confidence",
    ],
  },
];

const defaultShortlist = {
  "cand-ashwin": { shortlisted: true, jdId: "jd-fullstack" },
  "cand-nisha": { shortlisted: true, jdId: "jd-datasci" },
  "cand-ikram": { shortlisted: false, jdId: "jd-qa" },
};

/**
 * ============================================================================
 * INITIALIZE STORAGE - Sets up default data if storage is empty
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * Replace this with an API call to check if user has existing data:
 * 
 * async function initStorage() {
 *   try {
 *     const response = await fetch('/api/user/data/init', {
 *       headers: { 'Authorization': `Bearer ${getAuthToken()}` }
 *     });
 *     const data = await response.json();
 *     if (!data.hasData) {
 *       // User is new, set up default JDs
 *       await fetch('/api/jds', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
 *         body: JSON.stringify(defaultJDs)
 *       });
 *     }
 *   } catch (error) {
 *     console.error('Failed to initialize storage:', error);
 *   }
 * }
 * 
 * DATABASE QUERY:
 * SELECT COUNT(*) FROM job_descriptions WHERE created_by = :userId
 * ============================================================================
 */
export function initStorage() {
  // Use setStoredData to ensure events are triggered
  if (!localStorage.getItem(STORAGE_KEYS.jds)) {
    setStoredData(STORAGE_KEYS.jds, defaultJDs);
  }
  if (!localStorage.getItem(STORAGE_KEYS.candidates)) {
    const enriched = defaultCandidates.map((candidate) => {
      const jd = defaultJDs.find((job) => job.title.includes(candidate.primaryRole.split(" ")[0]));
      return {
        ...candidate,
        matches: jd ? calculateMatch(candidate, jd) : null,
      };
    });
    setStoredData(STORAGE_KEYS.candidates, enriched);
  }
  if (!localStorage.getItem(STORAGE_KEYS.shortlist)) {
    setStoredData(STORAGE_KEYS.shortlist, defaultShortlist);
  }
  if (!localStorage.getItem(STORAGE_KEYS.reports)) {
    setStoredData(STORAGE_KEYS.reports, {
      generatedOn: new Date().toISOString(),
      downloads: 0,
    });
  }
}

/**
 * ============================================================================
 * DATA ACCESS FUNCTIONS - Replace with API calls
 * ============================================================================
 * 
 * TODO: Replace these localStorage functions with actual API calls
 * 
 * Example API wrapper:
 * 
 * async function fetchJDs() {
 *   const response = await fetch('/api/jds', {
 *     headers: { 'Authorization': `Bearer ${getAuthToken()}` }
 *   });
 *   return await response.json();
 * }
 * 
 * async function saveJD(jdData) {
 *   const response = await fetch('/api/jds', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${getAuthToken()}`
 *     },
 *     body: JSON.stringify(jdData)
 *   });
 *   return await response.json();
 * }
 * ============================================================================
 */

/**
 * ============================================================================
 * GET STORED DATA - Fetches data from localStorage (replace with API calls)
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * Replace localStorage calls with API endpoints:
 * 
 * async function getStoredData(key) {
 *   try {
 *     let endpoint = '';
 *     switch(key) {
 *       case STORAGE_KEYS.jds:
 *         endpoint = '/api/jds';
 *         break;
 *       case STORAGE_KEYS.candidates:
 *         endpoint = '/api/candidates';
 *         break;
 *       case STORAGE_KEYS.shortlist:
 *         endpoint = '/api/shortlist';
 *         break;
 *       default:
 *         return null;
 *     }
 *     
 *     const response = await fetch(endpoint, {
 *       headers: { 
 *         'Authorization': `Bearer ${getAuthToken()}`,
 *         'Content-Type': 'application/json'
 *       }
 *     });
 *     
 *     if (!response.ok) throw new Error('Failed to fetch data');
 *     return await response.json();
 *   } catch (error) {
 *     console.error(`Error fetching ${key}:`, error);
 *     return null;
 *   }
 * }
 * 
 * DATABASE QUERIES:
 * - JDs: SELECT * FROM job_descriptions WHERE created_by = :userId ORDER BY created_at DESC
 * - Candidates: SELECT * FROM candidates WHERE user_id = :userId ORDER BY uploaded_at DESC
 * - Shortlist: SELECT * FROM shortlist WHERE user_id = :userId
 * ============================================================================
 */
export function getStoredData(key) {
  // TODO: Replace with API call
  // Example: if (key === STORAGE_KEYS.jds) return await fetchJDs();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * ============================================================================
 * SET STORED DATA - Saves data to localStorage and triggers refresh events
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * Replace localStorage with API calls based on the data type:
 * 
 * async function setStoredData(key, value) {
 *   try {
 *     let endpoint = '';
 *     let method = 'POST';
 *     
 *     switch(key) {
 *       case STORAGE_KEYS.jds:
 *         // If value is array, it's a bulk update
 *         if (Array.isArray(value)) {
 *           // For bulk operations, use PUT /api/jds/bulk
 *           endpoint = '/api/jds/bulk';
 *           method = 'PUT';
 *         } else {
 *           // Single JD update
 *           endpoint = value.id ? `/api/jds/${value.id}` : '/api/jds';
 *           method = value.id ? 'PUT' : 'POST';
 *         }
 *         break;
 *       case STORAGE_KEYS.candidates:
 *         if (Array.isArray(value)) {
 *           endpoint = '/api/candidates/bulk';
 *           method = 'PUT';
 *         } else {
 *           endpoint = value.id ? `/api/candidates/${value.id}` : '/api/candidates';
 *           method = value.id ? 'PUT' : 'POST';
 *         }
 *         break;
 *       case STORAGE_KEYS.shortlist:
 *         endpoint = '/api/shortlist';
 *         method = 'PUT'; // Bulk update shortlist
 *         break;
 *       default:
 *         return;
 *     }
 *     
 *     const response = await fetch(endpoint, {
 *       method: method,
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Bearer ${getAuthToken()}`
 *       },
 *       body: JSON.stringify(value)
 *     });
 *     
 *     if (!response.ok) throw new Error('Failed to save data');
 *     const savedData = await response.json();
 *     
 *     // Dispatch event to refresh UI
 *     document.dispatchEvent(new CustomEvent("dataUpdated", { 
 *       detail: { key, value: savedData } 
 *     }));
 *     
 *     return savedData;
 *   } catch (error) {
 *     console.error(`Error saving ${key}:`, error);
 *     throw error;
 *   }
 * }
 * 
 * DATABASE OPERATIONS:
 * - JDs: INSERT/UPDATE job_descriptions SET ... WHERE id = :id
 * - Candidates: INSERT/UPDATE candidates SET ... WHERE id = :id
 * - Shortlist: INSERT INTO shortlist ... ON CONFLICT UPDATE ...
 * 
 * NOTE: This function automatically dispatches a 'dataUpdated' event that
 * triggers dashboard chart refresh. All data modifications should use this
 * function instead of directly calling localStorage.setItem()
 * ============================================================================
 */
export function setStoredData(key, value) {
  // TODO: Replace with API call
  // Example: if (key === STORAGE_KEYS.jds) return await saveJD(value);
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify(value));
  // Dispatch custom event for same-tab updates (use setTimeout to ensure it fires after storage is set)
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("dataUpdated", {
      detail: { key, value, oldValue }
    }));
  }, 0);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * ============================================================================
 * MATCHING ALGORITHM - Replace with Backend SBERT API
 * ============================================================================
 * 
 * CURRENT: Simple token-based matching (simulation)
 * TODO: Replace with actual SBERT semantic similarity API call
 * 
 * BACKEND API ENDPOINT: POST /api/matching/calculate
 * 
 * Request Body: {
 *   candidate_id: "uuid",
 *   jd_id: "uuid",
 *   resume_text: "extracted text from resume",
 *   jd_text: "job description text",
 *   candidate_skills: ["Python", "React", ...],
 *   jd_keywords: ["Python", "Django", ...]
 * }
 * 
 * Response: {
 *   skill_match: 85,              // Percentage of matched skills
 *   sbert_score: 0.92,            // Semantic similarity (0-1 scale)
 *   final_score: 88,              // Weighted final score
 *   matched_skills: ["Python", "React"],  // Array of matched skills
 *   matched_sections: {
 *     experience: 0.9,           // Experience relevance (0-1)
 *     education: 0.7,             // Education relevance (0-1)
 *     skills: 0.95,               // Skills relevance (0-1)
 *     summary: 0.85                // Summary relevance (0-1)
 *   },
 *   calculation_timestamp: "2025-01-15T10:30:00Z"
 * }
 * 
 * BACKEND IMPLEMENTATION (Python Example):
 * ```python
 * from sentence_transformers import SentenceTransformer
 * import numpy as np
 * 
 * model = SentenceTransformer('all-MiniLM-L6-v2')
 * 
 * def calculate_match(resume_text, jd_text, candidate_skills, jd_keywords):
 *     # Generate embeddings
 *     resume_embedding = model.encode(resume_text)
 *     jd_embedding = model.encode(jd_text)
 *     
 *     # Calculate cosine similarity
 *     similarity = np.dot(resume_embedding, jd_embedding) / (
 *         np.linalg.norm(resume_embedding) * np.linalg.norm(jd_embedding)
 *     )
 *     
 *     # Keyword matching
 *     matched_skills = set(candidate_skills) & set(jd_keywords)
 *     skill_match = len(matched_skills) / len(jd_keywords) * 100
 *     
 *     # Hybrid scoring
 *     final_score = (similarity * 0.6 + skill_match * 0.4) * 100
 *     
 *     return {
 *         'sbert_score': float(similarity),
 *         'skill_match': int(skill_match),
 *         'final_score': int(final_score),
 *         'matched_skills': list(matched_skills)
 *     }
 * ```
 * 
 * DATABASE OPERATION:
 * After calculation, save to candidate_matches table:
 * INSERT INTO candidate_matches (
 *   candidate_id, jd_id, skill_match_percent, sbert_score, 
 *   final_score, matched_skills, calculated_at
 * ) VALUES (
 *   :candidate_id, :jd_id, :skill_match, :sbert_score,
 *   :final_score, :matched_skills_json, NOW()
 * ) ON CONFLICT (candidate_id, jd_id) 
 * UPDATE SET skill_match_percent = :skill_match, 
 *            sbert_score = :sbert_score,
 *            final_score = :final_score,
 *            calculated_at = NOW();
 * 
 * PERFORMANCE NOTES:
 * - Cache embeddings for frequently accessed JDs
 * - Use batch processing for bulk matching
 * - Consider async processing for large candidate pools
 * ============================================================================
 */
export function calculateMatch(candidate, jd) {
  // TODO: Replace with API call
  // const response = await fetch('/api/matching/calculate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     candidate_id: candidate.id,
  //     jd_id: jd.id,
  //     resume_text: candidate.resume_text || candidate.summary,
  //     jd_text: jd.description
  //   })
  // });
  // return await response.json();

  // Current simulation (remove after backend integration)
  const jdTokens = new Set([
    ...jd.keywords.map((k) => k.toLowerCase()),
    ...tokenize(jd.description),
  ]);
  const candidateTokens = new Set([
    ...candidate.skills.map((s) => s.toLowerCase()),
    ...tokenize(candidate.summary || ""),
  ]);

  let matches = 0;
  candidateTokens.forEach((token) => {
    if (jdTokens.has(token)) matches += 1;
  });

  const matchPercent = jdTokens.size
    ? Math.round((matches / jdTokens.size) * 100)
    : 0;

  const experienceScore = Math.min(100, candidate.experience * 12);
  const skillMatchScore = Math.round(matchPercent * 0.6 + experienceScore * 0.4);

  return {
    jdId: jd.id,
    jdTitle: jd.title,
    skillMatch: matchPercent,
    sbertScore: Math.min(95, 60 + Math.round(matchPercent * 0.35)), // Simulated
    finalScore: Math.round((skillMatchScore + matchPercent) / 2),
    matchedSkills: candidate.skills.filter((skill) => jdTokens.has(skill.toLowerCase())),
  };
}

/**
 * ============================================================================
 * REFRESH CANDIDATE MATCHES - Recalculates match scores for a specific JD
 * ============================================================================
 * 
 * BACKEND INTEGRATION:
 * Replace with API call to trigger batch matching:
 * 
 * async function refreshCandidateMatches(jdId) {
 *   try {
 *     const response = await fetch(`/api/matching/refresh/${jdId}`, {
 *       method: 'POST',
 *       headers: {
 *         'Authorization': `Bearer ${getAuthToken()}`,
 *         'Content-Type': 'application/json'
 *       }
 *     });
 *     
 *     if (!response.ok) throw new Error('Failed to refresh matches');
 *     const result = await response.json();
 *     
 *     // Dispatch event to refresh dashboard
 *     document.dispatchEvent(new CustomEvent("dataUpdated", {
 *       detail: { key: STORAGE_KEYS.candidates, jdId }
 *     }));
 *     
 *     return result;
 *   } catch (error) {
 *     console.error('Error refreshing matches:', error);
 *     throw error;
 *   }
 * }
 * 
 * DATABASE OPERATION:
 * Backend should:
 * 1. SELECT all candidates that need matching for this JD
 * 2. For each candidate, call matching service
 * 3. UPDATE candidate_matches table with new scores
 * 
 * SQL:
 * UPDATE candidate_matches cm
 * SET skill_match_percent = :new_skill_match,
 *     sbert_score = :new_sbert_score,
 *     final_score = :new_final_score,
 *     calculated_at = NOW()
 * WHERE cm.jd_id = :jd_id
 * AND cm.candidate_id IN (
 *   SELECT id FROM candidates WHERE status = 'active'
 * );
 * 
 * NOTE: This function triggers a dashboard refresh automatically via setStoredData
 * ============================================================================
 */
export function refreshCandidateMatches(jdId) {
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const jds = getStoredData(STORAGE_KEYS.jds) || [];
  const targetJD = jds.find((jd) => jd.id === jdId);
  if (!targetJD) return;

  const updated = candidates.map((candidate) => {
    if (!candidate.matches || candidate.matches.jdId === jdId) {
      return {
        ...candidate,
        matches: calculateMatch(candidate, targetJD),
      };
    }
    return candidate;
  });

  setStoredData(STORAGE_KEYS.candidates, updated);
  // Event is automatically dispatched by setStoredData
}

export function ensureMatches() {
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const jds = getStoredData(STORAGE_KEYS.jds) || [];
  const updated = candidates.map((candidate) => {
    const jd = jds.find((job) => job.title.includes(candidate.primaryRole.split(" ")[0])) || jds[0];
    return {
      ...candidate,
      matches: calculateMatch(candidate, jd),
    };
  });
  setStoredData(STORAGE_KEYS.candidates, updated);
}

