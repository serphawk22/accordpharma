import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';

export interface RepDetailProfile {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    territory: string | null;
  };
  won_revenue: number;
  target_amount: number;
  target_attainment_pct: number;
  visits_completed: number;
  win_rate: number;
  assigned_accounts: Array<{
    id: string;
    name: string;
    account_type: string;
    territory: string | null;
    health_status: string;
    last_contact_date: string | null;
  }>;
  quiet_accounts: Array<{
    id: string;
    name: string;
    last_contact_date: string | null;
  }>;
  monthly_revenue: Array<{
    month: string;
    revenue: number;
  }>;
}

@Component({
  selector: 'app-rep-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="rep-profile-page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb-bar">
        <a routerLink="/command-center" class="back-link">← Command Center</a>
        <span class="sep">/</span>
        <span class="crumb-current">{{ profile()?.user?.full_name || 'Representative Profile' }}</span>
      </nav>

      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading representative performance profile...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadProfile()">Retry</button>
        </div>
      } @else if (profile()) {
        <!-- Header -->
        <header class="rep-header">
          <div class="rep-avatar">
            {{ getInitials(profile()?.user?.full_name || 'Rep') }}
          </div>
          <div class="rep-info">
            <h1>{{ profile()?.user?.full_name }}</h1>
            <div class="meta-row">
              <span>Role: <b>{{ profile()?.user?.role }}</b></span>
              <span>· Territory: <b>{{ profile()?.user?.territory || 'National / General' }}</b></span>
              <span>· Email: <a [href]="'mailto:' + profile()?.user?.email">{{ profile()?.user?.email }}</a></span>
            </div>
          </div>
        </header>

        <!-- KPI Strip -->
        <section class="kpi-strip">
          <div class="kpi-box highlight">
            <span class="kpi-lbl">Current Month Revenue</span>
            <div class="kpi-val text-emerald">{{ formatCurrency(profile()?.won_revenue || 0) }}</div>
            <span class="kpi-sub">Target: {{ formatCurrency(profile()?.target_amount || 0) }}</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-lbl">Quota Attainment</span>
            <div class="kpi-val text-blue">{{ (profile()?.target_attainment_pct || 0).toFixed(1) }}%</div>
            <div class="progress-track" style="margin-top: 6px;">
              <div class="progress-fill" [style.width.%]="calcWidth(profile()?.target_attainment_pct || 0)"></div>
            </div>
          </div>
          <div class="kpi-box">
            <span class="kpi-lbl">Visits Completed</span>
            <div class="kpi-val">{{ profile()?.visits_completed || 0 }}</div>
            <span class="kpi-sub">Win Rate: {{ (profile()?.win_rate || 0).toFixed(1) }}%</span>
          </div>
          <div class="kpi-box" [class.danger]="(profile()?.quiet_accounts?.length ?? 0) > 0">
            <span class="kpi-lbl">Quiet Accounts (>30d)</span>
            <div class="kpi-val text-rose">{{ profile()?.quiet_accounts?.length || 0 }}</div>
            <span class="kpi-sub">Require immediate outreach</span>
          </div>
        </section>

        <!-- Grid Layout: Assigned Accounts & Monthly History -->
        <div class="profile-grid">
          <!-- Left: Assigned Accounts -->
          <div class="main-panel">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <h2>Assigned Accounts ({{ profile()?.assigned_accounts?.length || 0 }})</h2>
                  <p class="panel-sub">Accounts managed directly by this representative.</p>
                </div>
              </div>

              <div class="table-container">
                <table class="crm-table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th>Territory</th>
                      <th>Health</th>
                      <th>Last Contact</th>
                      <th style="text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if ((profile()?.assigned_accounts?.length ?? 0) === 0) {
                      <tr><td colspan="6" class="empty-table-row">No accounts currently assigned.</td></tr>
                    } @else {
                      @for (acc of profile()?.assigned_accounts; track acc.id) {
                        <tr>
                          <td>
                            <a [routerLink]="['/sales/accounts', acc.id]" class="acc-link">
                              <strong>{{ acc.name }}</strong>
                            </a>
                          </td>
                          <td><span class="type-pill">{{ acc.account_type }}</span></td>
                          <td>{{ acc.territory || '-' }}</td>
                          <td>
                            <span class="badge" [class.badge-healthy]="acc.health_status === 'HEALTHY'" [class.badge-attention]="acc.health_status !== 'HEALTHY'">
                              {{ acc.health_status }}
                            </span>
                          </td>
                          <td>{{ acc.last_contact_date ? (acc.last_contact_date | slice:0:10) : 'Never' }}</td>
                          <td style="text-align: right;">
                            <a [routerLink]="['/sales/accounts', acc.id]" class="crm-btn crm-btn-sm crm-btn-secondary">
                              360° →
                            </a>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Quiet Accounts Alert Section -->
            @if ((profile()?.quiet_accounts?.length ?? 0) > 0) {
              <div class="panel warning-panel" style="margin-top: 24px;">
                <div class="panel-header">
                  <div>
                    <h2 class="text-rose">⚠ Attention: Quiet Accounts</h2>
                    <p class="panel-sub">No recorded touchpoints in over 30 days. High risk of losing formulary compliance.</p>
                  </div>
                </div>
                <div class="mini-list">
                  @for (q of profile()?.quiet_accounts; track q.id) {
                    <div class="mini-item">
                      <div>
                        <a [routerLink]="['/sales/accounts', q.id]" class="acc-link">
                          <strong>{{ q.name }}</strong>
                        </a>
                        <div class="text-slate">Last touchpoint: {{ q.last_contact_date ? (q.last_contact_date | slice:0:10) : 'Never' }}</div>
                      </div>
                      <a [routerLink]="['/sales/accounts', q.id]" class="crm-btn crm-btn-sm crm-btn-primary">
                        Schedule Touchpoint →
                      </a>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Right: Monthly Revenue Breakdown -->
          <div class="side-panel">
            <div class="panel">
              <div class="panel-header">
                <h3>Monthly Revenue Progression</h3>
                <p class="panel-sub">Historical won revenue trajectory</p>
              </div>

              @if ((profile()?.monthly_revenue?.length ?? 0) === 0) {
                <div class="empty-state-mini">No historical monthly data recorded.</div>
              } @else {
                <div class="monthly-list">
                  @for (m of profile()?.monthly_revenue; track m.month) {
                    <div class="month-row">
                      <span class="m-name">{{ m.month }}</span>
                      <strong class="m-val">{{ formatCurrency(m.revenue) }}</strong>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rep-profile-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .breadcrumb-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 13px; }
    .back-link { color: #0284c7; text-decoration: none; font-weight: 500; }
    .back-link:hover { text-decoration: underline; }
    .sep { color: #94a3b8; }
    .crumb-current { color: #64748b; }
    .rep-header { display: flex; align-items: center; gap: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
    .rep-avatar { width: 56px; height: 56px; border-radius: 50%; background: #0284c7; color: #ffffff; display: grid; place-items: center; font-size: 20px; font-weight: 700; }
    .rep-info h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .meta-row { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; }
    .kpi-box.highlight { border-color: #a7f3d0; background: #f0fdf4; }
    .kpi-box.danger { border-color: #fecdd3; background: #fff1f2; }
    .kpi-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px; }
    .kpi-val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .progress-track { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .progress-fill { height: 100%; background: #0284c7; border-radius: 999px; }
    .profile-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
    .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .warning-panel { border-color: #fecdd3; }
    .panel-header { margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .panel-header h2, .panel-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .panel-sub { font-size: 12px; color: #64748b; margin: 0; }
    .table-container { overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; }
    .acc-link { color: #0284c7; text-decoration: none; }
    .acc-link:hover { text-decoration: underline; }
    .type-pill { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-healthy { background: #dcfce7; color: #15803d; }
    .badge-attention { background: #fef3c7; color: #b45309; }
    .mini-list { display: flex; flex-direction: column; gap: 10px; }
    .mini-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; }
    .monthly-list { display: flex; flex-direction: column; gap: 10px; }
    .month-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; }
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-rose { color: #e11d48; }
    .text-slate { color: #94a3b8; }
    .empty-state-mini { font-size: 12px; color: #94a3b8; text-align: center; padding: 20px 0; }
    .empty-table-row { text-align: center; padding: 30px !important; color: #94a3b8; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
    .crm-btn-sm { height: 28px; padding: 0 10px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover { background: #f1f5f9; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }
    @media (max-width: 1024px) { .profile-grid { grid-template-columns: 1fr; } }
  `],
})
export class RepProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);

  userId = '';
  profile = signal<RepDetailProfile | null>(null);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.userId = params.get('id') || '';
      if (this.userId) {
        this.loadProfile();
      }
    });
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salesService.getRepProfile(this.userId).subscribe({
      next: (res: any) => {
        this.profile.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load representative profile');
      },
    });
  }

  calcWidth(pct: number): number {
    return Math.min(Math.max(pct, 0), 100);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }
}
