# SkySpotter — KidPlane Radar & Encyclopedia

A kid-friendly live airplane tracker, Yoto-inspired audio story player, and plane encyclopedia built for young aviation fans.

## Features

- **Live Local & World Sky Map + Practice Sky Mode**: Tracks real airplanes overhead locally via `adsb.lol` and switches automatically to global flights via OpenSky Network when you zoom out, plus `adsbdb.com` for route/origin/destination/aircraft details and an animated **Practice Sky** mode that works anytime even offline.
- **Yoto-Style Voice Guide & Settings**: Tap **"Hear Plane Story!"** on any plane (or **"Hear Audio Story!"** in Plane Guide) to hear a kid-friendly narration read aloud, with customizable voice, speed, and pitch saved in `localStorage`.
- **Kid-Friendly Comparisons**: Turns altitude and speed into relatable comparisons (Mount Everests, Eiffel Towers, school buses, cheetahs, and highway cars).
- **Plane Encyclopedia & Mini Pilot Quiz**: Learn about passenger jets, superjumbos, propeller planes, helicopters, cargo freighters, and firefighting/rescue planes with interactive quizzes.

## Running Locally (Mac + iPad on Home Wi-Fi)

```bash
npm install
npm run dev
```

Or build and run the standalone Node server:

```bash
npm run build
npm start
```

## Free Deployment: GitHub Pages + Cloudflare Worker

### 1. Deploy the Free Proxy Worker
1. Sign in to [Cloudflare Workers](https://workers.cloudflare.com/) (free tier).
2. Either deploy from your terminal:
   ```bash
   cd worker
   npx wrangler deploy
   ```
   Or create a new Worker in the Cloudflare dashboard and paste in [worker/cloudflare-worker.js](worker/cloudflare-worker.js).
3. Copy your Worker URL (e.g. `https://kidplane-api.yourname.workers.dev`).

### 2. Enable GitHub Pages Auto-Deploy
1. Push this repository to GitHub on the `main` branch.
2. In your GitHub repo, open **Settings → Secrets and variables → Actions → Variables** and add:
   - Name: `VITE_API_BASE`
   - Value: `https://kidplane-api.yourname.workers.dev` (your Worker URL, no trailing slash)
3. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Re-run or push to `main` — `.github/workflows/deploy.yml` builds `dist/` and publishes to `https://<your-username>.github.io/<repo-name>/`!
