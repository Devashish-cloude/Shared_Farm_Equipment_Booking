import { Clock, Gauge, Compass, AlertCircle, EyeOff } from 'lucide-react';

interface TrackingStatusProps {
  latestLocation: {
    latitude: number;
    longitude: number;
    source: string;
    speed_kmh?: number;
    heading_deg?: number;
    recorded_at: string;
  } | null;
  sessionStatus: string;
  isStale: boolean;
  staleMinutes: number;
  equipmentLocationName: string;
}

export const TrackingStatus: React.FC<TrackingStatusProps> = ({
  latestLocation,
  sessionStatus,
  isStale,
  staleMinutes,
  equipmentLocationName,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Telemetry Status & Telematics</h3>
            <p className="text-xs text-slate-400">Live operational metrics</p>
          </div>
        </div>

        <span
          id="tracking-session-badge"
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            sessionStatus === 'active'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : sessionStatus === 'completed'
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {sessionStatus === 'active'
            ? '● ACTIVE SESSION'
            : sessionStatus === 'completed'
            ? '✓ RENTAL COMPLETED'
            : 'SESSION INACTIVE'}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Lat / Lng */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Position
          </span>
          {latestLocation ? (
            <div className="font-mono text-xs font-semibold text-slate-200">
              {latestLocation.latitude.toFixed(4)}° N<br />
              {latestLocation.longitude.toFixed(4)}° E
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No GPS signal</span>
          )}
        </div>

        {/* Speed */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Speed
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-base font-bold text-emerald-400">
              {latestLocation?.speed_kmh ? latestLocation.speed_kmh.toFixed(1) : '0.0'}
            </span>
            <span className="text-[10px] text-slate-400">km/h</span>
          </div>
        </div>

        {/* Heading */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-400" /> Heading
          </span>
          <span className="font-mono text-xs font-semibold text-slate-200">
            {latestLocation?.heading_deg ? `${latestLocation.heading_deg}°` : '0° NNE'}
          </span>
        </div>

        {/* Last Timestamp */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Ping Time
          </span>
          {latestLocation ? (
            <span className="font-mono text-xs text-slate-300">
              {new Date(latestLocation.recorded_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">Awaiting sync</span>
          )}
        </div>
      </div>

      {/* Stale Warning Banner */}
      {isStale && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <strong>Telemetry Stale Warning:</strong> Last position recorded {staleMinutes} minutes
            ago. The equipment may be parked, powered down, or in poor cellular coverage.
          </div>
        </div>
      )}

      {/* Privacy Notice Card */}
      <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200/90 text-xs flex items-start gap-2.5">
        <EyeOff className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-blue-300">Privacy & Access Protection:</span>
          <p className="text-[11px] text-blue-200/80 leading-relaxed">
            High-precision live coordinates are restricted strictly to authorized booking
            participants. Public marketplace visitors only view approximate location (
            <strong>{equipmentLocationName}</strong>).
          </p>
        </div>
      </div>
    </div>
  );
};
