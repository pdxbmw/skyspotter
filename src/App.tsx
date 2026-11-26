import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Radar,
  RefreshCw,
  BookOpen,
  Compass,
  Home,
  SlidersHorizontal,
  MoreHorizontal,
  Check,
  Plane,
  X,
  Maximize2,
  Minimize2,
  Menu,
  Plus,
  Minus,
} from 'lucide-react';
import { PlaneDetailCard } from './components/PlaneDetailCard';
import { PlaneGuide } from './components/PlaneGuide';
import { MapFocusTarget, SkyMap, ViewportBounds } from './components/SkyMap';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { HomeAddressModal } from './components/HomeAddressModal';
import {
  CATEGORY_STYLES,
  LOCATION_PRESETS,
} from './data/aviationKnowledge';
import {
  AircraftDetailsResponse,
  AircraftTelemetry,
  EncyclopediaEntry,
  HomeLocation,
} from './types/aviation';
import {
  haversineMiles,
  normalizeAdsbAircraft,
} from './utils/flightHelpers';
import {
  loadVoiceSettings,
  saveVoiceSettings,
  speakStory,
  stopSpeaking,
  VoiceSettings,
} from './utils/soundAndSpeech';

type ActiveTab = 'map' | 'guide';

const STORAGE_KEY = 'skyspotter_kidplane_v1';
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

interface PersistedState {
  solvedQuizzes: string[];
  home: HomeLocation;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const savedHome =
        parsed.home?.lat && parsed.home?.lon
          ? {
              ...parsed.home,
              name: parsed.home.name.replace(/^(\d+[a-zA-Z-]*),\s+/, '$1 '),
            }
          : LOCATION_PRESETS[0];
      return {
        solvedQuizzes: Array.isArray(parsed.solvedQuizzes) ? parsed.solvedQuizzes : [],
        home: savedHome,
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    solvedQuizzes: [],
    home: LOCATION_PRESETS[0],
  };
}

export function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [tab, setTab] = useState<ActiveTab>('map');
  const [home, setHome] = useState<HomeLocation>(initial.home);
  const [scanViewport, setScanViewport] = useState<{
    lat: number;
    lon: number;
    zoom: number;
    radiusNm: number;
    bounds: ViewportBounds | null;
  }>({
    lat: initial.home.lat,
    lon: initial.home.lon,
    zoom: 10,
    radiusNm: 50,
    bounds: null,
  });
  const [jumpHomeSeq, setJumpHomeSeq] = useState(0);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);
  const [showRadarRings, setShowRadarRings] = useState(true);
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [showPlanesList, setShowPlanesList] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showStatusDetail, setShowStatusDetail] = useState(false);
  const [zoomRequest, setZoomRequest] = useState<{ delta: number; seq: number } | null>(null);

  const [livePlanes, setLivePlanes] = useState<AircraftTelemetry[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [liveErrorMsg, setLiveErrorMsg] = useState<string | null>(null);
  const [feedSource, setFeedSource] = useState<string>('live');
  const [globalTotal, setGlobalTotal] = useState<number | null>(null);

  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, AircraftDetailsResponse>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [solvedQuizzes, setSolvedQuizzes] = useState<string[]>(initial.solvedQuizzes);
  const [isIdlePaused, setIsIdlePaused] = useState(false);

  const viewportDebounceRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleVoiceSettingsChange = (next: VoiceSettings) => {
    setVoiceSettings(next);
    saveVoiceSettings(next);
  };

  // Close map options popover on outside click
  useEffect(() => {
    if (!showMapMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMapMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMapMenu]);

  // Persist home location & quiz stars
  useEffect(() => {
    try {
      const payload: PersistedState = {
        solvedQuizzes,
        home,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [solvedQuizzes, home]);

  const selectedPlane = useMemo(
    () => livePlanes.find((p) => p.id === selectedPlaneId) ?? null,
    [livePlanes, selectedPlaneId]
  );

  const fetchLiveFlights = useCallback(async () => {
    setLoadingFlights(true);
    try {
      const useWorldMode = scanViewport.zoom < 8;
      let url = `${API_BASE}/api/flights?lat=${scanViewport.lat.toFixed(4)}&lon=${scanViewport.lon.toFixed(4)}&radius=${scanViewport.radiusNm}`;
      if (useWorldMode) {
        const b = scanViewport.bounds ?? { lamin: -75, lomin: -180, lamax: 75, lomax: 180 };
        url = `${API_BASE}/api/flights?mode=world&lamin=${b.lamin.toFixed(2)}&lomin=${b.lomin.toFixed(2)}&lamax=${b.lamax.toFixed(2)}&lomax=${b.lomax.toFixed(2)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Feed returned ${res.status}`);
      }
      const data = await res.json();
      const normalized = normalizeAdsbAircraft(
        Array.isArray(data.ac) ? data.ac : [],
        home.lat,
        home.lon
      );

      if (data.source === 'opensky-world') {
        setLivePlanes(normalized.slice(0, 160));
        setGlobalTotal(typeof data.globalTotal === 'number' ? data.globalTotal : null);
      } else {
        const airborne = normalized.filter((p) => !p.onGround).slice(0, 85);
        const onGround = normalized.filter((p) => p.onGround).slice(0, 10);
        setLivePlanes([...airborne, ...onGround]);
        setGlobalTotal(null);
      }
      setFeedSource(data.source || 'live');
      setLiveStatus('ok');
      setLiveErrorMsg(null);
    } catch (err) {
      setLiveStatus('error');
      setLiveErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not reach live flight radar right now.'
      );
    } finally {
      setLoadingFlights(false);
    }
  }, [scanViewport, home.lat, home.lon]);

  // Track user interaction so open-but-unattended browser tabs pause after 5 minutes
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
      setIsIdlePaused((prev) => (prev ? false : prev));
    };
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('keydown', markActive);
    window.addEventListener('wheel', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('wheel', markActive);
      window.removeEventListener('touchstart', markActive);
    };
  }, []);

  // Poll live flights every 20s locally (30s in world view), pausing when hidden, on Plane Guide, or idle > 5 min
  useEffect(() => {
    if (tab !== 'map' || isIdlePaused) return;
    let lastFetchedAt = Date.now();
    if (!document.hidden) {
      fetchLiveFlights();
    }

    const IDLE_PAUSE_MS = 5 * 60 * 1000;
    const intervalMs = scanViewport.zoom < 8 ? 30000 : 20000;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - lastActivityRef.current > IDLE_PAUSE_MS) {
        setIsIdlePaused(true);
        return;
      }
      lastFetchedAt = Date.now();
      fetchLiveFlights();
    }, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden && Date.now() - lastFetchedAt > 15000) {
        lastActivityRef.current = Date.now();
        lastFetchedAt = Date.now();
        fetchLiveFlights();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tab, isIdlePaused, fetchLiveFlights, scanViewport.zoom]);

  const handleViewportChange = useCallback(
    (lat: number, lon: number, zoom: number, bounds: ViewportBounds) => {
      if (viewportDebounceRef.current) {
        window.clearTimeout(viewportDebounceRef.current);
      }
      viewportDebounceRef.current = window.setTimeout(() => {
        const radiusNm = zoom >= 11 ? 40 : zoom >= 9 ? 85 : zoom >= 8 ? 175 : 250;
        setScanViewport({ lat, lon, zoom, radiusNm, bounds });
      }, 350);
    },
    []
  );

  // Fetch route/photo details when a live plane is selected
  useEffect(() => {
    if (!selectedPlane) return;
    const key = `${selectedPlane.hex}:${selectedPlane.callsign}`;
    if (detailsCache[key]) return;

    let cancelled = false;
    setLoadingDetails(true);

    fetch(
      `${API_BASE}/api/aircraft?hex=${encodeURIComponent(selectedPlane.hex)}&callsign=${encodeURIComponent(selectedPlane.callsign)}`
    )
      .then((res) => (res.ok ? res.json() : { aircraft: null, flightroute: null }))
      .then((data: AircraftDetailsResponse) => {
        if (!cancelled) {
          setDetailsCache((prev) => ({ ...prev, [key]: data }));
        }
      })
      .catch(() => {
        // Keep graceful fallback
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlane, detailsCache]);

  const handleSelectPlane = useCallback((plane: AircraftTelemetry) => {
    stopSpeaking();
    setSpeakingId(null);
    setSelectedPlaneId(plane.id);
  }, []);

  const handleTogglePlaneSpeak = (story: string) => {
    if (!selectedPlane) return;
    const key = `plane-${selectedPlane.id}`;
    if (speakingId === key) {
      stopSpeaking();
      setSpeakingId(null);
      setSpeechNotice(null);
      return;
    }
    setSpeechNotice(null);
    setSpeakingId(key);
    speakStory(story, {
      onStart: () => setSpeakingId(key),
      onEnd: () => setSpeakingId(null),
      onError: (msg) => setSpeechNotice(msg),
    });
  };

  const handleSpeakGuideEntry = (entry: EncyclopediaEntry) => {
    const key = `guide-${entry.id}`;
    if (speakingId === key) {
      stopSpeaking();
      setSpeakingId(null);
      setSpeechNotice(null);
      return;
    }
    setSpeechNotice(null);
    setSpeakingId(key);
    speakStory(entry.spokenScript, {
      onStart: () => setSpeakingId(key),
      onEnd: () => setSpeakingId(null),
      onError: (msg) => setSpeechNotice(msg),
    });
  };

  const handleSolveQuiz = (quizId: string) => {
    if (solvedQuizzes.includes(quizId)) return;
    setSolvedQuizzes((prev) => [...prev, quizId]);
  };

  const handleUseMyLocation = () => {
    setShowMapMenu(false);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextHome = {
          name: 'My Sky Spot',
          code: 'HOME',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        };
        setHome(nextHome);
        setScanViewport({
          lat: nextHome.lat,
          lon: nextHome.lon,
          zoom: 10,
          radiusNm: 50,
          bounds: null,
        });
        setSelectedPlaneId(null);
      },
      () => {
        // Silently keep current location if denied
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  const handleJumpHome = () => {
    setScanViewport({ lat: home.lat, lon: home.lon, zoom: 10, radiusNm: 50, bounds: null });
    setJumpHomeSeq((prev) => prev + 1);
  };

  const isExploringAway =
    haversineMiles(home.lat, home.lon, scanViewport.lat, scanViewport.lon) > 25;
  const activeDetails = selectedPlane
    ? detailsCache[`${selectedPlane.hex}:${selectedPlane.callsign}`] ?? null
    : null;

  return (
    <div
      className={`app-shell ${tab === 'map' ? 'is-map-mode' : ''} ${
        tab === 'map' && isFullScreen ? 'is-fullscreen' : ''
      }`}
    >
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">
            ✈️
          </div>
          <div className="brand-text">
            <h1 className="brand-title">SkySpotter</h1>
            <p className="brand-sub">KidPlane Live Radar</p>
          </div>
        </div>

        <nav className="main-tabs" aria-label="Main sections">
          <button
            type="button"
            className={`nav-tab-btn ${tab === 'map' ? 'is-active' : ''}`}
            onClick={() => setTab('map')}
            aria-label="Sky Map"
            title="Sky Map"
          >
            <Radar size={20} />
            <span className="nav-tab-label">Sky Map</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${tab === 'guide' ? 'is-active' : ''}`}
            onClick={() => setTab('guide')}
            aria-label="Plane Guide"
            title="Plane Guide"
          >
            <BookOpen size={20} />
            <span className="nav-tab-label">Plane Guide</span>
          </button>
        </nav>

        <button
          type="button"
          className="btn-voice-settings"
          onClick={() => {
            stopSpeaking();
            setSpeakingId(null);
            setShowVoiceModal(true);
          }}
          aria-label="Voice Settings"
          title="Choose narrator voice, speed & pitch"
        >
          <SlidersHorizontal size={18} />
          <span>{voiceSettings.voiceName || 'Voice Settings'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {tab === 'map' && (
          <div className="map-workspace">
            {/* Compact Control Strip (no horizontal scroll) */}
            <div className="map-controls-bar">
              <div className="controls-left">
                <div className="location-picker">
                  <MapPin size={16} color="#0284C7" />
                  <select
                    aria-label="Choose home city"
                    value={home.code}
                    onChange={(e) => {
                      if (e.target.value === '__SET_HOME__') {
                        setShowHomeModal(true);
                        return;
                      }
                      const preset = LOCATION_PRESETS.find((l) => l.code === e.target.value);
                      if (preset) {
                        setHome(preset);
                        setScanViewport({
                          lat: preset.lat,
                          lon: preset.lon,
                          zoom: 10,
                          radiusNm: 50,
                          bounds: null,
                        });
                        setSelectedPlaneId(null);
                      }
                    }}
                  >
                    {home.code === 'HOME' && <option value="HOME">🏠 {home.name}</option>}
                    <option value="__SET_HOME__">🏠 Set Home Address...</option>
                    {LOCATION_PRESETS.map((loc) => (
                      <option key={loc.code} value={loc.code}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isExploringAway && (
                  <button
                    type="button"
                    className="btn-jump-home"
                    onClick={handleJumpHome}
                    aria-label={`Back to ${home.name}`}
                    title={`Jump back to ${home.name}`}
                  >
                    <Home size={15} />
                    <span className="hide-mobile">Back Home</span>
                  </button>
                )}
              </div>

              <div className="controls-right">
                <button
                  type="button"
                  className={`btn-pill-toggle ${showPlanesList ? 'is-on' : ''}`}
                  onClick={() => setShowPlanesList(true)}
                  title="View nearby planes list"
                >
                  <Plane size={15} />
                  <span>{livePlanes.length}</span>
                </button>

                <button
                  type="button"
                  className="btn-pill-toggle"
                  onClick={fetchLiveFlights}
                  disabled={loadingFlights}
                  aria-label="Refresh live radar"
                  title="Refresh live radar"
                >
                  <RefreshCw size={15} className={loadingFlights ? 'spin' : ''} />
                </button>

                <div className="map-menu-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className={`btn-pill-toggle ${showMapMenu ? 'is-on' : ''}`}
                    onClick={() => setShowMapMenu((prev) => !prev)}
                    aria-expanded={showMapMenu}
                    aria-label="Map options"
                    title="Map options"
                  >
                    <MoreHorizontal size={17} />
                    <span className="hide-mobile">Options</span>
                  </button>

                  {showMapMenu && (
                    <div className="map-options-popover" role="menu">
                      <button
                        type="button"
                        className="map-option-item"
                        role="menuitem"
                        onClick={() => {
                          setShowMapMenu(false);
                          setShowHomeModal(true);
                        }}
                      >
                        <Home size={16} color="#0284C7" />
                        <span>Set Home Address</span>
                      </button>

                      <button
                        type="button"
                        className="map-option-item"
                        role="menuitem"
                        onClick={handleUseMyLocation}
                      >
                        <Compass size={16} color="#0284C7" />
                        <span>Use My Location (GPS)</span>
                      </button>

                      <button
                        type="button"
                        className="map-option-item"
                        role="menuitemcheckbox"
                        aria-checked={showRadarRings}
                        onClick={() => {
                          setShowRadarRings((prev) => !prev);
                          setShowMapMenu(false);
                        }}
                      >
                        <Radar size={16} color="#0284C7" />
                        <span>Show Radar Rings</span>
                        {showRadarRings && <Check size={16} className="option-check" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live error notice */}
            {liveStatus === 'error' && (
              <div className="live-fallback-banner">
                <div>
                  <strong>Live sky radar couldn’t connect right now</strong>
                  <span> ({liveErrorMsg || 'offline or rate-limited'})</span>
                </div>
                <button
                  type="button"
                  className="btn-switch-demo"
                  onClick={fetchLiveFlights}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Map + Detail Card Split Area */}
            <div className="map-stage">
              <div className="map-container-wrap">
                <SkyMap
                  home={home}
                  planes={livePlanes}
                  selectedPlaneId={selectedPlaneId}
                  showRadarRings={showRadarRings}
                  focusTarget={focusTarget}
                  jumpHomeSeq={jumpHomeSeq}
                  zoomRequest={zoomRequest}
                  onSelectPlane={handleSelectPlane}
                  onViewportChange={handleViewportChange}
                />

                <button
                  type="button"
                  className={`map-status-chip ${showStatusDetail ? 'is-expanded' : ''}`}
                  onClick={() => setShowStatusDetail((prev) => !prev)}
                  aria-expanded={showStatusDetail}
                  title="Tap for radar status details"
                >
                  <span
                    className={`status-dot ${
                      liveStatus === 'ok' && !isIdlePaused ? 'is-live' : 'is-demo'
                    }`}
                  />
                  {showStatusDetail ? (
                    <span>
                      {isIdlePaused
                        ? 'Radar paused (idle) — tap map to resume'
                        : liveStatus === 'ok'
                          ? feedSource === 'opensky-world' && globalTotal
                            ? `World Sky • ${livePlanes.length} of ${globalTotal.toLocaleString()} flights`
                            : `Live Radar (${feedSource}) • ${livePlanes.length} planes`
                          : liveStatus === 'error'
                            ? 'Radar offline — tap Retry'
                            : 'Connecting Live Radar...'}
                    </span>
                  ) : (
                    <span className="status-short-label">
                      {isIdlePaused
                        ? 'Paused'
                        : liveStatus === 'ok'
                          ? feedSource === 'opensky-world'
                            ? 'World'
                            : 'Live'
                          : liveStatus === 'error'
                            ? 'Offline'
                            : '...'}
                    </span>
                  )}
                </button>

                {!isFullScreen && (
                  <button
                    type="button"
                    className="map-fullscreen-btn"
                    onClick={() => {
                      setShowMapMenu(false);
                      setIsFullScreen(true);
                    }}
                    aria-label="Full screen map"
                    title="Full screen map"
                  >
                    <Maximize2 size={18} />
                  </button>
                )}

                <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
                  <button
                    type="button"
                    className="map-zoom-btn"
                    onClick={() => setZoomRequest({ delta: 1, seq: Date.now() })}
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    type="button"
                    className="map-zoom-btn"
                    onClick={() => setZoomRequest({ delta: -1, seq: Date.now() })}
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <Minus size={18} />
                  </button>
                </div>

                {isFullScreen && (
                  <div className="fullscreen-floating-bar">
                    {isExploringAway && (
                      <button
                        type="button"
                        className="fs-pill-btn"
                        onClick={handleJumpHome}
                        aria-label={`Back to ${home.name}`}
                        title={`Back to ${home.name}`}
                      >
                        <Home size={15} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="fs-pill-btn"
                      onClick={() => setShowPlanesList(true)}
                      aria-label="View nearby planes"
                      title="View nearby planes"
                    >
                      <Plane size={15} />
                      <span>{livePlanes.length}</span>
                    </button>

                    <div className="map-menu-wrap" ref={menuRef}>
                      <button
                        type="button"
                        className={`fs-pill-btn ${showMapMenu ? 'is-on' : ''}`}
                        onClick={() => setShowMapMenu((prev) => !prev)}
                        aria-expanded={showMapMenu}
                        aria-label="Menu"
                        title="Menu"
                      >
                        <Menu size={16} />
                      </button>

                      {showMapMenu && (
                        <div className="map-options-popover" role="menu">
                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitem"
                            onClick={() => {
                              setShowMapMenu(false);
                              setIsFullScreen(false);
                              setTab('guide');
                            }}
                          >
                            <BookOpen size={16} color="#0284C7" />
                            <span>Plane Guide</span>
                          </button>

                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitem"
                            onClick={() => {
                              setShowMapMenu(false);
                              setShowHomeModal(true);
                            }}
                          >
                            <Home size={16} color="#0284C7" />
                            <span>Set Home Address</span>
                          </button>

                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitem"
                            onClick={handleUseMyLocation}
                          >
                            <Compass size={16} color="#0284C7" />
                            <span>Use My Location (GPS)</span>
                          </button>

                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitem"
                            onClick={() => {
                              setShowMapMenu(false);
                              stopSpeaking();
                              setSpeakingId(null);
                              setShowVoiceModal(true);
                            }}
                          >
                            <SlidersHorizontal size={16} color="#0284C7" />
                            <span>Voice Settings</span>
                          </button>

                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitemcheckbox"
                            aria-checked={showRadarRings}
                            onClick={() => {
                              setShowRadarRings((prev) => !prev);
                              setShowMapMenu(false);
                            }}
                          >
                            <Radar size={16} color="#0284C7" />
                            <span>Show Radar Rings</span>
                            {showRadarRings && <Check size={16} className="option-check" />}
                          </button>

                          <button
                            type="button"
                            className="map-option-item"
                            role="menuitem"
                            onClick={() => {
                              setShowMapMenu(false);
                              fetchLiveFlights();
                            }}
                          >
                            <RefreshCw size={16} color="#0284C7" />
                            <span>Refresh Radar</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="fs-pill-btn"
                      onClick={() => {
                        setShowMapMenu(false);
                        setIsFullScreen(false);
                      }}
                      aria-label="Exit full screen"
                      title="Exit full screen"
                    >
                      <Minimize2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {selectedPlane && (
                <PlaneDetailCard
                  plane={selectedPlane}
                  details={activeDetails}
                  loadingDetails={loadingDetails}
                  isSpeaking={speakingId === `plane-${selectedPlane.id}`}
                  speechNotice={speechNotice}
                  onToggleSpeak={handleTogglePlaneSpeak}
                  onClose={() => {
                    stopSpeaking();
                    setSpeakingId(null);
                    setSpeechNotice(null);
                    setSelectedPlaneId(null);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {tab === 'guide' && (
          <PlaneGuide
            speakingId={speakingId}
            speechNotice={speechNotice}
            solvedQuizzes={solvedQuizzes}
            onSpeakEntry={handleSpeakGuideEntry}
            onSolveQuiz={handleSolveQuiz}
          />
        )}
      </main>

      {showVoiceModal && (
        <VoiceSettingsModal
          settings={voiceSettings}
          onChange={handleVoiceSettingsChange}
          onClose={() => setShowVoiceModal(false)}
        />
      )}

      {showPlanesList && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="nearby-modal-title">
          <div className="voice-modal-card nearby-modal-card">
            <div className="voice-modal-header">
              <div>
                <h2 id="nearby-modal-title">✈️ Planes in the Sky ({livePlanes.length})</h2>
                <p>Sorted closest to {home.name}. Tap one to zoom &amp; learn more.</p>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setShowPlanesList(false)}
                aria-label="Close planes list"
              >
                <X size={20} />
              </button>
            </div>

            {livePlanes.length === 0 ? (
              <div className="nearby-empty">
                {loadingFlights
                  ? 'Scanning the sky for airplanes...'
                  : 'No planes found nearby right now. Try zooming out!'}
              </div>
            ) : (
              <div className="nearby-vertical-list">
                {livePlanes.slice(0, 30).map((plane) => {
                  const cat = CATEGORY_STYLES[plane.category];
                  const active = plane.id === selectedPlaneId;
                  return (
                    <button
                      key={plane.id}
                      type="button"
                      className={`nearby-vertical-row ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        setShowPlanesList(false);
                        handleSelectPlane(plane);
                        setFocusTarget({ lat: plane.lat, lon: plane.lon, seq: Date.now() });
                      }}
                    >
                      <span className="chip-emoji" style={{ backgroundColor: cat.bg }}>
                        {cat.emoji}
                      </span>
                      <div className="nearby-row-main">
                        <div className="nearby-row-top">
                          <strong>{plane.callsign}</strong>
                          <span className="nearby-row-model">{plane.friendlyModel}</span>
                        </div>
                        <span className="nearby-row-sub">
                          {plane.distanceMiles} mi {plane.bearingCardinal}
                          {plane.altitudeFt ? ` • ${plane.altitudeFt.toLocaleString()} ft` : ''}
                          {plane.speedMph ? ` • ${plane.speedMph} mph` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showHomeModal && (
        <HomeAddressModal
          currentHome={home}
          apiBase={API_BASE}
          onSelectHome={(nextHome) => {
            setHome(nextHome);
            setScanViewport({
              lat: nextHome.lat,
              lon: nextHome.lon,
              zoom: 11,
              radiusNm: 40,
              bounds: null,
            });
            setSelectedPlaneId(null);
          }}
          onUseGps={handleUseMyLocation}
          onClose={() => setShowHomeModal(false)}
        />
      )}
    </div>
  );
}

export default App;
