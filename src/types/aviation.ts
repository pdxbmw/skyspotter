export type PlaneCategory =
  | 'jetliner'
  | 'superjumbo'
  | 'propeller'
  | 'helicopter'
  | 'cargo'
  | 'rescue';

export type SkyMode = 'live' | 'demo';

export interface HomeLocation {
  name: string;
  code: string;
  lat: number;
  lon: number;
}

export interface AircraftTelemetry {
  id: string;
  hex: string;
  callsign: string;
  registration?: string;
  typeCode?: string;
  categoryCode?: string;
  category: PlaneCategory;
  lat: number;
  lon: number;
  altitudeFt: number | null;
  onGround: boolean;
  speedMph: number | null;
  trackDeg: number;
  verticalRateFpm: number;
  squawk?: string;
  distanceMiles: number;
  bearingCardinal: string;
  airlineName: string;
  airlineColor: string;
  friendlyModel: string;
  isDemo?: boolean;
  demoOrigin?: { code: string; city: string };
  demoDestination?: { code: string; city: string };
  demoFunFact?: string;
}

export interface AirportInfo {
  iata_code?: string;
  icao_code?: string;
  name?: string;
  municipality?: string;
  country_name?: string;
}

export interface FlightRouteInfo {
  callsign?: string;
  airline?: {
    name?: string;
    icao?: string;
    iata?: string;
    country?: string;
  };
  origin?: AirportInfo;
  destination?: AirportInfo;
}

export interface AircraftDbInfo {
  type?: string;
  icao_type?: string;
  manufacturer?: string;
  mode_s?: string;
  registration?: string;
  registered_owner?: string;
  url_photo?: string;
  url_photo_thumbnail?: string;
}

export interface AircraftDetailsResponse {
  aircraft: AircraftDbInfo | null;
  flightroute: FlightRouteInfo | null;
}

export interface SpottedPlaneEntry {
  id: string;
  spottedAt: number;
  callsign: string;
  friendlyModel: string;
  category: PlaneCategory;
  airlineName: string;
  altitudeFt: number | null;
  speedMph: number | null;
  routeSummary: string;
  points: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  pointsNeeded?: number;
}

export interface EncyclopediaEntry {
  id: string;
  category: PlaneCategory;
  title: string;
  subtitle: string;
  tagline: string;
  color: string;
  sizeComparison: string;
  speedComparison: string;
  altitudeComparison: string;
  funFacts: string[];
  spokenScript: string;
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  };
}
