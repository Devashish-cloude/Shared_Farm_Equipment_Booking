import React, { useState, useEffect } from 'react';
import { Play, Square, FastForward, Radio, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface RentalSessionControlsProps {
  bookingId: string;
  bookingStatus: string;
  sessionStatus: string;
  onSessionStateChanged: () => void;
}

// Realistic waypoints around agricultural field plot in Nashik
const FIELD_WAYPOINTS = [
  { lat: 20.1983, lng: 73.8342, speed: 0, heading: 0 },
  { lat: 20.1991, lng: 73.8349, speed: 9.5, heading: 40 },
  { lat: 20.2002, lng: 73.8358, speed: 12.0, heading: 42 },
  { lat: 20.2014, lng: 73.8368, speed: 11.2, heading: 45 },
  { lat: 20.2019, lng: 73.8381, speed: 8.4, heading: 85 },
  { lat: 20.2011, lng: 73.8392, speed: 10.1, heading: 170 },
  { lat: 20.1998, lng: 73.8388, speed: 11.8, heading: 190 },
  { lat: 20.1986, lng: 73.8375, speed: 9.0, heading: 220 },
  { lat: 20.1983, lng: 73.8359, speed: 7.2, heading: 260 },
  { lat: 20.1983, lng: 73.8342, speed: 0, heading: 0 },
];

export const RentalSessionControls: React.FC<RentalSessionControlsProps> = ({
  bookingId,
  bookingStatus,
  sessionStatus,
  onSessionStateChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [waypointIndex, setWaypointIndex] = useState(0);

  const isActive = sessionStatus === 'active';
  const isCompleted = sessionStatus === 'completed' || bookingStatus === 'completed';
  const canStart = (bookingStatus === 'confirmed' || bookingStatus === 'in_progress') && !isActive && !isCompleted;

  const handleStartSession = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.startRentalSession(bookingId, 'Started rental from UI dashboard');
      setSuccessMsg('Rental session started! Equipment tracking telemetry is now live.');
      onSessionStateChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to start rental session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this rental session? This will finalize tracking.')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setIsAutoSimulating(false);
      await api.endRentalSession(bookingId, 'Rental completed and equipment returned');
      setSuccessMsg('Rental session ended! Tracking has concluded.');
      onSessionStateChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to end rental session');
    } finally {
      setLoading(false);
    }
  };

  const pushSimulatedWaypoint = async (index: number) => {
    const wp = FIELD_WAYPOINTS[index % FIELD_WAYPOINTS.length];
    try {
      await api.sendLocationTelemetry({
        bookingId,
        latitude: wp.lat,
        longitude: wp.lng,
        source: 'simulated_gps',
        speed_kmh: wp.speed,
        heading_deg: wp.heading,
      });
      onSessionStateChanged();
    } catch (err: any) {
      console.error('Simulated telemetry error:', err);
    }
  };

  const handleManualStep = async () => {
    const nextIdx = waypointIndex + 1;
    setWaypointIndex(nextIdx);
    await pushSimulatedWaypoint(nextIdx);
    setSuccessMsg(`Simulated tractor moved to waypoint #${(nextIdx % FIELD_WAYPOINTS.length) + 1}`);
  };

  // Auto-pulse simulated coordinates
  useEffect(() => {
    let timer: any;
    if (isAutoSimulating && isActive) {
      timer = setInterval(() => {
        setWaypointIndex((prev) => {
          const next = prev + 1;
          pushSimulatedWaypoint(next);
          return next;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isAutoSimulating, isActive, bookingId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Rental Session & GPS Controls</h3>
            <p className="text-xs text-slate-400">Manage rental lifecycle and GPS telemetry</p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
          ID: {bookingId}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Lifecycle Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          id="btn-start-rental"
          onClick={handleStartSession}
          disabled={!canStart || loading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            canStart && !loading
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-900/30'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>Start Rental Session</span>
        </button>

        <button
          id="btn-end-rental"
          onClick={handleEndSession}
          disabled={!isActive || loading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            isActive && !loading
              ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-900/30'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Square className="w-4 h-4 fill-current" />
          )}
          <span>End Rental & Stop Tracking</span>
        </button>
      </div>

      {/* Simulated GPS Hardware Controls for Demonstration */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold text-slate-300">
              Simulated GPS Engine (Prototype Testing)
            </span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
            DEMO MODE
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Simulate authentic tractor field operation across agricultural plots in Nashik.
          Generates live telemetry breadcrumbs, calculates ground speed, and streams location
          coordinates.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            id="btn-step-gps"
            onClick={handleManualStep}
            disabled={!isActive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              isActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500/50'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            <FastForward className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate Step Forward</span>
          </button>

          <button
            id="btn-toggle-auto-gps"
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            disabled={!isActive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              !isActive
                ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                : isAutoSimulating
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isAutoSimulating ? 'Pause Auto GPS Pulse' : 'Start Auto GPS Pulse (3.5s)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
