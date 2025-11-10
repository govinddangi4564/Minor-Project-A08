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
    // Only open the popup if no user is currently logged in
    if (!googleUser) {
        openPopup();
    }
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

    // Initialize Google Sign-In
    initializeGoogleSignIn();

    // Check if user is already signed in on page load
    const savedUser = sessionStorage.getItem('googleUser'); // Changed from localStorage
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            googleUser = user;
            updateSignInButtonToProfile(user);
        } catch (error) {
            console.error('Error loading saved user:', error);
            sessionStorage.removeItem('googleUser'); // Changed from localStorage
        }
    }

    // =================================================================================
    // 5. Manual Login Form Handler
    //    Handles submission of the standard email/password login form.
    // =================================================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            // Prevent the default form submission which reloads the page
            event.preventDefault();

            // --- 1. Data Collection ---
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // --- 2. Client-Side Validation ---
            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }

            // --- 3. Backend Integration Point ---
            // This is where you send the login credentials to your backend for verification.
            try {
                console.log('Attempting to log in with:', { email });

                // --- Backend Integration Point ---
                // In a real application, you would send the email and password to your backend.
                // The backend would validate the credentials and, if successful, return the user's data.

                /*
                // EXAMPLE: How to send data to a backend login endpoint
                const response = await fetch('/api/login', { // Replace with your actual API endpoint
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Login failed. Please check your credentials.');
                }

                const user = await response.json();
                displayUserInfo(user); 
                closePopup(); 
                */

                // --- DEMO-ONLY LOGIC (To be replaced by actual backend call) ---
                // For demonstration, we'll simulate a successful login and create a mock user object.
                const mockUser = {
                    name: email.split('@')[0], // Use the part of the email before the '@' as the name
                    email: email,
                    picture: 'https://via.placeholder.com/150/7c3aed/ffffff?text=' + email.charAt(0).toUpperCase() // A placeholder profile picture
                };

                // Update the UI with the mock user's information and close the popup
                displayUserInfo(mockUser);
                closePopup();

            } catch (error) {
                console.error('Login Error:', error);
                alert(error.message); // Show error message to the user
            }
        });
    }
});

// Google Sign-In Implementation
let googleUser = null;
let tokenClient = null;

// Function to initialize Google Sign-In
function initializeGoogleSignIn() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');

    // Wait for Google Identity Services to load
    function waitForGoogle() {
        if (typeof google !== 'undefined' && google.accounts) {
            setupGoogleSignIn();
        } else {
            // Retry if Google Identity Services hasn't loaded yet
            setTimeout(waitForGoogle, 100);
        }
    }

    waitForGoogle();
}

function setupGoogleSignIn() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const CLIENT_ID = '716638260025-otlb8qrc3p2fs6288oh4u1v1qe3upkh5.apps.googleusercontent.com';

    // Initialize Google Identity Services
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
    });

    // Initialize OAuth 2.0 token client for fallback
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'email profile',
        callback: handleTokenResponse,
    });

    googleSignInBtn.addEventListener('click', () => {
        // Add loading state to the button
        googleSignInBtn.classList.add('loading');

        // Try to use One Tap first
        google.accounts.id.prompt((notification) => {
            // This callback runs when the prompt is closed or not displayed.
            // We remove the loading state here.
            googleSignInBtn.classList.remove('loading');

            if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                // If One Tap is not available, use OAuth 2.0 popup
                if (tokenClient) {
                    tokenClient.requestAccessToken({ prompt: 'consent' });
                    // Note: We don't add a loader here as the popup flow is immediate.
                }
            }
        });
    });
}

// Handle credential response from Google One Tap
function handleCredentialResponse(response) {
    try {
        // Decode the JWT token to get user info
        const payload = JSON.parse(atob(response.credential.split('.')[1]));

        // Store user info
        googleUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            sub: payload.sub
        };

        // Display user info
        displayUserInfo(googleUser);

        // Close the popup after successful sign-in
        setTimeout(() => {
            closePopup();
            // Restore button state in case it was still loading
            const googleSignInBtn = document.getElementById('googleSignInBtn');
            if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
        }, 2000);
    } catch (error) {
        console.error('Error handling credential response:', error);
        alert('Failed to sign in with Google. Please try again.');
    }
}

// Handle token response from OAuth 2.0 flow
function handleTokenResponse(tokenResponse) {
    if (tokenResponse.error) {
        console.error('Google Sign-In error:', tokenResponse.error);
        alert('Failed to sign in with Google: ' + tokenResponse.error);
        // Restore button state on error
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
        return;
    }

    // Fetch user info using the access token
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            return response.json();
        })
        .then(data => {
            googleUser = {
                name: data.name,
                email: data.email,
                picture: data.picture,
                id: data.id
            };
            displayUserInfo(googleUser);

            // Close the popup after successful sign-in
            setTimeout(() => {
                closePopup();
                // Restore button state
                const googleSignInBtn = document.getElementById('googleSignInBtn');
                if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
            }, 2000);
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            alert('Failed to sign in with Google. Please try again.');
            document.getElementById('googleSignInBtn')?.classList.remove('loading');
        });
}

// Display user information after successful sign-in
function displayUserInfo(user) {
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv && user) {
        userInfoDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
                <p style="color: #22c55e; margin-top: 10px; font-weight: 600; font-size: 16px;">✓ Sign-in done!</p>
            </div>
        `;
    }

    // Update the sign-in button to profile button
    updateSignInButtonToProfile(user);
}

// Update sign-in button to profile button after successful sign-in
function updateSignInButtonToProfile(user) {
    const userSignInBtn = document.getElementById('sign-in');
    const hrLoginBtn = document.getElementById('hr-login-btn');

    if (userSignInBtn && user) {
        // Hide the HR login button
        if (hrLoginBtn) {
            hrLoginBtn.style.display = 'none';
        }
        // Remove onclick attribute and add new event listener
        userSignInBtn.removeAttribute('onclick');
        userSignInBtn.innerHTML = `
            <img src="${user.picture}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; border: 2px solid #7c3aed;">
            <span>Profile</span>
        `;
        userSignInBtn.onclick = (e) => {
            e.preventDefault();
            // Redirect to the dedicated profile page (connected to actual file)
            window.location.href = 'User-module/profile-section.html';
        };

        // Store user data in sessionStorage for persistence within the current session
        sessionStorage.setItem('googleUser', JSON.stringify(user));
    }
}

// Function to logout
function logout() {
    // Clear user data 
    googleUser = null;
    localStorage.removeItem('googleUser');

    // Reset sign-in button
    const userSignInBtn = document.getElementById('sign-in');
    const hrLoginBtn = document.getElementById('hr-login-btn');
    if (userSignInBtn) {
        userSignInBtn.innerHTML = `
            <i class="fa-solid fa-user"></i>
            Sign In
        `;
        userSignInBtn.onclick = (e) => {
            e.preventDefault();
            openPopup();
        };
    }

    // Show the HR login button again
    if (hrLoginBtn) {
        hrLoginBtn.style.display = 'flex';
    }

    // Redirect to home page after logout, as the profile page will no longer be active
    // and the user should be taken back to a non-logged-in state.

    // Show success message
    alert('Successfully signed out!');
}

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
    'AI-Powered Matching': '../videos/ai_matching.mp4',
    'Bias Mitigation': '../videos/bias_mitigation.mp4',
    'Explainable Results': '../videos/explainable_results.mp4',
    'Visual Reports': '../videos/visual_reports.mp4'
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
