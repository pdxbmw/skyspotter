/**
 * Free Cloudflare Worker proxy for GitHub Pages deployment with coarse grid caching
 * so multiple friends share cached upstream responses without tripping rate limits.
 *
 * Deploy via `npx wrangler deploy --config worker/wrangler.toml`
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

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function openSkyStateToAc(s) {
  const altMeters = s[7] ?? s[13];
  return {
    hex: String(s[0] || '').trim(),
    flight: String(s[1] || s[0] || '').trim(),
    lat: s[6],
    lon: s[5],
    alt_baro: s[8]
      ? 'ground'
      : typeof altMeters === 'number'
        ? Math.max(0, Math.round(altMeters * 3.28084))
        : undefined,
    gs: typeof s[9] === 'number' ? Number((s[9] * 1.94384).toFixed(1)) : undefined,
    track: typeof s[10] === 'number' ? s[10] : 0,
    baro_rate: typeof s[11] === 'number' ? Math.round(s[11] * 196.85) : 0,
    squawk: typeof s[14] === 'string' ? s[14] : undefined,
  };
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
      ac.push(openSkyStateToAc(s));
      if (ac.length >= maxMarkers) break;
    }
  }
  return ac;
}

async function fetchCachedJson(cacheKeyUrl, upstreamUrl, ttlSeconds, ctx, timeoutMs = 6000) {
  const cache = caches.default;
  const cacheReq = new Request(cacheKeyUrl, { method: 'GET' });
  const cached = await cache.match(cacheReq);
  if (cached) {
    return cached.json();
  }

  const res = await fetch(upstreamUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${upstreamUrl}`);
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

async function fetchPointRadar(lat, lon, radiusNm, ctx) {
  // Snap to a 0.5-degree grid (~30nm) at 250nm radius so all zoom levels & nearby users share cache
  const gridLat = (Math.round(Number(lat) * 2) / 2).toFixed(1);
  const gridLon = (Math.round(Number(lon) * 2) / 2).toFixed(1);
  const targetRadius = Math.min(250, Math.max(5, Math.round(Number(radiusNm) || 40)));

  const providers = [
    {
      name: 'adsb.lol',
      cacheKey: `https://skyspotter-cache.internal/adsblol-grid/${gridLat}/${gridLon}`,
      url: `https://api.adsb.lol/v2/point/${gridLat}/${gridLon}/250`,
    },
    {
      name: 'adsb.fi',
      cacheKey: `https://skyspotter-cache.internal/adsbfi-grid/${gridLat}/${gridLon}`,
      url: `https://opendata.adsb.fi/api/v2/lat/${gridLat}/lon/${gridLon}/dist/250`,
    },
  ];

  const errors = [];
  for (const provider of providers) {
    try {
      const data = await fetchCachedJson(provider.cacheKey, provider.url, 30, ctx, 5500);
      const rawList = Array.isArray(data.ac)
        ? data.ac
        : Array.isArray(data.aircraft)
          ? data.aircraft
          : [];
      const filtered = rawList.filter((p) => {
        if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return false;
        return haversineNm(lat, lon, p.lat, p.lon) <= targetRadius + 15;
      });
      return {
        source: provider.name,
        now: data.now ? (data.now < 1e12 ? data.now * 1000 : data.now) : Date.now(),
        ac: filtered,
      };
    } catch (err) {
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Final local fallback: OpenSky bounding box (~1.5 deg around lat/lon)
  try {
    const pad = Math.max(0.8, targetRadius / 60);
    const lamin = Math.max(-85, lat - pad).toFixed(1);
    const lamax = Math.min(85, lat + pad).toFixed(1);
    const lomin = Math.max(-180, lon - pad * 1.4).toFixed(1);
    const lomax = Math.min(180, lon + pad * 1.4).toFixed(1);
    const data = await fetchCachedJson(
      `https://skyspotter-cache.internal/opensky-box/${gridLat}/${gridLon}`,
      `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
      30,
      ctx,
      6000
    );
    const states = Array.isArray(data.states) ? data.states : [];
    const ac = states
      .map(openSkyStateToAc)
      .filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
    return {
      source: 'opensky',
      now: (data.time || Math.floor(Date.now() / 1000)) * 1000,
      ac,
    };
  } catch (err) {
    errors.push(`opensky: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error(errors.join(' | '));
}

const WORLD_SAMPLE_HUBS = [
  [45.5, -122.5], // US West
  [40.5, -74.0],  // US East
  [51.5, -0.5],   // Europe
  [35.5, 139.5],  // East Asia
];

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
          const isRegional = lamax - lamin < 70 && lomax - lomin < 100;
          const osUrl = isRegional
            ? `https://opensky-network.org/api/states/all?lamin=${lamin.toFixed(1)}&lomin=${lomin.toFixed(1)}&lamax=${lamax.toFixed(1)}&lomax=${lomax.toFixed(1)}`
            : 'https://opensky-network.org/api/states/all';
          const osCacheKey = isRegional
            ? `https://skyspotter-cache.internal/opensky/${lamin.toFixed(0)}/${lomin.toFixed(0)}/${lamax.toFixed(0)}/${lomax.toFixed(0)}`
            : 'https://skyspotter-cache.internal/opensky-world-v1';

          const json = await fetchCachedJson(osCacheKey, osUrl, 30, ctx, 5500);
          const states = Array.isArray(json.states) ? json.states : [];
          const ac = sampleWorldPlanes(states, { lamin, lomin, lamax, lomax }, 160);
          return jsonResponse(
            {
              source: 'opensky-world',
              now: (json.time || Math.floor(Date.now() / 1000)) * 1000,
              total: ac.length,
              globalTotal: isRegional ? undefined : states.length,
              ac,
            },
            200,
            25
          );
        } catch {
          const inViewHubs = WORLD_SAMPLE_HUBS.filter(
            ([hLat, hLon]) => hLat >= lamin - 10 && hLat <= lamax + 10 && hLon >= lomin - 15 && hLon <= lomax + 15
          );
          const centerLat = (lamin + lamax) / 2;
          const centerLon = (lomin + lomax) / 2;
          const targets = inViewHubs.length > 0 ? inViewHubs : [[centerLat, centerLon]];

          const seenHex = new Set();
          const combined = [];
          for (const [tLat, tLon] of targets) {
            try {
              const res = await fetchPointRadar(tLat, tLon, 250, ctx);
              const airborne = res.ac.filter((p) => p.alt_baro !== 'ground').slice(0, 40);
              for (const p of airborne) {
                const id = p.hex || p.flight;
                if (!id || seenHex.has(id)) continue;
                seenHex.add(id);
                combined.push(p);
              }
            } catch {
              // continue to remaining hubs
            }
          }

          if (combined.length > 0) {
            return jsonResponse(
              {
                source: 'adsb-world',
                now: Date.now(),
                total: combined.length,
                ac: combined,
              },
              200,
              25
            );
          }

          return jsonResponse({ error: 'World flight feeds unavailable right now' }, 502);
        }
      }

      const lat = Number.parseFloat(url.searchParams.get('lat') || '');
      const lon = Number.parseFloat(url.searchParams.get('lon') || '');
      const rawRadius = Number.parseFloat(url.searchParams.get('radius') || '40');
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonResponse({ error: 'lat and lon required' }, 400);
      }

      try {
        const result = await fetchPointRadar(lat, lon, rawRadius, ctx);
        return jsonResponse(
          { source: result.source, now: result.now, total: result.ac.length, ac: result.ac },
          200,
          20
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
