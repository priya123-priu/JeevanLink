import React, { useState } from 'react';
import type { SosAlert, AlertDelivery } from '../types/alert';
import { sosAlertService } from '../services/sosAlertService';
import {
  X,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Radio,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface AlertDetailModalProps {
  alert: SosAlert | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose, onRefresh }) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  if (!alert) return null;

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    await sosAlertService.retryDelivery(alert.id, deliveryId);
    setRetryingId(null);
    onRefresh();
  };

  const isReal = alert.mode === 'real';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" />
            <div>
              <span className="font-bold tracking-wide text-base block">
                SOS Alert Details: {alert.client_request_id ? alert.client_request_id.substring(0, 16) : alert.id}
              </span>
              <span className="text-xs text-slate-300">
                Created: {new Date(alert.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mode Badge & Type */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Emergency Type</span>
              <span className="font-bold text-slate-900 text-base">{alert.emergency_type}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Status</span>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                {alert.emergency_status}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Mode</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                  isReal
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {isReal ? 'Real SMS Mode' : 'Simulation Mode'}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Alert Status Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                <div className="font-bold text-slate-700">1. Triggered</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {new Date(alert.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                <div className="font-bold text-slate-700">2. Stored / Queued</div>
                <div className="text-[11px] text-slate-500 mt-1">Confirmed</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                <div className="font-bold text-slate-700">3. Processing</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {isReal ? 'Carrier Relay' : 'Sim Engine'}
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-center">
                <div className="font-bold text-emerald-900">4. Dispatched</div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {alert.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Location details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                Geolocation Verification
              </span>
              {alert.location_available && alert.latitude && alert.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  View on External Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>

            {alert.location_available && alert.latitude && alert.longitude ? (
              <div className="text-xs text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Coordinates: </span>
                  {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                </div>
                <div>
                  <span className="font-semibold">Accuracy Radius: </span>
                  ±{alert.location_accuracy ? Math.round(alert.location_accuracy) : 15} meters
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                Geolocation was not available or was denied during distress beacon triggering. Emergency alert was dispatched without coordinates.
              </div>
            )}
          </div>

          {/* Message and People */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="font-bold text-slate-700 block mb-1">People in Need:</span>
              <span className="text-base font-bold text-slate-900">{alert.people_count} Person(s)</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="font-bold text-slate-700 block mb-1">Optional Message / Note:</span>
              <span className="text-slate-800 italic">{alert.message || 'No additional note provided.'}</span>
            </div>
          </div>

          {/* Deliveries */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Contact Delivery Reports ({alert.deliveries?.length || 0})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Masked per privacy policy: +91******1234
              </span>
            </h4>

            {(!alert.deliveries || alert.deliveries.length === 0) ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded border border-slate-200">
                No individual contact delivery logs recorded for this alert.
              </p>
            ) : (
              <div className="space-y-2">
                {alert.deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-3 bg-white border border-slate-200 rounded-md flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{delivery.contact_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {delivery.masked_phone}
                      </div>
                      {delivery.provider_name && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Via: {delivery.provider_name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          delivery.status === 'Simulated'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : delivery.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : delivery.status === 'Failed'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {delivery.status}
                      </span>

                      {delivery.status === 'Failed' && (
                        <button
                          onClick={() => handleRetry(delivery.id)}
                          disabled={retryingId === delivery.id}
                          className="px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingId === delivery.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
          <span className="italic">
            Notice: Navigation or map links are for information only and do not constitute emergency dispatch.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded shadow-xs"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
};
