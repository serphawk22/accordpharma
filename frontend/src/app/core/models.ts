export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  territory: string | null;
  roles: string[];
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  account_type: string;
  market: string | null;
  territory: string | null;
  status: string;
  assigned_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  account_id: string;
  owner_id: string;
  name: string;
  stage: string;
  estimated_value: string | null;
  expected_close_date: string | null;
  probability: number;
  next_action: string | null;
  created_at: string;
}

export interface InventoryLot {
  id: string;
  distributor_id: string;
  product_id: string;
  lot_number: string;
  batch_number: string | null;
  expiry_date: string | null;
  storage_conditions: string | null;
  quantity: number;
  updated_at: string;
}

export interface DashboardSummary {
  accounts: number;
  opportunities: number;
  open_pipeline_value: string;
  activities_last_30_days: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: string;
  weighted_value: string;
}

export interface ApiProblem {
  message: string;
  status?: number;
}

export interface PageColumn {
  key: string;
  label: string;
  format?: 'date' | 'currency' | 'status' | 'truncate';
}

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'textarea';
  required?: boolean;
  maxLength?: number;
}

export interface FeatureDefinition {
  title: string;
  description: string;
  endpoint?: string;
  listEndpoint?: string;
  columns?: PageColumn[];
  createEndpoint?: string;
  createLabel?: string;
  fields?: FormField[];
  roleRequired?: string[];
  unavailableReason?: string;
  query?: Record<string, string | number | boolean>;
  searchParam?: string;
  filterKey?: string;
  filterOptions?: string[];
}

export interface HealthcareProfessional {
  id: string;
  account_id: string;
  account_name?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  professional_category?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  country?: string | null;
  prescribing_tier?: string | null;
  kol_status?: boolean;
  last_interaction_at?: string | null;
  next_scheduled_visit?: string | null;
  interactions_count?: number;
  territory?: string | null;
  assigned_rep_id?: string | null;
  status: string;
}

export interface DetailingSlide {
  slide_id: string;
  title: string;
  subtitle: string;
  content: string;
  key_metric?: string;
  chart_type?: string;
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
  formulary_tier: string;
  pt_status: string;
  pt_meeting_date?: string | null;
  physician_champion?: string | null;
  protocol_requirements?: string | null;
  competitor_displaced?: string | null;
  annual_potential_value: number;
  updated_at: string;
}
