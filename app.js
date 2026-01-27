/**
 * Project: GitConnect Application Engine
 * Functionality: SPA Routing, Theme Management, Secure Submission
 * © 2026 Automation Expert. All rights reserved.
 */

// 1. Single Page Routing Logic
const router = {
    navigate(viewId) {
        // Hide all views first to prevent layout overlap
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.add('hidden');
        });

        // Show the requested view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // Reset the Contact UI state if navigating to contact page
        if (viewId === 'contact') {
            document.getElementById('contact-ui').classList.remove('hidden');
            document.getElementById('success-ui').classList.add('hidden');
            document.getElementById('contact-form').reset();
        }

        // Re-trigger Lucide icons for any newly visible elements
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// 2. Advanced Theme Management
const themeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.apply(savedTheme);
    },
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
    },
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update the theme icon dynamically
        const icon = document.querySelector('#theme-btn i');
        if (icon && window.lucide) {
            const iconName = theme === 'dark' ? 'sun' : 'moon';
            icon.setAttribute('data-lucide', iconName);
            window.lucide.createIcons();
        }
    }
};

// 3. Secure Form Submission
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // UI Feedback: Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Processing...</span>';

    const payload = {
        name: document.getElementById('user_name').value,
        email: document.getElementById('user_email').value,
        type: document.getElementById('inquiry_type').value,
        body: document.getElementById('user_message').value
    };

    try {
        // We use the absolute path for Netlify Functions to avoid routing issues
        const response = await fetch('/.netlify/functions/github-submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            // SUCCESS: Transition the UI
            document.getElementById('contact-ui').classList.add('hidden');
            document.getElementById('success-ui').classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        } else {
            throw new Error(result.error || 'Server responded with an error');
        }

    } catch (error) {
        console.error('Submission Error:', error);
        alert(`Error: ${error.message}. Please check Netlify logs.`);
        
        // Reset button on failure
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// 4. Initialize Application on Load
window.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    
    // Set initial view based on URL hash or default to home
    const hash = window.location.hash.replace('#', '');
    router.navigate(hash || 'home');
});