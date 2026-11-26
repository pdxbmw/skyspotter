import React from 'react';
import { Volume2, Square, X, Compass, Gauge, Mountain } from 'lucide-react';
import { CATEGORY_STYLES } from '../data/aviationKnowledge';
import { AircraftDetailsResponse, AircraftTelemetry } from '../types/aviation';
import {
  buildPlaneStory,
  getAltitudeComparison,
  getSpeedComparison,
  getVerticalStatus,
} from '../utils/flightHelpers';
import { PlaneIllustration } from './PlaneArt';

interface PlaneDetailCardProps {
  plane: AircraftTelemetry;
  details: AircraftDetailsResponse | null;
  loadingDetails: boolean;
  isSpeaking: boolean;
  speechNotice: string | null;
  onToggleSpeak: (story: string) => void;
  onClose: () => void;
}

export const PlaneDetailCard: React.FC<PlaneDetailCardProps> = ({
  plane,
  details,
  loadingDetails,
  isSpeaking,
  speechNotice,
  onToggleSpeak,
  onClose,
}) => {
  const style = CATEGORY_STYLES[plane.category];
  const vertical = getVerticalStatus(plane);
  const story = buildPlaneStory(plane, details);

  const originCode = details?.flightroute?.origin?.iata_code || plane.demoOrigin?.code;
  const originCity = details?.flightroute?.origin?.municipality || plane.demoOrigin?.city;
  const destCode = details?.flightroute?.destination?.iata_code || plane.demoDestination?.code;
  const destCity = details?.flightroute?.destination?.municipality || plane.demoDestination?.city;

  const modelTitle =
    details?.aircraft?.manufacturer && details?.aircraft?.type
      ? `${details.aircraft.manufacturer} ${details.aircraft.type}`
      : plane.friendlyModel;

  const airlineTitle = details?.flightroute?.airline?.name || plane.airlineName;
  const photoUrl = details?.aircraft?.url_photo_thumbnail || details?.aircraft?.url_photo;

  return (
    <aside className="plane-detail-card" aria-label={`Details for ${plane.callsign}`}>
      <div className="sheet-handle" aria-hidden="true" />
      <button
        type="button"
        className="detail-close-btn"
        onClick={onClose}
        aria-label="Close plane card"
      >
        <X size={22} />
      </button>

      <div className="detail-header">
        <div className="detail-art-box" style={{ background: style.bg }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${modelTitle} airplane`}
              className="detail-real-photo"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <PlaneIllustration category={plane.category} color={style.color} size={96} />
          )}
        </div>

        <div className="detail-title-col">
          <span
            className="category-pill"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {style.emoji} {style.label}
          </span>
          <h2 className="detail-callsign">{plane.callsign}</h2>
          <p className="detail-model">{modelTitle}</p>
          <p className="detail-airline">{airlineTitle}</p>
        </div>
      </div>

      {/* Where is it going? */}
      <div className="route-banner">
        {loadingDetails ? (
          <span className="route-loading">Checking flight path in the sky...</span>
        ) : originCity && destCity ? (
          <>
            <div className="route-cities">
              <div className="route-stop">
                <span className="route-code">{originCode || 'FROM'}</span>
                <span className="route-city">{originCity}</span>
              </div>
              <div className="route-arrow" aria-hidden="true">
                ✈️ ➔
              </div>
              <div className="route-stop">
                <span className="route-code">{destCode || 'TO'}</span>
                <span className="route-city">{destCity}</span>
              </div>
            </div>
            {details?.flightroute && (
              <div className="route-note">Typical route for flight {plane.callsign}</div>
            )}
          </>
        ) : (
          <div className="route-local">
            <Compass size={18} />
            <span>
              Flying {plane.bearingCardinal} of you, <strong>{plane.distanceMiles} miles</strong> away!
            </span>
          </div>
        )}
      </div>

      {/* Big Kid Stat Tiles */}
      <div className="kid-stats-grid">
        <div className="kid-stat-tile">
          <div className="kid-stat-top">
            <Mountain size={18} color="#0284C7" />
            <span>HOW HIGH?</span>
          </div>
          <div className="kid-stat-value">
            {plane.onGround
              ? 'On Runway'
              : plane.altitudeFt !== null
                ? `${plane.altitudeFt.toLocaleString()} ft`
                : 'Flying High'}
          </div>
          <p className="kid-stat-compare">
            {getAltitudeComparison(plane.altitudeFt, plane.onGround)}
          </p>
        </div>

        <div className="kid-stat-tile">
          <div className="kid-stat-top">
            <Gauge size={18} color="#EA580C" />
            <span>HOW FAST?</span>
          </div>
          <div className="kid-stat-value">
            {plane.speedMph !== null ? `${plane.speedMph} mph` : 'Cruising'}
          </div>
          <p className="kid-stat-compare">
            {getSpeedComparison(plane.speedMph, plane.onGround)}
          </p>
        </div>
      </div>

      <div className="vertical-status-pill" style={{ color: vertical.color }}>
        <span>{vertical.arrow}</span>
        <span>{vertical.label}</span>
        {plane.distanceMiles <= 6 && !plane.onGround && (
          <span className="look-up-badge">👀 Look outside right now!</span>
        )}
      </div>

      {/* Story preview & Yoto-style Voice Button */}
      <div className={`story-box ${isSpeaking ? 'is-speaking' : ''}`}>
        <p className="story-text">{story}</p>
      </div>

      {speechNotice && <p className="speech-notice">{speechNotice}</p>}

      <div className="detail-actions">
        <button
          type="button"
          className={`btn-chunky btn-voice ${isSpeaking ? 'is-playing' : ''}`}
          onClick={() => onToggleSpeak(story)}
        >
          {isSpeaking ? (
            <>
              <Square size={20} fill="currentColor" />
              <span>Stop Voice</span>
            </>
          ) : (
            <>
              <Volume2 size={22} />
              <span>Hear Plane Story!</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
