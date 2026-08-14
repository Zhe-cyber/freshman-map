# Freshman Map 新生包

CYCU · 中原大學

Helps new students at 中原大學 adapt in days instead of weeks.
Toilets (and whether they have paper), food you can actually order, and people to eat with.

## Run it

No build step, no `npm install`. It's ES modules + a CDN script tag.

```bash
python -m http.server 8099
```

Open <http://localhost:8099>. That's it.

> ES modules need a server — opening `index.html` with a double-click will fail on CORS.

## Who owns what

Pick your file. **Do not edit someone else's.**

| File | Owner | Contains |
|---|---|---|
| `src/map.js` | A | Map, pins, building directory, 🧻 SOS |
| `src/food.js` | B | 美食 list, filters, 這樣說 |
| `src/buddy.js` | B | BuddyUp create / join |
| `src/api.js` | CLOUD | The contract. Everyone reads it, only CLOUD changes it. |
| `src/data.js` | E | Mock data — replaced by the real API |
| `src/ui.js` | shared | Sheet, toast, score bar. Change = tell the group. |
| `styles.css` | A | Shared. Append at the bottom, don't reorder. |

## Switching from mock to the real API

One line. `src/api.js`:

```js
const API_BASE = ''   // ← CLOUD puts the API Gateway URL here on Day 2
```

Empty = mock mode (uses `src/data.js`). Set it and every screen hits the real API.
**FRONT changes nothing else.** That's the whole point of the contract layer.

## Multi-tenancy

Every request is scoped `/c/{campusId}`. Campus comes from the URL:

```
http://localhost:8099/            → cycu
http://localhost:8099/?campus=ntu → ntu
```

Add a campus in `CAMPUSES` in `src/api.js`. Three lines, and it's the live demo moment.

Self-service campus signup is Phase 2 — the architecture allows it, we're not building the UI.

## Conventions

- JSON keys `camelCase`. Never `snake_case`, never Chinese keys.
- IDs lowercase with hyphens: `lib-1t`. Readable beats UUID at 2am.
- **Always separate `lat` and `lng` fields.** Never an array — half the team will read it backwards.
- Times are ISO 8601. Store UTC, display Taipei.
- Branch per person: `a/map-screen`. PR into `main`. Only G pushes to `main`.
- Done = merged, works against the real API, and someone else opened it on their phone.

## Data provenance

- **Buildings + restaurants**: real coordinates from OpenStreetMap (Overpass API).
- **YouBike**: `https://apis.youbike.com.tw/json/station-yb2.json` — free, no key, 9,446 stations.
  CORS-blocked in the browser, so CLOUD fetches it on a schedule and caches it.
- **Toilets, water dispensers, ATMs**: do not exist in any open dataset. That's the walking
  survey, and it's also why this app is worth building.
- Floors, landmarks and reliability counts in `data.js` are placeholders until the survey lands.

## Not done yet

- Real API (mock only)
- Photo upload (the 📷 box is a placeholder)
- 日文 / 馬來文
- Login — anonymous for now, deliberately
