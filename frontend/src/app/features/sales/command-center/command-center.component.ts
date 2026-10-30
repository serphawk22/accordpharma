import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import {
  CommandCenterData,
  TeamMemberMetric,
  AccountCardItem,
  SalesUserDirectoryItem,
} from '../../../core/sales.models';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="command-center-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">EXECUTIVE & SALES LEADERSHIP</div>
          <h1>Sales Command Center</h1>
          <p class="subtitle">
            Organization-wide commercial performance, quota progression, team detailing activity, and account coverage.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="loadAllData()">
            ↻ Refresh Metrics
          </button>
          <button class="crm-btn crm-btn-primary" (click)="openQuickReassignModal()">
            ⇄ Global Reassignment
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Aggregating commercial metrics & team performance...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadAllData()">Retry</button>
        </div>
      } @else {
        <!-- Executive KPI Cards -->
        @if (data()?.kpis) {
          <section class="kpi-grid">
            <div class="kpi-card highlight">
              <div class="kpi-top">
                <span class="kpi-label">Won Revenue (Period)</span>
                <span class="calc-badge">Validated</span>
              </div>
              <div class="kpi-val text-emerald">{{ formatCurrency(data()?.kpis?.won_revenue || 0) }}</div>
              <div class="kpi-sub">
                Target: {{ formatCurrency(data()?.kpis?.target?.target_total || 0) }}
                @if (data()?.kpis?.target?.achievement != null) {
                  <span>({{ ((data()?.kpis?.target?.achievement || 0) * 100).toFixed(1) }}%)</span>
                }
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-label">Active Pipeline</span>
                <span class="calc-badge">Open Deals</span>
              </div>
              <div class="kpi-val text-blue">{{ formatCurrency(data()?.kpis?.pipeline_value || 0) }}</div>
              <div class="kpi-sub">
                Win Rate: <b>{{ (((data()?.kpis?.win_rate?.rate || 0)) * 100).toFixed(1) }}%</b>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-label">Activities Completed</span>
                <span class="calc-badge">Field Detailing</span>
              </div>
              <div class="kpi-val">{{ data()?.kpis?.completed_activities || 0 }}</div>
              <div class="kpi-sub">
                Active Reps: {{ data()?.kpis?.active_reps || 0 }}
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-label">Unengaged Accounts</span>
                <span class="calc-badge">Attention</span>
              </div>
              <div class="kpi-val text-rose">{{ data()?.kpis?.accounts_without_engagement || 0 }}</div>
              <div class="kpi-sub">
                Active Accounts: {{ data()?.kpis?.active_accounts || 0 }}
              </div>
            </div>
          </section>
        }

        <!-- Sales Team Performance Table -->
        <section class="section-panel">
          <div class="panel-header">
            <div>
              <h2>Sales Team Performance & Quota Progress</h2>
              <p class="panel-sub">Individual detailing activity, deal win rates, and target achievement per representative.</p>
            </div>
          </div>

          <div class="table-container">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Sales Representative</th>
                  <th>Territory</th>
                  <th>Won Revenue</th>
                  <th>Target</th>
                  <th>Attainment %</th>
                  <th>HCP Visits</th>
                  <th>Win Rate</th>
                  <th style="text-align: right;">Drill-down</th>
                </tr>
              </thead>
              <tbody>
                @if (teamPerformance().length === 0) {
                  <tr><td colspan="8" class="empty-table-row">No representative activity recorded in this period.</td></tr>
                } @else {
                  @for (rep of teamPerformance(); track rep.user_id) {
                    <tr>
                      <td>
                        <a [routerLink]="['/sales/team-performance', rep.user_id]" class="rep-link">
                          👤 <strong>{{ rep.name }}</strong>
                        </a>
                      </td>
                      <td>
                        <span class="role-tag">{{ rep.territory || 'Unassigned' }}</span>
                      </td>
                      <td><strong class="text-emerald">{{ formatCurrency(rep.won_revenue) }}</strong></td>
                      <td>{{ formatCurrency(rep.target?.amount || 0) }}</td>
                      <td>
                        <div class="progress-cell">
                          <span class="pct-val">{{ (((rep.target?.achievement || 0)) * 100).toFixed(1) }}%</span>
                          <div class="mini-bar">
                            <div class="bar-fill" [style.width.%]="calcWidth((rep.target?.achievement || 0) * 100)"></div>
                          </div>
                        </div>
                      </td>
                      <td><strong>{{ rep.visits_completed }}</strong> visits</td>
                      <td>{{ (((rep.win_rate.rate || 0)) * 100).toFixed(1) }}%</td>
                      <td style="text-align: right;">
                        <a [routerLink]="['/sales/team-performance', rep.user_id]" class="crm-btn crm-btn-sm crm-btn-secondary">
                          View Rep Profile →
                        </a>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- MODAL: Global Reassign -->
      @if (showReassignModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Account & Pipeline Reassignment</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                Transfer account and linked deal ownership between field representatives with audit history tracking.
              </p>
              <div class="form-group">
                <label>Select Target Account <span class="required">*</span></label>
                <select [(ngModel)]="reassignForm.account_id" class="crm-select">
                  <option value="">-- Choose Account --</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} (Current: {{ acc.owner_name || 'Unassigned' }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>New Assigned Representative <span class="required">*</span></label>
                <select [(ngModel)]="reassignForm.new_assigned_to_id" class="crm-select">
                  <option value="">-- Choose Rep --</option>
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.full_name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Reason for Reassignment <span class="required">*</span></label>
                <textarea rows="2" [(ngModel)]="reassignForm.reason" class="crm-input" placeholder="Territory redistricting, rep handover, load balance..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitReassignment()" [disabled]="submitting() || !reassignForm.account_id || !reassignForm.new_assigned_to_id">
                @if (submitting()) { Reassigning... } @else { Confirm Reassignment }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .command-center-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 12px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .kpi-card.highlight { border-color: #a7f3d0; background: #f0fdf4; }
    .kpi-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .calc-badge { font-size: 9px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .kpi-val { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 6px; }
    .kpi-sub { font-size: 12px; color: #64748b; }
    .section-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .panel-header { margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .panel-header h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .panel-sub { font-size: 12px; color: #64748b; margin: 0; }
    .table-container { overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .rep-link { color: #0284c7; text-decoration: none; }
    .rep-link:hover { text-decoration: underline; }
    .role-tag { font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; }
    .progress-cell { display: flex; flex-direction: column; gap: 4px; }
    .pct-val { font-weight: 700; font-size: 12px; color: #0f172a; }
    .mini-bar { height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; width: 100px; }
    .bar-fill { height: 100%; background: #0284c7; border-radius: 999px; }
    .empty-table-row { text-align: center; padding: 40px !important; color: #94a3b8; }
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-rose { color: #e11d48; }
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
  `],
})
export class CommandCenterComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  data = signal<CommandCenterData | null>(null);
  teamPerformance = signal<TeamMemberMetric[]>([]);
  accounts = signal<AccountCardItem[]>([]);
  users = signal<SalesUserDirectoryItem[]>([]);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  submitting = signal<boolean>(false);

  showReassignModal = signal<boolean>(false);

  reassignForm = {
    account_id: '',
    new_assigned_to_id: '',
    reason: '',
  };

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.salesService.getCommandCenter().subscribe({
      next: (k) => {
        this.data.set(k);
        this.salesService.getTeamPerformance().subscribe({
          next: (t) => {
            this.teamPerformance.set(t.items || []);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load command center data');
      },
    });

    this.salesService.getAccounts().subscribe((acc) => this.accounts.set(acc.items || []));
    this.salesService.getUsers().subscribe((u) => this.users.set(u));
  }

  openQuickReassignModal(): void {
    this.reassignForm = {
      account_id: this.accounts()[0]?.id || '',
      new_assigned_to_id: '',
      reason: '',
    };
    this.showReassignModal.set(true);
  }

  submitReassignment(): void {
    if (!this.reassignForm.account_id || !this.reassignForm.new_assigned_to_id) return;
    this.submitting.set(true);

    this.salesService
      .reassignAccount(this.reassignForm.account_id, {
        assigned_to_id: this.reassignForm.new_assigned_to_id,
        reason: this.reassignForm.reason || 'Reassigned from Command Center',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showReassignModal.set(false);
          this.loadAllData();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to reassign account');
        },
      });
  }

  closeModals(): void {
    this.showReassignModal.set(false);
  }

  calcWidth(pct: number): number {
    return Math.min(Math.max(pct, 0), 100);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }
}
