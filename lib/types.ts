export type UserRole = 'SUPER_ADMIN' | 'GYM_ADMIN';
export type GymStatus = 'active' | 'suspended';
export type MusicTrackStatus = 'active' | 'disabled' | 'license_review' | 'removed' | 'broken';

export interface Gym {
  id: string;
  gym_id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: GymStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  gym_id: string | null;
  name: string;
  status: GymStatus | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  discount: number;
  final_price: number;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  member_id: string;
  name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  plan_id: string | null;
  start_date: string | null;
  expiry_date: string | null;
  amount_paid: number;
  status: string;
  qr_token: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  created_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string | null;
  amount: number;
  discount: number;
  payment_method: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface MusicTrackRecord {
  id: string;
  provider: string;
  provider_track_id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  sub_genre: string | null;
  country_or_region: string | null;
  language: string | null;
  energy_level: number | null;
  bpm: number | null;
  duration: number | null;
  artwork_url: string | null;
  stream_url: string | null;
  source_url: string | null;
  provider_track_url: string | null;
  source: string | null;
  license_name: string | null;
  license_url: string | null;
  commercial_use_allowed: boolean;
  public_performance_allowed: boolean;
  attribution_required: boolean;
  attribution_text: string | null;
  verification_date: string | null;
  verification_notes: string | null;
  is_explicit: boolean;
  status: MusicTrackStatus;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  totalRevenue: number;
  todayAttendance: number;
  totalGyms?: number;
}
