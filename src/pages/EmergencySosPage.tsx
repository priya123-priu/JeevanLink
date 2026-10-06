import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  AlertTriangle,
  Users,
  Shield,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  PhoneCall,
  Info,
  RefreshCw,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { contactService, maskPhoneNumber } from '../services/contactService';
import { sosAlertService, AlertDispatchResult } from '../services/sosAlertService';
import { offlineQueue } from '../services/offlineQueue';
import { checkBackendSmsCapability } from '../services/supabase/supabaseClient';
import type { EmergencyContact, EmergencyType, EmergencyStatus, AlertMode, AlertDelivery } from '../types/alert';
import { EmergencyMap } from '../components/EmergencyMap';

interface EmergencySosPageProps {
  onOpenLogin: () => void;
  onNavigateToContacts: () => void;
  onNavigateToDashboard: () => void;
}

const EMERGENCY_TYPES: EmergencyType[] = [
  'Medical',
  'Flood / Water Disaster',
  'Earthquake / Collapse',
  'Fire Emergency',
  'Trapped / Stranded',
  'Cyclone / Severe Weather',
  'General Threat / SOS',
];

const EMERGENCY_STATUSES: EmergencyStatus[] = [
  'Critical',
  'Immediate Assistance Needed',
  'Injured / Needs First Aid',
  'Trapped but Stable',
  'Shelter in Place',
  'Safe / Standby',
];

export const EmergencySosPage: React.FC<EmergencySosPageProps> = ({
  onOpenLogin,
  onNavigateToContacts,
  onNavigateToDashboard,
}) => {
  const { user, profile, isSimulationUser } = useAuth();
  const { isOnline, refreshQueue } = useOffline();

  // Form State
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('Medical');
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>('Critical');
  const [peopleCount, setPeopleCount] = useState<number>(profile?.people_count || 1);
  const [message, setMessage] = useState<string>('');
  const [mode, setMode] = useState<AlertMode>('simulation');
  const [userConsentAccepted, setUserConsentAccepted] = useState<boolean>(false);

  // Contacts
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(true);

  // Backend Real SMS capability check
  const [backendRealSmsEnabled, setBackendRealSmsEnabled] = useState<boolean>(false);
  const [backendCapabilityChecked, setBackendCapabilityChecked] = useState<boolean>(false);

  // Geolocation
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  // SOS Countdown & Execution State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<AlertDispatchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client Request ID ref for persistence
  const clientRequestIdRef = useRef<string>('');
  const countdownTimerRef = useRef<any>(null);

  // Check Backend capability on mount
  useEffect(() => {
    async function checkCapability() {
      const cap = await checkBackendSmsCapability();
      setBackendRealSmsEnabled(cap.realSmsEnabled);
      setBackendCapabilityChecked(true);
      if (!cap.realSmsEnabled) {
        setMode('simulation');
      }
    }
    checkCapability();
  }, []);

  // Fetch Contacts
  useEffect(() => {
    async function loadContacts() {
      setIsLoadingContacts(true);
      if (user) {
        const res = await contactService.getContacts(user.id);
        if (res.data.length > 0) {
          setContacts(res.data);
          // Auto-select verified contacts or primary
          const verified = res.data.filter((c) => c.is_verified).map((c) => c.id);
          setSelectedContactIds(verified.length > 0 ? verified : res.data.map((c) => c.id));
        } else if (isSimulationUser) {
          // In simulation user mode, provide demo contacts
          const demo = contactService.getSimulationDemoContacts();
          setContacts(demo);
          setSelectedContactIds(demo.filter((c) => c.is_verified).map((c) => c.id));
        } else {
          setContacts([]);
          setSelectedContactIds([]);
        }
      } else {
        // Not logged in: show simulation demo contacts
        const demo = contactService.getSimulationDemoContacts();
        setContacts(demo);
        setSelectedContactIds(demo.filter((c) => c.is_verified).map((c) => c.id));
      }
      setIsLoadingContacts(false);
    }
    loadContacts();
  }, [user, isSimulationUser]);

  // Request location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLoadingLocation(false);
      },
      (err) => {
        setIsLoadingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Alert will still be sent without GPS coordinates.');
        } else {
          setLocationError('Unable to acquire current GPS location. Alert will proceed without coordinates.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Toggle Contact Selection
  const toggleContact = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (mode === 'real' && contact && !contact.is_verified) {
      // Cannot select unverified contact in real mode
      return;
    }
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Step 1: User hits SOS distress button -> Prompt confirmation or trigger countdown
  const handleInitiateSos = () => {
    setErrorMessage(null);

    // Validation for real mode
    if (mode === 'real') {
      if (!user) {
        setErrorMessage('Authentication required to dispatch real emergency alerts.');
        return;
      }
      if (!backendRealSmsEnabled) {
        setErrorMessage('Real SMS is not configured on the backend. Please use Simulation Mode.');
        return;
      }
      if (selectedContactIds.length === 0) {
        setErrorMessage('Please select at least one verified emergency contact.');
        return;
      }
      if (!userConsentAccepted) {
        setErrorMessage('Explicit authorization is required for real carrier SMS dispatch.');
        return;
      }
    }

    // Generate unique clientRequestId
    clientRequestIdRef.current = 'req_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

    // Show Confirmation step
    setShowConfirmModal(true);
  };

  // Step 2: Confirmation modal accepted -> Start 5-second countdown
  const handleConfirmAndStartCountdown = () => {
    setShowConfirmModal(false);
    // Request location in parallel if not already acquired
    if (!location && !locationError) {
      requestLocation();
    }
    setCountdown(5);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimerRef.current);
          executeSosDispatch();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel countdown
  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(null);
  };

  // Step 3: Execute Alert Dispatch
  const executeSosDispatch = async () => {
    setIsDispatching(true);
    setErrorMessage(null);

    const payload = {
      emergencyType,
      emergencyStatus,
      peopleCount,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      locationAccuracy: location?.accuracy || null,
      locationAvailable: Boolean(location?.lat && location?.lng),
      message,
      mode,
      contactIds: selectedContactIds,
      clientRequestId: clientRequestIdRef.current,
      userConsentAccepted,
    };

    const targetContacts = contacts.filter((c) => selectedContactIds.includes(c.id));

    // Save to offline queue first
    await offlineQueue.enqueue(payload);
    await refreshQueue();

    try {
      const result = await sosAlertService.dispatchAlert(
        user?.id || 'sim-user',
        payload,
        targetContacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
      );

      // If backend succeeded, remove from offline queue
      if (result.success && !result.offlineQueued) {
        await offlineQueue.remove(payload.clientRequestId);
        await refreshQueue();
      }

      setDispatchResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during alert dispatch.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Emergency Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Emergency SOS Beacon Console
            </h1>
          </div>
          <p className="text-sm text-slate-600 font-serif italic mt-1">
            Dispatch verified distress beacons via Supabase Edge Function & Mesh Telemetry
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-300">
          <button
            onClick={() => setMode('simulation')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'simulation'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulation Mode
          </button>
          <button
            onClick={() => {
              if (!backendRealSmsEnabled) {
                alert('Real SMS is not configured on the backend. Remaining in Simulation Mode.');
                return;
              }
              setMode('real');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'real'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Real SMS Mode</span>
            {!backendRealSmsEnabled && (
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-normal">
                Off
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Alert Trigger Warning:</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Countdown Active Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-red-600">
            <div className="w-24 h-24 rounded-full bg-red-100 border-4 border-red-600 flex items-center justify-center mx-auto mb-6 text-red-700 font-extrabold text-5xl animate-bounce">
              {countdown}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">SOS Transmitting Soon</h2>
            <p className="text-sm text-slate-600 mb-6">
              Distress beacon will be dispatched in {countdown} seconds. If this is accidental, click CANCEL immediately.
            </p>
            <button
              onClick={handleCancelCountdown}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-base transition-colors shadow-lg"
            >
              CANCEL SOS DISPATCH
            </button>
          </div>
        </div>
      )}

      {/* Results View Modal */}
      {dispatchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Alert Delivery Summary</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                {dispatchResult.clientRequestId.substring(0, 14)}
              </span>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div
                className={`p-3.5 rounded-lg border text-sm ${
                  dispatchResult.isSimulated
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {dispatchResult.message}
                </div>
                {dispatchResult.isSimulated && (
                  <p className="text-xs mt-1 text-blue-800">
                    Simulation completed — no real SMS was sent.
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Recipient Contact Deliveries ({dispatchResult.deliveries.length})
                </h4>
                <div className="space-y-2">
                  {dispatchResult.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{delivery.contact_name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {delivery.masked_phone}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          delivery.status === 'Simulated'
                            ? 'bg-blue-100 text-blue-800'
                            : delivery.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded text-xs text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Distress Type: </span>
                  {emergencyType}
                </div>
                <div>
                  <span className="font-semibold">Status: </span>
                  {emergencyStatus}
                </div>
                <div>
                  <span className="font-semibold">People in Need: </span>
                  {peopleCount}
                </div>
                <div>
                  <span className="font-semibold">GPS: </span>
                  {location
                    ? `${location.lat.toFixed(5)}° N, ${location.lng.toFixed(5)}° E (±${Math.round(location.accuracy || 15)}m)`
                    : 'Location unavailable'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={onNavigateToDashboard}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
              >
                View on Rescue Dashboard
              </button>
              <button
                onClick={() => setDispatchResult(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-xs hover:bg-slate-800"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Requirement 5.C) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-red-800 text-white p-5 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
              <div>
                <h3 className="font-bold text-base">Confirm Distress Broadcast</h3>
                <p className="text-xs text-red-200">Review emergency details before countdown</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="bg-red-50 border border-red-200 p-3 rounded text-red-900 font-semibold">
                For immediate emergency help in India, call 112 directly.
              </div>

              <div className="space-y-2 border-y border-slate-200 py-3">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">Emergency Type:</span>
                  <span className="font-bold text-slate-900">{emergencyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">Emergency Status:</span>
                  <span className="font-bold text-red-700">{emergencyStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">People Count:</span>
                  <span className="font-bold text-slate-900">{peopleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">Location Status:</span>
                  <span className="font-bold text-slate-900">
                    {location ? 'Available (GPS Acquired)' : 'Unavailable (Will send without coordinates)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">Broadcast Mode:</span>
                  <span className="font-bold uppercase tracking-wide">
                    {mode === 'real' ? 'Real Carrier SMS' : 'Simulation Mode'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">Selected Recipients:</span>
                  <span className="font-bold text-slate-900">{selectedContactIds.length} Contact(s)</span>
                </div>
              </div>

              <p className="text-slate-500 italic text-[11px]">
                Upon confirmation, a 5-second cancelable countdown will begin before message transmission.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md font-bold text-xs hover:bg-slate-100"
              >
                Abort
              </button>
              <button
                onClick={handleConfirmAndStartCountdown}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold text-xs shadow-md"
              >
                Start 5-Second Countdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: SOS Button & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big SOS Distress Trigger & Parameters */}
        <div className="lg:col-span-7 space-y-6">
          {/* Giant Distress Card */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  mode === 'real'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {mode === 'real' ? 'Live SMS Armed' : 'Simulation Mode'}
              </span>
            </div>

            <div className="max-w-md mx-auto my-6 flex flex-col items-center">
              {/* Outer Pulse Rings */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-52 h-52 rounded-full bg-red-500/20 animate-pulse-ring pointer-events-none"></div>
                <div className="absolute w-44 h-44 rounded-full bg-red-600/30 animate-pulse pointer-events-none"></div>

                {/* Distress Button */}
                <button
                  type="button"
                  onClick={handleInitiateSos}
                  disabled={isDispatching || countdown !== null}
                  className="relative w-36 h-36 rounded-full bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white font-black text-2xl tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center border-4 border-white ring-4 ring-red-200 disabled:opacity-50 disabled:scale-100 cursor-pointer"
                >
                  <Radio className="w-8 h-8 mb-1 animate-pulse" />
                  <span>SOS</span>
                  <span className="text-[10px] font-normal tracking-normal text-red-200">
                    PRESS TO BROADCAST
                  </span>
                </button>
              </div>

              <div className="mt-8 text-xs text-slate-500">
                {isOnline ? (
                  <span className="text-emerald-700 font-medium">
                    ✓ Connected to JeevanLink Telemetry Engine
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold">
                    Offline: Alert will be queued securely in IndexedDB and mesh-relayed
                  </span>
                )}
              </div>
            </div>

            {/* Emergency Notice within SOS card */}
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4 text-red-700 flex-shrink-0" />
              <span className="font-semibold">
                For immediate emergency help in India, call 112 directly.
              </span>
            </div>
          </div>

          {/* Distress Configuration Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
              Emergency Parameters & Triage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Category</label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {EMERGENCY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Distress Status</label>
                <select
                  value={emergencyStatus}
                  onChange={(e) => setEmergencyStatus(e.target.value as EmergencyStatus)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {EMERGENCY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  People in Need / With You
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                    className="w-8 h-8 rounded border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 p-1.5 text-center text-xs font-bold border border-slate-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setPeopleCount(peopleCount + 1)}
                    className="w-8 h-8 rounded border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500 font-serif">Person(s)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Situation Note
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Ground floor flooded, power cut"
                  maxLength={160}
                  className="w-full p-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Consent for real SMS mode */}
            {mode === 'real' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={userConsentAccepted}
                    onChange={(e) => setUserConsentAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="consent" className="font-semibold text-amber-950 cursor-pointer">
                    I explicitly authorize sending emergency SMS broadcasts containing my live GPS coordinates and situation status to my verified emergency contacts.
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact Selector & Map View */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Contacts Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Target Emergency Contacts ({selectedContactIds.length}/{contacts.length})
                </h3>
              </div>
              <button
                onClick={onNavigateToContacts}
                className="text-xs font-bold text-red-700 hover:underline flex items-center gap-0.5"
              >
                Manage
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingContacts ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded text-center text-xs space-y-2">
                <p className="text-slate-600">No emergency contacts registered yet.</p>
                <button
                  onClick={onNavigateToContacts}
                  className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold"
                >
                  Add Emergency Contacts
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  const canSelect = mode === 'simulation' || contact.is_verified;

                  return (
                    <div
                      key={contact.id}
                      onClick={() => canSelect && toggleContact(contact.id)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        !canSelect
                          ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-red-50/60 border-red-300 cursor-pointer'
                          : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 text-red-600 rounded"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{contact.name}</span>
                            {contact.is_primary && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-normal">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {maskPhoneNumber(contact.phone)}
                          </div>
                        </div>
                      </div>

                      <div>
                        {contact.is_verified ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Verified
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300"
                            title={contact.verification_reason || 'Unverified contact'}
                          >
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-500 italic pt-1">
              Notice: All recipient mobile numbers are strictly masked (+91******1234) for privacy.
            </p>
          </div>

          {/* Emergency Map Component */}
          <EmergencyMap
            userLocation={location}
            locationError={locationError}
            onRequestLocation={requestLocation}
            isLoadingLocation={isLoadingLocation}
          />
        </div>
      </div>
    </div>
  );
};
