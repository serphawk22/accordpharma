import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DashboardSummary, PipelineStage } from '../../core/models';

interface Activity {
  activity_type: string;
  occurred_at: string;
  notes: string | null;
}

interface DashboardAlerts {
  tenders_and_pipeline: { id: string; title: string; due_at: string }[];
  stock_risks: { id: string; severity: string; product_id: string }[];
  support_tickets: { id: string; case_number: string; priority: string }[];
}

const EMPTY_ALERTS: DashboardAlerts = {
  tenders_and_pipeline: [],
  stock_risks: [],
  support_tickets: [],
};

@Component({
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">OVERVIEW</span>
        <h1>Good day, {{ firstName() }}</h1>
        <p>Your commercial activity at a glance. Metrics are provided by your CRM workspace.</p>
      </div>
      <a mat-stroked-button routerLink="/accounts">View accounts <span aria-hidden="true">↗</span></a>
    </section>

    @if (busy()) {
      <div class="loading-panel"><mat-spinner diameter="28" /><span>Loading workspace metrics…</span></div>
    }
    @if (!busy() && connectionError()) {
      <div class="connection-banner" role="status">
        <span class="connection-icon">!</span>
        <div><b>Backend connection unavailable</b><p>{{ connectionError() }} The frontend is running independently; CRM data will appear once the API is reachable.</p></div>
        <button mat-stroked-button type="button" (click)="load()">Retry</button>
      </div>
    }
    @if (!busy() && dashboardWarnings().length) {
      <div class="data-warning" role="status"><b>Some dashboard data is unavailable</b><ul>@for (warning of dashboardWarnings(); track warning) { <li>{{ warning }}</li> }</ul></div>
    }

    <section class="metric-grid" aria-label="Key performance indicators">
      @for (metric of metrics(); track metric.label) {
        <article class="metric-card">
          <div class="metric-top"><span>{{ metric.label }}</span><span class="metric-icon" [class]="metric.tone">{{ metric.icon }}</span></div>
          @if (metric.available) { <strong>{{ metric.value }}</strong> }
          @else { <strong class="unavailable">—</strong> }
          <small>{{ metric.note }}</small>
        </article>
      }
    </section>

    <section class="main-grid">
      <article class="panel pipeline-panel">
        <div class="panel-heading"><div><h2>Opportunity pipeline</h2><p>Open opportunities by current stage</p></div><a routerLink="/pipeline">View pipeline <span>→</span></a></div>
        @if (pipeline().length) {
          <div class="chart-area">
            <div class="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
            <div class="bars">
              @for (stage of pipeline(); track stage.stage) {
                <div class="bar-column">
                  <div class="bar-total">{{ stage.count }}</div>
                  <div class="bar-track"><div class="bar" [style.height.%]="barHeight(stage)"></div></div>
                  <span class="bar-label">{{ stage.stage }}</span>
                  <small>{{ currency(stage.value) }}</small>
                </div>
              }
            </div>
          </div>
          <div class="chart-legend"><span class="legend-dot"></span>Open pipeline value <b>Weighted: {{ currency(weightedPipeline()) }}</b></div>
        } @else if (!busy()) {
          <div class="empty-chart"><span>▥</span><b>No pipeline data available</b><small>The backend returned no open opportunity stages for your access scope.</small></div>
        }
      </article>

      <article class="panel summary-panel">
        <div class="panel-heading"><div><h2>Workspace summary</h2><p>Recent activity from CRM data</p></div></div>
        <div class="summary-list">
          <div><span class="summary-icon blue">▣</span><span><b>Accounts</b><small>Accessible account records</small></span><strong>{{ summary()?.accounts ?? '—' }}</strong></div>
          <div><span class="summary-icon purple">⌁</span><span><b>Opportunities</b><small>Accessible pipeline records</small></span><strong>{{ summary()?.opportunities ?? '—' }}</strong></div>
          <div><span class="summary-icon green">◷</span><span><b>Activities</b><small>Recorded in the last 30 days</small></span><strong>{{ summary()?.activities_last_30_days ?? '—' }}</strong></div>
          <div><span class="summary-icon amber">◈</span><span><b>Open pipeline</b><small>Estimated value, not revenue</small></span><strong class="summary-value">{{ summary() ? currency(summary()!.open_pipeline_value) : '—' }}</strong></div>
        </div>
      </article>

      <article class="panel activity-panel">
        <div class="panel-heading"><div><h2>Recent activity</h2><p>Latest recorded sales engagement</p></div><a routerLink="/activities">All activities <span>→</span></a></div>
        @if (activities().length) {
          <div class="activity-list">
            @for (activity of activities(); track activity.occurred_at + activity.activity_type) {
              <div class="activity-row">
                <span class="activity-dot"></span>
                <div><b>{{ activity.activity_type }}</b><p>{{ activity.notes || 'No additional activity notes' }}</p></div>
                <time>{{ dateLabel(activity.occurred_at) }}</time>
              </div>
            }
          </div>
        } @else {
          <div class="inline-empty">No recent activities were returned by the backend.</div>
        }
      </article>

      <article class="panel alerts-panel">
        <div class="panel-heading"><div><h2>Items to review</h2><p>Alerts available to your role</p></div></div>
        @if (alertItems().length) {
          <div class="alert-list">
            @for (item of alertItems(); track item.title + item.detail) {
              <a [routerLink]="item.path" class="alert-row">
                <span class="alert-marker" [class]="item.tone">{{ item.icon }}</span>
                <span><b>{{ item.title }}</b><small>{{ item.detail }}</small></span>
                <span class="alert-arrow">→</span>
              </a>
            }
          </div>
        } @else {
          <div class="inline-empty">No alert records are currently available for your role.</div>
        }
      </article>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .page-heading { display:flex; align-items:center; justify-content:space-between; gap:18px; margin:0 0 22px; }
    .eyebrow { color:#5d8bb2; letter-spacing:1.2px; font-size:10px; font-weight:700; }
    h1 { font-size:26px; letter-spacing:-.7px; color:#1b3044; margin:7px 0 5px; }
    .page-heading p { color:#758594; font-size:12px; margin:0; }
    .page-heading a { border-radius:7px; font-size:11px; }
    .loading-panel,.connection-banner { display:flex; align-items:center; gap:14px; margin-bottom:18px; padding:14px 17px; background:#fff; border:1px solid #e3eaf0; border-radius:9px; color:#708293; font-size:12px; }
    .connection-banner { border-color:#f0d7aa; background:#fffaf0; color:#705522; }
    .connection-banner > div { flex:1; }
    .connection-banner b { font-size:12px; }
    .connection-banner p { margin:4px 0 0; color:#836f49; line-height:1.5; font-size:11px; }
    .connection-icon { width:27px; height:27px; border-radius:50%; display:grid; place-items:center; background:#f4e4c4; font-weight:800; }
    .data-warning { border:1px solid #f1dfbb; background:#fffaf0; border-radius:8px; padding:10px 14px; margin-bottom:15px; color:#745a26; font-size:10px; }
    .data-warning ul { margin:5px 0 0; padding-left:17px; line-height:1.55; }
    .metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:16px; }
    .metric-card,.panel { background:#fff; border:1px solid #e6ebf0; border-radius:10px; box-shadow:0 2px 8px #19324a05; }
    .metric-card { padding:16px 17px 15px; min-height:112px; }
    .metric-top { display:flex; align-items:center; justify-content:space-between; color:#758594; font-size:11px; }
    .metric-icon { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; font-size:14px; }
    .tone-blue { color:#2470aa; background:#eaf4fc; }.tone-violet { color:#6e5eb4; background:#f0edfb; }.tone-green { color:#27815f; background:#eaf7f1; }.tone-amber { color:#a66a1b; background:#fff3e3; }
    .metric-card strong { display:block; color:#1b3044; font-size:23px; margin-top:9px; letter-spacing:-.6px; }
    .metric-card small { display:block; color:#8b99a5; font-size:9px; margin-top:3px; }
    .metric-card .unavailable { color:#aab4bd; }
    .main-grid { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(290px,1fr); gap:15px; }
    .panel { min-width:0; padding:18px; }
    .panel-heading { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:16px; }
    .panel-heading h2 { color:#263c50; margin:0 0 5px; font-size:14px; letter-spacing:-.2px; }
    .panel-heading p { color:#8b98a4; font-size:10px; margin:0; }
    .panel-heading a { color:#2874ad; font-size:10px; text-decoration:none; white-space:nowrap; font-weight:600; margin-top:3px; }
    .chart-area { display:flex; height:218px; border-bottom:1px solid #e9edf1; }
    .chart-y { display:flex; flex-direction:column; justify-content:space-between; padding:0 9px 37px 0; color:#a1adb7; font-size:8px; }
    .bars { display:flex; align-items:stretch; justify-content:space-around; gap:13px; width:100%; background:repeating-linear-gradient(to bottom,transparent 0,transparent 42px,#edf0f3 43px); }
    .bar-column { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; min-width:0; position:relative; }
    .bar-total { font-size:9px; color:#536b7f; margin-bottom:4px; }
    .bar-track { height:152px; display:flex; align-items:flex-end; width:min(35px,65%); }
    .bar { width:100%; min-height:3px; border-radius:5px 5px 0 0; background:linear-gradient(180deg,#7db9eb,#3c84bf); }
    .bar-label { color:#526779; font-size:9px; text-transform:capitalize; margin-top:7px; white-space:nowrap; }
    .bar-column small { color:#8c99a5; font-size:8px; margin-top:4px; }
    .chart-legend { display:flex; align-items:center; gap:7px; margin-top:12px; color:#788894; font-size:9px; }
    .chart-legend b { margin-left:auto; font-weight:600; color:#576c7e; }
    .legend-dot { width:8px; height:8px; border-radius:50%; background:#4e98d0; }
    .empty-chart { height:218px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px; color:#85939f; text-align:center; }
    .empty-chart > span { color:#8eb9d9; font-size:24px; }.empty-chart b { font-size:11px; color:#53687a; }.empty-chart small { font-size:9px; }
    .summary-list { display:grid; }
    .summary-list > div { display:flex; align-items:center; gap:10px; padding:12px 0; border-bottom:1px solid #edf0f3; }
    .summary-list > div:last-child { border-bottom:0; }
    .summary-icon { width:30px; height:30px; flex:0 0 30px; display:grid; place-items:center; border-radius:8px; font-size:13px; }
    .summary-icon.blue { background:#eaf4fc; color:#3181bb; }.summary-icon.purple { background:#f1edfc; color:#7562bd; }.summary-icon.green { background:#eaf7f1; color:#31916a; }.summary-icon.amber { background:#fff3e4; color:#af792e; }
    .summary-list div > span:nth-child(2) { flex:1; display:grid; gap:4px; }
    .summary-list b { font-size:10px; color:#40566a; }.summary-list small { font-size:9px; color:#97a3ad; }
    .summary-list strong { font-size:13px; color:#293e52; }.summary-list .summary-value { font-size:10px; }
    .activity-panel,.alerts-panel { min-height:225px; }
    .activity-list { display:grid; }
    .activity-row { display:grid; grid-template-columns:9px 1fr auto; gap:10px; padding:10px 0; border-top:1px solid #f0f2f4; align-items:start; }
    .activity-dot { width:7px; height:7px; margin-top:4px; border-radius:50%; background:#68a7d5; box-shadow:0 0 0 3px #eaf4fb; }
    .activity-row b { display:block; color:#43596d; font-size:10px; text-transform:capitalize; }
    .activity-row p { color:#8d9aa5; margin:4px 0 0; font-size:9px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
    .activity-row time { color:#93a0aa; font-size:8px; white-space:nowrap; }
    .inline-empty { display:grid; place-items:center; min-height:125px; color:#94a1ac; text-align:center; font-size:10px; }
    .alert-list { display:grid; }
    .alert-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-top:1px solid #f0f2f4; text-decoration:none; }
    .alert-marker { width:29px; height:29px; display:grid; place-items:center; border-radius:8px; font-size:12px; }
    .alert-marker.amber { color:#b37b2d; background:#fff4e5; }.alert-marker.red { color:#ba5454; background:#fff0ee; }.alert-marker.blue { color:#347cae; background:#eaf4fc; }
    .alert-row > span:nth-child(2) { display:grid; gap:4px; flex:1; min-width:0; }
    .alert-row b { color:#475c6f; font-size:10px; }.alert-row small { color:#91a0ac; font-size:9px; }
    .alert-arrow { color:#9aabb7; }
    @media(max-width:1050px) { .metric-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media(max-width:720px) {
      .page-heading { align-items:flex-start; }
      .main-grid { grid-template-columns:1fr; }
      .metric-grid { gap:9px; }
      .metric-card { padding:12px; min-height:103px; }
      .metric-card strong { font-size:19px; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly firstName = computed(() => this.auth.user()?.full_name.split(/\s+/)[0] || 'there');
  readonly busy = signal(true);
  readonly connectionError = signal('');
  readonly dashboardWarnings = signal<string[]>([]);
  readonly alertsAvailable = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly pipeline = signal<PipelineStage[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly alerts = signal<DashboardAlerts>(EMPTY_ALERTS);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.connectionError.set('');
    this.dashboardWarnings.set([]);
    this.alertsAvailable.set(false);
    forkJoin({
      summary: this.api.get<DashboardSummary>('/dashboard/summary').pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 0) this.connectionError.set('FastAPI could not be reached at 127.0.0.1:8000.');
          else this.addWarning('Summary metrics could not be loaded. Check backend and database health.');
          return of(null);
        }),
      ),
      pipeline: this.api.get<PipelineStage[]>('/dashboard/pipeline').pipe(catchError(() => {
        this.addWarning('Pipeline chart is unavailable.');
        return of([]);
      })),
      activities: this.api.get<Activity[]>('/dashboard/recent-activities', { limit: 6 }).pipe(catchError(() => {
        this.addWarning('Recent activity could not be loaded.');
        return of([]);
      })),
      alerts: this.api.get<DashboardAlerts>('/dashboard/alerts', { limit: 5 }).pipe(
        catchError(() => {
          this.addWarning('Role-scoped alerts could not be loaded.');
          return of(EMPTY_ALERTS);
        }),
      ),
    }).subscribe((data) => {
      this.summary.set(data.summary);
      this.pipeline.set(data.pipeline);
      this.activities.set(data.activities);
      this.alerts.set(data.alerts);
      this.alertsAvailable.set(!this.dashboardWarnings().includes('Role-scoped alerts could not be loaded.'));
      this.busy.set(false);
    });
  }

  private addWarning(value: string): void {
    this.dashboardWarnings.update((warnings) => [...warnings, value]);
  }

  metrics(): { label: string; value: string; note: string; icon: string; tone: string; available: boolean }[] {
    const summary = this.summary();
    return [
      { label: 'Total accounts', value: String(summary?.accounts ?? '—'), note: 'Within your access scope', icon: '▣', tone: 'tone-blue', available: summary !== null },
      { label: 'Active contacts', value: '—', note: 'Not included in dashboard API', icon: '♙', tone: 'tone-violet', available: false },
      { label: 'Open opportunities', value: String(summary?.opportunities ?? '—'), note: 'Within your access scope', icon: '⌁', tone: 'tone-green', available: summary !== null },
      { label: 'Weighted pipeline', value: this.currency(this.weightedPipeline()), note: 'Calculated from returned pipeline stages', icon: '◈', tone: 'tone-amber', available: this.pipeline().length > 0 },
      { label: 'Orders this month', value: '—', note: 'Not included in dashboard API', icon: '▧', tone: 'tone-blue', available: false },
      { label: 'Pending orders', value: '—', note: 'Not included in dashboard API', icon: '▱', tone: 'tone-violet', available: false },
      { label: 'Inventory alerts', value: String(this.alerts().stock_risks.length), note: this.alertsAvailable() ? 'Open stock-risk alerts returned' : 'Alert service unavailable', icon: '!', tone: 'tone-amber', available: this.alertsAvailable() },
      { label: 'Tender deadlines', value: String(this.alerts().tenders_and_pipeline.length), note: this.alertsAvailable() ? 'Upcoming deadlines returned' : 'Alert service unavailable', icon: '◷', tone: 'tone-green', available: this.alertsAvailable() },
    ];
  }

  weightedPipeline(): string {
    return this.pipeline().reduce((total, stage) => total + Number(stage.weighted_value || 0), 0).toFixed(2);
  }

  barHeight(stage: PipelineStage): number {
    const max = Math.max(...this.pipeline().map((item) => Number(item.value) || 0), 1);
    return Math.max((Number(stage.value) / max) * 100, 2);
  }

  currency(value: string | number): string {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(number);
  }

  dateLabel(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  alertItems(): { title: string; detail: string; path: string; icon: string; tone: string }[] {
    const alerts = this.alerts();
    return [
      ...alerts.tenders_and_pipeline.map((item) => ({
        title: item.title,
        detail: `Due date · ${this.dateLabel(item.due_at)}`,
        path: item.title.startsWith('Opportunity close:') ? '/pipeline' : '/tenders',
        icon: '◷',
        tone: 'amber',
      })),
      ...alerts.stock_risks.map((item) => ({
        title: 'Stock risk alert',
        detail: `Severity ${item.severity} · Product ${item.product_id.slice(0, 8)}`,
        path: '/inventory',
        icon: '!',
        tone: 'red',
      })),
      ...alerts.support_tickets.map((item) => ({
        title: item.case_number,
        detail: `Support ticket · ${item.priority} priority`,
        path: '/support',
        icon: '◌',
        tone: 'blue',
      })),
    ].slice(0, 6);
  }
}
