// const ROUTES = {
//     home: '/index.html',
//     user: {
//         dashboard: '/User-module/Registeration-Form.html',
//         profile: '/User-module/profile-section.html'
//     },
//     company: {
//         register: '/Company-module/Company-Register.html'
//     }
// };
import {BASE_FRONTEND_URL} from './config.js';


const ROUTES = {
    home: `${BASE_FRONTEND_URL}/Index.html`,
    user: {
        dashboard: `${BASE_FRONTEND_URL}/User-module/Registeration-Form.html`,
        profile: `${BASE_FRONTEND_URL}/User-module/profile-section.html`
    },
    company: {
        register: `${BASE_FRONTEND_URL}/Company-module/Company-Register.html`
    }
};

console.log('Defined ROUTES:', ROUTES);

export default ROUTES;
