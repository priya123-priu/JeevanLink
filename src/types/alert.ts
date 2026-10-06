export type EmergencyType =
  | 'Medical'
  | 'Flood / Water Disaster'
  | 'Earthquake / Collapse'
  | 'Fire Emergency'
  | 'Trapped / Stranded'
  | 'Cyclone / Severe Weather'
  | 'General Threat / SOS';

export type EmergencyStatus =
  | 'Critical'
  | 'Immediate Assistance Needed'
  | 'Injured / Needs First Aid'
  | 'Trapped but Stable'
  | 'Shelter in Place'
  | 'Safe / Standby';

export type AlertMode = 'simulation' | 'real';

export type AlertStatus =
  | 'draft'
  | 'countdown'
  | 'pending'
  | 'offline_queued'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'resolved';

export type DeliveryStatus =
  | 'Simulated'
  | 'Queued'
  | 'Sent'
  | 'Delivered'
  | 'Failed'
  | 'Not configured'
  | 'Offline pending';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AlertDelivery {
  id: string;
  sos_alert_id: string;
  contact_id: string;
  contact_name: string;
  masked_phone: string;
  status: DeliveryStatus;
  provider_name?: string;
  delivery_time?: string;
  error_message?: string;
  retry_count: number;
}

export interface SosAlert {
  id: string;
  user_id: string;
  client_request_id: string;
  emergency_type: EmergencyType;
  emergency_status: EmergencyStatus;
  people_count: number;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_available: boolean;
  message?: string;
  mode: AlertMode;
  status: AlertStatus;
  user_consent_accepted: boolean;
  created_at: string;
  updated_at: string;
  deliveries?: AlertDelivery[];
  user_full_name?: string;
}

export interface SendEmergencyAlertPayload {
  emergencyType: EmergencyType;
  emergencyStatus: EmergencyStatus;
  peopleCount: number;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationAvailable: boolean;
  message?: string;
  mode: AlertMode;
  contactIds: string[];
  clientRequestId: string;
  userConsentAccepted: boolean;
}

export interface OfflineQueuedAlert {
  clientRequestId: string;
  payload: SendEmergencyAlertPayload;
  queuedAt: string;
  status: 'offline_pending';
  retryAttempts: number;
}
