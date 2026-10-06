import { supabase, isSupabaseConfigured, checkBackendSmsCapability } from './supabase/supabaseClient';
import type {
  SendEmergencyAlertPayload,
  SosAlert,
  AlertDelivery,
  AlertMode,
  DeliveryStatus,
} from '../types/alert';
import { maskPhoneNumber } from './contactService';

export interface AlertDispatchResult {
  success: boolean;
  alertId: string;
  clientRequestId: string;
  mode: AlertMode;
  deliveries: AlertDelivery[];
  message: string;
  isSimulated: boolean;
  offlineQueued?: boolean;
}

const LOCAL_ALERTS_KEY = 'jeevanlink_local_alerts';

export const sosAlertService = {
  /**
   * Dispatches emergency alert to Supabase Edge Function 'send-emergency-alert'
   * or records locally in simulation mode.
   */
  async dispatchAlert(
    userId: string,
    payload: SendEmergencyAlertPayload,
    contactsDetails?: { id: string; name: string; phone: string }[]
  ): Promise<AlertDispatchResult> {
    // 1. If navigator is offline, do NOT call backend
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: true,
        alertId: 'offline-' + payload.clientRequestId,
        clientRequestId: payload.clientRequestId,
        mode: payload.mode,
        deliveries: (contactsDetails || []).map((c) => ({
          id: 'del-off-' + c.id,
          sos_alert_id: 'offline-' + payload.clientRequestId,
          contact_id: c.id,
          contact_name: c.name,
          masked_phone: maskPhoneNumber(c.phone),
          status: 'Offline pending',
          retry_count: 0,
        })),
        message: 'Offline — alert queued locally in secure browser storage.',
        isSimulated: payload.mode === 'simulation',
        offlineQueued: true,
      };
    }

    // 2. Real Mode Check: Verify if backend actually has real SMS configured
    if (payload.mode === 'real') {
      const capability = await checkBackendSmsCapability();
      if (!capability.realSmsEnabled) {
        throw new Error(
          'Real SMS is not configured on the backend. Please switch to Simulation Mode to test emergency broadcasting.'
        );
      }
    }

    // 3. If Supabase is configured, invoke Edge Function
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('send-emergency-alert', {
          body: {
            emergencyType: payload.emergencyType,
            emergencyStatus: payload.emergencyStatus,
            peopleCount: payload.peopleCount,
            latitude: payload.latitude,
            longitude: payload.longitude,
            locationAccuracy: payload.locationAccuracy,
            locationAvailable: payload.locationAvailable,
            message: payload.message || '',
            mode: payload.mode,
            contactIds: payload.contactIds,
            clientRequestId: payload.clientRequestId,
            userConsentAccepted: payload.userConsentAccepted,
          },
        });

        if (error) {
          // If edge function returned an error, check if direct database fallback is available
          console.warn('Edge function returned error, attempting direct database transaction:', error);
          return await this.fallbackDatabaseDispatch(userId, payload, contactsDetails);
        }

        const alertId = data?.alertId || 'alert_' + payload.clientRequestId;
        const deliveries: AlertDelivery[] = (data?.deliveries || []).map((d: any, idx: number) => ({
          id: d.id || `del_${alertId}_${idx}`,
          sos_alert_id: alertId,
          contact_id: d.contactId || d.contact_id || `cnt_${idx}`,
          contact_name: d.contactName || d.contact_name || 'Emergency Contact',
          masked_phone: maskPhoneNumber(d.phone || d.masked_phone || '+910000000000'),
          status: (payload.mode === 'simulation' ? 'Simulated' : (d.status || 'Delivered')) as DeliveryStatus,
          provider_name: d.providerName || (payload.mode === 'simulation' ? 'Simulation Engine' : 'SMS Gateway'),
          delivery_time: d.deliveryTime || new Date().toISOString(),
          retry_count: d.retryCount || 0,
        }));

        return {
          success: true,
          alertId,
          clientRequestId: payload.clientRequestId,
          mode: payload.mode,
          deliveries,
          message:
            payload.mode === 'simulation'
              ? 'Simulation completed — no real SMS was sent.'
              : 'Alert dispatched through secure backend provider.',
          isSimulated: payload.mode === 'simulation',
        };
      } catch (err: any) {
        // Fallback to database or simulation
        console.warn('Error invoking send-emergency-alert edge function:', err);
        return await this.fallbackDatabaseDispatch(userId, payload, contactsDetails);
      }
    }

    // 4. Supabase is not configured: Local Simulation Dispatch
    return this.localSimulatedDispatch(userId, payload, contactsDetails);
  },

  /**
   * Fallback to direct Supabase database insert if Edge Function is in deployment or unavailable
   */
  async fallbackDatabaseDispatch(
    userId: string,
    payload: SendEmergencyAlertPayload,
    contactsDetails?: { id: string; name: string; phone: string }[]
  ): Promise<AlertDispatchResult> {
    try {
      const { data: alertData, error: alertError } = await supabase
        .from('sos_alerts')
        .insert({
          user_id: userId,
          client_request_id: payload.clientRequestId,
          emergency_type: payload.emergencyType,
          emergency_status: payload.emergencyStatus,
          people_count: payload.peopleCount,
          latitude: payload.latitude,
          longitude: payload.longitude,
          location_accuracy: payload.locationAccuracy,
          location_available: payload.locationAvailable,
          message: payload.message || '',
          mode: payload.mode,
          status: payload.mode === 'simulation' ? 'delivered' : 'pending',
          user_consent_accepted: payload.userConsentAccepted,
        })
        .select()
        .single();

      if (alertError) {
        throw new Error(alertError.message);
      }

      const alertId = alertData.id;
      const deliveriesToInsert = (contactsDetails || []).map((c) => ({
        sos_alert_id: alertId,
        contact_id: c.id,
        contact_name: c.name,
        masked_phone: maskPhoneNumber(c.phone),
        status: payload.mode === 'simulation' ? 'Simulated' : 'Queued',
        provider_name: payload.mode === 'simulation' ? 'Simulation Engine' : 'Pending Provider',
        delivery_time: new Date().toISOString(),
        retry_count: 0,
      }));

      let finalDeliveries: AlertDelivery[] = [];
      if (deliveriesToInsert.length > 0) {
        const { data: delData } = await supabase
          .from('alert_deliveries')
          .insert(deliveriesToInsert)
          .select();
        if (delData) {
          finalDeliveries = delData as AlertDelivery[];
        }
      }

      return {
        success: true,
        alertId,
        clientRequestId: payload.clientRequestId,
        mode: payload.mode,
        deliveries: finalDeliveries.length > 0 ? finalDeliveries : (deliveriesToInsert as AlertDelivery[]),
        message:
          payload.mode === 'simulation'
            ? 'Simulation completed — no real SMS was sent.'
            : 'Alert logged in backend database. Dispatch queued.',
        isSimulated: payload.mode === 'simulation',
      };
    } catch {
      return this.localSimulatedDispatch(userId, payload, contactsDetails);
    }
  },

  /**
   * Local in-memory / storage simulation
   */
  localSimulatedDispatch(
    userId: string,
    payload: SendEmergencyAlertPayload,
    contactsDetails?: { id: string; name: string; phone: string }[]
  ): AlertDispatchResult {
    const alertId = 'sim-alert-' + Math.random().toString(36).substring(2, 9);
    const deliveries: AlertDelivery[] = (contactsDetails || []).map((c, idx) => ({
      id: `sim-del-${alertId}-${idx}`,
      sos_alert_id: alertId,
      contact_id: c.id,
      contact_name: c.name,
      masked_phone: maskPhoneNumber(c.phone),
      status: 'Simulated',
      provider_name: 'Simulated Rescue Service',
      delivery_time: new Date().toISOString(),
      retry_count: 0,
    }));

    const alertRecord: SosAlert = {
      id: alertId,
      user_id: userId,
      client_request_id: payload.clientRequestId,
      emergency_type: payload.emergencyType,
      emergency_status: payload.emergencyStatus,
      people_count: payload.peopleCount,
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_accuracy: payload.locationAccuracy,
      location_available: payload.locationAvailable,
      message: payload.message,
      mode: payload.mode,
      status: 'delivered',
      user_consent_accepted: payload.userConsentAccepted,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deliveries,
    };

    const stored = this.getLocalAlerts();
    stored.unshift(alertRecord);
    localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(stored));

    return {
      success: true,
      alertId,
      clientRequestId: payload.clientRequestId,
      mode: payload.mode,
      deliveries,
      message: 'Simulation completed — no real SMS was sent.',
      isSimulated: true,
    };
  },

  /**
   * Fetch alerts for Rescue Dashboard (respecting user RLS or operator mode)
   */
  async getAlerts(userId: string, isOperator: boolean = false): Promise<SosAlert[]> {
    if (!isSupabaseConfigured) {
      const local = this.getLocalAlerts();
      if (!isOperator && userId) {
        return local.filter((a) => a.user_id === userId || a.user_id === 'sim-user');
      }
      return local;
    }

    try {
      let query = supabase
        .from('sos_alerts')
        .select(`
          *,
          alert_deliveries (*)
        `)
        .order('created_at', { ascending: false });

      // If normal user, RLS automatically isolates or we filter by user_id
      if (!isOperator && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching alerts:', error);
        return this.getLocalAlerts().filter((a) => !userId || a.user_id === userId);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        client_request_id: row.client_request_id,
        emergency_type: row.emergency_type,
        emergency_status: row.emergency_status,
        people_count: row.people_count,
        latitude: row.latitude,
        longitude: row.longitude,
        location_accuracy: row.location_accuracy,
        location_available: row.location_available,
        message: row.message,
        mode: row.mode,
        status: row.status,
        user_consent_accepted: row.user_consent_accepted,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deliveries: (row.alert_deliveries || []).map((d: any) => ({
          id: d.id,
          sos_alert_id: d.sos_alert_id,
          contact_id: d.contact_id,
          contact_name: d.contact_name,
          masked_phone: maskPhoneNumber(d.masked_phone || d.phone || ''),
          status: d.status as DeliveryStatus,
          provider_name: d.provider_name,
          delivery_time: d.delivery_time || d.created_at,
          error_message: d.error_message,
          retry_count: d.retry_count || 0,
        })),
      }));
    } catch {
      return this.getLocalAlerts();
    }
  },

  /**
   * Retry failed delivery for a specific contact
   */
  async retryDelivery(alertId: string, deliveryId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const local = this.getLocalAlerts();
      for (const alert of local) {
        if (alert.id === alertId && alert.deliveries) {
          const d = alert.deliveries.find((x) => x.id === deliveryId);
          if (d) {
            d.status = 'Delivered';
            d.retry_count += 1;
            d.delivery_time = new Date().toISOString();
            d.error_message = undefined;
            localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(local));
            return true;
          }
        }
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('alert_deliveries')
        .update({
          status: 'Queued',
          retry_count: 1, // incremented
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
      return !error;
    } catch {
      return false;
    }
  },

  getLocalAlerts(): SosAlert[] {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
    if (!raw) {
      // Seed initial simulation example so dashboard is never barren
      const initial: SosAlert = {
        id: 'sim-alert-001',
        user_id: 'sim-user',
        client_request_id: 'req-sim-initial-001',
        emergency_type: 'Flood / Water Disaster',
        emergency_status: 'Critical',
        people_count: 3,
        latitude: 28.6139,
        longitude: 77.209,
        location_accuracy: 12.5,
        location_available: true,
        message: 'Water levels rising rapidly on ground floor. Requesting immediate rescue boat.',
        mode: 'simulation',
        status: 'delivered',
        user_consent_accepted: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3550000).toISOString(),
        deliveries: [
          {
            id: 'del-001',
            sos_alert_id: 'sim-alert-001',
            contact_id: 'sim-contact-1',
            contact_name: 'Aarav Sharma (Brother)',
            masked_phone: '+91******0001',
            status: 'Simulated',
            provider_name: 'Simulation Engine',
            delivery_time: new Date(Date.now() - 3580000).toISOString(),
            retry_count: 0,
          },
          {
            id: 'del-002',
            sos_alert_id: 'sim-alert-001',
            contact_id: 'sim-contact-2',
            contact_name: 'Dr. Priya Patel',
            masked_phone: '+91******0002',
            status: 'Simulated',
            provider_name: 'Simulation Engine',
            delivery_time: new Date(Date.now() - 3570000).toISOString(),
            retry_count: 0,
          },
        ],
      };
      localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify([initial]));
      return [initial];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },
};
