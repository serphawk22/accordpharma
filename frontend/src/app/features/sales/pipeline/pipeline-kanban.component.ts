import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { AuthService } from '../../../core/auth.service';
import {
  PipelineData,
  OpportunityCardItem,
  AccountCardItem,
  OpportunityDetailData,
} from '../../../core/sales.models';

const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

@Component({
  selector: 'app-pipeline-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="pipeline-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <div class="eyebrow">COMMERCIAL PIPELINE & DEALS</div>
          <h1>Sales Pipeline</h1>
          <p class="subtitle">
            Visual progression of pharmaceutical commercial opportunities across contract stages.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="toggleViewMode()">
            {{ viewMode === 'kanban' ? '☰ Switch to Table View' : '◫ Switch to Kanban' }}
          </button>
          <button class="crm-btn crm-btn-primary" (click)="openCreateOppModal()">
            <span>+</span> New Opportunity
          </button>
        </div>
      </header>

      <!-- Pipeline Analytics Strip -->
      @if (pipelineData()) {
        <section class="analytics-strip">
          <div class="stat-card">
            <span class="stat-lbl">Active Pipeline Value</span>
            <div class="stat-val text-blue">{{ formatCurrency(pipelineData()?.totals?.pipeline_value || 0) }}</div>
            <span class="stat-sub">Across open stages</span>
          </div>
          <div class="stat-card">
            <span class="stat-lbl">Weighted Pipeline</span>
            <div class="stat-val text-emerald">{{ formatCurrency(pipelineData()?.totals?.weighted_pipeline_value || 0) }}</div>
            <span class="stat-sub">{{ pipelineData()?.totals?.weighted_method || 'Probability adjusted' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-lbl">Open Deals Count</span>
            <div class="stat-val text-purple">{{ pipelineData()?.totals?.open_count || 0 }}</div>
            <span class="stat-sub">In negotiation / review</span>
          </div>
          <div class="stat-card">
            <span class="stat-lbl">Total Opportunities</span>
            <div class="stat-val">{{ allOpportunities().length }}</div>
            <span class="stat-sub">In pipeline scope</span>
          </div>
        </section>
      }

      @if (loading()) {
        <div class="loading-panel">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading sales pipeline...</span>
        </div>
      } @else if (errorMessage()) {
        <div class="crm-alert crm-alert-warning">
          {{ errorMessage() }}
          <button class="crm-btn crm-btn-secondary" style="margin-left: 12px;" (click)="loadPipeline()">Retry</button>
        </div>
      } @else {
        <!-- VIEW: KANBAN BOARD -->
        @if (viewMode === 'kanban') {
          <div class="kanban-board">
            @for (stage of stages; track stage) {
              <div class="kanban-column" [class]="'col-' + stage.toLowerCase()">
                <div class="column-header">
                  <div class="col-title-wrap">
                    <span class="col-dot">●</span>
                    <h3>{{ stage }}</h3>
                  </div>
                  <div class="col-meta">
                    <span class="count-pill">{{ getColumnOpps(stage).length }}</span>
                    <span class="sum-pill">{{ formatCurrency(getColumnSum(stage)) }}</span>
                  </div>
                </div>

                <div class="cards-dropzone">
                  @for (opp of getColumnOpps(stage); track opp.id) {
                    <article class="opp-card" (click)="openDetailDrawer(opp)">
                      <div class="card-head">
                        <strong class="opp-name">{{ opp.name }}</strong>
                        <span class="opp-value">{{ formatCurrency(opp.estimated_value) }}</span>
                      </div>
                      <div class="card-acc">
                        <a [routerLink]="['/sales/accounts', opp.account_id]" (click)="$event.stopPropagation()" class="acc-link">
                          🏢 {{ opp.account_name || 'Account' }}
                        </a>
                      </div>
                      <div class="card-meta-row">
                        <span class="close-date">📅 {{ opp.expected_close_date || 'No date' }}</span>
                        <span class="owner-pill">👤 {{ opp.owner_name || 'Unassigned' }}</span>
                      </div>
                      @if (opp.stage.toUpperCase() === 'LOST' && opp.lost_reason) {
                        <div class="lost-reason-tag">
                          Reason: {{ opp.lost_reason }}
                        </div>
                      }

                      <!-- Quick Stage Transition Selector -->
                      <div class="card-quick-actions" (click)="$event.stopPropagation()">
                        <label>Move stage:</label>
                        <select
                          [ngModel]="opp.stage.toUpperCase()"
                          (ngModelChange)="onStageSelectChanged(opp, $event)"
                          class="stage-select-sm"
                        >
                          @for (s of stages; track s) {
                            <option [value]="s">{{ s }}</option>
                          }
                        </select>
                      </div>

                      @if (opp.stage.toUpperCase() === 'WON') {
                        <div class="card-convert-order" (click)="$event.stopPropagation()">
                          <a [routerLink]="['/orders']" class="won-order-btn">
                            📦 Create Commercial Order →
                          </a>
                        </div>
                      }
                    </article>
                  }
                  @if (getColumnOpps(stage).length === 0) {
                    <div class="empty-col">No deals in this stage</div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- VIEW: TABLE LIST -->
          <div class="table-container">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Account</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Close Date</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (opp of allOpportunities(); track opp.id) {
                  <tr>
                    <td>
                      <button class="link-btn" (click)="openDetailDrawer(opp)">
                        <strong>{{ opp.name }}</strong>
                      </button>
                    </td>
                    <td>
                      <a [routerLink]="['/sales/accounts', opp.account_id]" class="acc-link">
                        {{ opp.account_name || 'Account' }}
                      </a>
                    </td>
                    <td><span class="badge badge-subtle">{{ opp.stage }}</span></td>
                    <td><strong>{{ formatCurrency(opp.estimated_value) }}</strong></td>
                    <td>{{ opp.expected_close_date || '-' }}</td>
                    <td>{{ opp.owner_name || 'Unassigned' }}</td>
                    <td><span class="badge badge-subtle">{{ opp.priority | uppercase }}</span></td>
                    <td style="text-align: right;">
                      <button class="crm-btn crm-btn-sm crm-btn-secondary" (click)="openDetailDrawer(opp)">Details →</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- DETAIL DRAWER -->
      @if (selectedOppDetail()) {
        <div class="drawer-backdrop" (click)="closeDetailDrawer()">
          <div class="drawer-panel" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div>
                <span class="eyebrow">OPPORTUNITY DETAIL</span>
                <h2>{{ selectedOppDetail()?.opportunity?.name }}</h2>
              </div>
              <button class="close-btn" (click)="closeDetailDrawer()">✕</button>
            </div>
            <div class="drawer-body">
              <div class="drawer-kpi">
                <div>
                  <span class="lbl">Estimated Value</span>
                  <div class="val text-blue">{{ formatCurrency(selectedOppDetail()?.opportunity?.estimated_value || 0) }}</div>
                </div>
                <div>
                  <span class="lbl">Current Stage</span>
                  <div class="val">{{ selectedOppDetail()?.opportunity?.stage }}</div>
                </div>
                <div>
                  <span class="lbl">Target Close</span>
                  <div class="val">{{ selectedOppDetail()?.opportunity?.expected_close_date || '-' }}</div>
                </div>
              </div>

              <div class="drawer-section">
                <h3>Account & Fulfillment</h3>
                <p>
                  Associated with
                  <a [routerLink]="['/sales/accounts', selectedOppDetail()?.opportunity?.account_id]" class="acc-link">
                    <b>{{ selectedOppDetail()?.opportunity?.account_name }}</b>
                  </a>
                </p>
                <p>Owner: <b>{{ selectedOppDetail()?.opportunity?.owner_name || 'Unassigned' }}</b></p>
                <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                  <a [routerLink]="['/sales/accounts', selectedOppDetail()?.opportunity?.account_id]" class="crm-btn crm-btn-secondary crm-btn-sm" style="text-decoration: none;">
                    🏢 View Account 360° Profile
                  </a>
                  <a [routerLink]="['/orders']" class="crm-btn crm-btn-primary crm-btn-sm" style="text-decoration: none;">
                    📦 Create Commercial Order
                  </a>
                </div>
              </div>

              <!-- Stage Progression History -->
              <div class="drawer-section">
                <h3>Stage Progression History</h3>
                @if ((selectedOppDetail()?.stage_history?.length ?? 0) === 0) {
                  <p class="empty-state-mini">No recorded stage transitions yet.</p>
                } @else {
                  <div class="timeline-stream-mini">
                    @for (sh of selectedOppDetail()?.stage_history; track sh.id) {
                      <div class="sh-entry">
                        <div class="sh-head">
                          <span class="sh-stage">{{ sh.to_stage }}</span>
                          <span class="sh-time">{{ sh.changed_at | slice:0:16 }}</span>
                        </div>
                        <div class="sh-author">Changed by {{ sh.changed_by || 'User' }} ({{ sh.days_in_stage }} days in stage)</div>
                        @if (sh.note) {
                          <div class="sh-lost">Note: <i>{{ sh.note }}</i></div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Linked Tasks -->
              <div class="drawer-section">
                <h3>Open Follow-up Tasks ({{ selectedOppDetail()?.tasks?.length || 0 }})</h3>
                <div class="mini-list">
                  @for (t of selectedOppDetail()?.tasks; track t.id) {
                    <div class="mini-item">
                      <div>
                        <strong>{{ t.title }}</strong>
                        <div class="text-slate">Due: {{ t.due_at | slice:0:10 }}</div>
                      </div>
                      <span class="badge" [class.badge-healthy]="t.status === 'completed'">{{ t.status }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
            <div class="drawer-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeDetailDrawer()">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Lost Reason Required -->
      @if (showLostReasonModal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-sm">
            <div class="modal-header">
              <h2>Mark Deal as Lost</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-sub">
                A valid reason is required for compliance and pipeline analytics before closing this deal as lost.
              </p>
              <div class="form-group">
                <label>Loss Category / Reason <span class="required">*</span></label>
                <select [(ngModel)]="lostReasonCategory" class="crm-select">
                  <option value="Competitor price undercut">Competitor price undercut</option>
                  <option value="Hospital formulary committee rejected">Hospital formulary committee rejected</option>
                  <option value="Budget constraints / Freeze">Budget constraints / Freeze</option>
                  <option value="Clinical preference for existing standard">Clinical preference for existing standard</option>
                  <option value="Project cancelled / Postponed">Project cancelled / Postponed</option>
                  <option value="Other">Other reason...</option>
                </select>
              </div>
              <div class="form-group">
                <label>Additional Notes / Detail</label>
                <textarea rows="3" [(ngModel)]="lostReasonNotes" class="crm-input" placeholder="Explain competitor or committee feedback..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="confirmTransitionToLost()" [disabled]="submitting() || !lostReasonCategory">
                @if (submitting()) { Confirming... } @else { Confirm Lost Stage }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: New Opportunity -->
      @if (showCreateOppModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Create New Sales Opportunity</h2>
              <button class="close-btn" (click)="closeModals()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Select Target Account <span class="required">*</span></label>
                <select [(ngModel)]="createOppForm.account_id" class="crm-select">
                  <option value="">-- Choose Account --</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} ({{ acc.account_type }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Opportunity / Deal Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="createOppForm.name" class="crm-input" placeholder="e.g. Cardiovax Q3 Supply Tender" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Estimated Value (USD) <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="createOppForm.estimated_value" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Initial Stage</label>
                  <select [(ngModel)]="createOppForm.stage" class="crm-select">
                    <option value="PROSPECTING">Prospecting</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Expected Close Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="createOppForm.expected_close_date" class="crm-input" />
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select [(ngModel)]="createOppForm.priority" class="crm-select">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeModals()" [disabled]="submitting()">Cancel</button>
              <button class="crm-btn crm-btn-primary" (click)="submitCreateOpp()" [disabled]="submitting() || !createOppForm.account_id || !createOppForm.name">
                @if (submitting()) { Creating... } @else { Create Opportunity }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pipeline-page { padding: 24px 32px; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 12px; }
    .analytics-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
    .stat-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; display: block; }
    .stat-val { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.1; margin-bottom: 4px; }
    .stat-sub { font-size: 11px; color: #94a3b8; }
    .kanban-board { display: grid; grid-template-columns: repeat(6, minmax(240px, 1fr)); gap: 14px; overflow-x: auto; padding-bottom: 24px; }
    .kanban-column { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; flex-direction: column; min-height: 600px; }
    .column-header { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #ffffff; border-radius: 10px 10px 0 0; }
    .col-title-wrap { display: flex; align-items: center; gap: 8px; }
    .col-title-wrap h3 { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: 0.4px; }
    .col-dot { font-size: 10px; color: #0284c7; }
    .col-meta { display: flex; align-items: center; gap: 6px; }
    .count-pill { font-size: 10px; font-weight: 700; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 999px; }
    .sum-pill { font-size: 11px; font-weight: 600; color: #64748b; }
    .cards-dropzone { padding: 12px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .opp-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.15s ease; }
    .opp-card:hover { border-color: #0284c7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .opp-name { font-size: 13px; color: #0f172a; line-height: 1.3; flex: 1; margin-right: 8px; }
    .opp-value { font-size: 13px; font-weight: 700; color: #0284c7; white-space: nowrap; }
    .card-acc { margin-bottom: 8px; font-size: 11px; }
    .acc-link { color: #475569; text-decoration: none; font-weight: 500; }
    .acc-link:hover { color: #0284c7; text-decoration: underline; }
    .card-meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
    .lost-reason-tag { font-size: 11px; color: #991b1b; background: #fee2e2; padding: 3px 6px; border-radius: 4px; margin-bottom: 8px; }
    .card-quick-actions { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 8px; font-size: 11px; color: #64748b; }
    .stage-select-sm { font-size: 10px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; background: #ffffff; outline: none; }
    .card-convert-order { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; }
    .won-order-btn { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; color: #059669; text-decoration: none; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0; }
    .won-order-btn:hover { background: #d1fae5; }
    .empty-col { text-align: center; padding: 30px 10px; color: #94a3b8; font-size: 12px; font-style: italic; }

    /* Drawer Styles */
    .drawer-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); z-index: 1000; display: flex; justify-content: flex-end; }
    .drawer-panel { width: 480px; background: #ffffff; height: 100%; box-shadow: -10px 0 25px -5px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
    .drawer-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; }
    .drawer-header h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 4px 0 0; }
    .drawer-body { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .drawer-kpi { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .drawer-kpi .lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block; }
    .drawer-kpi .val { font-size: 14px; font-weight: 700; color: #0f172a; }
    .drawer-section h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 10px; }
    .timeline-stream-mini { display: flex; flex-direction: column; gap: 12px; border-left: 2px solid #e2e8f0; padding-left: 14px; margin-left: 6px; }
    .sh-entry { font-size: 12px; }
    .sh-head { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .sh-stage { font-weight: 700; color: #0284c7; }
    .sh-time { color: #94a3b8; font-size: 11px; }
    .sh-author { color: #64748b; font-size: 11px; }
    .sh-lost { color: #991b1b; font-size: 11px; margin-top: 2px; }
    .drawer-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; }

    /* Common */
    .text-emerald { color: #059669; }
    .text-blue { color: #0284c7; }
    .text-purple { color: #7c3aed; }
    .text-slate { color: #64748b; }
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
    .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .crm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .link-btn { background: none; border: 0; color: #0284c7; cursor: pointer; padding: 0; font-size: 13px; text-align: left; }
    .link-btn:hover { text-decoration: underline; }
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; }
    .crm-btn-sm { height: 28px; padding: 0 10px; font-size: 11px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-healthy { background: #dcfce7; color: #15803d; }
    .badge-subtle { background: #f1f5f9; color: #475569; }
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
export class PipelineKanbanComponent implements OnInit {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);

  stages = STAGES;
  viewMode: 'kanban' | 'table' = 'kanban';

  pipelineData = signal<PipelineData | null>(null);
  allOpportunities = signal<OpportunityCardItem[]>([]);
  accounts = signal<AccountCardItem[]>([]);

  selectedOppDetail = signal<OpportunityDetailData | null>(null);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  submitting = signal<boolean>(false);

  showLostReasonModal = signal<boolean>(false);
  showCreateOppModal = signal<boolean>(false);

  pendingLostOpp = signal<OpportunityCardItem | null>(null);
  lostReasonCategory = 'Competitor price undercut';
  lostReasonNotes = '';

  createOppForm = {
    account_id: '',
    name: '',
    estimated_value: 35000,
    stage: 'PROSPECTING',
    expected_close_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    priority: 'normal',
  };

  ngOnInit(): void {
    this.loadPipeline();
    this.loadAccounts();
  }

  loadPipeline(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salesService.getPipeline().subscribe({
      next: (res) => {
        this.pipelineData.set(res);
        this.allOpportunities.set(res.items || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load pipeline kanban');
      },
    });
  }

  loadAccounts(): void {
    this.salesService.getAccounts().subscribe({
      next: (res) => this.accounts.set(res.items || []),
      error: () => {},
    });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'kanban' ? 'table' : 'kanban';
  }

  getColumnOpps(stage: string): OpportunityCardItem[] {
    return this.allOpportunities().filter((o) => o.stage.toUpperCase() === stage.toUpperCase());
  }

  getColumnSum(stage: string): number {
    const opps = this.getColumnOpps(stage);
    return opps.reduce((acc, cur) => acc + (cur.estimated_value || 0), 0);
  }

  onStageSelectChanged(opp: OpportunityCardItem, newStage: string): void {
    if (newStage.toUpperCase() === opp.stage.toUpperCase()) return;

    if (newStage.toUpperCase() === 'LOST') {
      this.pendingLostOpp.set(opp);
      this.lostReasonCategory = 'Competitor price undercut';
      this.lostReasonNotes = '';
      this.showLostReasonModal.set(true);
      return;
    }

    this.salesService.patchOpportunity(opp.id, { stage: newStage }).subscribe({
      next: () => {
        this.loadPipeline();
      },
      error: (err: any) => {
        alert(err?.error?.detail || 'Failed to transition stage');
      },
    });
  }

  confirmTransitionToLost(): void {
    const opp = this.pendingLostOpp();
    if (!opp) return;
    this.submitting.set(true);
    const fullReason = this.lostReasonNotes
      ? `${this.lostReasonCategory}: ${this.lostReasonNotes}`
      : this.lostReasonCategory;

    this.salesService
      .patchOpportunity(opp.id, {
        stage: 'LOST',
        lost_reason: fullReason,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showLostReasonModal.set(false);
          this.loadPipeline();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to record lost stage');
        },
      });
  }

  openDetailDrawer(opp: OpportunityCardItem): void {
    this.salesService.getOpportunityDetail(opp.id).subscribe({
      next: (res) => this.selectedOppDetail.set(res),
      error: () => {},
    });
  }

  closeDetailDrawer(): void {
    this.selectedOppDetail.set(null);
  }

  openCreateOppModal(): void {
    this.createOppForm = {
      account_id: this.accounts()[0]?.id || '',
      name: '',
      estimated_value: 35000,
      stage: 'PROSPECTING',
      expected_close_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      priority: 'normal',
    };
    this.showCreateOppModal.set(true);
  }

  submitCreateOpp(): void {
    if (!this.createOppForm.account_id || !this.createOppForm.name) return;
    this.submitting.set(true);
    this.salesService
      .createOpportunity({
        account_id: this.createOppForm.account_id,
        name: this.createOppForm.name,
        estimated_value: this.createOppForm.estimated_value,
        stage: this.createOppForm.stage,
        expected_close_date: this.createOppForm.expected_close_date,
        priority: this.createOppForm.priority,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showCreateOppModal.set(false);
          this.loadPipeline();
        },
        error: (err: any) => {
          this.submitting.set(false);
          alert(err?.error?.detail || 'Failed to create opportunity');
        },
      });
  }

  closeModals(): void {
    this.showLostReasonModal.set(false);
    this.showCreateOppModal.set(false);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }
}
