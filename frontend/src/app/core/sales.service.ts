import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { HealthcareProfessional, DetailingProduct, HospitalFormularyItem } from './models';
import {
  AccountCardItem,
  AccountInsightsData,
  AccountNoteItem,
  AccountOverviewData,
  ActivityItem,
  CommandCenterData,
  ContactItem,
  CoverageData,
  EmailPayload,
  LeadItem,
  MyDayData,
  OpportunityCardItem,
  OpportunityDetailData,
  OrderHistoryItem,
  PipelineData,
  ReportCatalogItem,
  ReportResultData,
  SalesUserDirectoryItem,
  TaskItem,
  TeamMemberMetric,
  TimelineEventItem,
} from './sales.models';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly api = inject(ApiService);

  // User directory for pickers
  getUsers(): Observable<SalesUserDirectoryItem[]> {
    return this.api.get<SalesUserDirectoryItem[]>('/sales/users');
  }

  // My Day
  getMyDay(params?: {
    start?: string;
    end?: string;
    stale_days?: number;
    no_contact_days?: number;
  }): Observable<MyDayData> {
    return this.api.get<MyDayData>('/sales/my-day', params);
  }

  // Activities
  getActivities(params?: {
    owner_id?: string;
    account_id?: string;
    opportunity_id?: string;
    activity_type?: string;
    status?: string;
    territory?: string;
    start?: string;
    end?: string;
    view?: 'all' | 'mine' | 'overdue' | 'upcoming' | 'completed';
    descending?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<{ items: ActivityItem[]; total: number; limit: number; offset: number }> {
    return this.api.get<{ items: ActivityItem[]; total: number; limit: number; offset: number }>(
      '/sales/activities',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getActivity(id: string): Observable<ActivityItem> {
    return this.api.get<ActivityItem>(`/sales/activities/${id}`);
  }

  createActivity(body: {
    activity_type: string;
    account_id: string;
    contact_id?: string | null;
    opportunity_id?: string | null;
    status: string;
    occurred_at: string;
    purpose?: string | null;
    location?: string | null;
    priority?: string;
    notes?: string | null;
    outcome?: string | null;
    products_discussed?: string | null;
    objections?: string | null;
    commitments?: string | null;
    next_action?: string | null;
    follow_up?: { title: string; due_at: string; priority?: string; description?: string } | null;
    client_request_id?: string;
  }): Observable<ActivityItem & { follow_up_task_id?: string | null }> {
    return this.api.post<ActivityItem & { follow_up_task_id?: string | null }>('/sales/activities', body);
  }

  patchActivity(
    id: string,
    body: {
      action?: 'start' | 'complete' | 'reschedule' | 'cancel' | 'update';
      occurred_at?: string;
      purpose?: string | null;
      location?: string | null;
      priority?: string;
      notes?: string | null;
      outcome?: string | null;
      products_discussed?: string | null;
      objections?: string | null;
      commitments?: string | null;
      next_action?: string | null;
      follow_up?: { title: string; due_at: string; priority?: string; description?: string } | null;
    },
  ): Observable<ActivityItem & { follow_up_task_id?: string | null }> {
    return this.api.patch<ActivityItem & { follow_up_task_id?: string | null }>(`/sales/activities/${id}`, body);
  }

  deleteActivity(id: string): Observable<{ status: string; id: string }> {
    return this.api.delete<{ status: string; id: string }>(`/sales/activities/${id}`);
  }

  // Tasks & Follow-ups
  getTasks(params?: {
    assigned_to_id?: string;
    account_id?: string;
    opportunity_id?: string;
    status?: string;
    kind?: string;
    overdue?: boolean;
    start?: string;
    end?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ items: TaskItem[]; total: number; limit: number; offset: number }> {
    return this.api.get<{ items: TaskItem[]; total: number; limit: number; offset: number }>(
      '/sales/tasks',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  createTask(body: {
    title: string;
    kind?: string;
    account_id?: string | null;
    opportunity_id?: string | null;
    activity_id?: string | null;
    assigned_to_id?: string | null;
    due_at?: string | null;
    priority?: string;
    description?: string | null;
    client_request_id?: string;
  }): Observable<TaskItem> {
    return this.api.post<TaskItem>('/sales/tasks', body);
  }

  patchTask(
    id: string,
    body: {
      title?: string;
      status?: string;
      due_at?: string;
      priority?: string;
      description?: string | null;
      assigned_to_id?: string;
    },
  ): Observable<TaskItem> {
    return this.api.patch<TaskItem>(`/sales/tasks/${id}`, body);
  }

  deleteTask(id: string): Observable<{ status: string; id: string }> {
    return this.api.delete<{ status: string; id: string }>(`/sales/tasks/${id}`);
  }

  // Leads
  getLeads(params?: {
    status?: string;
    assigned_to_id?: string;
    source?: string;
    search?: string;
    overdue_follow_up?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<{ items: LeadItem[]; total: number; limit: number; offset: number }> {
    return this.api.get<{ items: LeadItem[]; total: number; limit: number; offset: number }>(
      '/sales/leads',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getLead(id: string): Observable<LeadItem> {
    return this.api.get<LeadItem>(`/sales/leads/${id}`);
  }

  createLead(body: {
    name: string;
    organization?: string | null;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    territory?: string | null;
    assigned_to_id?: string | null;
    account_id?: string | null;
    contact_id?: string | null;
    next_action?: string | null;
    follow_up_date?: string | null;
    customer_need?: string | null;
    product_interest?: string | null;
    potential_value?: number | null;
  }): Observable<LeadItem> {
    return this.api.post<LeadItem>('/sales/leads', body);
  }

  patchLead(
    id: string,
    body: Partial<{
      name: string;
      organization: string | null;
      contact_name: string | null;
      email: string | null;
      phone: string | null;
      source: string | null;
      status: string;
      assigned_to_id: string | null;
      account_id: string | null;
      contact_id: string | null;
      next_action: string | null;
      follow_up_date: string | null;
      customer_need: string | null;
      product_interest: string | null;
      decision_process: string | null;
      expected_timeline: string | null;
      potential_value: number | null;
      qualification_notes: string | null;
      disqualified_reason: string | null;
    }>,
  ): Observable<LeadItem> {
    return this.api.patch<LeadItem>(`/sales/leads/${id}`, body);
  }

  convertLead(
    id: string,
    body: {
      account_id?: string | null;
      new_account_type?: string | null;
      contact_id?: string | null;
      create_contact?: boolean;
      opportunity_name?: string | null;
      estimated_value?: number | null;
      expected_close_date?: string | null;
      probability?: number;
      next_action?: string | null;
    },
  ): Observable<{ lead: LeadItem; account_id: string; contact_id: string | null; opportunity_id: string }> {
    return this.api.post<{ lead: LeadItem; account_id: string; contact_id: string | null; opportunity_id: string }>(
      `/sales/leads/${id}/convert`,
      body,
    );
  }

  deleteLead(id: string): Observable<{ status: string; id: string }> {
    return this.api.delete<{ status: string; id: string }>(`/sales/leads/${id}`);
  }

  // Communications & Email
  sendEmail(body: EmailPayload): Observable<{
    status: string;
    smtp_status: string;
    recipient: string;
    activity: ActivityItem;
    follow_up_task?: TaskItem | null;
  }> {
    return this.api.post<{
      status: string;
      smtp_status: string;
      recipient: string;
      activity: ActivityItem;
      follow_up_task?: TaskItem | null;
    }>('/sales/communications/send-email', body);
  }

  // Account 360
  getAccounts(params?: {
    search?: string;
    account_type?: string;
    territory?: string;
    owner_id?: string;
    status?: string;
    no_contact_days?: number;
    sort_by?: string;
    descending?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<{ items: AccountCardItem[]; total: number; limit: number; offset: number }> {
    return this.api.get<{ items: AccountCardItem[]; total: number; limit: number; offset: number }>(
      '/sales/accounts',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getAccountOverview(
    id: string,
    params?: { no_contact_days?: number; stale_days?: number },
  ): Observable<AccountOverviewData> {
    return this.api.get<AccountOverviewData>(`/sales/accounts/${id}/overview`, params);
  }

  getAccountContacts(id: string): Observable<ContactItem[]> {
    return this.api.get<ContactItem[]>(`/sales/accounts/${id}/contacts`);
  }

  createContact(body: any): Observable<any> {
    return this.api.post<any>('/contacts', body);
  }

  patchContact(id: string, body: any): Observable<any> {
    return this.api.patch<any>(`/contacts/${id}`, body);
  }

  getAccountOrders(id: string): Observable<OrderHistoryItem[]> {
    return this.api.get<OrderHistoryItem[]>(`/sales/accounts/${id}/orders`);
  }

  getAccountNotes(id: string): Observable<AccountNoteItem[]> {
    return this.api.get<AccountNoteItem[]>(`/sales/accounts/${id}/notes`);
  }

  addAccountNote(id: string, body: { content: string; activity_id?: string | null }): Observable<AccountNoteItem> {
    return this.api.post<AccountNoteItem>(`/sales/accounts/${id}/notes`, body);
  }

  getAccountTimeline(
    id: string,
    params?: {
      kinds?: string;
      user_id?: string;
      status?: string;
      start?: string;
      end?: string;
      limit?: number;
      offset?: number;
    },
  ): Observable<{ items: TimelineEventItem[]; total: number; limit: number; offset: number }> {
    return this.api.get<{ items: TimelineEventItem[]; total: number; limit: number; offset: number }>(
      `/sales/accounts/${id}/timeline`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getAccountInsights(
    id: string,
    params?: { no_contact_days?: number; stale_days?: number },
  ): Observable<AccountInsightsData> {
    return this.api.get<AccountInsightsData>(`/sales/accounts/${id}/insights`, params);
  }

  getAccountHistory(id: string, limit?: number): Observable<any> {
    return this.api.get<any>(`/sales/accounts/${id}/history`, { limit });
  }

  reassignAccount(
    id: string,
    body: {
      assigned_to_id: string;
      reason: string;
      include_open_opportunities?: boolean;
      include_open_tasks?: boolean;
    },
  ): Observable<{ account_id: string; owner_id: string; owner_name: string }> {
    return this.api.post<{ account_id: string; owner_id: string; owner_name: string }>(
      `/sales/accounts/${id}/reassign`,
      body,
    );
  }

  createAccount(body: {
    name: string;
    account_type: string;
    territory?: string | null;
    market?: string | null;
    status?: string;
    assigned_employee_id?: string | null;
  }): Observable<any> {
    return this.api.post<any>('/accounts', body);
  }

  patchAccount(id: string, body: any): Observable<any> {
    return this.api.patch<any>(`/accounts/${id}`, body);
  }

  // Pipeline & Opportunities
  getPipeline(params?: {
    owner_id?: string;
    territory?: string;
    account_id?: string;
    stage?: string;
    search?: string;
    close_from?: string;
    close_to?: string;
    only_overdue?: boolean;
    stale_days?: number;
    closed_days?: number;
    limit?: number;
  }): Observable<PipelineData> {
    return this.api.get<PipelineData>(
      '/sales/pipeline',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getOpportunityDetail(id: string, stale_days?: number): Observable<OpportunityDetailData> {
    return this.api.get<OpportunityDetailData>(`/sales/opportunities/${id}`, { stale_days });
  }

  createOpportunity(body: {
    account_id: string;
    name: string;
    stage?: string;
    estimated_value?: number | null;
    expected_close_date?: string | null;
    probability?: number;
    next_action?: string | null;
    priority?: string;
  }): Observable<any> {
    return this.api.post<any>('/opportunities', body);
  }

  patchOpportunity(
    id: string,
    body: {
      stage?: string;
      estimated_value?: number | null;
      expected_close_date?: string | null;
      probability?: number;
      next_action?: string | null;
      priority?: string;
      lost_reason?: string | null;
    },
  ): Observable<any> {
    return this.api.patch<any>(`/opportunities/${id}`, body);
  }

  reassignOpportunity(
    id: string,
    body: { assigned_to_id: string; reason: string },
  ): Observable<{ opportunity_id: string; owner_id: string; owner_name: string }> {
    return this.api.post<{ opportunity_id: string; owner_id: string; owner_name: string }>(
      `/sales/opportunities/${id}/reassign`,
      body,
    );
  }

  getPipelineAnalytics(params?: {
    start?: string;
    end?: string;
    owner_id?: string;
    territory?: string;
    account_type?: string;
    stale_days?: number;
  }): Observable<any> {
    return this.api.get<any>(
      '/sales/pipeline/analytics',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  // Command Center & Management
  getCommandCenter(params?: {
    start?: string;
    end?: string;
    territory?: string;
    user_id?: string;
    account_type?: string;
    stage?: string;
    stale_days?: number;
    no_contact_days?: number;
  }): Observable<CommandCenterData> {
    return this.api.get<CommandCenterData>(
      '/sales/command-center',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  getTeamPerformance(params?: {
    start?: string;
    end?: string;
    territory?: string;
    search?: string;
    sort_by?: string;
    descending?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<{
    items: TeamMemberMetric[];
    total: number;
    limit: number;
    offset: number;
    period: { start: string; end: string };
    definitions: Record<string, string>;
  }> {
    return this.api.get<{
      items: TeamMemberMetric[];
      total: number;
      limit: number;
      offset: number;
      period: { start: string; end: string };
      definitions: Record<string, string>;
    }>('/sales/team-performance', params as Record<string, string | number | boolean | undefined>);
  }

  getRepProfile(id: string, params?: { start?: string; end?: string; no_contact_days?: number }): Observable<any> {
    return this.api.get<any>(`/sales/team-performance/${id}`, params);
  }

  // Coverage
  getCoverage(params?: {
    start?: string;
    end?: string;
    territory?: string;
    owner_id?: string;
    flag?: string;
    no_contact_days?: number;
    stale_days?: number;
    decline_percent?: number;
    min_previous_activities?: number;
    limit?: number;
    offset?: number;
  }): Observable<CoverageData> {
    return this.api.get<CoverageData>(
      '/sales/coverage',
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  // Targets
  getTargets(month?: string): Observable<Array<{ id: string; user_id: string; user_name: string; period_start: string; amount: number }>> {
    return this.api.get<Array<{ id: string; user_id: string; user_name: string; period_start: string; amount: number }>>(
      '/sales/targets',
      { month },
    );
  }

  setTarget(body: { user_id: string; period_start: string; amount: number }): Observable<any> {
    return this.api.put<any>('/sales/targets', body);
  }

  // Reports
  getReportCatalog(): Observable<ReportCatalogItem[]> {
    return this.api.get<ReportCatalogItem[]>('/sales/reports/catalog');
  }

  runReport(body: {
    report: string;
    start?: string;
    end?: string;
    stage?: string;
    stale_days?: number;
  }): Observable<ReportResultData> {
    return this.api.post<ReportResultData>('/sales/reports/run', body);
  }

  askReport(body: { question: string; start?: string; end?: string }): Observable<ReportResultData> {
    return this.api.post<ReportResultData>('/sales/reports/ask', body);
  }

  // Healthcare Professionals & KOLs
  getContacts(params?: {
    account_id?: string;
    search?: string;
    territory?: string;
    limit?: number;
    offset?: number;
  }): Observable<HealthcareProfessional[]> {
    return this.api.get<HealthcareProfessional[]>('/contacts', params);
  }

  getContactProfile(contactId: string): Observable<{
    hcp: HealthcareProfessional;
    account: { id: string; name: string; account_type: string; territory: string } | null;
    activities: any[];
    tasks: any[];
    prescribing_metrics: {
      tier: string;
      is_kol: boolean;
      total_visits: number;
      last_interaction: string | null;
      next_visit: string | null;
    };
  }> {
    return this.api.get<any>(`/contacts/${contactId}/profile`);
  }


  // Clinical e-Detailing (IVA)
  getEdetailingPortfolio(): Observable<{
    portfolio: DetailingProduct[];
    total_therapeutic_lines: number;
    compliance_approved: boolean;
    valid_until: string;
  }> {
    return this.api.get<any>('/sales/edetailing/products');
  }

  logEdetailingSession(body: {
    contact_id: string;
    account_id: string;
    product_name: string;
    slides_covered: string[];
    duration_seconds: number;
    sentiment: string;
    objections: string[];
    sample_units_requested: number;
    commitments?: string;
    next_action?: string;
    follow_up_due_days?: number;
  }): Observable<{
    success: boolean;
    activity_id: string;
    task_id?: string | null;
    message: string;
    activity?: any;
  }> {
    return this.api.post<any>('/sales/edetailing/sessions', body);
  }

  // Hospital Formulary & P&T Access
  getHospitalFormularies(params?: {
    territory?: string;
    tier?: string;
    pt_status?: string;
    search?: string;
  }): Observable<{
    items: HospitalFormularyItem[];
    count: number;
    summary: {
      total_evaluated_institutions: number;
      tier1_preferred_access_rate: number;
      pending_pt_committee_reviews: number;
      annual_pipeline_opportunity_value: number;
    };
  }> {
    return this.api.get<any>('/sales/formulary', params);
  }

  getAccountFormulary(accountId: string): Observable<{
    account_id: string;
    items: HospitalFormularyItem[];
    count: number;
  }> {
    return this.api.get<any>(`/sales/accounts/${accountId}/formulary`);
  }

  updateHospitalFormulary(body: {
    account_id: string;
    product_name: string;
    formulary_tier: string;
    pt_status: string;
    pt_meeting_date?: string | null;
    physician_champion?: string | null;
    protocol_requirements?: string | null;
    competitor_displaced?: string | null;
    annual_potential_value?: number;
  }): Observable<{ success: boolean; record: HospitalFormularyItem }> {
    return this.api.post<any>('/sales/formulary', body);
  }
}
