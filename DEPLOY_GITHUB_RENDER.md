# IFIX Deployment Guide (GitHub + Render)

## 1) Local verification

From project root:

```bash
cd backend
npm install
node database/init.js
npm start
```

Open in browser:

- http://localhost:5000/
- http://localhost:5000/admin
- http://localhost:5000/api/health

## 2) Push to GitHub

From project root:

```bash
git init
git add .
git commit -m "Prepare IFIX for Render deployment"
```

Create repo on GitHub, then run:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## 3) Deploy to Render

Option A (recommended):

1. Render Dashboard -> New -> Blueprint
2. Select your GitHub repo
3. Render detects `render.yaml`
4. Create service

Option B (manual web service):

- Environment: Node
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `node server.js`

## 4) Set required environment variables in Render

Minimum required:

- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-service>.onrender.com`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

For Google Sheets contact sync:

- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_SHEETS_RANGE=Contacts!A:H`

For blog image persistence on Render:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER=ifix/blogs`

Optional integrations:

- `YOUTUBE_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## 5) Initialize database in production

Run SQL from `backend/database/init.js` logic by connecting your production MySQL and creating the same tables.

If you have direct shell access to the Render service and DB is reachable from it:

```bash
cd backend
node database/init.js
```

## 6) Smoke test after deploy

- `https://<your-service>.onrender.com/`
- `https://<your-service>.onrender.com/shop`
- `https://<your-service>.onrender.com/blog`
- `https://<your-service>.onrender.com/contact`
- `https://<your-service>.onrender.com/admin`
- `https://<your-service>.onrender.com/api/health`

Test required workflows:

1. Submit contact form and verify row in DB + Google Sheet.
2. Login to admin and create/publish a blog.
3. Confirm published blog appears on blog page.
4. Upload blog image and confirm persistent URL (Cloudinary storage).

## Important note about database hosting

Render web services cannot use your local MySQL (`localhost`).
Use a cloud MySQL provider and set its credentials in Render environment variables.
