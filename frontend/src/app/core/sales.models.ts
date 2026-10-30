export interface SalesUserDirectoryItem {
  id: string;
  full_name: string;
  territory: string | null;
  roles: string[];
  assignable: boolean;
}

export interface ActivityItem {
  id: string;
  activity_type: 'visit' | 'call' | 'meeting' | 'email' | 'follow_up';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  occurred_at: string;
  completed_at: string | null;
  owner_id: string;
  owner_name: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  opportunity_id: string | null;
  opportunity_name: string | null;
  purpose: string | null;
  location: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  outcome: string | null;
  products_discussed: string | null;
  objections: string | null;
  commitments: string | null;
  next_action: string | null;
  is_overdue: boolean;
  follow_ups?: TaskItem[];
}

export interface EmailPayload {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  template_type: 'meeting_invitation' | 'call_summary' | 'follow_up_reminder' | 'clinical_information' | 'custom';
  account_id?: string | null;
  contact_id?: string | null;
  activity_id?: string | null;
  opportunity_id?: string | null;
  schedule_follow_up?: boolean;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  kind: 'task' | 'follow_up';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  account_id: string | null;
  account_name: string | null;
  opportunity_id: string | null;
  opportunity_name: string | null;
  activity_id: string | null;
  is_overdue: boolean;
}

export interface LeadItem {
  id: string;
  name: string;
  organization: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';
  territory: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  customer_need: string | null;
  product_interest: string | null;
  decision_process: string | null;
  expected_timeline: string | null;
  potential_value: number | null;
  qualification_notes: string | null;
  next_action: string | null;
  follow_up_date: string | null;
  disqualified_reason: string | null;
  qualified_at: string | null;
  converted_at: string | null;
  created_at: string;
  follow_up_overdue: boolean;
}

export interface AccountCardItem {
  id: string;
  name: string;
  account_type: string;
  status: string;
  territory: string | null;
  market: string | null;
  owner_id: string | null;
  owner_name: string | null;
  last_interaction_at: string | null;
  days_since_interaction: number | null;
  next_scheduled_at: string | null;
  open_opportunities: number;
  open_opportunity_value: number;
  overdue_tasks: number;
}

export interface AccountHealthFlag {
  rule: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
  rule_description: string;
}

export interface AccountHealth {
  status: 'on_track' | 'watch' | 'needs_attention';
  flags: AccountHealthFlag[];
  thresholds: { no_contact_days: number; stale_days: number };
  method: string;
}

export interface AccountOverviewData {
  account: {
    id: string;
    name: string;
    account_type: string;
    status: string;
    territory: string | null;
    market: string | null;
    created_at: string;
    owner_id: string | null;
    owner_name: string | null;
    owner_email: string | null;
  };
  header: {
    last_interaction_at: string | null;
    next_scheduled_at: string | null;
    open_opportunities: number;
    open_opportunity_value: number;
    outstanding_tasks: number;
    overdue_tasks: number;
    open_support_cases: number;
  };
  permissions: {
    can_edit: boolean;
    can_reassign: boolean;
    can_archive: boolean;
    can_view_audit: boolean;
    can_create_orders: boolean;
  };
  health: AccountHealth;
  recent_activity: ActivityItem[];
  upcoming_activity: ActivityItem[];
  open_opportunities: Array<{
    id: string;
    name: string;
    stage: string;
    estimated_value: number;
    probability: number;
    expected_close_date: string | null;
    owner_name: string | null;
    next_action: string | null;
  }>;
  outstanding_tasks: TaskItem[];
  contacts: Array<{
    id: string;
    full_name: string;
    title: string | null;
    professional_category: string | null;
    email: string | null;
    phone: string | null;
  }>;
  recent_orders: OrderHistoryItem[];
  engagement_by_month: Array<{ month: string; completed_activities: number }>;
}

export interface ContactItem {
  id: string;
  full_name: string;
  title: string | null;
  professional_category: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  territory: string | null;
  assigned_rep_id: string | null;
  assigned_rep_name: string | null;
  last_interaction_at: string | null;
  next_scheduled_at: string | null;
}

export interface OrderHistoryItem {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  distributor_id: string | null;
  distributor_name: string | null;
  created_by_name: string | null;
  items: Array<{
    product_id: string;
    product_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  total: number;
}

export interface AccountNoteItem {
  id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  activity_id: string | null;
  created_at: string;
}

export interface TimelineEventItem {
  id: string;
  kind: string;
  at: string;
  user_id: string | null;
  user_name: string | null;
  status: string | null;
  title: string;
  summary: string | null;
  outcome: string | null;
  next_action?: string | null;
  link?: { type: string; id: string };
  opportunity_id?: string | null;
  opportunity_name?: string | null;
}

export interface AccountInsightsData {
  calculated: {
    completed_activities_30d: number;
    completed_activities_previous_30d: number;
    completed_activities_90d: number;
    average_per_month_90d: number;
    days_since_last_contact: number | null;
    open_opportunities: number;
    overdue_followups: number;
    orders_last_90d: number;
    last_order_at: string | null;
    engagement_trend: 'increasing' | 'declining' | 'flat';
    trend_rule: string;
  };
  recommendations: {
    source: string;
    ai_generated: boolean;
    note: string;
    items: Array<{ recommendation: string; because: string }>;
  };
  health: AccountHealth;
}

export interface OpportunityCardItem {
  id: string;
  name: string;
  account_id: string;
  account_name: string | null;
  owner_id: string;
  owner_name: string | null;
  stage: string;
  estimated_value: number;
  probability: number;
  expected_close_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  next_action: string | null;
  lost_reason: string | null;
  last_interaction_at: string | null;
  days_since_interaction: number | null;
  next_followup_at: string | null;
  days_in_stage: number;
  risks: string[];
  at_risk: boolean;
  overdue: boolean;
  created_at: string;
}

export interface OpportunityStageInfo {
  key: string;
  label: string;
  count: number;
  value: number;
  weighted_value: number;
  allowed_next: string[];
}

export interface PipelineData {
  items: OpportunityCardItem[];
  stages: OpportunityStageInfo[];
  truncated: boolean;
  total: number;
  totals: {
    open_count: number;
    pipeline_value: number;
    weighted_pipeline_value: number;
    weighted_method: string;
  };
  thresholds: { stale_days: number; closed_days: number };
}

export interface OpportunityDetailData {
  opportunity: OpportunityCardItem;
  account: { id: string; name: string; account_type: string; territory: string | null } | null;
  stage_history: Array<{
    id: string;
    from_stage: string | null;
    to_stage: string;
    changed_at: string;
    changed_by: string | null;
    note: string | null;
    days_in_stage: number;
  }>;
  activities: ActivityItem[];
  tasks: TaskItem[];
  contacts: Array<{
    id: string;
    full_name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
  }>;
  allowed_next_stages: string[];
  permissions: { can_reassign: boolean };
  proposals: { supported: boolean; note: string };
  orders: { linked: boolean; note: string };
  notes: { supported: boolean; note: string };
}

export interface MyDayData {
  window: { start: string; end: string };
  metrics: {
    planned_visits: number;
    visits_completed: number;
    calls_completed: number;
    meetings_completed: number;
    followups_due: number;
    overdue_activities: number;
    overdue_tasks: number;
    new_leads: number;
    opportunities_requiring_action: number;
  };
  schedule: ActivityItem[];
  overdue_activities: ActivityItem[];
  tasks_due: TaskItem[];
  new_leads: LeadItem[];
  opportunities_attention: Array<{
    id: string;
    name: string;
    account_id: string;
    account_name: string | null;
    stage: string;
    estimated_value: number;
    next_action: string | null;
    reasons: string[];
  }>;
  accounts_attention: Array<{
    id: string;
    name: string;
    account_type: string;
    last_contact_at: string | null;
    days_since_contact: number | null;
    reasons: string[];
  }>;
  upcoming_activities: ActivityItem[];
  recent_account_activity: ActivityItem[];
  close_soon: Array<{
    id: string;
    name: string;
    expected_close_date: string | null;
    stage: string;
    estimated_value: number;
  }>;
  draft_orders: Array<{
    id: string;
    order_number: string;
    status: string;
    account_id: string;
    account_name: string | null;
  }>;
  performance: {
    month: string;
    target: number | null;
    won_revenue: number;
    target_progress: number | null;
    win_rate: { numerator: number; denominator: number; rate: number | null };
    lead_conversion: { numerator: number; denominator: number; rate: number | null };
    definitions: Record<string, string>;
  };
  notifications: {
    unread: number;
    recent: Array<{ id: string; title: string; body: string; read: boolean; created_at: string }>;
  };
  thresholds: { stale_days: number; no_contact_days: number };
}

export interface CommandCenterData {
  period: { start: string; end: string };
  filters: { territory: string | null; user_id: string | null; account_type: string | null; stage: string | null };
  kpis: {
    active_reps: number;
    active_accounts: number;
    new_leads: number;
    open_opportunities: number;
    pipeline_value: number;
    weighted_pipeline: number;
    won_revenue: number;
    won_count: number;
    lost_count: number;
    win_rate: { numerator: number; denominator: number; rate: number | null };
    orders_placed: number;
    target: {
      reps_with_target: number;
      target_total: number;
      won_by_targeted_reps: number;
      achievement: number | null;
    };
    overdue_followups: number;
    completed_activities: number;
    accounts_without_engagement: number;
    upcoming_tenders: { available: boolean; items: Array<{ id: string; reference: string; title: string; due_at: string | null }> };
    inventory_alerts: { available: boolean; open: number | null };
  };
  unengaged_accounts: Array<{ id: string; name: string; last_contact_at: string | null }>;
  definitions: Record<string, string>;
  thresholds: { stale_days: number; no_contact_days: number };
}

export interface TeamMemberMetric {
  user_id: string;
  name: string;
  territory: string | null;
  assigned_accounts: number;
  new_leads: number;
  qualified_leads: number;
  leads_converted: number;
  open_opportunities: number;
  pipeline_value: number;
  won_opportunities: number;
  lost_opportunities: number;
  won_revenue: number;
  activities_completed: number;
  visits_completed: number;
  followups_due: number;
  followups_on_time: number;
  overdue_tasks: number;
  last_activity_at: string | null;
  win_rate: { numerator: number; denominator: number; rate: number | null };
  lead_conversion: { numerator: number; denominator: number; rate: number | null };
  followups_on_time_rate: { numerator: number; denominator: number; rate: number | null };
  target: { amount: number; achievement: number | null } | null;
}

export interface CoverageRowItem {
  id: string;
  name: string;
  account_type: string;
  territory: string | null;
  owner_id: string;
  owner_name: string | null;
  last_contact_at: string | null;
  activities_in_period: number;
  activities_previous_period: number;
  overdue_followups: number;
  open_opportunities: number;
  stalled_opportunities: number;
  orders_in_period: number;
  flags: Array<{ flag: string; why: string }>;
}

export interface CoverageData {
  items: CoverageRowItem[];
  total: number;
  limit: number;
  offset: number;
  summary: Record<string, number>;
  per_owner: Array<{
    owner_id: string;
    owner_name: string | null;
    assigned: number;
    contacted: number;
    not_contacted: number;
    overdue_followups: number;
    stalled: number;
  }>;
  period: { start: string; end: string; previous_start: string };
  thresholds: Record<string, number>;
  definitions: Record<string, string>;
}

export interface ReportCatalogItem {
  key: string;
  title: string;
  example: string;
}

export interface ReportResultData {
  report: string;
  title: string;
  period: { start: string; end: string };
  filters: Record<string, any>;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, any>>;
  status: 'ok' | 'no_results' | 'unavailable' | 'not_understood';
  message: string | null;
  method: string;
  export_allowed: boolean;
  scope: string;
  interpretation?: {
    question: string;
    matched_report: string;
    period_basis: string;
    interpreter: string;
    ai_generated: boolean;
  };
  suggestions?: ReportCatalogItem[];
}
