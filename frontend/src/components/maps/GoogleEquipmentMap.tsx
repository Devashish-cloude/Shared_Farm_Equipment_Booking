import React, { useEffect, useRef, useState } from 'react';
import { Equipment } from '../../types';
import { useGoogleMaps } from '../../lib/googleMaps';
import { LeafletEquipmentMap } from '../equipment/LeafletEquipmentMap';

import { MapPin, AlertCircle, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { resolveEquipmentImage } from '../../lib/equipmentImages';

interface GoogleEquipmentMapProps {
  equipmentList: Equipment[];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string;
}

export const GoogleEquipmentMap: React.FC<GoogleEquipmentMapProps> = ({
  equipmentList,
  center = [22.5645, 72.9289], // Default: Gujarat agricultural basin (Anand / Kheda)
  zoom = 12,
  highlightedId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const { isLoaded, isLoading, loadError, authError, isConfigured } = useGoogleMaps(['places']);
  const [preferredEngine, setPreferredEngine] = useState<'google' | 'leaflet'>('google');
  const [missingCoordsCount, setMissingCoordsCount] = useState(0);

  // Validate coordinates
  const validEquipment = equipmentList.filter((eq) => {
    const coords = eq.location?.approximateCoordinates;
    if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
    const [lat, lng] = coords;
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  });

  useEffect(() => {
    setMissingCoordsCount(equipmentList.length - validEquipment.length);
  }, [equipmentList, validEquipment.length]);

  // Initialize or update Google Map
  useEffect(() => {
    if (!isLoaded || authError || preferredEngine !== 'google' || !mapContainerRef.current) {
      return;
    }

    if (!window.google?.maps) return;

    try {
      const defaultCenter = { lat: center[0], lng: center[1] };

      // Initialize map instance once
      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle?.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition?.TOP_RIGHT,
          },
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });
        mapInstanceRef.current = map;
        infoWindowRef.current = new window.google.maps.InfoWindow();
      }

      const map = mapInstanceRef.current;
      const infoWindow = infoWindowRef.current;

      // Clean up previous markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      const bounds = new window.google.maps.LatLngBounds();
      let hasValidPoints = false;

      // Create markers for valid equipment
      validEquipment.forEach((eq) => {
        const [lat, lng] = eq.location.approximateCoordinates;
        const position = { lat, lng };
        bounds.extend(position);
        hasValidPoints = true;

        const isHighlighted = eq.id === highlightedId;

        // Custom styled SVG icon pin
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: eq.title,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="90" height="34" viewBox="0 0 90 34">
                <rect x="2" y="2" width="86" height="26" rx="13" fill="${isHighlighted ? '#164B35' : '#347653'}" stroke="${isHighlighted ? '#B8D96B' : '#ffffff'}" stroke-width="2" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.3))"/>
                <text x="45" y="19" fill="#ffffff" font-size="11" font-weight="700" font-family="sans-serif" text-anchor="middle">₹${eq.pricePerHour}/hr</text>
              </svg>
            `)}`,
            anchor: new window.google.maps.Point(45, 30),
          },
        });

        const imageSrc = resolveEquipmentImage(eq.images, null, eq.category);
        const contentString = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 220px; padding: 4px; color: #25312A;">
            <img src="${imageSrc}" alt="${eq.title}" style="width: 100%; height: 96px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <div style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #e8f5e9; color: #2e7d32; margin-bottom: 4px;">
              ${eq.category}
            </div>
            <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 4px 0; color: #164B35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${eq.title}
            </h4>
            <p style="font-size: 11px; color: #526058; margin: 0 0 8px 0;">
              📍 ${eq.location.village}, ${eq.location.district} (Approx.)
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #E2E7DE; padding-top: 8px;">
              <span style="font-size: 13px; font-weight: 800; color: #164B35;">₹${eq.pricePerHour}/hr</span>
              <a href="/equipment/${eq.id}" style="font-size: 12px; font-weight: 700; color: #164B35; text-decoration: none; padding: 4px 8px; background: #B8D96B; border-radius: 6px;">
                View →
              </a>
            </div>
          </div>
        `;

        marker.addListener('click', () => {
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
        });

        if (isHighlighted) {
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
        }

        markersRef.current.push(marker);
      });

      // Auto-fit bounds if we have multiple valid equipment
      if (hasValidPoints && validEquipment.length > 1) {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      } else if (hasValidPoints && validEquipment.length === 1) {
        map.setCenter({
          lat: validEquipment[0].location.approximateCoordinates[0],
          lng: validEquipment[0].location.approximateCoordinates[1],
        });
        map.setZoom(13);
      }
    } catch (err) {
      console.warn('[GoogleEquipmentMap] Error updating Google Map markers:', err);
    }
  }, [isLoaded, authError, preferredEngine, validEquipment, center, zoom, highlightedId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  // FALLBACK CONDITION: If user preferred Leaflet, or key is unconfigured, or loadError / authError occurred
  const shouldUseFallback =
    preferredEngine === 'leaflet' || !isConfigured || Boolean(loadError) || authError;

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-[#E2E7DE] shadow-sm bg-[#F0F5F2]">
      {/* HUD Header Bar: Engine Status & Switcher */}
      <div className="absolute top-3 left-3 right-3 z-[10] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#CBD5C7] shadow-sm text-xs font-medium text-[#25312A]">
          {!shouldUseFallback ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[#164B35]">Google Maps Engine</span>
              <span className="text-[10px] text-[#7C8C83]">Satellite & Terrain Active</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold text-[#25312A]">OpenStreetMap Engine</span>
              {authError && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Google Key Pending Billing / Referrer
                </span>
              )}
            </>
          )}
        </div>

        {/* Engine Toggle Button (allows farmer to test or switch freely) */}
        {isConfigured && !authError && (
          <button
            type="button"
            onClick={() => setPreferredEngine((curr) => (curr === 'google' ? 'leaflet' : 'google'))}
            className="pointer-events-auto flex items-center gap-1.5 bg-[#164B35] hover:bg-[#205e43] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Switch to {preferredEngine === 'google' ? 'OpenStreetMap' : 'Google Maps'}</span>
          </button>
        )}
      </div>

      {/* RENDER FALLBACK: Leaflet Map */}
      {shouldUseFallback ? (
        <div className="w-full h-full">
          <LeafletEquipmentMap
            equipmentList={equipmentList}
            center={center}
            zoom={zoom}
            highlightedId={highlightedId}
          />
        </div>
      ) : isLoading ? (
        /* SKELETON / LOADING STATE */
        <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#F0F5F2]">
          <div className="w-10 h-10 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#164B35]">Loading Google Maps Platform...</p>
          <span className="text-[11px] text-[#526058]">
            Initializing geospatial equipment layers and satellite imagery
          </span>
        </div>
      ) : (
        /* GOOGLE MAP CANVAS */
        <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />
      )}

      {/* Missing coordinates notice if any */}
      {missingCoordsCount > 0 && (
        <div className="absolute bottom-10 left-3 z-[10] bg-white/90 backdrop-blur-xs px-3 py-1 rounded-lg border border-amber-200 text-[11px] text-amber-800 shadow-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {missingCoordsCount} equipment listing{missingCoordsCount > 1 ? 's' : ''} hidden (approximate GPS
            coordinates not provided).
          </span>
        </div>
      )}

      {/* Privacy disclaimer */}
      <div className="absolute bottom-3 left-3 z-[10] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E2E7DE] text-[10px] text-[#526058] shadow-xs">
        &bull; Exact coordinates are masked for privacy until booking is confirmed.
      </div>
    </div>
  );
};
