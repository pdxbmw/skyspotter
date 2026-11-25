import React, { useEffect, useState } from 'react';
import { Volume2, Square, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_VOICE_SETTINGS,
  getRankedEnglishVoices,
  resolveActiveVoice,
  speakStory,
  stopSpeaking,
  VoiceSettings,
} from '../utils/soundAndSpeech';

interface VoiceSettingsModalProps {
  settings: VoiceSettings;
  onChange: (next: VoiceSettings) => void;
  onClose: () => void;
}

const SAMPLE_TEXT =
  'Hello pilot! Look up in the sky — that Boeing 737 is zooming at 500 miles per hour!';

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    getRankedEnglishVoices(settings.includeAllVoices)
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setVoices(getRankedEnglishVoices(settings.includeAllVoices));
    refresh();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refresh);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
    }
    return undefined;
  }, [settings.includeAllVoices]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const activeVoice = resolveActiveVoice(settings.voiceName);
  const selectValue = settings.voiceName || activeVoice?.name || '';

  const handleTest = () => {
    if (isTesting) {
      stopSpeaking();
      setIsTesting(false);
      return;
    }
    setTestError(null);
    setIsTesting(true);
    speakStory(SAMPLE_TEXT, {
      overrideSettings: settings,
      onStart: () => setIsTesting(true),
      onEnd: () => setIsTesting(false),
      onError: (msg) => setTestError(msg),
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
      <div className="voice-modal-card">
        <div className="voice-modal-header">
          <div>
            <h2 id="voice-modal-title">🎙️ Narrator Voice Settings</h2>
            <p>Saved automatically for plane stories &amp; the Plane Guide.</p>
          </div>
          <button
            type="button"
            className="detail-close-btn"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            aria-label="Close voice settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="voice-field">
          <label htmlFor="narrator-voice-select">Voice</label>
          <select
            id="narrator-voice-select"
            className="voice-modal-select"
            value={selectValue}
            onChange={(e) => onChange({ ...settings, voiceName: e.target.value })}
          >
            {voices.length === 0 ? (
              <option value="">Browser Default Voice</option>
            ) : (
              voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))
            )}
          </select>

          <label className="voice-checkbox-row">
            <input
              type="checkbox"
              checked={settings.includeAllVoices}
              onChange={(e) =>
                onChange({ ...settings, includeAllVoices: e.target.checked })
              }
            />
            <span>Show all English voices (including novelty macOS voices)</span>
          </label>
        </div>

        <div className="voice-sliders-grid">
          <div className="voice-field">
            <div className="slider-label-row">
              <label htmlFor="voice-rate-range">Speed</label>
              <span>{settings.rate.toFixed(2)}×</span>
            </div>
            <input
              id="voice-rate-range"
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={settings.rate}
              onChange={(e) =>
                onChange({ ...settings, rate: Number.parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="voice-field">
            <div className="slider-label-row">
              <label htmlFor="voice-pitch-range">Pitch</label>
              <span>{settings.pitch.toFixed(2)}</span>
            </div>
            <input
              id="voice-pitch-range"
              type="range"
              min="0.75"
              max="1.25"
              step="0.05"
              value={settings.pitch}
              onChange={(e) =>
                onChange({ ...settings, pitch: Number.parseFloat(e.target.value) })
              }
            />
          </div>
        </div>

        {testError && <p className="speech-notice">{testError}</p>}

        <div className="voice-modal-footer">
          <button
            type="button"
            className={`btn-chunky btn-voice ${isTesting ? 'is-playing' : ''}`}
            onClick={handleTest}
          >
            {isTesting ? (
              <>
                <Square size={18} fill="currentColor" />
                <span>Stop Test</span>
              </>
            ) : (
              <>
                <Volume2 size={20} />
                <span>Test Voice</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-modal-secondary"
            onClick={() => {
              stopSpeaking();
              setIsTesting(false);
              onChange({ ...DEFAULT_VOICE_SETTINGS });
            }}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="btn-modal-done"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
