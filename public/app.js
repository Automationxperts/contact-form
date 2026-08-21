/**
 * GitConnect — frontend application.
 *
 * Reads everything brand- and form-specific from `window.GITCONNECT_CONFIG`
 * (see config.js) so this file rarely needs editing.
 */

const CONFIG = window.GITCONNECT_CONFIG || {};
const VIEWS = ['home', 'features', 'contact'];

/* -------------------------------------------------------------------------- */
/* 1. Branding                                                                */
/* -------------------------------------------------------------------------- */

const branding = {
  apply() {
    const brand = CONFIG.brand || {};
    const year = new Date().getFullYear();

    this.setText('[data-brand-name]', brand.name);
    this.setText('[data-brand-tagline]', brand.tagline);
    this.setText('[data-brand-description]', brand.description);
    this.setText('[data-brand-copyright]', brand.owner ? `© ${year} ${brand.owner}` : '');

    if (brand.name) document.title = `${brand.name} | Secure GitHub-Backed Forms`;

    document.querySelectorAll('[data-brand-repo]').forEach((el) => {
      if (brand.repoUrl) el.setAttribute('href', brand.repoUrl);
      else el.remove();
    });
  },

  setText(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = value;
    });
  },
};

/* -------------------------------------------------------------------------- */
/* 2. SPA routing                                                             */
/* -------------------------------------------------------------------------- */

const router = {
  navigate(viewId) {
    const target = document.getElementById(`view-${viewId}`);
    if (!target) return;

    document.querySelectorAll('.view').forEach((view) => view.classList.add('hidden'));
    target.classList.remove('hidden');
    this.updateNavLinks(viewId);

    if (viewId === 'contact') contactForm.reset();

    window.lucide?.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', `#${viewId}`);
  },

  updateNavLinks(activeId) {
    document.querySelectorAll('.nav-links button').forEach((btn) => {
      const isActive = btn.id === `nav-${activeId}`;
      btn.classList.toggle('active-page', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  },
};

/* -------------------------------------------------------------------------- */
/* 3. Theme (system / light / dark)                                           */
/* -------------------------------------------------------------------------- */

const themeManager = {
  sequence: ['system', 'light', 'dark'],

  init() {
    this.apply(localStorage.getItem('theme') || 'system');
  },

  toggle() {
    const current = localStorage.getItem('theme') || 'system';
    const next = this.sequence[(this.sequence.indexOf(current) + 1) % this.sequence.length];
    this.apply(next);
  },

  apply(mode) {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    root.setAttribute('data-theme', mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode);
    localStorage.setItem('theme', mode);

    const icon = document.querySelector('#theme-btn i');
    if (icon) {
      icon.setAttribute('data-lucide', { system: 'monitor', dark: 'moon', light: 'sun' }[mode]);
      window.lucide?.createIcons();
    }

    document.getElementById('theme-btn')?.setAttribute('aria-label', `Theme: ${mode}. Activate to change.`);
  },
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('theme') || 'system') === 'system') themeManager.apply('system');
});

/* -------------------------------------------------------------------------- */
/* 4. Contact form                                                            */
/* -------------------------------------------------------------------------- */

const contactForm = {
  formEl: null,
  startedAt: Date.now(),

  init() {
    this.formEl = document.getElementById('contact-form');
    if (!this.formEl) return;

    this.renderCategories();
    if (CONFIG.showSubjectField) document.getElementById('subject-field')?.classList.remove('hidden');
    this.renderTurnstile();

    this.formEl.addEventListener('submit', (event) => this.onSubmit(event));
    this.formEl.addEventListener('input', () => this.clearError());
  },

  renderCategories() {
    const select = document.getElementById('inquiry_type');
    const categories = CONFIG.categories || [];
    if (!select || !categories.length) return;

    select.append(...categories.map(({ value, label }) => new Option(label, value)));
  },

  renderTurnstile() {
    const siteKey = CONFIG.turnstileSiteKey;
    const mount = document.getElementById('turnstile-widget');
    if (!siteKey || !mount) return;

    mount.dataset.sitekey = siteKey;
    mount.classList.add('cf-turnstile');
    mount.classList.remove('hidden');

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.append(script);
  },

  reset() {
    document.getElementById('contact-ui')?.classList.remove('hidden');
    document.getElementById('success-ui')?.classList.add('hidden');
    this.formEl?.reset();
    this.clearError();
    this.startedAt = Date.now();
  },

  showError(message) {
    const box = document.getElementById('form-error');
    if (!box) return;
    box.textContent = message;
    box.classList.remove('hidden');
  },

  clearError() {
    document.getElementById('form-error')?.classList.add('hidden');
  },

  setLoading(isLoading) {
    const btn = document.getElementById('submit-btn');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Sending…' : 'Send Message';
  },

  buildPayload() {
    const value = (id) => document.getElementById(id)?.value ?? '';
    return {
      name: value('user_name'),
      email: value('user_email'),
      type: value('inquiry_type'),
      subject: value('user_subject'),
      message: value('user_message'),
      // Honeypot: hidden from humans, filled in by naive bots.
      company: value('company'),
      elapsedMs: Date.now() - this.startedAt,
      turnstileToken: this.formEl?.querySelector('[name="cf-turnstile-response"]')?.value || '',
    };
  },

  async onSubmit(event) {
    event.preventDefault();
    this.clearError();
    this.setLoading(true);

    try {
      const response = await fetch(CONFIG.endpoint || '/api/github-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildPayload()),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Your message could not be sent. Please try again.');
      }

      document.getElementById('contact-ui')?.classList.add('hidden');
      document.getElementById('success-ui')?.classList.remove('hidden');
      window.lucide?.createIcons();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  },
};

/* -------------------------------------------------------------------------- */
/* 5. Boot                                                                    */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  branding.apply();
  themeManager.init();
  contactForm.init();

  document.querySelectorAll('[data-navigate]').forEach((el) => {
    el.addEventListener('click', () => router.navigate(el.dataset.navigate));
  });
  document.getElementById('theme-btn')?.addEventListener('click', () => themeManager.toggle());

  const hash = window.location.hash.replace('#', '');
  router.navigate(VIEWS.includes(hash) ? hash : 'home');
});
