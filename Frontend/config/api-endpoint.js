import CONFIG from './config.js';

const API = {
    auth: {
        login: `${CONFIG.BASE_API_URL}/api/auth/company/login`,
        logout: `${CONFIG.BASE_API_URL}/api/auth/logout`
    },
    company: {
        register: `${CONFIG.BASE_API_URL}/api/companies/register`,
        profile: `${CONFIG.BASE_API_URL}/api/company/profile`,
        dashboard: {
            stats: `${CONFIG.BASE_API_URL}/api/company/dashboard/stats`,
            skills: `${CONFIG.BASE_API_URL}/api/company/dashboard/skills-distribution`,
            trends: `${CONFIG.BASE_API_URL}/api/company/dashboard/match-trends`,
            benchmarks: `${CONFIG.BASE_API_URL}/api/company/dashboard/benchmarks`,
            reportSummary: `${CONFIG.BASE_API_URL}/api/company/dashboard/reports/summary`,
            exportPDF: `${CONFIG.BASE_API_URL}/api/company/dashboard/reports/export-pdf`,
            reportHistory: `${CONFIG.BASE_API_URL}/api/company/dashboard/reports/history`
        },
        jds: {
            getAll: `${CONFIG.BASE_API_URL}/api/jds/`,
            create: `${CONFIG.BASE_API_URL}/api/jds/`,
            update: (id) => `${CONFIG.BASE_API_URL}/api/jds/${id}`,
            delete: (id) => `${CONFIG.BASE_API_URL}/api/jds/${id}`,
            get: (id) => `${CONFIG.BASE_API_URL}/api/jds/${id}`
        },
        resumes: {
            upload: `${CONFIG.BASE_API_URL}/api/resumes/parse`,
            download: (id) => `${CONFIG.BASE_API_URL}/api/resumes/${id}/download`,
            get: (id) => `${CONFIG.BASE_API_URL}/api/resumes/${id}`,
            delete: (id) => `${CONFIG.BASE_API_URL}/api/resumes/${id}`
        },
        candidates: {
            getAll: `${CONFIG.BASE_API_URL}/api/candidates/`,
            get: (id) => `${CONFIG.BASE_API_URL}/api/candidates/${id}`,
            update: (id) => `${CONFIG.BASE_API_URL}/api/candidates/${id}`,
            delete: (id) => `${CONFIG.BASE_API_URL}/api/candidates/${id}`
        },
        shortlist: {
            getAll: `${CONFIG.BASE_API_URL}/api/shortlist/`,
            add: `${CONFIG.BASE_API_URL}/api/shortlist/`,
            remove: (id) => `${CONFIG.BASE_API_URL}/api/shortlist/${id}`
        },
        matching: {
            run: `${CONFIG.BASE_API_URL}/api/matching/run`,
            matchCandidate: (id) => `${CONFIG.BASE_API_URL}/api/matching/candidate/${id}`
        },
        interviews: `${CONFIG.BASE_API_URL}/api/company/interviews/`
    },
    user: {
        register: `${CONFIG.BASE_API_URL}/api/user/register`,
        login: `${CONFIG.BASE_API_URL}/api/user/login`,
        googleLogin: `${CONFIG.BASE_API_URL}/api/user/google-login`
    },
    public: {
        parseResume: `${CONFIG.BASE_API_URL}/api/public/parse_resume`,
        analyze: `${CONFIG.BASE_API_URL}/api/public/analyze`,
        sendReport: `${CONFIG.BASE_API_URL}/api/public/send-report`
    }
};

export default API;
