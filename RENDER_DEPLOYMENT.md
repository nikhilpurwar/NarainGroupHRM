# Render Deployment Guide

## Problem Fixed
- ✅ **Mobile reload 404 issue**: Fixed SPA routing fallback in server
- ✅ **Backend not reachable on mobile**: Frontend now uses relative URLs (`/api`) when running on Render
- ✅ **Missing `.env` configuration**: Added env files for both client and server

---

## How It Works on Render

### Frontend (React + Vite)
- **Build**: Vite builds to `client/dist` during Render build step
- **Environment**: `VITE_API_URL=/api` (production) → all API calls go to same domain
- **Routing**: React Router handles client-side navigation; server serves `index.html` for all non-API routes

### Backend (Express)
- **Static Files**: Serves `client/dist` as static content
- **API Routes**: `/api/*` endpoints handled by Express routes
- **SPA Fallback**: Non-API requests → serve `index.html` (lets React Router take over)
- **CORS**: Production-safe CORS configuration

---

## Steps to Deploy on Render

### 1️⃣ On Render Dashboard - Create Service

**From Git Repository**
```
Repository: Your GitHub repo
Branch: main (or your branch)
Runtime: Node
Build Command: cd client && npm ci && npm run build && cd ../server && npm ci
Start Command: cd server && npm start
```

### 2️⃣ Set Environment Variables

In Render dashboard **Environment** tab, add:

```
NODE_ENV=production
PORT=5100
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/iudo_hrm?retryWrites=true&w=majority
JWT_SECRET=your-very-secure-random-string-here
CORS_ORIGINS=https://naraingrouphrm-o8al.onrender.com
```

⚠️ **Important**: Replace with your actual MongoDB connection string and use a strong JWT_SECRET

### 3️⃣ Update `server/index.js` (if needed)

Ensure it starts the app correctly:

```javascript
import app from "./app.js";
import { connectDB } from "./src/config/db.js";

const PORT = process.env.PORT || 5100;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Database connection failed:", err);
  process.exit(1);
});
```

### 4️⃣ Verify `server/package.json` has start script

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

---

## Local Testing (Before Pushing)

### Build and Test Locally

```bash
# Build client
cd client
npm run build

# Start server in production mode
cd ../server
NODE_ENV=production npm start
```

Then open `http://localhost:5100` on your PC and test:
- ✅ Load the app
- ✅ Login
- ✅ Click around, reload pages (should NOT show 404)
- ✅ Check browser console (should NOT have API errors)

### Test on Mobile (Same Network)

1. Find your PC's IP: `ipconfig` → look for IPv4 address (e.g., `192.168.x.x`)
2. On mobile, open: `http://192.168.x.x:5100`
3. Test same flows — should work without 404s

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Render shows 404 on reload** | Ensure `NODE_ENV=production` is set; check build succeeds |
| **API calls fail (CORS error)** | Set `CORS_ORIGINS` to your Render domain; restart service |
| **Mobile can't connect** | Use `/api` (relative) not full URL; ensure both on same domain |
| **Static files missing** | Run `npm run build` in `client/` before deploying |
| **Database won't connect** | Check `MONGO_URL` is valid and Render IP is whitelisted in MongoDB Atlas |

---

## Quick Checklist

- [ ] `server/.env.example` → copy to `server/.env` locally and fill in values
- [ ] `client/.env` has `VITE_API_URL=http://localhost:5100` (dev)
- [ ] `client/.env.production` exists with `VITE_API_URL=/api`
- [ ] `npm run build` in `client/` creates `client/dist`
- [ ] Server starts with `NODE_ENV=production npm start`
- [ ] Local test: reload page on `http://localhost:5100` → no 404
- [ ] Mobile test: use PC IP like `http://192.168.x.x:5100` → no 404
- [ ] Render env vars set (NODE_ENV, MONGO_URL, JWT_SECRET, CORS_ORIGINS)
- [ ] Render build/start commands correct
- [ ] Push to GitHub and trigger Render build

---

## Summary

Your app now works on:
- ✅ **PC localhost**: `http://localhost:5100`
- ✅ **Mobile on same network**: `http://192.168.x.x:5100` (after local test)
- ✅ **Render (production)**: `https://naraingrouphrm-o8al.onrender.com` (after env setup and rebuild)

The SPA routing is fixed — reload on any page will work! 🎉
