// Registration elements only
const registrationPage = document.getElementById('registrationPage');
const selectedPlanName = document.getElementById('selectedPlanName');
const backBtn = document.getElementById('backBtn');
const registrationForm = document.getElementById('registrationForm');

// Ensure a plan is selected; otherwise, go to plans page
(function initRegistrationFromPlan() {
    try {
        const savedPlanRaw = localStorage.getItem('companyPlan');
        if (!savedPlanRaw) {
            navigateTo(routes.company.plans);
            return;
        }
        const plan = JSON.parse(savedPlanRaw);
        if (!plan || !plan.name) {
            navigateTo(routes.company.plans);
            return;
        }
        selectedPlanName.textContent = plan.name + ' Plan';
        window.scrollTo(0, 0);
    } catch (_) {
        navigateTo(routes.company.plans);
    }
})();

/**
 * ============================================================================
 * COMPANY REGISTRATION - BACKEND INTEGRATION
 * ============================================================================
 *
 * 1. API Endpoint: POST /api/companies/register
 *
 * 2. Request Body:
 *    {
 *      "firstName": "John",
 *      "lastName": "Doe",
 *      "email": "john.doe@company.com",
 *      "password": "secure_password",
 *      "plan": "Agency Plan"
 *    }
 *
 * 3. Success Response (201 Created):
 *    {
 *      "token": "your_jwt_token_for_auto_login",
 *      "company": { "id": "new-company-id", "name": "John Doe's Company" }
 *    }
 */

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Back button: go to plans page
backBtn.addEventListener('click', function () {
    navigateTo(routes.company.plans);
});

import API from '../../../config/api-endpoint.js';
import { navigateTo, routes } from '../../../src/utils/router.js';

// Form submission
registrationForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const fullName = this.elements[0].value; // "Full Name" input
    const companyName = this.elements[1].value; // "Company Name" input
    const email = this.elements[2].value; // "Email" input
    const password = this.elements[3].value; // "Password" input
    const plan = selectedPlanName.textContent;
    const website = ""; // Add website input if needed, or leave empty

    // Construct payload matching RegisterCompanySchema
    const registrationData = {
        name: companyName,
        email: email,
        password: password,
        website: website,
        plan: plan
    };

    showMessage('Registering...', 'info');

    fetch(API.company.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { 
                    const error = new Error(err.detail || 'Registration failed!');
                    error.status = response.status;
                    throw error;
                });
            }
            return response.json();
        })
        .then(data => {
            // Auto-login or redirect to login
            // The backend returns company profile, but not a token directly in the register response based on the route code I saw.
            // Route: returns { companyID, companyName, companyEmail, companyWebsite }

            showMessage('Registration successful! Please login.', 'success');
            setTimeout(() => navigateTo(routes.company.login), 1500);
        })
        .catch(error => {
            console.error('Registration error:', error);
            
            // Check if it's a duplicate email error (409 Conflict)
            if (error.status === 409) {
                showMessage('User already exists. Please try login. Redirecting...', 'error');
                // Redirect to login page after 2.5 seconds
                setTimeout(() => navigateTo(routes.company.login), 2500);
            } else {
                showMessage(error.message, 'error');
            }
        });
});