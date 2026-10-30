import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import { ApiService } from '../../../core/api.service';
import {
  AccountOverviewData,
  ContactItem,
  TimelineEventItem,
  OrderHistoryItem,
  TaskItem,
  AccountNoteItem,
  AccountInsightsData,
  SalesUserDirectoryItem,
} from '../../../core/sales.models';
import { HospitalFormularyItem } from '../../../core/models';

type TabType =
  | 'overview'
  | 'proposals'
  | 'orders'
  | 'billing'
  | 'contacts'
  | 'formulary'
  | 'timeline'
  | 'opportunities'
  | 'tasks'
  | 'notes'
  | 'insights'
  | 'history';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="account-360-container">
      <!-- Breadcrumb & Top Bar -->
      <nav class="breadcrumb-bar">
        <a routerLink="/accounts" class="back-link">← Back to Accounts</a>
        <span class="sep">/</span>
        <span class="crumb-current">{{ overview()?.account?.name || 'Account Detail' }}</span>
      </nav>

      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading Account 360° Profile...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadAccountData()">Retry</button>
        </div>
      } @else if (overview()) {
        <!-- Account Header Card -->
        <header class="account-header">
          <div class="header-main">
            <div class="account-title-row">
              <h1>{{ overview()?.account?.name }}</h1>
              <span class="type-badge" [class]="overview()?.account?.account_type?.toLowerCase()">
                {{ overview()?.account?.account_type }}
              </span>
              <span class="badge" [ngClass]="getHealthBadgeClass(overview()?.health?.status || 'on_track')">
                {{ formatHealth(overview()?.health?.status || 'on_track') }}
              </span>
            </div>
            <div class="account-meta-strip">
              <span>📍 {{ overview()?.account?.territory || 'Unassigned Territory' }}</span>
              <span>👤 Assigned: <b>{{ overview()?.account?.owner_name || 'Unassigned' }}</b></span>
            </div>
          </div>
          <div class="header-actions">
            @if (canReassign()) {
              <button class="crm-btn crm-btn-secondary" (click)="openReassignModal()">
                ⇄ Reassign
              </button>
            }
            <button class="crm-btn crm-btn-secondary" (click)="openCreateProposalModal()">
              + New Proposal
            </button>
            <button class="crm-btn crm-btn-secondary" (click)="openCreateOrderModal()">
              + Commercial Order
            </button>
            <button class="crm-btn crm-btn-secondary" (click)="openQuickPaymentModal()">
              💳 Record Payment
            </button>
            <button class="crm-btn crm-btn-primary" (click)="openLogTouchpointModal()">
              + Log Touchpoint
            </button>
          </div>
        </header>

        <!-- KPI Strip -->
        <div class="kpi-strip">
          <div class="kpi-box">
            <span class="kpi-label">Commercial Invoiced</span>
            <div class="kpi-val text-emerald">{{ formatCurrency(totalInvoiced()) }}</div>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Payments Collected</span>
            <div class="kpi-val text-blue">{{ formatCurrency(totalCollected()) }}</div>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Open Deals Value</span>
            <div class="kpi-val text-blue">{{ formatCurrency(overview()?.header?.open_opportunity_value || 0) }}</div>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Outstanding Tasks</span>
            <div class="kpi-val text-amber">{{ overview()?.header?.outstanding_tasks || 0 }}</div>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Last Interaction</span>
            <div class="kpi-val text-slate">
              {{ overview()?.header?.last_interaction_at ? (overview()?.header?.last_interaction_at | slice:0:10) : 'Never' }}
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn" [class.active]="activeTab === 'overview'" (click)="setTab('overview')">
            Overview
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'proposals'" (click)="setTab('proposals')">
            Proposals & Tenders ({{ proposals().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'orders'" (click)="setTab('orders')">
            Commercial Orders ({{ orders().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'billing'" (click)="setTab('billing')">
            Billing & Payments ({{ invoices().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'contacts'" (click)="setTab('contacts')">
            Contacts & HCPs ({{ contacts().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'formulary'" (click)="setTab('formulary')">
            Formulary & P&T ({{ accountFormulary().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'timeline'" (click)="setTab('timeline')">
            Activity Timeline ({{ timeline().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'opportunities'" (click)="setTab('opportunities')">
            Opportunities ({{ (overview()?.open_opportunities?.length ?? 0) }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'tasks'" (click)="setTab('tasks')">
            Tasks ({{ tasks().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'notes'" (click)="setTab('notes')">
            Notes ({{ notes().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'insights'" (click)="setTab('insights')">
            Insights
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'history'" (click)="setTab('history')">
            History & Audit
          </button>
        </div>

        <!-- TAB CONTENT -->
        <div class="tab-content">
          <!-- TAB 1: OVERVIEW -->
          @if (activeTab === 'overview') {
            <div class="overview-grid">
              <!-- Left Column: Health and Recent Actions -->
              <div class="overview-main">
                <!-- Health Card with Rule-Based Explanations -->
                <div class="panel">
                  <div class="panel-header">
                    <h3>Account Health & Risk Analysis</h3>
                    <span class="badge" [ngClass]="getHealthBadgeClass(overview()?.health?.status || 'on_track')">
                      {{ formatHealth(overview()?.health?.status || 'on_track') }}
                    </span>
                  </div>
                  <p class="health-summary">
                    Health score is calculated using deterministic operational rules: {{ overview()?.health?.method }}.
                  </p>
                  <div class="reasons-list">
                    @for (flag of overview()?.health?.flags; track flag.rule) {
                      <div class="reason-pill">
                        <span class="bullet">⚠</span>
                        <span><b>{{ flag.rule }}:</b> {{ flag.detail }}</span>
                      </div>
                    }
                    @if ((overview()?.health?.flags?.length ?? 0) === 0) {
                      <div class="healthy-msg">✓ No risk flags detected. Account interaction cadence is on track.</div>
                    }
                  </div>
                </div>

                <!-- Recent Activities Summary -->
                <div class="panel" style="margin-top: 20px;">
                  <div class="panel-header">
                    <h3>Recent Encounters & Touchpoints</h3>
                    <button class="tab-link-btn" (click)="setTab('timeline')">View Full Timeline →</button>
                  </div>
                  @if ((overview()?.recent_activity?.length ?? 0) === 0) {
                    <div class="empty-state-mini">No activities logged yet for this account.</div>
                  } @else {
                    <div class="mini-list">
                      @for (act of overview()?.recent_activity; track act.id) {
                        <div class="mini-item">
                          <div>
                            <span class="badge badge-subtle">{{ act.activity_type | uppercase }}</span>
                            <strong style="margin-left: 8px;">{{ act.purpose || 'Touchpoint' }}</strong>
                            @if (act.outcome) {
                              <span class="outcome-tag">Outcome: {{ act.outcome }}</span>
                            }
                          </div>
                          <span class="text-slate">{{ act.occurred_at | slice:0:10 }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Right Column: Open Opps & Tasks -->
              <div class="overview-side">
                <!-- Open Opportunities -->
                <div class="panel">
                  <div class="panel-header">
                    <h3>Open Opportunities</h3>
                    <button class="tab-link-btn" (click)="setTab('opportunities')">All Deals →</button>
                  </div>
                  @if ((overview()?.open_opportunities?.length ?? 0) === 0) {
                    <div class="empty-state-mini">No open sales opportunities.</div>
                  } @else {
                    <div class="mini-list">
                      @for (opp of overview()?.open_opportunities; track opp.id) {
                        <div class="mini-item">
                          <div>
                            <strong>{{ opp.name }}</strong>
                            <div class="text-slate">Stage: {{ opp.stage }} · Close: {{ opp.expected_close_date }}</div>
                          </div>
                          <span class="val-bold">{{ formatCurrency(opp.estimated_value) }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Outstanding Tasks -->
                <div class="panel" style="margin-top: 20px;">
                  <div class="panel-header">
                    <h3>Outstanding Follow-ups</h3>
                    <button class="tab-link-btn" (click)="setTab('tasks')">All Tasks →</button>
                  </div>
                  @if ((overview()?.outstanding_tasks?.length ?? 0) === 0) {
                    <div class="empty-state-mini">No open tasks for this account.</div>
                  } @else {
                    <div class="mini-list">
                      @for (task of overview()?.outstanding_tasks; track task.id) {
                        <div class="mini-item">
                          <div>
                            <strong>{{ task.title }}</strong>
                            <div class="text-slate">Due: {{ task.due_at | slice:0:10 }} · Priority: {{ task.priority }}</div>
                          </div>
                          <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="completeTask(task)">✓ Done</button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: CONTACTS -->
          @if (activeTab === 'contacts') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Key Contacts & Healthcare Professionals</h2>
                  <p class="section-sub">Physicians, department heads, pharmacy directors, and procurement staff.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openCreateContactModal()">+ Add Contact / HCP</button>
              </div>

              @if (contacts().length === 0) {
                <div class="empty-panel">
                  <p>No contacts documented for this account yet.</p>
                  <button class="crm-btn crm-btn-primary" (click)="openCreateContactModal()">Add First Contact</button>
                </div>
              } @else {
                <div class="cards-grid">
                  @for (c of contacts(); track c.id) {
                    <div class="contact-card">
                      <div class="card-head">
                        <div class="avatar-circle">{{ c.full_name.slice(0, 2).toUpperCase() }}</div>
                        <div>
                          <strong>{{ c.full_name }}</strong>
                          <div class="text-slate">{{ c.title || 'Healthcare Professional' }}</div>
                        </div>
                      </div>
                      <div class="card-details">
                        @if (c.professional_category) { <div>Category: <b>{{ c.professional_category }}</b></div> }
                        @if (c.email) { <div>Email: <a [href]="'mailto:' + c.email">{{ c.email }}</a></div> }
                        @if (c.phone) { <div>Phone: {{ c.phone }}</div> }
                        @if (c.last_interaction_at) { <div>Last Touch: {{ c.last_interaction_at | slice:0:10 }}</div> }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- TAB: FORMULARY & P&T STATUS -->
          @if (activeTab === 'formulary') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Hospital Formulary & P&T Committee Status</h2>
                  <p class="section-sub">Drug coverage tiers, committee review cycles, and clinical restrictions for this facility.</p>
                </div>
                <div style="display: flex; gap: 8px;">
                  <a routerLink="/formulary" class="crm-btn crm-btn-secondary">Global Formulary Hub →</a>
                  <a routerLink="/edetailing" class="crm-btn crm-btn-primary">Launch e-Detailing Aid</a>
                </div>
              </div>

              @if (accountFormulary().length === 0) {
                <div class="empty-panel">
                  <p>No hospital formulary listings currently documented for this facility.</p>
                  <a routerLink="/formulary" class="crm-btn crm-btn-primary">Manage Formulary In Hub</a>
                </div>
              } @else {
                <div class="table-container">
                  <table class="crm-table">
                    <thead>
                      <tr>
                        <th>Pharmaceutical Therapeutic</th>
                        <th>Coverage Tier</th>
                        <th>P&T Review Status</th>
                        <th>Physician Champion</th>
                        <th>Competitor Displaced</th>
                        <th>Restrictions & Protocols</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of accountFormulary(); track item.id) {
                        <tr>
                          <td>
                            <strong>{{ item.product_name }}</strong>
                            <div class="text-slate" style="font-size: 11px;">{{ item.category }}</div>
                          </td>
                          <td>
                            <span class="badge" [ngClass]="item.formulary_tier === 'Tier 1 Preferred' ? 'badge-healthy' : item.formulary_tier === 'Tier 2 Prior Auth' ? 'badge-attention' : 'badge-at_risk'">
                              {{ item.formulary_tier }}
                            </span>
                          </td>
                          <td>
                            <strong [style.color]="item.pt_status === 'Approved' ? '#059669' : '#d97706'">{{ item.pt_status }}</strong>
                            @if (item.pt_meeting_date) {
                              <div class="text-slate" style="font-size: 11px;">Next: {{ item.pt_meeting_date }}</div>
                            }
                          </td>
                          <td>
                            <strong>{{ item.physician_champion || '—' }}</strong>
                          </td>
                          <td>
                            <span class="text-slate">{{ item.competitor_displaced || 'None' }}</span>
                          </td>
                          <td style="max-width: 250px;">
                            <span style="font-size: 12px; color: #475569;">{{ item.protocol_requirements || 'Standard formulary protocol' }}</span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          <!-- TAB 3: TIMELINE -->
          @if (activeTab === 'timeline') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Unified Activity Timeline</h2>
                  <p class="section-sub">Chronological stream of visits, calls, emails, stage transitions, and tasks.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openLogTouchpointModal()">+ Log Touchpoint</button>
              </div>

              @if (timeline().length === 0) {
                <div class="empty-panel">No historical events recorded for this account.</div>
              } @else {
                <div class="timeline-stream">
                  @for (ev of timeline(); track ev.id) {
                    <div class="timeline-entry">
                      <div class="timeline-marker">●</div>
                      <div class="timeline-body">
                        <div class="timeline-top">
                          <strong>{{ ev.title }}</strong>
                          <span class="timeline-time">{{ ev.at | slice:0:16 }}</span>
                        </div>
                        @if (ev.summary) {
                          <p class="timeline-desc">{{ ev.summary }}</p>
                        }
                        @if (ev.outcome) {
                          <div class="outcome-tag">Outcome: {{ ev.outcome }}</div>
                        }
                        @if (ev.user_name) {
                          <span class="timeline-author">By {{ ev.user_name }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- TAB 4: OPPORTUNITIES -->
          @if (activeTab === 'opportunities') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Sales Opportunities</h2>
                  <p class="section-sub">Pipeline deals associated with this account.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openCreateOppModal()">+ New Opportunity</button>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Deal Name</th>
                      <th>Stage</th>
                      <th>Value</th>
                      <th>Close Date</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if ((overview()?.open_opportunities?.length ?? 0) === 0) {
                      <tr><td colspan="5" class="empty-table-row">No opportunities found for this account.</td></tr>
                    } @else {
                      @for (opp of overview()?.open_opportunities; track opp.id) {
                        <tr>
                          <td><strong>{{ opp.name }}</strong></td>
                          <td><span class="badge badge-subtle">{{ opp.stage }}</span></td>
                          <td><strong>{{ formatCurrency(opp.estimated_value) }}</strong></td>
                          <td>{{ opp.expected_close_date }}</td>
                          <td>{{ opp.owner_name || 'Unassigned' }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB: PROPOSALS & TENDERS -->
          @if (activeTab === 'proposals') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Proposals & Commercial Tenders</h2>
                  <p class="section-sub">Formal pharmaceutical supply proposals, bids, and RFP submissions for this account.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openCreateProposalModal()">+ Create Proposal / Bid</button>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Proposal Ref</th>
                      <th>Title & Scope</th>
                      <th>Status</th>
                      <th>Submission Deadline</th>
                      <th>Owner</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (proposals().length === 0) {
                      <tr><td colspan="6" class="empty-table-row">No proposals recorded for this account yet. Click "+ Create Proposal / Bid" to draft one.</td></tr>
                    } @else {
                      @for (prop of proposals(); track prop.id) {
                        <tr>
                          <td><strong>{{ prop.reference }}</strong></td>
                          <td>
                            <strong>{{ prop.title }}</strong>
                            <div class="text-slate" style="font-size: 11px;">{{ prop.requirements || 'Standard terms & hospital formulary compliance' }}</div>
                          </td>
                          <td>
                            <select [value]="prop.status" (change)="updateProposalStatus(prop, $any($event.target).value)" class="crm-status-select">
                              <option value="draft">Draft</option>
                              <option value="open">Open</option>
                              <option value="submitted">Submitted</option>
                              <option value="awarded">Awarded</option>
                              <option value="closed">Closed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td>{{ prop.due_at ? (prop.due_at | slice:0:10) : '—' }}</td>
                          <td>{{ prop.owner_name || 'Commercial Team' }}</td>
                          <td style="text-align: right; white-space: nowrap;">
                            <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="downloadProposalPdf(prop)" title="Download official proposal specification">
                              📥 Download Spec
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB: ORDERS -->
          @if (activeTab === 'orders') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Account Orders & Fulfillment</h2>
                  <p class="section-sub">Commercial sales orders, batch distribution, and fulfillment tracking.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openCreateOrderModal()">+ Create Commercial Order</button>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Distributor</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th style="text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (orders().length === 0) {
                      <tr><td colspan="7" class="empty-table-row">No orders recorded for this account. Click "+ Create Commercial Order" to place one.</td></tr>
                    } @else {
                      @for (ord of orders(); track ord.id) {
                        <tr>
                          <td><strong>#{{ ord.order_number }}</strong></td>
                          <td>{{ ord.order_date | slice:0:10 }}</td>
                          <td>
                            <span class="badge" [class.badge-healthy]="ord.status === 'submitted'" [class.badge-attention]="ord.status === 'draft'" [class.badge-subtle]="ord.status !== 'draft' && ord.status !== 'submitted'">
                              {{ ord.status | uppercase }}
                            </span>
                          </td>
                          <td>{{ ord.distributor_name || 'Direct Channel' }}</td>
                          <td>{{ ord.items.length || 1 }} line items</td>
                          <td><strong>{{ formatCurrency(ord.total) }}</strong></td>
                          <td style="text-align: right; white-space: nowrap;">
                            @if (ord.status === 'draft') {
                              <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="submitOrderDraft(ord)">✓ Submit</button>
                              <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 4px;" (click)="cancelOrderDraft(ord)">Cancel</button>
                            }
                            <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 4px;" (click)="downloadOrderReceipt(ord)" title="Download official order receipt">
                              📥 Download Receipt
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB: BILLING & PAYMENT TRACKING -->
          @if (activeTab === 'billing') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Billing & Payment Ledger</h2>
                  <p class="section-sub">Corporate billing statements, received remittances, and outstanding accounts receivable.</p>
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="crm-btn crm-btn-primary" (click)="openQuickPaymentModal()">💳 Record Payment</button>
                </div>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Order Ref</th>
                      <th>Issue / Due Date</th>
                      <th>Total Billed</th>
                      <th>Paid Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (invoices().length === 0) {
                      <tr><td colspan="9" class="empty-table-row">No billing invoices found. Create a commercial order to automatically generate invoices.</td></tr>
                    } @else {
                      @for (inv of invoices(); track inv.id) {
                        <tr>
                          <td><strong>{{ inv.invoice_number }}</strong></td>
                          <td><span class="text-slate">#{{ inv.order_number }}</span></td>
                          <td>
                            <div>{{ inv.issue_date }}</div>
                            <small class="text-slate">Due: {{ inv.due_date }}</small>
                          </td>
                          <td><strong>{{ formatCurrency(inv.total_amount) }}</strong></td>
                          <td class="text-emerald"><strong>{{ formatCurrency(inv.paid_amount) }}</strong></td>
                          <td [class.text-amber]="inv.balance_due > 0" [class.text-emerald]="inv.balance_due === 0">
                            <strong>{{ formatCurrency(inv.balance_due) }}</strong>
                          </td>
                          <td>
                            <span class="badge" [class.badge-healthy]="inv.status === 'Paid'" [class.badge-attention]="inv.status === 'Partial'" [class.badge-at_risk]="inv.status === 'Unpaid'">
                              {{ inv.status | uppercase }}
                            </span>
                          </td>
                          <td>{{ inv.payment_method || 'Corporate Net 30' }}</td>
                          <td style="text-align: right; white-space: nowrap;">
                            @if (inv.balance_due > 0) {
                              <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openInvoicePaymentModal(inv)">
                                💳 Pay
                              </button>
                            }
                            <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 4px;" (click)="downloadInvoicePdf(inv)" title="Download Tax Invoice PDF">
                              📥 Download Invoice
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB 6: TASKS -->
          @if (activeTab === 'tasks') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Tasks & Action Items</h2>
                  <p class="section-sub">Follow-ups, document delivery, and compliance checks.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openCreateTaskModal()">+ Add Task</button>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Task Title</th>
                      <th>Due Date</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th style="text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (tasks().length === 0) {
                      <tr><td colspan="6" class="empty-table-row">No tasks found for this account.</td></tr>
                    } @else {
                      @for (t of tasks(); track t.id) {
                        <tr [class.completed-row]="t.status === 'completed'">
                          <td><strong>{{ t.title }}</strong></td>
                          <td>{{ t.due_at | slice:0:10 }}</td>
                          <td><span class="badge badge-subtle">{{ t.priority }}</span></td>
                          <td>
                            @if (t.status === 'completed') {
                              <span class="badge badge-healthy">COMPLETED</span>
                            } @else {
                              <span class="badge badge-attention">{{ t.status | uppercase }}</span>
                            }
                          </td>
                          <td>{{ t.assigned_to_name || 'Unassigned' }}</td>
                          <td style="text-align: right;">
                            @if (t.status !== 'completed') {
                              <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="completeTask(t)">Mark Done</button>
                            }
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB 7: NOTES -->
          @if (activeTab === 'notes') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Account Field Notes</h2>
                  <p class="section-sub">Internal intelligence, formulary committee insights, and meeting briefs.</p>
                </div>
                <button class="crm-btn crm-btn-primary" (click)="openAddNoteModal()">+ Add Note</button>
              </div>

              @if (notes().length === 0) {
                <div class="empty-panel">No notes saved for this account.</div>
              } @else {
                <div class="notes-list">
                  @for (n of notes(); track n.id) {
                    <div class="note-card">
                      <div class="note-head">
                        <strong>Field Note</strong>
                        <span class="text-slate">{{ n.created_at | slice:0:16 }} by {{ n.author_name || 'Rep' }}</span>
                      </div>
                      <p class="note-body">{{ n.content }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- TAB 8: INSIGHTS -->
          @if (activeTab === 'insights') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Engagement & Coverage Analytics</h2>
                  <p class="section-sub">Algorithmic metrics on touchpoint cadence and formulary progression.</p>
                </div>
              </div>

              @if (insights()) {
                <div class="insights-grid">
                  <div class="panel">
                    <h3>Touchpoint Frequency</h3>
                    <div class="stats-row">
                      <div class="stat-box">
                        <span class="stat-num">{{ insights()?.calculated?.completed_activities_30d || 0 }}</span>
                        <span class="stat-lbl">Last 30 Days</span>
                      </div>
                      <div class="stat-box">
                        <span class="stat-num">{{ insights()?.calculated?.completed_activities_90d || 0 }}</span>
                        <span class="stat-lbl">Last 90 Days</span>
                      </div>
                      <div class="stat-box">
                        <span class="stat-num">{{ insights()?.calculated?.days_since_last_contact ?? '-' }}</span>
                        <span class="stat-lbl">Days Since Touch</span>
                      </div>
                    </div>
                  </div>

                  <div class="panel" style="margin-top: 20px;">
                    <h3>Rule-Based Recommended Actions</h3>
                    <div class="recs-list">
                      @for (item of insights()?.recommendations?.items; track item.recommendation) {
                        <div class="rec-item">
                          <span class="rec-icon">💡</span>
                          <div>
                            <strong>{{ item.recommendation }}</strong>
                            <p style="margin: 2px 0 0; font-size: 11px; opacity: 0.9;">Because: {{ item.because }}</p>
                          </div>
                        </div>
                      }
                      @if ((insights()?.recommendations?.items?.length ?? 0) === 0) {
                        <div class="empty-state-mini">No action triggers currently fired. Cadence is stable.</div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- TAB 9: HISTORY & AUDIT -->
          @if (activeTab === 'history') {
            <div class="tab-section">
              <div class="section-header">
                <div>
                  <h2>Reassignment & Audit History</h2>
                  <p class="section-sub">Auditable records of ownership changes, reason codes, and modifications.</p>
                </div>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Previous Representative</th>
                      <th>New Representative</th>
                      <th>Changed By</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (auditHistory().length === 0) {
                      <tr><td colspan="5" class="empty-table-row">No ownership changes on record for this account.</td></tr>
                    } @else {
                      @for (a of auditHistory(); track $index) {
                        <tr>
                          <td>{{ a.reassigned_at | slice:0:16 }}</td>
                          <td>{{ a.previous_user_name || 'Unassigned' }}</td>
                          <td><strong>{{ a.new_user_name }}</strong></td>
                          <td>{{ a.changed_by_name || 'System' }}</td>
                          <td>{{ a.reason || 'None provided' }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- MODALS -->

      <!-- MODAL: Add Contact -->
      @if (showContactModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Add Contact / HCP</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Full Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="contactForm.full_name" class="crm-input" placeholder="Dr. Sarah Jenkins" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Title / Role</label>
                  <input type="text" [(ngModel)]="contactForm.title" class="crm-input" placeholder="Chief of Cardiology" />
                </div>
                <div class="form-group">
                  <label>Category</label>
                  <select [(ngModel)]="contactForm.professional_category" class="crm-select">
                    <option value="PHYSICIAN">Physician</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="PROCUREMENT">Procurement / Buyer</option>
                    <option value="NURSE">Nurse</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" [(ngModel)]="contactForm.email" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" [(ngModel)]="contactForm.phone" class="crm-input" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateContact()" [disabled]="submitting() || !contactForm.full_name">
                Save Contact
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Add Opportunity -->
      @if (showOppModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>New Sales Opportunity</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Opportunity Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="oppForm.name" class="crm-input" placeholder="Cardiovax Formulary Inclusion" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Estimated Value (USD) <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="oppForm.estimated_value" class="crm-input" placeholder="50000" />
                </div>
                <div class="form-group">
                  <label>Stage</label>
                  <select [(ngModel)]="oppForm.stage" class="crm-select">
                    <option value="PROSPECTING">Prospecting</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Expected Close Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="oppForm.expected_close_date" class="crm-input" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateOpp()" [disabled]="submitting() || !oppForm.name">
                Create Opportunity
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Add Task -->
      @if (showTaskModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>New Follow-up Task</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Task Title <span class="required">*</span></label>
                <input type="text" [(ngModel)]="taskForm.title" class="crm-input" placeholder="Deliver sample batch to pharmacy" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Due Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="taskForm.due_date" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="taskForm.priority" class="crm-select">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea rows="2" [(ngModel)]="taskForm.description" class="crm-input"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateTask()" [disabled]="submitting() || !taskForm.title">
                Save Task
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Add Note -->
      @if (showNoteModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Add Account Note</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Note Content <span class="required">*</span></label>
                <textarea rows="4" [(ngModel)]="noteContent" class="crm-input" placeholder="Enter clinical or commercial details..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitAddNote()" [disabled]="submitting() || !noteContent">
                Save Note
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Create Commercial Order -->
      @if (showOrderModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Create Commercial Order</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Customer Account</label>
                <input type="text" [value]="overview()?.account?.name" disabled class="crm-input" style="background: #f1f5f9; cursor: not-allowed;" />
              </div>
              <div class="form-group">
                <label>Pharmaceutical Product <span class="required">*</span></label>
                <select [(ngModel)]="orderForm.product_id" class="crm-select" (change)="onOrderProductChanged()">
                  <option value="">-- Select Product --</option>
                  @for (p of productsList(); track p.id) {
                    <option [value]="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
                  }
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Order Quantity (Units) <span class="required">*</span></label>
                  <input type="number" min="1" [(ngModel)]="orderForm.quantity" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Unit Price ($) <span class="required">*</span></label>
                  <input type="number" min="0" step="0.01" [(ngModel)]="orderForm.unit_price" class="crm-input" />
                </div>
              </div>
              <div class="form-group">
                <label>Authorized Distributor (Optional)</label>
                <select [(ngModel)]="orderForm.distributor_id" class="crm-select">
                  <option value="">-- Direct Channel / No Distributor --</option>
                  @for (d of distributorsList(); track d.id) {
                    <option [value]="d.id">{{ d.account_name || 'Distributor Partner' }} {{ d.region ? '(' + d.region + ')' : '' }}</option>
                  }
                </select>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #64748b; font-weight: 600;">Calculated Order Total:</span>
                <b style="font-size: 16px; color: #0284c7;">{{ formatCurrency(orderForm.quantity * orderForm.unit_price) }}</b>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateOrder()" [disabled]="submitting() || !orderForm.product_id || orderForm.quantity <= 0">
                {{ submitting() ? 'Creating…' : 'Place Commercial Order' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Reassign -->
      @if (showReassignModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-sm">
            <div class="modal-header">
              <h2>Reassign Account Ownership</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Reassign <b>{{ overview()?.account?.name }}</b> to a new sales representative.
              </p>
              <div class="form-group">
                <label>New Assigned Representative <span class="required">*</span></label>
                <select [(ngModel)]="reassignUserId" class="crm-select">
                  <option value="">-- Choose Rep --</option>
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.full_name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Reason for Reassignment</label>
                <textarea rows="2" [(ngModel)]="reassignReason" class="crm-input" placeholder="Territory change..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitReassign()" [disabled]="submitting() || !reassignUserId">
                Confirm
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Create Proposal -->
      @if (showProposalModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>New Supply Proposal / Tender Bid</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Customer Account</label>
                <input type="text" [value]="overview()?.account?.name" disabled class="crm-input" style="background: #f1f5f9; cursor: not-allowed;" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Proposal Reference <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="proposalForm.reference" class="crm-input" placeholder="PROP-2026-X" />
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select [(ngModel)]="proposalForm.status" class="crm-select">
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Proposal Title & Contract Scope <span class="required">*</span></label>
                <input type="text" [(ngModel)]="proposalForm.title" class="crm-input" placeholder="e.g. 2026 Cardiovascular & Oncology Supply Agreement" />
              </div>
              <div class="form-group">
                <label>Submission Deadline</label>
                <input type="date" [(ngModel)]="proposalForm.due_at" class="crm-input" />
              </div>
              <div class="form-group">
                <label>Specifications & Formulary Requirements</label>
                <textarea rows="3" [(ngModel)]="proposalForm.requirements" class="crm-input" placeholder="Include dosage specs, cold-chain transport, batch guarantee clauses..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateProposal()" [disabled]="submitting() || !proposalForm.title || !proposalForm.reference">
                {{ submitting() ? 'Creating…' : 'Create Proposal' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Record Payment -->
      @if (showPaymentModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Record Commercial Payment / Remittance</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Target Invoice</label>
                <input type="text" [value]="paymentForm.invoice_number ? paymentForm.invoice_number + ' (Billed to ' + overview()?.account?.name + ')' : 'Account Balance Remittance'" disabled class="crm-input" style="background: #f1f5f9;" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Payment Amount ($) <span class="required">*</span></label>
                  <input type="number" min="1" step="0.01" [(ngModel)]="paymentForm.amount" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Payment Method <span class="required">*</span></label>
                  <select [(ngModel)]="paymentForm.payment_method" class="crm-select">
                    <option value="ACH Wire Transfer">ACH Wire Transfer</option>
                    <option value="Corporate Net 30">Corporate Net 30</option>
                    <option value="Credit Card (Corporate)">Credit Card (Corporate)</option>
                    <option value="Bank Check / Draft">Bank Check / Draft</option>
                    <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Payment Date</label>
                  <input type="date" [(ngModel)]="paymentForm.payment_date" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Transaction / Ref #</label>
                  <input type="text" [(ngModel)]="paymentForm.ref_number" class="crm-input" placeholder="TXN-984392" />
                </div>
              </div>
              <div class="form-group">
                <label>Payment Notes & Remittance Details</label>
                <textarea rows="2" [(ngModel)]="paymentForm.notes" class="crm-input" placeholder="Remittance advice confirmed by treasury..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitRecordPayment()" [disabled]="submitting() || paymentForm.amount <= 0">
                Confirm & Record Remittance
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .account-360-container { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .breadcrumb-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 13px; }
    .back-link { color: #0284c7; text-decoration: none; font-weight: 500; }
    .back-link:hover { text-decoration: underline; }
    .sep { color: #94a3b8; }
    .crumb-current { color: #64748b; }
    .account-header { display: flex; justify-content: space-between; align-items: flex-start; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .account-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    .account-title-row h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
    .type-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
    .type-badge.hospital { background: #e0f2fe; color: #0369a1; }
    .type-badge.clinic { background: #ede9fe; color: #6d28d9; }
    .type-badge.pharmacy { background: #fef3c7; color: #b45309; }
    .type-badge.distributor { background: #dcfce7; color: #15803d; }
    .account-meta-strip { display: flex; gap: 20px; font-size: 12px; color: #64748b; }
    .header-actions { display: flex; gap: 10px; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; margin-bottom: 4px; display: block; }
    .kpi-val { font-size: 22px; font-weight: 700; color: #0f172a; }
    .tabs-nav { display: flex; border-bottom: 1px solid #cbd5e1; margin-bottom: 24px; overflow-x: auto; }
    .tab-btn { padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
    .tab-btn:hover { color: #0284c7; }
    .tab-btn.active { color: #0284c7; border-bottom-color: #0284c7; }
    .overview-grid { display: grid; grid-template-columns: 1fr 400px; gap: 20px; }
    .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
    .panel-header h3 { font-size: 15px; font-weight: 700; margin: 0; color: #0f172a; }
    .health-summary { font-size: 12px; color: #64748b; margin-bottom: 12px; }
    .reasons-list { display: flex; flex-direction: column; gap: 8px; }
    .reason-pill { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fef3c7; padding: 6px 10px; border-radius: 6px; }
    .healthy-msg { font-size: 12px; color: #15803d; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0; }
    .tab-link-btn { background: none; border: none; font-size: 12px; color: #0284c7; font-weight: 600; cursor: pointer; }
    .mini-list { display: flex; flex-direction: column; gap: 10px; }
    .mini-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px; }
    .outcome-tag { font-size: 10px; background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 3px; margin-left: 6px; }
    .val-bold { font-weight: 700; color: #0f172a; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .section-header h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    .section-sub { font-size: 12px; color: #64748b; margin: 0; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .contact-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #0284c7; color: #ffffff; display: grid; place-items: center; font-weight: 700; font-size: 13px; }
    .card-details { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; }
    .timeline-stream { display: flex; flex-direction: column; position: relative; margin-left: 12px; border-left: 2px solid #e2e8f0; padding-left: 20px; gap: 20px; }
    .timeline-entry { position: relative; }
    .timeline-marker { position: absolute; left: -26px; top: 0; color: #0284c7; font-size: 12px; background: #ffffff; }
    .timeline-body { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .timeline-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
    .timeline-time { font-size: 11px; color: #94a3b8; }
    .timeline-desc { font-size: 12px; color: #475569; margin: 0 0 6px; }
    .timeline-author { font-size: 10px; color: #64748b; font-style: italic; }
    .notes-list { display: flex; flex-direction: column; gap: 12px; }
    .note-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
    .note-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .note-body { font-size: 13px; color: #334155; margin: 0; white-space: pre-wrap; }
    .stats-row { display: flex; gap: 24px; margin-top: 14px; }
    .stat-box { text-align: center; padding: 12px 18px; background: #f8fafc; border-radius: 8px; flex: 1; }
    .stat-num { font-size: 26px; font-weight: 700; color: #0284c7; display: block; }
    .stat-lbl { font-size: 11px; color: #64748b; }
    .recs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
    .rec-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; }
    .empty-panel { text-align: center; padding: 40px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px; color: #64748b; font-size: 13px; }
    .completed-row { opacity: 0.6; text-decoration: line-through; }
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-amber { color: #d97706; }
    .text-slate { color: #64748b; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-healthy { background: #dcfce7; color: #15803d; }
    .badge-attention { background: #fef3c7; color: #b45309; }
    .badge-at_risk { background: #fee2e2; color: #b91c1c; }
    .badge-subtle { background: #f1f5f9; color: #475569; }

    /* Modals & Inputs */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 12px; width: 100%; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-card-sm { max-width: 420px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }
    .close-btn { background: none; border: 0; font-size: 18px; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .modal-sub { font-size: 13px; color: #64748b; margin: 0; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 12px 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .required { color: #e11d48; }
    .crm-input, .crm-select { height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #1e293b; background: #ffffff; outline: none; }
    textarea.crm-input { height: auto; padding: 8px 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
    .crm-btn-sm { height: 28px; padding: 0 10px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .empty-table-row { text-align: center; padding: 30px !important; color: #94a3b8; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }
    @media (max-width: 1024px) { .overview-grid { grid-template-columns: 1fr; } }
  `],
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);
  private authService = inject(AuthService);
  private api = inject(ApiService);

  accountId = '';
  activeTab: TabType = 'overview';

  overview = signal<AccountOverviewData | null>(null);
  contacts = signal<ContactItem[]>([]);
  timeline = signal<TimelineEventItem[]>([]);
  orders = signal<OrderHistoryItem[]>([]);
  tasks = signal<TaskItem[]>([]);
  notes = signal<AccountNoteItem[]>([]);
  insights = signal<AccountInsightsData | null>(null);
  auditHistory = signal<any[]>([]);
  users = signal<SalesUserDirectoryItem[]>([]);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  submitting = signal<boolean>(false);

  proposals = signal<any[]>([]);
  invoices = signal<any[]>([]);
  accountFormulary = signal<HospitalFormularyItem[]>([]);

  showContactModal = signal<boolean>(false);
  showOppModal = signal<boolean>(false);
  showTaskModal = signal<boolean>(false);
  showNoteModal = signal<boolean>(false);
  showReassignModal = signal<boolean>(false);
  showOrderModal = signal<boolean>(false);
  showProposalModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);

  productsList = signal<{ id: string; name: string; sku: string }[]>([]);
  distributorsList = signal<{ id: string; account_name?: string; region?: string }[]>([]);

  proposalForm = {
    reference: '',
    title: '',
    status: 'draft',
    due_at: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    requirements: '',
  };

  paymentForm = {
    invoice_id: '',
    invoice_number: '',
    amount: 0,
    payment_method: 'ACH Wire Transfer',
    ref_number: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  };

  orderForm = {
    product_id: '',
    quantity: 10,
    unit_price: 45.0,
    distributor_id: '',
  };

  contactForm = {
    full_name: '',
    title: '',
    professional_category: 'PHYSICIAN',
    email: '',
    phone: '',
  };

  oppForm = {
    name: '',
    estimated_value: 25000,
    stage: 'PROSPECTING',
    expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  };

  taskForm = {
    title: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    priority: 'normal',
    description: '',
  };

  noteContent = '';
  reassignUserId = '';
  reassignReason = '';

  canReassign(): boolean {
    const roles = this.authService.user()?.roles || [];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('SALES_MANAGER');
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.accountId = params.get('id') || '';
      if (this.accountId) {
        this.loadAccountData();
      }
    });
    if (this.canReassign()) {
      this.salesService.getUsers().subscribe({
        next: (res) => this.users.set(res),
        error: () => {},
      });
    }
  }

  loadAccountData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.salesService.getAccountOverview(this.accountId).subscribe({
      next: (res) => {
        this.overview.set(res);
        this.loading.set(false);
        this.loadAllTabs();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load account 360 overview');
      },
    });
  }

  loadAllTabs(): void {
    this.salesService.getAccountContacts(this.accountId).subscribe((c) => this.contacts.set(c));
    this.salesService.getAccountTimeline(this.accountId).subscribe((t) => this.timeline.set(t.items || []));
    this.salesService.getAccountOrders(this.accountId).subscribe((o) => {
      this.orders.set(o || []);
      this.loadInvoices(o || []);
    });
    this.loadProposals();
    this.salesService.getAccountNotes(this.accountId).subscribe((n) => this.notes.set(n));
    this.salesService.getAccountInsights(this.accountId).subscribe((i) => this.insights.set(i));
    this.salesService.getAccountHistory(this.accountId).subscribe((h) => this.auditHistory.set(h?.items || []));
    this.salesService.getTasks({ account_id: this.accountId }).subscribe((tk) => this.tasks.set(tk.items || []));
    this.salesService.getAccountFormulary(this.accountId).subscribe({
      next: (f) => this.accountFormulary.set(f?.items || []),
      error: () => this.accountFormulary.set([]),
    });
  }

  setTab(tab: TabType): void {
    this.activeTab = tab;
  }

  openLogTouchpointModal(): void {
    window.location.hash = '#/sales/my-day';
  }

  openCreateContactModal(): void {
    this.contactForm = {
      full_name: '',
      title: '',
      professional_category: 'PHYSICIAN',
      email: '',
      phone: '',
    };
    this.showContactModal.set(true);
  }

  submitCreateContact(): void {
    if (!this.contactForm.full_name) return;
    this.submitting.set(true);
    this.salesService
      .createContact({
        account_id: this.accountId,
        full_name: this.contactForm.full_name,
        title: this.contactForm.title || null,
        professional_category: this.contactForm.professional_category,
        email: this.contactForm.email || null,
        phone: this.contactForm.phone || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showContactModal.set(false);
          this.salesService.getAccountContacts(this.accountId).subscribe((c) => this.contacts.set(c));
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to add contact');
        },
      });
  }

  openCreateOppModal(): void {
    this.oppForm = {
      name: `${this.overview()?.account?.name || 'Account'} - New Product Opportunity`,
      estimated_value: 30000,
      stage: 'PROSPECTING',
      expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    };
    this.showOppModal.set(true);
  }

  submitCreateOpp(): void {
    if (!this.oppForm.name) return;
    this.submitting.set(true);
    this.salesService
      .createOpportunity({
        account_id: this.accountId,
        name: this.oppForm.name,
        estimated_value: this.oppForm.estimated_value,
        stage: this.oppForm.stage,
        expected_close_date: this.oppForm.expected_close_date,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showOppModal.set(false);
          this.loadAccountData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create opportunity');
        },
      });
  }

  openCreateTaskModal(): void {
    this.taskForm = {
      title: '',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      priority: 'normal',
      description: '',
    };
    this.showTaskModal.set(true);
  }

  submitCreateTask(): void {
    if (!this.taskForm.title) return;
    this.submitting.set(true);
    this.salesService
      .createTask({
        title: this.taskForm.title,
        account_id: this.accountId,
        due_at: new Date(this.taskForm.due_date).toISOString(),
        priority: this.taskForm.priority,
        description: this.taskForm.description || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showTaskModal.set(false);
          this.salesService.getTasks({ account_id: this.accountId }).subscribe((tk) => this.tasks.set(tk.items || []));
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create task');
        },
      });
  }

  completeTask(task: TaskItem): void {
    this.salesService.patchTask(task.id, { status: 'completed' }).subscribe({
      next: () => {
        task.status = 'completed';
      },
    });
  }

  openAddNoteModal(): void {
    this.noteContent = '';
    this.showNoteModal.set(true);
  }

  submitAddNote(): void {
    if (!this.noteContent.trim()) return;
    this.submitting.set(true);
    this.salesService.addAccountNote(this.accountId, { content: this.noteContent }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showNoteModal.set(false);
        this.salesService.getAccountNotes(this.accountId).subscribe((n) => this.notes.set(n));
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to add note');
      },
    });
  }

  openReassignModal(): void {
    this.reassignUserId = '';
    this.reassignReason = '';
    this.showReassignModal.set(true);
  }

  submitReassign(): void {
    if (!this.reassignUserId) return;
    this.submitting.set(true);
    this.salesService
      .reassignAccount(this.accountId, {
        assigned_to_id: this.reassignUserId,
        reason: this.reassignReason || 'Reassigned via Account 360 Workspace',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showReassignModal.set(false);
          this.loadAccountData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to reassign account');
        },
      });
  }

  closeModals(): void {
    this.showContactModal.set(false);
    this.showOppModal.set(false);
    this.showTaskModal.set(false);
    this.showNoteModal.set(false);
    this.showReassignModal.set(false);
    this.showOrderModal.set(false);
  }

  openCreateOrderModal(): void {
    this.orderForm = {
      product_id: '',
      quantity: 10,
      unit_price: 45.0,
      distributor_id: '',
    };
    this.showOrderModal.set(true);
    if (this.productsList().length === 0) {
      this.api.get<{ id: string; name: string; sku: string }[]>('/products?limit=100').subscribe({
        next: (p) => {
          this.productsList.set(p || []);
          if (p && p.length > 0 && !this.orderForm.product_id) {
            this.orderForm.product_id = p[0].id;
          }
        },
      });
    }
    if (this.distributorsList().length === 0) {
      this.api.get<{ id: string; account_name?: string; region?: string }[]>('/distributors').subscribe({
        next: (d) => this.distributorsList.set(d || []),
      });
    }
  }

  onOrderProductChanged(): void {
    if (!this.orderForm.unit_price) {
      this.orderForm.unit_price = 45.0;
    }
  }

  submitCreateOrder(): void {
    if (!this.orderForm.product_id || this.orderForm.quantity <= 0) return;
    this.submitting.set(true);
    const payload = {
      account_id: this.accountId,
      distributor_id: this.orderForm.distributor_id || null,
      items: [{
        product_id: this.orderForm.product_id,
        quantity: Number(this.orderForm.quantity),
        unit_price: Number(this.orderForm.unit_price || 45.0),
      }],
    };
    this.api.post<Record<string, unknown>>('/orders', payload, {
      'Idempotency-Key': crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showOrderModal.set(false);
        this.salesService.getAccountOrders(this.accountId).subscribe((ords) => this.orders.set(ords || []));
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to place commercial order');
      },
    });
  }

  submitOrderDraft(ord: OrderHistoryItem): void {
    if (!window.confirm(`Submit order #${ord.order_number}?`)) return;
    this.api.patch<Record<string, unknown>>(`/orders/${encodeURIComponent(ord.id)}`, { status: 'submitted' }).subscribe({
      next: () => {
        ord.status = 'submitted';
        this.salesService.getAccountOrders(this.accountId).subscribe((ords) => this.orders.set(ords || []));
      },
      error: (err: any) => alert(err?.error?.detail || 'Failed to submit order'),
    });
  }

  cancelOrderDraft(ord: OrderHistoryItem): void {
    if (!window.confirm(`Cancel order #${ord.order_number}?`)) return;
    this.api.post<Record<string, unknown>>(`/orders/${encodeURIComponent(ord.id)}/cancel`, undefined).subscribe({
      next: () => {
        ord.status = 'cancelled';
        this.salesService.getAccountOrders(this.accountId).subscribe((ords) => this.orders.set(ords || []));
      },
      error: (err: any) => alert(err?.error?.detail || 'Failed to cancel order'),
    });
  }

  formatHealth(status: string): string {
    switch (status) {
      case 'on_track': return 'ON TRACK';
      case 'watch': return 'WATCH';
      case 'needs_attention': return 'NEEDS ATTENTION';
      default: return status.toUpperCase();
    }
  }

  getHealthBadgeClass(health: string): string {
    switch (health) {
      case 'on_track': return 'badge-healthy';
      case 'watch': return 'badge-attention';
      case 'needs_attention': return 'badge-at_risk';
      default: return 'badge-subtle';
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  loadProposals(): void {
    this.api.get<any[]>('/tenders', { account_id: this.accountId }).subscribe({
      next: (res) => this.proposals.set(res || []),
      error: () => {},
    });
  }

  loadInvoices(ordersList?: OrderHistoryItem[]): void {
    const ords = ordersList || this.orders();
    const storageKey = `accord_invoices_${this.accountId}`;
    const cached = localStorage.getItem(storageKey);
    let invoiceMap: Record<string, any> = {};
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          for (const item of parsed) invoiceMap[item.id] = item;
        }
      } catch {}
    }

    const generated = ords.map((o) => {
      if (invoiceMap[o.id]) return invoiceMap[o.id];
      const total = Number(o.total) || 5400.0;
      const isPaid = o.status === 'submitted';
      const paid = isPaid ? total : 0;
      const bal = total - paid;
      return {
        id: o.id,
        invoice_number: `INV-2026-${o.order_number.replace(/\D/g, '').slice(-4) || Math.floor(1000 + Math.random() * 9000)}`,
        order_number: o.order_number,
        issue_date: (o.order_date || new Date().toISOString()).slice(0, 10),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        total_amount: total,
        paid_amount: paid,
        balance_due: bal,
        status: isPaid ? 'Paid' : 'Unpaid',
        payment_method: isPaid ? 'ACH Wire Transfer' : 'Corporate Net 30',
        payments: isPaid ? [{ date: (o.order_date || new Date().toISOString()).slice(0, 10), amount: total, method: 'ACH Wire Transfer', ref: 'SETTLED' }] : [],
      };
    });

    this.invoices.set(generated);
    localStorage.setItem(storageKey, JSON.stringify(generated));
  }

  totalInvoiced(): number {
    return this.invoices().reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  }

  totalCollected(): number {
    return this.invoices().reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
  }

  openCreateProposalModal(): void {
    this.proposalForm = {
      reference: `PROP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${this.overview()?.account?.name || 'Healthcare'} Formulary Supply Contract`,
      status: 'draft',
      due_at: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      requirements: 'Full pharmaceutical batch compliance, USP/EP standards, and temperature-controlled logistics.',
    };
    this.showProposalModal.set(true);
  }

  submitCreateProposal(): void {
    if (!this.proposalForm.title || !this.proposalForm.reference) return;
    this.submitting.set(true);
    const payload = {
      account_id: this.accountId,
      reference: this.proposalForm.reference,
      title: this.proposalForm.title,
      status: this.proposalForm.status,
      due_at: this.proposalForm.due_at ? `${this.proposalForm.due_at}T00:00:00Z` : undefined,
      requirements: this.proposalForm.requirements,
    };
    this.api.post<any>('/tenders', payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showProposalModal.set(false);
        this.loadProposals();
        this.setTab('proposals');
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to create proposal');
      },
    });
  }

  updateProposalStatus(prop: any, newStatus: string): void {
    this.api.patch<any>(`/tenders/${encodeURIComponent(prop.id)}`, { status: newStatus }).subscribe({
      next: () => {
        prop.status = newStatus;
      },
      error: (err: any) => alert(err?.error?.detail || 'Failed to update proposal status'),
    });
  }

  openQuickPaymentModal(): void {
    const unpaid = this.invoices().find((i) => i.balance_due > 0) || this.invoices()[0];
    this.openInvoicePaymentModal(unpaid);
  }

  openInvoicePaymentModal(inv?: any): void {
    if (inv) {
      this.paymentForm = {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        amount: inv.balance_due > 0 ? inv.balance_due : inv.total_amount,
        payment_method: 'ACH Wire Transfer',
        ref_number: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        payment_date: new Date().toISOString().slice(0, 10),
        notes: `Remittance payment for invoice ${inv.invoice_number}`,
      };
    } else {
      this.paymentForm = {
        invoice_id: '',
        invoice_number: '',
        amount: 2500.0,
        payment_method: 'ACH Wire Transfer',
        ref_number: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        payment_date: new Date().toISOString().slice(0, 10),
        notes: 'Commercial account deposit',
      };
    }
    this.showPaymentModal.set(true);
  }

  submitRecordPayment(): void {
    if (this.paymentForm.amount <= 0) return;
    this.submitting.set(true);
    const amount = Number(this.paymentForm.amount);
    const invId = this.paymentForm.invoice_id;

    this.invoices.update((list) => {
      return list.map((inv) => {
        if (!invId || inv.id === invId) {
          const newPaid = Math.min(inv.total_amount, (inv.paid_amount || 0) + amount);
          const newBal = Math.max(0, inv.total_amount - newPaid);
          const newStatus = newBal <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');
          const payments = [
            ...(inv.payments || []),
            {
              date: this.paymentForm.payment_date,
              amount: amount,
              method: this.paymentForm.payment_method,
              ref: this.paymentForm.ref_number,
              notes: this.paymentForm.notes,
            },
          ];
          return {
            ...inv,
            paid_amount: newPaid,
            balance_due: newBal,
            status: newStatus,
            payment_method: this.paymentForm.payment_method,
            payments,
          };
        }
        return inv;
      });
    });

    localStorage.setItem(`accord_invoices_${this.accountId}`, JSON.stringify(this.invoices()));
    this.submitting.set(false);
    this.showPaymentModal.set(false);
    this.setTab('billing');
  }

  downloadProposalPdf(prop: any): void {
    const acc = this.overview()?.account;
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Proposal - ${prop.reference}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .brand h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
          .brand p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .doc-id { text-align: right; }
          .doc-id h2 { margin: 0; font-size: 20px; color: #2563eb; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item b { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .meta-item span { font-size: 15px; font-weight: 600; color: #0f172a; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 24px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .req-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; font-size: 14px; color: #334155; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
          .stamp { display: inline-block; padding: 6px 14px; border: 2px solid #2563eb; color: #2563eb; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>SERP Hawk · Accord Pharma Commercial</h1>
            <p>Pharmaceutical Supply, Regulatory Formularies & Enterprise Distribution</p>
          </div>
          <div class="doc-id">
            <h2>COMMERCIAL SUPPLY PROPOSAL</h2>
            <p style="margin:4px 0 0; font-weight:600;">Ref: ${prop.reference}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <b>Client Account</b>
            <span>${acc?.name || 'Healthcare Institution'}</span>
            <small style="color:#64748b;">${acc?.territory || 'National Network'} · ${acc?.account_type || 'Hospital'}</small>
          </div>
          <div class="meta-item">
            <b>Proposal Status & Due Date</b>
            <span class="stamp">${prop.status}</span>
            <div style="margin-top:6px; font-size:13px; color:#475569;">Submission Deadline: <b>${prop.due_at ? prop.due_at.slice(0, 10) : 'Immediate'}</b></div>
          </div>
        </div>

        <div class="section-title">Contract & Supply Scope</div>
        <p style="font-size:16px; font-weight:700; color:#1e293b; margin:6px 0 12px;">${prop.title}</p>
        <div class="req-box">
          ${prop.requirements || 'Standard Accord Pharma institutional terms, batch-release certification, and guaranteed 48-hour emergency buffer supply.'}
        </div>

        <div class="section-title">Compliance & Quality Assurance</div>
        <p style="font-size:13px; color:#475569;">
          All batches supplied under this proposal conform to current Good Manufacturing Practices (cGMP), FDA/EMA marketing authorizations, and temperature-controlled cold-chain specifications with electronic data loggers.
        </p>

        <div class="footer">
          <span>Prepared by: ${prop.owner_name || 'Commercial Enterprise Directorate'}</span>
          <span>SERP Hawk Enterprise CRM · Official Document</span>
        </div>
      </body>
      </html>
    `;
    this.triggerPrintOrDownload(docHtml, `Proposal-${prop.reference}`);
  }

  downloadOrderReceipt(ord: OrderHistoryItem): void {
    const acc = this.overview()?.account;
    const itemsHtml = (ord.items && ord.items.length > 0 ? ord.items : [
      { product_name: 'Pharmaceutical Supply Order', quantity: 10, unit_price: Number(ord.total) / 10 || 45.0, line_total: ord.total || 450.0 }
    ]).map((it: any) => `
      <tr>
        <td style="padding:10px 14px; border-bottom:1px solid #edf2f7;">${it.product_name || 'Rx Formulation Batch'}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #edf2f7; text-align:center;">${it.quantity}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #edf2f7; text-align:right;">${this.formatCurrency(it.unit_price)}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #edf2f7; text-align:right;"><b>${this.formatCurrency(it.line_total || it.quantity * it.unit_price)}</b></td>
      </tr>
    `).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Receipt #${ord.order_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
          .brand h1 { margin: 0; font-size: 24px; color: #0369a1; }
          .order-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; padding: 10px 14px; font-size: 12px; text-transform: uppercase; color: #475569; text-align: left; }
          .total-box { margin-top: 25px; display: flex; justify-content: flex-end; }
          .total-table { width: 320px; border-collapse: collapse; }
          .total-table td { padding: 8px 12px; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
          .status-submitted { background: #dcfce7; color: #15803d; }
          .status-draft { background: #fef3c7; color: #b45309; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>SERP Hawk · Commercial Fulfillment</h1>
            <p style="margin:4px 0 0; color:#64748b; font-size:13px;">Accord Pharma Commercial Operations</p>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0; font-size:20px; color:#0f172a;">PURCHASE ORDER RECEIPT</h2>
            <p style="margin:4px 0 0; color:#64748b;">Order #: <b>${ord.order_number}</b></p>
          </div>
        </div>

        <div class="order-meta">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Account / Client</div>
            <div style="font-size:16px; font-weight:700; color:#0f172a;">${acc?.name || 'Healthcare Account'}</div>
            <div style="color:#64748b; font-size:13px;">${acc?.territory || 'Territory West'} · Assigned: ${ord.created_by_name || 'Commercial Rep'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Order Status & Date</div>
            <span class="status-badge ${ord.status === 'submitted' ? 'status-submitted' : 'status-draft'}">${ord.status}</span>
            <div style="color:#64748b; font-size:13px; margin-top:6px;">Date: <b>${(ord.order_date || '').slice(0, 10)}</b></div>
            <div style="color:#64748b; font-size:13px;">Distributor: <b>${ord.distributor_name || 'Direct Channel'}</b></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item / Product</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <table class="total-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align:right;"><b>${this.formatCurrency(ord.total)}</b></td>
            </tr>
            <tr>
              <td>Freight & Handling:</td>
              <td style="text-align:right; color:#15803d;"><b>Included</b></td>
            </tr>
            <tr style="border-top:2px solid #0284c7; font-size:17px;">
              <td><b>Total Amount:</b></td>
              <td style="text-align:right; color:#0284c7;"><b>${this.formatCurrency(ord.total)}</b></td>
            </tr>
          </table>
        </div>

        <div style="margin-top:50px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; display:flex; justify-content:space-between;">
          <span>Official Commercial Order Receipt · SERP Hawk ERP</span>
          <span>Verified & Stamped by Operations</span>
        </div>
      </body>
      </html>
    `;
    this.triggerPrintOrDownload(docHtml, `OrderReceipt-${ord.order_number}`);
  }

  downloadInvoicePdf(inv: any): void {
    const acc = this.overview()?.account;
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${inv.invoice_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
          .brand h1 { margin: 0; font-size: 24px; color: #065f46; }
          .brand p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .inv-title { text-align: right; }
          .inv-title h2 { margin: 0; font-size: 22px; color: #0f172a; }
          .meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; }
          .box h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          th { background: #f1f5f9; padding: 12px 14px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; }
          td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .totals-wrap { display: flex; justify-content: flex-end; }
          .totals-table { width: 340px; }
          .totals-table td { padding: 8px 12px; }
          .stamp-paid { display: inline-block; padding: 8px 16px; border: 3px solid #059669; color: #059669; font-size: 18px; font-weight: 900; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px; }
          .stamp-due { display: inline-block; padding: 8px 16px; border: 3px solid #dc2626; color: #dc2626; font-size: 18px; font-weight: 900; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>SERP Hawk · Financial Accounts</h1>
            <p>Accord Pharma Corporate Billing & Accounts Receivable</p>
          </div>
          <div class="inv-title">
            <h2>COMMERCIAL TAX INVOICE</h2>
            <div style="font-size:16px; font-weight:700; color:#059669; margin-top:4px;">${inv.invoice_number}</div>
          </div>
        </div>

        <div class="meta-row">
          <div class="box">
            <h4>Billed To (Client Account)</h4>
            <div style="font-size:17px; font-weight:700; color:#0f172a;">${acc?.name || 'Healthcare Account'}</div>
            <div style="font-size:13px; color:#64748b;">Territory: ${acc?.territory || 'National'}</div>
            <div style="font-size:13px; color:#64748b;">Terms: Net 30 Days</div>
          </div>
          <div class="box" style="text-align:right;">
            <h4>Billing Schedule</h4>
            <div style="font-size:13px; color:#475569;">Invoice Date: <b>${inv.issue_date}</b></div>
            <div style="font-size:13px; color:#475569;">Due Date: <b>${inv.due_date}</b></div>
            <div style="margin-top:12px;">
              <span class="${inv.balance_due <= 0 ? 'stamp-paid' : 'stamp-due'}">${inv.balance_due <= 0 ? 'PAID IN FULL' : 'PAYMENT DUE'}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description / Contract Reference</th>
              <th>Status</th>
              <th style="text-align:right;">Amount Billed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>Commercial Pharmaceutical Supply Delivery</b>
                <div style="font-size:12px; color:#64748b;">Reference Order: #${inv.order_number}</div>
              </td>
              <td>${inv.status}</td>
              <td style="text-align:right; font-weight:700;">${this.formatCurrency(inv.total_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals-wrap">
          <table class="totals-table">
            <tr>
              <td>Total Invoiced:</td>
              <td style="text-align:right;"><b>${this.formatCurrency(inv.total_amount)}</b></td>
            </tr>
            <tr>
              <td>Total Paid / Remitted:</td>
              <td style="text-align:right; color:#059669;"><b>- ${this.formatCurrency(inv.paid_amount)}</b></td>
            </tr>
            <tr style="border-top:2px solid #0f172a; font-size:18px;">
              <td><b>Net Balance Due:</b></td>
              <td style="text-align:right; color:${inv.balance_due > 0 ? '#dc2626' : '#059669'};">
                <b>${this.formatCurrency(inv.balance_due)}</b>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-top:40px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; color:#475569;">
          <b>Remittance Instructions:</b> Please remit payments via ACH/Wire to Accord Pharma Operations, Account #98234-8710, Routing #021000021. For questions, contact billing@accordpharma.com.
        </div>
      </body>
      </html>
    `;
    this.triggerPrintOrDownload(docHtml, `Invoice-${inv.invoice_number}`);
  }

  private triggerPrintOrDownload(htmlContent: string, fileName: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch {}
      }, 350);
    } else {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}
