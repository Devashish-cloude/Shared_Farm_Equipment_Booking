import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { useGoogleMaps, isPlacesApiAvailable } from '../../lib/googleMaps';

export interface LocationAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCoordinates?: (coords: [number, number]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectCoordinates,
  placeholder = 'Search village, taluka, or district...',
  className = '',
  id = 'location-search-input',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const { isLoaded, authError } = useGoogleMaps(['places']);
  const [placesEnabled, setPlacesEnabled] = useState(false);

  useEffect(() => {
    if (!isLoaded || authError || !inputRef.current) {
      return;
    }

    if (!isPlacesApiAvailable()) {
      return;
    }

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'], // administrative areas, cities, villages, postal codes
        componentRestrictions: { country: 'in' }, // Focus on Indian agricultural regions
        fields: ['formatted_address', 'name', 'geometry'],
      });

      const listener = autocomplete.addListener('place_changed', () => {
        try {
          const place = autocomplete.getPlace();
          if (place) {
            const address = place.formatted_address || place.name || '';
            if (address) {
              onChange(address);
            }
            if (place.geometry?.location && onSelectCoordinates) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              if (typeof lat === 'number' && typeof lng === 'number') {
                onSelectCoordinates([lat, lng]);
              }
            }
          }
        } catch (err) {
          console.warn('[LocationAutocompleteInput] Failed to process selected place:', err);
        }
      });

      autocompleteRef.current = autocomplete;
      setPlacesEnabled(true);

      return () => {
        if (listener && window.google?.maps?.event) {
          window.google.maps.event.removeListener(listener);
        }
        if (typeof window !== 'undefined' && (window as any).google?.maps?.event?.clearInstanceListeners) {
          (window as any).google.maps.event.clearInstanceListeners(autocomplete);
        }
        autocompleteRef.current = null;
      };
    } catch (err) {
      console.warn('[LocationAutocompleteInput] Places Autocomplete initialization skipped:', err);
      setPlacesEnabled(false);
    }
  }, [isLoaded, authError, onChange, onSelectCoordinates]);

  return (
    <div className="relative w-full">
      <MapPin className="w-4 h-4 text-[#347653] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2]/70 text-[#25312A] placeholder-[#7C8C83] focus:outline-none focus:ring-2 focus:ring-[#164B35] transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      />
      {placesEnabled && !authError && (
        <span
          title="Google Places Autocomplete Active"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 pointer-events-none"
        >
          <Sparkles className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
          <span className="font-semibold hidden sm:inline">Places</span>
        </span>
      )}
    </div>
  );
};
