# MEHA PUZZLE - Pi Network Integration

## Files Included
- `index.html`: Ancient Egyptian puzzle game with Pi SDK authentication & payments.
- `backend/package.json`: Node.js dependencies (`express`, `cors`, `dotenv`).
- `backend/.env.example`: Environment variables template.
- `backend/server.js`: Express backend endpoints for `/api/pi/verify-auth`, `/api/pi/approve`, and `/api/pi/complete`.

## Quick Setup
1. Deploy `index.html` to GitHub Pages (or your hosting URL) and configure it in the Pi Developer Portal.
2. Deploy `backend/` to a Node.js host with HTTPS and set `PI_API_KEY` in environment variables.
3. Set `PI_CONFIG.backendUrl` in `index.html` to your deployed backend URL.
