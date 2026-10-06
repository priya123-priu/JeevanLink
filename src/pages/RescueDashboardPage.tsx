import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sosAlertService } from '../services/sosAlertService';
import type { SosAlert, AlertMode } from '../types/alert';
import { AlertDetailModal } from '../components/AlertDetailModal';

interface RescueDashboardPageProps {
  onOpenMeshTrack?: (alertId: string) => void;
}

export const RescueDashboardPage: React.FC<RescueDashboardPageProps> = ({ onOpenMeshTrack }) => {
  const { user, isSimulationUser } = useAuth();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'simulation' | 'real'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<SosAlert | null>(null);

  // Role toggle (simulated view for authorized operators without bypassing RLS)
  const [isOperatorView, setIsOperatorView] = useState<boolean>(false);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await sosAlertService.getAlerts(user?.id || 'sim-user', isOperatorView);
    setAlerts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, [user, isOperatorView]);

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === 'simulation' && alert.mode !== 'simulation') return false;
    if (filterMode === 'real' && alert.mode !== 'real') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = alert.emergency_type.toLowerCase().includes(q);
      const matchStatus = alert.emergency_status.toLowerCase().includes(q);
      const matchReqId = alert.client_request_id.toLowerCase().includes(q);
      return matchType || matchStatus || matchReqId;
    }
    return true;
  });

  const simulationCount = alerts.filter((a) => a.mode === 'simulation').length;
  const realCount = alerts.filter((a) => a.mode === 'real').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Operator Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-900" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Emergency Distress Log & Rescue Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-600 font-serif italic mt-1">
            Real-time feed of local distress signals, delivery audits, and mesh telemetry
          </p>
        </div>

        {/* View Switcher: User Feed vs Operator Simulation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-100 p-1.5 rounded-lg border border-slate-300">
            <span className="text-slate-600 font-semibold px-2">Scope:</span>
            <button
              onClick={() => setIsOperatorView(false)}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                !isOperatorView
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Alerts
            </button>
            <button
              onClick={() => setIsOperatorView(true)}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                isOperatorView
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operator Log (Simulated)
            </button>
          </div>

          <button
            onClick={loadAlerts}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Safety Compliance Banner */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Protocol Isolation Notice: </span>
          Simulation alerts are tagged strictly as practice/demonstration signals and are NEVER forwarded to official government dispatch centers. Real alerts are governed by authenticated Supabase Row Level Security (RLS) policies.
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">
            Total Broadcasts
          </span>
          <span className="text-2xl font-bold text-slate-900">{alerts.length}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-blue-600 font-bold uppercase tracking-wider block mb-1">
            Simulation Alerts
          </span>
          <span className="text-2xl font-bold text-blue-900">{simulationCount}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-red-600 font-bold uppercase tracking-wider block mb-1">
            Real Carrier Alerts
          </span>
          <span className="text-2xl font-bold text-red-900">{realCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by type, status, or request ID..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {(['all', 'simulation', 'real'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-md font-bold capitalize transition-colors ${
                filterMode === mode
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table / Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Refreshing rescue feed logs...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Radio className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Alert Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-serif">
              Trigger a test distress beacon from the Emergency SOS page to view delivery logs and status timelines here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredAlerts.map((alert) => {
              const isReal = alert.mode === 'real';

              return (
                <div
                  key={alert.id}
                  className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {alert.emergency_type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                        {alert.emergency_status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isReal
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {isReal ? 'Real SMS' : 'Simulation'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(alert.created_at).toLocaleString()}
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {alert.people_count} Person(s)
                      </span>

                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        {alert.location_available && alert.latitude && alert.longitude
                          ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`
                          : 'Location Unavailable'}
                      </span>
                    </div>

                    {alert.message && (
                      <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        "{alert.message}"
                      </p>
                    )}

                    {/* Delivery summary */}
                    <div className="text-[11px] text-slate-500">
                      Deliveries: {alert.deliveries?.length || 0} recipient(s) •{' '}
                      {alert.deliveries?.map((d) => d.masked_phone).join(', ') || 'No deliveries logged'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {onOpenMeshTrack && (
                      <button
                        onClick={() => onOpenMeshTrack(alert.id)}
                        className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <span>Track Mesh</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedAlertForDetail(alert)}
                      className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Audit Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlertForDetail}
        onClose={() => setSelectedAlertForDetail(null)}
        onRefresh={loadAlerts}
      />
    </div>
  );
};
