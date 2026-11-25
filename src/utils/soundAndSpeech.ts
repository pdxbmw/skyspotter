let audioCtx: AudioContext | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speakDelayTimer: number | null = null;
let keepAliveTimer: number | null = null;
let startupCheckTimer: number | null = null;

const VOICE_SETTINGS_KEY = 'skyspotter_voice_settings_v1';
const LEGACY_VOICE_KEY = 'skyspotter_voice_name';

export interface VoiceSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  includeAllVoices: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceName: '',
  rate: 1.0,
  pitch: 1.0,
  includeAllVoices: false,
};

const ROBOTIC_VOICE_NAMES = new Set([
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'eddy',
  'flo',
  'fred',
  'good news',
  'grandma',
  'grandpa',
  'jester',
  'junior',
  'kathy',
  'organ',
  'ralph',
  'reed',
  'rocko',
  'sandy',
  'shelley',
  'superstar',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
]);

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.09) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSpotChime() {
  playTone(523.25, 0, 0.14, 'triangle', 0.12);
  playTone(659.25, 0.09, 0.14, 'triangle', 0.12);
  playTone(783.99, 0.18, 0.25, 'triangle', 0.13);
}

export function playTapPing() {
  playTone(660, 0, 0.08, 'sine', 0.07);
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const nameLower = voice.name.toLowerCase();
  const baseName = nameLower.split('(')[0].trim();

  if (ROBOTIC_VOICE_NAMES.has(baseName) || /\((eloquence|compact)\)/i.test(voice.name)) {
    return -100;
  }

  let score = 0;
  if (voice.lang === 'en-GB') score += 12;
  else if (voice.lang === 'en-US') score += 10;
  else if (voice.lang.startsWith('en')) score += 5;

  if (/google uk english male/i.test(voice.name)) score += 100;
  if (/natural|neural|online/i.test(voice.name)) score += 90;
  if (/google us english/i.test(voice.name)) score += 85;
  if (/google uk english female/i.test(voice.name)) score += 80;
  if (/premium/i.test(voice.name)) score += 70;
  if (/enhanced/i.test(voice.name)) score += 60;
  if (/daniel/i.test(voice.name)) score += 40;
  if (/siri|ava|zoe|allison|nicky|evan|stephanie|karen/i.test(voice.name)) score += 30;
  if (/samantha/i.test(voice.name)) score += 10;

  return score;
}

export function getRankedEnglishVoices(includeAll = false): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith('en') && (includeAll || scoreVoice(v) > -50))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
      return {
        voiceName: typeof parsed.voiceName === 'string' ? parsed.voiceName : '',
        rate: typeof parsed.rate === 'number' ? Math.min(1.5, Math.max(0.6, parsed.rate)) : 1.0,
        pitch: typeof parsed.pitch === 'number' ? Math.min(1.5, Math.max(0.6, parsed.pitch)) : 1.0,
        includeAllVoices: Boolean(parsed.includeAllVoices),
      };
    }
    const legacyName = localStorage.getItem(LEGACY_VOICE_KEY) || '';
    if (legacyName) {
      return { ...DEFAULT_VOICE_SETTINGS, voiceName: legacyName };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_VOICE_SETTINGS };
}

export function saveVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function resolveActiveVoice(voiceName?: string): SpeechSynthesisVoice | undefined {
  const allEnglish = getRankedEnglishVoices(true);
  if (allEnglish.length === 0) return undefined;

  if (voiceName) {
    const exact = allEnglish.find((v) => v.name === voiceName);
    if (exact) return exact;
  }
  const clean = getRankedEnglishVoices(false);
  return clean[0] || allEnglish[0];
}

function clearSpeechTimers() {
  if (speakDelayTimer !== null) {
    window.clearTimeout(speakDelayTimer);
    speakDelayTimer = null;
  }
  if (keepAliveTimer !== null) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (startupCheckTimer !== null) {
    window.clearTimeout(startupCheckTimer);
    startupCheckTimer = null;
  }
}

export function stopSpeaking() {
  clearSpeechTimers();
  activeUtterance = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakStory(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (reason: string) => void;
    overrideSettings?: VoiceSettings;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.('Speech playback is not supported in this browser.');
    return false;
  }

  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;
  clearSpeechTimers();

  const settings = callbacks?.overrideSettings ?? loadVoiceSettings();

  const startUtterance = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    const chosen = resolveActiveVoice(settings.voiceName);
    if (chosen) {
      utterance.voice = chosen;
    }

    let started = false;
    activeUtterance = utterance;

    utterance.onstart = () => {
      started = true;
      if (startupCheckTimer !== null) {
        window.clearTimeout(startupCheckTimer);
        startupCheckTimer = null;
      }
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      clearSpeechTimers();
      callbacks?.onEnd?.();
    };

    utterance.onerror = (event) => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      clearSpeechTimers();
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        callbacks?.onError?.('Could not play browser voice — check system volume or read the story below.');
      }
      callbacks?.onEnd?.();
    };

    synth.speak(utterance);
    if (synth.paused) {
      synth.resume();
    }

    keepAliveTimer = window.setInterval(() => {
      if (!synth.speaking) {
        if (keepAliveTimer !== null) {
          window.clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        return;
      }
      if (synth.paused) {
        synth.resume();
      }
    }, 3000);

    startupCheckTimer = window.setTimeout(() => {
      if (!started && !synth.speaking) {
        callbacks?.onError?.('Browser voice did not start — check your browser sound or read the story below.');
        callbacks?.onEnd?.();
      }
    }, 1500);
  };

  if (wasBusy) {
    synth.cancel();
    speakDelayTimer = window.setTimeout(startUtterance, 60);
  } else {
    startUtterance();
  }

  return true;
}
