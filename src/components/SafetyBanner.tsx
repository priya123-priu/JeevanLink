import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert } from 'lucide-react';

export const SafetyBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-red-700 via-red-800 to-red-900 text-white shadow-md border-b border-red-950">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center space-x-3 text-center md:text-left">
          <div className="p-1.5 bg-red-950/50 rounded border border-red-400/30 flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <p className="font-bold tracking-wide text-amber-100 flex items-center justify-center md:justify-start gap-1.5">
              <span>CRITICAL NATIONAL EMERGENCY NOTICE:</span>
              <span className="underline decoration-amber-300 font-semibold text-white">
                For immediate emergency help in India, call 112 directly.
              </span>
            </p>
            <p className="text-xs text-red-200 mt-0.5">
              JeevanLink is an alert coordination and mesh simulation network. It does not replace official police, ambulance, NDRF, or government dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:112"
            className="inline-flex items-center px-3.5 py-1.5 rounded bg-white text-red-800 font-bold text-xs hover:bg-red-50 transition-colors shadow-sm border border-red-200"
            title="Immediate direct phone line to India Emergency Services"
          >
            <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-red-700" />
            Dial 112 Directly
          </a>
        </div>
      </div>
    </div>
  );
};
