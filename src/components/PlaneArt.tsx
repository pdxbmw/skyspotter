import React from 'react';
import { CATEGORY_STYLES } from '../data/aviationKnowledge';
import { PlaneCategory } from '../types/aviation';

interface PlaneIllustrationProps {
  category: PlaneCategory;
  color?: string;
  size?: number;
}

export const PlaneIllustration: React.FC<PlaneIllustrationProps> = ({
  category,
  color,
  size = 92,
}) => {
  const accent = color || CATEGORY_STYLES[category].color;

  if (category === 'helicopter') {
    return (
      <svg width={size} height={size} viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <rect x="18" y="14" width="84" height="6" rx="3" fill="#0F172A" />
        <rect x="57" y="18" width="6" height="12" rx="2" fill="#334155" />
        <path d="M12 46 L46 42 L46 52 L14 50 Z" fill={accent} />
        <circle cx="12" cy="48" r="7" stroke="#0F172A" strokeWidth="3" fill="#E2E8F0" />
        <ellipse cx="64" cy="48" rx="28" ry="18" fill={accent} />
        <path d="M68 33 C82 33 89 41 89 50 L62 50 L62 34 Z" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
        <path d="M40 68 L84 68 M48 62 L44 68 M74 62 L78 68" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === 'propeller') {
    return (
      <svg width={size} height={size} viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path d="M26 42 L100 38 L108 45 L100 54 L26 52 Z" fill={accent} />
        <path d="M22 44 L16 26 L30 26 L38 44 Z" fill={accent} />
        <rect x="44" y="25" width="40" height="9" rx="4.5" fill="#FBBF24" stroke="#0F172A" strokeWidth="2.5" />
        <path d="M55 34 L76 34 L82 44 L55 44 Z" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
        <rect x="108" y="24" width="5" height="44" rx="2.5" fill="#0F172A" />
        <circle cx="109" cy="46" r="5" fill="#F97316" />
        <circle cx="64" cy="64" r="6" fill="#0F172A" />
        <circle cx="94" cy="63" r="5" fill="#0F172A" />
        <path d="M64 53 L64 60 M93 53 L94 59" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === 'superjumbo') {
    return (
      <svg width={size} height={size} viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path d="M16 46 L26 20 L40 20 L34 46 Z" fill={accent} />
        <path d="M18 42 C18 33 44 28 84 31 C100 32 110 40 112 49 C110 56 96 60 80 60 L24 58 C18 57 16 50 18 42 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
        <path d="M18 48 L111 49 C109 56 96 60 80 60 L24 58 C20 57 18 53 18 48 Z" fill={accent} />
        <path d="M88 35 C96 35 102 38 104 42 L88 42 Z" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2" />
        <circle cx="42" cy="40" r="2.2" fill="#0F172A" />
        <circle cx="50" cy="40" r="2.2" fill="#0F172A" />
        <circle cx="58" cy="40" r="2.2" fill="#0F172A" />
        <circle cx="66" cy="40" r="2.2" fill="#0F172A" />
        <circle cx="74" cy="40" r="2.2" fill="#0F172A" />
        <path d="M46 53 L78 53 L60 72 L40 72 Z" fill={accent} stroke="#0F172A" strokeWidth="2.5" />
        <rect x="52" y="61" width="16" height="9" rx="4" fill="#334155" />
      </svg>
    );
  }

  if (category === 'cargo' || category === 'rescue') {
    const stripe = category === 'rescue' ? '#FBBF24' : accent;
    return (
      <svg width={size} height={size} viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path d="M16 46 L24 18 L40 18 L34 46 Z" fill={accent} />
        <path d="M18 44 C20 35 45 33 88 34 C102 35 110 42 112 51 C110 58 98 61 84 61 L24 59 C19 58 17 51 18 44 Z" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
        <rect x="24" y="45" width="76" height="6" rx="2" fill={stripe} />
        <path d="M88 36 C96 37 102 40 105 44 L88 44 Z" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2" />
        <path d="M45 48 L75 48 L60 70 L40 70 Z" fill={accent} stroke="#0F172A" strokeWidth="2.5" />
        <circle cx="48" cy="65" r="5" fill="#0F172A" />
        <circle cx="62" cy="65" r="5" fill="#0F172A" />
        <circle cx="92" cy="64" r="4" fill="#0F172A" />
      </svg>
    );
  }

  // Default jetliner
  return (
    <svg width={size} height={size} viewBox="0 0 120 90" fill="none" aria-hidden="true">
      <path d="M18 46 L26 20 L40 20 L34 46 Z" fill={accent} />
      <path d="M18 47 C18 39 40 35 84 36 C99 36 109 42 112 50 C109 56 97 59 82 59 L24 57 C19 56 18 52 18 47 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
      <path d="M22 49 L110 50 C107 56 96 59 82 59 L24 57 C21 56 21 53 22 49 Z" fill={accent} />
      <path d="M87 38 C95 39 101 41 104 45 L87 45 Z" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2" />
      <circle cx="44" cy="43" r="2.2" fill="#0F172A" />
      <circle cx="53" cy="43" r="2.2" fill="#0F172A" />
      <circle cx="62" cy="43" r="2.2" fill="#0F172A" />
      <circle cx="71" cy="43" r="2.2" fill="#0F172A" />
      <path d="M46 52 L74 52 L56 71 L40 71 Z" fill={accent} stroke="#0F172A" strokeWidth="2.5" />
      <rect x="52" y="61" width="14" height="8" rx="4" fill="#334155" />
    </svg>
  );
};

export function createMapPlaneSvg(category: PlaneCategory, color: string, isSelected: boolean): string {
  const stroke = isSelected ? '#FBBF24' : '#0F172A';
  const strokeW = isSelected ? 2.5 : 1.8;

  if (category === 'helicopter') {
    return `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="16" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
        <ellipse cx="20" cy="21" rx="6" ry="9" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
        <line x1="20" y1="30" x2="20" y2="37" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
        <line x1="6" y1="20" x2="34" y2="20" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="20" y1="6" x2="20" y2="34" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="3" fill="#FBBF24"/>
      </svg>
    `;
  }

  if (category === 'propeller') {
    return `
      <svg width="38" height="38" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 5 L23 15 L36 19 L36 23 L23 21 L22 30 L27 34 L27 36 L20 34 L13 36 L13 34 L18 30 L17 21 L4 23 L4 19 L17 15 Z"
              fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>
        <line x1="15" y1="4" x2="25" y2="4" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  // Jet / Superjumbo / Cargo / Rescue top-down silhouette pointing UP (0 deg = North)
  const scale = category === 'superjumbo' ? 1.08 : 1;
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(20 20) scale(${scale}) translate(-20 -20)">
        <path d="M20 3 C21.8 3 23 6 23 11 L23 15 L37 22 L37 25 L23 21 L22.5 30 L28 34 L28 37 L20 35 L12 37 L12 34 L17.5 30 L17 21 L3 25 L3 22 L17 15 L17 11 C17 6 18.2 3 20 3 Z"
              fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>
      </g>
    </svg>
  `;
}
