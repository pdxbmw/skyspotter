import { AircraftTelemetry, HomeLocation } from '../types/aviation';
import { bearingToCardinal, haversineMiles } from '../utils/flightHelpers';

interface DemoSeed {
  id: string;
  callsign: string;
  typeCode: string;
  friendlyModel: string;
  category: AircraftTelemetry['category'];
  airlineName: string;
  airlineColor: string;
  baseOffsetLat: number;
  baseOffsetLon: number;
  speedMph: number;
  altitudeFt: number;
  trackDeg: number;
  verticalRateFpm: number;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  funFact: string;
}

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: 'demo-asa412',
    callsign: 'ASA412',
    typeCode: 'B738',
    friendlyModel: 'Boeing 737-800',
    category: 'jetliner',
    airlineName: 'Alaska Airlines',
    airlineColor: '#01426A',
    baseOffsetLat: 0.04,
    baseOffsetLon: -0.06,
    speedMph: 485,
    altitudeFt: 28500,
    trackDeg: 135,
    verticalRateFpm: 0,
    origin: { code: 'SEA', city: 'Seattle' },
    destination: { code: 'SFO', city: 'San Francisco' },
    funFact: 'Its upturned wingtips help save fuel on long coast-to-coast flights!',
  },
  {
    id: 'demo-a388',
    callsign: 'BAW287',
    typeCode: 'A388',
    friendlyModel: 'Airbus A380 Superjumbo',
    category: 'superjumbo',
    airlineName: 'British Airways',
    airlineColor: '#1E3A8A',
    baseOffsetLat: 0.16,
    baseOffsetLon: 0.14,
    speedMph: 560,
    altitudeFt: 39000,
    trackDeg: 245,
    verticalRateFpm: 0,
    origin: { code: 'LHR', city: 'London' },
    destination: { code: 'LAX', city: 'Los Angeles' },
    funFact: 'This giant double-decker jet has TWO full passenger floors!',
  },
  {
    id: 'demo-chopper',
    callsign: 'LIFE1',
    typeCode: 'EC35',
    friendlyModel: 'Airbus H135 Rescue Helicopter',
    category: 'helicopter',
    airlineName: 'Sky Rescue Team',
    airlineColor: '#059669',
    baseOffsetLat: -0.03,
    baseOffsetLon: 0.05,
    speedMph: 135,
    altitudeFt: 1400,
    trackDeg: 310,
    verticalRateFpm: 150,
    origin: { code: 'HEL', city: 'City Helipad' },
    destination: { code: 'MED', city: 'Hospital Roof' },
    funFact: 'Helicopters can hover completely still in mid-air like a hummingbird!',
  },
  {
    id: 'demo-prop',
    callsign: 'N417KP',
    typeCode: 'C172',
    friendlyModel: 'Cessna 172 Skyhawk',
    category: 'propeller',
    airlineName: 'Sunny Skies Flying Club',
    airlineColor: '#EA580C',
    baseOffsetLat: -0.09,
    baseOffsetLon: -0.07,
    speedMph: 125,
    altitudeFt: 3200,
    trackDeg: 55,
    verticalRateFpm: 400,
    origin: { code: 'LOC', city: 'Hometown Airfield' },
    destination: { code: 'SCEN', city: 'Scenic Loop' },
    funFact: 'Almost every airline pilot learned to fly in a Cessna Skyhawk just like this!',
  },
  {
    id: 'demo-fdx',
    callsign: 'FDX904',
    typeCode: 'B748',
    friendlyModel: 'Boeing 747-8 Cargo Giant',
    category: 'cargo',
    airlineName: 'FedEx Express',
    airlineColor: '#6D28D9',
    baseOffsetLat: 0.11,
    baseOffsetLon: -0.18,
    speedMph: 530,
    altitudeFt: 34200,
    trackDeg: 95,
    verticalRateFpm: 0,
    origin: { code: 'ANC', city: 'Anchorage' },
    destination: { code: 'MEM', city: 'Memphis' },
    funFact: 'The whole front nose opens up like a giant mouth to load cargo boxes!',
  },
  {
    id: 'demo-dal',
    callsign: 'DAL1208',
    typeCode: 'B789',
    friendlyModel: 'Boeing 787 Dreamliner',
    category: 'superjumbo',
    airlineName: 'Delta Air Lines',
    airlineColor: '#BE123C',
    baseOffsetLat: -0.14,
    baseOffsetLon: 0.12,
    speedMph: 515,
    altitudeFt: 11800,
    trackDeg: 15,
    verticalRateFpm: -1100,
    origin: { code: 'MSP', city: 'Minneapolis' },
    destination: { code: 'HOME', city: 'Local Airport' },
    funFact: 'Its wings bend gently upward like a soaring bird, and its windows dim with a button!',
  },
  {
    id: 'demo-hero',
    callsign: 'TNKR91',
    typeCode: 'C130',
    friendlyModel: 'C-130 Hercules Air Tanker',
    category: 'rescue',
    airlineName: 'Forest Sky Patrol',
    airlineColor: '#DC2626',
    baseOffsetLat: 0.21,
    baseOffsetLon: -0.02,
    speedMph: 340,
    altitudeFt: 8500,
    trackDeg: 185,
    verticalRateFpm: 0,
    origin: { code: 'PAT', city: 'Ranger Base' },
    destination: { code: 'MTN', city: 'Mountain Watch' },
    funFact: 'These four-propeller hero planes help protect forests and drop water on wildfires!',
  },
];

export function generateDemoFlights(home: HomeLocation, elapsedSec: number): AircraftTelemetry[] {
  return DEMO_SEEDS.map((seed, idx) => {
    const rad = (seed.trackDeg * Math.PI) / 180;
    // Smooth looping travel across ~25 miles over 2 minutes
    const travel = ((elapsedSec * (seed.speedMph / 3600)) % 0.45) - 0.15;
    const lat = home.lat + seed.baseOffsetLat + Math.cos(rad) * travel * 0.55 + Math.sin(elapsedSec * 0.04 + idx) * 0.008;
    const lon = home.lon + seed.baseOffsetLon + Math.sin(rad) * travel * 0.72;

    const distanceMiles = Number(haversineMiles(home.lat, home.lon, lat, lon).toFixed(1));
    const bearingCardinal = bearingToCardinal(home.lat, home.lon, lat, lon);

    return {
      id: seed.id,
      hex: seed.id,
      callsign: seed.callsign,
      typeCode: seed.typeCode,
      category: seed.category,
      lat,
      lon,
      altitudeFt: seed.altitudeFt,
      onGround: false,
      speedMph: seed.speedMph,
      trackDeg: seed.trackDeg,
      verticalRateFpm: seed.verticalRateFpm,
      distanceMiles,
      bearingCardinal,
      airlineName: seed.airlineName,
      airlineColor: seed.airlineColor,
      friendlyModel: seed.friendlyModel,
      isDemo: true,
      demoOrigin: seed.origin,
      demoDestination: seed.destination,
      demoFunFact: seed.funFact,
    };
  }).sort((a, b) => a.distanceMiles - b.distanceMiles);
}
