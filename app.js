/**
 * Project: GitConnect Enterprise Application Engine
 * Functionality: SPA Routing, Triple-State Theme, Secure Submission
 * © 2026 Automation Expert. All rights reserved.
 */

// 1. Enhanced SPA Routing Logic
const router = {
    navigate(viewId) {
        // Hide all views to prevent overlapping layouts
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.add('hidden'));

        // Display the requested view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // Update Navigation Highlighting
        this.updateNavLinks(viewId);

        // Reset the Contact UI state if navigating to contact page
        if (viewId === 'contact') {
            document.getElementById('contact-ui').classList.remove('hidden');
            document.getElementById('success-ui').classList.add('hidden');
            document.getElementById('contact-form').reset();
        }

        // Re-trigger Lucide icons for any dynamic elements
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Smooth scroll to top for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateNavLinks(activeId) {
        document.querySelectorAll('.nav-links button').forEach(btn => {
            btn.classList.remove('active-page');
            
            // Checks if the button's ID matches the pattern 'nav-[viewId]'
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
        let iconName = 'monitor'; // Default for 'system'

        if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', isDark ? 'dark' : 'light');
            iconName = 'monitor';
        } else {
            root.setAttribute('data-theme', mode);
            iconName = mode === 'dark' ? 'moon' : 'sun';
        }

        localStorage.setItem('theme', mode);
        
        // Update the theme toggle icon dynamically
        const themeIcon = document.querySelector('#theme-btn i');
        if (themeIcon && window.lucide) {
            themeIcon.setAttribute('data-lucide', iconName);
            window.lucide.createIcons();
        }
    }
};

// Listen for OS theme changes if the app is in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') {
        themeManager.apply('system');
    }
});

// 3. Secure Form Submission with UI Feedback
const formElement = document.getElementById('contact-form');
if (formElement) {
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerText;
        
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
            const response = await fetch('/.netlify/functions/github-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // SUCCESS: Transition the UI containers
                document.getElementById('contact-ui').classList.add('hidden');
                document.getElementById('success-ui').classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Submission rejected by server');
            }

        } catch (error) {
            console.error('Submission Error:', error);
            alert(`Oops! ${error.message}. Please check your connection or Netlify logs.`);
            
            // Reset button to allow retry
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });
}

// 4. Boot Application
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    
    // Check URL hash for direct deep-linking, otherwise default to 'home'
    const initialView = window.location.hash.replace('#', '') || 'home';
    router.navigate(initialView);
});