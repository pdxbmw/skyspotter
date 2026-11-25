/**
 * Free Cloudflare Worker proxy for GitHub Pages deployment with edge caching
 * so multiple friends share cached upstream responses without hitting rate limits.
 *
 * Deploy via `cd worker && npx wrangler deploy` (or paste into the Cloudflare dashboard),
 * then set GitHub repo variable VITE_API_BASE=https://<your-worker>.workers.dev
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200, maxAgeSeconds = 0) {
  const headers = {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (maxAgeSeconds > 0) {
    headers['Cache-Control'] = `public, max-age=${maxAgeSeconds}`;
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function sampleWorldPlanes(states, bounds, maxMarkers = 160) {
  const { lamin, lomin, lamax, lomax } = bounds;
  const cols = 16;
  const rows = 10;
  const latSpan = Math.max(1, lamax - lamin);
  const lonSpan = Math.max(1, lomax - lomin);
  const cells = new Map();

  for (const s of states) {
    const lon = s[5];
    const lat = s[6];
    if (typeof lat !== 'number' || typeof lon !== 'number' || s[8]) continue;
    if (lat < lamin || lat > lamax || lon < lomin || lon > lomax) continue;
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((lon - lomin) / lonSpan) * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(((lat - lamin) / latSpan) * rows)));
    const key = `${row}:${col}`;
    const bucket = cells.get(key) || [];
    if (bucket.length < 3) {
      bucket.push(s);
      cells.set(key, bucket);
    }
  }

  const ac = [];
  for (let round = 0; round < 3 && ac.length < maxMarkers; round += 1) {
    for (const bucket of cells.values()) {
      const s = bucket[round];
      if (!s) continue;
      const altMeters = s[7] ?? s[13];
      ac.push({
        hex: String(s[0] || '').trim(),
        flight: String(s[1] || s[0] || '').trim(),
        lat: s[6],
        lon: s[5],
        alt_baro: typeof altMeters === 'number' ? Math.max(0, Math.round(altMeters * 3.28084)) : undefined,
        gs: typeof s[9] === 'number' ? Number((s[9] * 1.94384).toFixed(1)) : undefined,
        track: typeof s[10] === 'number' ? s[10] : 0,
        baro_rate: typeof s[11] === 'number' ? Math.round(s[11] * 196.85) : 0,
        squawk: typeof s[14] === 'string' ? s[14] : undefined,
      });
      if (ac.length >= maxMarkers) break;
    }
  }
  return ac;
}

async function fetchCachedJson(cacheKeyUrl, upstreamUrl, ttlSeconds, ctx) {
  const cache = caches.default;
  const cacheReq = new Request(cacheKeyUrl, { method: 'GET' });
  const cached = await cache.match(cacheReq);
  if (cached) {
    return cached.json();
  }

  const res = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'SkySpotter-Worker/1.0', Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  const toCache = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}`,
    },
  });
  ctx.waitUntil(cache.put(cacheReq, toCache));
  return data;
}

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/flights') {
      if (url.searchParams.get('mode') === 'world') {
        const lamin = Math.max(-85, Number.parseFloat(url.searchParams.get('lamin') || '-75') || -75);
        const lamax = Math.min(85, Number.parseFloat(url.searchParams.get('lamax') || '75') || 75);
        const lomin = Math.max(-180, Number.parseFloat(url.searchParams.get('lomin') || '-180') || -180);
        const lomax = Math.min(180, Number.parseFloat(url.searchParams.get('lomax') || '180') || 180);

        try {
          const json = await fetchCachedJson(
            'https://skyspotter-cache.internal/opensky-world-v1',
            'https://opensky-network.org/api/states/all',
            25,
            ctx
          );
          const states = Array.isArray(json.states) ? json.states : [];
          const ac = sampleWorldPlanes(states, { lamin, lomin, lamax, lomax }, 160);
          return jsonResponse(
            {
              source: 'opensky-world',
              now: (json.time || Math.floor(Date.now() / 1000)) * 1000,
              total: ac.length,
              globalTotal: states.length,
              ac,
            },
            200,
            15
          );
        } catch {
          // Graceful fallback to adsb.lol at viewport center if OpenSky throttles
          const centerLat = ((lamin + lamax) / 2).toFixed(2);
          const centerLon = ((lomin + lomax) / 2).toFixed(2);
          try {
            const data = await fetchCachedJson(
              `https://skyspotter-cache.internal/adsb/${centerLat}/${centerLon}/250`,
              `https://api.adsb.lol/v2/point/${centerLat}/${centerLon}/250`,
              15,
              ctx
            );
            const ac = Array.isArray(data.ac) ? data.ac : [];
            return jsonResponse(
              { source: 'adsb.lol', now: data.now ?? Date.now(), total: ac.length, ac },
              200,
              15
            );
          } catch (fallbackErr) {
            return jsonResponse(
              { error: 'Live flight feeds unavailable', detail: String(fallbackErr) },
              502
            );
          }
        }
      }

      const lat = Number.parseFloat(url.searchParams.get('lat') || '');
      const lon = Number.parseFloat(url.searchParams.get('lon') || '');
      const rawRadius = Number.parseFloat(url.searchParams.get('radius') || '40');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonResponse({ error: 'lat and lon required' }, 400);
      }

      const radius = Math.min(250, Math.max(5, Math.round(rawRadius || 40)));
      const qLat = lat.toFixed(1);
      const qLon = lon.toFixed(1);

      try {
        const data = await fetchCachedJson(
          `https://skyspotter-cache.internal/adsb/${qLat}/${qLon}/${radius}`,
          `https://api.adsb.lol/v2/point/${qLat}/${qLon}/${radius}`,
          15,
          ctx
        );
        const ac = Array.isArray(data.ac) ? data.ac : [];
        return jsonResponse(
          { source: 'adsb.lol', now: data.now ?? Date.now(), total: ac.length, ac },
          200,
          15
        );
      } catch (err) {
        return jsonResponse({ error: 'Local flight feed unavailable', detail: String(err) }, 502);
      }
    }

    if (url.pathname === '/api/aircraft') {
      const hex = (url.searchParams.get('hex') || '').replace(/[^a-fA-F0-9]/g, '').toUpperCase();
      const callsign = (url.searchParams.get('callsign') || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (!hex && !callsign) {
        return jsonResponse({ error: 'Provide hex or callsign' }, 400);
      }

      const cache = caches.default;
      const cacheReq = new Request(`https://skyspotter-cache.internal/aircraft/${hex}/${callsign}`);
      const cached = await cache.match(cacheReq);
      if (cached) {
        const body = await cached.json();
        return jsonResponse(body, 200, 3600);
      }

      let aircraft = null;
      let flightroute = null;

      if (hex) {
        const q = callsign ? `?callsign=${encodeURIComponent(callsign)}` : '';
        const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${hex}${q}`);
        if (res.ok) {
          const json = await res.json();
          aircraft = json?.response?.aircraft ?? null;
          flightroute = json?.response?.flightroute ?? null;
        }
      }
      if (!flightroute && callsign) {
        const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`);
        if (res.ok) {
          const json = await res.json();
          flightroute = json?.response?.flightroute ?? null;
        }
      }

      const payload = { aircraft, flightroute };
      ctx.waitUntil(
        cache.put(
          cacheReq,
          new Response(JSON.stringify(payload), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
          })
        )
      );
      return jsonResponse(payload, 200, 3600);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
