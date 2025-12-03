import API from '../../config/api-endpoint.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- 1. ELEMENT SELECTION ---
    const registrationForm = document.getElementById('registrationForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');

    // --- 2. MANUAL REGISTRATION FORM HANDLER ---
    registrationForm.addEventListener('submit', async (event) => {
        // Prevent the default form submission which reloads the page
        event.preventDefault();

        // Validate the form fields
        if (!validateForm()) return;

        // --- Data Collection ---
        const formData = {
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            phone: document.getElementById('phone').value.trim(),
            newsletter: document.getElementById('newsletter').checked
        };

        // --- Backend Integration Point ---
        try {
            console.log('Submitting registration data to backend:', formData);

            const response = await fetch(API.user.register, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed.');
            }

            const result = await response.json(); 

            alert('Registration successful! Please login.');
            // Redirect to the login page (or home page if auto-login implemented later)
            // For now, redirecting to home as per original flow, but ideally should be login
            window.location.href = '../Index.html';

        } catch (error) {
            console.error('Registration Error:', error);
            alert(error.message);
        }
    });

    // --- 3. FORM VALIDATION LOGIC ---
    function validateForm() {
        // Checks for full name
        if (fullNameInput.value.trim() === '') {
            alert('Please enter your full name.');
            return false;
        }

        // Checks password length
        if (passwordInput.value.length < 8) {
            alert('Password must be at least 8 characters.');
            return false;
        }

        // Checks if passwords match
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Passwords do not match.');
            return false;
        }

        // Checks if terms are agreed to
        if (!termsCheckbox.checked) {
            alert('You must agree to the Terms & Conditions.');
            return false;
        }

        // If all checks pass, the form is valid
        return true;
    }
});

// --- 4. GOOGLE SIGN-UP ACTIVATION ---
function initializeGoogleSignUp() {
    const googleSignUpBtn = document.getElementById('googleSignUpBtn');
    const CLIENT_ID = '19336390572-4o00kvnppt5ftohmd7n0cv94mir54551.apps.googleusercontent.com';

    // Wait for Google Identity Services to load
    function waitForGoogle() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: handleGoogleSignUpResponse,
            });

            googleSignUpBtn.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        } else {
            setTimeout(waitForGoogle, 100);
        }
    }
    waitForGoogle();
}

// Callback function to handle the response from Google Sign-Up
async function handleGoogleSignUpResponse(response) {
    try {
        console.log("Google Sign-Up Response:", response);

        // Send the ID token to the backend
        const res = await fetch(API.user.googleLogin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Google Sign-Up failed');
        }

        const data = await res.json();
        
        const user = {
            name: data.fullName,
            email: data.email,
            picture: data.picture,
            token: data.token,
            id: data.user_id
        };

        sessionStorage.setItem('googleUser', JSON.stringify(user));
        sessionStorage.setItem('authToken', data.token);

        alert('Sign-up with Google successful! Welcome, ' + user.name);
        window.location.href = '../Index.html';

    } catch (error) {
        console.error('Error handling Google Sign-Up response:', error);
        alert('Failed to sign up with Google: ' + error.message);
    }
}

// Initialize on load
window.addEventListener('load', initializeGoogleSignUp);
