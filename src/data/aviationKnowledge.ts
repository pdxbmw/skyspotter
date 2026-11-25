import { BadgeDef, EncyclopediaEntry, HomeLocation, PlaneCategory } from '../types/aviation';

export interface AircraftTypeMeta {
  name: string;
  category: PlaneCategory;
  fact: string;
}

export const AIRCRAFT_TYPES: Record<string, AircraftTypeMeta> = {
  B737: { name: 'Boeing 737', category: 'jetliner', fact: 'One of the most popular passenger jets in the whole world!' },
  B738: { name: 'Boeing 737-800', category: 'jetliner', fact: 'Its upturned wingtips help save fuel on long trips.' },
  B739: { name: 'Boeing 737-900', category: 'jetliner', fact: 'An extra-long 737 that can carry nearly 180 travelers!' },
  B38M: { name: 'Boeing 737 MAX 8', category: 'jetliner', fact: 'Has split wingtips and super-quiet modern jet engines.' },
  B39M: { name: 'Boeing 737 MAX 9', category: 'jetliner', fact: 'A sleek newer jet built to fly smoothly across the country.' },
  A319: { name: 'Airbus A319', category: 'jetliner', fact: 'A nimble twin-jet that can land on shorter airport runways.' },
  A320: { name: 'Airbus A320', category: 'jetliner', fact: 'Pilots fly this plane using a cool side-stick like a video game!' },
  A20N: { name: 'Airbus A320neo', category: 'jetliner', fact: 'The "neo" stands for New Engine Option — extra quiet!' },
  A321: { name: 'Airbus A321', category: 'jetliner', fact: 'The biggest member of the A320 jet family.' },
  A21N: { name: 'Airbus A321neo', category: 'jetliner', fact: 'Can fly all the way across oceans while sipping less fuel!' },
  A332: { name: 'Airbus A330', category: 'superjumbo', fact: 'A wide-body twin jet with two aisles inside the cabin!' },
  A333: { name: 'Airbus A330-300', category: 'superjumbo', fact: 'Wide enough to have 8 seats across in every row!' },
  A359: { name: 'Airbus A350', category: 'superjumbo', fact: 'Has cool curved "raccoon mask" windows in the cockpit!' },
  A388: { name: 'Airbus A380 Superjumbo', category: 'superjumbo', fact: 'The biggest passenger plane ever built — with TWO full decks!' },
  B744: { name: 'Boeing 747 Jumbo Jet', category: 'superjumbo', fact: 'Nicknamed the Queen of the Skies because of its famous hump!' },
  B748: { name: 'Boeing 747-8 Giant', category: 'cargo', fact: 'Its nose can lift right open like a giant mouth to load cargo!' },
  B763: { name: 'Boeing 767', category: 'cargo', fact: 'Great for both ocean flights and flying packages overnight.' },
  B772: { name: 'Boeing 777', category: 'superjumbo', fact: 'Its engines are as wide around as a whole Boeing 737 body!' },
  B77W: { name: 'Boeing 777-300ER', category: 'superjumbo', fact: 'Has 6 wheels on each main landing gear because it is so big!' },
  B788: { name: 'Boeing 787 Dreamliner', category: 'superjumbo', fact: 'Its windows dim with a button instead of pull-down shades!' },
  B789: { name: 'Boeing 787-9 Dreamliner', category: 'superjumbo', fact: 'Its wings bend gracefully upward like a bird in flight!' },
  E75L: { name: 'Embraer E175', category: 'jetliner', fact: 'A comfy regional jet where every seat is either a window or aisle!' },
  E170: { name: 'Embraer E170', category: 'jetliner', fact: 'Connects smaller hometown airports to big hub cities.' },
  CRJ7: { name: 'Bombardier CRJ-700', category: 'jetliner', fact: 'Its engines sit near the tail instead of under the wings!' },
  CRJ9: { name: 'Bombardier CRJ-900', category: 'jetliner', fact: 'A sleek regional jet with a tall T-shaped tail.' },
  BCS3: { name: 'Airbus A220', category: 'jetliner', fact: 'Has extra-large windows so passengers get an awesome sky view!' },
  DH8D: { name: 'Dash 8 Q400', category: 'propeller', fact: 'A fast twin-propeller airliner that loves short runways!' },
  C172: { name: 'Cessna 172 Skyhawk', category: 'propeller', fact: 'The most popular training airplane ever made for new pilots!' },
  C182: { name: 'Cessna 182 Skylane', category: 'propeller', fact: 'A tough four-seat propeller plane great for mountain views.' },
  C208: { name: 'Cessna Caravan', category: 'propeller', fact: 'A rugged bush-and-cargo prop plane that can land almost anywhere!' },
  SR22: { name: 'Cirrus SR22', category: 'propeller', fact: 'This cool single-engine plane actually has its own giant parachute!' },
  PC12: { name: 'Pilatus PC-12', category: 'propeller', fact: 'A Swiss turboprop famous for flying doctors and explorers!' },
  PA28: { name: 'Piper Cherokee', category: 'propeller', fact: 'A friendly low-wing propeller plane loved by student pilots.' },
  EC35: { name: 'Airbus H135 Helicopter', category: 'helicopter', fact: 'Often flies medical rescue missions and hops right onto hospital roofs!' },
  EC45: { name: 'Airbus H145 Helicopter', category: 'helicopter', fact: 'A quiet twin-engine rescue helicopter with a fenced tail rotor.' },
  B407: { name: 'Bell 407 Helicopter', category: 'helicopter', fact: 'Can hover in one spot in mid-air like a hummingbird!' },
  B06: { name: 'Bell JetRanger Helicopter', category: 'helicopter', fact: 'A classic helicopter used for news, tours, and police patrols.' },
  S76: { name: 'Sikorsky S-76 Helicopter', category: 'helicopter', fact: 'A sleek big helicopter that can even retract its wheels!' },
  R44: { name: 'Robinson R44 Helicopter', category: 'helicopter', fact: 'A nimble bubble-window helicopter with awesome panoramic views.' },
  MD11: { name: 'MD-11 Tri-Jet Cargo', category: 'cargo', fact: 'Has three engines — two under the wings and one right in the tail!' },
  A306: { name: 'Airbus A300 Freighter', category: 'cargo', fact: 'Carries tons of boxes and mail across the night sky.' },
  C130: { name: 'C-130 Hercules', category: 'rescue', fact: 'A four-propeller hero plane used for rescues and firefighting!' },
  C17: { name: 'C-17 Globemaster', category: 'rescue', fact: 'A massive heavy-lifter that can land on dirt airstrips!' },
  KC135: { name: 'KC-135 Sky Tanker', category: 'rescue', fact: 'Like a flying gas station that refuels other planes in mid-air!' },
};

export interface AirlineMeta {
  name: string;
  color: string;
}

export const AIRLINES: Record<string, AirlineMeta> = {
  ASA: { name: 'Alaska Airlines', color: '#01426A' },
  QXE: { name: 'Horizon Air', color: '#0284C7' },
  UAL: { name: 'United Airlines', color: '#1D4ED8' },
  DAL: { name: 'Delta Air Lines', color: '#BE123C' },
  SWA: { name: 'Southwest Airlines', color: '#EA580C' },
  AAL: { name: 'American Airlines', color: '#2563EB' },
  JBU: { name: 'JetBlue Airways', color: '#0369A1' },
  SKW: { name: 'SkyWest Airlines', color: '#0F766E' },
  HAL: { name: 'Hawaiian Airlines', color: '#9333EA' },
  FFT: { name: 'Frontier Airlines', color: '#15803D' },
  NKS: { name: 'Spirit Airlines', color: '#CA8A04' },
  FDX: { name: 'FedEx Express', color: '#6D28D9' },
  UPS: { name: 'UPS Airlines', color: '#92400E' },
  GTI: { name: 'Atlas Air Cargo', color: '#0369A1' },
  BAW: { name: 'British Airways', color: '#1E3A8A' },
  DLH: { name: 'Lufthansa', color: '#0F172A' },
  AFR: { name: 'Air France', color: '#1D4ED8' },
  ACA: { name: 'Air Canada', color: '#DC2626' },
  WJA: { name: 'WestJet', color: '#0D9488' },
  VOI: { name: 'Volaris', color: '#7C3AED' },
  N: { name: 'Private / Local Pilot', color: '#EA580C' },
};

export const CATEGORY_STYLES: Record<
  PlaneCategory,
  { label: string; color: string; bg: string; emoji: string }
> = {
  jetliner: { label: 'Passenger Jet', color: '#0284C7', bg: '#E0F2FE', emoji: '✈️' },
  superjumbo: { label: 'Giant Jumbo Jet', color: '#7C3AED', bg: '#F3E8FF', emoji: '🛫' },
  propeller: { label: 'Propeller Plane', color: '#EA580C', bg: '#FFEDD5', emoji: '🛩️' },
  helicopter: { label: 'Helicopter', color: '#059669', bg: '#D1FAE5', emoji: '🚁' },
  cargo: { label: 'Cargo Freighter', color: '#B45309', bg: '#FEF3C7', emoji: '📦' },
  rescue: { label: 'Hero & Rescue', color: '#DC2626', bg: '#FEE2E2', emoji: '🚒' },
};

export const LOCATION_PRESETS: HomeLocation[] = [
  { name: 'Portland, OR (PDX)', code: 'PDX', lat: 45.5898, lon: -122.5951 },
  { name: 'Seattle, WA (SEA)', code: 'SEA', lat: 47.4502, lon: -122.3088 },
  { name: 'San Francisco, CA (SFO)', code: 'SFO', lat: 37.6213, lon: -122.379 },
  { name: 'Los Angeles, CA (LAX)', code: 'LAX', lat: 33.9416, lon: -118.4085 },
  { name: 'Chicago, IL (ORD)', code: 'ORD', lat: 41.9742, lon: -87.9073 },
  { name: 'New York, NY (JFK)', code: 'JFK', lat: 40.6413, lon: -73.7781 },
  { name: 'Denver, CO (DEN)', code: 'DEN', lat: 39.8561, lon: -104.6737 },
  { name: 'London, UK (LHR)', code: 'LHR', lat: 51.47, lon: -0.4543 },
  { name: 'Paris, France (CDG)', code: 'CDG', lat: 49.0097, lon: 2.5479 },
  { name: 'Tokyo, Japan (HND)', code: 'HND', lat: 35.5494, lon: 139.7798 },
  { name: 'Honolulu, HI (HNL)', code: 'HNL', lat: 21.3245, lon: -157.9251 },
  { name: 'Dubai, UAE (DXB)', code: 'DXB', lat: 25.2532, lon: 55.3657 },
  { name: 'Sydney, Australia (SYD)', code: 'SYD', lat: -33.9399, lon: 151.1753 },
];

export const PILOT_BADGES: BadgeDef[] = [
  {
    id: 'first-spot',
    title: 'First Sky Spot!',
    description: 'Log your very first airplane in your Sky Logbook.',
    emoji: '🌟',
    color: '#F59E0B',
  },
  {
    id: 'five-planes',
    title: 'Junior Tower Chief',
    description: 'Spot 5 different airplanes in the sky.',
    emoji: '🗼',
    color: '#0284C7',
  },
  {
    id: 'sky-high',
    title: 'Stratosphere Explorer',
    description: 'Spot a plane flying higher than 30,000 feet!',
    emoji: '☁️',
    color: '#6366F1',
  },
  {
    id: 'speed-demon',
    title: 'Speedy Jet Watcher',
    description: 'Spot a plane zooming faster than 450 mph!',
    emoji: '⚡',
    color: '#EC4899',
  },
  {
    id: 'chopper-fan',
    title: 'Chopper Spotter',
    description: 'Spot a hovering helicopter in the sky.',
    emoji: '🚁',
    color: '#059669',
  },
  {
    id: 'prop-pal',
    title: 'Propeller Pal',
    description: 'Spot a spinning-propeller airplane.',
    emoji: '🛩️',
    color: '#EA580C',
  },
  {
    id: 'cargo-crew',
    title: 'Cargo Crew',
    description: 'Spot a cargo plane delivering packages.',
    emoji: '📦',
    color: '#B45309',
  },
  {
    id: 'jumbo-boss',
    title: 'Superjumbo Spotter',
    description: 'Spot a giant wide-body or jumbo jet!',
    emoji: '👑',
    color: '#7C3AED',
  },
];

export const ENCYCLOPEDIA_ENTRIES: EncyclopediaEntry[] = [
  {
    id: 'jetliner',
    category: 'jetliner',
    title: 'Passenger Jetliner',
    subtitle: 'Boeing 737 & Airbus A320',
    tagline: 'The everyday sky buses that carry families on vacations!',
    color: '#0284C7',
    sizeComparison: 'About as long as 3 school buses parked bumper-to-bumper!',
    speedComparison: '530 mph — over 7 times faster than a car on the highway!',
    altitudeComparison: '35,000 feet — as high as 6 tall mountains stacked up!',
    funFacts: [
      'Those little bent tips on the ends of the wings are called winglets. They smooth out swirling air so the plane uses less fuel!',
      'Jet engines suck in huge amounts of cold air at the front, squeeze it, and shoot it out the back to push the plane forward.',
      'Even when it is freezing cold minus 60 degrees outside the window, the cabin stays cozy and warm inside!',
    ],
    spokenScript:
      'Meet the Passenger Jetliner, like the Boeing 737 and Airbus A320! These are the busy sky buses that fly families to visit grandparents and go on adventures. They cruise at 35,000 feet high, zooming at over 500 miles per hour — seven times faster than a car! Next time you look up and see a long white trail in the sky, it might be one of these friendly jets!',
    quiz: {
      question: 'What are the bent-up tips at the ends of jet wings called?',
      options: ['Flappers', 'Winglets', 'Sky Fins'],
      answerIndex: 1,
      explanation: 'They are called winglets! They cut down swirling air drag and save fuel.',
    },
  },
  {
    id: 'superjumbo',
    category: 'superjumbo',
    title: 'Giant Jumbo Jet',
    subtitle: 'Boeing 747, 787 & Airbus A380',
    tagline: 'Massive ocean-crossing giants with two aisles inside!',
    color: '#7C3AED',
    sizeComparison: 'Wingspan wider than a whole basketball court — 260 feet wide!',
    speedComparison: '570 mph — fast enough to cross an ocean while you sleep!',
    altitudeComparison: '40,000 feet — way above almost every rain cloud!',
    funFacts: [
      'The Airbus A380 has TWO full floors from nose to tail and can carry more than 500 people!',
      'A Boeing 747 has 18 wheels on the bottom to hold up its huge weight when it lands.',
      'The Boeing 787 Dreamliner has flexible wings made of carbon fiber that bend upward like a giant bird!',
    ],
    spokenScript:
      'Whoa, look at the Giant Jumbo Jet! Planes like the Boeing 747, the Dreamliner, and the double-decker Airbus A380 are built to fly all the way across oceans! The Airbus A380 has two full floors inside, and a Boeing 747 needs eighteen tires just to land safely. Their engines are so big you could almost park a small car inside one!',
    quiz: {
      question: 'How many full passenger floors does the giant Airbus A380 have?',
      options: ['One floor', 'Two full floors', 'Five floors'],
      answerIndex: 1,
      explanation: 'Two full decks! Passengers climb stairs inside the airplane to sit upstairs.',
    },
  },
  {
    id: 'propeller',
    category: 'propeller',
    title: 'Propeller Airplane',
    subtitle: 'Cessna Skyhawk & Dash 8',
    tagline: 'Spinning blades pull these friendly planes through the breeze!',
    color: '#EA580C',
    sizeComparison: 'Small ones are about the size of a family minivan with wings!',
    speedComparison: '140 to 400 mph — great for sightseeing close to the ground!',
    altitudeComparison: '5,000 to 20,000 feet — low enough to spot rivers and bridges!',
    funFacts: [
      'A propeller works just like a giant fan turned sideways, screwing through the air to pull the airplane forward.',
      'Almost every airline pilot started out learning to fly in a small propeller plane like a Cessna 172!',
      'Some special propeller planes even wear giant rubber floats on their feet so they can land right on lakes!',
    ],
    spokenScript:
      'Hear that buzzing sound in the sky? That is a Propeller Airplane! Instead of jet engines, it uses spinning blades on the front or wings to pull itself through the air, just like a giant fan. Small propeller planes fly lower and slower than big jets, which makes them awesome for spotting lakes, forests, and tiny houses below!',
    quiz: {
      question: 'What can some special propeller planes wear instead of wheels to land on water?',
      options: ['Giant floats', 'Roller skates', 'Snow skis'],
      answerIndex: 0,
      explanation: 'Floatplanes wear big pontoons or floats so they can splash down on lakes and rivers!',
    },
  },
  {
    id: 'helicopter',
    category: 'helicopter',
    title: 'Whirlybird Helicopter',
    subtitle: 'Rescue, Medical & Tour Choppers',
    tagline: 'No runway needed — it can fly up, down, sideways, and even backward!',
    color: '#059669',
    sizeComparison: 'Usually about as long as a school bus from nose to tail!',
    speedComparison: '150 mph — and 0 mph when hovering completely still!',
    altitudeComparison: '500 to 5,000 feet — low enough to wave at the pilot!',
    funFacts: [
      'A helicopter’s top blades are actually long, skinny spinning wings! Spinning them makes lift even when sitting still.',
      'The little rotor on the tail stops the helicopter body from spinning around in circles!',
      'Medical helicopters can land on tiny rooftop helipads right at hospitals to help people fast.',
    ],
    spokenScript:
      'Thump-thump-thump goes the helicopter! Helicopters are the acrobats of the sky because they do not need a runway at all. Their spinning top blades lift them straight up like an elevator, and they can hover completely still in mid-air like a hummingbird! That little spinner on the tail keeps the chopper pointing straight ahead.',
    quiz: {
      question: 'Why does a helicopter have a small spinning rotor on its tail?',
      options: ['To honk the horn', 'To keep the body from spinning', 'To blow clouds away'],
      answerIndex: 1,
      explanation: 'Without the tail rotor, the helicopter body would spin in the opposite direction of the main blades!',
    },
  },
  {
    id: 'cargo',
    category: 'cargo',
    title: 'Cargo Freighter',
    subtitle: 'FedEx, UPS & Giant 747 Freighters',
    tagline: 'Flying delivery trucks packed with toys, mail, and even zoo animals!',
    color: '#B45309',
    sizeComparison: 'A big cargo jet can hold as much stuff as 4 big semi-trucks!',
    speedComparison: '550 mph — delivering overnight across the whole country!',
    altitudeComparison: '36,000 feet — mostly flying while you are fast asleep!',
    funFacts: [
      'Cargo planes usually do not have passenger windows down the sides — inside it is one giant room filled with metal containers!',
      'On a Boeing 747 Freighter, the whole front nose flips open upward so long trucks and machinery can roll right inside!',
      'Special cargo planes even fly race cars, giant panda bears, and rescued dolphins across the world.',
    ],
    spokenScript:
      'Look out for the Cargo Freighter — the flying delivery truck of the sky! Instead of rows of passenger seats, cargo jets are packed from floor to ceiling with containers full of mail, fresh fruit, and birthday presents. On giant 747 freighters, the entire front nose opens up like a jaw so huge cargo can slide right inside!',
    quiz: {
      question: 'Why do most big cargo planes have no side windows?',
      options: ['The pilots like the dark', 'They carry boxes instead of passengers', 'Windows make them heavier than birds'],
      answerIndex: 1,
      explanation: 'Cargo planes carry freight containers instead of people, so having solid walls makes the plane lighter and stronger!',
    },
  },
  {
    id: 'rescue',
    category: 'rescue',
    title: 'Hero & Firefighting Planes',
    subtitle: 'Air Tankers, Coast Guard & Heavy Lifters',
    tagline: 'Brave crews flying water drops, coast rescues, and supply missions!',
    color: '#DC2626',
    sizeComparison: 'Air tankers can carry 3,000 to 10,000 gallons of water — like a backyard swimming pool!',
    speedComparison: '350 to 500 mph — racing fast to help people in trouble!',
    altitudeComparison: 'Drops water low at 200 feet, or cruises high at 30,000 feet!',
    funFacts: [
      'Firefighting air tankers drop bright red retardant that coats trees so wildfires cannot spread!',
      'Scooper planes can skim across a lake for just 12 seconds and slurp up over 1,600 gallons of water into their belly!',
      'Coast Guard planes have big bubble observation windows so crews can spot boats far out at sea.',
    ],
    spokenScript:
      'Here come the Hero Planes! Firefighting tankers carry whole swimming pools of water inside their bellies and swoosh low over forest fires to help put them out. Scooper planes can even skim across a lake like a duck and fill their tanks in twelve seconds! Coast Guard rescue planes also fly out over stormy oceans to find lost boats.',
    quiz: {
      question: 'How long does it take a water-scooper plane to fill its tank while skimming a lake?',
      options: ['About 12 seconds', 'Two whole hours', 'Three days'],
      answerIndex: 0,
      explanation: 'In just about 12 seconds of skimming across the water, a scooper plane fills up over 1,600 gallons!',
    },
  },
];
