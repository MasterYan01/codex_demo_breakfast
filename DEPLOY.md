# La Miu Deployment Layout

## Folder split
- `docs/`: public site for GitHub Pages
- `backend/`: admin page + Python API for Render
- `archive/`: old root-level copies kept only for reference

## docs/
Deploy the contents of `docs/` to GitHub Pages.

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
- `docs/config.js`
  Set:
  `window.LA_MIU_CONFIG.apiBase = "https://your-render-service.onrender.com"`

## backend/
Deploy the contents of `backend/` to Render as a Python web service.

Main files:
- `admin.html`
- `app.py`
- `data/menu.json`
- `data/reservations.json`
- `data/waitlist.json`
- `data/takeout.json`
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
  - `NOTIFY_WEBHOOK_URL` (optional: webhook for new reservations/waitlist/takeout)
  - `RESERVATION_WEBHOOK_URL` (backward compatible with existing webhook config)
  - `LINE_NOTIFY_TOKEN` (optional: LINE Notify token)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO` (optional: email notifications)
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (optional: SMS for waitlist notify)
  - `WAITLIST_SMS_TEMPLATE` (optional: customize SMS message)
  - `PORT` is provided by Render automatically

## Admin access
Open the admin from the Render domain:
- `https://your-render-service.onrender.com/admin.html`

## Notes
- `backend/data/menu.json` is the editable data source.
- `backend/data/reservations.json` stores incoming reservation requests.
- `backend/data/waitlist.json` stores waitlist submissions.
- `backend/data/takeout.json` stores takeout orders.
- If you want edits to persist on Render, attach a Persistent Disk.
- `docs/` should stay public and read-only.
- `backend/` should be treated as the editable service side.
- Do not deploy files from `archive/`.
