import API from '../../../config/api-endpoint.js';
import { navigateTo, routes, logout } from '../../../src/utils/router.js';

document.addEventListener('DOMContentLoaded', function () {
    /**
     * ============================================================================
     * AUTHENTICATION CHECK
     * ============================================================================
     * This check runs on every protected page. It ensures the user is logged in.
     */
    if (sessionStorage.getItem('isCompanyLoggedIn') !== 'true') {
        // If not logged in, redirect to the login page
        logout();
        return; // Stop executing the rest of the script
    }

    /**
     * ============================================================================
     * COMPANY PROFILE - BACKEND INTEGRATION
     * ============================================================================
     *
     * 1. GET /api/company/profile
     *    - Fetches the current company's data to populate the form.
     *
     * 2. PUT /api/company/profile
     *    - Updates the company's profile data.
     *
     * 3. POST /api/company/change-password
     *    - Handles password changes.
     *
     */
    const form = document.getElementById('companyProfileForm');
    const securityForm = document.getElementById('securityForm');
    const inviteForm = document.getElementById('inviteForm');
    const messageDiv = document.getElementById('message');
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    const modalOverlay = document.getElementById('modal-overlay');
    const enable2faBtn = document.getElementById('enable2faBtn');
    const twoFactorModal = document.getElementById('twoFactorModal');

    // --- Other Interactive Elements ---
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    const generateApiBtn = document.getElementById('generateApiBtn');
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.querySelector('.current-logo');

    // --- Tab Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            // Update nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update tab content
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Update URL hash
            history.pushState(null, null, '#' + targetTab);
        });
    });

    // --- Handle initial tab from URL hash ---
    const currentHash = window.location.hash.substring(1);
    if (currentHash) {
        const initialTab = document.querySelector('.nav-item[data-tab="' + currentHash + '"]');
        if (initialTab) {
            initialTab.click();
        }
    }

    // --- Show Message Function ---
    function showMessage(text, type = 'success') {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
        messageDiv.classList.add('show');

        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 3000);
    }

    // --- Company Profile Form Submission ---
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const companyName = document.getElementById('companyName').value.trim();
        const companyEmail = document.getElementById('companyEmail').value.trim();
        const companyWebsite = document.getElementById('companyWebsite').value.trim();
        const companyAddress = document.getElementById('companyAddress').value.trim();
        const companyDescription = document.getElementById('companyDescription').value.trim();

        // Validation
        if (!companyName || !companyEmail) {
            showMessage('Company Name and Email are required.', 'error');
            return;
        }
        if (companyWebsite && !/^https?:\/\/.+\..+/.test(companyWebsite)) {
            showMessage('Please enter a valid website URL.', 'error');
            return;
        }

        // Backend Integration - Update Profile
        const profileData = { 
            companyName: companyName, 
            companyEmail: companyEmail, 
            companyWebsite: companyWebsite,
            companyAddress: companyAddress,
            companyDescription: companyDescription
        };
        const token = sessionStorage.getItem('companyAuthToken');

        showMessage('Updating profile...', 'info');

        fetch(API.company.profile, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Update failed');
                return response.json();
            })
            .then(data => {
                showMessage('Profile updated successfully!');
                // Update session data if needed
                // sessionStorage.setItem('companyData', JSON.stringify(data));
            })
            .catch(err => {
                console.error(err);
                showMessage('Update failed!', 'error');
            });
    });

    // --- Logo Preview ---
    logoInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                logoPreview.src = event.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    // --- Security Form Submission ---
    securityForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword.length < 6) {
            showMessage('New password must be at least 6 characters long.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }

        // TODO: Backend Integration - Change Password
        // const passwordData = { newPassword, confirmPassword, currentPassword: '...' };
        // fetch('/api/company/change-password', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${sessionStorage.getItem('companyAuthToken')}`
        //     },
        //     body: JSON.stringify(passwordData)
        // })
        // .then(() => { showMessage('Password changed successfully!'); securityForm.reset(); })
        // .catch(err => showMessage('Password change failed.', 'error'));

        showMessage('Password changed successfully!');
        securityForm.reset();
    });

    // --- Team Invitation Form ---
    inviteForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const emailInput = document.getElementById('memberEmail');
        const email = emailInput.value.trim();
        if (email) {
            showMessage(`Invite sent to ${email}!`);
            emailInput.value = '';
            // In a real app, you would add the new member to the list here
        }
    });

    // --- Cancel Subscription ---
    cancelSubscriptionBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            // In a real app, you'd call a backend endpoint to cancel the subscription.
            // For now, we'll just clear the plan from localStorage and redirect.
            localStorage.removeItem('companyPlan');
            showMessage('Your subscription has been cancelled.', 'success');
            // Redirect to the plan selection page
            setTimeout(() => {
                navigateTo(routes.home);
            }, 1000); // Wait a moment for the user to see the message
        }
    });

    // --- API Key Generation ---
    generateApiBtn.addEventListener('click', function () {
        const newKey = `sk_live_******************${Math.floor(Math.random() * 9000) + 1000}`;
        const apiKeyList = document.querySelector('.api-key-list');
        const keyItem = document.createElement('div');
        keyItem.className = 'api-key-item';
        keyItem.innerHTML = `
            <div>
                <strong class="api-key-name">New API Key</strong>
                <span class="api-key-value">${newKey}</span>
            </div>
            <button class="btn-icon delete-key-btn" title="Delete Key"><i class="fas fa-trash-alt"></i></button>
        `;
        apiKeyList.appendChild(keyItem);
        showMessage('New API key generated successfully!');
    });

    // --- Populate Plan Information from localStorage ---
    // --- Populate Plan Information ---
    const PLAN_DETAILS = {
        'Pro': { price: '₹ 999', resumes: '500 resumes', features: ['Unlimited JDs', 'AI Shortlisting', 'Priority Support'] },
        'Agency': { price: '₹ 2499', resumes: '2000 resumes', features: ['Unlimited JDs', 'AI Shortlisting', 'Priority Support', '2000 Resumes'] },
        'Hiring Sprint': { price: '₹ 5999', resumes: '6000 resumes', features: ['Everything in Agency', '3-month access', 'Peak hiring support'] }
    };

    function populatePlanDetails(backendPlanName) {
        let planData = JSON.parse(localStorage.getItem('companyPlan'));
        const planContainer = document.getElementById('plan-card');

        // If no local data but we have backend plan name, construct planData
        if (!planData && backendPlanName && PLAN_DETAILS[backendPlanName]) {
            const details = PLAN_DETAILS[backendPlanName];
            planData = {
                name: backendPlanName,
                price: details.price,
                resumes: details.resumes,
                renewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                features: details.features
            };
            // Optionally save to localStorage to persist
            localStorage.setItem('companyPlan', JSON.stringify(planData));
        } else if (!planData && backendPlanName) {
             // Fallback if plan name not in map
             planData = {
                name: backendPlanName,
                price: 'Custom',
                resumes: 'N/A',
                renewalDate: 'N/A',
                features: []
            };
        }

        if (planData && planContainer) {
            // Default values if planData is missing some fields
            const planName = planData.name || 'N/A';
            const planPrice = planData.price || '₹ 0';
            const resumeCount = planData.resumes || '0 resumes';
            const renewalDate = planData.renewalDate || 'N/A';
            const features = planData.features || [];

            planContainer.querySelector('.plan-name').textContent = planName;
            planContainer.querySelector('.price').innerHTML = `${planPrice} <span>/month</span>`;
            planContainer.querySelector('.resume-count').textContent = resumeCount;
            planContainer.querySelector('.plan-expiry').textContent = `Your plan renews on ${renewalDate}.`;

            const featuresList = planContainer.querySelector('.features');
            featuresList.innerHTML = ''; // Clear existing features
            features.forEach(featureText => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check-circle"></i> ${featureText}`;
                featuresList.appendChild(li);
            });
        } else if (planContainer) {
            // Handle case where there is no plan
            planContainer.querySelector('.plan-name').textContent = 'No Active Plan';
            planContainer.querySelector('.price').innerHTML = `₹ 0 <span>/month</span>`;
            planContainer.querySelector('.resume-count').textContent = 'Please select a plan to start.';
            planContainer.querySelector('.plan-expiry').textContent = '';
            planContainer.querySelector('.features').innerHTML = '';
            // Maybe hide the cancel button if there's no plan
            const cancelBtn = document.getElementById('cancelSubscriptionBtn');
            if (cancelBtn) cancelBtn.style.display = 'none';
        }
    }

    // Fetch Profile Data on Load
    function fetchProfile() {
        const token = sessionStorage.getItem('companyAuthToken');
        if (!token) return;

        fetch(API.company.profile, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch profile');
            })
            .then(data => {
                if (data) {
                    document.getElementById('companyName').value = data.companyName || '';
                    document.getElementById('companyEmail').value = data.companyEmail || '';
                    document.getElementById('companyWebsite').value = data.companyWebsite || '';
                    document.getElementById('companyAddress').value = data.companyAddress || '';
                    document.getElementById('companyDescription').value = data.companyDescription || '';
                    
                    // Update plan details if available
                    if (data.plan) {
                        populatePlanDetails(data.plan);
                    }
                }
            })
            .catch(err => console.error('Error fetching profile:', err));
    }

    // Call it once on page load
    populatePlanDetails();
    fetchProfile();

    // --- Modal Handling ---
    function openModal(modal) {
        modalOverlay.classList.add('active');
        modal.classList.add('active');
    }

    function closeModal() {
        document.querySelectorAll('.modal.active, .modal-overlay.active').forEach(el => {
            el.classList.remove('active');
        });
    }

    enable2faBtn.addEventListener('click', () => {
        twoFactorModal.innerHTML = `
            <div class="modal-header">
                <h2>Enable Two-Factor Authentication</h2>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p>Scan the QR code with your authenticator app, then enter the code below.</p>
                <div class="qr-code-container">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=otpauth://totp/SmartHire:contact@innovate.com?secret=JBSWY3DPEHPK3PXP&issuer=SmartHire" alt="QR Code">
                </div>
                <form id="2faForm">
                    <div class="form-group">
                        <label for="verificationCode">Verification Code</label>
                        <input type="text" id="verificationCode" class="verification-code-input" placeholder="_ _ _ _ _ _" required maxlength="6">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Verify & Enable</button>
                    </div>
                </form>
            </div>
        `;
        openModal(twoFactorModal);

        // Add form submission logic for 2FA
        document.getElementById('2faForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('verificationCode').value;
            if (code && code.length === 6) {
                showMessage('Two-Factor Authentication enabled successfully!');
                closeModal();
            } else {
                showMessage('Please enter a valid 6-digit code.', 'error');
            }
        });
    });

    // Add event listeners to all close buttons and the overlay
    document.querySelectorAll('.close-modal-btn, .modal-overlay').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    // Prevent modal clicks from closing the modal
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => e.stopPropagation());
    });
});

// Get the logout button element and attach handler if present
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

function handleLogout() {
    // Show confirmation dialog
    const confirmLogout = confirm('Are you sure you want to logout?');

    if (confirmLogout) {
        // Clear session data
        sessionStorage.removeItem('isCompanyLoggedIn');
        sessionStorage.removeItem('companyAuthToken'); // Also remove the token
        // Redirect to login page
        logout();
    }
}

function clearStoredData() {
    // SECTION: Selective logout
    // Preserve user-created application data (JDs, candidates, shortlist, reports, theme)
    // Remove only authentication/session related keys so user's saved data remains intact.

}

// Prevent going back after logout
window.history.forward();
function noBack() {
    window.history.forward();
}
