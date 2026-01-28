/**
 * Project: GitConnect Enterprise Application Engine
 * Functionality: SPA Routing, Triple-State Theme, Secure Submission
 * © 2026 Automation Expert. All rights reserved.
 */

// 1. Enhanced SPA Routing Logic
const router = {
    navigate(viewId) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.add('hidden'));

        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
        }

        this.updateNavLinks(viewId);

        if (viewId === 'contact') {
            const contactUI = document.getElementById('contact-ui');
            const successUI = document.getElementById('success-ui');
            const contactForm = document.getElementById('contact-form');
            
            if (contactUI) contactUI.classList.remove('hidden');
            if (successUI) successUI.classList.add('hidden');
            if (contactForm) contactForm.reset();
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.replaceState(null, null, `#${viewId}`);
    },

    updateNavLinks(activeId) {
        document.querySelectorAll('.nav-links button').forEach(btn => {
            btn.classList.remove('active-page');
            if (btn.id === `nav-${activeId}`) {
                btn.classList.add('active-page');
            }
        });
    }
};

// 2. Triple-State Theme Management (System/Light/Dark)
const themeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.apply(savedTheme);
    },

    toggle() {
        const current = localStorage.getItem('theme') || 'system';
        const sequence = ['system', 'light', 'dark'];
        const next = sequence[(sequence.indexOf(current) + 1) % 3];
        this.apply(next);
    },

    apply(mode) {
        const root = document.documentElement;
        let iconName = 'monitor'; 

        if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', isDark ? 'dark' : 'light');
            iconName = 'monitor';
        } else {
            root.setAttribute('data-theme', mode);
            iconName = mode === 'dark' ? 'moon' : 'sun';
        }

        localStorage.setItem('theme', mode);
        
        const themeIcon = document.querySelector('#theme-btn i');
        if (themeIcon && window.lucide) {
            themeIcon.setAttribute('data-lucide', iconName);
            window.lucide.createIcons();
        }
    }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') {
        themeManager.apply('system');
    }
});

// 3. Secure Form Submission with UI Feedback
const setupForm = () => {
    const formElement = document.getElementById('contact-form');
    if (!formElement) return;

    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerText;
        
        // 1. Determine Endpoint based on Hostname
        // const isNetlify = window.location.hostname.includes('netlify.app');
        // const endpoint = isNetlify 
        //     ? '/.netlify/functions/github-submit' 
        //     : '/api/github-submit';

        // Unified Endpoint: Works on both Vercel (Native) and Netlify (via Redirect)
        const endpoint = '/api/github-submit';

        // Enter Loading State
        submitBtn.disabled = true;
        submitBtn.innerText = 'Transmitting...';

        const payload = {
            name: document.getElementById('user_name').value,
            email: document.getElementById('user_email').value,
            type: document.getElementById('inquiry_type').value,
            body: document.getElementById('user_message').value
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                document.getElementById('contact-ui').classList.add('hidden');
                document.getElementById('success-ui').classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Submission rejected by server');
            }

        } catch (error) {
            console.error('Submission Error:', error);
            alert(`Notice: ${error.message}`);
            
            // Re-enable button on error
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });
};

// 4. Boot Application
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    setupForm();
    
    const hash = window.location.hash.replace('#', '');
    const validViews = ['home', 'features', 'contact'];
    const initialView = validViews.includes(hash) ? hash : 'home';
    
    router.navigate(initialView);
});