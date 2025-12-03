/**
 * Centralized routing module for the application.
 * Handles navigation paths and redirects.
 */

export const routes = {
    home: '/Index.html',
    company: {
        login: '/Company-module/Company-login.html',
        register: '/Company-module/Company-Register.html',
        dashboard: '/Company-module/dashboard.html',
        profile: '/Company-module/Company-Profile.html',
        jd: '/Company-module/jd.html',
        plans: '/Company-module/plans.html',
        shortlist: '/Company-module/shortlist.html',
        upload: '/Company-module/upload.html',
        candidate: '/Company-module/candidate.html'
    }
};

/**
 * Navigates to the specified path.
 * @param {string} path - The path to navigate to.
 */
export function navigateTo(path) {
    window.location.href = path;
}

/**
 * Redirects to the login page.
 */
export function logout() {
    sessionStorage.clear();
    navigateTo(routes.company.login);
}
