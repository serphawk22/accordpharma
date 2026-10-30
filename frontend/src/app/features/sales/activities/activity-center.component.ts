import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import {
  ActivityItem,
  AccountCardItem,
  ContactItem,
  SalesUserDirectoryItem,
  TaskItem,
} from '../../../core/sales.models';

@Component({
  selector: 'app-activity-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="activity-center-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">COMMERCIAL EXECUTION & CLINICAL ENGAGEMENT</div>
          <h1>Sales Activity & Communications Center</h1>
          <p class="subtitle">
            Manage physician visits, detailing calls, formulary meetings, scheduled follow-ups, and email invitations with automated reminders.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="openEmailModal()">✉ Send Email / Invitation</button>
          <button class="crm-btn crm-btn-secondary" (click)="openScheduleFollowUpModal()">⏱ Schedule Follow-up</button>
          <button class="crm-btn crm-btn-secondary" (click)="openLogModal('call')">📞 Log Call</button>
          <button class="crm-btn crm-btn-secondary" (click)="openLogModal('meeting')">📅 Schedule Meeting</button>
          <button class="crm-btn crm-btn-primary" (click)="openLogModal('visit')">+ Log HCP Visit</button>
        </div>
      </header>

      <!-- KPI Summary Cards -->
      <div class="activity-kpis">
        <div class="kpi-card" (click)="setFilterType('ALL')" [class.active-kpi]="filterType === 'ALL'">
          <span class="kpi-num">{{ activities().length }}</span>
          <span class="kpi-lbl">Total Activities</span>
        </div>
        <div class="kpi-card" (click)="setFilterType('visit')" [class.active-kpi]="filterType === 'visit'">
          <span class="kpi-num text-blue">{{ getCountByType('visit') }}</span>
          <span class="kpi-lbl">HCP Visits</span>
        </div>
        <div class="kpi-card" (click)="setFilterType('call')" [class.active-kpi]="filterType === 'call'">
          <span class="kpi-num text-purple">{{ getCountByType('call') }}</span>
          <span class="kpi-lbl">Detailing Calls</span>
        </div>
        <div class="kpi-card" (click)="setFilterType('meeting')" [class.active-kpi]="filterType === 'meeting'">
          <span class="kpi-num text-amber">{{ getCountByType('meeting') }}</span>
          <span class="kpi-lbl">Formulary Meetings</span>
        </div>
        <div class="kpi-card" (click)="setFilterType('follow_up')" [class.active-kpi]="filterType === 'follow_up'">
          <span class="kpi-num text-emerald">{{ getCountByType('follow_up') }}</span>
          <span class="kpi-lbl">Follow-ups & Tasks</span>
        </div>
        <div class="kpi-card" (click)="setFilterType('email')" [class.active-kpi]="filterType === 'email'">
          <span class="kpi-num text-indigo">{{ getCountByType('email') }}</span>
          <span class="kpi-lbl">Emails & Invites</span>
        </div>
      </div>

      <!-- Filter Controls Toolbar -->
      <div class="toolbar">
        <div class="filter-group">
          <!-- Role scope / Rep selector -->
          @if (isManagerOrAdmin()) {
            <select [(ngModel)]="selectedRepId" (ngModelChange)="loadActivities()" class="crm-select-sm">
              <option value="">All Team Representatives</option>
              @for (user of users(); track user.id) {
                <option [value]="user.id">{{ user.full_name }} ({{ user.territory || 'Unassigned' }})</option>
              }
            </select>
          } @else {
            <select [(ngModel)]="filterScope" (ngModelChange)="loadActivities()" class="crm-select-sm">
              <option value="mine">My Activities Only</option>
              <option value="all">Whole Territory</option>
            </select>
          }

          <!-- Type filter -->
          <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()" class="crm-select-sm">
            <option value="ALL">All Activity Types</option>
            <option value="visit">HCP Visits</option>
            <option value="call">Detailing Calls</option>
            <option value="meeting">Meetings</option>
            <option value="email">Email Communications</option>
            <option value="follow_up">Follow-ups & Tasks</option>
          </select>

          <!-- Status filter -->
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="crm-select-sm">
            <option value="ALL">All Statuses</option>
            <option value="planned">Scheduled / Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="view-toggle">
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'list'"
            (click)="viewMode = 'list'"
          >
            ☰ List View
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'agenda'"
            (click)="viewMode = 'agenda'"
          >
            ◷ Agenda / Timeline
          </button>
        </div>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading activity log & scheduled follow-ups...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadActivities()">Retry</button>
        </div>
      } @else {
        <!-- VIEW 1: TABLE LIST -->
        @if (viewMode === 'list') {
          <div class="table-container">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target Account</th>
                  <th>Contact / HCP</th>
                  <th>Scheduled / Done</th>
                  <th>Purpose & Notes</th>
                  <th>Status</th>
                  <th>Outcome / Next Step</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @if (filteredActivities().length === 0) {
                  <tr>
                    <td colspan="8" class="empty-table-row">No activities or communications found matching criteria.</td>
                  </tr>
                } @else {
                  @for (act of filteredActivities(); track act.id) {
                    <tr [class.row-overdue]="act.is_overdue">
                      <td>
                        <span class="badge" [ngClass]="getBadgeClass(act.activity_type)">
                          {{ formatType(act.activity_type) }}
                        </span>
                        @if (act.is_overdue) {
                          <span class="badge badge-urgent" style="margin-left: 4px;">OVERDUE</span>
                        }
                      </td>
                      <td>
                        @if (act.account_id) {
                          <a [routerLink]="['/sales/accounts', act.account_id]" class="acc-link">
                            {{ act.account_name || 'Account' }}
                          </a>
                        } @else {
                          <span class="text-slate">General Account</span>
                        }
                        @if (act.owner_name) {
                          <div class="text-xs text-slate">Rep: {{ act.owner_name }}</div>
                        }
                      </td>
                      <td>
                        @if (act.contact_name) {
                          <div>👤 {{ act.contact_name }}</div>
                        } @else {
                          <span class="text-slate">-</span>
                        }
                      </td>
                      <td>
                        <strong>{{ act.occurred_at | slice:0:10 }}</strong>
                        <div class="text-slate">{{ formatTime(act.occurred_at) }}</div>
                      </td>
                      <td>
                        <div class="purpose-text"><strong>{{ act.purpose || 'No purpose recorded' }}</strong></div>
                        @if (act.notes) {
                          <div class="notes-snippet">{{ act.notes | slice:0:120 }}{{ act.notes.length > 120 ? '...' : '' }}</div>
                        }
                      </td>
                      <td>
                        <span class="status-pill" [class]="act.status">
                          {{ act.status }}
                        </span>
                      </td>
                      <td>
                        @if (act.outcome) {
                          <div class="badge badge-completed">{{ act.outcome }}</div>
                        } @else {
                          <span class="text-slate">Pending</span>
                        }
                        @if (act.next_action) {
                          <div class="text-xs text-emerald" style="margin-top: 4px;">Next: {{ act.next_action }}</div>
                        }
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        @if (act.status !== 'completed' && act.status !== 'cancelled') {
                          <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openCompleteModal(act)" title="Document Outcome">
                            Complete
                          </button>
                          <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 4px;" (click)="openRescheduleModal(act)" title="Reschedule">
                            ⏱
                          </button>
                        }
                        <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 4px;" (click)="openEmailModalForActivity(act)" title="Send Follow-up Email">
                          ✉
                        </button>
                        @if (canDelete(act)) {
                          <button class="crm-btn crm-btn-sm crm-btn-danger" style="margin-left: 4px;" (click)="deleteActivity(act)" title="Delete Activity">
                            ✕
                          </button>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- VIEW 2: AGENDA / TIMELINE -->
          <div class="agenda-timeline">
            @for (act of filteredActivities(); track act.id) {
              <div class="agenda-item">
                <div class="agenda-date">
                  <span class="day">{{ act.occurred_at | slice:8:10 }}</span>
                  <span class="mo">{{ act.occurred_at | slice:5:7 }}</span>
                </div>
                <div class="agenda-card" [class.card-overdue]="act.is_overdue">
                  <div class="card-top">
                    <span class="badge" [ngClass]="getBadgeClass(act.activity_type)">{{ formatType(act.activity_type) }}</span>
                    @if (act.account_id) {
                      <a [routerLink]="['/sales/accounts', act.account_id]" class="acc-link">
                        {{ act.account_name || 'Account' }}
                      </a>
                    }
                    @if (act.contact_name) {
                      <span class="contact-lbl">· 👤 {{ act.contact_name }}</span>
                    }
                    @if (act.is_overdue) {
                      <span class="badge badge-urgent">OVERDUE</span>
                    }
                    <span class="status-pill" [class]="act.status" style="margin-left: auto;">
                      {{ act.status }}
                    </span>
                  </div>
                  <div class="card-purpose">
                    <strong>{{ act.purpose || 'No purpose recorded' }}</strong>
                  </div>
                  @if (act.notes) {
                    <div class="text-slate text-sm" style="margin-top: 4px;">{{ act.notes }}</div>
                  }
                  @if (act.location) {
                    <div class="card-loc">📍 {{ act.location }}</div>
                  }
                  @if (act.outcome) {
                    <div class="card-outcome">
                      <strong>Outcome:</strong> {{ act.outcome }}
                      @if (act.next_action) {
                        <span>· Next: {{ act.next_action }}</span>
                      }
                    </div>
                  }
                  <div class="card-actions">
                    @if (act.status !== 'completed' && act.status !== 'cancelled') {
                      <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openCompleteModal(act)">
                        Document Outcome
                      </button>
                      <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 6px;" (click)="openRescheduleModal(act)">
                        Reschedule
                      </button>
                    }
                    <button class="crm-btn crm-btn-sm crm-btn-secondary" style="margin-left: 6px;" (click)="openEmailModalForActivity(act)">
                      ✉ Send Email
                    </button>
                    @if (canDelete(act)) {
                      <button class="crm-btn crm-btn-sm crm-btn-danger" style="margin-left: 6px;" (click)="deleteActivity(act)">
                        Delete
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- MODAL: Send Email / Invitation -->
      @if (showEmailModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-lg">
            <div class="modal-header">
              <h2>✉ Compose Email & Invitation</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Email Template</label>
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
                    @for (acc of accounts(); track acc.id) {
                      <option [value]="acc.id">{{ acc.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Recipient Contact</label>
                  <select [(ngModel)]="emailForm.contact_id" (ngModelChange)="onEmailContactChanged($event)" class="crm-select">
                    <option value="">-- Manual Recipient / General --</option>
                    @for (c of contacts(); track c.id) {
                      <option [value]="c.id">{{ c.full_name }} ({{ c.title || 'Contact' }})</option>
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
                <label>Email Body Message <span class="required">*</span></label>
                <textarea rows="5" [(ngModel)]="emailForm.body" class="crm-input" placeholder="Write email message..."></textarea>
              </div>

              <!-- Automated Follow-up Reminder Box -->
              <div class="follow-up-box">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="emailForm.schedule_follow_up" />
                  <strong>Automatically schedule follow-up task & reminder for this communication</strong>
                </label>
                @if (emailForm.schedule_follow_up) {
                  <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                      <label>Follow-up Reminder Date & Time</label>
                      <input type="datetime-local" [(ngModel)]="emailForm.follow_up_date" class="crm-input" />
                    </div>
                    <div class="form-group">
                      <label>Reminder Notes / Task</label>
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

      <!-- MODAL: Schedule Follow-up Directly -->
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
                <input type="text" [(ngModel)]="followUpForm.title" class="crm-input" placeholder="e.g. Deliver oncology phase III trial reprints" />
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
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Description & Reminder Details</label>
                <textarea rows="3" [(ngModel)]="followUpForm.description" class="crm-input" placeholder="Specific notes, reminders, or commitments..."></textarea>
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

      <!-- MODAL: Complete Activity -->
      @if (showCompleteModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Document Encounter Outcome</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Account: <b>{{ activeActivity()?.account_name }}</b>
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
                <label>Products Discussed</label>
                <input type="text" [(ngModel)]="completionForm.products_discussed" class="crm-input" placeholder="e.g. Cardiovax 20mg" />
              </div>

              <div class="form-group">
                <label>Objections / Concerns</label>
                <textarea rows="2" [(ngModel)]="completionForm.objections" class="crm-input"></textarea>
              </div>

              <div class="form-group">
                <label>Commitments Made</label>
                <textarea rows="2" [(ngModel)]="completionForm.commitments" class="crm-input"></textarea>
              </div>

              <div class="form-group">
                <label>Next Action</label>
                <input type="text" [(ngModel)]="completionForm.next_action" class="crm-input" />
              </div>

              <div class="follow-up-box">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="completionForm.create_follow_up" />
                  <strong>Create scheduled follow-up CRM task</strong>
                </label>
                @if (completionForm.create_follow_up) {
                  <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                      <label>Task Title</label>
                      <input type="text" [(ngModel)]="completionForm.follow_up_title" class="crm-input" />
                    </div>
                    <div class="form-group">
                      <label>Due Date</label>
                      <input type="date" [(ngModel)]="completionForm.follow_up_due" class="crm-input" />
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCompleteActivity()" [disabled]="submitting()">
                Save & Complete
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
              <h2>⏱ Reschedule Activity</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Rescheduling <b>{{ activeActivity()?.purpose }}</b> with <b>{{ activeActivity()?.account_name }}</b>.
              </p>
              <div class="form-group">
                <label>New Scheduled Date & Time <span class="required">*</span></label>
                <input type="datetime-local" [(ngModel)]="rescheduleTime" class="crm-input" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitRescheduleActivity()" [disabled]="submitting() || !rescheduleTime">
                Update Schedule
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Log Activity -->
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
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Target Contact / HCP</label>
                <select [(ngModel)]="logForm.contact_id" class="crm-select">
                  <option value="">-- General / None --</option>
                  @for (c of contacts(); track c.id) {
                    <option [value]="c.id">{{ c.full_name }}</option>
                  }
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Date & Time <span class="required">*</span></label>
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
                <label>Purpose <span class="required">*</span></label>
                <input type="text" [(ngModel)]="logForm.purpose" class="crm-input" placeholder="e.g. Discuss clinical efficacy..." />
              </div>
              <div class="form-group">
                <label>Location</label>
                <input type="text" [(ngModel)]="logForm.location" class="crm-input" placeholder="e.g. Doctors Lounge" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitLogActivity()" [disabled]="submitting() || !logForm.account_id || !logForm.purpose">
                Save Encounter
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .activity-center-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    
    /* KPI Strip */
    .activity-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: all 0.15s ease; }
    .kpi-card:hover { border-color: #0284c7; transform: translateY(-1px); }
    .kpi-card.active-kpi { border-color: #0284c7; background: #f0f9ff; }
    .kpi-num { font-size: 22px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 2px; }
    .kpi-lbl { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .text-blue { color: #0284c7; }
    .text-purple { color: #8b5cf6; }
    .text-amber { color: #d97706; }
    .text-emerald { color: #10b981; }
    .text-indigo { color: #6366f1; }
    .text-xs { font-size: 11px; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .filter-group { display: flex; gap: 10px; flex-wrap: wrap; }
    .crm-select-sm { height: 36px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 10px; font-size: 12px; color: #334155; background: #ffffff; outline: none; }
    .view-toggle { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    .toggle-btn { padding: 0 14px; height: 36px; background: #ffffff; border: none; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; }
    .toggle-btn.active { background: #0284c7; color: #ffffff; }
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .row-overdue { background-color: #fff1f2; }
    .empty-table-row { text-align: center; padding: 40px !important; color: #94a3b8; }
    .acc-link { color: #0284c7; text-decoration: none; font-weight: 600; }
    .acc-link:hover { text-decoration: underline; }
    .purpose-text { font-size: 13px; color: #1e293b; margin-bottom: 2px; }
    .notes-snippet { font-size: 11px; color: #64748b; font-style: italic; }
    .agenda-timeline { display: flex; flex-direction: column; gap: 14px; }
    .agenda-item { display: flex; gap: 16px; align-items: flex-start; }
    .agenda-date { min-width: 50px; text-align: center; padding: 8px 6px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; }
    .agenda-date .day { font-size: 18px; font-weight: 700; color: #0f172a; display: block; }
    .agenda-date .mo { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .agenda-card { flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
    .card-overdue { border-color: #fda4af; background: #fff1f2; }
    .card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .contact-lbl { font-size: 12px; color: #64748b; }
    .card-purpose { font-size: 13px; color: #1e293b; margin-bottom: 4px; }
    .card-loc { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .card-outcome { font-size: 12px; color: #15803d; margin-top: 6px; }
    .card-actions { margin-top: 10px; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-visit { background: #e0f2fe; color: #0284c7; }
    .badge-call { background: #ede9fe; color: #7c3aed; }
    .badge-meeting { background: #fef3c7; color: #d97706; }
    .badge-email { background: #e0e7ff; color: #4338ca; }
    .badge-follow_up { background: #dcfce7; color: #15803d; }
    .badge-completed { background: #dcfce7; color: #16a34a; }
    .badge-urgent { background: #fee2e2; color: #dc2626; font-weight: 800; }
    .badge-subtle { background: #f1f5f9; color: #475569; }
    .status-pill { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .status-pill.planned { background: #e0f2fe; color: #0369a1; }
    .status-pill.in_progress { background: #fef3c7; color: #b45309; }
    .status-pill.completed { background: #dcfce7; color: #15803d; }
    .status-pill.cancelled { background: #fee2e2; color: #b91c1c; }
    .text-slate { color: #94a3b8; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
    .crm-btn-sm { height: 28px; padding: 0 8px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .crm-btn-danger { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
    .crm-btn-danger:hover:not(:disabled) { background: #fecaca; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }

    /* Modals */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 12px; width: 100%; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
    .modal-card-lg { max-width: 680px; }
    .modal-card-sm { max-width: 440px; }
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
    .follow-up-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #166534; cursor: pointer; }
  `],
})
export class ActivityCenterComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  activities = signal<ActivityItem[]>([]);
  filteredActivities = signal<ActivityItem[]>([]);
  accounts = signal<AccountCardItem[]>([]);
  contacts = signal<ContactItem[]>([]);
  users = signal<SalesUserDirectoryItem[]>([]);

  filterScope = 'mine';
  selectedRepId = '';
  filterType = 'ALL';
  filterStatus = 'ALL';
  viewMode: 'list' | 'agenda' = 'list';

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  submitting = signal<boolean>(false);

  showCompleteModal = signal<boolean>(false);
  showLogModal = signal<boolean>(false);
  showEmailModal = signal<boolean>(false);
  showFollowUpModal = signal<boolean>(false);
  showRescheduleModal = signal<boolean>(false);

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
    this.loadActivities();
    this.salesService.getAccounts({ limit: 100 }).subscribe((acc) => this.accounts.set(acc.items || []));
    this.salesService.getUsers().subscribe((u) => this.users.set(u || []));
  }

  isManagerOrAdmin(): boolean {
    const user = this.authService.user();
    if (!user) return false;
    const roles = user.roles || [];
    return roles.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EXECUTIVE'].includes(r.toUpperCase()));
  }

  canDelete(act: ActivityItem): boolean {
    const user = this.authService.user();
    if (!user) return false;
    if (this.isManagerOrAdmin()) return true;
    return act.owner_id === user.id;
  }

  loadActivities(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: any = {};
    if (this.selectedRepId) {
      params.owner_id = this.selectedRepId;
    } else if (this.filterScope === 'mine') {
      params.view = 'mine';
    } else {
      params.view = 'all';
    }

    this.salesService.getActivities(params).subscribe({
      next: (res) => {
        this.activities.set(res.items || []);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load activities');
      },
    });
  }

  setFilterType(type: string): void {
    this.filterType = type;
    this.applyFilters();
  }

  getCountByType(type: string): number {
    return this.activities().filter((a) => a.activity_type.toLowerCase() === type.toLowerCase()).length;
  }

  applyFilters(): void {
    let list = this.activities();
    if (this.filterType !== 'ALL') {
      list = list.filter((a) => a.activity_type.toLowerCase() === this.filterType.toLowerCase());
    }
    if (this.filterStatus !== 'ALL') {
      list = list.filter((a) => a.status.toLowerCase() === this.filterStatus.toLowerCase());
    }
    this.filteredActivities.set(list);
  }

  onAccountChanged(accId: string): void {
    if (!accId) {
      this.contacts.set([]);
      return;
    }
    this.salesService.getAccountContacts(accId).subscribe((c) => this.contacts.set(c));
  }

  onEmailAccountChanged(accId: string): void {
    this.emailForm.account_id = accId;
    if (!accId) {
      this.contacts.set([]);
      return;
    }
    this.salesService.getAccountContacts(accId).subscribe((c) => {
      this.contacts.set(c);
      if (c && c.length > 0 && !this.emailForm.recipient_email) {
        this.onEmailContactChanged(c[0].id);
      }
    });
  }

  onEmailContactChanged(contactId: string): void {
    this.emailForm.contact_id = contactId;
    const contact = this.contacts().find((c) => c.id === contactId);
    if (contact) {
      this.emailForm.recipient_name = contact.full_name;
      if (contact.email) {
        this.emailForm.recipient_email = contact.email;
      }
    }
  }

  onTemplateChanged(): void {
    const acc = this.accounts().find((a) => a.id === this.emailForm.account_id);
    const accName = acc?.name || 'your institution';

    switch (this.emailForm.template_type) {
      case 'meeting_invitation':
        this.emailForm.subject = `Invitation: Clinical & Therapeutic Review - Accord Pharma at ${accName}`;
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

  openEmailModal(): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 16);

    this.emailForm = {
      recipient_email: '',
      recipient_name: '',
      subject: '',
      body: '',
      template_type: 'meeting_invitation',
      account_id: this.accounts()[0]?.id || '',
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

  openEmailModalForActivity(act: ActivityItem): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 16);

    this.emailForm = {
      recipient_email: '',
      recipient_name: act.contact_name || '',
      subject: `Follow-up on ${act.activity_type.toUpperCase()}: ${act.purpose || 'Accord Pharma Consultation'}`,
      body: `Dear ${act.contact_name || 'HCP'},\n\nThank you for meeting with Accord Pharma regarding ${act.account_name || 'our clinical portfolio'}.\n\nAs discussed: ${act.notes || 'we are following up on key points.'}\n\nOutcome / Next steps: ${act.outcome || act.next_action || 'Ongoing review'}.\n\nBest regards,\n${act.owner_name || 'Accord Pharma Representative'}`,
      template_type: 'call_summary',
      account_id: act.account_id || '',
      contact_id: act.contact_id || '',
      schedule_follow_up: true,
      follow_up_date: reminderIso,
      follow_up_notes: `Follow up on email sent for activity ${act.id}`,
    };
    if (act.account_id) {
      this.salesService.getAccountContacts(act.account_id).subscribe((c) => {
        this.contacts.set(c);
        const matching = c.find((x) => x.id === act.contact_id);
        if (matching && matching.email) {
          this.emailForm.recipient_email = matching.email;
        }
      });
    }
    this.showEmailModal.set(true);
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
          alert(`Email dispatched successfully! Status: ${res.smtp_status}. Logged to activity feed.`);
          this.loadActivities();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to send email');
        },
      });
  }

  openScheduleFollowUpModal(): void {
    const now = new Date();
    const reminderIso = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 16);

    this.followUpForm = {
      title: '',
      due_at: reminderIso,
      priority: 'normal',
      account_id: this.accounts()[0]?.id || '',
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
          alert('Follow-up scheduled successfully with active reminder!');
          this.loadActivities();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to schedule follow-up');
        },
      });
  }

  openRescheduleModal(act: ActivityItem): void {
    this.activeActivity.set(act);
    const d = act.occurred_at ? new Date(act.occurred_at) : new Date();
    this.rescheduleTime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.showRescheduleModal.set(true);
  }

  submitRescheduleActivity(): void {
    const act = this.activeActivity();
    if (!act || !this.rescheduleTime) return;
    this.submitting.set(true);

    this.salesService
      .patchActivity(act.id, {
        action: 'reschedule',
        occurred_at: new Date(this.rescheduleTime).toISOString(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showRescheduleModal.set(false);
          this.loadActivities();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to reschedule');
        },
      });
  }

  deleteActivity(act: ActivityItem): void {
    if (!confirm(`Are you sure you want to delete this activity ("${act.purpose || act.activity_type}")?`)) return;
    this.salesService.deleteActivity(act.id).subscribe({
      next: () => this.loadActivities(),
      error: (err: any) => alert(err?.error?.detail || 'Failed to delete activity'),
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
          this.loadActivities();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to complete encounter');
        },
      });
  }

  openLogModal(type: 'visit' | 'call' | 'meeting'): void {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.logForm = {
      account_id: this.accounts()[0]?.id || '',
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
          this.loadActivities();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create activity');
        },
      });
  }

  closeModals(): void {
    this.showCompleteModal.set(false);
    this.showLogModal.set(false);
    this.showEmailModal.set(false);
    this.showFollowUpModal.set(false);
    this.showRescheduleModal.set(false);
  }

  formatTime(isoStr: string | null): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatType(type: string): string {
    switch (type.toLowerCase()) {
      case 'visit': return 'HCP Visit';
      case 'call': return 'Detailing Call';
      case 'meeting': return 'Formulary Meeting';
      case 'email': return 'Email / Invite';
      case 'follow_up': return 'Follow-up';
      default: return type.toUpperCase();
    }
  }

  getBadgeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'visit': return 'badge-visit';
      case 'call': return 'badge-call';
      case 'meeting': return 'badge-meeting';
      case 'email': return 'badge-email';
      case 'follow_up': return 'badge-follow_up';
      default: return 'badge-subtle';
    }
  }
}
