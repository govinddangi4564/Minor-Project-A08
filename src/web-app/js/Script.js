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

function handleFiles(files) {
    if (!files.length) return;
    const file = files[0];
    fileList.innerHTML = `<p><strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB)</p>`;
    simulateUpload(file);
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

// Auto open popup after 5 seconds
setTimeout(() => {
    openPopup();
}, 5000);

// Function to open popup
function openPopup() {
    document.getElementById('overlay').classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent scroll when popup is open
}

// Function to close popup (only via × button)
function closePopup() {
    document.getElementById('overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
    history.replaceState(null, null, ' '); // remove #sign-in from URL
}

// Automatically open popup when URL contains #sign-in
window.addEventListener('load', () => {
    if (window.location.hash === '#sign-in') {
        openPopup();
    }
});

// ✅ Removed the overlay click listener
// Now the popup closes only when the close button is clicked


/*
  Behavior:
  - Wait for a user interaction (scroll / wheel / touch / key) before starting to observe.
  - Then use IntersectionObserver to add .in-view (and unobserve after).
  - Fallback: throttled getBoundingClientRect checks if IntersectionObserver isn't available.
*/
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const items = Array.from(document.querySelectorAll('.scroll-item'));
        if (!items.length) return;

        // Throttle helper
        function throttle(fn, wait) {
            let last = 0;
            return function (...args) {
                const now = Date.now();
                if (now - last >= wait) {
                    last = now;
                    fn.apply(this, args);
                }
            };
        }

        // Start observing once the user interacts (scroll/wheel/touch/keydown)
        let started = false;
        function startObserving() {
            if (started) return;
            started = true;
            window.removeEventListener('scroll', onFirstScroll);
            window.removeEventListener('wheel', startObserving);
            window.removeEventListener('touchstart', startObserving);
            window.removeEventListener('keydown', startObserving);

            initObserver();
        }

        // small helper to detect a meaningful initial scroll
        function onFirstScroll() {
            if (window.pageYOffset > 5) startObserving(); // user scrolled a bit
        }

        // Attach listeners that will trigger the observer to start
        window.addEventListener('scroll', onFirstScroll, { passive: true });
        window.addEventListener('wheel', startObserving, { passive: true });
        window.addEventListener('touchstart', startObserving, { passive: true });
        window.addEventListener('keydown', startObserving);

        function initObserver() {
            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('in-view');
                            obs.unobserve(entry.target); // one-time animation
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: '0px 0px -10% 0px'
                });
                items.forEach(i => io.observe(i));
            } else {
                // fallback for old browsers: check on scroll
                const check = throttle(() => {
                    items.forEach(el => {
                        if (el.classList.contains('in-view')) return;
                        const r = el.getBoundingClientRect();
                        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) {
                            el.classList.add('in-view');
                        }
                    });
                }, 180);
                window.addEventListener('scroll', check, { passive: true });
                check(); // run once
            }
        }

        // If user navigates via anchor (hash) or clicks a link that moves the page,
        // startObserving so we attach the observer.
        window.addEventListener('hashchange', startObserving);
    });
})();

// Mode Change
document.getElementById('toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');

    const darkMode = document.body.classList.contains('dark');
    document.querySelector('.icon').textContent = darkMode ? '🌞' : '🌙';
    document.querySelector('.Mode_text').textContent = darkMode ? 'Light Mode' : 'Dark Mode';
});


// Resume Text: Managed by backend NLP
function simulateUpload(file) {
    progress.style.width = '0%';
    let percent = 0;
    const interval = setInterval(() => {
        percent += 10;
        progress.style.width = percent + '%';
        if (percent >= 100) {
            clearInterval(interval);
            document.getElementById('resumeText').value = `Uploaded file: ${file.name}\n(Note: Backend will extract text using NLP parser here.)`;
        }
    }, 200);
}

// Simple Resume Analysis Simulation
function analyze() {
    const jd = document.getElementById('jobDesc').value.toLowerCase();
    const resume = document.getElementById('resumeText').value.toLowerCase();
    if (!jd || !resume) { alert("Please enter both JD and Resume."); return; }

    const jdWords = jd.split(/\W+/).filter(w => w.length > 2);
    const resumeWords = resume.split(/\W+/).filter(w => w.length > 2);
    const matched = jdWords.filter(w => resumeWords.includes(w));
    const score = Math.round((matched.length / jdWords.length) * 100);

    document.getElementById('result').innerHTML =
        `<strong>Match Score:</strong> ${score}%<br><br>
         <strong>Matched Skills:</strong> ${matched.join(', ') || 'None'}<br><br>
         <strong>Remarks:</strong> ${score > 70 ? 'Highly Suitable' : score > 40 ? 'Moderately Suitable' : 'Needs Improvement'}`;

    drawChart(score);
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
        badgeElement.classList.remove('badge-weak','badge-average', 'badge-good', 'badge-excellent');

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
    'AI-Powered Matching': './videos/ai_matching.mp4',
    'Bias Mitigation': './videos/bias_mitigation.mp4',
    'Explainable Results': './videos/explainable_results.mp4',
    'Visual Reports': './videos/visual_reports.mp4'
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
