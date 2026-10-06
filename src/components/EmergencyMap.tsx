import React from 'react';
import { MapPin, Navigation, Radio, Shield, Info } from 'lucide-react';

interface EmergencyMapProps {
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  locationError: string | null;
  onRequestLocation: () => void;
  isLoadingLocation: boolean;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  userLocation,
  locationError,
  onRequestLocation,
  isLoadingLocation,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-red-400" />
          <div>
            <h3 className="text-sm font-bold tracking-wide">Emergency Geo-Visualizer</h3>
            <p className="text-[11px] text-slate-300">Live GPS & Simulated Local Mesh Nodes</p>
          </div>
        </div>

        <button
          onClick={onRequestLocation}
          disabled={isLoadingLocation}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <MapPin className="w-3.5 h-3.5" />
          {isLoadingLocation ? 'Locating...' : userLocation ? 'Refresh GPS' : 'Enable GPS'}
        </button>
      </div>

      {locationError && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* SVG Canvas Map */}
      <div className="relative h-64 sm:h-72 w-full bg-slate-100 overflow-hidden">
        {/* Subtle grid pattern */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Contour river / topography representation */}
          <path
            d="M -10,180 Q 150,140 300,190 T 600,160 T 900,200"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Mesh connection links */}
          <line x1="20%" y1="65%" x2="42%" y2="48%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="42%" y1="48%" x2="68%" y2="35%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="68%" y1="35%" x2="88%" y2="22%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

          {/* Animated signal ring on user node */}
          {userLocation && (
            <circle cx="20%" cy="65%" r="22" fill="#ef4444" fillOpacity="0.18">
              <animate attributeName="r" values="16;28;16" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="fillOpacity" values="0.25;0.05;0.25" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Node 1: Citizen (You) */}
        <div className="absolute left-[20%] top-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-red-300">
            <Radio className="w-4 h-4" />
          </div>
          <div className="mt-1 px-2 py-0.5 bg-white/95 rounded shadow-xs text-[10px] font-bold text-slate-800 border border-slate-200 whitespace-nowrap">
            {userLocation ? 'Your Location (Live)' : 'Citizen Node (Estimated)'}
          </div>
        </div>

        {/* Node 2: Relay A */}
        <div className="absolute left-[42%] top-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shadow border-2 border-white">
            <span className="text-[10px] font-bold">R1</span>
          </div>
          <div className="mt-1 px-1.5 py-0.5 bg-white/90 rounded text-[9px] font-semibold text-slate-700 border border-slate-200">
            Relay Node A
          </div>
        </div>

        {/* Node 3: Relay B */}
        <div className="absolute left-[68%] top-[35%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shadow border-2 border-white">
            <span className="text-[10px] font-bold">R2</span>
          </div>
          <div className="mt-1 px-1.5 py-0.5 bg-white/90 rounded text-[9px] font-semibold text-slate-700 border border-slate-200">
            Relay Node B
          </div>
        </div>

        {/* Node 4: Simulated Rescue Command Node */}
        <div className="absolute left-[88%] top-[22%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-300">
            <Shield className="w-4 h-4" />
          </div>
          <div className="mt-1 px-2 py-0.5 bg-emerald-50 rounded shadow-xs text-[10px] font-bold text-emerald-900 border border-emerald-300 whitespace-nowrap">
            Simulated Rescue Node
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
        <div>
          {userLocation ? (
            <span className="font-mono text-slate-800">
              GPS: {userLocation.lat.toFixed(5)}° N, {userLocation.lng.toFixed(5)}° E (±{Math.round(userLocation.accuracy || 15)}m)
            </span>
          ) : (
            <span className="italic text-slate-500">Location permission pending or not requested.</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 italic">
          Prototype rescue endpoint — not affiliated with police or NDRF
        </div>
      </div>
    </div>
  );
};
