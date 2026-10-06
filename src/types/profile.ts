export interface UserProfile {
  id: string;
  full_name: string;
  age: number | null;
  phone: string;
  people_count: number;
  emergency_status: string;
  medical_notes?: string;
  blood_group?: string;
  address?: string;
  updated_at?: string;
}
