import React, { useState } from 'react';
import {
  Radio,
  RadioTower,
  Users,
  UserCheck,
  Shield,
  Wifi,
  WifiOff,
  LogOut,
  LogIn,
  AlertCircle,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenLogin }) => {
  const { user, profile, signOut, isSimulationUser } = useAuth();
  const { isOnline, queuedAlerts, isSyncing, syncNow } = useOffline();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'sos', label: 'Emergency SOS', icon: Radio },
    { id: 'dashboard', label: 'Rescue Dashboard', icon: Shield },
    { id: 'mesh', label: 'Mesh Network', icon: RadioTower },
    { id: 'contacts', label: 'Emergency Contacts', icon: Users },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('sos')}>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-sm ring-2 ring-red-100">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">JeevanLink</span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                  v2.0 Prod
                </span>
              </div>
              <p className="text-xs text-slate-500 font-serif italic">Emergency SOS & Mesh Network</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Status & Auth Section */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            {/* Online / Offline status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Offline queue badge */}
            {queuedAlerts.length > 0 && (
              <button
                onClick={() => syncNow(false)}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors font-medium"
                title="Click to sync queued alerts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{queuedAlerts.length} Queued</span>
              </button>
            )}

            {/* Auth pill */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1 rounded-md">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800 leading-tight">
                    {profile?.full_name || user.email?.split('@')[0] || 'Citizen'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isSimulationUser ? 'Simulated Session' : 'Supabase Auth'}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="ml-2 p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs mb-2">
            <span className="font-semibold text-slate-700">Network & System:</span>
            <span
              className={`px-2 py-0.5 rounded font-medium ${
                isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'} ({queuedAlerts.length} queued)
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {profile?.full_name || user.email || 'Citizen'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isSimulationUser ? 'Simulated Citizen' : user.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-bold text-red-600 bg-red-50 border border-red-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 text-white font-bold text-sm shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
