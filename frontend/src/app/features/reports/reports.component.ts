import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DashboardSummary, PipelineStage } from '../../core/models';

interface SalesRow {
  owner_id: string;
  won_count: number;
  won_value: string;
}

@Component({
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="heading">
      <div><span class="eyebrow">PERFORMANCE</span><h1>Reports & analytics</h1><p>Server-calculated CRM metrics for the records visible to your role.</p></div>
      <button mat-stroked-button type="button" (click)="load()">Refresh data</button>
    </section>
    @if (loading()) { <div class="state"><mat-spinner diameter="25" />Loading reporting data…</div> }
    @if (error()) { <div class="error" role="alert"><b>Reporting data is unavailable</b><p>{{ error() }}</p><button mat-stroked-button type="button" (click)="load()">Try again</button></div> }
    <section class="report-grid">
      <article class="report-card"><span>Accounts in access scope</span><b>{{ summary()?.accounts ?? '—' }}</b><small>{{ summary() ? 'Backend aggregate' : 'Unavailable' }}</small></article>
      <article class="report-card"><span>Opportunities in access scope</span><b>{{ summary()?.opportunities ?? '—' }}</b><small>{{ summary() ? 'Backend aggregate' : 'Unavailable' }}</small></article>
      <article class="report-card"><span>Open pipeline value</span><b>{{ summary() ? money(summary()!.open_pipeline_value) : '—' }}</b><small>Estimated value, not recognized revenue</small></article>
      <article class="report-card"><span>Activities · last 30 days</span><b>{{ summary()?.activities_last_30_days ?? '—' }}</b><small>{{ summary() ? 'Backend aggregate' : 'Unavailable' }}</small></article>
    </section>
    <section class="report-grid panels">
      <article class="panel">
        <div class="panel-heading"><div><h2>Pipeline by stage</h2><p>Open opportunities returned by the backend</p></div></div>
        @if (pipeline().length) {
          <div class="stage-list">
            @for (stage of pipeline(); track stage.stage) {
              <div class="stage-row">
                <div class="stage-title"><b>{{ stage.stage }}</b><span>{{ stage.count }} opportunities · {{ money(stage.value) }}</span></div>
                <div class="stage-track"><div [style.width.%]="stageWidth(stage)"></div></div>
                <small>Weighted {{ money(stage.weighted_value) }}</small>
              </div>
            }
          </div>
        } @else if (!loading() && !error()) {
          <div class="empty">The backend returned no open pipeline-stage rows.</div>
        }
      </article>
      <article class="panel">
        <div class="panel-heading"><div><h2>Sales performance</h2><p>Won opportunities grouped by owner</p></div></div>
        @if (sales().length) {
          <div class="table-wrap"><table><thead><tr><th>Owner ID</th><th>Won</th><th>Won value</th></tr></thead><tbody>
            @for (row of sales(); track row.owner_id) { <tr><td>{{ row.owner_id }}</td><td>{{ row.won_count }}</td><td>{{ money(row.won_value) }}</td></tr> }
          </tbody></table></div>
        } @else if (!loading() && !error()) {
          <div class="empty">The backend returned no won-opportunity rows.</div>
        }
      </article>
    </section>
    <div class="limitation"><b>Reporting scope</b><span>Time-series sales, order/tender/support performance, territory comparisons and date-range filters are not exposed by the current analytics API. No data is inferred or forecast on this page.</span></div>
  `,
  styles: [`
    :host { display:block; }.heading { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:20px; }.eyebrow { color:#5d8bb2; letter-spacing:1.2px; font-size:10px; font-weight:700; }h1 { color:#1b3044; font-size:25px; letter-spacing:-.6px; margin:7px 0 5px; }.heading p { color:#758594; font-size:12px; margin:0; }.heading button { font-size:10px; }
    .report-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:13px; margin-bottom:15px; }.report-card,.panel { background:#fff; border:1px solid #e5eaf0; border-radius:10px; padding:16px; }.report-card span { display:block; color:#758594; font-size:10px; }.report-card b { display:block; margin-top:10px; color:#213a50; font-size:22px; letter-spacing:-.5px; }.report-card small { display:block; margin-top:4px; color:#8b99a5; font-size:9px; }
    .panels { grid-template-columns:repeat(2,minmax(0,1fr)); }.panel { padding:18px; }.panel-heading { margin-bottom:16px; }.panel-heading h2 { margin:0 0 5px; color:#31485c; font-size:14px; }.panel-heading p { margin:0; color:#8b98a4; font-size:10px; }
    .stage-list { display:grid; gap:17px; }.stage-title { display:flex; justify-content:space-between; gap:8px; color:#4a6073; font-size:10px; text-transform:capitalize; }.stage-title span { color:#8795a1; font-size:9px; }.stage-track { height:7px; overflow:hidden; margin:7px 0 4px; border-radius:8px; background:#edf2f5; }.stage-track div { height:100%; border-radius:8px; background:#5b9fd0; }.stage-row small { color:#82919d; font-size:9px; }
    .table-wrap { overflow-x:auto; }table { width:100%; border-collapse:collapse; text-align:left; }th { background:#f7f9fb; padding:10px; color:#8795a1; font-size:9px; }td { padding:11px 10px; border-top:1px solid #edf0f3; color:#516779; font-size:9px; }td:first-child { max-width:150px; overflow:hidden; text-overflow:ellipsis; }
    .empty,.state { min-height:150px; display:flex; align-items:center; justify-content:center; gap:10px; color:#8997a2; text-align:center; font-size:10px; }.error { border:1px solid #f1d5d2; background:#fff4f2; border-radius:8px; padding:14px; margin-bottom:15px; color:#964341; font-size:11px; }.error p { margin:5px 0 10px; font-size:10px; }.limitation { display:grid; gap:5px; margin-top:15px; padding:12px 14px; border:1px solid #dce8f0; background:#f2f8fc; border-radius:8px; color:#55738a; font-size:10px; line-height:1.5; }.limitation b { color:#365b75; }
    @media(max-width:850px) { .report-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.panels { grid-template-columns:1fr; } }
    @media(max-width:500px) { .report-grid { gap:8px; }.report-card { padding:12px; }.report-card b { font-size:18px; }.heading { align-items:flex-start; } }
  `],
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly summary = signal<DashboardSummary | null>(null);
  readonly pipeline = signal<PipelineStage[]>([]);
  readonly sales = signal<SalesRow[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      summary: this.api.get<DashboardSummary>('/dashboard/summary'),
      pipeline: this.api.get<PipelineStage[]>('/dashboard/pipeline'),
      sales: this.api.get<SalesRow[]>('/dashboard/sales-performance'),
    }).pipe(
      catchError((failure: unknown) => {
        this.error.set(
          failure instanceof HttpErrorResponse && failure.status === 0
            ? 'FastAPI is not reachable at 127.0.0.1:8000.'
            : 'One or more reporting APIs failed. Check your permissions and database health.',
        );
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        this.summary.set(result.summary);
        this.pipeline.set(result.pipeline);
        this.sales.set(result.sales);
      }
      this.loading.set(false);
    });
  }

  money(value: string): string {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(number)
      : '—';
  }

  stageWidth(stage: PipelineStage): number {
    const max = Math.max(...this.pipeline().map((item) => Number(item.value) || 0), 1);
    return Math.max((Number(stage.value) / max) * 100, 2);
  }
}
