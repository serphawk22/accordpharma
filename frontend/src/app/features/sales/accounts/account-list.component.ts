import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import { AccountCardItem, SalesUserDirectoryItem } from '../../../core/sales.models';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="accounts-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">ACCOUNTS DIRECTORY & COVERAGE</div>
          <h1>Accounts 360°</h1>
          <p class="subtitle">
            Directory of institutional hospitals, private clinics, regional pharmacies, and distributor partners.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-primary" (click)="openCreateModal()">
            <span>+</span> Create Account
          </button>
        </div>
      </header>

      <!-- Filter & Search Toolbar -->
      <div class="toolbar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilters()"
            placeholder="Search accounts by name, territory, or owner..."
            class="crm-search-input"
          />
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="selectedType" (ngModelChange)="applyFilters()" class="crm-filter-select">
            <option value="ALL">All Account Types</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="CLINIC">Clinic</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
      </div>

      <!-- State handling -->
      @if (followUpSuccessMsg()) {
        <div class="crm-alert crm-alert-success" style="margin-bottom: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 12px 16px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>✓ {{ followUpSuccessMsg() }}</span>
          <button style="background: none; border: none; cursor: pointer; color: #065f46; font-size: 16px;" (click)="followUpSuccessMsg.set(null)">✕</button>
        </div>
      }
      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading accounts directory...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadAccounts()">Retry</button>
        </div>
      } @else {
        <!-- Accounts Table -->
        <div class="table-container">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Territory / Region</th>
                <th>Assigned Representative</th>
                <th>Status</th>
                <th>Last Touchpoint</th>
                <th>Open Deals</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (filteredAccounts().length === 0) {
                <tr>
                  <td colspan="8" class="empty-table-row">
                    No accounts found matching your query.
                  </td>
                </tr>
              } @else {
                @for (acc of filteredAccounts(); track acc.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/sales/accounts', acc.id]" class="account-name-link">
                        {{ acc.name }}
                      </a>
                    </td>
                    <td>
                      <span class="type-pill" [class]="acc.account_type.toLowerCase()">
                        {{ acc.account_type }}
                      </span>
                    </td>
                    <td>{{ acc.territory || 'Unassigned' }}</td>
                    <td>
                      <span class="owner-cell">
                        👤 {{ acc.owner_name || 'Unassigned' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge-subtle">
                        {{ acc.status }}
                      </span>
                    </td>
                    <td>
                      <span [class.text-rose]="!acc.last_interaction_at">
                        {{ acc.last_interaction_at ? (acc.last_interaction_at | slice:0:10) : 'Never Contacted' }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ formatCurrency(acc.open_opportunity_value || 0) }}</strong>
                      <small class="text-slate" style="display:block;">({{ acc.open_opportunities }} deals)</small>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button
                        class="crm-btn crm-btn-sm crm-btn-primary"
                        style="margin-right: 6px;"
                        (click)="openFollowUpModal(acc)"
                        title="Schedule or log a follow-up directly for this account"
                      >
                        📅 + Follow-up
                      </button>
                      <a [routerLink]="['/sales/accounts', acc.id]" class="crm-btn crm-btn-sm crm-btn-secondary">
                        View 360° →
                      </a>
                      @if (canReassign()) {
                        <button
                          class="crm-btn crm-btn-sm crm-btn-ghost"
                          style="margin-left: 6px;"
                          (click)="openReassignModal(acc)"
                        >
                          Reassign
                        </button>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODAL: Create Account -->
      @if (showCreateModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Add New Account</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Account / Facility Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newAccount.name" class="crm-input" placeholder="e.g. St. Jude Regional Medical Center" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Account Type <span class="required">*</span></label>
                  <select [(ngModel)]="newAccount.account_type" class="crm-select">
                    <option value="HOSPITAL">Hospital</option>
                    <option value="CLINIC">Clinic</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Territory</label>
                  <input type="text" [(ngModel)]="newAccount.territory" class="crm-input" placeholder="e.g. Midwest, Northwest, East" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateAccount()" [disabled]="submitting() || !newAccount.name">
                @if (submitting()) { Creating... } @else { Create Account }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Reassign Account -->
      @if (showReassignModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-sm">
            <div class="modal-header">
              <h2>Reassign Account</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Reassigning <b>{{ activeAccount()?.name }}</b> to a new sales representative.
              </p>
              <div class="form-group">
                <label>Select Sales Representative <span class="required">*</span></label>
                <select [(ngModel)]="reassignUserId" class="crm-select">
                  <option value="">-- Choose Rep --</option>
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.full_name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Reason for Reassignment</label>
                <textarea rows="2" [(ngModel)]="reassignReason" class="crm-input" placeholder="Territory realignment, departure, load balancing..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitReassign()" [disabled]="submitting() || !reassignUserId">
                @if (submitting()) { Saving... } @else { Confirm Reassignment }
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
              <div>
                <h2>Schedule Follow-up</h2>
                <div class="eyebrow" style="margin-top: 4px; color: #0284c7;">{{ followUpAccount()?.name }}</div>
              </div>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Follow-up Type <span class="required">*</span></label>
                  <select [(ngModel)]="followUpData.activity_type" class="crm-select">
                    <option value="follow_up">Follow-up Call / Check-in</option>
                    <option value="meeting">On-site Hospital Meeting</option>
                    <option value="clinical_detailing">Clinical Product Detailing</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email Outreach</option>
                    <option value="task">Account Task</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="followUpData.priority" class="crm-select">
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Scheduled Date & Time <span class="required">*</span></label>
                <input type="datetime-local" [(ngModel)]="followUpData.scheduled_at" class="crm-input" />
              </div>

              <div class="form-group">
                <label>Purpose / Action Title <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="followUpData.purpose"
                  class="crm-input"
                  placeholder="e.g. Review Q4 formulary inventory & order restocking"
                />
              </div>

              <div class="form-group">
                <label>Agenda & Follow-up Notes</label>
                <textarea
                  rows="3"
                  [(ngModel)]="followUpData.notes"
                  class="crm-input"
                  placeholder="Key products to discuss, clinical inquiries, proposal status, requested samples..."
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button
                class="crm-btn crm-btn-primary"
                (click)="submitFollowUp()"
                [disabled]="submitting() || !followUpData.purpose || !followUpData.scheduled_at"
              >
                @if (submitting()) { Scheduling... } @else { Confirm & Schedule Follow-up }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .accounts-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .search-input-wrap { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; height: 38px; flex: 1; max-width: 460px; }
    .search-icon { font-size: 14px; color: #94a3b8; }
    .crm-search-input { border: none; outline: none; width: 100%; font-size: 13px; color: #1e293b; }
    .filter-controls { display: flex; gap: 12px; }
    .crm-filter-select { height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13px; color: #334155; background: #ffffff; outline: none; }
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .crm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .crm-table tr:hover td { background: #f8fafc; }
    .empty-table-row { text-align: center; padding: 40px !important; color: #94a3b8; }
    .account-name-link { font-weight: 600; color: #0284c7; text-decoration: none; font-size: 14px; }
    .account-name-link:hover { text-decoration: underline; }
    .type-pill { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
    .type-pill.hospital { background: #e0f2fe; color: #0369a1; }
    .type-pill.clinic { background: #ede9fe; color: #6d28d9; }
    .type-pill.pharmacy { background: #fef3c7; color: #b45309; }
    .type-pill.distributor { background: #dcfce7; color: #15803d; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-subtle { background: #f1f5f9; color: #475569; }
    .text-rose { color: #e11d48; }
    .text-slate { color: #94a3b8; }

    /* Modals & Buttons */
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
    .crm-btn-ghost { background: transparent; color: #64748b; }
    .crm-btn-ghost:hover:not(:disabled) { background: #f1f5f9; color: #1e293b; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }
  `],
})
export class AccountListComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  accounts = signal<AccountCardItem[]>([]);
  filteredAccounts = signal<AccountCardItem[]>([]);
  users = signal<SalesUserDirectoryItem[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  searchQuery = '';
  selectedType = 'ALL';

  showCreateModal = signal<boolean>(false);
  showReassignModal = signal<boolean>(false);
  showFollowUpModal = signal<boolean>(false);
  followUpAccount = signal<AccountCardItem | null>(null);
  followUpSuccessMsg = signal<string | null>(null);
  submitting = signal<boolean>(false);

  followUpData = {
    activity_type: 'follow_up',
    scheduled_at: '',
    purpose: '',
    priority: 'normal',
    notes: '',
  };

  newAccount = {
    name: '',
    account_type: 'HOSPITAL',
    territory: '',
  };

  activeAccount = signal<AccountCardItem | null>(null);
  reassignUserId = '';
  reassignReason = '';

  canReassign(): boolean {
    const roles = this.authService.user()?.roles || [];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('SALES_MANAGER');
  }

  ngOnInit(): void {
    this.loadAccounts();
    if (this.canReassign()) {
      this.loadUsers();
    }
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salesService.getAccounts().subscribe({
      next: (res) => {
        this.accounts.set(res.items || []);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load accounts list');
      },
    });
  }

  loadUsers(): void {
    this.salesService.getUsers().subscribe({
      next: (res) => this.users.set(res),
      error: () => {},
    });
  }

  applyFilters(): void {
    let list = this.accounts();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.territory && a.territory.toLowerCase().includes(q)) ||
          (a.owner_name && a.owner_name.toLowerCase().includes(q))
      );
    }
    if (this.selectedType !== 'ALL') {
      list = list.filter((a) => a.account_type.toUpperCase() === this.selectedType);
    }
    this.filteredAccounts.set(list);
  }

  openCreateModal(): void {
    this.newAccount = {
      name: '',
      account_type: 'HOSPITAL',
      territory: '',
    };
    this.showCreateModal.set(true);
  }

  submitCreateAccount(): void {
    if (!this.newAccount.name) return;
    this.submitting.set(true);
    this.salesService.createAccount(this.newAccount).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showCreateModal.set(false);
        this.loadAccounts();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to create account');
      },
    });
  }

  openReassignModal(acc: AccountCardItem): void {
    this.activeAccount.set(acc);
    this.reassignUserId = '';
    this.reassignReason = '';
    this.showReassignModal.set(true);
  }

  submitReassign(): void {
    const acc = this.activeAccount();
    if (!acc || !this.reassignUserId) return;
    this.submitting.set(true);
    this.salesService
      .reassignAccount(acc.id, {
        assigned_to_id: this.reassignUserId,
        reason: this.reassignReason || 'Reassigned from account directory',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showReassignModal.set(false);
          this.loadAccounts();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to reassign account');
        },
      });
  }

  openFollowUpModal(acc: AccountCardItem): void {
    this.followUpAccount.set(acc);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.followUpData = {
      activity_type: 'follow_up',
      scheduled_at: localIso,
      purpose: `Follow-up with ${acc.name}`,
      priority: 'normal',
      notes: '',
    };
    this.showFollowUpModal.set(true);
  }

  submitFollowUp(): void {
    const acc = this.followUpAccount();
    if (!acc || !this.followUpData.purpose || !this.followUpData.scheduled_at) return;
    this.submitting.set(true);
    const occurredAt = new Date(this.followUpData.scheduled_at).toISOString();
    this.salesService
      .createActivity({
        account_id: acc.id,
        activity_type: this.followUpData.activity_type,
        status: 'planned',
        occurred_at: occurredAt,
        purpose: this.followUpData.purpose,
        priority: this.followUpData.priority,
        notes: this.followUpData.notes || null,
        next_action: this.followUpData.purpose,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showFollowUpModal.set(false);
          this.followUpSuccessMsg.set(`Follow-up scheduled for ${acc.name}! It is now tracked on My Day & Activities.`);
          setTimeout(() => this.followUpSuccessMsg.set(null), 6000);
          this.loadAccounts();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to schedule follow-up');
        },
      });
  }

  closeModals(): void {
    this.showCreateModal.set(false);
    this.showReassignModal.set(false);
    this.showFollowUpModal.set(false);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }
}
