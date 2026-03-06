# La Miu Deployment Layout

## Folder split
- `frontend/`: public site for GitHub Pages
- `backend/`: admin page + Python API for Render

## frontend/
Deploy the contents of `frontend/` to GitHub Pages.

Main files:
- `index.html`
- `menu.html`
- `breakfast.html`
- `coffee.html`
- `dessert.html`
- `item.html`
- `styles.css`
- `script.js`
- `config.js`
- `favicon.svg`
- `social-preview.svg`
- `site.webmanifest`
- `robots.txt`
- `.nojekyll`

Before deploying, edit:
- `frontend/config.js`
  Set:
  `window.LA_MIU_CONFIG.apiBase = "https://your-render-service.onrender.com"`

## backend/
Deploy the contents of `backend/` to Render as a Python web service.

Main files:
- `admin.html`
- `app.py`
- `data/menu.json`
- `styles.css`
- `script.js`
- `config.js`
- `favicon.svg`
- `site.webmanifest`

Recommended Render settings:
- Start command:
  `python app.py`
- Environment variables:
  - `HOST=0.0.0.0`
  - `ALLOWED_ORIGINS=https://your-user.github.io`
  - `PORT` is provided by Render automatically

## Admin access
Open the admin from the Render domain:
- `https://your-render-service.onrender.com/admin.html`

## Notes
- `backend/data/menu.json` is the editable data source.
- If you want edits to persist on Render, attach a Persistent Disk.
- `frontend/` should stay public and read-only.
- `backend/` should be treated as the editable service side.
