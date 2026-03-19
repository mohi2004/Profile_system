# Profile System

A visually advanced, frontend-only profile management demo built for polished college-project presentations and recruiter-facing demos. The app is served as a lightweight static experience, while profile data persists locally in the browser through **IndexedDB**.

## What changed

- Rebuilt the experience around a premium landing page and modern dashboard flow.
- Removed the backend dependency for core profile data.
- Migrated persistence from file-based JSON storage to **browser-only IndexedDB**.
- Added stronger visual hierarchy, glassmorphism, layered gradients, smooth motion, hover depth, and better responsive behavior.

## Features

- Premium animated landing page with layered visual effects.
- Frontend-only profile creation, editing, inspection, searching, filtering, sorting, and deletion.
- Local browser persistence using IndexedDB.
- Demo profile seeding, reset flow, empty states, loading states, and success feedback.
- Theme toggle persisted with localStorage.
- Static hosting compatibility for Vercel deployment.

## Tech stack

- **Runtime / local hosting:** Node.js static server
- **Frontend:** HTML, CSS, vanilla JavaScript modules
- **Primary persistence:** IndexedDB
- **Small UI preference storage:** localStorage
- **Testing:** Node's built-in test runner

## Project structure

```text
.
├── public/
│   ├── js/
│   │   ├── demoProfiles.js    # Seeded browser demo data
│   │   ├── storage.js         # IndexedDB persistence layer
│   │   └── validation.js      # Sanitization, filtering, sorting, validation helpers
│   ├── app.js                 # Client app orchestration and UI state
│   ├── index.html             # Landing page + workspace UI
│   └── styles.css             # Premium design system and responsive styling
├── src/
│   ├── app.js                 # Static file server + SPA fallback
│   └── server.js              # Local entrypoint
├── tests/
│   └── profile-system.test.js
└── README.md
```

## Getting started

### 1. Install dependencies

No third-party packages are required.

### 2. Start the application

```bash
npm start
```

Open `http://localhost:3000`.

### 3. Run tests

```bash
npm test
```

## Persistence model

This project is intentionally **frontend-only**:

- Profile records are stored in the user's browser via IndexedDB.
- Data is not shared across devices or browsers.
- Deploying to Vercel does not require a database.
- No server-side file writes, cloud persistence, or backend APIs are used for core data.

## Deployment notes

The app is compatible with Vercel-style static hosting patterns because:

- the Node server only serves static assets locally,
- the UI hydrates itself from IndexedDB in the browser,
- and unknown routes fall back to `index.html`.

## Demo behavior

- If no local profiles exist, the app seeds demo profiles into IndexedDB.
- Users can clear local data or reload the demo dataset from the UI.
- If browser data becomes unreadable, the app attempts to recover by resetting and reseeding the local IndexedDB database.
