/**
 * GitConnect Professional Engine
 * © 2026 Automation Expert. All rights reserved.
 */

// 1. Navigation Router
const router = {
    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        window.scrollTo(0, 0);
    }
};

// 2. Theme Manager
const themeManager = {
    set(mode) {
        const root = document.documentElement;
        if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', mode);
        }
        localStorage.setItem('preferred-theme', mode);
    },
    init() {
        const saved = localStorage.getItem('preferred-theme') || 'system';
        this.set(saved);
    }
};

// 3. Form Handling
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = 'Establishing Secure Connection...';

    const payload = {
        name: document.getElementById('user_name').value,
        email: document.getElementById('user_email').value,
        type: document.getElementById('inquiry_type').value,
        body: document.getElementById('user_message').value
    };

    try {
        const response = await fetch('/api/github-submit', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            document.getElementById('contact-form').classList.add('hidden');
            document.getElementById('success-view').classList.remove('hidden');
        } else {
            throw new Error('API Rejection');
        }
    } catch (err) {
        alert('Network Error. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Initialize
themeManager.init();