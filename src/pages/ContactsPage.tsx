import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Star,
  StarOff,
  ShieldCheck,
  ShieldAlert,
  Info,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  contactService,
  validateIndianPhone,
  maskPhoneNumber,
} from '../services/contactService';
import type { EmergencyContact } from '../types/alert';

export const ContactsPage: React.FC = () => {
  const { user, isSimulationUser } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Family');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);

    if (!user) {
      // In simulation mode without user, load demo contacts
      const demo = contactService.getSimulationDemoContacts();
      setContacts(demo);
      setLoading(false);
      return;
    }

    const res = await contactService.getContacts(user.id);
    if (res.error) {
      setError(res.error);
    } else {
      setContacts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setRelationship('Family');
    setIsPrimary(false);
    setFormError(null);
    setIsAdding(false);
    setEditingContactId(null);
  };

  const handleEditClick = (contact: EmergencyContact) => {
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setIsPrimary(contact.is_primary);
    setEditingContactId(contact.id);
    setIsAdding(true);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setFormError('Contact name is required.');
      return;
    }

    const validation = validateIndianPhone(phone);
    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid Indian phone number.');
      return;
    }

    setSubmitting(true);
    const userId = user?.id || 'sim-user';

    if (editingContactId) {
      // Update existing
      const res = await contactService.updateContact(userId, editingContactId, {
        name: name.trim(),
        phone: validation.normalized,
        relationship: relationship.trim(),
        is_primary: isPrimary,
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        setSuccessMsg('Emergency contact updated successfully.');
        resetForm();
        await loadContacts();
      }
    } else {
      // Add new contact
      const res = await contactService.addContact(userId, {
        name: name.trim(),
        phone: validation.normalized,
        relationship: relationship.trim(),
        is_primary: isPrimary,
        is_verified: true, // Auto-verified for trusted emergency circle
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        setSuccessMsg('Emergency contact added successfully.');
        resetForm();
        await loadContacts();
      }
    }

    setSubmitting(false);
  };

  const handleDelete = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to remove this emergency contact?')) return;
    const userId = user?.id || 'sim-user';
    const res = await contactService.deleteContact(userId, contactId);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg('Contact removed.');
      await loadContacts();
    }
  };

  const handleTogglePrimary = async (contact: EmergencyContact) => {
    const userId = user?.id || 'sim-user';
    await contactService.updateContact(userId, contact.id, {
      is_primary: !contact.is_primary,
    });
    await loadContacts();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-800" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Emergency Contacts Directory
            </h1>
          </div>
          <p className="text-sm text-slate-600 font-serif italic mt-1">
            Manage trusted responders for real SMS dispatch and local mesh coordination
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAdding(!isAdding);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAdding ? 'Cancel Entry' : 'Add Emergency Contact'}</span>
        </button>
      </div>

      {/* Alerts / Feedback */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Form Modal / Card */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-300 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {editingContactId ? 'Edit Emergency Contact' : 'Register New Emergency Contact'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">Indian Format: +91 XXXXXXXXXX</span>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ananya Sen"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Indian Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210 or 9876543210"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must be a valid 10-digit Indian mobile starting with 6, 7, 8, or 9
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Family">Family Member</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Close Friend</option>
                  <option value="Neighbor">Local Neighbor</option>
                  <option value="Doctor">Doctor / Medical Contact</option>
                  <option value="Colleague">Colleague</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 text-slate-900 rounded"
                  />
                  <span>Designate as Primary Emergency Contact</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingContactId ? 'Update Contact' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contact List Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Registered Responders ({contacts.length})
            </span>
          </div>
          <button
            onClick={loadContacts}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading emergency contacts database...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No Emergency Contacts Registered</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-serif">
              Add at least 1-3 trusted family members or neighbors so distress signals can reach them immediately during an incident.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{contact.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {contact.relationship}
                    </span>
                    {contact.is_primary && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Primary Contact
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-mono">{maskPhoneNumber(contact.phone)}</span>
                    <span>•</span>
                    {contact.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified for Real SMS
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-amber-700 font-semibold"
                        title={contact.verification_reason || 'Requires confirmation'}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        Unverified (Available in Simulation Mode)
                      </span>
                    )}
                  </div>

                  {!contact.is_verified && (
                    <p className="text-[11px] text-amber-800 italic mt-0.5">
                      Notice: {contact.verification_reason || 'Requires verification before real carrier SMS delivery.'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleTogglePrimary(contact)}
                    title={contact.is_primary ? 'Unset primary' : 'Set as primary'}
                    className={`p-1.5 rounded border text-xs ${
                      contact.is_primary
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleEditClick(contact)}
                    className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Policy Notice */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Phone Privacy & DLT Regulation Compliance: </span>
          All telephone numbers are normalized to E.164 Indian format (+91XXXXXXXXXX) and masked in all public feeds and delivery reports. JeevanLink does not share contact details with third-party advertisers.
        </div>
      </div>
    </div>
  );
};
