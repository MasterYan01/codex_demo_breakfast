# La Miu Breakfast (Codex Demo)

A static, multi-page restaurant website for **La Miu** featuring a menu-driven UI, reservation experience enhancements, and a lightweight admin interface backed by a simple Python API.

## What’s Inside

- **Front-end (static)**: Pages served from the `docs/` folder for GitHub Pages hosting.
- **Menu API**: A minimal Python server in `backend/` that serves menu data from `backend/data/menu.json`.
- **Admin UI**: A lightweight editor (`backend/admin.html`) to update menu data.

## Key Features

- Dynamic menu rendering by category and item detail pages
- Global site search with recent items and fuzzy matching
- Reservation enhancements with availability indicators and calendar export
- Dietary filters (vegetarian, egg/dairy, nuts, gluten-free)
- “Today’s Picks” and “Popular Now” sections in the menu
- Quick preview modal on menu cards

## Project Structure

```
.
├─ docs/                  # Static front-end (GitHub Pages)
├─ backend/               # Python API + admin UI
│  ├─ app.py              # HTTP API server
│  └─ data/menu.json      # Menu content
├─ DEPLOY.md
└─ render.yaml
```

## Local Development

### 1) Start the API server

```bash
cd backend
python app.py
```

The API runs at `http://127.0.0.1:8020` by default.

### 2) Serve the front-end

Any static server works. Example:

```bash
cd docs
python -m http.server 5500
```

Open `http://127.0.0.1:5500` in your browser.

### 3) Configure API base URL (optional)

Front-end API target is defined in:

```
docs/config.js
```

Update `apiBase` if your backend runs elsewhere.

## Deployment Notes

- The `docs/` folder is ready for GitHub Pages.
- The API can be deployed with Render (see `render.yaml`).
- If the front-end is hosted on a different domain, ensure CORS allowlist includes it via:

```
ALLOWED_ORIGINS=https://<your-domain>
```

## Credits

This project is a Codex demo site for a restaurant brand experience. Images are pulled from public CDN sources used in the UI styling.
