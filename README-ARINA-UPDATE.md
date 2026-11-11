# FEZI AGENT v0.77 — Arina Visual Update

## Added
- New official Arina reference photo: `public/brand/arina.png` (pink clothing + pink cat-ear headphones).
- Full responsive all-in-one homepage: `GET /showcase` (website/app/image/video/AI coding/avatar).
- Default avatar gallery: Arina, Manika, Elara, Adrian.
- Live Avatar app `GET /avatar?model=arina` auto loads Arina as a starter photo.
- Original builder remains at `GET /`.
- Blue/white F logo and overall color theme retained.

## Installation
Unzip the project into the app directory, preserve your `.env` and `data` folder, set `APP_PASSWORD`, `SESSION_SECRET`, then run `node --env-file=.env server.js`. Open `/showcase`.

## Limitations
The showcase's speaking preview uses browser speech synthesis with simple animation, not GPU-based realistic lip sync. The original avatar studio's GPU worker still requires separate configuration.

## Reference photos
Arina is from the newly uploaded official picture. Manika and Elara are from the user-shared example photos. Adrian is from a previously generated design mockup and should be replaced with a dedicated portrait when available.
