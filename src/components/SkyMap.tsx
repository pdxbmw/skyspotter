import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_STYLES } from '../data/aviationKnowledge';
import { AircraftTelemetry, HomeLocation } from '../types/aviation';
import { createMapPlaneSvg } from './PlaneArt';

export interface MapFocusTarget {
  lat: number;
  lon: number;
  zoom?: number;
  seq: number;
}

export interface ViewportBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

interface SkyMapProps {
  home: HomeLocation;
  planes: AircraftTelemetry[];
  selectedPlaneId: string | null;
  showRadarRings: boolean;
  focusTarget?: MapFocusTarget | null;
  jumpHomeSeq?: number;
  onSelectPlane: (plane: AircraftTelemetry) => void;
  onViewportChange?: (lat: number, lon: number, zoom: number, bounds: ViewportBounds) => void;
}

export const SkyMap: React.FC<SkyMapProps> = ({
  home,
  planes,
  selectedPlaneId,
  showRadarRings,
  focusTarget,
  jumpHomeSeq,
  onSelectPlane,
  onViewportChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);
  const homeLayerRef = useRef<L.LayerGroup | null>(null);
  const planesLayerRef = useRef<L.LayerGroup | null>(null);
  const lastHomeKeyRef = useRef<string>('');
  const lastJumpSeqRef = useRef<number>(0);
  const lastFocusSeqRef = useRef<number>(0);
  const viewportCbRef = useRef(onViewportChange);

  viewportCbRef.current = onViewportChange;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [home.lat, home.lon],
      zoom: 10,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    ringsLayerRef.current = L.layerGroup().addTo(map);
    homeLayerRef.current = L.layerGroup().addTo(map);
    planesLayerRef.current = L.layerGroup().addTo(map);

    map.on('moveend', () => {
      const center = map.getCenter();
      const b = map.getBounds();
      viewportCbRef.current?.(center.lat, center.lng, map.getZoom(), {
        lamin: Math.max(-85, b.getSouth()),
        lomin: Math.max(-180, b.getWest()),
        lamax: Math.min(85, b.getNorth()),
        lomax: Math.min(180, b.getEast()),
      });
    });

    mapRef.current = map;
    lastHomeKeyRef.current = `${home.lat.toFixed(4)},${home.lon.toFixed(4)}`;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Home pin and Radar rings when home, toggle, or jumpHomeSeq changes
  useEffect(() => {
    const map = mapRef.current;
    const ringsLayer = ringsLayerRef.current;
    const homeLayer = homeLayerRef.current;
    if (!map || !ringsLayer || !homeLayer) return;

    const homeKey = `${home.lat.toFixed(4)},${home.lon.toFixed(4)}`;
    const jumpedHome = jumpHomeSeq !== undefined && jumpHomeSeq !== lastJumpSeqRef.current;
    if (lastHomeKeyRef.current !== homeKey || jumpedHome) {
      map.setView([home.lat, home.lon], 10, { animate: true });
      lastHomeKeyRef.current = homeKey;
      if (jumpHomeSeq !== undefined) {
        lastJumpSeqRef.current = jumpHomeSeq;
      }
    }

    homeLayer.clearLayers();
    ringsLayer.clearLayers();

    if (showRadarRings) {
      const radiiMiles = [5, 15, 30];
      radiiMiles.forEach((miles, idx) => {
        const meters = miles * 1609.34;
        L.circle([home.lat, home.lon], {
          radius: meters,
          color: idx === 0 ? '#0284C7' : '#38BDF8',
          weight: idx === 0 ? 2 : 1.5,
          dashArray: '6 6',
          fillColor: '#38BDF8',
          fillOpacity: idx === 0 ? 0.06 : 0.02,
          interactive: false,
        }).addTo(ringsLayer);
      });
    }

    const homeIcon = L.divIcon({
      className: 'home-beacon-icon',
      html: `<div class="home-beacon"><span class="home-beacon-pulse"></span><span class="home-beacon-dot">🏠</span></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    L.marker([home.lat, home.lon], { icon: homeIcon, zIndexOffset: 200 })
      .bindTooltip(`You are here (${home.code})`, { direction: 'top', offset: [0, -14] })
      .addTo(homeLayer);
  }, [home, showRadarRings, jumpHomeSeq]);

  // Smoothly pan/zoom to a focused plane when triggered
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget || focusTarget.seq === lastFocusSeqRef.current) return;
    lastFocusSeqRef.current = focusTarget.seq;
    const targetZoom = focusTarget.zoom ?? Math.max(map.getZoom(), 10);
    map.setView([focusTarget.lat, focusTarget.lon], targetZoom, { animate: true });
  }, [focusTarget]);

  // Update plane markers
  useEffect(() => {
    const planesLayer = planesLayerRef.current;
    if (!planesLayer) return;
    planesLayer.clearLayers();

    planes.forEach((plane, index) => {
      const isSelected = plane.id === selectedPlaneId;
      const isClosest = index === 0;
      const catColor = CATEGORY_STYLES[plane.category].color;
      const svg = createMapPlaneSvg(plane.category, catColor, isSelected);

      const iconHtml = `
        <div class="map-plane-marker ${isSelected ? 'is-selected' : ''} ${isClosest ? 'is-closest' : ''}">
          <div class="map-plane-rotator" style="transform: rotate(${plane.trackDeg}deg);">
            ${svg}
          </div>
          <div class="map-plane-label">
            ${plane.callsign}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'kidplane-div-icon',
        html: iconHtml,
        iconSize: [54, 54],
        iconAnchor: [27, 24],
      });

      const marker = L.marker([plane.lat, plane.lon], {
        icon,
        zIndexOffset: isSelected ? 1000 : isClosest ? 500 : 100,
      });

      marker.on('click', () => {
        onSelectPlane(plane);
      });

      marker.addTo(planesLayer);
    });
  }, [planes, selectedPlaneId, onSelectPlane]);

  return <div ref={containerRef} className="sky-map-canvas" aria-label="Interactive live airplane map" />;
};
