# La Miu GitHub Pages + Render Deployment

## Recommended split
- Public frontend on GitHub Pages:
  `index.html`, `menu.html`, `breakfast.html`, `coffee.html`, `dessert.html`, `item.html`, `styles.css`, `script.js`, `config.js`, static assets.
- Admin + API on Render:
  `admin.html`, `app.py`, `data/menu.json`, and the same static assets used by the admin page.

Do not expose `admin.html` on GitHub Pages if you want the editing入口只留在後端主機。

## Frontend on GitHub Pages
1. Push the frontend files to a GitHub repository.
2. Enable GitHub Pages for the repository.
3. Edit `config.js` and set:
   `window.LA_MIU_CONFIG.apiBase = "https://your-render-service.onrender.com"`
4. Keep `.nojekyll` in the published root.

## Backend on Render
Render's official docs say web services must bind to `0.0.0.0` and to the `PORT` environment variable. Render also notes that local filesystem changes are ephemeral unless you attach a persistent disk.

1. Create a Python Web Service on Render.
2. Start command:
   `python app.py`
3. Environment variables:
   - `HOST=0.0.0.0`
   - `ALLOWED_ORIGINS=https://your-user.github.io`
   - `PORT` is provided by Render automatically.
4. If you want menu edits to persist across redeploys/restarts, attach a Render Persistent Disk and keep `data/menu.json` under that mounted path.

## Admin hosting
- Best practice for this repo: open the admin from the Render domain, for example:
  `https://your-render-service.onrender.com/admin.html`
- The admin page can then call the same-origin API without depending on GitHub Pages.

## Local run
- Local backend:
  `python app.py`
- Local frontend/admin default API:
  `http://127.0.0.1:8020`

## Notes
- If you need multiple frontend domains, set `ALLOWED_ORIGINS` as comma-separated values.
- Public frontend pages are read-only. Editing should happen from the Render-hosted admin page.
