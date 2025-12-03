import API from '../../config/api-endpoint.js';

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
window.openPopup = openPopup;

// Function to close popup (only via × button)
function closePopup() {
    document.getElementById('overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
    history.replaceState(null, null, ' '); // remove #sign-in from URL
}
window.closePopup = closePopup;

// Automatically open popup when URL contains #sign-in
window.addEventListener('load', () => {
    if (window.location.hash === '#sign-in') {
        openPopup();
    }

    // Initialize Google Sign-In
    initializeGoogleSignIn();

    // Check if user is already signed in on page load
    const savedUser = sessionStorage.getItem('googleUser');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            googleUser = user;
            updateSignInButtonToProfile(user);
        } catch (error) {
            console.error('Error loading saved user:', error);
            sessionStorage.removeItem('googleUser');
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
            try {
                console.log('Attempting to log in with:', { email });

                const response = await fetch(API.user.login, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
                }

                const data = await response.json();
                
                // Construct user object from response
                const user = {
                    name: data.fullName,
                    email: data.email,
                    picture: data.picture || 'https://via.placeholder.com/150/7c3aed/ffffff?text=' + data.fullName.charAt(0).toUpperCase(),
                    token: data.token,
                    id: data.user_id
                };

                // Update the UI with the user's information and close the popup
                displayUserInfo(user);
                closePopup();
                
                // Store token separately if needed for other requests
                sessionStorage.setItem('authToken', data.token);

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
    const CLIENT_ID = '19336390572-4o00kvnppt5ftohmd7n0cv94mir54551.apps.googleusercontent.com';

    // Wait for Google Identity Services to load
    function waitForGoogle() {
        if (typeof google !== 'undefined' && google.accounts) {
            setupGoogleSignIn(CLIENT_ID);
        } else {
            // Retry if Google Identity Services hasn't loaded yet
            setTimeout(waitForGoogle, 100);
        }
    }

    waitForGoogle();
}

function setupGoogleSignIn(CLIENT_ID) {
    const googleSignInBtn = document.getElementById('googleSignInBtn');

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
                }
            }
        });
    });
}

// Handle credential response from Google One Tap
async function handleCredentialResponse(response) {
    try {
        console.log("Google Credential Response:", response);
        
        // Send the ID token to the backend
        const res = await fetch(API.user.googleLogin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Google Login failed');
        }

        const data = await res.json();
        
        const user = {
            name: data.fullName,
            email: data.email,
            picture: data.picture,
            token: data.token,
            id: data.user_id
        };

        displayUserInfo(user);
        sessionStorage.setItem('authToken', data.token);

        setTimeout(() => {
            closePopup();
            const googleSignInBtn = document.getElementById('googleSignInBtn');
            if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
        }, 2000);

    } catch (error) {
        console.error('Error handling credential response:', error);
        alert('Failed to sign in with Google: ' + error.message);
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
    }
}

// Handle token response from OAuth 2.0 flow
async function handleTokenResponse(tokenResponse) {
    if (tokenResponse.error) {
        console.error('Google Sign-In error:', tokenResponse.error);
        alert('Failed to sign in with Google: ' + tokenResponse.error);
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
        return;
    }

    try {
        // Send the access token to the backend
        const res = await fetch(API.user.googleLogin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenResponse.access_token })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Google Login failed');
        }

        const data = await res.json();
        
        const user = {
            name: data.fullName,
            email: data.email,
            picture: data.picture,
            token: data.token,
            id: data.user_id
        };

        displayUserInfo(user);
        sessionStorage.setItem('authToken', data.token);

        setTimeout(() => {
            closePopup();
            const googleSignInBtn = document.getElementById('googleSignInBtn');
            if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
        }, 2000);

    } catch (error) {
        console.error('Error handling token response:', error);
        alert('Failed to sign in with Google: ' + error.message);
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) googleSignInBtn.classList.remove('loading');
    }
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
            window.location.href = '/User-module/profile-section.html';
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