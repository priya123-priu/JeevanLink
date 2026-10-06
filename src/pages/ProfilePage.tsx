import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  User,
  Phone,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Save,
  Shield,
  Heart,
  MapPin,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateIndianPhone } from '../services/contactService';

export const ProfilePage: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { user, profile, updateProfile, refreshProfile, isSimulationUser } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [emergencyStatus, setEmergencyStatus] = useState<string>('Safe / Standby');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('Unknown');
  const [address, setAddress] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAge(profile.age ? String(profile.age) : '');
      setPhone(profile.phone || '');
      setPeopleCount(profile.people_count || 1);
      setEmergencyStatus(profile.emergency_status || 'Safe / Standby');
      setMedicalNotes(profile.medical_notes || '');
      setBloodGroup(profile.blood_group || 'Unknown');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('Authentication required to save profile.');
      return;
    }

    if (!fullName.trim()) {
      setError('Full legal name is required.');
      return;
    }

    let normalizedPhone = phone;
    if (phone.trim()) {
      const validation = validateIndianPhone(phone);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid Indian phone number format.');
        return;
      }
      normalizedPhone = validation.normalized;
    }

    setLoading(true);

    const updates = {
      full_name: fullName.trim(),
      age: age ? parseInt(age) : null,
      phone: normalizedPhone,
      people_count: peopleCount,
      emergency_status: emergencyStatus,
      medical_notes: medicalNotes.trim(),
      bloodGroup: bloodGroup,
      address: address.trim(),
    };

    const res = await updateProfile(updates);
    setLoading(false);

    if (res.success) {
      setSuccess('Profile updated successfully in the backend database.');
    } else {
      setError(res.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-slate-800" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Citizen Emergency Profile
            </h1>
          </div>
          <p className="text-sm text-slate-600 font-serif italic mt-1">
            Personal triage data synced to Supabase PostgreSQL with authenticated RLS
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
            <span className="font-semibold text-slate-700">Authenticated UID:</span>
            <span className="font-mono text-slate-900 font-bold">
              {user.id.substring(0, 12)}...
            </span>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            Sign In to Sync Profile
          </button>
        )}
      </div>

      {/* Auth Guard Banner if not logged in */}
      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              You are currently viewing in guest simulation mode. Sign in to link your emergency profile to your official Supabase user ID.
            </span>
          </div>
          <button
            onClick={onOpenLogin}
            className="font-bold underline text-amber-950 flex-shrink-0"
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Primary Citizen Information
          </h3>
          <p className="text-xs text-slate-500 font-serif">
            Included in emergency triage telemetry dispatched during SOS triggers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Chandra Verma"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Registered Indian Mobile *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Age
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="34"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Blood Group
            </label>
            <div className="relative">
              <Heart className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="Unknown">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Household / Group Size
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                max="50"
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Default Emergency Status
          </label>
          <select
            value={emergencyStatus}
            onChange={(e) => setEmergencyStatus(e.target.value)}
            className="w-full p-2.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
          >
            <option value="Safe / Standby">Safe / Standby</option>
            <option value="Immediate Assistance Needed">Immediate Assistance Needed</option>
            <option value="Critical">Critical</option>
            <option value="Injured / Needs First Aid">Injured / Needs First Aid</option>
            <option value="Trapped but Stable">Trapped but Stable</option>
            <option value="Shelter in Place">Shelter in Place</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Primary Residential Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 302, Green Park Apartments, Sector 12, Dwarka, New Delhi"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Crucial Medical Notes / Allergies
            </label>
            <textarea
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g. Severe Penicillin allergy, Diabetic Type 2, requires daily insulin"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-serif italic">
            All data stored in PostgreSQL with Supabase Row Level Security (RLS)
          </span>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
