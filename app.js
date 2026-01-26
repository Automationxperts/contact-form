/**
 * Project: GitHub Contact Backend
 * Author: Automation Expert
 * © 2026 All rights reserved.
 */

const router = {
    // Basic SPA routing logic
    navigate: function(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        // Reset form if navigating back to contact
        if (viewId === 'contact') {
            document.getElementById('form-container').classList.remove('hidden');
            document.getElementById('success-view').classList.add('hidden');
            document.getElementById('contact-form').reset();
        }
    }
};

document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    // UI Feedback
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Auth & Sending...";

    try {
        /**
         * We call your serverless function (e.g., Netlify/Vercel)
         * This function handles the GitHub App JWT and Installation Token
         */
        const response = await fetch('/.netlify/functions/github-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: subject,
                body: message
            })
        });

        if (response.ok) {
            // BLIND UI: Completely hide the form and show success
            document.getElementById('form-container').classList.add('hidden');
            document.getElementById('success-view').classList.remove('hidden');
        } else {
            throw new Error('Submission failed');
        }

    } catch (error) {
        alert("There was an error connecting to the GitHub API. Please try again.");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit via GitHub";
    }
});

// Initialize to Index page
window.onload = () => router.navigate('index');