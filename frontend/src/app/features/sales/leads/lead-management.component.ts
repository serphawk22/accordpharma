import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import {
  LeadItem,
  AccountCardItem,
} from '../../../core/sales.models';

@Component({
  selector: 'app-lead-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="leads-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">PRE-QUALIFICATION & INBOUND FUNNEL</div>
          <h1>Lead Management & Conversion</h1>
          <p class="subtitle">
            Capture, qualify, and convert new clinical contacts and prospective hospital accounts into pipeline opportunities.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-primary" (click)="openCreateModal()">
            <span>+</span> Create New Lead
          </button>
        </div>
      </header>

      <!-- Filter Bar -->
      <div class="toolbar">
        <div class="filter-controls">
          <button
            class="filter-pill"
            [class.active]="selectedStatus === 'ALL'"
            (click)="setStatusFilter('ALL')"
          >
            All Leads ({{ leads().length }})
          </button>
          <button
            class="filter-pill"
            [class.active]="selectedStatus === 'new'"
            (click)="setStatusFilter('new')"
          >
            New
          </button>
          <button
            class="filter-pill"
            [class.active]="selectedStatus === 'qualified'"
            (click)="setStatusFilter('qualified')"
          >
            Qualified
          </button>
          <button
            class="filter-pill"
            [class.active]="selectedStatus === 'converted'"
            (click)="setStatusFilter('converted')"
          >
            Converted
          </button>
          <button
            class="filter-pill"
            [class.active]="selectedStatus === 'disqualified'"
            (click)="setStatusFilter('disqualified')"
          >
            Disqualified
          </button>
        </div>
      </div>

      <!-- State handling -->
      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading leads directory...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadLeads()">Retry</button>
        </div>
      } @else {
        <!-- Leads Table -->
        <div class="table-container">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Lead Contact</th>
                <th>Organization / Facility</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (filteredLeads().length === 0) {
                <tr><td colspan="6" class="empty-table-row">No leads found in this category.</td></tr>
              } @else {
                @for (lead of filteredLeads(); track lead.id) {
                  <tr>
                    <td>
                      <strong>{{ lead.name }}</strong>
                      @if (lead.email) {
                        <div class="text-slate">{{ lead.email }}</div>
                      }
                    </td>
                    <td>{{ lead.organization || '-' }}</td>
                    <td><span class="badge badge-subtle">{{ lead.source || 'General' }}</span></td>
                    <td>
                      <span class="badge" [ngClass]="getStatusBadgeClass(lead.status)">
                        {{ lead.status | uppercase }}
                      </span>
                    </td>
                    <td>{{ lead.created_at | slice:0:10 }}</td>
                    <td style="text-align: right; white-space: nowrap;">
                      @if (lead.status === 'new') {
                        <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="openQualifyModal(lead)">
                          Qualify
                        </button>
                        <button class="crm-btn crm-btn-sm crm-btn-primary" style="margin-left: 6px;" (click)="openConvertModal(lead)">
                          Convert →
                        </button>
                      } @else if (lead.status === 'qualified') {
                        <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="openConvertModal(lead)">
                          Convert to Account & Opp →
                        </button>
                      } @else if (lead.status === 'converted') {
                        <span class="text-emerald" style="font-size: 11px; font-weight: 600;">✓ Converted</span>
                      } @else {
                        <span class="text-slate" style="font-size: 11px;">Disqualified</span>
                      }
                      <button class="crm-btn crm-btn-sm crm-btn-ghost" style="margin-left: 6px; color: #ef4444;" (click)="deleteLead(lead)" title="Delete Lead">
                        ✕
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODAL: Create Lead -->
      @if (showCreateModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Create New Lead</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Lead / Contact Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="createForm.name" class="crm-input" placeholder="Dr. Gregory House" />
                </div>
                <div class="form-group">
                  <label>Facility / Hospital <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="createForm.organization" class="crm-input" placeholder="Princeton-Plainsboro" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" [(ngModel)]="createForm.email" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" [(ngModel)]="createForm.phone" class="crm-input" />
                </div>
              </div>
              <div class="form-group">
                <label>Lead Source</label>
                <select [(ngModel)]="createForm.source" class="crm-select">
                  <option value="CONFERENCE">Medical Conference</option>
                  <option value="REFERRAL">Physician Referral</option>
                  <option value="COLD_OUTREACH">Cold Outreach</option>
                  <option value="INBOUND">Inbound Web / Call</option>
                  <option value="DIGITAL_CAMPAIGN">Digital Campaign</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateLead()" [disabled]="submitting() || !createForm.name || !createForm.organization">
                Create Lead
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Qualify Lead -->
      @if (showQualifyModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-sm">
            <div class="modal-header">
              <h2>Qualify Lead</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Qualifying <b>{{ activeLead()?.name }}</b> at <b>{{ activeLead()?.organization }}</b>.
              </p>
              <div class="form-group">
                <label>Status Update</label>
                <select [(ngModel)]="qualifyStatus" class="crm-select">
                  <option value="qualified">Mark as Qualified</option>
                  <option value="disqualified">Disqualify (Not a fit / No budget)</option>
                </select>
              </div>
              <div class="form-group" *ngIf="qualifyStatus === 'qualified'">
                <label>Customer Clinical Need (Optional)</label>
                <input [(ngModel)]="qualifyNeed" class="crm-input" placeholder="e.g. Biosimilar oncology formulary evaluation, ICU supply..." />
              </div>
              <div class="form-group">
                <label>Qualification Notes</label>
                <textarea rows="3" [(ngModel)]="qualifyNotes" class="crm-input" placeholder="Formulary review scheduled next month, budget available..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitQualifyLead()" [disabled]="submitting()">
                Save Status
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Convert Lead to Account & Opportunity -->
      @if (showConvertModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Convert Lead to Account & Opportunity</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="lead-convert-banner">
                Converting <b>{{ activeLead()?.name }}</b> ({{ activeLead()?.organization }}).
                This will automatically link or create an Account, Contact, and Sales Opportunity.
              </div>

              <div class="form-group">
                <label>Account Assignment</label>
                <div class="radio-row">
                  <label class="radio-lbl">
                    <input type="radio" [(ngModel)]="convertForm.link_existing_account" [value]="false" />
                    Create New Account: <b>{{ activeLead()?.organization }}</b>
                  </label>
                  <label class="radio-lbl">
                    <input type="radio" [(ngModel)]="convertForm.link_existing_account" [value]="true" />
                    Link to Existing Account
                  </label>
                </div>
              </div>

              @if (convertForm.link_existing_account) {
                <div class="form-group">
                  <label>Choose Existing Account <span class="required">*</span></label>
                  <select [(ngModel)]="convertForm.existing_account_id" class="crm-select">
                    <option value="">-- Choose Account --</option>
                    @for (acc of accounts(); track acc.id) {
                      <option [value]="acc.id">{{ acc.name }}</option>
                    }
                  </select>
                </div>
              }

              <div class="form-group">
                <label>Initial Opportunity Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="convertForm.opportunity_name" class="crm-input" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Estimated Value (USD) <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="convertForm.estimated_value" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Target Close Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="convertForm.expected_close_date" class="crm-input" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitConvertLead()" [disabled]="submitting() || !convertForm.opportunity_name">
                @if (submitting()) { Converting... } @else { Confirm Conversion }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .leads-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .toolbar { display: flex; align-items: center; margin-bottom: 20px; }
    .filter-controls { display: flex; gap: 8px; }
    .filter-pill { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; }
    .filter-pill.active { background: #0284c7; border-color: #0284c7; color: #ffffff; }
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .empty-table-row { text-align: center; padding: 40px !important; color: #94a3b8; }
    .text-slate { color: #94a3b8; }
    .text-emerald { color: #059669; }
    .lead-convert-banner { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #166534; margin-bottom: 14px; }
    .radio-row { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .radio-lbl { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-healthy { background: #dcfce7; color: #15803d; }
    .badge-attention { background: #fef3c7; color: #b45309; }
    .badge-subtle { background: #f1f5f9; color: #475569; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
    .crm-btn-sm { height: 28px; padding: 0 10px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }

    /* Modals */
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
  `],
})
export class LeadManagementComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  leads = signal<LeadItem[]>([]);
  filteredLeads = signal<LeadItem[]>([]);
  accounts = signal<AccountCardItem[]>([]);

  selectedStatus = 'ALL';
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  submitting = signal<boolean>(false);

  showCreateModal = signal<boolean>(false);
  showQualifyModal = signal<boolean>(false);
  showConvertModal = signal<boolean>(false);

  activeLead = signal<LeadItem | null>(null);

  createForm = {
    name: '',
    organization: '',
    email: '',
    phone: '',
    source: 'CONFERENCE',
  };

  qualifyStatus = 'qualified';
  qualifyNotes = '';
  qualifyNeed = '';

  convertForm = {
    link_existing_account: false,
    existing_account_id: '',
    opportunity_name: '',
    estimated_value: 30000,
    expected_close_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
  };

  ngOnInit(): void {
    this.loadLeads();
    this.salesService.getAccounts().subscribe((acc) => this.accounts.set(acc.items || []));
  }

  loadLeads(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salesService.getLeads().subscribe({
      next: (res) => {
        this.leads.set(res.items || []);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load leads');
      },
    });
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedStatus === 'ALL') {
      this.filteredLeads.set(this.leads());
    } else {
      this.filteredLeads.set(this.leads().filter((l) => l.status.toLowerCase() === this.selectedStatus.toLowerCase()));
    }
  }

  openCreateModal(): void {
    this.createForm = {
      name: '',
      organization: '',
      email: '',
      phone: '',
      source: 'CONFERENCE',
    };
    this.showCreateModal.set(true);
  }

  submitCreateLead(): void {
    if (!this.createForm.name || !this.createForm.organization) return;
    this.submitting.set(true);
    this.salesService.createLead(this.createForm).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showCreateModal.set(false);
        this.loadLeads();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to create lead');
      },
    });
  }

  openQualifyModal(lead: LeadItem): void {
    this.activeLead.set(lead);
    this.qualifyStatus = 'qualified';
    this.qualifyNotes = lead.qualification_notes || '';
    this.qualifyNeed = lead.customer_need || '';
    this.showQualifyModal.set(true);
  }

  submitQualifyLead(): void {
    const lead = this.activeLead();
    if (!lead) return;
    this.submitting.set(true);
    this.salesService
      .patchLead(lead.id, {
        status: this.qualifyStatus,
        qualification_notes: this.qualifyNotes,
        customer_need: this.qualifyNeed || lead.customer_need || 'Clinical portfolio evaluation & inquiry',
        disqualified_reason: this.qualifyStatus === 'disqualified' ? (this.qualifyNotes || 'Disqualified: not a current fit') : undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showQualifyModal.set(false);
          this.loadLeads();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to qualify lead');
        },
      });
  }

  deleteLead(lead: LeadItem): void {
    if (!confirm(`Are you sure you want to delete lead "${lead.name}"?`)) return;
    this.salesService.deleteLead(lead.id).subscribe({
      next: () => this.loadLeads(),
      error: (err: any) => alert(err?.error?.detail || 'Failed to delete lead'),
    });
  }

  openConvertModal(lead: LeadItem): void {
    this.activeLead.set(lead);
    this.convertForm = {
      link_existing_account: false,
      existing_account_id: '',
      opportunity_name: `${lead.organization || lead.name} - Formulary Deal`,
      estimated_value: 30000,
      expected_close_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    };
    this.showConvertModal.set(true);
  }

  submitConvertLead(): void {
    const lead = this.activeLead();
    if (!lead || !this.convertForm.opportunity_name) return;
    this.submitting.set(true);

    this.salesService
      .convertLead(lead.id, {
        account_id: this.convertForm.link_existing_account ? this.convertForm.existing_account_id || null : null,
        opportunity_name: this.convertForm.opportunity_name,
        estimated_value: this.convertForm.estimated_value,
        expected_close_date: this.convertForm.expected_close_date,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showConvertModal.set(false);
          this.loadLeads();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to convert lead');
        },
      });
  }

  closeModals(): void {
    this.showCreateModal.set(false);
    this.showQualifyModal.set(false);
    this.showConvertModal.set(false);
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'qualified': return 'badge-healthy';
      case 'converted': return 'badge-healthy';
      case 'disqualified': return 'badge-danger';
      default: return 'badge-attention';
    }
  }
}
