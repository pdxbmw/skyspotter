import { AIRCRAFT_TYPES, AIRLINES } from '../data/aviationKnowledge';
import { AircraftDetailsResponse, AircraftTelemetry, PlaneCategory } from '../types/aviation';

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingToCardinal(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  return dirs[Math.round(bearing / 45) % 8];
}

export function inferCategory(typeCode?: string, adsbCategory?: string, callsign?: string): PlaneCategory {
  const cleanType = (typeCode ?? '').trim().toUpperCase();
  if (cleanType && AIRCRAFT_TYPES[cleanType]) {
    return AIRCRAFT_TYPES[cleanType].category;
  }

  const cs = (callsign ?? '').trim().toUpperCase();
  if (cs.startsWith('FDX') || cs.startsWith('UPS') || cs.startsWith('GTI')) {
    return 'cargo';
  }
  if (cs.startsWith('RCH') || cs.startsWith('CG') || cs.startsWith('LIFE') || cs.startsWith('MED')) {
    return 'rescue';
  }

  switch (adsbCategory) {
    case 'A7':
      return 'helicopter';
    case 'A5':
      return 'superjumbo';
    case 'A1':
      return 'propeller';
    case 'A2':
    case 'A3':
    case 'A4':
      return 'jetliner';
    default:
      if (cleanType.startsWith('C1') || cleanType.startsWith('C2') || cleanType.startsWith('PA') || cleanType.startsWith('SR2')) {
        return 'propeller';
      }
      if (cleanType.startsWith('EC') || cleanType.startsWith('B4') || cleanType.startsWith('R4') || cleanType.startsWith('S7')) {
        return 'helicopter';
      }
      return 'jetliner';
  }
}

export function resolveAirline(callsign: string): { name: string; color: string } {
  const clean = callsign.trim().toUpperCase();
  if (!clean) {
    return { name: 'Mystery Sky Flyer', color: '#0284C7' };
  }

  const prefix3 = clean.slice(0, 3);
  if (AIRLINES[prefix3]) {
    return AIRLINES[prefix3];
  }
  if (/^N[0-9]/.test(clean)) {
    return { name: 'Private / Local Pilot', color: '#EA580C' };
  }
  return { name: 'Sky Airline', color: '#0284C7' };
}

export function resolveFriendlyModel(typeCode?: string, category?: PlaneCategory): string {
  const clean = (typeCode ?? '').trim().toUpperCase();
  if (clean && AIRCRAFT_TYPES[clean]) {
    return AIRCRAFT_TYPES[clean].name;
  }
  if (clean) {
    return `Aircraft ${clean}`;
  }
  switch (category) {
    case 'helicopter':
      return 'Helicopter';
    case 'propeller':
      return 'Propeller Airplane';
    case 'superjumbo':
      return 'Jumbo Jetliner';
    case 'cargo':
      return 'Cargo Airplane';
    case 'rescue':
      return 'Rescue / Patrol Aircraft';
    default:
      return 'Passenger Jet';
  }
}

export function normalizeAdsbAircraft(
  rawList: Record<string, unknown>[],
  homeLat: number,
  homeLon: number
): AircraftTelemetry[] {
  const results: AircraftTelemetry[] = [];

  for (const item of rawList) {
    const lat = typeof item.lat === 'number' ? item.lat : null;
    const lon = typeof item.lon === 'number' ? item.lon : null;
    if (lat === null || lon === null) continue;

    const hex = String(item.hex ?? '').trim();
    const callsign = String(item.flight ?? item.r ?? hex).trim() || 'SKYFLYER';
    const typeCode = typeof item.t === 'string' ? item.t.trim().toUpperCase() : undefined;
    const categoryCode = typeof item.category === 'string' ? item.category.trim().toUpperCase() : undefined;
    const category = inferCategory(typeCode, categoryCode, callsign);

    const onGround = item.alt_baro === 'ground';
    const altitudeFt =
      typeof item.alt_baro === 'number'
        ? Math.max(0, Math.round(item.alt_baro))
        : typeof item.alt_geom === 'number'
          ? Math.max(0, Math.round(item.alt_geom))
          : null;

    const speedMph = typeof item.gs === 'number' ? Math.round(item.gs * 1.15078) : null;
    const trackDeg = typeof item.track === 'number' ? Math.round(item.track) : 0;
    const verticalRateFpm = typeof item.baro_rate === 'number' ? Math.round(item.baro_rate) : 0;

    const airline = resolveAirline(callsign);
    const friendlyModel = resolveFriendlyModel(typeCode, category);
    const distanceMiles = Number(haversineMiles(homeLat, homeLon, lat, lon).toFixed(1));
    const bearingCardinal = bearingToCardinal(homeLat, homeLon, lat, lon);

    results.push({
      id: hex || callsign,
      hex,
      callsign,
      registration: typeof item.r === 'string' ? item.r.trim() : undefined,
      typeCode,
      categoryCode,
      category,
      lat,
      lon,
      altitudeFt,
      onGround,
      speedMph,
      trackDeg,
      verticalRateFpm,
      squawk: typeof item.squawk === 'string' ? item.squawk : undefined,
      distanceMiles,
      bearingCardinal,
      airlineName: airline.name,
      airlineColor: airline.color,
      friendlyModel,
    });
  }

  return results.sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export function getAltitudeComparison(altitudeFt: number | null, onGround: boolean): string {
  if (onGround || altitudeFt === 0) {
    return 'Right down on the airport runway!';
  }
  if (altitudeFt === null) {
    return 'Cruising through the sky!';
  }
  if (altitudeFt < 2500) {
    const giraffes = Math.max(10, Math.round(altitudeFt / 18));
    return `As high as ${giraffes.toLocaleString()} tall giraffes standing on each other!`;
  }
  if (altitudeFt < 12000) {
    const towers = Math.max(2, Math.round(altitudeFt / 1083));
    return `As high as ${towers} Eiffel Towers stacked up!`;
  }
  const everests = (altitudeFt / 29032).toFixed(1);
  if (altitudeFt >= 28000) {
    return `About ${everests}× as high as Mount Everest — higher than most clouds!`;
  }
  const schoolBuses = Math.round(altitudeFt / 10);
  return `As high as ${schoolBuses.toLocaleString()} school buses stacked sky-high!`;
}

export function getSpeedComparison(speedMph: number | null, onGround: boolean): string {
  if (onGround || speedMph === null) {
    return 'Taxiing gently like a car on a neighborhood street!';
  }
  if (speedMph < 70) {
    return 'Moving slower than a highway car!';
  }
  if (speedMph < 180) {
    const cheetahs = Math.max(1, Math.round(speedMph / 70));
    return `About ${cheetahs}× faster than a sprinting cheetah!`;
  }
  const cars = Math.max(2, Math.round(speedMph / 65));
  return `${cars}× faster than a family car zooming on the freeway!`;
}

export function getVerticalStatus(plane: AircraftTelemetry): {
  label: string;
  arrow: string;
  color: string;
} {
  if (plane.onGround) {
    return { label: 'On the Ground', arrow: '🛬', color: '#64748B' };
  }
  if (plane.verticalRateFpm > 350) {
    return { label: 'Climbing Up!', arrow: '↗️', color: '#059669' };
  }
  if (plane.verticalRateFpm < -350) {
    return { label: 'Coming Down to Land', arrow: '↘️', color: '#EA580C' };
  }
  return { label: 'Cruising Smoothly', arrow: '➡️', color: '#0284C7' };
}

export function buildPlaneStory(
  plane: AircraftTelemetry,
  details?: AircraftDetailsResponse | null
): string {
  const modelName =
    details?.aircraft?.manufacturer && details?.aircraft?.type
      ? `${details.aircraft.manufacturer} ${details.aircraft.type}`
      : plane.friendlyModel;

  const airline = details?.flightroute?.airline?.name || plane.airlineName;
  const originCity =
    details?.flightroute?.origin?.municipality || plane.demoOrigin?.city;
  const destCity =
    details?.flightroute?.destination?.municipality || plane.demoDestination?.city;

  const intro = `Look up to the ${plane.bearingCardinal}, about ${plane.distanceMiles} miles away! That is flight ${plane.callsign}, a ${modelName} flying for ${airline}.`;

  let routeSentence = '';
  if (originCity && destCity) {
    routeSentence = ` It took off from ${originCity} and is flying all the way to ${destCity}!`;
  } else if (plane.category === 'helicopter') {
    routeSentence = ` It is flying a local helicopter mission around the area!`;
  } else if (plane.category === 'propeller') {
    routeSentence = ` It is cruising around locally on a fun sky flight!`;
  }

  const altText =
    plane.onGround
      ? 'Right now it is down on the runway.'
      : plane.altitudeFt !== null
        ? ` It is ${plane.altitudeFt.toLocaleString()} feet up in the air — ${getAltitudeComparison(plane.altitudeFt, false)}`
        : '';

  const speedText =
    plane.speedMph !== null && !plane.onGround
      ? ` And it is zooming along at ${plane.speedMph} miles per hour!`
      : '';

  const typeFact =
    plane.demoFunFact ||
    (plane.typeCode && AIRCRAFT_TYPES[plane.typeCode]?.fact) ||
    '';

  return `${intro}${routeSentence}${altText}${speedText}${typeFact ? ` Fun fact: ${typeFact}` : ''}`;
}
