import API from '../../config/api-endpoint.js';

// Drag & Drop Upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const progress = document.getElementById('progress');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(files) {
    if (!files.length) return;
    const file = files[0];
    fileList.innerHTML = `<p><strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB)</p>`;
    
    // Real Upload
    await uploadFile(file);
}

// Foating button
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

// Show button when user scrolls down
window.addEventListener("scroll", () => {
    if (window.scrollY > 200) {
        scrollToTopBtn.classList.add("show");
    } else {
        scrollToTopBtn.classList.remove("show");
    }
});

// Scroll to top when button clicked
scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

const toggleBtn = document.getElementById('toggle');
const body = document.body;

// Mode toggle
toggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark');
    const darkMode = body.classList.contains('dark');
    document.querySelector('.icon').textContent = darkMode ? '☀️' : '🌑';
});

// Draggable floating behavior
let isDragging = false;
let offsetX, offsetY;

toggleBtn.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - toggleBtn.getBoundingClientRect().left;
    offsetY = e.clientY - toggleBtn.getBoundingClientRect().top;
    toggleBtn.style.transition = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Keep inside screen
    const maxX = window.innerWidth - toggleBtn.offsetWidth;
    const maxY = window.innerHeight - toggleBtn.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    toggleBtn.style.left = `${x}px`;
    toggleBtn.style.top = `${y}px`;
    toggleBtn.style.right = 'auto';
    toggleBtn.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    toggleBtn.style.transition = 'background-color 0.8s, color 0.3s';
});



// Resume Text: Managed by backend NLP
async function uploadFile(file) {
    progress.style.width = '0%';
    progress.style.transition = 'width 0.5s';
    
    // Show loading state
    progress.style.width = '30%';
    
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(API.public.parseResume, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        progress.style.width = '70%';
        const data = await response.json();
        
        // Fill the textarea with parsed text
        document.getElementById('resumeText').value = data.text;
        progress.style.width = '100%';
        
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to parse resume. Please try again.');
        progress.style.width = '0%';
    }
}

// Real Resume Analysis
window.analyze = async function() {
    const jd = document.getElementById('jobDesc').value;
    const resume = document.getElementById('resumeText').value;
    
    if (!jd || !resume) { 
        alert("Please enter both JD and Resume (or upload a resume)."); 
        return; 
    }

    const resultBox = document.getElementById('result');
    resultBox.innerHTML = '<div class="spinner"></div> Analyzing...';

    try {
        const response = await fetch(API.public.analyze, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resume_text: resume,
                jd_text: jd
            })
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const data = await response.json();
        
        // Display Results
        resultBox.innerHTML = `
            <div class="analysis-results">
                <div class="score-summary">
                    <div class="main-score">
                        <span class="score-label">Final Match Score</span>
                        <span class="score-number ${getScoreClass(data.match_score)}">${data.match_score}%</span>
                    </div>
                    <div class="sub-scores">
                        <div class="sub-score">
                            <span>Skill Match:</span> <strong>${data.skill_match_score}%</strong>
                        </div>
                        <div class="sub-score">
                            <span>Semantic Match (SBERT):</span> <strong>${data.sbert_score}%</strong>
                        </div>
                    </div>
                </div>

                <div class="skills-section">
                    <h4>Skills Found in Resume</h4>
                    <div class="tags">
                        ${data.resume_skills.length ? data.resume_skills.map(s => `<span class="tag resume-skill">${s}</span>`).join('') : 'None detected'}
                    </div>
                </div>

                <div class="skills-section">
                    <h4>Missing Skills (from JD)</h4>
                    <div class="tags">
                        ${data.missing_skills.length ? data.missing_skills.map(s => `<span class="tag missing-skill">${s}</span>`).join('') : 'None! Good job.'}
                    </div>
                </div>

                <div class="improvements-section">
                    <h4>Suggested Improvements</h4>
                    <ul>
                        ${data.improvements.map(imp => `<li>${imp}</li>`).join('')}
                    </ul>
                </div>

                <div class="email-action" style="text-align: center; margin-top: 30px;">
                    <button id="sendReportBtn" class="submit-btn" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                        <i class="fa-solid fa-envelope"></i> Send Report to Email
                    </button>
                    <p id="emailStatus" style="margin-top: 10px; font-size: 14px;"></p>
                </div>
            </div>
        `;

        // Store the analysis data globally for email sending
        window.currentAnalysis = data;

        // Add event listener to send report button
        const sendReportBtn = document.getElementById('sendReportBtn');
        if (sendReportBtn) {
            sendReportBtn.addEventListener('click', async () => {
                await sendReportToEmail(data);
            });
        }

        // Update Charts/Circles if they exist
        // We can map our backend scores to the frontend circles for visual effect
        // Impact -> Match Score
        // Brevity -> Skill Match
        // Style -> SBERT Score
        // Soft Skills -> (Random or derived)
        
        if (window.setAllScores) {
            window.setAllScores({
                'impact-circle': Math.round(data.match_score),
                'brevity-circle': Math.round(data.skill_match_score),
                'style-circle': Math.round(data.sbert_score),
                'soft-skills-circle': Math.round((data.match_score + data.sbert_score) / 2) // Approximation
            });
        }

    } catch (error) {
        console.error('Analysis error:', error);
        resultBox.innerHTML = 'Error analyzing resume. Please try again.';
    }
}

// Function to send report to user's email
async function sendReportToEmail(analysisData) {
    const sendReportBtn = document.getElementById('sendReportBtn');
    const emailStatus = document.getElementById('emailStatus');

    // Check if user is logged in
    const googleUser = sessionStorage.getItem('googleUser');
    
    if (!googleUser) {
        emailStatus.innerHTML = '<span style="color: #f44336;">❌ Please sign in to send report to email</span>';
        // Open sign-in popup
        if (window.openPopup) {
            setTimeout(() => window.openPopup(), 1000);
        }
        return;
    }

    const user = JSON.parse(googleUser);
    
    if (!user.email) {
        emailStatus.innerHTML = '<span style="color: #f44336;">❌ Email not found. Please sign in again.</span>';
        return;
    }

    try {
        // Disable button while sending
        sendReportBtn.disabled = true;
        sendReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        emailStatus.innerHTML = '';

        const response = await fetch(API.public.sendReport, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                user_name: user.name || 'User',
                match_score: analysisData.match_score,
                sbert_score: analysisData.sbert_score,
                skill_match_score: analysisData.skill_match_score,
                resume_skills: analysisData.resume_skills,
                matched_skills: analysisData.matched_skills,
                missing_skills: analysisData.missing_skills,
                improvements: analysisData.improvements
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to send email');
        }

        const data = await response.json();
        
        // Show success message
        emailStatus.innerHTML = `<span style="color: #22c55e;">✅ ${data.message}</span>`;
        sendReportBtn.innerHTML = '<i class="fa-solid fa-check"></i> Sent Successfully!';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            sendReportBtn.disabled = false;
            sendReportBtn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send Report to Email';
        }, 3000);

    } catch (error) {
        console.error('Email sending error:', error);
        emailStatus.innerHTML = `<span style="color: #f44336;">❌ ${error.message}</span>`;
        sendReportBtn.disabled = false;
        sendReportBtn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send Report to Email';
    }
}

function getScoreClass(score) {
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
}

document.addEventListener('DOMContentLoaded', () => {

    /**
     * Updates a single score display: the circle, the number, and the badge.
     * @param {string} circleId The ID of the SVG path element for the progress circle.
     * @param {number} percentage The score value (0-100).
     */
    function updateScoreDisplay(circleId, percentage) {
        const circle = document.getElementById(circleId);
        if (!circle) return;

        const scoreItem = circle.closest('.score-item');
        if (!scoreItem) return;

        const valueElement = scoreItem.querySelector('.score-value');
        const badgeElement = scoreItem.querySelector('.score-badge');

        // 1. Animate the progress circle
        const offset = 100 - percentage;
        circle.style.strokeDashoffset = offset;

        // 2. Update the score number
        valueElement.textContent = percentage;

        // 3. Update the badge text and color
        badgeElement.classList.remove('badge-average', 'badge-good', 'badge-excellent');

        if (percentage === 0) {
            badgeElement.textContent = '';
            circle.style.stroke = '#e5e7eb'; // Default/inactive color
        } else if (percentage < 40 && percentage > 0) {
            badgeElement.textContent = 'WEAK';
            badgeElement.classList.add('badge-weak');
            circle.style.stroke = '#f97316'; // Orange
        } else if (percentage < 75 && percentage > 40) {
            badgeElement.textContent = 'AVERAGE';
            badgeElement.classList.add('badge-average');
            circle.style.stroke = '#f97316'; // Orange
        } else if (percentage < 90) {
            badgeElement.textContent = 'GOOD';
            badgeElement.classList.add('badge-good');
            circle.style.stroke = '#22c55e'; // Green
        } else {
            badgeElement.textContent = 'EXCELLENT';
            badgeElement.classList.add('badge-excellent');
            circle.style.stroke = '#22c55e'; // Green
        }
    }

    /**
     * Sets all scores on the page. This is the main function you will call
     * from your backend integration after fetching the data.
     * @param {object} scores - An object where keys are circle IDs and values are scores.
     * e.g., { 'impact-circle': 85, 'brevity-circle': 95, ... }
     */
    function setAllScores(scores) {
        for (const [id, score] of Object.entries(scores)) {
            updateScoreDisplay(id, score);
        }
    }

    // --- INITIALIZATION ---
    // On page load, set all scores to 0.
    const initialScores = {
        'impact-circle': 0,
        'brevity-circle': 0,
        'style-circle': 0,
        'soft-skills-circle': 0,
    };
    setAllScores(initialScores);


    // --- BACKEND SIMULATION (FOR DEMO PURPOSES) ---
    // This is an example to show how you would update the scores.
    // In your real application, you would REMOVE this setTimeout block
    // and call `setAllScores` with the data you fetch from your Python backend.
    setTimeout(() => {
        const backendScores = {
            'impact-circle': 10,
            'brevity-circle': 45,
            'style-circle': 94,
            'soft-skills-circle': 100,
        };
        setAllScores(backendScores);
    }, 1500); // Simulate a 1.5-second delay before scores arrive.
});


// Key Features Video Popup
const features = document.querySelectorAll('#features .feature');
const videoModal = document.getElementById('videoModal');
const featureVideo = document.getElementById('featureVideo');
const closeVideo = document.getElementById('closeVideo');

const videoMap = {
    'AI-Powered Matching': 'videos/ai_matching.mp4',
    'Bias Mitigation': 'videos/bias_mitigation.mp4',
    'Explainable Results': 'videos/explainable_results.mp4',
    'Visual Reports': 'videos/visual_reports.mp4'
};

features.forEach(feature => {
    feature.style.cursor = 'pointer';
    feature.addEventListener('click', () => {
        const title = feature.querySelector('h3').textContent.trim();
        const videoSrc = videoMap[title];
        if (videoSrc) {
            featureVideo.src = videoSrc;
            videoModal.style.display = 'flex';

            // ADDED: Apply to both body and html element
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            featureVideo.play();
        }
    });
});

closeVideo.addEventListener('click', () => {
    featureVideo.pause();
    videoModal.style.display = 'none';

    // ADDED: Reset both elements
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    featureVideo.src = '';
});

// "Click outside to close" listener remains removed
closeVideo.addEventListener('click', () => {
    featureVideo.pause();
    videoModal.style.display = 'none';
    document.body.style.overflow = ''; // ADDED: Re-enables page scrolling
    featureVideo.src = '';
});
