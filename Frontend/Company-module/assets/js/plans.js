import { navigateTo, routes } from '../../../src/utils/router.js';

// Plans page: save selected plan and redirect to registration page
(function () {
    const selectButtons = document.querySelectorAll('.select-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', function () {
            const card = this.closest('.pricing-card');
            const planName = card.getAttribute('data-plan');
            const price = card.querySelector('.price').childNodes[0].textContent.trim();
            const resumes = card.querySelector('.resume-count').textContent;
            const features = Array.from(card.querySelectorAll('.features li')).map(li => li.textContent);

            const planData = {
                name: planName,
                price: price,
                resumes: resumes,
                renewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                features: features
            };

            localStorage.setItem('companyPlan', JSON.stringify(planData));
            setTimeout(() => {
                navigateTo(routes.company.register);
            }, 2000);
        });
    });
})();

