/**
 * GitConnect Navigation & Form Logic
 * © 2026 Automation Expert. All rights reserved.
 */

const router = {
    navigate(viewId) {
        // Reset all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        
        // Show selected view
        const targetView = document.getElementById(`view-${viewId}`);
        targetView.classList.remove('hidden');

        // Reset the contact form state if navigating back to contact
        if (viewId === 'contact') {
            document.getElementById('contact-form').classList.remove('hidden');
            document.getElementById('success-view').classList.add('hidden');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Form Submission Logic
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const form = document.getElementById('contact-form');
    const successView = document.getElementById('success-view');

    btn.disabled = true;
    btn.textContent = 'Sending...';

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
            // THE FIX: Hide the form and show the success card
            form.classList.add('hidden');
            successView.classList.remove('hidden');
        } else {
            throw new Error('Server Error');
        }
    } catch (err) {
        alert('Submission failed. Please check your connection.');
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
});

// Initialize Theme
themeManager.init();