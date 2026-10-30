import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { ApiService } from '../../../core/api.service';
import { HospitalFormularyItem } from '../../../core/models';

@Component({
  selector: 'app-formulary-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="formulary-workspace">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <span class="eyebrow">MARKET ACCESS · INSTITUTIONAL OPERATIONS</span>
          <h1>Hospital Formulary & P&T Committee Access Tracker</h1>
          <p class="subtitle">
            Surveillance of hospital formulary tier placements, Pharmacy & Therapeutics (P&T) committee review milestones, and competitor drug displacement across health systems.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" (click)="openUpdateModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Record P&T Decision / Tier
          </button>
        </div>
      </header>

      <!-- KPI SUMMARY CARDS -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">EVALUATED HEALTH SYSTEMS</span>
            <span class="kpi-badge neutral">Institutions</span>
          </div>
          <div class="kpi-value">{{ summary().total_evaluated_institutions }}</div>
          <div class="kpi-subtext">Hospitals & cancer centers tracked</div>
        </div>

        <div class="kpi-card green-accent">
          <div class="kpi-header">
            <span class="kpi-label">TIER 1 PREFERRED ACCESS</span>
            <span class="kpi-badge green">First-Line Protocol</span>
          </div>
          <div class="kpi-value">{{ summary().tier1_preferred_access_rate }}%</div>
          <div class="kpi-subtext">Unrestricted hospital formulary access</div>
        </div>

        <div class="kpi-card gold-accent">
          <div class="kpi-header">
            <span class="kpi-label">PENDING P&T COMMITTEE REVIEWS</span>
            <span class="kpi-badge gold">Active Dossiers</span>
          </div>
          <div class="kpi-value">{{ summary().pending_pt_committee_reviews }}</div>
          <div class="kpi-subtext">Dossiers undergoing pharmacoeconomic review</div>
        </div>

        <div class="kpi-card blue-accent">
          <div class="kpi-header">
            <span class="kpi-label">ANNUAL OPPORTUNITY PIPELINE</span>
            <span class="kpi-badge blue">Commercial</span>
          </div>
          <div class="kpi-value">\${{ (summary().annual_pipeline_opportunity_value / 1000) | number:'1.0-0' }}k</div>
          <div class="kpi-subtext">Annual contract volume upon P&T approval</div>
        </div>
      </section>

      <!-- TOOLBAR -->
      <section class="toolbar-card">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lens-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Search by hospital, product, physician champion, or displaced drug..."
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event.target).value)"
          />
        </div>

        <div class="filter-controls">
          <select [value]="selectedTier()" (change)="selectedTier.set($any($event.target).value)">
            <option value="">All Formulary Tiers</option>
            <option value="Tier 1">Tier 1: Preferred / First-Line</option>
            <option value="Tier 2">Tier 2: Prior Authorization Required</option>
            <option value="Tier 3">Tier 3: Specialist Restricted</option>
            <option value="Non-Formulary">Non-Formulary: Off-Protocol</option>
          </select>

          <select [value]="selectedPtStatus()" (change)="selectedPtStatus.set($any($event.target).value)">
            <option value="">All P&T Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Under Review">Under Review</option>
            <option value="Dossier Submitted">Dossier Submitted</option>
            <option value="Deferred">Deferred</option>
          </select>

          <select [value]="selectedTerritory()" (change)="selectedTerritory.set($any($event.target).value)">
            <option value="">All Territories</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
      </section>

      <!-- FORMULARY LIST TABLE -->
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading hospital formulary and P&T access data...</p>
        </div>
      } @else if (filteredItems().length === 0) {
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>No formulary records match your filter</h3>
          <p>Try resetting filters or record a new hospital formulary placement.</p>
        </div>
      } @else {
        <div class="table-container">
          <table class="formulary-table">
            <thead>
              <tr>
                <th>Hospital / Health System</th>
                <th>Therapeutic Product</th>
                <th>Formulary Tier Access</th>
                <th>P&T Review Status</th>
                <th>Physician Champion</th>
                <th>Competitor Displaced</th>
                <th>Annual Potential</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr>
                  <td>
                    <div class="hospital-name">
                      <a [routerLink]="['/accounts', item.account_id]" class="hospital-link">
                        {{ item.account_name }}
                      </a>
                    </div>
                    <small class="territory-tag">{{ item.territory }}</small>
                  </td>

                  <td>
                    <div class="prod-name">{{ item.product_name }}</div>
                    <small class="prod-sku">{{ item.category }}</small>
                  </td>

                  <td>
                    <span
                      class="tier-badge"
                      [class.tier-1]="item.formulary_tier.includes('Tier 1')"
                      [class.tier-2]="item.formulary_tier.includes('Tier 2')"
                      [class.tier-3]="item.formulary_tier.includes('Tier 3')"
                      [class.tier-non]="item.formulary_tier.includes('Non-Formulary')"
                    >
                      {{ item.formulary_tier }}
                    </span>
                  </td>

                  <td>
                    <div class="pt-status-pill" [class.approved]="item.pt_status === 'Approved'" [class.review]="item.pt_status === 'Under Review'">
                      ● {{ item.pt_status }}
                    </div>
                    @if (item.pt_meeting_date) {
                      <small class="meeting-date">Next P&T: {{ item.pt_meeting_date | date:'mediumDate' }}</small>
                    }
                  </td>

                  <td>
                    <div class="champion-name">{{ item.physician_champion || 'CMO Office' }}</div>
                    @if (item.protocol_requirements) {
                      <small class="protocol-hint" [title]="item.protocol_requirements">
                        {{ item.protocol_requirements | slice:0:36 }}...
                      </small>
                    }
                  </td>

                  <td>
                    <span class="displaced-tag">{{ item.competitor_displaced || 'Standard of Care' }}</span>
                  </td>

                  <td>
                    <strong class="potential-val">\${{ item.annual_potential_value | number:'1.0-0' }}</strong>
                  </td>

                  <td>
                    <button type="button" class="btn-sm" (click)="openEditModal(item)">
                      Edit
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODAL: RECORD / UPDATE FORMULARY -->
      @if (showModal()) {
        <div class="modal-scrim" (click)="showModal.set(false)"></div>
        <div class="modal-dialog" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Record Hospital Formulary & P&T Milestone</h3>
            <button type="button" class="close-btn" (click)="showModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="submitFormulary()" class="modal-form">
            <div class="form-row">
              <label>Hospital Account *</label>
              <select [(ngModel)]="modalData.account_id" name="account_id" required>
                <option value="">-- Choose Health System --</option>
                @for (acc of accountOptions(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} ({{ acc.territory || 'National' }})</option>
                }
              </select>
            </div>

            <div class="form-row-grid">
              <div>
                <label>Therapeutic Product *</label>
                <select [(ngModel)]="modalData.product_name" name="product_name" required>
                  <option value="OncoTarget-700">OncoTarget-700 (Lenvastat Alfa)</option>
                  <option value="CardioVas-XR">CardioVas-XR (Evolosumab Ext)</option>
                  <option value="NeuroGuard-IV">NeuroGuard-IV (Glatirate Sodium)</option>
                </select>
              </div>

              <div>
                <label>Formulary Access Tier *</label>
                <select [(ngModel)]="modalData.formulary_tier" name="formulary_tier" required>
                  <option value="Tier 1: Preferred / First-Line">Tier 1: Preferred / First-Line</option>
                  <option value="Tier 2: Prior Authorization Required">Tier 2: Prior Authorization Required</option>
                  <option value="Tier 3: Specialist Restricted">Tier 3: Specialist Restricted</option>
                  <option value="Non-Formulary: Off-Protocol">Non-Formulary: Off-Protocol</option>
                </select>
              </div>
            </div>

            <div class="form-row-grid">
              <div>
                <label>P&T Committee Status</label>
                <select [(ngModel)]="modalData.pt_status" name="pt_status">
                  <option value="Approved">Approved</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Dossier Submitted">Dossier Submitted</option>
                  <option value="Deferred">Deferred</option>
                  <option value="Not Submitted">Not Submitted</option>
                </select>
              </div>

              <div>
                <label>Next P&T Meeting Date</label>
                <input type="date" [(ngModel)]="modalData.pt_meeting_date" name="pt_meeting_date" />
              </div>
            </div>

            <div class="form-row">
              <label>Physician Champion / Sponsor</label>
              <input type="text" [(ngModel)]="modalData.physician_champion" name="physician_champion" placeholder="e.g. Dr. Sarah Chen, MD (Chief of Oncology)" />
            </div>

            <div class="form-row-grid">
              <div>
                <label>Competitor Displaced</label>
                <input type="text" [(ngModel)]="modalData.competitor_displaced" name="competitor_displaced" placeholder="e.g. Replacing Sandoz / Standard Chemo" />
              </div>

              <div>
                <label>Annual Potential Value ($)</label>
                <input type="number" [(ngModel)]="modalData.annual_potential_value" name="annual_potential_value" placeholder="420000" />
              </div>
            </div>

            <div class="form-row">
              <label>Clinical Protocol Requirements</label>
              <textarea [(ngModel)]="modalData.protocol_requirements" name="protocol_requirements" rows="2" placeholder="e.g. Requires baseline biomarker report and prior line therapy failure note."></textarea>
            </div>

            @if (modalError()) {
              <div class="error-msg">{{ modalError() }}</div>
            }

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" (click)="showModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'Saving...' : 'Save Decision' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .formulary-workspace {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: inherit;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #6366f1;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .page-header h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }

    /* BUTTONS */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-icon {
      width: 16px;
      height: 16px;
    }
    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      cursor: pointer;
    }
    .btn-sm:hover { background: #f1f5f9; }

    /* KPIS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #94a3b8;
    }
    .kpi-card.green-accent::before { background: #10b981; }
    .kpi-card.gold-accent::before { background: #f59e0b; }
    .kpi-card.blue-accent::before { background: #3b82f6; }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .kpi-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .kpi-badge.neutral { background: #f1f5f9; color: #475569; }
    .kpi-badge.green { background: #d1fae5; color: #047857; }
    .kpi-badge.gold { background: #fef3c7; color: #b45309; }
    .kpi-badge.blue { background: #dbeafe; color: #1d4ed8; }

    .kpi-value {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .kpi-subtext {
      font-size: 12px;
      color: #94a3b8;
    }

    /* TOOLBAR */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .search-box {
      flex: 1;
      min-width: 260px;
      position: relative;
    }

    .lens-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 17px;
      height: 17px;
      color: #94a3b8;
    }

    .search-box input {
      width: 100%;
      padding: 9px 12px 9px 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
    }
    .search-box input:focus { border-color: #6366f1; }

    .filter-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .filter-controls select {
      padding: 9px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      background: #ffffff;
      color: #334155;
      font-weight: 500;
      outline: none;
    }

    /* TABLE */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .formulary-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    .formulary-table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .formulary-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .hospital-link {
      font-weight: 700;
      color: #4f46e5;
      text-decoration: none;
    }
    .hospital-link:hover { text-decoration: underline; }

    .territory-tag {
      font-size: 11px;
      color: #64748b;
    }

    .prod-name {
      font-weight: 700;
      color: #0f172a;
    }
    .prod-sku {
      font-size: 11px;
      color: #64748b;
    }

    .tier-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
      white-space: nowrap;
    }
    .tier-badge.tier-1 {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .tier-badge.tier-2 {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .tier-badge.tier-3 {
      background: #ffedd5;
      color: #9a3412;
      border: 1px solid #fed7aa;
    }
    .tier-badge.tier-non {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .pt-status-pill {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
    }
    .pt-status-pill.approved { color: #10b981; }
    .pt-status-pill.review { color: #f59e0b; }

    .meeting-date {
      font-size: 11px;
      color: #94a3b8;
      display: block;
    }

    .champion-name {
      font-weight: 600;
      color: #1e293b;
    }
    .protocol-hint {
      font-size: 11px;
      color: #64748b;
      display: block;
      cursor: help;
    }

    .displaced-tag {
      font-size: 11.5px;
      background: #f1f5f9;
      padding: 2px 7px;
      border-radius: 4px;
      color: #475569;
    }

    .potential-val {
      font-weight: 800;
      color: #0f172a;
    }

    /* MODAL */
    .modal-scrim {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: 1100;
    }

    .modal-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 540px;
      max-width: 95vw;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      z-index: 1101;
      padding: 24px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .modal-header h3 {
      font-size: 18px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-row label, .form-row-grid label {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }

    .form-row input, .form-row select, .form-row textarea,
    .form-row-grid input, .form-row-grid select {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    .error-msg {
      font-size: 12px;
      color: #dc2626;
      background: #fee2e2;
      padding: 8px 12px;
      border-radius: 6px;
    }

    .loading-state, .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      width: 48px;
      height: 48px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
  `]
})
export class FormularyTrackerComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly apiService = inject(ApiService);

  readonly items = signal<HospitalFormularyItem[]>([]);
  readonly summary = signal<{
    total_evaluated_institutions: number;
    tier1_preferred_access_rate: number;
    pending_pt_committee_reviews: number;
    annual_pipeline_opportunity_value: number;
  }>({
    total_evaluated_institutions: 0,
    tier1_preferred_access_rate: 0,
    pending_pt_committee_reviews: 0,
    annual_pipeline_opportunity_value: 0,
  });

  readonly loading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');
  readonly selectedTier = signal<string>('');
  readonly selectedPtStatus = signal<string>('');
  readonly selectedTerritory = signal<string>('');

  // Modal
  readonly showModal = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);
  readonly accountOptions = signal<Array<{ id: string; name: string; territory?: string }>>([]);

  modalData = {
    account_id: '',
    product_name: 'OncoTarget-700',
    formulary_tier: 'Tier 1: Preferred / First-Line',
    pt_status: 'Approved',
    pt_meeting_date: '',
    physician_champion: '',
    competitor_displaced: '',
    annual_potential_value: 420000,
    protocol_requirements: '',
  };

  readonly filteredItems = computed(() => {
    let list = this.items();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(i =>
        i.account_name.toLowerCase().includes(search) ||
        i.product_name.toLowerCase().includes(search) ||
        (i.physician_champion && i.physician_champion.toLowerCase().includes(search)) ||
        (i.competitor_displaced && i.competitor_displaced.toLowerCase().includes(search))
      );
    }
    const tier = this.selectedTier();
    if (tier) {
      list = list.filter(i => i.formulary_tier.includes(tier));
    }
    const status = this.selectedPtStatus();
    if (status) {
      list = list.filter(i => i.pt_status.includes(status));
    }
    const terr = this.selectedTerritory();
    if (terr) {
      list = list.filter(i => i.territory.toLowerCase() === terr.toLowerCase());
    }
    return list;
  });

  ngOnInit(): void {
    this.loadFormularies();
    this.loadAccounts();
  }

  loadFormularies(): void {
    this.loading.set(true);
    this.salesService.getHospitalFormularies().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        if (res.summary) {
          this.summary.set(res.summary);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAccounts(): void {
    this.apiService.get<any[]>('/accounts').subscribe({
      next: (accs) => this.accountOptions.set(accs || []),
      error: () => {},
    });
  }

  openUpdateModal(): void {
    this.modalError.set(null);
    this.modalData = {
      account_id: this.accountOptions().length > 0 ? this.accountOptions()[0].id : '',
      product_name: 'OncoTarget-700',
      formulary_tier: 'Tier 1: Preferred / First-Line',
      pt_status: 'Approved',
      pt_meeting_date: new Date().toISOString().slice(0, 10),
      physician_champion: 'Dr. Sarah Chen, MD',
      competitor_displaced: 'Standard Chemo Combo',
      annual_potential_value: 450000,
      protocol_requirements: 'Indicated for refractory mRCC patients with EGFR/ALK verification.',
    };
    this.showModal.set(true);
  }

  openEditModal(item: HospitalFormularyItem): void {
    this.modalError.set(null);
    this.modalData = {
      account_id: item.account_id,
      product_name: item.product_name,
      formulary_tier: item.formulary_tier,
      pt_status: item.pt_status,
      pt_meeting_date: item.pt_meeting_date ? item.pt_meeting_date.slice(0, 10) : '',
      physician_champion: item.physician_champion || '',
      competitor_displaced: item.competitor_displaced || '',
      annual_potential_value: item.annual_potential_value,
      protocol_requirements: item.protocol_requirements || '',
    };
    this.showModal.set(true);
  }

  submitFormulary(): void {
    if (!this.modalData.account_id || !this.modalData.product_name) {
      this.modalError.set('Hospital account and product name are required.');
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);

    this.salesService.updateHospitalFormulary(this.modalData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showModal.set(false);
        this.loadFormularies();
      },
      error: (err) => {
        this.submitting.set(false);
        this.modalError.set(err.error?.detail || 'Failed to update formulary status.');
      },
    });
  }
}
