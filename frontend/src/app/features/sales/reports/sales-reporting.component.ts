import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { ReportCatalogItem, ReportResultData } from '../../../core/sales.models';

@Component({
  selector: 'app-sales-reporting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="reports-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">AUDITED COMMERCIAL INTELLIGENCE</div>
          <h1>Sales Reporting & Natural-Language Queries</h1>
          <p class="subtitle">
            Query commercial databases using natural language or audited management reports with transparent calculation methodologies.
          </p>
        </div>
      </header>

      <!-- Natural-Language Query Bar -->
      <section class="search-section">
        <div class="search-bar-wrap">
          <span class="search-icon">✦</span>
          <input
            type="text"
            [(ngModel)]="nlPrompt"
            (keydown.enter)="askNaturalLanguage()"
            placeholder="Ask a commercial question: e.g. 'Which reps are below target?', 'Show uncontacted accounts', 'What is our pipeline win rate?'..."
            class="nl-search-input"
          />
          <button
            class="crm-btn crm-btn-primary"
            (click)="askNaturalLanguage()"
            [disabled]="loadingResult() || !nlPrompt.trim()"
          >
            @if (loadingResult()) { Running... } @else { Run Query }
          </button>
        </div>
      </section>

      <!-- Clickable Report Catalog -->
      <section class="catalog-section">
        <h3>Audited Management Report Catalog</h3>
        <p class="section-sub">Select any predefined operational query below:</p>

        <div class="catalog-grid">
          @for (item of catalog(); track item.key) {
            <article class="report-card" (click)="runPredefinedReport(item.key)">
              <div class="card-head">
                <span class="cat-pill">AUDITED REPORT</span>
                <strong>{{ item.title }}</strong>
              </div>
              <p class="card-desc">Example: <i>"{{ item.example }}"</i></p>
              <div class="card-bottom">
                <span class="run-link">Execute Report →</span>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- Query Results Area -->
      @if (loadingResult()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Executing query against audited sales database...</span>
        </div>
      } @else if (resultError()) {
        <div class="crm-alert crm-alert-warning" style="margin-top: 24px;">
          {{ resultError() }}
        </div>
      } @else if (activeResult()) {
        <section class="result-section">
          <div class="result-header">
            <div>
              <span class="eyebrow">REPORT RESULT</span>
              <h2>{{ activeResult()?.title }}</h2>
            </div>
            <span class="counter-badge">{{ activeResult()?.rows?.length || 0 }} rows returned</span>
          </div>

          <!-- Methodology / Calculation Explanation -->
          <div class="calc-explanation">
            <strong>Calculation Method & Audit Context:</strong>
            <p>{{ activeResult()?.method }}</p>
            @if (activeResult()?.interpretation) {
              <small style="display:block; margin-top: 4px; color: #166534;">
                Interpreted question: "{{ activeResult()?.interpretation?.question }}" → matched report {{ activeResult()?.interpretation?.matched_report }}
              </small>
            }
          </div>

          <!-- Dynamic Results Table -->
          <div class="table-container">
            <table class="crm-table">
              <thead>
                <tr>
                  @for (col of activeResult()?.columns; track col.key) {
                    <th>{{ col.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @if ((activeResult()?.rows?.length ?? 0) === 0) {
                  <tr>
                    <td [attr.colspan]="activeResult()?.columns?.length || 1" class="empty-table-row">
                      {{ activeResult()?.message || 'No records match the requested report parameters.' }}
                    </td>
                  </tr>
                } @else {
                  @for (row of activeResult()?.rows; track $index) {
                    <tr>
                      @for (col of activeResult()?.columns; track col.key) {
                        <td>
                          @if (col.key === 'account_name' && row['account_id']) {
                            <a [routerLink]="['/sales/accounts', row['account_id']]" class="link-acc">
                              <strong>{{ row[col.key] }}</strong>
                            </a>
                          } @else if (col.key === 'rep_name' && row['user_id']) {
                            <a [routerLink]="['/sales/team-performance', row['user_id']]" class="link-acc">
                              👤 <strong>{{ row[col.key] }}</strong>
                            </a>
                          } @else {
                            <span>{{ row[col.key] }}</span>
                          }
                        </td>
                      }
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .reports-page { padding: 24px 32px; max-width: 1440px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .search-section { margin-bottom: 24px; }
    .search-bar-wrap { display: flex; align-items: center; gap: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 6px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
    .search-icon { font-size: 18px; color: #0284c7; }
    .nl-search-input { border: none; outline: none; flex: 1; font-size: 14px; color: #0f172a; height: 40px; }
    .catalog-section h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .section-sub { font-size: 12px; color: #64748b; margin: 0 0 16px; }
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-bottom: 30px; }
    .report-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; cursor: pointer; display: flex; flex-direction: column; transition: all 0.15s ease; }
    .report-card:hover { border-color: #0284c7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .card-head { margin-bottom: 8px; }
    .cat-pill { font-size: 9px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 6px; }
    .card-head strong { display: block; font-size: 13px; color: #0f172a; }
    .card-desc { font-size: 12px; color: #64748b; flex: 1; margin: 0 0 12px; }
    .card-bottom { border-top: 1px solid #f1f5f9; padding-top: 8px; }
    .run-link { font-size: 11px; font-weight: 600; color: #0284c7; }
    .result-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
    .result-header h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 2px 0 0; }
    .counter-badge { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 999px; }
    .calc-explanation { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #166534; margin-bottom: 20px; }
    .calc-explanation p { margin: 4px 0 0; }
    .table-container { overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .link-acc { color: #0284c7; text-decoration: none; }
    .link-acc:hover { text-decoration: underline; }
    .empty-table-row { text-align: center; padding: 30px !important; color: #94a3b8; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .loading-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }
    .crm-alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 12px 16px; border-radius: 8px; }
  `],
})
export class SalesReportingComponent implements OnInit {
  private salesService = inject(SalesService);

  catalog = signal<ReportCatalogItem[]>([]);
  activeResult = signal<ReportResultData | null>(null);
  loadingResult = signal<boolean>(false);
  resultError = signal<string | null>(null);

  nlPrompt = '';

  ngOnInit(): void {
    this.salesService.getReportCatalog().subscribe({
      next: (res) => {
        this.catalog.set(res || []);
        if (res && res.length > 0) {
          this.runPredefinedReport(res[0].key);
        }
      },
      error: () => {},
    });
  }

  runPredefinedReport(reportKey: string): void {
    this.loadingResult.set(true);
    this.resultError.set(null);
    this.salesService.runReport({ report: reportKey }).subscribe({
      next: (res) => {
        this.activeResult.set(res);
        this.loadingResult.set(false);
      },
      error: (err: any) => {
        this.loadingResult.set(false);
        this.resultError.set(err?.error?.detail || 'Failed to execute report');
      },
    });
  }

  askNaturalLanguage(): void {
    if (!this.nlPrompt.trim()) return;
    this.loadingResult.set(true);
    this.resultError.set(null);
    this.salesService.askReport({ question: this.nlPrompt }).subscribe({
      next: (res) => {
        this.activeResult.set(res);
        this.loadingResult.set(false);
      },
      error: (err: any) => {
        this.loadingResult.set(false);
        this.resultError.set(err?.error?.detail || 'No report found matching your query');
      },
    });
  }
}
