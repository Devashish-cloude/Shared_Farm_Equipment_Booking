import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { AlertTriangle, Navigation, MapPin } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  source: string;
  speed_kmh?: number;
  heading_deg?: number;
  recorded_at: string;
}

interface RentalTrackingMapProps {
  latestLocation: TrackingPoint | null;
  history: TrackingPoint[];
  equipmentTitle: string;
  isStale: boolean;
  staleMinutes: number;
  sessionStatus: string;
}

export const RentalTrackingMap: React.FC<RentalTrackingMapProps> = ({
  latestLocation,
  history,
  equipmentTitle,
  isStale,
  staleMinutes,
  sessionStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = latestLocation
        ? [latestLocation.latitude, latestLocation.longitude]
        : [20.1983, 73.8342]; // Nashik farm default

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 16,
        zoomControl: true,
      });

      // OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker and polyline when location or history updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (latestLocation) {
      const currentPos: [number, number] = [latestLocation.latitude, latestLocation.longitude];

      // Custom tractor marker icon
      const customIcon = L.divIcon({
        className: 'custom-tracker-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="12 8 8 12 12 16 12 8"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!markerRef.current) {
        markerRef.current = L.marker(currentPos, { icon: customIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(currentPos);
      }

      // Add informative popup
      const recordedTime = new Date(latestLocation.recorded_at).toLocaleTimeString();
      markerRef.current.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #166534; font-size: 14px;">🚜 ${equipmentTitle}</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #334155;">
            <strong>Time:</strong> ${recordedTime}<br/>
            <strong>Speed:</strong> ${latestLocation.speed_kmh || 0} km/h<br/>
            <strong>Source:</strong> ${latestLocation.source === 'simulated_gps' ? 'Simulated GPS' : 'Device GPS'}
          </p>
        </div>
      `).openPopup();

      map.panTo(currentPos, { animate: true });
    }

    // Draw route breadcrumbs polyline
    if (history.length > 1) {
      const latLngs: [number, number][] = history.map((pt) => [pt.latitude, pt.longitude]);
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(latLngs, {
          color: '#10b981',
          weight: 4,
          opacity: 0.8,
          dashArray: '6, 6',
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(latLngs);
      }
    }
  }, [latestLocation, history, equipmentTitle]);

  return (
    <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Source Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-lg pointer-events-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              sessionStatus === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              sessionStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-500'
            }`}></span>
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {latestLocation?.source === 'simulated_gps'
              ? 'SIMULATED GPS DEMO'
              : latestLocation?.source === 'device_gps'
              ? 'HARDWARE GPS'
              : 'TELEMETRY STANDBY'}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            {sessionStatus}
          </span>
        </div>

        {/* Stale Warning Indicator */}
        {isStale && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/90 backdrop-blur-md border border-amber-600/50 text-amber-300 text-xs shadow-lg pointer-events-auto animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Stale Location: No update in {staleMinutes}m</span>
          </div>
        )}
      </div>

      {/* Map DOM Canvas */}
      <div id="rental-tracking-map" ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Route Summary Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-xs text-slate-300 pointer-events-none">
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>Breadcrumb Waypoints: <strong>{history.length} recorded</strong></span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>Leaflet & OpenStreetMap Engine</span>
        </div>
      </div>
    </div>
  );
};
