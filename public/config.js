/**
 * GitConnect — site configuration.
 *
 * This is the only file most people need to edit. It contains no secrets:
 * everything here is public by design and shipped to the browser.
 * Server credentials live in environment variables (see .env.example).
 */
window.GITCONNECT_CONFIG = {
  /* ------------------------------------------------------------------ */
  /* Branding                                                            */
  /* ------------------------------------------------------------------ */
  brand: {
    name: 'GitConnect',
    tagline: 'The Future of Static Forms.',
    description:
      'A secure, serverless bridge between your frontend and GitHub Discussions. No database, no overhead, total privacy.',
    // Shown in the footer. Set to your name or organisation.
    owner: 'GitConnect Contributors',
    repoUrl: 'https://github.com/Automationxperts/contact-form',
  },

  /* ------------------------------------------------------------------ */
  /* Backend                                                             */
  /* ------------------------------------------------------------------ */
  // Same-origin by default. Point this at an absolute URL if you host the
  // function separately from the site (remember to set ALLOWED_ORIGINS).
  endpoint: '/api/github-submit',

  /* ------------------------------------------------------------------ */
  /* Form categories                                                     */
  /* ------------------------------------------------------------------ */
  // Each `value` must match a key in the server's DISCUSSION_IDS map.
  categories: [
    { value: 'general', label: 'General Inquiry' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feedback', label: 'Feedback' },
  ],

  // Set to true to show an optional single-line subject field.
  showSubjectField: false,

  /* ------------------------------------------------------------------ */
  /* Spam protection (optional)                                          */
  /* ------------------------------------------------------------------ */
  // Cloudflare Turnstile site key. Leave empty to disable the widget.
  // When set, you must also set TURNSTILE_SECRET_KEY on the server.
  turnstileSiteKey: '',
};
