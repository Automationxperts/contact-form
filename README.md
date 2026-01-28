# Git Connect

A secure, serverless contact form solution that uses the **GitHub GraphQL API** and **GitHub App Installations** as a backend database. This system allows users to submit inquiries directly into a repository's Discussions section without exposing past submissions to the public.

## 🚀 Features

* **Zero Database Cost:** Uses GitHub Discussions for data storage.
* **Write-Only Privacy:** Users can submit messages but cannot view others via the frontend.
* **Secure Authentication:** Powered by GitHub App Installation (RSA Private Key signing).
* **SPA Architecture:** Single-page navigation for Index, Details, and Contact views.
* **Bot-Powered:** Submissions are handled by a GitHub App, removing the need for users to grant broad account permissions.

---

## 🛠️ Project Structure

* `index.html`: The main UI entry point with SPA routing.
* `app.js`: Frontend logic for view management and API communication.
* `netlify/functions/github-submit.js`: The secure serverless bridge.
* `style.css`: Minimalist, professional styling for the project.

---

## ⚙️ Setup Instructions

### 1. GitHub App Configuration

1. Go to **Settings > Developer Settings > GitHub Apps > New GitHub App**.
2. **Permissions:** Set `Discussions` to **Read & Write**.
3. **Private Key:** Generate a Private Key and download the `.pem` file.
4. **Install App:** Install the app on the repository you wish to use as the backend.
5. **Enable Discussions:** Ensure the "Discussions" feature is enabled in that repository's settings.

### 2. Environment Variables

To keep your credentials secure, set the following variables in your hosting provider (e.g., Netlify, Vercel):

| Variable | Source |
| --- | --- |
| `GH_APP_ID` | GitHub App General Settings |
| `GH_PRIVATE_KEY` | Content of the downloaded `.pem` file |
| `GH_INSTALLATION_ID` | Found in the URL of your App Installation page |
| `GH_REPO_ID` | Repository Node ID (via GraphQL API) |
| `GH_CATEGORY_ID` | Discussion Category Node ID (via GraphQL API) |

### 3. Deployment

1. Upload the `index.html`, `app.js`, and `style.css` to your web root.
2. Place the `github-submit.js` in your functions folder.
3. Deploy to your preferred serverless-compatible host.

---

## 🔒 Security Strategy

This project implements a **"Blind Submission"** architecture:

* **Backend Isolation:** The frontend never communicates with GitHub directly; it only talks to the `/github-submit` endpoint.
* **No Read Access:** The serverless function contains no logic to query or list existing discussions.
* **DOM Purging:** Upon successful submission, the frontend clears the form and session state to prevent inspection of the submission transaction.

---

## ⚖️ License & Copyright

**© 2026 Automation Expert. All rights reserved.**

This software is provided as-is, and all rights regarding the specific architectural implementation and code provided in this repository are reserved by the author.

---
