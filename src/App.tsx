/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { OfflineProvider, useOffline } from './context/OfflineContext';
import { SafetyBanner } from './components/SafetyBanner';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { EmergencySosPage } from './pages/EmergencySosPage';
import { RescueDashboardPage } from './pages/RescueDashboardPage';
import { MeshNetworkPage } from './pages/MeshNetworkPage';
import { ContactsPage } from './pages/ContactsPage';
import { ProfilePage } from './pages/ProfilePage';
import { WifiOff, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('sos');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [selectedAlertForMesh, setSelectedAlertForMesh] = useState<string | null>(null);

  const { isOnline, queuedAlerts, isSyncing, syncNow, syncMessage } = useOffline();

  const handleOpenMeshTrack = (alertId: string) => {
    setSelectedAlertForMesh(alertId);
    setCurrentTab('mesh');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-serif antialiased selection:bg-red-100 selection:text-red-900">
      {/* 1. Mandatory Emergency Notice (India 112 directly) */}
      <SafetyBanner />

      {/* 2. Primary Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'mesh') {
            setSelectedAlertForMesh(null);
          }
        }}
        onOpenLogin={() => setIsAuthModalOpen(true)}
      />

      {/* 3. Offline / Sync Banner Notice */}
      {!isOnline && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 text-amber-800 flex-shrink-0" />
            <span className="font-bold">
              Operating in Offline Mode.
            </span>
            <span>
              Distress beacons will be saved locally to IndexedDB and routed through the simulated local mesh network until connectivity resumes.
            </span>
            {queuedAlerts.length > 0 && (
              <span className="ml-auto font-mono font-bold bg-amber-200 px-2 py-0.5 rounded text-amber-900">
                {queuedAlerts.length} Queued Locally
              </span>
            )}
          </div>
        </div>
      )}

      {isOnline && queuedAlerts.length > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-300 text-emerald-950 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-bold">
                Online Sync Ready:
              </span>
              <span>{queuedAlerts.length} offline beacon(s) are stored in your device queue.</span>
            </div>
            <button
              onClick={() => syncNow(false)}
              disabled={isSyncing}
              className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Queued Alerts Now'}</span>
            </button>
          </div>
        </div>
      )}

      {syncMessage && (
        <div className="bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-1.5 text-xs text-center">
          {syncMessage}
        </div>
      )}

      {/* 4. Main Page View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'sos' && (
          <EmergencySosPage
            onOpenLogin={() => setIsAuthModalOpen(true)}
            onNavigateToContacts={() => setCurrentTab('contacts')}
            onNavigateToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'dashboard' && (
          <RescueDashboardPage onOpenMeshTrack={handleOpenMeshTrack} />
        )}

        {currentTab === 'mesh' && (
          <MeshNetworkPage selectedAlertId={selectedAlertForMesh} />
        )}

        {currentTab === 'contacts' && <ContactsPage />}

        {currentTab === 'profile' && (
          <ProfilePage onOpenLogin={() => setIsAuthModalOpen(true)} />
        )}
      </main>

      {/* 5. Production Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-800">JeevanLink Production Client</span> • Supabase PostgreSQL & Auth Backend
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strictly for emergency triage coordination and mesh simulation. Always dial 112 directly for official India emergency response.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Times New Roman Typography</span>
            <span>•</span>
            <span>RLS Enforced</span>
            <span>•</span>
            <span>IndexedDB Queue Active</span>
          </div>
        </div>
      </footer>

      {/* 6. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <AppContent />
      </OfflineProvider>
    </AuthProvider>
  );
}
