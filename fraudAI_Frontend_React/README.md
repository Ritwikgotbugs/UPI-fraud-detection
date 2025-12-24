# SafePay AI — Frontend (React + Vite) 🔧

A small React app using Vite, Tailwind and Firebase for demo UPI fraud detection UI.

## Development

- Install dependencies:

  npm install

- Run the dev server:

  npm run dev

- Environment variable (optional):

  - `VITE_API_BASE` — Base URL for the model/backend API (default: `http://127.0.0.1:5000`). Example: `VITE_API_BASE=http://localhost:5000 npm run dev`

## Notes

- The frontend expects a prediction endpoint at `${VITE_API_BASE}/predict`.
- The app uses Firebase for authentication and demo data. Ensure Firebase rules allow reads/writes for testing or use an emulator for local development.

**Note about Google Sign-in and browser policies:**
- Some browsers may block automatic popup closing due to Cross-Origin-Opener-Policy (COOP) / Cross-Origin-Embedder-Policy (COEP) settings. If that happens, the popup might not close automatically. The app will now detect popup-blocking and offer a **redirect** sign-in fallback which works reliably under COOP/COEP.

## Improvements made

- Safe handling of missing transaction fields and createdAt values.
- Added `success` and `warning` variants for badges.
- Predict form now uses `VITE_API_BASE`, shows loading and error states.
- Added `NotFound` route and `/signin` route.
- Added sign-in redirect fallback to handle COOP/COEP popup blocking.

## Troubleshooting: OAuth redirect not returning

If the app doesn't return to the site after Google sign-in (redirect flow), try the following:

- Make sure the app's origin (for dev usually `http://localhost:5173`) is listed in **Firebase Console → Authentication → Authorized domains**.
- Check browser console and network tab for OAuth errors such as `redirect_uri_mismatch` or blocking messages.
- Ensure any reverse proxy or hosting sets the `Cross-Origin-Opener-Policy` header to `same-origin-allow-popups` if you expect popups to be allowed (see `vite.config.js` plugin for dev).
- The app now tries a popup first and automatically falls back to redirect when popups are blocked; use the **Sign in with Redirect** button if prompted.

If you still see issues, send me the browser console logs from an attempted redirect sign-in and I will inspect further.


