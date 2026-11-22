export type AdminRole = 'owner' | 'staff';

export type InquiryStatus =
  | 'New'
  | 'Contacted'
  | 'Booked'
  | 'Visited'
  | 'Closed'
  | 'Not interested';

export type InquiryChannel = 'form' | 'quiz_whatsapp' | 'whatsapp_tap' | 'call_tap';

export interface PhotoSlotRecord {
  slot_id: string;
  category: 'brand' | 'hero' | 'clinic' | 'medicines' | 'herbs' | 'treatments' | 'process' | 'reels';
  label: string;
  target_width: number;
  target_height: number;
  url: string;
  url_480: string;
  url_960: string;
  url_1920: string;
  url_original: string;
  alt_text: string;
  focal_x: number;
  focal_y: number;
  has_patient_face: boolean;
  consent_given: boolean;
  is_published: boolean;
  is_standin: boolean;
  updated_at: string;
  previous_snapshot?: Omit<PhotoSlotRecord, 'previous_snapshot'> | null;
}

export interface TreatmentContent {
  id: string;
  slot_id: string;
  title: string;
  hindi: string;
  softLine: string;
}

export interface ReviewContent {
  id: string;
  quote: string;
  name: string;
  detail: string;
  consent_given: boolean;
  is_published: boolean;
}

export interface FaqContent {
  id: string;
  question: string;
  answer: string;
  is_published: boolean;
}

export interface ReelContent {
  id: string;
  slot_id: string;
  title: string;
  videoUrl: string;
  instagramUrl: string;
}

export interface ClinicPublicContent {
  clinicName: string;
  doctorName: string;
  shortDoctor: string;
  instagramHandle: string;
  instagramUrl: string;
  instagramFollowers: string;
  phones: Array<{ display: string; tel: string; whatsapp: string }>;
  degree: string;
  yearsInPractice: string;
  streetAndDistrict: string;
  timings: string;
  standInCredit: string;
  treatments: TreatmentContent[];
  reviews: ReviewContent[];
  faqs: FaqContent[];
  reels: ReelContent[];
}

export interface ClinicSettingsPublic {
  metaPixelId: string;
  ga4Id: string;
  cookieBannerText: string;
  privacySummary: string;
}

export interface ClinicSettingsAdmin extends ClinicSettingsPublic {
  ownerEmail: string;
  dailySummaryTime: string;
  dailySummaryEnabled: boolean;
  instantAlertEnabled: boolean;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  password_hash: string;
  two_step_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUserPublic {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  two_step_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface VisitorRecord {
  visitor_id: string;
  first_seen_at: string;
  last_seen_at: string;
  first_source: string;
  first_utm_source: string;
  first_utm_medium: string;
  first_utm_campaign: string;
  first_utm_content: string;
  first_fbclid: string;
  first_gclid: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  language: string;
  approx_city: string;
  approx_state: string;
  visit_count: number;
}

export interface SessionRecord {
  session_id: string;
  visitor_id: string;
  started_at: string;
  last_active_at: string;
  duration_seconds: number;
  page_views: number;
  referrer: string;
  source_label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
  gclid: string;
}

export interface TrackingEventRecord {
  id: string;
  visitor_id: string;
  session_id: string;
  event_name: string;
  section_id: string;
  label: string;
  numeric_value: number | null;
  path: string;
  created_at: string;
}

export interface InquiryHistoryEntry {
  id: string;
  inquiry_id: string;
  actor_email: string;
  action_type: string;
  from_status: string;
  to_status: string;
  note: string;
  created_at: string;
}

export interface InquiryRecord {
  id: string;
  patient_phone: string;
  patient_name: string;
  concern: string;
  duration: string;
  visit_mode: string;
  preferred_time: string;
  quiz_dosha: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  first_source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  fbclid: string;
  gclid: string;
  visitor_id: string;
  follow_up_date: string;
  notes: string;
  duplicate_count: number;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  history: InquiryHistoryEntry[];
}

export interface AdSpendRecord {
  id: string;
  month_key: string;
  channel: string;
  amount_inr: number;
  notes: string;
  updated_at: string;
}

export interface ContentVersionRecord {
  id: string;
  edited_by: string;
  summary: string;
  snapshot: ClinicPublicContent;
  created_at: string;
}

export interface NotificationLogEntry {
  id: string;
  type: 'instant_inquiry' | 'daily_summary';
  recipient: string;
  subject: string;
  body: string;
  dispatched_via: 'webhook' | 'server_log';
  created_at: string;
}

export interface PublicBootstrapPayload {
  photos: Record<string, PhotoSlotRecord>;
  content: ClinicPublicContent;
  settings: ClinicSettingsPublic;
  hasStandInPhotos: boolean;
}
