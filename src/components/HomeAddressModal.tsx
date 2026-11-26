import React, { useState } from 'react';
import { Search, Compass, MapPin, X, Loader2 } from 'lucide-react';
import { HomeLocation } from '../types/aviation';

interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

interface HomeAddressModalProps {
  currentHome: HomeLocation;
  apiBase: string;
  onSelectHome: (next: HomeLocation) => void;
  onUseGps: () => void;
  onClose: () => void;
}

export const HomeAddressModal: React.FC<HomeAddressModalProps> = ({
  currentHome,
  apiBase,
  onSelectHome,
  onUseGps,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setErrorMsg('Please enter an address, neighborhood, or ZIP code.');
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/geocode?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error('Could not search addresses right now.');
      }
      const data = await res.json();
      const list = Array.isArray(data.results) ? (data.results as GeocodeResult[]) : [];
      setResults(list);
      if (list.length === 0) {
        setErrorMsg('No matching places found—try adding your city or ZIP code.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Address search failed.');
    } finally {
      setSearching(false);
    }
  };

  const formatShortName = (fullLabel: string) => {
    const parts = fullLabel.split(',').map((s) => s.trim());
    return parts.slice(0, 2).join(', ') || fullLabel;
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="home-modal-title">
      <div className="voice-modal-card">
        <div className="voice-modal-header">
          <div>
            <h2 id="home-modal-title">🏠 Set Your Home Address</h2>
            <p>
              Gives accurate compass directions &amp; distance from your yard. Stored only on this device.
            </p>
          </div>
          <button
            type="button"
            className="detail-close-btn"
            onClick={onClose}
            aria-label="Close home address dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="current-home-pill">
          <MapPin size={16} color="#0284C7" />
          <span>
            Current home: <strong>{currentHome.name}</strong>
          </span>
        </div>

        <form className="address-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="address-search-input"
            placeholder="Street address, city, or ZIP code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-address-search" disabled={searching}>
            {searching ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            <span>Find</span>
          </button>
        </form>

        {errorMsg && <p className="speech-notice">{errorMsg}</p>}

        {results.length > 0 && (
          <div className="address-results-list" role="listbox" aria-label="Matching addresses">
            {results.map((item, idx) => (
              <button
                key={`${item.lat}-${item.lon}-${idx}`}
                type="button"
                className="address-result-item"
                onClick={() => {
                  onSelectHome({
                    name: formatShortName(item.label),
                    code: 'HOME',
                    lat: Number(item.lat.toFixed(5)),
                    lon: Number(item.lon.toFixed(5)),
                  });
                  onClose();
                }}
              >
                <MapPin size={16} color="#0284C7" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="voice-modal-footer">
          <button
            type="button"
            className="btn-modal-secondary"
            style={{ flex: 1 }}
            onClick={() => {
              onUseGps();
              onClose();
            }}
          >
            <Compass size={16} />
            <span>Use Device GPS Instead</span>
          </button>

          <button type="button" className="btn-modal-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
