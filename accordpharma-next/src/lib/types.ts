export interface Account {
  id: string;
  name: string;
  account_type: 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'DISTRIBUTOR';
  territory: string;
  city?: string;
  state?: string;
  owner_id: string;
  owner_name: string;
  beds?: number;
  health_status: 'healthy' | 'attention' | 'at_risk';
  health_score: number;
  total_invoiced: number;
  total_collected: number;
  open_deals_count: number;
  created_at: string;
}

export interface HealthcareProfessional {
  id: string;
  account_id: string;
  account_name: string;
  full_name: string;
  title?: string;
  specialty: string;
  license_number: string;
  prescribing_tier: 'Tier 1 (High Decile)' | 'Tier 2 (Medium Decile)' | 'Tier 3 (Emerging)' | 'Key Opinion Leader (KOL)';
  kol_status: boolean;
  email: string;
  phone: string;
  country: string;
  territory: string;
  last_interaction_at?: string;
  next_scheduled_visit?: string;
  interactions_count: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
}

export interface DetailingSlide {
  slide_id: string;
  title: string;
  subtitle: string;
  content: string;
  key_metric?: string;
  chart_type?: 'survival_curve' | 'biochemical_cascade' | 'safety_bar' | 'dosing_matrix';
  hazard_ratio?: string;
  clinical_evidence?: string;
}

export interface DetailingProduct {
  id: string;
  product_name: string;
  indication: string;
  regulatory_approval: string;
  category: string;
  slides: DetailingSlide[];
}

export interface HospitalFormularyItem {
  id: string;
  account_id: string;
  account_name: string;
  territory: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  category: string;
  formulary_tier: 'Tier 1 Preferred' | 'Tier 2 Prior Auth' | 'Non-Formulary';
  pt_status: 'Approved' | 'Pending Review' | 'Under Evaluation' | 'Rejected';
  pt_meeting_date?: string;
  physician_champion?: string;
  protocol_requirements?: string;
  competitor_displaced?: string;
  annual_potential_value: number;
  updated_at: string;
}

export interface CommercialOrder {
  id: string;
  order_number: string;
  account_id: string;
  account_name: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
  created_at: string;
  distributor_id?: string;
}

export interface SalesActivity {
  id: string;
  account_id: string;
  contact_id?: string;
  activity_type: 'detailing' | 'call' | 'visit' | 'email' | 'meeting';
  purpose: string;
  sentiment?: 'very_receptive' | 'neutral' | 'skeptical';
  outcome?: string;
  occurred_at: string;
  rep_name: string;
}

export interface CRMTask {
  id: string;
  title: string;
  account_id: string;
  account_name: string;
  due_at: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
}

export interface LeadNote {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface LeadConversation {
  id: string;
  type: 'call' | 'email' | 'in_person';
  summary: string;
  sentiment?: 'very_receptive' | 'neutral' | 'skeptical';
  outcome?: string;
  rep_name: string;
  occurred_at: string;
}

export interface LeadMeeting {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes?: number;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface Lead {
  id: string;
  full_name: string;
  title: string;
  institution: string;
  specialty: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified';
  source: string;
  estimated_value: number;
  email: string;
  phone: string;
  territory: string;
  assigned_rep?: string;
  assigned_rep_id?: string;
  qualification_score?: number;
  qualification_details?: {
    prescribing_authority: boolean;
    active_patient_volume: boolean;
    budget_readiness: boolean;
    formulary_alignment: boolean;
  };
  notes?: LeadNote[];
  conversations?: LeadConversation[];
  meetings?: LeadMeeting[];
  converted_opportunity_id?: string;
  created_at: string;
}

export interface Opportunity {
  id: string;
  name: string;
  account_id: string;
  account_name: string;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  estimated_value: number;
  probability: number;
  expected_close_date: string;
  product_name: string;
  rep_name: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  product_name: string;
  sku: string;
  lot_number: string;
  batch_number?: string;
  warehouse?: string;
  warehouse_location?: string;
  quantity: number;
  stock_level?: number;
  reorder_level?: number;
  unit_price?: number;
  storage_temp?: string;
  storage_condition?: string;
  expiry_date?: string;
  expiration_date?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'RESERVED';
}

export interface Proposal {
  id: string;
  title: string;
  account_id?: string;
  account_name: string;
  tier?: string;
  value: number;
  total_value?: number;
  discount_percent: number;
  discount_pct?: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'CLIENT_REVIEW' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  valid_until: string;
  created_at: string;
}

export interface Tender {
  id: string;
  reference?: string;
  title: string;
  account_name?: string;
  authority?: string;
  status: 'DRAFT' | 'OPEN' | 'SUBMITTED' | 'AWARDED' | 'WON' | 'CLOSED';
  value: number;
  estimated_value?: number;
  due_at?: string;
  submission_deadline?: string;
  owner_name?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type: 'alert' | 'update' | 'task' | 'clinical' | 'warning' | 'success' | 'info';
  created_at: string;
  read: boolean;
}

// 1. Sample Dispensation & PDMA Digital Signature
export interface SampleItem {
  id: string;
  product_name: string;
  dosage: string;
  ndc_code: string;
  lot_number: string;
  expiry_date: string;
  trunk_stock: number;
  allocated_quota: number;
  cold_chain_required: boolean;
  temp_range?: string;
}

export interface SampleDispensation {
  id: string;
  physician_name: string;
  physician_title?: string;
  institution: string;
  license_number: string;
  dea_number: string;
  product_name: string;
  dosage: string;
  lot_number: string;
  quantity: number;
  dispensed_at: string;
  rep_name: string;
  rep_id: string;
  signature_svg?: string;
  pdma_verified: boolean;
  notes?: string;
}

// 2. Hospital P&T Committee Budget Impact Modeler
export interface BudgetImpactScenario {
  id: string;
  hospital_name: string;
  therapeutic_area: string;
  product_name: string;
  eligible_patients: number;
  adoption_rate_pct: number;
  annual_drug_cost_per_patient: number;
  readmission_reduction_pct: number;
  avg_readmission_cost: number;
  length_of_stay_reduction_days: number;
  daily_bed_cost: number;
  gross_drug_spend: number;
  total_offset_savings: number;
  net_budget_impact: number;
  roi_percentage: number;
  created_at: string;
}

// 3. Medical Information Requests (MIR) / MSL Handoff
export interface MedicalInfoRequest {
  id: string;
  request_number: string;
  physician_name: string;
  institution: string;
  specialty: string;
  unsolicited_question: string;
  category: 'Off-Label Indication' | 'Pediatric Dosing' | 'Drug Interaction' | 'Mechanism of Action' | 'Clinical Trial Data';
  urgency: 'Standard (3-5 Days)' | 'Urgent (24h)' | 'Clinical Emergency';
  commercial_rep: string;
  assigned_msl?: string;
  status: 'RECEIVED' | 'MSL_ASSIGNED' | 'DOSSIER_PREPARED' | 'FULFILLED' | 'ARCHIVED';
  msl_response_summary?: string;
  scientific_documents?: string[];
  created_at: string;
  closed_at?: string;
}

// 4. Sunshine Act & KOL Spend Audit
export interface SunshinePaymentRecord {
  id: string;
  hcp_name: string;
  hcp_npi: string;
  institution: string;
  specialty: string;
  category: 'Food & Beverage' | 'Speaker Honorarium' | 'Advisory Board Fee' | 'Travel & Lodging' | 'Research Grant';
  amount: number;
  event_title: string;
  date: string;
  rep_or_manager: string;
  compliance_flag: 'COMPLIANT' | 'NEARING_LIMIT' | 'AUDIT_REVIEW';
  notes?: string;
}

// 5. Territory Route & Daily Call Planner
export interface DailyCallPlan {
  id: string;
  time_slot: string;
  physician_name: string;
  institution: string;
  department: string;
  specialty: string;
  rep_name: string;
  date: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pre_call_objective: string;
  target_product: string;
  past_objections?: string;
  key_clinical_trial: string;
  samples_to_leave?: string;
  post_call_summary?: string;
  sentiment?: 'receptive' | 'neutral' | 'skeptical';
}

// 6. Closed-Loop Marketing (CLM) & Slide Heatmap Analytics
export interface SlideEngagementMetric {
  slide_id: string;
  slide_title: string;
  product_name: string;
  total_presentations: number;
  avg_dwell_time_seconds: number;
  physician_reaction_score: number; // 0 - 100
  frequently_questioned: boolean;
  recommended_reprint: string;
}

// 7. Patient Access, Hub Services & Copay Assistance
export interface PatientHubCase {
  id: string;
  case_number: string;
  patient_pseudonym: string; // HIPAA De-identified
  prescriber_name: string;
  institution: string;
  product_name: string;
  diagnosis_code: string; // ICD-10
  primary_payer: string;
  prior_auth_status: 'SUBMITTED' | 'APPROVED' | 'ADDITIONAL_INFO_REQ' | 'APPEAL_SUBMITTED' | 'DISPENSED';
  copay_card_enrolled: boolean;
  patient_out_of_pocket: number;
  specialty_pharmacy: string;
  time_to_first_dose_days: number;
  created_at: string;
  updated_at: string;
}

// 8. Prescriber Decile Matrix & Reach & Frequency (R&F)
export interface PrescriberDecileTarget {
  id: string;
  physician_name: string;
  specialty: string;
  institution: string;
  territory: string;
  decile: number; // 1 to 10 (10 = highest prescribing volume)
  monthly_call_target: number;
  actual_calls_mtd: number;
  coverage_status: 'ON_TRACK' | 'UNDER_CALLED' | 'OVER_CALLED';
  last_visited_date?: string;
  primary_product: string;
}

// 9. Omnichannel Next-Best-Action (NBA) Engine
export interface NextBestAction {
  id: string;
  physician_name: string;
  institution: string;
  specialty: string;
  product_name: string;
  trigger_source: 'Email Engagement' | 'Adverse Event Inquiry' | 'P&T Review Delayed' | 'High Decile Inactivity' | 'Monograph Download';
  recommended_action: string;
  suggested_channel: 'In-Person Detailing' | 'Approved Rep Email' | 'MSL Scientific Handoff' | 'Sample Starter Drop' | 'Clinical Reprint Dispatch';
  impact_priority: 'HIGH' | 'MEDIUM' | 'OPPORTUNITY';
  status: 'ACTIVE' | 'ACCEPTED' | 'DISMISSED';
  rationale: string;
  created_at: string;
}

// 10. Speaker Bureau & Medical Symposium Manager
export interface SpeakerBureauEvent {
  id: string;
  event_title: string;
  event_type: 'Dinner Symposium' | 'Grand Rounds Lecture' | 'Advisory Panel' | 'Virtual Webinar';
  speaker_hcp_name: string;
  therapeutic_area: string;
  venue_name: string;
  event_date: string;
  target_attendance: number;
  confirmed_rsvps: number;
  honorarium_fee: number;
  compliance_approval: 'APPROVED' | 'PENDING_LEGAL' | 'COMPLETED';
  event_status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

// 11. Competitive Intelligence & Brand Switch Radar
export interface CompetitiveBattlecard {
  id: string;
  competitor_product: string;
  competitor_maker: string;
  accord_counterpart: string;
  indication: string;
  accord_clinical_advantage: string;
  primary_objection: string;
  recommended_counter: string;
  displaced_accounts_count: number;
  hospital_market_share_pct: number;
}

// 12. Cold-Chain IoT Fleet & Trunk Stock Telemetry
export interface ColdChainSensorReading {
  id: string;
  sensor_uuid: string;
  rep_name: string;
  trunk_unit_id: string;
  monitored_product: string;
  current_temp_celsius: number;
  min_temp_24h: number;
  max_temp_24h: number;
  battery_pct: number;
  status: 'OPTIMAL_2_8C' | 'EXCURSION_WARNING' | 'QUARANTINED';
  last_ping_at: string;
}

