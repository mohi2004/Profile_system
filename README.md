# Profile System

A lightweight profile management system built with **Node.js** and a small vanilla frontend. It gives you a ready-to-run dashboard and REST API for creating, updating, searching, and deleting user or team profiles.

## Features

- Create, edit, and delete profiles from the browser UI.
- Search profiles by name, email, role, location, bio, or skills.
- Filter profiles by role.
- Persist data locally in `data/profiles.json`.
- Use the included REST API for integration with another app.
- Start with seeded example profiles for quick testing.

## Tech stack

- **Backend:** Node.js HTTP server
- **Frontend:** HTML, CSS, and vanilla JavaScript
- **Storage:** JSON file persistence
- **Testing:** Node's built-in test runner

## Project structure

```text
.
├── data/
│   └── profiles.json        # Local persistent profile data
├── public/
│   ├── app.js               # Frontend logic
│   ├── index.html           # Dashboard UI
│   └── styles.css           # Styling
├── src/
│   ├── app.js               # Server routing + API handlers
│   ├── profileStore.js      # File-based profile storage
│   └── server.js            # App entrypoint
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

The app runs on `http://localhost:3000` by default.

### 3. Run tests

```bash
npm test
```

## Available scripts

- `npm start` – start the production server
- `npm run dev` – start the server in watch mode
- `npm test` – run the API test suite

## REST API

### `GET /api/profiles`
Returns all profiles.

**Query params**
- `q`: free-text search across profile fields
- `role`: role filter

### `GET /api/profiles/:id`
Returns a single profile.

### `POST /api/profiles`
Creates a profile.

**Request body**

```json
{
  "fullName": "Taylor Brooks",
  "email": "taylor@example.com",
  "role": "QA Engineer",
  "location": "Denver, CO",
  "avatar": "https://example.com/avatar.png",
  "skills": "Testing, Playwright, CI",
  "bio": "Owns release quality and automated coverage across the platform."
}
```

### `PUT /api/profiles/:id`
Updates an existing profile.

### `DELETE /api/profiles/:id`
Deletes a profile.

## Validation rules

A profile must include:

- `fullName` with at least 2 characters
- a valid `email`
- `role` with at least 2 characters
- `bio` with at least 10 characters

## Customization ideas

- Swap the JSON store for SQLite or PostgreSQL.
- Add authentication before exposing edit/delete actions.
- Add profile image uploads instead of URL-based avatars.
- Extend the model with social links, teams, or permissions.

## Notes

- The seeded profiles live in `data/profiles.json`.
- If you delete the data file, it is recreated automatically with demo profiles.
- The frontend falls back to generated avatars when no avatar URL is provided.
