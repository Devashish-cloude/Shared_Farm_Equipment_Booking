import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, RefreshCw, Server, Info, X } from 'lucide-react';
import { Button } from './Button';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, toggleDemoMode, resetDemoData, user } = useAuth();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <div className="bg-[#164B35] text-white text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#235D40] z-40 relative">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#B8D96B] text-[#164B35] font-bold tracking-wide uppercase text-[10px]">
            <Sparkles className="w-3 h-3" />
            {isDemoMode ? 'Interactive Demo Mode' : 'Live Backend Mode'}
          </span>
          <span className="text-[#DCE8E2] hidden sm:inline">
            {isDemoMode
              ? `Logged in as ${user?.name || 'Ramesh Patel'} (Unified Single Account: Rent & List)`
              : 'Connected to API endpoint'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(true)}
            className="text-[#B8D96B] hover:underline flex items-center gap-1 cursor-pointer"
            title="Read about how Demo Mode works"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mode Info</span>
          </button>

          {isDemoMode && (
            <button
              onClick={resetDemoData}
              className="text-[#DCE8E2] hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              title="Reset sample equipment and rentals to initial state"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Data</span>
            </button>
          )}

          <button
            onClick={() => toggleDemoMode()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#347653] hover:bg-[#235D40] text-white transition-colors border border-[#4C926D]"
          >
            <Server className="w-3 h-3" />
            <span>Switch to {isDemoMode ? 'API Mode' : 'Demo Mode'}</span>
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-[#25312A] shadow-2xl border border-[#E2E7DE] relative">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#526058] hover:bg-[#EFF2EB]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#F0F5F2] text-[#164B35] flex items-center justify-center mb-3">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-heading mb-2">About Demo / Mock Mode</h3>
            <p className="text-sm text-[#526058] mb-3 leading-relaxed">
              Shared Farm is built as a peer-to-peer equipment sharing marketplace with a <strong>single unified user account</strong>.
            </p>
            <p className="text-sm text-[#526058] mb-3 leading-relaxed">
              While the separate backend is being developed, <strong>Demo Mode</strong> uses realistic in-memory &amp; session data to demonstrate real filtering, booking requests, listing creation, and live simulated tractor telemetry.
            </p>
            <p className="text-xs text-[#7C8C83] bg-[#F7F8F2] p-3 rounded-xl border border-[#E2E7DE]">
              To connect to a live backend, set <code>VITE_API_BASE_URL</code> in your <code>.env</code> file and switch to <strong>API Mode</strong>.
            </p>
            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={() => setShowInfo(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
