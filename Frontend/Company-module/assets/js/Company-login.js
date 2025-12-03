const loginForm = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const messageDiv = document.getElementById('message');
/**
 * ============================================================================
 * COMPANY LOGIN - BACKEND INTEGRATION
 * ============================================================================
 *
 * 1. API Endpoint: POST /api/auth/company/login
 *
 * 2. Request Body:
 *    {
 *      "email": "hr@gmail.com",
 *      "password": "password123"
 *    }
 *
 * 3. Success Response (200 OK):
 *    {
 *      "token": "your_jwt_token_here",
 *      "company": { "id": "company-123", "name": "Innovate Inc." }
 *    }
 *
 * 4. Error Response (401 Unauthorized):
 *    { "message": "Invalid credentials" }
 */
const allowedEmail = "hr@gmail.com"; // <-- DEMO: set your allowed Gmail here
const allowedPassword = "123456"; // optional: set a password if needed

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

import API from '../../../config/api-endpoint.js';
import { navigateTo, routes } from '../../../src/utils/router.js';

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    showMessage('Logging in...', 'info');

    fetch(API.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.detail || 'Invalid email or password!'); });
            }
            return response.json();
        })
        .then(data => {
            // On successful login, store the token and redirect.
            sessionStorage.setItem('companyAuthToken', data.token); // Store token
            sessionStorage.setItem('companyData', JSON.stringify(data)); // Store company data
            sessionStorage.setItem('isCompanyLoggedIn', 'true'); // Set session flag

            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => navigateTo(routes.company.dashboard), 1500);
        })
        .catch(error => {
            console.error('Login error:', error);
            showMessage(error.message, 'error');
        });
});

registerBtn.addEventListener('click', function () {
    showMessage('Redirecting to plans...', 'success');
    // Redirect to plans page
    setTimeout(() => {
        navigateTo(routes.company.plans);
    }, 1500);
});