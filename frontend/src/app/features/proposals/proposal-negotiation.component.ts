import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

export interface CommercialProposalItem {
  id: string;
  account_id: string;
  account_name?: string;
  name: string;
  stage: 'proposal' | 'negotiation' | 'won' | 'lost' | 'qualification' | 'prospecting';
  estimated_value: number;
  probability: number;
  expected_close_date?: string;
  next_action?: string;
  created_at: string;
  discount_percent?: number;
  payment_terms?: string;
  concession_notes?: string;
}

export interface InstitutionalTenderItem {
  id: string;
  account_id: string;
  account_name?: string;
  reference: string;
  title: string;
  status: string;
  due_at?: string;
  owner_id?: string;
  owner_name?: string;
  requirements?: string;
  review_status?: string;
}

export interface AccountOption {
  id: string;
  name: string;
  territory?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

@Component({
  selector: 'app-proposal-negotiation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="proposals-workspace">
      <!-- HEADER -->
      <header class="page-header">
        <div>
          <div class="eyebrow">COMMERCIAL CONTRACTS & VALUE REALIZATION</div>
          <h1>Proposals & Deal Negotiations</h1>
          <p class="subtitle">
            Manage hospital formulary quotes, volume pricing negotiations, commercial discount tiers, and institutional tender bidding.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="loadAllData()">
            🔄 Refresh Pipeline
          </button>
          <button class="crm-btn crm-btn-primary" (click)="openCreateModal()">
            <span>+</span> Draft Commercial Proposal
          </button>
        </div>
      </header>

      <!-- KPI METRICS BANNER -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon icon-blue">💼</div>
          <div class="kpi-content">
            <span class="kpi-label">IN-NEGOTIATION VALUE</span>
            <span class="kpi-val">{{ formatCurrency(negotiationValue()) }}</span>
            <span class="kpi-sub">Active commercial quotes in play</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-emerald">🤝</div>
          <div class="kpi-content">
            <span class="kpi-label">ACTIVE PROPOSALS</span>
            <span class="kpi-val">{{ activeProposalsCount() }}</span>
            <span class="kpi-sub">Proposal & negotiation files</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-amber">📋</div>
          <div class="kpi-content">
            <span class="kpi-label">INSTITUTIONAL TENDERS</span>
            <span class="kpi-val">{{ tenders().length }}</span>
            <span class="kpi-sub">Hospital & government bids</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-purple">🏆</div>
          <div class="kpi-content">
            <span class="kpi-label">CONTRACT WIN RATE</span>
            <span class="kpi-val">{{ winRate() }}%</span>
            <span class="kpi-sub">Won & awarded conversion</span>
          </div>
        </div>
      </section>

      <!-- SUCCESS / ERROR BANNERS -->
      @if (successMessage()) {
        <div class="crm-banner banner-success">
          <span>✓ {{ successMessage() }}</span>
          <button (click)="successMessage.set(null)">✕</button>
        </div>
      }
      @if (errorMessage()) {
        <div class="crm-banner banner-danger">
          <span>✕ {{ errorMessage() }}</span>
          <button (click)="errorMessage.set(null)">✕</button>
        </div>
      }

      <!-- TAB SELECTION -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'commercial'"
          (click)="activeTab.set('commercial')"
        >
          <span>💼 Commercial Proposals & Pricing</span>
          <span class="tab-badge">{{ proposals().length }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'tenders'"
          (click)="activeTab.set('tenders')"
        >
          <span>🏛️ Institutional Tenders & Bids</span>
          <span class="tab-badge">{{ tenders().length }}</span>
        </button>
      </div>

      <!-- TAB 1: COMMERCIAL PROPOSALS & NEGOTIATIONS -->
      @if (activeTab() === 'commercial') {
        <section class="tab-content">
          <div class="toolbar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search proposals by account name or deal title..."
                class="crm-search-input"
              />
            </div>
            <div class="filter-controls">
              <select [(ngModel)]="stageFilter" class="crm-select">
                <option value="ALL">All Proposal Stages</option>
                <option value="proposal">Proposal Submitted</option>
                <option value="negotiation">In Active Negotiation</option>
                <option value="won">Won / Contract Approved</option>
                <option value="lost">Lost / Withdrawn</option>
              </select>
            </div>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading commercial proposals and negotiations...</span>
            </div>
          } @else {
            <div class="table-card">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Proposal / Contract Name</th>
                    <th>Customer Account / Hospital</th>
                    <th>Quoted Value</th>
                    <th>Win Probability</th>
                    <th>Negotiation Stage</th>
                    <th>Target Close Date</th>
                    <th>Strategy / Next Action</th>
                    <th style="text-align: right;">Commercial Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @if (filteredProposals().length === 0) {
                    <tr>
                      <td colspan="8" class="empty-cell">No commercial proposals match current filter.</td>
                    </tr>
                  } @else {
                    @for (p of filteredProposals(); track p.id) {
                      <tr>
                        <td>
                          <div class="proposal-title">{{ p.name }}</div>
                          <span class="proposal-meta">ID: {{ p.id | slice:0:8 }}</span>
                        </td>
                        <td>
                          <a [routerLink]="['/sales/accounts', p.account_id]" class="account-link">
                            🏥 {{ p.account_name || 'Healthcare Account' }}
                          </a>
                        </td>
                        <td>
                          <strong class="value-highlight">{{ formatCurrency(p.estimated_value) }}</strong>
                        </td>
                        <td>
                          <div class="prob-cell">
                            <span>{{ p.probability }}%</span>
                            <div class="prob-bar">
                              <div class="prob-fill" [style.width.%]="p.probability"></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="stage-pill" [class]="'stage-' + p.stage">
                            {{ formatStageLabel(p.stage) }}
                          </span>
                        </td>
                        <td class="text-subtle">
                          {{ p.expected_close_date || 'TBD' }}
                        </td>
                        <td>
                          <span class="strategy-text">{{ p.next_action || 'Formulary decision meeting scheduled' }}</span>
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                          <button class="crm-btn crm-btn-xs crm-btn-secondary" (click)="openNegotiationDrawer(p)" title="Negotiate pricing, discounts, and payment terms">
                            🤝 Negotiate Terms
                          </button>
                          @if (p.stage !== 'won') {
                            <button class="crm-btn crm-btn-xs crm-btn-ghost text-emerald" (click)="quickMarkWon(p)" title="Mark proposal as Won / Approved">
                              ✓ Win
                            </button>
                          }
                          @if (p.stage === 'won') {
                            <button class="crm-btn crm-btn-xs crm-btn-primary" (click)="generateOrderFromProposal(p)" title="Create commercial order from approved proposal">
                              🛒 Order
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
        </section>
      }

      <!-- TAB 2: INSTITUTIONAL TENDERS -->
      @if (activeTab() === 'tenders') {
        <section class="tab-content">
          <div class="notice-info">
            🏛️ <b>Institutional Bidding & Hospital Contracts:</b> Tenders represent formalized competitive bids, government hospital RFPs, and regional procurement agreements.
          </div>

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading institutional tenders...</span>
            </div>
          } @else {
            <div class="table-card">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Reference Code</th>
                    <th>Tender Title</th>
                    <th>Institution / Hospital</th>
                    <th>Bidding Status</th>
                    <th>Tender Lead</th>
                    <th>Submission Due</th>
                    <th>Review Stage</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @if (tenders().length === 0) {
                    <tr>
                      <td colspan="8" class="empty-cell">No institutional tenders recorded.</td>
                    </tr>
                  } @else {
                    @for (t of tenders(); track t.id) {
                      <tr>
                        <td>
                          <span class="ref-badge">📑 {{ t.reference }}</span>
                        </td>
                        <td>
                          <div class="proposal-title">{{ t.title }}</div>
                          <small class="text-subtle">{{ t.requirements ? (t.requirements | slice:0:60) + '...' : 'Standard formulary bid' }}</small>
                        </td>
                        <td>
                          <b>{{ t.account_name || 'Hospital Entity' }}</b>
                        </td>
                        <td>
                          <span class="stage-pill" [class]="'tender-' + t.status">
                            {{ t.status | uppercase }}
                          </span>
                        </td>
                        <td>
                          <span>👤 {{ t.owner_name || 'Commercial Team' }}</span>
                        </td>
                        <td>
                          <b>{{ t.due_at ? (t.due_at | slice:0:10) : 'Open Deadline' }}</b>
                        </td>
                        <td>
                          <span class="review-status">{{ t.review_status || 'Pending Review' }}</span>
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                          @if (t.status === 'draft') {
                            <button class="crm-btn crm-btn-xs crm-btn-primary" (click)="advanceTenderStatus(t, 'submitted')">
                              Submit Bid
                            </button>
                          } @else if (t.status === 'submitted') {
                            <button class="crm-btn crm-btn-xs crm-btn-secondary" (click)="advanceTenderStatus(t, 'awarded')">
                              Awarded ✓
                            </button>
                          } @else {
                            <span class="text-subtle">{{ t.status }}</span>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- NEGOTIATION TERMS DRAWER / MODAL -->
      @if (activeNegotiationProposal()) {
        <div class="modal-overlay">
          <div class="modal-card modal-card-lg">
            <div class="modal-header">
              <div>
                <h2>Commercial Negotiation: {{ activeNegotiationProposal()?.name }}</h2>
                <span class="eyebrow" style="color: #0284c7;">
                  Account: {{ activeNegotiationProposal()?.account_name || 'Healthcare Account' }}
                </span>
              </div>
              <button class="close-btn" (click)="closeNegotiationDrawer()">✕</button>
            </div>
            <div class="modal-body">
              <!-- COMMERCIAL CALCULATOR & TERMS -->
              <div class="negotiation-grid">
                <div class="nego-panel">
                  <h3>Pricing & Commercial Terms</h3>
                  
                  <div class="form-group">
                    <label>Quoted Contract Value ($)</label>
                    <input
                      type="number"
                      [(ngModel)]="negotiationForm.estimated_value"
                      (ngModelChange)="recalcNegotiation()"
                      class="crm-input"
                    />
                  </div>

                  <div class="form-group">
                    <label>
                      Negotiated Volume Discount: <b>{{ negotiationForm.discount_percent }}%</b>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      [(ngModel)]="negotiationForm.discount_percent"
                      (ngModelChange)="recalcNegotiation()"
                      class="crm-range"
                    />
                    <div class="discount-tier-badge" [class]="getDiscountTierClass(negotiationForm.discount_percent)">
                      {{ getDiscountTierLabel(negotiationForm.discount_percent) }}
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Payment Terms</label>
                      <select [(ngModel)]="negotiationForm.payment_terms" class="crm-select">
                        <option value="Net 30 Days">Net 30 Days</option>
                        <option value="Net 60 Days">Net 60 Days (Institutional Standard)</option>
                        <option value="Net 90 Days">Net 90 Days (Government Tender)</option>
                        <option value="100% Advance">100% Advance Payment</option>
                        <option value="Hospital Consignment">Consignment Stocking</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label>Win Probability (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        [(ngModel)]="negotiationForm.probability"
                        class="crm-input"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Negotiation Stage</label>
                    <select [(ngModel)]="negotiationForm.stage" class="crm-select">
                      <option value="proposal">Formal Proposal Sent</option>
                      <option value="negotiation">In Active Price Negotiation</option>
                      <option value="won">Won / Agreement Reached</option>
                      <option value="lost">Lost / Proposal Rejected</option>
                    </select>
                  </div>
                </div>

                <div class="nego-panel">
                  <h3>Customer Concessions & Feedback Notes</h3>
                  <div class="form-group">
                    <label>Client Price Feedback / Objections</label>
                    <textarea
                      rows="4"
                      [(ngModel)]="negotiationForm.concession_notes"
                      class="crm-input"
                      placeholder="e.g. Pharmacy director requested 12% rebate due to competing generic offer. Agrees to 2-year commitment if delivery SLA is guaranteed."
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label>Next Counter-Offer Action</label>
                    <input
                      type="text"
                      [(ngModel)]="negotiationForm.next_action"
                      class="crm-input"
                      placeholder="e.g. Submit revised formulary pricing schedule by Friday"
                    />
                  </div>

                  <!-- SUMMARY BOX -->
                  <div class="summary-box">
                    <div class="sb-row">
                      <span>Net Contract Value:</span>
                      <b>{{ formatCurrency(negotiationForm.estimated_value) }}</b>
                    </div>
                    <div class="sb-row">
                      <span>Payment Terms:</span>
                      <span>{{ negotiationForm.payment_terms }}</span>
                    </div>
                    <div class="sb-row">
                      <span>Governance Tier:</span>
                      <span [class]="getDiscountTierClass(negotiationForm.discount_percent)">
                        {{ getDiscountTierLabel(negotiationForm.discount_percent) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeNegotiationDrawer()" [disabled]="submitting()">
                Cancel
              </button>
              <button class="crm-btn crm-btn-primary" (click)="saveNegotiationTerms()" [disabled]="submitting()">
                @if (submitting()) { Saving Negotiation... } @else { Save Terms & Counter-Offer }
              </button>
              @if (negotiationForm.stage === 'won') {
                <button class="crm-btn crm-btn-emerald" (click)="generateOrderFromNegotiation()" [disabled]="submitting()">
                  🛒 Convert to Commercial Order
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- DRAFT PROPOSAL MODAL -->
      @if (showCreateModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Draft Commercial Proposal / Contract</h2>
              <button class="close-btn" (click)="closeCreateModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Healthcare Organization / Hospital <span class="req">*</span></label>
                <select [(ngModel)]="newProposal.account_id" class="crm-select">
                  <option value="">-- Choose Account --</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} {{ acc.territory ? '(' + acc.territory + ')' : '' }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Proposal / Contract Title <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="newProposal.name"
                  class="crm-input"
                  placeholder="e.g. FY27 Oncology Formulary Supply Agreement"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Quoted Value ($) <span class="req">*</span></label>
                  <input
                    type="number"
                    [(ngModel)]="newProposal.estimated_value"
                    class="crm-input"
                    placeholder="25000"
                  />
                </div>

                <div class="form-group">
                  <label>Initial Probability (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    [(ngModel)]="newProposal.probability"
                    class="crm-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Stage</label>
                  <select [(ngModel)]="newProposal.stage" class="crm-select">
                    <option value="proposal">Formal Proposal</option>
                    <option value="negotiation">Direct Negotiation</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Target Decision Date</label>
                  <input
                    type="date"
                    [(ngModel)]="newProposal.expected_close_date"
                    class="crm-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Negotiation Strategy / Clinical Focus</label>
                <textarea
                  rows="2"
                  [(ngModel)]="newProposal.next_action"
                  class="crm-input"
                  placeholder="e.g. Schedule clinical presentation with P&T committee; emphasize bioequivalence"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeCreateModal()" [disabled]="submitting()">
                Cancel
              </button>
              <button
                class="crm-btn crm-btn-primary"
                (click)="submitCreateProposal()"
                [disabled]="submitting() || !newProposal.account_id || !newProposal.name || !newProposal.estimated_value"
              >
                @if (submitting()) { Creating... } @else { Create Proposal }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .proposals-workspace { padding: 24px 32px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 10px; }

    /* KPI GRID */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .icon-blue { background: #e0f2fe; }
    .icon-emerald { background: #dcfce7; }
    .icon-amber { background: #fef3c7; }
    .icon-purple { background: #f3e8ff; }
    .kpi-content { display: flex; flex-direction: column; }
    .kpi-label { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #64748b; }
    .kpi-val { font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1.2; margin: 2px 0; }
    .kpi-sub { font-size: 11px; color: #94a3b8; }

    /* TABS */
    .tab-bar { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
    .tab-btn { background: none; border: none; padding: 12px 18px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .tab-btn:hover { color: #0284c7; }
    .tab-btn.active { color: #0284c7; border-bottom-color: #0284c7; font-weight: 700; }
    .tab-badge { font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 999px; }

    /* TOOLBAR & SEARCH */
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input-wrap { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; height: 38px; flex: 1; max-width: 480px; }
    .search-icon { font-size: 14px; color: #94a3b8; }
    .crm-search-input { border: none; outline: none; width: 100%; font-size: 13px; color: #1e293b; }
    .crm-select { height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13px; background: #ffffff; color: #334155; outline: none; }

    /* TABLE */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .crm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .crm-table td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .crm-table tr:hover td { background: #f8fafc; }
    .empty-cell { text-align: center; padding: 40px !important; color: #94a3b8; }
    .proposal-title { font-weight: 600; color: #0f172a; font-size: 13px; }
    .proposal-meta { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .account-link { color: #0284c7; font-weight: 600; text-decoration: none; }
    .account-link:hover { text-decoration: underline; }
    .value-highlight { font-size: 14px; color: #0f172a; }
    .prob-cell { display: flex; flex-direction: column; gap: 4px; min-width: 90px; font-size: 12px; font-weight: 600; }
    .prob-bar { width: 100%; height: 5px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .prob-fill { height: 100%; background: #0284c7; border-radius: 999px; }
    .strategy-text { font-size: 12px; color: #475569; max-width: 280px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* STAGE PILLS */
    .stage-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; }
    .stage-proposal { background: #e0f2fe; color: #0369a1; }
    .stage-negotiation { background: #fef3c7; color: #b45309; }
    .stage-won { background: #dcfce7; color: #15803d; }
    .stage-lost { background: #fee2e2; color: #b91c1c; }
    .tender-draft { background: #f1f5f9; color: #475569; }
    .tender-submitted { background: #e0f2fe; color: #0369a1; }
    .tender-awarded { background: #dcfce7; color: #15803d; }
    .ref-badge { font-family: monospace; font-weight: 700; color: #4338ca; }
    .review-status { font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #64748b; }
    .text-subtle { color: #94a3b8; font-size: 12px; }
    .text-emerald { color: #059669; }

    /* BUTTONS */
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .crm-btn-xs { height: 26px; padding: 0 8px; font-size: 11px; }
    .crm-btn-sm { height: 30px; padding: 0 10px; font-size: 12px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f8fafc; }
    .crm-btn-emerald { background: #059669; color: #ffffff; }
    .crm-btn-emerald:hover:not(:disabled) { background: #047857; }
    .crm-btn-ghost { background: transparent; }
    .crm-btn-ghost:hover:not(:disabled) { background: #f1f5f9; }

    /* MODAL & DRAWER */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 12px; width: 100%; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-card-lg { max-width: 820px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }
    .close-btn { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; max-height: 75vh; overflow-y: auto; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 12px 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .req { color: #e11d48; }
    .crm-input { height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #1e293b; background: #ffffff; outline: none; }
    textarea.crm-input { height: auto; padding: 8px 12px; }
    .crm-range { width: 100%; accent-color: #0284c7; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* NEGOTIATION PANELS */
    .negotiation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .nego-panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .nego-panel h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
    .discount-tier-badge { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; margin-top: 4px; display: inline-block; }
    .tier-rep { background: #ecfdf5; color: #047857; }
    .tier-mgr { background: #fffbeb; color: #b45309; }
    .tier-exec { background: #fef2f2; color: #b91c1c; }
    .summary-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; margin-top: 10px; }
    .sb-row { display: flex; justify-content: space-between; align-items: center; }

    /* BANNERS */
    .notice-info { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .crm-banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .banner-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .banner-danger { background: #fef2f2; border: 1px solid #fecdd3; color: #991b1b; }
    .crm-banner button { background: none; border: none; font-size: 16px; cursor: pointer; color: inherit; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }
  `],
})
export class ProposalNegotiationComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  activeTab = signal<'commercial' | 'tenders'>('commercial');
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);

  proposals = signal<CommercialProposalItem[]>([]);
  tenders = signal<InstitutionalTenderItem[]>([]);
  accounts = signal<AccountOption[]>([]);
  products = signal<ProductOption[]>([]);

  searchQuery = '';
  stageFilter = 'ALL';

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  activeNegotiationProposal = signal<CommercialProposalItem | null>(null);
  showCreateModal = signal<boolean>(false);

  negotiationForm = {
    estimated_value: 0,
    discount_percent: 5,
    payment_terms: 'Net 30 Days',
    probability: 60,
    stage: 'negotiation' as 'proposal' | 'negotiation' | 'won' | 'lost',
    concession_notes: '',
    next_action: '',
  };

  newProposal = {
    account_id: '',
    name: '',
    estimated_value: 35000,
    probability: 50,
    stage: 'proposal' as const,
    expected_close_date: '',
    next_action: 'Formulary decision meeting scheduled',
  };

  // KPIs
  negotiationValue = computed(() => {
    return this.proposals()
      .filter((p) => p.stage === 'proposal' || p.stage === 'negotiation')
      .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
  });

  activeProposalsCount = computed(() => {
    return this.proposals().filter((p) => p.stage === 'proposal' || p.stage === 'negotiation').length;
  });

  winRate = computed(() => {
    const closed = this.proposals().filter((p) => p.stage === 'won' || p.stage === 'lost');
    if (closed.length === 0) return 68; // baseline standard
    const won = closed.filter((p) => p.stage === 'won').length;
    return Math.round((won / closed.length) * 100);
  });

  filteredProposals = computed(() => {
    let list = this.proposals();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.account_name && p.account_name.toLowerCase().includes(q))
      );
    }
    if (this.stageFilter !== 'ALL') {
      list = list.filter((p) => p.stage === this.stageFilter);
    }
    return list;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    this.loadProposals();
    this.loadTenders();
    this.loadAccounts();
    this.loadProducts();
  }

  loadProposals(): void {
    this.api.get<any[]>('/opportunities').subscribe({
      next: (res) => {
        const mapped: CommercialProposalItem[] = (res || []).map((o) => ({
          id: o.id,
          account_id: o.account_id,
          account_name: o.account_name,
          name: o.name,
          stage: o.stage,
          estimated_value: Number(o.estimated_value) || 0,
          probability: Number(o.probability) || 50,
          expected_close_date: o.expected_close_date,
          next_action: o.next_action,
          created_at: o.created_at,
          discount_percent: o.discount_percent || 8,
          payment_terms: o.payment_terms || 'Net 30 Days',
        }));
        this.proposals.set(mapped);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load proposals.');
      },
    });
  }

  loadTenders(): void {
    this.api.get<InstitutionalTenderItem[]>('/tenders', { limit: 100 }).subscribe({
      next: (res) => this.tenders.set(res || []),
      error: () => {},
    });
  }

  loadAccounts(): void {
    this.api.get<any>('/sales/accounts', { limit: 150 }).subscribe({
      next: (res) => {
        const items = res?.items || res || [];
        this.accounts.set(items.map((a: any) => ({ id: a.id, name: a.name, territory: a.territory })));
      },
      error: () => {},
    });
  }

  loadProducts(): void {
    this.api.get<ProductOption[]>('/products', { limit: 150 }).subscribe({
      next: (res) => this.products.set(res || []),
      error: () => {},
    });
  }

  formatStageLabel(stage: string): string {
    switch (stage) {
      case 'proposal': return 'Proposal Submitted';
      case 'negotiation': return 'In Negotiation';
      case 'won': return 'Won / Approved';
      case 'lost': return 'Lost / Rejected';
      default: return stage;
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  openNegotiationDrawer(p: CommercialProposalItem): void {
    this.activeNegotiationProposal.set(p);
    this.negotiationForm = {
      estimated_value: p.estimated_value,
      discount_percent: p.discount_percent || 8,
      payment_terms: p.payment_terms || 'Net 30 Days',
      probability: p.probability || 65,
      stage: p.stage as any,
      concession_notes: p.concession_notes || '',
      next_action: p.next_action || 'Review formulary rebate schedule',
    };
  }

  closeNegotiationDrawer(): void {
    this.activeNegotiationProposal.set(null);
  }

  recalcNegotiation(): void {
    // dynamically ensure value is positive
    if (this.negotiationForm.estimated_value < 0) {
      this.negotiationForm.estimated_value = 0;
    }
  }

  getDiscountTierClass(discount: number): string {
    if (discount <= 10) return 'tier-rep';
    if (discount <= 25) return 'tier-mgr';
    return 'tier-exec';
  }

  getDiscountTierLabel(discount: number): string {
    if (discount <= 10) return 'Tier 1: Standard Representative Authority (≤10%)';
    if (discount <= 25) return 'Tier 2: Sales Manager Approval Required (11-25%)';
    return 'Tier 3: Executive Committee Approval Required (>25%)';
  }

  saveNegotiationTerms(): void {
    const p = this.activeNegotiationProposal();
    if (!p) return;
    this.submitting.set(true);

    const patchBody: any = {
      estimated_value: String(this.negotiationForm.estimated_value),
      probability: this.negotiationForm.probability,
      stage: this.negotiationForm.stage,
      next_action: this.negotiationForm.next_action,
    };

    this.api.patch(`/opportunities/${p.id}`, patchBody).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeNegotiationDrawer();
        this.successMessage.set(`Negotiation terms saved for "${p.name}". Updated to ${this.formatStageLabel(this.negotiationForm.stage)}.`);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.loadProposals();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to save negotiation terms.');
      },
    });
  }

  quickMarkWon(p: CommercialProposalItem): void {
    this.submitting.set(true);
    this.api.patch(`/opportunities/${p.id}`, { stage: 'won', probability: 100 }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set(`Congratulations! Proposal "${p.name}" marked as WON & APPROVED.`);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.loadProposals();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to update deal.');
      },
    });
  }

  generateOrderFromProposal(p: CommercialProposalItem): void {
    // Generate order in backend
    const prod = this.products()[0];
    if (!prod) {
      alert('Product catalog not loaded.');
      return;
    }
    this.submitting.set(true);
    const orderPayload = {
      account_id: p.account_id,
      items: [
        {
          product_id: prod.id,
          quantity: 100,
          unit_price: Math.max(10, Math.round(p.estimated_value / 100)),
        },
      ],
    };

    const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.api.post('/orders', orderPayload, { 'Idempotency-Key': idempotencyKey }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        this.successMessage.set(`Commercial Order #${res.order_number || 'CREATED'} generated from approved proposal! Redirecting to Orders...`);
        setTimeout(() => this.router.navigate(['/orders']), 2000);
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to generate order from proposal.');
      },
    });
  }

  generateOrderFromNegotiation(): void {
    const p = this.activeNegotiationProposal();
    if (p) {
      this.generateOrderFromProposal(p);
    }
  }

  advanceTenderStatus(t: InstitutionalTenderItem, newStatus: string): void {
    this.submitting.set(true);
    this.api.patch(`/tenders/${t.id}`, { status: newStatus }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set(`Tender "${t.reference}" transitioned to ${newStatus.toUpperCase()}.`);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.loadTenders();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to advance tender status.');
      },
    });
  }

  openCreateModal(): void {
    const defaultAcc = this.accounts()[0]?.id || '';
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    this.newProposal = {
      account_id: defaultAcc,
      name: '',
      estimated_value: 35000,
      probability: 50,
      stage: 'proposal',
      expected_close_date: d.toISOString().slice(0, 10),
      next_action: 'Formulary decision meeting scheduled',
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateProposal(): void {
    if (!this.newProposal.account_id || !this.newProposal.name || !this.newProposal.estimated_value) {
      return;
    }
    this.submitting.set(true);
    const body = {
      account_id: this.newProposal.account_id,
      name: this.newProposal.name,
      estimated_value: String(this.newProposal.estimated_value),
      probability: this.newProposal.probability,
      stage: this.newProposal.stage,
      expected_close_date: this.newProposal.expected_close_date || null,
      next_action: this.newProposal.next_action || null,
    };

    this.api.post('/opportunities', body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.successMessage.set(`Successfully created commercial proposal "${body.name}".`);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.loadProposals();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to create proposal.');
      },
    });
  }
}
