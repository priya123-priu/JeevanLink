import { supabase, isSupabaseConfigured } from './supabase/supabaseClient';
import type { EmergencyContact } from '../types/alert';

const LOCAL_CONTACTS_KEY = 'jeevanlink_local_contacts';

/**
 * Validates whether a phone string is a valid Indian mobile number.
 * Must be 10 digits starting with 6, 7, 8, or 9 (with or without +91 / 0 prefix).
 */
export function validateIndianPhone(input: string): { isValid: boolean; normalized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  // Remove spaces, hyphens, parentheses
  let cleaned = input.replace(/[\s\-()]/g, '');

  // Strip leading 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Strip leading +91 or 91 if it has 12 digits
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // Cleaned must now be exactly 10 digits and start with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Invalid Indian mobile number. Must be a 10-digit number starting with 6, 7, 8, or 9.',
    };
  }

  return {
    isValid: true,
    normalized: `+91${cleaned}`,
  };
}

/**
 * Masks phone number into +91******1234 for privacy and security
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '+91******0000';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    return `+91******${last4}`;
  }
  return '+91******' + phone.slice(-4);
}

export const contactService = {
  async getContacts(userId: string): Promise<{ data: EmergencyContact[]; error: string | null }> {
    if (!userId) {
      return { data: [], error: 'User ID is required.' };
    }

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(`${LOCAL_CONTACTS_KEY}_${userId}`);
      if (stored) {
        try {
          return { data: JSON.parse(stored), error: null };
        } catch {
          // ignore
        }
      }
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data as EmergencyContact[]) || [], error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to fetch emergency contacts.' };
    }
  },

  async addContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: EmergencyContact | null; error: string | null }> {
    if (!userId) return { data: null, error: 'User is not authenticated.' };

    const validation = validateIndianPhone(contact.phone);
    if (!validation.isValid) {
      return { data: null, error: validation.error || 'Invalid phone number.' };
    }

    // Check duplicate phone for this user
    const existing = await this.getContacts(userId);
    if (existing.data.some((c) => c.phone === validation.normalized)) {
      return { data: null, error: 'This phone number is already in your emergency contacts.' };
    }

    const newContact: EmergencyContact = {
      id: 'cnt_' + Math.random().toString(36).substring(2, 10),
      user_id: userId,
      name: contact.name.trim(),
      phone: validation.normalized,
      relationship: contact.relationship.trim(),
      is_primary: contact.is_primary || existing.data.length === 0,
      is_verified: contact.is_verified ?? false,
      verification_reason: contact.is_verified
        ? undefined
        : 'Requires recipient mobile verification confirmation before real SMS dispatch.',
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const list = [newContact, ...existing.data];
      localStorage.setItem(`${LOCAL_CONTACTS_KEY}_${userId}`, JSON.stringify(list));
      return { data: newContact, error: null };
    }

    try {
      // If setting this as primary, remove primary status from others
      if (newContact.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: userId,
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship,
          is_primary: newContact.is_primary,
          is_verified: newContact.is_verified,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as EmergencyContact, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to save emergency contact.' };
    }
  },

  async updateContact(
    userId: string,
    contactId: string,
    updates: Partial<EmergencyContact>
  ): Promise<{ data: EmergencyContact | null; error: string | null }> {
    if (!userId) return { data: null, error: 'User is not authenticated.' };

    if (updates.phone) {
      const validation = validateIndianPhone(updates.phone);
      if (!validation.isValid) {
        return { data: null, error: validation.error || 'Invalid phone number.' };
      }
      updates.phone = validation.normalized;
    }

    if (!isSupabaseConfigured) {
      const existing = await this.getContacts(userId);
      const updatedList = existing.data.map((c) => (c.id === contactId ? { ...c, ...updates } : c));
      localStorage.setItem(`${LOCAL_CONTACTS_KEY}_${userId}`, JSON.stringify(updatedList));
      const target = updatedList.find((c) => c.id === contactId) || null;
      return { data: target, error: null };
    }

    try {
      if (updates.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as EmergencyContact, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update contact.' };
    }
  },

  async deleteContact(userId: string, contactId: string): Promise<{ success: boolean; error: string | null }> {
    if (!userId) return { success: false, error: 'User is not authenticated.' };

    if (!isSupabaseConfigured) {
      const existing = await this.getContacts(userId);
      const filtered = existing.data.filter((c) => c.id !== contactId);
      localStorage.setItem(`${LOCAL_CONTACTS_KEY}_${userId}`, JSON.stringify(filtered));
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete contact.' };
    }
  },

  /**
   * Helper for simulation/demo mode only
   */
  getSimulationDemoContacts(): EmergencyContact[] {
    return [
      {
        id: 'sim-contact-1',
        user_id: 'sim-user',
        name: 'Aarav Sharma (Brother)',
        phone: '+919876500001',
        relationship: 'Brother',
        is_primary: true,
        is_verified: true,
      },
      {
        id: 'sim-contact-2',
        user_id: 'sim-user',
        name: 'Dr. Priya Patel (Family Doctor)',
        phone: '+919876500002',
        relationship: 'Doctor',
        is_primary: false,
        is_verified: true,
      },
      {
        id: 'sim-contact-3',
        user_id: 'sim-user',
        name: 'Rohan Verma (Neighbor)',
        phone: '+919876500003',
        relationship: 'Neighbor',
        is_primary: false,
        is_verified: false,
        verification_reason: 'Contact has not completed verification protocol.',
      },
    ];
  },
};
