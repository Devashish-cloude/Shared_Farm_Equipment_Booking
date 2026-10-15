import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { mockStore } from '../../services/mockStore';
import { trackingService } from '../../services/tracking.service';
import { bookingsService } from '../../services/bookings.service';
import { Booking, TelemetryData } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import {
  Navigation,
  Activity,
  Fuel,
  Zap,
  Clock,
  Gauge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

// Custom Live Tractor Pin
const tractorMarkerIcon = L.divIcon({
  className: 'live-tractor-marker',
  html: `
    <div style="
      background: #164B35;
      color: #B8D96B;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #B8D96B;
      box-shadow: 0 0 0 8px rgba(184, 217, 107, 0.35);
      font-size: 20px;
    ">
      🚜
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export const LiveTrackingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId?: string }>();

  // Find active booking with telemetry
  const allBookings = mockStore.getBookings();
  const activeBookings = allBookings.filter((b) => b.status === 'active');
  const selectedBooking: Booking | undefined = bookingId
    ? allBookings.find((b) => b.id === bookingId)
    : activeBookings[0] || allBookings[0];

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    if (!selectedBooking) return;
    setIsRefreshing(true);
    try {
      const data = await trackingService.getTelemetry(selectedBooking.id);
      setTelemetry(data);
    } catch {
      toast.error('Telemetry offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000); // 6s simulated telemetry tick
    return () => clearInterval(interval);
  }, [selectedBooking?.id]);

  const handleEndRental = async () => {
    if (!selectedBooking) return;
    try {
      await bookingsService.endRental(selectedBooking.id);
      toast.success('Rental session completed.');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete rental');
    }
  };

  if (!selectedBooking) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#164B35]">No Active Rental Session</h2>
        <p className="text-xs text-[#526058]">
          You do not have any equipment actively running in the field right now.
        </p>
        <Link to="/dashboard/rentals">
          <Button variant="primary" size="sm">
            View My Rentals
          </Button>
        </Link>
      </div>
    );
  }

  const currentLat = telemetry?.lat || selectedBooking.currentTelemetry?.lat || 22.5692;
  const currentLng = telemetry?.lng || selectedBooking.currentTelemetry?.lng || 72.9341;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-blue-100 text-blue-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Active Fieldwork Tracking
            </span>
            <span className="text-xs font-mono text-[#7C8C83]">#{selectedBooking.id}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading mt-1">
            {selectedBooking.equipmentName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTelemetry}
            isLoading={isRefreshing}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>
          {selectedBooking.status === 'active' && (
            <Button variant="primary" size="sm" onClick={handleEndRental}>
              Complete &amp; End Session
            </Button>
          )}
        </div>
      </div>

      {/* Clearly labelled Simulated GPS Telemetry Notice */}
      <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">SIMULATED GPS TELEMETRY DEMO</p>
          <p className="text-amber-800 leading-relaxed">
            This display demonstrates live in-field tractor telemetry integration. Physical GPS hardware and CAN-bus dongles transmit coordinates, engine RPM, and fuel consumption via MQTT/HTTP backend webhooks.
          </p>
        </div>
      </div>

      {/* 4 Telemetry Gauge Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Gauge 1: Engine Status */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Engine State</span>
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <p className="text-lg font-extrabold font-heading text-emerald-700 capitalize">
            {telemetry?.engineStatus || 'Running'}
          </p>
          <span className="text-[10px] text-[#526058]">1,850 RPM &bull; High Torque</span>
        </div>

        {/* Gauge 2: Speed */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Field Speed</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-extrabold font-heading text-[#25312A]">
            {telemetry?.speedKmph ? telemetry.speedKmph.toFixed(1) : '7.2'} km/h
          </p>
          <span className="text-[10px] text-[#526058]">Active Field Plowing</span>
        </div>

        {/* Gauge 3: Fuel Level */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Fuel Level</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-extrabold font-heading text-[#25312A]">
            {telemetry?.fuelLevelPercent || 74}%
          </p>
          <span className="text-[10px] text-[#526058]">~48 Litres remaining</span>
        </div>

        {/* Gauge 4: Battery & Voltage */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Battery Health</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg font-extrabold font-heading text-[#25312A]">
            {telemetry?.batteryVoltage || 13.8} V
          </p>
          <span className="text-[10px] text-[#526058]">Alternator charging</span>
        </div>
      </div>

      {/* Main Interactive Leaflet Map for Real-Time Tractor Position */}
      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between px-2 text-xs text-[#526058]">
          <span className="font-bold text-[#164B35]">
            Live Geospatial Coordinate: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </span>
          <span>Last Telemetry Packet: {telemetry?.lastUpdated || 'Just now'}</span>
        </div>

        <div className="h-[460px] w-full rounded-2xl overflow-hidden relative">
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={15}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Farm parcel perimeter circle */}
            <Circle
              center={[currentLat, currentLng]}
              radius={280}
              pathOptions={{ color: '#347653', fillColor: '#B8D96B', fillOpacity: 0.15 }}
            />

            {/* Live Tractor Marker */}
            <Marker position={[currentLat, currentLng]} icon={tractorMarkerIcon}>
              <Popup>
                <div className="p-1 text-xs space-y-1">
                  <h4 className="font-bold text-[#164B35]">{selectedBooking.equipmentName}</h4>
                  <p className="text-[11px] text-[#526058]">Operating in Mogri / Anand parcel</p>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Engine Running &bull; {telemetry?.speedKmph?.toFixed(1) || '7.2'} km/h
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
