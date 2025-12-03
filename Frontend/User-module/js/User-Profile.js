document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT SELECTION ---
    const profilePicture = document.getElementById('profilePicture');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const aboutMeInput = document.getElementById('aboutMe');
    const skillInput = document.getElementById('skillInput');
    const skillsSection = document.getElementById('skills');
    const linkedinInput = document.getElementById('linkedin');
    const githubInput = document.getElementById('github');
    const twitterInput = document.getElementById('twitter');
    const newsletterToggle = document.getElementById('newsletterToggle');
    const editButton = document.getElementById('editButton');
    const saveButton = document.getElementById('saveButton');
    const logoutButton = document.getElementById('logoutBtn');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const addExperienceButton = document.getElementById('addExperienceButton');
    const addEducationButton = document.getElementById('addEducationButton');
    const pictureUpload = document.getElementById('pictureUpload');
    const changePasswordButton = document.querySelector('.security-section .action-button');
    const deleteAccountButton = document.getElementById('deleteAccountButton');
    const logoutBtnSettings = document.getElementById('logoutBtnSettings');
    const activityToggle = document.getElementById('activityToggle');


    let currentUser = null;

    // --- 2. LOAD USER DATA ---
    function loadUserData() {
        const savedUser = sessionStorage.getItem('googleUser');

        if (savedUser) {
            currentUser = JSON.parse(savedUser);

            profilePicture.src = currentUser.picture || 'https://via.placeholder.com/120';
            userName.textContent = currentUser.name || 'User Name';
            userEmail.textContent = currentUser.email || 'user.email@example.com';
            if (fullNameInput) fullNameInput.value = currentUser.name || '';
            if (phoneInput) phoneInput.value = currentUser.phone || '';
            aboutMeInput.value = currentUser.aboutMe || '';
            linkedinInput.value = currentUser.socialMedia?.linkedin || '';
            githubInput.value = currentUser.socialMedia?.github || '';
            twitterInput.value = currentUser.socialMedia?.twitter || '';
            newsletterToggle.checked = currentUser.newsletter || false;
            activityToggle.checked = currentUser.notifications?.activity || false;


            renderSkills(currentUser.skills || []);
        } else {
            alert('You are not logged in. Redirecting to home page.');
            window.location.href = '../index.html';
        }
    }

    // --- 3. RENDER FUNCTIONS ---
    function renderSkills(skills) {
        skillsSection.innerHTML = '';
        skills.forEach(skill => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsSection.appendChild(skillTag);
        });
    }

    // --- 4. EVENT LISTENERS ---
    editButton.addEventListener('click', () => {
        const elementsToEnable = [fullNameInput, phoneInput, aboutMeInput, skillInput, linkedinInput, githubInput, twitterInput, addExperienceButton, addEducationButton].filter(Boolean);
        elementsToEnable.forEach(el => el.disabled = false);

        editButton.style.display = 'none';
        saveButton.style.display = 'inline-flex';

        if (fullNameInput) fullNameInput.focus();
    });

    saveButton.addEventListener('click', (e) => {
        e.preventDefault();

        if (fullNameInput) currentUser.name = fullNameInput.value.trim();
        if (phoneInput) currentUser.phone = phoneInput.value.trim();
        currentUser.aboutMe = aboutMeInput.value.trim();
        currentUser.socialMedia = {
            linkedin: linkedinInput.value.trim(),
            github: githubInput.value.trim(),
            twitter: twitterInput.value.trim(),
        };
        currentUser.newsletter = newsletterToggle.checked;
        if (!currentUser.notifications) {
            currentUser.notifications = {};
        }
        currentUser.notifications.activity = activityToggle.checked;


        sessionStorage.setItem('googleUser', JSON.stringify(currentUser));

        const elementsToDisable = [fullNameInput, phoneInput, aboutMeInput, skillInput, linkedinInput, githubInput, twitterInput, addExperienceButton, addEducationButton].filter(Boolean);
        elementsToDisable.forEach(el => el.disabled = true);

        saveButton.style.display = 'none';
        editButton.style.display = 'inline-flex';

        if (fullNameInput) userName.textContent = currentUser.name;

        alert('Profile updated successfully!');
    });

    skillInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && skillInput.value.trim() !== '') {
            const newSkill = skillInput.value.trim();
            if (!currentUser.skills) {
                currentUser.skills = [];
            }
            currentUser.skills.push(newSkill);
            renderSkills(currentUser.skills);
            skillInput.value = '';
        }
    });

    // Reusable logout function so multiple buttons can use same behavior
    function performLogout({ confirmBefore = true } = {}) {
        if (confirmBefore && !confirm('Are you sure you want to logout?')) return;

        try {
            const keys = ['googleUser', 'user', 'authToken'];
            keys.forEach(k => {
                sessionStorage.removeItem(k);
                localStorage.removeItem(k);
            });
            // Best-effort cleanup
            sessionStorage.clear();
        } catch (err) {
            console.warn('Logout storage cleanup failed', err);
        }

        // Redirect to home/login
        window.location.href = '../index.html';
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => performLogout({ confirmBefore: true }));
    }

    if (logoutBtnSettings) {
        logoutBtnSettings.addEventListener('click', () => performLogout({ confirmBefore: true }));
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tab = link.dataset.tab;

            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
        });
    });

    if (addExperienceButton) {
        addExperienceButton.addEventListener('click', () => {
            // Placeholder for adding experience
            alert('Add Experience functionality is not implemented yet.');
        });
    }

    if (addEducationButton) {
        addEducationButton.addEventListener('click', () => {
            // Placeholder for adding education
            alert('Add Education functionality is not implemented yet.');
        });
    }

    pictureUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicture.src = e.target.result;
                currentUser.picture = e.target.result;
                sessionStorage.setItem('googleUser', JSON.stringify(currentUser));
            };
            reader.readAsDataURL(file);
        }
    });

    changePasswordButton.addEventListener('click', () => {
        const newPassword = prompt('Enter your new password:');
        if (newPassword) {
            alert('Password changed successfully (demo)!');
        }
    });

    deleteAccountButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action is irreversible.')) {
            sessionStorage.removeItem('googleUser');
            alert('Account deleted successfully (demo)!');
            window.location.href = '../index.html';
        }
    });


    // --- 5. INITIALIZATION ---
    loadUserData();
});