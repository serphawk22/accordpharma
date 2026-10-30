import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import {
  MyDayData,
  ActivityItem,
  AccountCardItem,
  ContactItem,
} from '../../../core/sales.models';

@Component({
  selector: 'app-sales-my-day',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="my-day-container">
      <!-- Header Banner -->
      <header class="page-header">
        <div class="header-titles">
          <div class="eyebrow">FIELD SALES WORKSPACE</div>
          <h1>My Day</h1>
          <p class="subtitle">
            Welcome, {{ currentUser()?.full_name || 'Representative' }}. Here is your commercial agenda, scheduled HCP visits, and priority tasks for today ({{ todayDisplay }}).
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="loadData()" [disabled]="loading()">
            <span>↻</span> Refresh
          </button>
        </div>
      </header>

      <!-- Connection / Error Banner -->
      @if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          <strong>Notice:</strong> {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px; padding: 4px 10px;" (click)="loadData()">Retry</button>
        </div>
      }

      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading your daily schedule & performance strip...</span>
        </div>
      } @else if (data()) {
        <!-- Daily Performance Strip -->
        <section class="performance-strip" aria-label="Daily Performance Metrics">
          <div class="strip-card">
            <span class="strip-label">Planned Visits</span>
            <div class="strip-value">{{ data()?.metrics?.planned_visits ?? 0 }}</div>
            <span class="strip-sub">Scheduled today</span>
          </div>
          <div class="strip-card success">
            <span class="strip-label">Visits Completed</span>
            <div class="strip-value text-emerald">{{ data()?.metrics?.visits_completed ?? 0 }}</div>
            <span class="strip-sub">Documented</span>
          </div>
          <div class="strip-card">
            <span class="strip-label">Calls & Meetings</span>
            <div class="strip-value">{{ (data()?.metrics?.calls_completed ?? 0) + (data()?.metrics?.meetings_completed ?? 0) }}</div>
            <span class="strip-sub">{{ data()?.metrics?.calls_completed ?? 0 }} calls · {{ data()?.metrics?.meetings_completed ?? 0 }} meetings</span>
          </div>
          <div class="strip-card" [class.warning]="(data()?.metrics?.followups_due ?? 0) > 0">
            <span class="strip-label">Follow-ups Due</span>
            <div class="strip-value text-amber">{{ data()?.metrics?.followups_due ?? 0 }}</div>
            <span class="strip-sub">Action items pending</span>
          </div>
          <div class="strip-card" [class.danger]="(data()?.metrics?.overdue_activities ?? 0) > 0">
            <span class="strip-label">Overdue Activities</span>
            <div class="strip-value text-rose">{{ data()?.metrics?.overdue_activities ?? 0 }}</div>
            <span class="strip-sub">Past scheduled date</span>
          </div>
          <div class="strip-card">
            <span class="strip-label">New Leads</span>
            <div class="strip-value">{{ data()?.metrics?.new_leads ?? 0 }}</div>
            <span class="strip-sub">In funnel</span>
          </div>
          <div class="strip-card highlight">
            <span class="strip-label">Deals Needing Action</span>
            <div class="strip-value text-blue">{{ data()?.metrics?.opportunities_requiring_action ?? 0 }}</div>
            <span class="strip-sub">Closing soon or stalled</span>
          </div>
        </section>

        <!-- Monthly Target Progress -->
        @if (data()?.performance) {
          <div class="target-bar-card">
            <div class="target-info">
              <div>
                <strong>Monthly Sales Target Progress</strong>
                <span class="target-dates">Won Revenue: <b>{{ formatCurrency(data()?.performance?.won_revenue || 0) }}</b> / Target: <b>{{ formatCurrency(data()?.performance?.target || 0) }}</b></span>
              </div>
              <div class="target-pct">
                <span class="pct-num">{{ ((data()?.performance?.target_progress || 0) * 100).toFixed(1) }}%</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="calcBarWidth((data()?.performance?.target_progress || 0) * 100)"></div>
            </div>
            <div class="target-note">
              Based on closed-won opportunities in {{ data()?.performance?.month }}.
            </div>
          </div>
        }

        <!-- Quick Action Bar -->
        <section class="quick-action-bar">
          <span class="action-bar-label">Quick Actions:</span>
          <button class="crm-btn crm-btn-primary" (click)="openLogModal('visit')">
            <span>+</span> Log HCP Visit
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openLogModal('call')">
            <span>📞</span> Log Call
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openLogModal('meeting')">
            <span>📅</span> Schedule Meeting
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openEmailModal()">
            <span>✉</span> Send Email / Invite
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openScheduleFollowUpModal()">
            <span>⏱</span> Schedule Follow-up
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openLeadModal()">
            <span>✦</span> New Lead
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openOppModal()">
            <span>💼</span> New Opportunity
          </button>
          <button class="crm-btn crm-btn-secondary" (click)="openTaskModal()">
            <span>✓</span> New Task
          </button>
        </section>

        <!-- Main Layout: 2 Columns (Schedule on Left, Priority Panels on Right) -->
        <div class="workspace-grid">
          <!-- Left: Today's Schedule -->
          <div class="main-column">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <h2>Today's Schedule & Planned Encounters</h2>
                  <p class="panel-sub">Chronological list of visits, calls, and meetings scheduled for today</p>
                </div>
                <span class="counter-badge">{{ data()?.schedule?.length ?? 0 }} items</span>
              </div>

              @if ((data()?.schedule?.length ?? 0) === 0) {
                <div class="empty-state">
                  <div class="empty-icon">📅</div>
                  <h3>No visits scheduled for today</h3>
                  <p>Plan your day by scheduling a hospital or clinic visit, or log impromptu HCP interactions.</p>
                  <button class="crm-btn crm-btn-primary" (click)="openLogModal('visit')">Log Visit Now</button>
                </div>
              } @else {
                <div class="schedule-list">
                  @for (item of data()?.schedule; track item.id) {
                    <div class="schedule-item" [class.completed]="item.status === 'completed'">
                      <div class="item-time">
                        <span class="time-str">{{ formatTime(item.occurred_at) }}</span>
                        <span class="badge" [ngClass]="getBadgeClass(item.activity_type)">{{ item.activity_type | uppercase }}</span>
                      </div>
                      <div class="item-body">
                        <div class="item-title-row">
                          <a [routerLink]="['/sales/accounts', item.account_id]" class="account-link">
                            {{ item.account_name || 'Account' }}
                          </a>
                          @if (item.contact_name) {
                            <span class="contact-tag">👤 {{ item.contact_name }}</span>
                          }
                          <span class="status-pill" [class]="item.status">{{ item.status }}</span>
                        </div>
                        @if (item.purpose) {
                          <div class="item-purpose"><strong>Purpose:</strong> {{ item.purpose }}</div>
                        }
                        @if (item.location) {
                          <div class="item-loc">📍 {{ item.location }}</div>
                        }
                        @if (item.outcome) {
                          <div class="item-outcome">
                            <strong>Outcome:</strong> <span class="badge badge-completed">{{ item.outcome }}</span>
                            @if (item.next_action) {
                              <span class="next-action-note">· Next: {{ item.next_action }}</span>
                            }
                          </div>
                        }
                      </div>
                      <div class="item-actions">
                        @if (item.status === 'planned' || item.status === 'in_progress') {
                          @if (item.status === 'planned') {
                            <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="startActivity(item)">
                              Start
                            </button>
                          }
                          <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openCompleteModal(item)">
                            Complete
                          </button>
                          <button class="crm-btn crm-btn-sm crm-btn-ghost" (click)="openRescheduleModal(item)">
                            Reschedule
                          </button>
                        } @else {
                          <span class="completed-check">✓ Done</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Follow-ups and Tasks Due Section -->
            <div class="panel" style="margin-top: 24px;">
              <div class="panel-header">
                <div>
                  <h2>⏱ Follow-ups & Priority Tasks Due Today</h2>
                  <p class="panel-sub">Scheduled follow-up commitments, medication inquiries, and action items</p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span class="counter-badge">{{ data()?.tasks_due?.length ?? 0 }} items</span>
                  <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="openScheduleFollowUpModal()">+ Schedule Follow-up</button>
                </div>
              </div>

              @if ((data()?.tasks_due?.length ?? 0) === 0) {
                <div class="empty-state" style="padding: 24px;">
                  <p class="text-slate" style="margin: 0;">No pending follow-ups or tasks due today.</p>
                </div>
              } @else {
                <div class="schedule-list">
                  @for (t of data()?.tasks_due; track t.id) {
                    <div class="schedule-item" [class.completed]="t.status === 'completed'">
                      <div class="item-time">
                        <span class="time-str">{{ t.due_at ? formatTime(t.due_at) : 'Today' }}</span>
                        <span class="badge" [ngClass]="t.kind === 'follow_up' ? 'badge-follow_up' : 'badge-subtle'">
                          {{ t.kind === 'follow_up' ? 'FOLLOW-UP' : 'TASK' }}
                        </span>
                      </div>
                      <div class="item-body">
                        <div class="item-title-row">
                          <strong>{{ t.title }}</strong>
                          @if (t.account_id) {
                            <a [routerLink]="['/sales/accounts', t.account_id]" class="account-link">
                              🏢 {{ t.account_name || 'Account' }}
                            </a>
                          }
                          <span class="status-pill" [class]="t.priority">{{ t.priority }}</span>
                        </div>
                        @if (t.description) {
                          <div class="item-purpose">{{ t.description }}</div>
                        }
                      </div>
                      <div class="item-actions">
                        @if (t.status !== 'completed') {
                          <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="completeTask(t)" title="Mark Complete">
                            ✓ Complete
                          </button>
                        } @else {
                          <span class="completed-check">✓ Done</span>
                        }
                        <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="openEmailModalForTask(t)" title="Send Follow-up Email">
                          ✉ Email
                        </button>
                        <button class="crm-btn crm-btn-sm crm-btn-ghost" style="color: #ef4444;" (click)="deleteTask(t)" title="Delete Task">
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Overdue Activities Section -->
            @if ((data()?.overdue_activities?.length ?? 0) > 0) {
              <div class="panel warning-panel" style="margin-top: 24px;">
                <div class="panel-header">
                  <div>
                    <h2 class="text-rose">⚠ Overdue Activities ({{ data()?.overdue_activities?.length }})</h2>
                    <p class="panel-sub">Scheduled in the past but not yet marked complete or rescheduled</p>
                  </div>
                </div>
                <div class="schedule-list">
                  @for (item of data()?.overdue_activities; track item.id) {
                    <div class="schedule-item overdue-item">
                      <div class="item-time">
                        <span class="time-str text-rose">{{ item.occurred_at | slice:0:10 }}</span>
                        <span class="badge badge-overdue">OVERDUE</span>
                      </div>
                      <div class="item-body">
                        <div class="item-title-row">
                          <a [routerLink]="['/sales/accounts', item.account_id]" class="account-link">
                            {{ item.account_name || 'Account' }}
                          </a>
                          <span class="badge badge-subtle">{{ item.activity_type | uppercase }}</span>
                        </div>
                        <div class="item-purpose">{{ item.purpose || 'No purpose recorded' }}</div>
                      </div>
                      <div class="item-actions">
                        <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openCompleteModal(item)">Complete</button>
                        <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="openRescheduleModal(item)">Reschedule</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Right: Attention Accounts & Deals Closing Soon -->
          <div class="side-column">
            <!-- Accounts Needing Attention -->
            <div class="panel">
              <div class="panel-header">
                <h3>Accounts Needing Attention</h3>
                <span class="counter-badge">{{ data()?.accounts_attention?.length ?? 0 }}</span>
              </div>
              <div class="panel-sub" style="margin-bottom: 12px; font-size: 11px;">
                Rule-based alerts: uncontacted >30 days, overdue tasks, or stalled pipeline deals.
              </div>

              @if ((data()?.accounts_attention?.length ?? 0) === 0) {
                <div class="empty-state-mini">All assigned accounts have active touchpoints.</div>
              } @else {
                <div class="attention-list">
                  @for (acc of data()?.accounts_attention; track acc.id) {
                    <div class="attention-card">
                      <div class="card-top">
                        <a [routerLink]="['/sales/accounts', acc.id]" class="account-name-link">
                          {{ acc.name }}
                        </a>
                        <span class="badge badge-warning">{{ acc.account_type }}</span>
                      </div>
                      <div class="card-meta">
                        <span>Last touch: {{ acc.last_contact_at ? (acc.last_contact_at | slice:0:10) : 'Never' }}</span>
                      </div>
                      @if (acc.reasons.length) {
                        <div class="health-tag">
                          ⚠ {{ acc.reasons[0] }}
                        </div>
                      }
                      <div class="card-actions">
                        <button class="action-link" (click)="quickLogForAccount(acc.id, acc.name)">+ Log Touchpoint</button>
                        <a [routerLink]="['/sales/accounts', acc.id]" class="action-link">Open 360° →</a>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Opportunities Closing Soon -->
            <div class="panel" style="margin-top: 20px;">
              <div class="panel-header">
                <h3>Deals Closing Soon</h3>
                <span class="counter-badge">{{ data()?.close_soon?.length ?? 0 }}</span>
              </div>
              @if ((data()?.close_soon?.length ?? 0) === 0) {
                <div class="empty-state-mini">No opportunities closing within the next 14 days.</div>
              } @else {
                <div class="deals-list">
                  @for (opp of data()?.close_soon; track opp.id) {
                    <div class="deal-item">
                      <div class="deal-header">
                        <strong>{{ opp.name }}</strong>
                        <span class="deal-val">{{ formatCurrency(opp.estimated_value) }}</span>
                      </div>
                      <div class="deal-meta">
                        <span>Stage: <b>{{ opp.stage }}</b></span>
                        <span>· Close: {{ opp.expected_close_date }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Draft Orders -->
            @if ((data()?.draft_orders?.length ?? 0) > 0) {
              <div class="panel" style="margin-top: 20px;">
                <div class="panel-header">
                  <h3>Pending / Draft Orders</h3>
                  <span class="counter-badge">{{ data()?.draft_orders?.length }}</span>
                </div>
                <div class="deals-list">
                  @for (ord of data()?.draft_orders; track ord.id) {
                    <div class="deal-item">
                      <div class="deal-header">
                        <strong>Order #{{ ord.order_number }}</strong>
                        <span class="deal-val">{{ ord.status }}</span>
                      </div>
                      <div class="deal-meta">
                        <span>Account: {{ ord.account_name || ord.account_id }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- MODAL: Complete Activity -->
      @if (showCompleteModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Complete Encounter: {{ activeActivity()?.activity_type | uppercase }}</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Account: <b>{{ activeActivity()?.account_name || 'Account' }}</b>
                @if (activeActivity()?.contact_name) {
                  · Contact: <b>{{ activeActivity()?.contact_name }}</b>
                }
              </p>

              <div class="form-group">
                <label>Encounter Outcome <span class="required">*</span></label>
                <select [(ngModel)]="completionForm.outcome" class="crm-select">
                  <option value="POSITIVE">Positive / Advancing</option>
                  <option value="NEUTRAL">Neutral / Information Shared</option>
                  <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                  <option value="SAMPLE_REQUESTED">Sample / Brochure Requested</option>
                  <option value="FORMULARY_SUBMITTED">Formulary Request Submitted</option>
                  <option value="OBJECTION_ENCOUNTERED">Objection Encountered</option>
                  <option value="UNSUCCESSFUL">Unsuccessful / HCP Unavailable</option>
                </select>
              </div>

              <div class="form-group">
                <label>Products Discussed (comma-separated or keywords)</label>
                <input type="text" [(ngModel)]="completionForm.products_discussed" class="crm-input" placeholder="e.g. Cardiovax 20mg, NeuroCalm ER" />
              </div>

              <div class="form-group">
                <label>Key Objections / Concerns</label>
                <textarea rows="2" [(ngModel)]="completionForm.objections" class="crm-input" placeholder="Pricing concerns, existing hospital formulary contract..."></textarea>
              </div>

              <div class="form-group">
                <label>Commitments Made</label>
                <textarea rows="2" [(ngModel)]="completionForm.commitments" class="crm-input" placeholder="Promised efficacy study reprint by Thursday, sample delivery..."></textarea>
              </div>

              <div class="form-group">
                <label>Next Action Plan</label>
                <input type="text" [(ngModel)]="completionForm.next_action" class="crm-input" placeholder="e.g. Return next week with medical liaison..." />
              </div>

              <!-- Automated Follow-up Task Creation -->
              <div class="follow-up-box">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="completionForm.create_follow_up" />
                  <strong>Automatically create scheduled follow-up CRM task</strong>
                </label>
                @if (completionForm.create_follow_up) {
                  <div class="follow-up-fields">
                    <div class="form-row">
                      <div class="form-group">
                        <label>Task Title</label>
                        <input type="text" [(ngModel)]="completionForm.follow_up_title" class="crm-input" placeholder="Follow-up task title..." />
                      </div>
                      <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" [(ngModel)]="completionForm.follow_up_due" class="crm-input" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCompleteActivity()" [disabled]="submitting() || !completionForm.outcome">
                @if (submitting()) { Saving... } @else { Save & Complete Encounter }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Log Activity (Visit, Call, Meeting) -->
      @if (showLogModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Schedule or Log {{ logForm.activity_type | uppercase }}</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Target Account <span class="required">*</span></label>
                <select [(ngModel)]="logForm.account_id" (ngModelChange)="onAccountChanged($event)" class="crm-select">
                  <option value="">-- Select Target Account --</option>
                  @for (acc of accountsList(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} ({{ acc.account_type }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Target HCP / Contact (Optional)</label>
                <select [(ngModel)]="logForm.contact_id" class="crm-select">
                  <option value="">-- General / No Specific Contact --</option>
                  @for (con of contactList(); track con.id) {
                    <option [value]="con.id">{{ con.full_name }} ({{ con.title || 'Staff' }})</option>
                  }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Scheduled Date & Time <span class="required">*</span></label>
                  <input type="datetime-local" [(ngModel)]="logForm.scheduled_at" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="logForm.priority" class="crm-select">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Purpose / Objective <span class="required">*</span></label>
                <input type="text" [(ngModel)]="logForm.purpose" class="crm-input" placeholder="e.g. Present Cardiovax Phase III clinical results..." />
              </div>

              <div class="form-group">
                <label>Location / Clinic / Department</label>
                <input type="text" [(ngModel)]="logForm.location" class="crm-input" placeholder="e.g. Cardiology OPD, Room 402" />
              </div>
            </div>

            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitLogActivity()" [disabled]="submitting() || !logForm.account_id || !logForm.purpose">
                @if (submitting()) { Scheduling... } @else { Save Encounter }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Reschedule Activity -->
      @if (showRescheduleModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-sm">
            <div class="modal-header">
              <h2>Reschedule Encounter</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Rescheduling {{ activeActivity()?.activity_type }} with <b>{{ activeActivity()?.account_name }}</b>
              </p>
              <div class="form-group">
                <label>New Date & Time <span class="required">*</span></label>
                <input type="datetime-local" [(ngModel)]="rescheduleTime" class="crm-input" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitReschedule()" [disabled]="submitting() || !rescheduleTime">
                @if (submitting()) { Rescheduling... } @else { Confirm New Time }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: New Lead -->
      @if (showLeadModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Create New Healthcare Lead</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Lead / Contact Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="leadForm.name" class="crm-input" placeholder="Dr. Sarah Jenkins" />
                </div>
                <div class="form-group">
                  <label>Facility / Organization <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="leadForm.organization" class="crm-input" placeholder="Metropolitan General Hospital" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" [(ngModel)]="leadForm.email" class="crm-input" placeholder="sjenkins@metrohealth.org" />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" [(ngModel)]="leadForm.phone" class="crm-input" placeholder="+1 (555) 234-5678" />
                </div>
              </div>
              <div class="form-group">
                <label>Lead Source</label>
                <select [(ngModel)]="leadForm.source" class="crm-select">
                  <option value="CONFERENCE">Medical Conference</option>
                  <option value="REFERRAL">Physician Referral</option>
                  <option value="COLD_OUTREACH">Cold Outreach</option>
                  <option value="INBOUND">Inbound Inquiry</option>
                  <option value="DIGITAL_CAMPAIGN">Digital Campaign</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateLead()" [disabled]="submitting() || !leadForm.name || !leadForm.organization">
                @if (submitting()) { Creating... } @else { Create Lead }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: New Task -->
      @if (showTaskModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Create New CRM Task</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Task Title <span class="required">*</span></label>
                <input type="text" [(ngModel)]="taskForm.title" class="crm-input" placeholder="Send efficacy dossier to Dr. Adams" />
              </div>
              <div class="form-group">
                <label>Associated Account</label>
                <select [(ngModel)]="taskForm.account_id" class="crm-select">
                  <option value="">-- No Account --</option>
                  @for (acc of accountsList(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Due Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="taskForm.due_at" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="taskForm.priority" class="crm-select">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Details / Instructions</label>
                <textarea rows="3" [(ngModel)]="taskForm.description" class="crm-input" placeholder="Notes or instructions..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateTask()" [disabled]="submitting() || !taskForm.title || !taskForm.due_at">
                @if (submitting()) { Creating... } @else { Create Task }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Send Email / Invitation -->
      @if (showEmailModal()) {
        <div class="modal-overlay">
          <div class="modal-card" style="max-width: 640px;">
            <div class="modal-header">
              <h2>✉ Send Email & Detailing Invitation</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Template Type</label>
                  <select [(ngModel)]="emailForm.template_type" (ngModelChange)="onTemplateChanged()" class="crm-select">
                    <option value="meeting_invitation">📅 Meeting Invitation</option>
                    <option value="call_summary">📞 Call Detailing Summary</option>
                    <option value="follow_up_reminder">⏱ Follow-up Reminder</option>
                    <option value="clinical_information">📋 Clinical & Formulary Information</option>
                    <option value="custom">✏ Custom Message</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Target Account <span class="required">*</span></label>
                  <select [(ngModel)]="emailForm.account_id" (ngModelChange)="onEmailAccountChanged($event)" class="crm-select">
                    <option value="">-- Select Target Account --</option>
                    @for (acc of accountsList(); track acc.id) {
                      <option [value]="acc.id">{{ acc.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Target Contact / HCP</label>
                  <select [(ngModel)]="emailForm.contact_id" (ngModelChange)="onEmailContactChanged($event)" class="crm-select">
                    <option value="">-- General / Manual Email --</option>
                    @for (c of contactList(); track c.id) {
                      <option [value]="c.id">{{ c.full_name }} ({{ c.title || 'HCP' }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Recipient Email Address <span class="required">*</span></label>
                  <input type="email" [(ngModel)]="emailForm.recipient_email" class="crm-input" placeholder="dr.smith@hospital.org" />
                </div>
              </div>

              <div class="form-group">
                <label>Email Subject <span class="required">*</span></label>
                <input type="text" [(ngModel)]="emailForm.subject" class="crm-input" placeholder="Subject..." />
              </div>

              <div class="form-group">
                <label>Email Body <span class="required">*</span></label>
                <textarea rows="5" [(ngModel)]="emailForm.body" class="crm-input" placeholder="Compose message..."></textarea>
              </div>

              <div class="follow-up-box">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="emailForm.schedule_follow_up" />
                  <strong>Automatically schedule follow-up task & reminder</strong>
                </label>
                @if (emailForm.schedule_follow_up) {
                  <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                      <label>Follow-up Reminder Date & Time</label>
                      <input type="datetime-local" [(ngModel)]="emailForm.follow_up_date" class="crm-input" />
                    </div>
                    <div class="form-group">
                      <label>Reminder Notes</label>
                      <input type="text" [(ngModel)]="emailForm.follow_up_notes" class="crm-input" placeholder="e.g. Check response on formulary dossier" />
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button
                class="crm-btn crm-btn-primary"
                (click)="submitSendEmail()"
                [disabled]="submitting() || !emailForm.recipient_email || !emailForm.subject || !emailForm.body"
              >
                Send Email & Log
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Schedule Follow-up -->
      @if (showFollowUpModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>⏱ Schedule Follow-up & Reminder</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Follow-up Action / Title <span class="required">*</span></label>
                <input type="text" [(ngModel)]="followUpForm.title" class="crm-input" placeholder="Deliver clinical samples to pharmacy..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Due Date & Time <span class="required">*</span></label>
                  <input type="datetime-local" [(ngModel)]="followUpForm.due_at" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="followUpForm.priority" class="crm-select">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Target Account (Optional)</label>
                <select [(ngModel)]="followUpForm.account_id" class="crm-select">
                  <option value="">-- None / General Task --</option>
                  @for (acc of accountsList(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Reminder Notes & Instructions</label>
                <textarea rows="3" [(ngModel)]="followUpForm.description" class="crm-input" placeholder="Notes, questions to ask, materials needed..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button
                class="crm-btn crm-btn-primary"
                (click)="submitScheduleFollowUp()"
                [disabled]="submitting() || !followUpForm.title || !followUpForm.due_at"
              >
                Save Follow-up
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .my-day-container { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; max-width: 760px; }
    .performance-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .strip-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .strip-card.highlight { border-color: #bae6fd; background: #f0f9ff; }
    .strip-card.danger { border-color: #fecdd3; background: #fff1f2; }
    .strip-card.warning { border-color: #fde68a; background: #fffbeb; }
    .strip-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
    .strip-value { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 6px; }
    .strip-sub { font-size: 11px; color: #94a3b8; }
    .target-bar-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .target-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .target-dates { margin-left: 14px; font-size: 12px; color: #475569; }
    .target-pct { font-size: 18px; font-weight: 700; color: #0284c7; }
    .progress-track { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #0284c7, #06b6d4); border-radius: 999px; transition: width 0.4s ease; }
    .target-note { font-size: 11px; color: #94a3b8; }
    .quick-action-bar { display: flex; align-items: center; gap: 10px; padding: 12px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px; overflow-x: auto; }
    .action-bar-label { font-size: 12px; font-weight: 600; color: #475569; margin-right: 6px; white-space: nowrap; }
    .workspace-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
    .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .warning-panel { border-color: #fecdd3; }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .panel-header h2, .panel-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .panel-sub { font-size: 12px; color: #64748b; margin: 0; }
    .counter-badge { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 999px; }
    .schedule-list { display: flex; flex-direction: column; gap: 12px; }
    .schedule-item { display: flex; align-items: flex-start; gap: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; transition: background 0.15s; }
    .schedule-item.completed { background: #fafaf9; opacity: 0.85; border-color: #d1d5db; }
    .schedule-item.overdue-item { background: #fff5f5; border-color: #fed7d7; }
    .item-time { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 75px; }
    .time-str { font-size: 12px; font-weight: 700; color: #1e293b; }
    .item-body { flex: 1; min-width: 0; }
    .item-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .account-link { font-size: 14px; font-weight: 700; color: #0284c7; text-decoration: none; }
    .account-link:hover { text-decoration: underline; }
    .contact-tag { font-size: 12px; color: #475569; background: #e2e8f0; padding: 2px 7px; border-radius: 4px; }
    .status-pill { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .status-pill.planned { background: #e0f2fe; color: #0369a1; }
    .status-pill.in_progress { background: #fef3c7; color: #b45309; }
    .status-pill.completed { background: #dcfce7; color: #15803d; }
    .status-pill.cancelled { background: #fee2e2; color: #b91c1c; }
    .item-purpose { font-size: 13px; color: #334155; margin-bottom: 4px; }
    .item-loc { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .item-outcome { font-size: 12px; color: #15803d; margin-top: 6px; }
    .next-action-note { font-size: 11px; color: #475569; margin-left: 6px; }
    .item-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .completed-check { font-size: 12px; font-weight: 600; color: #16a34a; }
    .attention-list, .deals-list { display: flex; flex-direction: column; gap: 10px; }
    .attention-card { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .account-name-link { font-size: 13px; font-weight: 700; color: #0f172a; text-decoration: none; }
    .account-name-link:hover { color: #0284c7; }
    .card-meta { font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .health-tag { font-size: 11px; color: #b45309; background: #fef3c7; padding: 3px 6px; border-radius: 4px; margin-bottom: 8px; }
    .card-actions { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
    .action-link { background: none; border: 0; color: #0284c7; cursor: pointer; font-weight: 600; padding: 0; text-decoration: none; }
    .action-link:hover { text-decoration: underline; }
    .deal-item { padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .deal-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
    .deal-val { font-weight: 700; color: #0f172a; }
    .deal-meta { font-size: 11px; color: #64748b; }
    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 36px; margin-bottom: 8px; }
    .empty-state h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
    .empty-state p { font-size: 12px; color: #64748b; margin: 0 0 16px; }
    .empty-state-mini { font-size: 12px; color: #94a3b8; text-align: center; padding: 16px 0; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; font-size: 13px; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-visit { background: #e0f2fe; color: #0284c7; }
    .badge-call { background: #ede9fe; color: #7c3aed; }
    .badge-meeting { background: #fef3c7; color: #d97706; }
    .badge-overdue { background: #fee2e2; color: #dc2626; }
    .badge-subtle { background: #f1f5f9; color: #475569; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-completed { background: #dcfce7; color: #16a34a; }
    .text-emerald { color: #059669; }
    .text-amber { color: #d97706; }
    .text-rose { color: #e11d48; }
    .text-blue { color: #0284c7; }

    /* Modals */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 12px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-card-sm { max-width: 420px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }
    .close-btn { background: none; border: 0; font-size: 18px; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .modal-sub { font-size: 13px; color: #64748b; margin: 0 0 4px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 12px 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .required { color: #e11d48; }
    .crm-input, .crm-select { height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #1e293b; background: #ffffff; outline: none; }
    textarea.crm-input { height: auto; padding: 8px 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .follow-up-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 14px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #166534; cursor: pointer; }
    .follow-up-fields { margin-top: 10px; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .crm-btn-sm { height: 28px; padding: 0 10px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .crm-btn-ghost { background: transparent; color: #64748b; }
    .crm-btn-ghost:hover:not(:disabled) { background: #f1f5f9; color: #1e293b; }
    .crm-alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
    .crm-alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    @media (max-width: 1024px) { .workspace-grid { grid-template-columns: 1fr; } }
  `],
})
export class MyDayComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  currentUser = this.authService.user;
  data = signal<MyDayData | null>(null);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  accountsList = signal<AccountCardItem[]>([]);
  contactList = signal<ContactItem[]>([]);

  showCompleteModal = signal<boolean>(false);
  showLogModal = signal<boolean>(false);
  showRescheduleModal = signal<boolean>(false);
  showLeadModal = signal<boolean>(false);
  showOppModal = signal<boolean>(false);
  showTaskModal = signal<boolean>(false);
  showEmailModal = signal<boolean>(false);
  showFollowUpModal = signal<boolean>(false);
  submitting = signal<boolean>(false);

  activeActivity = signal<ActivityItem | null>(null);
  rescheduleTime = '';

  completionForm = {
    outcome: 'POSITIVE',
    products_discussed: '',
    objections: '',
    commitments: '',
    next_action: '',
    create_follow_up: false,
    follow_up_title: '',
    follow_up_due: '',
  };

  logForm = {
    account_id: '',
    contact_id: '',
    activity_type: 'visit' as 'visit' | 'call' | 'meeting',
    scheduled_at: '',
    purpose: '',
    location: '',
    priority: 'normal',
  };

  leadForm = {
    name: '',
    organization: '',
    email: '',
    phone: '',
    source: 'CONFERENCE',
  };

  taskForm = {
    title: '',
    account_id: '',
    due_at: '',
    priority: 'normal',
    description: '',
  };

  emailForm = {
    recipient_email: '',
    recipient_name: '',
    subject: '',
    body: '',
    template_type: 'meeting_invitation' as any,
    account_id: '',
    contact_id: '',
    schedule_follow_up: true,
    follow_up_date: '',
    follow_up_notes: '',
  };

  followUpForm = {
    title: '',
    due_at: '',
    priority: 'normal',
    account_id: '',
    description: '',
  };

  ngOnInit(): void {
    this.loadData();
    this.loadAccounts();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salesService.getMyDay().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.detail || 'Unable to connect to sales server. Verify that the backend is running.'
        );
      },
    });
  }

  loadAccounts(): void {
    this.salesService.getAccounts().subscribe({
      next: (res) => this.accountsList.set(res.items || []),
      error: () => {},
    });
  }

  onAccountChanged(accountId: string): void {
    if (!accountId) {
      this.contactList.set([]);
      return;
    }
    this.salesService.getAccountContacts(accountId).subscribe({
      next: (res) => this.contactList.set(res),
      error: () => this.contactList.set([]),
    });
  }

  startActivity(item: ActivityItem): void {
    this.salesService.patchActivity(item.id, { action: 'start' }).subscribe({
      next: () => {
        item.status = 'in_progress';
      },
    });
  }

  openCompleteModal(item: ActivityItem): void {
    this.activeActivity.set(item);
    this.completionForm = {
      outcome: item.outcome || 'POSITIVE',
      products_discussed: item.products_discussed || '',
      objections: item.objections || '',
      commitments: item.commitments || '',
      next_action: item.next_action || '',
      create_follow_up: false,
      follow_up_title: `Follow up with ${item.account_name || 'Account'}`,
      follow_up_due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    };
    this.showCompleteModal.set(true);
  }

  submitCompleteActivity(): void {
    const item = this.activeActivity();
    if (!item) return;
    this.submitting.set(true);

    const followUp = this.completionForm.create_follow_up && this.completionForm.follow_up_title
      ? {
          title: this.completionForm.follow_up_title,
          due_at: new Date(this.completionForm.follow_up_due).toISOString(),
          priority: 'normal',
        }
      : null;

    this.salesService
      .patchActivity(item.id, {
        action: 'complete',
        outcome: this.completionForm.outcome,
        products_discussed: this.completionForm.products_discussed,
        objections: this.completionForm.objections,
        commitments: this.completionForm.commitments,
        next_action: this.completionForm.next_action,
        follow_up: followUp,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showCompleteModal.set(false);
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to complete encounter');
        },
      });
  }

  openRescheduleModal(item: ActivityItem): void {
    this.activeActivity.set(item);
    this.rescheduleTime = item.occurred_at ? item.occurred_at.slice(0, 16) : '';
    this.showRescheduleModal.set(true);
  }

  submitReschedule(): void {
    const item = this.activeActivity();
    if (!item || !this.rescheduleTime) return;
    this.submitting.set(true);
    this.salesService
      .patchActivity(item.id, {
        action: 'reschedule',
        occurred_at: new Date(this.rescheduleTime).toISOString(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showRescheduleModal.set(false);
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to reschedule encounter');
        },
      });
  }

  openLogModal(type: 'visit' | 'call' | 'meeting'): void {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.logForm = {
      account_id: this.accountsList()[0]?.id || '',
      contact_id: '',
      activity_type: type,
      scheduled_at: localIso,
      purpose: '',
      location: type === 'visit' ? 'Hospital Office' : '',
      priority: 'normal',
    };
    if (this.logForm.account_id) {
      this.onAccountChanged(this.logForm.account_id);
    }
    this.showLogModal.set(true);
  }

  quickLogForAccount(accountId: string, accountName: string): void {
    this.openLogModal('visit');
    this.logForm.account_id = accountId;
    this.onAccountChanged(accountId);
  }

  submitLogActivity(): void {
    if (!this.logForm.account_id || !this.logForm.purpose) return;
    this.submitting.set(true);
    this.salesService
      .createActivity({
        account_id: this.logForm.account_id,
        contact_id: this.logForm.contact_id || null,
        activity_type: this.logForm.activity_type,
        status: 'planned',
        occurred_at: new Date(this.logForm.scheduled_at).toISOString(),
        purpose: this.logForm.purpose,
        location: this.logForm.location || null,
        priority: this.logForm.priority,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showLogModal.set(false);
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create activity');
        },
      });
  }

  openLeadModal(): void {
    this.leadForm = {
      name: '',
      organization: '',
      email: '',
      phone: '',
      source: 'CONFERENCE',
    };
    this.showLeadModal.set(true);
  }

  submitCreateLead(): void {
    if (!this.leadForm.name || !this.leadForm.organization) return;
    this.submitting.set(true);
    this.salesService.createLead(this.leadForm).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLeadModal.set(false);
        this.loadData();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to create lead');
      },
    });
  }

  openOppModal(): void {
    window.location.hash = '#/pipeline';
  }

  openTaskModal(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.taskForm = {
      title: '',
      account_id: this.accountsList()[0]?.id || '',
      due_at: today,
      priority: 'normal',
      description: '',
    };
    this.showTaskModal.set(true);
  }

  submitCreateTask(): void {
    if (!this.taskForm.title || !this.taskForm.due_at) return;
    this.submitting.set(true);
    this.salesService
      .createTask({
        title: this.taskForm.title,
        account_id: this.taskForm.account_id || null,
        due_at: new Date(this.taskForm.due_at).toISOString(),
        priority: this.taskForm.priority,
        description: this.taskForm.description || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showTaskModal.set(false);
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create task');
        },
      });
  }

  completeTask(task: any): void {
    this.salesService.patchTask(task.id, { status: 'completed' }).subscribe({
      next: () => this.loadData(),
      error: (err: any) => alert(err?.error?.detail || 'Failed to complete task'),
    });
  }

  deleteTask(task: any): void {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    this.salesService.deleteTask(task.id).subscribe({
      next: () => this.loadData(),
      error: (err: any) => alert(err?.error?.detail || 'Failed to delete task'),
    });
  }

  openScheduleFollowUpModal(): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 16);
    this.followUpForm = {
      title: '',
      due_at: reminderIso,
      priority: 'normal',
      account_id: this.accountsList()[0]?.id || '',
      description: '',
    };
    this.showFollowUpModal.set(true);
  }

  submitScheduleFollowUp(): void {
    if (!this.followUpForm.title || !this.followUpForm.due_at) return;
    this.submitting.set(true);
    this.salesService
      .createTask({
        title: this.followUpForm.title,
        kind: 'follow_up',
        priority: this.followUpForm.priority,
        account_id: this.followUpForm.account_id || null,
        due_at: new Date(this.followUpForm.due_at).toISOString(),
        description: this.followUpForm.description || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showFollowUpModal.set(false);
          alert('Follow-up scheduled successfully with reminder!');
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to schedule follow-up');
        },
      });
  }

  openEmailModal(): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 16);
    this.emailForm = {
      recipient_email: '',
      recipient_name: '',
      subject: '',
      body: '',
      template_type: 'meeting_invitation',
      account_id: this.accountsList()[0]?.id || '',
      contact_id: '',
      schedule_follow_up: true,
      follow_up_date: reminderIso,
      follow_up_notes: 'Check response to email and confirm next steps',
    };
    if (this.emailForm.account_id) {
      this.onEmailAccountChanged(this.emailForm.account_id);
    }
    this.onTemplateChanged();
    this.showEmailModal.set(true);
  }

  openEmailModalForTask(task: any): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 16);
    this.emailForm = {
      recipient_email: '',
      recipient_name: '',
      subject: `Follow-up: ${task.title}`,
      body: `Dear Clinical Team,\n\nFollowing up regarding ${task.account_name || 'our discussion'}:\n\n${task.description || task.title}\n\nPlease let us know if you require any further documentation or samples.\n\nWarm regards,\nAccord Pharma Commercial Team`,
      template_type: 'follow_up_reminder',
      account_id: task.account_id || '',
      contact_id: '',
      schedule_follow_up: true,
      follow_up_date: reminderIso,
      follow_up_notes: `Follow up on email sent for: ${task.title}`,
    };
    if (task.account_id) {
      this.onEmailAccountChanged(task.account_id);
    }
    this.showEmailModal.set(true);
  }

  onEmailAccountChanged(accId: string): void {
    this.emailForm.account_id = accId;
    if (!accId) {
      this.contactList.set([]);
      return;
    }
    this.salesService.getAccountContacts(accId).subscribe((c) => {
      this.contactList.set(c);
      if (c && c.length > 0 && !this.emailForm.recipient_email) {
        this.onEmailContactChanged(c[0].id);
      }
    });
  }

  onEmailContactChanged(contactId: string): void {
    this.emailForm.contact_id = contactId;
    const contact = this.contactList().find((c) => c.id === contactId);
    if (contact) {
      this.emailForm.recipient_name = contact.full_name;
      if (contact.email) {
        this.emailForm.recipient_email = contact.email;
      }
    }
  }

  onTemplateChanged(): void {
    const acc = this.accountsList().find((a) => a.id === this.emailForm.account_id);
    const accName = acc?.name || 'your institution';

    switch (this.emailForm.template_type) {
      case 'meeting_invitation':
        this.emailForm.subject = `Invitation: Clinical Portfolio & Formulary Review - Accord Pharma at ${accName}`;
        this.emailForm.body = `Dear Clinical Team,\n\nWe would appreciate the opportunity to schedule a brief 20-minute therapeutic review with your department to discuss recent clinical updates and formulary availability.\n\nPlease let us know what date and time would be most convenient for you.\n\nWarm regards,\nAccord Healthcare Medical Affairs`;
        break;
      case 'call_summary':
        this.emailForm.subject = `Summary & Discussion Points: Follow-up with Accord Pharma`;
        this.emailForm.body = `Dear Doctor,\n\nThank you for your valuable time during our detailing call today regarding ${accName}. As discussed, we are providing the clinical dossier and safety profile summary for your review.\n\nPlease reach out if you have any questions.\n\nBest regards,\nAccord Pharma Commercial Team`;
        break;
      case 'follow_up_reminder':
        this.emailForm.subject = `Action Reminder: Formulary Evaluation & Clinical Supply - Accord Pharma`;
        this.emailForm.body = `Dear Team,\n\nThis is a friendly follow-up regarding our discussion last week regarding medication availability and contract terms for ${accName}.\n\nLooking forward to your update.\n\nSincerely,\nAccord Pharma Account Management`;
        break;
      case 'clinical_information':
        this.emailForm.subject = `Clinical Literature & Product Dossier - Accord Pharma Portfolio`;
        this.emailForm.body = `Dear Health Care Professional,\n\nIn reference to our clinical consultation at ${accName}, enclosed please find the product monograph, dosing guidance, and bioequivalence data for your reference.\n\nSincerely,\nMedical Detailing Department`;
        break;
      default:
        this.emailForm.subject = `Communication from Accord Pharma`;
        this.emailForm.body = `Hello,\n\nPlease find our notes attached.\n\nBest regards,\nAccord Pharma`;
        break;
    }
  }

  submitSendEmail(): void {
    if (!this.emailForm.recipient_email || !this.emailForm.subject || !this.emailForm.body) return;
    this.submitting.set(true);

    this.salesService
      .sendEmail({
        recipient_email: this.emailForm.recipient_email,
        recipient_name: this.emailForm.recipient_name || undefined,
        subject: this.emailForm.subject,
        body: this.emailForm.body,
        template_type: this.emailForm.template_type,
        account_id: this.emailForm.account_id || undefined,
        contact_id: this.emailForm.contact_id || undefined,
        schedule_follow_up: this.emailForm.schedule_follow_up,
        follow_up_date: this.emailForm.schedule_follow_up && this.emailForm.follow_up_date ? new Date(this.emailForm.follow_up_date).toISOString() : undefined,
        follow_up_notes: this.emailForm.follow_up_notes || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.showEmailModal.set(false);
          alert(`Email sent successfully! Status: ${res.smtp_status}. Logged to activity feed.`);
          this.loadData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to send email');
        },
      });
  }

  closeModals(): void {
    this.showCompleteModal.set(false);
    this.showLogModal.set(false);
    this.showRescheduleModal.set(false);
    this.showLeadModal.set(false);
    this.showOppModal.set(false);
    this.showTaskModal.set(false);
    this.showEmailModal.set(false);
    this.showFollowUpModal.set(false);
  }

  formatTime(isoStr: string | null): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  calcBarWidth(pct: number): number {
    return Math.min(Math.max(pct, 0), 100);
  }

  getBadgeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'visit':
        return 'badge-visit';
      case 'call':
        return 'badge-call';
      case 'meeting':
        return 'badge-meeting';
      default:
        return 'badge-subtle';
    }
  }
}
