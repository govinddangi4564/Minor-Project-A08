import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                companyLogin: resolve(__dirname, 'Company-module/Company-login.html'),
                companyRegister: resolve(__dirname, 'Company-module/Company-Register.html'),
                companyDashboard: resolve(__dirname, 'Company-module/dashboard.html'),
                companyProfile: resolve(__dirname, 'Company-module/Company-Profile.html'),
                companyJd: resolve(__dirname, 'Company-module/jd.html'),
                companyPlans: resolve(__dirname, 'Company-module/plans.html'),
                companyShortlist: resolve(__dirname, 'Company-module/shortlist.html'),
                companyUpload: resolve(__dirname, 'Company-module/upload.html'),
                companyCandidate: resolve(__dirname, 'Company-module/candidate.html'),
            },
        },
    },
    server: {
        open: '/index.html',
    },
});
