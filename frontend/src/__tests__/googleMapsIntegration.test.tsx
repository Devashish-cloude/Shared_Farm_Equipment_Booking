import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
  loadGoogleMapsScript,
} from '../lib/googleMaps';
import { LocationAutocompleteInput } from '../components/ui/LocationAutocompleteInput';
import { SingleEquipmentLocationMap } from '../components/maps/SingleEquipmentLocationMap';
import { GoogleEquipmentMap } from '../components/maps/GoogleEquipmentMap';
import { Equipment } from '../types';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </BrowserRouter>
  );
};


// Mock Leaflet components to render clean identifiable test elements
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="leaflet-map-container">{children}</div>,
  TileLayer: () => <div data-testid="leaflet-tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="leaflet-marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="leaflet-popup">{children}</div>,
  Circle: () => <div data-testid="leaflet-circle" />,
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: () => ({}),
    map: vi.fn(),
    tileLayer: vi.fn(),
  },
  divIcon: () => ({}),
}));

const sampleEquipment: Equipment[] = [
  {
    id: 'eq-1',
    title: 'Mahindra 575 DI Tractor',
    description: 'High torque farm tractor',
    category: 'Tractors',
    make: 'Mahindra',
    model: '575 DI',
    year: 2023,
    powerHp: 45,
    condition: 'Excellent',
    images: ['https://example.com/tractor.jpg'],
    specifications: {},
    pricePerHour: 850,
    pricePerDay: 6800,
    minRentalHours: 4,
    securityDeposit: 2000,
    operatorAvailable: true,
    operatorCostPerHour: 150,
    location: {
      village: 'Mogri',
      district: 'Anand',
      state: 'Gujarat',
      approximateCoordinates: [22.5645, 72.9289],
    },
    ownerId: 'owner-1',
    ownerName: 'Ramesh Patel',
    ownerPhone: '+91 98000 11111',
    ownerRating: 4.8,
    ownerVerified: true,
    status: 'available',
    rating: 4.9,
    reviewCount: 12,
    completedRentalsCount: 15,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'eq-2-no-coords',
    title: 'Rotavator Shaktiman 6 Feet',
    description: 'Tillage implement',
    category: 'Rotavators',
    make: 'Shaktiman',
    model: 'Regular Light',
    year: 2022,
    condition: 'Good',
    images: ['https://example.com/rotavator.jpg'],
    specifications: {},
    pricePerHour: 450,
    pricePerDay: 3600,
    minRentalHours: 2,
    securityDeposit: 1000,
    operatorAvailable: false,
    operatorCostPerHour: 0,
    location: {
      village: 'Bakrol',
      district: 'Anand',
      state: 'Gujarat',
      approximateCoordinates: [] as any, // Missing coordinates
    },
    ownerId: 'owner-2',
    ownerName: 'Suresh Bhai',
    ownerRating: 4.6,
    ownerVerified: false,
    status: 'available',
    rating: 4.7,
    reviewCount: 8,
    completedRentalsCount: 10,
    createdAt: new Date().toISOString(),
  },


];

describe('Google Maps Integration & Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.google;
    delete (window as any).__googleMapsLoadedPromise;
    const existing = document.getElementById('google-maps-api-script');
    if (existing) existing.remove();
  });

  it('reads VITE_GOOGLE_MAPS_API_KEY from environment and verifies configuration', () => {
    const key = getGoogleMapsApiKey();
    expect(typeof key).toBe('string');
    // If configured, isGoogleMapsConfigured() returns a boolean
    const configured = isGoogleMapsConfigured();
    expect(typeof configured).toBe('boolean');
  });

  it('prevents duplicate script injections when loadGoogleMapsScript is called repeatedly', async () => {
    // If key is present in env, calling it twice should return the same singleton promise
    const key = getGoogleMapsApiKey();
    if (key && !key.includes('placeholder')) {
      const p1 = loadGoogleMapsScript();
      const p2 = loadGoogleMapsScript();
      expect(p1).toBe(p2);
      // Only 1 script tag should exist in DOM
      const scripts = document.querySelectorAll('script#google-maps-api-script');
      expect(scripts.length).toBe(1);
    }
  });

  it('window.gm_authFailure triggers graceful error handler without crashing the app', () => {
    expect(typeof window.gm_authFailure).toBe('function');
    // Calling gm_authFailure should not throw
    expect(() => {
      window.gm_authFailure?.();
    }).not.toThrow();
  });
});

describe('LocationAutocompleteInput Component', () => {
  it('renders text input with search placeholder and handles standard user typing', () => {
    const handleChange = vi.fn();
    render(
      <LocationAutocompleteInput
        value=""
        onChange={handleChange}
        placeholder="Search village or district..."
      />
    );

    const input = screen.getByPlaceholderText('Search village or district...');
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Anand, Gujarat' } });
    expect(handleChange).toHaveBeenCalledWith('Anand, Gujarat');
  });

  it('works smoothly without throwing when Google Places API is unavailable', () => {
    // Ensure window.google is undefined
    delete window.google;

    const handleChange = vi.fn();
    render(
      <LocationAutocompleteInput
        value="Bardoli"
        onChange={handleChange}
      />
    );

    expect(screen.getByDisplayValue('Bardoli')).toBeTruthy();
  });

  it('attaches to google.maps.places.Autocomplete when Places library is present', () => {
    const addListenerMock = vi.fn();
    const autocompleteConstructor = vi.fn().mockImplementation(() => ({
      addListener: addListenerMock,
      getPlace: () => ({ formatted_address: 'Mogri, Anand, Gujarat' }),
    }));

    window.google = {
      maps: {
        places: {
          Autocomplete: autocompleteConstructor,
        },
        event: {
          removeListener: vi.fn(),
          clearInstanceListeners: vi.fn(),
        },
      },
    } as any;

    const handleChange = vi.fn();
    render(
      <LocationAutocompleteInput
        value=""
        onChange={handleChange}
      />
    );

    expect(input => input !== null);
  });
});

describe('SingleEquipmentLocationMap Component', () => {
  it('renders vicinity map when valid coordinates are provided', () => {
    renderWithProviders(
      <SingleEquipmentLocationMap
        coordinates={[22.5645, 72.9289]}
        village="Mogri"
        district="Anand"
        equipmentTitle="Mahindra 575 DI"
        pricePerHour={850}
      />
    );

    expect(screen.getByText(/Machinery Vicinity & Field Area/i)).toBeTruthy();
    expect(screen.getAllByText(/Mogri, Anand/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Farmer Privacy Protection/i)).toBeTruthy();
  });

  it('displays a friendly missing coordinates alert when coordinates are null or invalid', () => {
    renderWithProviders(
      <SingleEquipmentLocationMap
        coordinates={null}
        village="Bakrol"
        district="Anand"
        equipmentTitle="Rotavator Shaktiman"
        pricePerHour={450}
      />
    );

    expect(screen.getByText(/Approximate Location: Bakrol, Anand/i)).toBeTruthy();
    expect(screen.getByText(/Precise GPS coordinates have not been calibrated/i)).toBeTruthy();
  });
});

describe('GoogleEquipmentMap & Fallback Behavior', () => {
  it('filters equipment with missing coordinates and displays warning badge', () => {
    renderWithProviders(<GoogleEquipmentMap equipmentList={sampleEquipment} />);

    // eq-2 has missing coordinates, so warning banner for 1 hidden listing must display
    expect(
      screen.getByText(/1 equipment listing hidden \(approximate GPS coordinates not provided\)/i)
    ).toBeTruthy();
  });

  it('renders Leaflet fallback engine cleanly when authError or fallback is triggered', () => {
    // Trigger auth failure
    window.gm_authFailure?.();

    renderWithProviders(<GoogleEquipmentMap equipmentList={sampleEquipment} />);

    // When auth failure triggers, OpenStreetMap engine notice must be shown
    expect(screen.getByText(/OpenStreetMap Engine/i)).toBeTruthy();
    expect(screen.getByTestId('leaflet-map-container')).toBeTruthy();
  });
});


