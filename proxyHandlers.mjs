const flightsCache = new Map();
const aircraftCache = new Map();
let worldOpenSkyCache = null;

const FLIGHTS_TTL_MS = 6000;
const WORLD_TTL_MS = 20000;
const AIRCRAFT_TTL_MS = 30 * 60 * 1000;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function fetchJsonWithTimeout(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SkySpotter-KidPlane/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return response.json();
}

function openSkyStateToAc(state) {
  const hex = typeof state[0] === 'string' ? state[0].trim() : '';
  const callsign = typeof state[1] === 'string' ? state[1].trim() : '';
  const lon = typeof state[5] === 'number' ? state[5] : null;
  const lat = typeof state[6] === 'number' ? state[6] : null;
  const baroMeters = typeof state[7] === 'number' ? state[7] : null;
  const onGround = Boolean(state[8]);
  const velocityMs = typeof state[9] === 'number' ? state[9] : null;
  const track = typeof state[10] === 'number' ? state[10] : 0;
  const vertRateMs = typeof state[11] === 'number' ? state[11] : 0;
  const geoMeters = typeof state[13] === 'number' ? state[13] : null;
  const squawk = typeof state[14] === 'string' ? state[14] : undefined;

  if (lat === null || lon === null) return null;

  const altMeters = baroMeters ?? geoMeters;
  const altBaro = onGround
    ? 'ground'
    : altMeters !== null
      ? Math.max(0, Math.round(altMeters * 3.28084))
      : undefined;

  return {
    hex,
    flight: callsign || hex.toUpperCase(),
    lat,
    lon,
    alt_baro: altBaro,
    gs: velocityMs !== null ? Number((velocityMs * 1.94384).toFixed(1)) : undefined,
    track,
    baro_rate: Math.round(vertRateMs * 196.85),
    squawk,
  };
}

function sampleWorldPlanes(states, bounds, maxMarkers = 160) {
  const { lamin, lomin, lamax, lomax } = bounds;
  const latSpan = Math.max(1, lamax - lamin);
  const lonSpan = Math.max(1, lomax - lomin);

  const cols = 16;
  const rows = 10;
  const cells = new Map();
  let inBoundsTotal = 0;

  for (const s of states) {
    const lon = s[5];
    const lat = s[6];
    const onGround = Boolean(s[8]);
    if (typeof lat !== 'number' || typeof lon !== 'number' || onGround) continue;
    if (lat < lamin || lat > lamax || lon < lomin || lon > lomax) continue;

    inBoundsTotal += 1;
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((lon - lomin) / lonSpan) * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(((lat - lamin) / latSpan) * rows)));
    const key = `${row}:${col}`;

    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    if (bucket.length < 3) {
      bucket.push(s);
    }
  }

  // Round-robin pick from cells so every region/continent gets fair representation
  const picked = [];
  for (let round = 0; round < 3 && picked.length < maxMarkers; round += 1) {
    for (const bucket of cells.values()) {
      if (bucket[round]) {
        const ac = openSkyStateToAc(bucket[round]);
        if (ac) picked.push(ac);
        if (picked.length >= maxMarkers) break;
      }
    }
  }

  return { picked, inBoundsTotal };
}

async function handleWorldFlightsApi(reqUrl, res) {
  const lamin = Math.max(-85, Number.parseFloat(reqUrl.searchParams.get('lamin') ?? '-75') || -75);
  const lamax = Math.min(85, Number.parseFloat(reqUrl.searchParams.get('lamax') ?? '75') || 75);
  const lomin = Math.max(-180, Number.parseFloat(reqUrl.searchParams.get('lomin') ?? '-180') || -180);
  const lomax = Math.min(180, Number.parseFloat(reqUrl.searchParams.get('lomax') ?? '180') || 180);

  try {
    if (!worldOpenSkyCache || Date.now() - worldOpenSkyCache.ts >= WORLD_TTL_MS) {
      const json = await fetchJsonWithTimeout('https://opensky-network.org/api/states/all', 12000);
      const states = Array.isArray(json.states) ? json.states : [];
      worldOpenSkyCache = {
        ts: Date.now(),
        time: (json.time ?? Math.floor(Date.now() / 1000)) * 1000,
        states,
      };
    }

    const { picked, inBoundsTotal } = sampleWorldPlanes(
      worldOpenSkyCache.states,
      { lamin, lomin, lamax, lomax },
      160
    );

    sendJson(res, 200, {
      source: 'opensky-world',
      now: worldOpenSkyCache.time,
      total: picked.length,
      inBoundsTotal,
      globalTotal: worldOpenSkyCache.states.length,
      ac: picked,
    });
    return;
  } catch (err) {
    // Graceful fallback: sample global/in-view hubs from adsb.fi v3 (with adsb.lol backup)
    const hubs = [
      [45.5, -122.5],
      [40.6, -73.8],
      [51.5, -0.4],
      [35.5, 139.8],
    ];
    const inView = hubs.filter(
      ([hLat, hLon]) => hLat >= lamin - 10 && hLat <= lamax + 10 && hLon >= lomin - 15 && hLon <= lomax + 15
    );
    const centerLat = Number(((lamin + lamax) / 2).toFixed(2));
    const centerLon = Number(((lomin + lomax) / 2).toFixed(2));
    const targets = inView.length > 0 ? inView : [[centerLat, centerLon]];

    const seenHex = new Set();
    const combined = [];
    for (const [tLat, tLon] of targets) {
      try {
        const json = await fetchJsonWithTimeout(
          `https://opendata.adsb.fi/api/v3/lat/${tLat}/lon/${tLon}/dist/460`,
          6000
        );
        const list = Array.isArray(json.ac) ? json.ac : [];
        for (const p of list.filter((x) => x.alt_baro !== 'ground').slice(0, 40)) {
          const id = p.hex || p.flight;
          if (!id || seenHex.has(id)) continue;
          seenHex.add(id);
          combined.push(p);
        }
      } catch {
        // try next hub
      }
    }

    if (combined.length > 0) {
      sendJson(res, 200, {
        source: 'adsb.fi-world',
        now: Date.now(),
        total: combined.length,
        ac: combined,
      });
      return;
    }

    try {
      const json = await fetchJsonWithTimeout(
        `https://api.adsb.lol/v2/point/${centerLat}/${centerLon}/250`,
        7000
      );
      const ac = Array.isArray(json.ac) ? json.ac : [];
      sendJson(res, 200, {
        source: 'adsb.lol',
        now: json.now ?? Date.now(),
        total: ac.length,
        ac,
      });
      return;
    } catch {
      sendJson(res, 502, {
        error: 'World flight feed could not be reached right now.',
        detail: err instanceof Error ? err.message : 'Unknown upstream error',
      });
    }
  }
}

export async function handleFlightsApi(reqUrl, res) {
  if (reqUrl.searchParams.get('mode') === 'world') {
    await handleWorldFlightsApi(reqUrl, res);
    return;
  }

  const lat = Number.parseFloat(reqUrl.searchParams.get('lat') ?? '');
  const lon = Number.parseFloat(reqUrl.searchParams.get('lon') ?? '');
  const rawRadius = Number.parseFloat(reqUrl.searchParams.get('radius') ?? '40');

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    sendJson(res, 400, { error: 'Valid lat and lon parameters are required.' });
    return;
  }

  const radius = Math.min(250, Math.max(5, Number.isFinite(rawRadius) ? Math.round(rawRadius) : 40));
  const cacheKey = `${lat.toFixed(2)}:${lon.toFixed(2)}:${radius}`;
  const cached = flightsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < FLIGHTS_TTL_MS) {
    sendJson(res, 200, cached.data);
    return;
  }

  const km = Math.min(460, Math.max(10, Math.round(radius * 1.852)));
  const providers = [
    {
      name: 'adsb.fi',
      url: `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${km}`,
    },
    {
      name: 'adsb.lol',
      url: `https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`,
    },
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      const json = await fetchJsonWithTimeout(provider.url, 7000);
      const list = Array.isArray(json.ac)
        ? json.ac
        : Array.isArray(json.aircraft)
          ? json.aircraft
          : [];
      const payload = {
        source: provider.name,
        now: json.now ? (json.now < 1e12 ? json.now * 1000 : json.now) : Date.now(),
        total: list.length,
        ac: list,
      };
      flightsCache.set(cacheKey, { ts: Date.now(), data: payload });
      sendJson(res, 200, payload);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  sendJson(res, 502, {
    error: 'Live flight feeds could not be reached right now.',
    detail: lastError instanceof Error ? lastError.message : 'Unknown upstream error',
  });
}

export async function handleAircraftApi(reqUrl, res) {
  const hex = (reqUrl.searchParams.get('hex') ?? '').trim().replace(/[^a-fA-F0-9]/g, '');
  const callsign = (reqUrl.searchParams.get('callsign') ?? '').trim().replace(/[^a-zA-Z0-9]/g, '');

  if (!hex && !callsign) {
    sendJson(res, 400, { error: 'Provide hex or callsign.' });
    return;
  }

  const cacheKey = `${hex.toUpperCase()}:${callsign.toUpperCase()}`;
  const cached = aircraftCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < AIRCRAFT_TTL_MS) {
    sendJson(res, 200, cached.data);
    return;
  }

  let aircraft = null;
  let flightroute = null;

  if (hex) {
    try {
      const query = callsign ? `?callsign=${encodeURIComponent(callsign)}` : '';
      const data = await fetchJsonWithTimeout(`https://api.adsbdb.com/v0/aircraft/${hex}${query}`);
      aircraft = data?.response?.aircraft ?? null;
      flightroute = data?.response?.flightroute ?? null;
    } catch {
      // Aircraft lookup may return 404 for unknown Mode-S hexes; keep graceful fallback
    }
  }

  if (!flightroute && callsign) {
    try {
      const routeData = await fetchJsonWithTimeout(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`);
      flightroute = routeData?.response?.flightroute ?? null;
    } catch {
      // Route may not be in community DB for private/VFR flights
    }
  }

  const payload = { aircraft, flightroute };
  aircraftCache.set(cacheKey, { ts: Date.now(), data: payload });
  sendJson(res, 200, payload);
}

export async function handleGeocodeApi(reqUrl, res) {
  const query = (reqUrl.searchParams.get('q') ?? '').trim();
  if (query.length < 2) {
    sendJson(res, 400, { error: 'Enter at least 2 characters to search.' });
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
    const raw = await fetchJsonWithTimeout(url, 7000);
    const results = Array.isArray(raw)
      ? raw
          .map((item) => ({
            label: String(item.display_name ?? ''),
            lat: Number.parseFloat(item.lat),
            lon: Number.parseFloat(item.lon),
          }))
          .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lon))
      : [];
    sendJson(res, 200, { results });
  } catch (err) {
    sendJson(res, 502, {
      error: 'Address lookup failed right now.',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

export async function routeApiRequest(req, res) {
  if (!req.url || !req.url.startsWith('/api/')) {
    return false;
  }

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return true;
  }

  const parsed = new URL(req.url, 'http://localhost');
  if (parsed.pathname === '/api/flights') {
    await handleFlightsApi(parsed, res);
    return true;
  }
  if (parsed.pathname === '/api/aircraft') {
    await handleAircraftApi(parsed, res);
    return true;
  }
  if (parsed.pathname === '/api/geocode') {
    await handleGeocodeApi(parsed, res);
    return true;
  }

  sendJson(res, 404, { error: 'Unknown API endpoint' });
  return true;
}
