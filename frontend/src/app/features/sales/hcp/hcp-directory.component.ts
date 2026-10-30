import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { SalesService } from '../../../core/sales.service';
import { HealthcareProfessional } from '../../../core/models';

@Component({
  selector: 'app-hcp-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="hcp-workspace">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <span class="eyebrow">HEALTHCARE PROFESSIONALS (HCP) & PRESCRIBERS</span>
          <h1>Physician 360° & Key Opinion Leader (KOL) Hub</h1>
          <p class="subtitle">
            Directory of verified medical doctors, hospital department chairs, and prescribing champions across therapeutic networks.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/edetailing" class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Clinical e-Detailing Studio
          </a>
          <button type="button" class="btn btn-primary" (click)="openRegisterModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Register Physician (HCP)
          </button>
        </div>
      </header>

      <!-- KPI METRIC CARDS -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">TOTAL PRESCRIBING PHYSICIANS</span>
            <span class="kpi-badge neutral">Active</span>
          </div>
          <div class="kpi-value">{{ totalCount() }}</div>
          <div class="kpi-subtext">Verified medical practitioners</div>
        </div>

        <div class="kpi-card gold-accent">
          <div class="kpi-header">
            <span class="kpi-label">KEY OPINION LEADERS (KOL)</span>
            <span class="kpi-badge gold">Tier 1 Champions</span>
          </div>
          <div class="kpi-value">{{ kolCount() }}</div>
          <div class="kpi-subtext">Department chairs & clinical investigators</div>
        </div>

        <div class="kpi-card green-accent">
          <div class="kpi-header">
            <span class="kpi-label">COMPLETED CLINICAL SESSIONS</span>
            <span class="kpi-badge green">Engagement</span>
          </div>
          <div class="kpi-value">{{ totalInteractions() }}</div>
          <div class="kpi-subtext">Documented detailing sessions & visits</div>
        </div>

        <div class="kpi-card blue-accent">
          <div class="kpi-header">
            <span class="kpi-label">MEDICAL LICENSE COMPLIANCE</span>
            <span class="kpi-badge blue">Regulatory Verified</span>
          </div>
          <div class="kpi-value">100%</div>
          <div class="kpi-subtext">PDMA & NPI verified credentials</div>
        </div>
      </section>

      <!-- SEARCH & FILTER TOOLBAR -->
      <section class="toolbar-card">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lens-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Search physicians by name, license number, or hospital..."
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event.target).value)"
          />
        </div>

        <div class="filter-controls">
          <select [value]="selectedSpecialty()" (change)="selectedSpecialty.set($any($event.target).value)">
            <option value="">All Clinical Specialties</option>
            <option value="Oncology">Medical Oncology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Hematology">Hematology</option>
            <option value="General Medicine">General Medicine</option>
          </select>

          <select [value]="selectedTier()" (change)="selectedTier.set($any($event.target).value)">
            <option value="">All Prescribing Tiers</option>
            <option value="Tier 1">Tier 1 (Key Opinion Leaders)</option>
            <option value="Tier 2">Tier 2 (High-Volume Prescribers)</option>
            <option value="Tier 3">Tier 3 (Community Prescribers)</option>
          </select>

          <select [value]="selectedTerritory()" (change)="selectedTerritory.set($any($event.target).value)">
            <option value="">All Territories</option>
            <option value="North">North Region</option>
            <option value="South">South Region</option>
            <option value="East">East Region</option>
            <option value="West">West Region</option>
          </select>
        </div>
      </section>

      <!-- PHYSICIAN DIRECTORY CARDS -->
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading verified healthcare professionals directory...</p>
        </div>
      } @else if (filteredDoctors().length === 0) {
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>No physicians found</h3>
          <p>Try adjusting your search criteria or register a new healthcare professional.</p>
        </div>
      } @else {
        <div class="hcp-grid">
          @for (doc of filteredDoctors(); track doc.id) {
            <div class="hcp-card" [class.kol-highlight]="doc.kol_status">
              <div class="card-top">
                <div class="avatar-wrap">
                  <div class="avatar-circle" [class.kol-avatar]="doc.kol_status">
                    {{ getInitials(doc.full_name) }}
                  </div>
                  @if (doc.kol_status) {
                    <span class="kol-crown-badge" title="Key Opinion Leader / Tier 1 Champion">★ KOL</span>
                  }
                </div>

                <div class="doc-primary-info">
                  <div class="doc-name-row">
                    <h3 class="doc-name">{{ doc.full_name }}</h3>
                    <span class="tier-pill" [class.tier-1]="doc.kol_status || doc.prescribing_tier?.includes('Tier 1')" [class.tier-2]="doc.prescribing_tier?.includes('Tier 2')">
                      {{ doc.prescribing_tier || (doc.kol_status ? 'Tier 1 (KOL)' : 'Tier 2') }}
                    </span>
                  </div>
                  <div class="doc-title-line">{{ doc.title || 'Attending Physician' }}</div>
                  <div class="doc-spec-badge">
                    <span class="spec-tag">{{ doc.specialty || 'General Medicine' }}</span>
                    @if (doc.license_number) {
                      <span class="license-tag" title="Verified Medical License">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-shield"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        {{ doc.license_number }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <div class="card-details">
                <div class="detail-row">
                  <span class="detail-key">Affiliated Hospital</span>
                  <a [routerLink]="['/accounts', doc.account_id]" class="hospital-link">
                    {{ doc.account_name || 'Affiliated Health System' }}
                  </a>
                </div>

                <div class="detail-row">
                  <span class="detail-key">Territory</span>
                  <span class="detail-val">{{ doc.territory || 'Unassigned' }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-key">Detailing Cadence</span>
                  <span class="cadence-status" [class.recent]="doc.interactions_count && doc.interactions_count > 0">
                    @if (doc.interactions_count && doc.interactions_count > 0) {
                      ● {{ doc.interactions_count }} session(s) logged
                    } @else {
                      ○ Due for Clinical Review
                    }
                  </span>
                </div>
              </div>

              <div class="card-actions">
                <a [routerLink]="['/edetailing']" [queryParams]="{ contactId: doc.id, accountId: doc.account_id, docName: doc.full_name }" class="btn-card-action primary-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  Detail (IVA)
                </a>

                <button type="button" class="btn-card-action" (click)="openScheduleModal(doc)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Schedule
                </button>

                <button type="button" class="btn-card-action" (click)="openDossier(doc)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Dossier
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- SLIDE-OVER DOSSIER DRAWER -->
      @if (selectedDocForDossier()) {
        <div class="drawer-scrim" (click)="closeDossier()"></div>
        <div class="dossier-drawer" role="dialog" aria-modal="true">
          <div class="drawer-header">
            <div>
              <span class="eyebrow">PHYSICIAN DOSSIER 360°</span>
              <h2>{{ selectedDocForDossier()?.full_name }}</h2>
              <p class="drawer-sub">{{ selectedDocForDossier()?.title }} · {{ selectedDocForDossier()?.specialty }}</p>
            </div>
            <button type="button" class="close-btn" (click)="closeDossier()">✕</button>
          </div>

          <div class="drawer-body">
            @if (loadingDossier()) {
              <div class="loading-state">
                <mat-spinner diameter="32"></mat-spinner>
                <p>Loading clinical interaction history...</p>
              </div>
            } @else {
              <!-- Summary Strip -->
              <div class="dossier-strip">
                <div class="strip-item">
                  <span class="strip-label">Prescribing Tier</span>
                  <span class="strip-val gold-text">{{ dossierData()?.prescribing_metrics?.tier }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Hospital Affiliation</span>
                  <span class="strip-val">{{ dossierData()?.account?.name || 'Affiliated Hospital' }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">Total Interactions</span>
                  <span class="strip-val">{{ dossierData()?.prescribing_metrics?.total_visits }}</span>
                </div>
                <div class="strip-item">
                  <span class="strip-label">License Verified</span>
                  <span class="strip-val">{{ selectedDocForDossier()?.license_number || 'NPI Verified' }}</span>
                </div>
              </div>

              <!-- Quick Launch Actions -->
              <div class="dossier-actions-bar">
                <a [routerLink]="['/edetailing']" [queryParams]="{ contactId: selectedDocForDossier()?.id, accountId: selectedDocForDossier()?.account_id, docName: selectedDocForDossier()?.full_name }" class="btn btn-primary" (click)="closeDossier()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  Launch Clinical e-Detailing (IVA)
                </a>
              </div>

              <!-- Past Clinical Interactions Timeline -->
              <div class="section-block">
                <h3 class="section-title">Clinical Detailing & Interaction Timeline</h3>
                @if (dossierData()?.activities?.length === 0) {
                  <p class="muted-text">No previous detailing sessions or visits recorded yet. Launch e-Detailing above to log the first visit.</p>
                } @else {
                  <div class="timeline-list">
                    @for (act of dossierData()?.activities; track act.id) {
                      <div class="timeline-item">
                        <div class="timeline-badge" [class.detailing-badge]="act.activity_type === 'detailing'">
                          {{ act.activity_type === 'detailing' ? 'IVA' : 'VISIT' }}
                        </div>
                        <div class="timeline-content">
                          <div class="timeline-header">
                            <strong>{{ act.purpose || 'Clinical Interaction' }}</strong>
                            <small class="timeline-date">{{ act.occurred_at | date:'mediumDate' }}</small>
                          </div>
                          @if (act.products_discussed) {
                            <div class="product-tag">Product: {{ act.products_discussed }}</div>
                          }
                          @if (act.outcome) {
                            <p class="timeline-outcome">{{ act.outcome }}</p>
                          }
                          @if (act.commitments) {
                            <div class="commitment-pill">Commitment: {{ act.commitments }}</div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Linked Tasks & Sample Drops -->
              <div class="section-block">
                <h3 class="section-title">Follow-up Tasks & Commitments</h3>
                @if (dossierData()?.tasks?.length === 0) {
                  <p class="muted-text">No active follow-up tasks currently assigned for this physician.</p>
                } @else {
                  <div class="task-list">
                    @for (t of dossierData()?.tasks; track t.id) {
                      <div class="task-card">
                        <div class="task-meta">
                          <span class="task-status-pill">{{ t.status }}</span>
                          <strong class="task-title">{{ t.title }}</strong>
                        </div>
                        <small class="task-due">Due: {{ t.due_at | date:'shortDate' }}</small>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- REGISTER NEW PHYSICIAN MODAL -->
      @if (showRegisterModal()) {
        <div class="modal-scrim" (click)="showRegisterModal.set(false)"></div>
        <div class="modal-dialog" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Register Healthcare Professional (HCP)</h3>
            <button type="button" class="close-btn" (click)="showRegisterModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="submitNewHcp()" class="modal-form">
            <div class="form-row">
              <label>Full Name *</label>
              <input type="text" [(ngModel)]="newHcp.full_name" name="full_name" placeholder="e.g. Dr. Arthur Pendelton, MD" required />
            </div>

            <div class="form-row-grid">
              <div>
                <label>Professional Title</label>
                <input type="text" [(ngModel)]="newHcp.title" name="title" placeholder="e.g. Chief of Cardiology" />
              </div>
              <div>
                <label>Clinical Specialty *</label>
                <select [(ngModel)]="newHcp.specialty" name="specialty" required>
                  <option value="Medical Oncology">Medical Oncology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Endocrinology">Endocrinology</option>
                  <option value="Hematology">Hematology</option>
                  <option value="General Medicine">General Medicine</option>
                </select>
              </div>
            </div>

            <div class="form-row-grid">
              <div>
                <label>Medical License / NPI # *</label>
                <input type="text" [(ngModel)]="newHcp.license_number" name="license_number" placeholder="e.g. NPI-19283746" required />
              </div>
              <div>
                <label>Territory</label>
                <select [(ngModel)]="newHcp.territory" name="territory">
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <label>Affiliated Hospital Account *</label>
              <select [(ngModel)]="newHcp.account_id" name="account_id" required>
                <option value="">-- Select Health System / Hospital --</option>
                @for (acc of accountOptions(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} ({{ acc.territory || 'National' }})</option>
                }
              </select>
            </div>

            <div class="form-row-grid">
              <div>
                <label>Direct Email</label>
                <input type="email" [(ngModel)]="newHcp.email" name="email" placeholder="physician@hospital.org" />
              </div>
              <div>
                <label>Clinic Phone</label>
                <input type="tel" [(ngModel)]="newHcp.phone" name="phone" placeholder="+1 (555) 234-5678" />
              </div>
            </div>

            @if (registerError()) {
              <div class="error-msg">{{ registerError() }}</div>
            }

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" (click)="showRegisterModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'Registering...' : 'Register Physician' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- SCHEDULE QUICK VISIT MODAL -->
      @if (showScheduleModal()) {
        <div class="modal-scrim" (click)="showScheduleModal.set(false)"></div>
        <div class="modal-dialog" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Schedule Interaction with {{ selectedDoctorForSchedule()?.full_name }}</h3>
            <button type="button" class="close-btn" (click)="showScheduleModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="submitSchedule()" class="modal-form">
            <div class="form-row">
              <label>Interaction Type</label>
              <select [(ngModel)]="scheduleForm.activity_type" name="activity_type">
                <option value="visit">In-Person Hospital Visit</option>
                <option value="call">Medical Information Call</option>
                <option value="meeting">P&T / Advisory Meeting</option>
                <option value="detailing">Clinical e-Detailing Session</option>
              </select>
            </div>

            <div class="form-row">
              <label>Scheduled Date & Time *</label>
              <input type="datetime-local" [(ngModel)]="scheduleForm.occurred_at" name="occurred_at" required />
            </div>

            <div class="form-row">
              <label>Clinical Objective / Purpose</label>
              <input type="text" [(ngModel)]="scheduleForm.purpose" name="purpose" placeholder="e.g. Present Phase III OASIS survival curves" />
            </div>

            <div class="form-row">
              <label>Location / Hospital Clinic</label>
              <input type="text" [(ngModel)]="scheduleForm.location" name="location" [placeholder]="selectedDoctorForSchedule()?.account_name || 'Hospital Outpatient Pavilion'" />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" (click)="showScheduleModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submittingSchedule()">
                {{ submittingSchedule() ? 'Scheduling...' : 'Confirm Schedule' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .hcp-workspace {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: inherit;
    }

    /* HEADER */
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
      max-width: 720px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
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
      transform: translateY(-1px);
    }

    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

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
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #94a3b8;
    }
    .kpi-card.gold-accent::before { background: #f59e0b; }
    .kpi-card.green-accent::before { background: #10b981; }
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
    .kpi-badge.gold { background: #fef3c7; color: #b45309; }
    .kpi-badge.green { background: #d1fae5; color: #047857; }
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
      transition: border-color 0.15s ease;
    }
    .search-box input:focus {
      border-color: #6366f1;
    }

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

    /* PHYSICIAN GRID */
    .hcp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .hcp-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
      position: relative;
    }

    .hcp-card:hover {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);
      border-color: #cbd5e1;
    }

    .hcp-card.kol-highlight {
      border-color: #fde68a;
      background: linear-gradient(180deg, #fffbeb 0%, #ffffff 60px);
    }

    .card-top {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .avatar-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
    }

    .avatar-circle.kol-avatar {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
    }

    .kol-crown-badge {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      background: #b45309;
      color: #ffffff;
      font-size: 8px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 999px;
      white-space: nowrap;
      letter-spacing: 0.04em;
    }

    .doc-primary-info {
      flex: 1;
      min-width: 0;
    }

    .doc-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .doc-name {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tier-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      white-space: nowrap;
    }
    .tier-pill.tier-1 {
      background: #fef3c7;
      color: #92400e;
    }
    .tier-pill.tier-2 {
      background: #e0e7ff;
      color: #3730a3;
    }

    .doc-title-line {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 6px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-spec-badge {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .spec-tag {
      font-size: 11px;
      font-weight: 600;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .license-tag {
      font-size: 11px;
      font-weight: 600;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .mini-shield {
      width: 10px;
      height: 10px;
    }

    /* CARD DETAILS */
    .card-details {
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
    }

    .detail-key {
      color: #64748b;
    }

    .hospital-link {
      font-weight: 600;
      color: #4f46e5;
      text-decoration: none;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hospital-link:hover { text-decoration: underline; }

    .detail-val {
      font-weight: 600;
      color: #1e293b;
    }

    .cadence-status {
      font-size: 12px;
      font-weight: 600;
      color: #f59e0b;
    }
    .cadence-status.recent {
      color: #10b981;
    }

    /* CARD ACTIONS */
    .card-actions {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 8px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }

    .btn-card-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      transition: all 0.15s ease;
    }
    .btn-card-action:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .btn-card-action.primary-action {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }
    .btn-card-action.primary-action:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .action-icon {
      width: 13px;
      height: 13px;
    }

    /* SLIDE-OVER DOSSIER DRAWER */
    .drawer-scrim {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      z-index: 1000;
    }

    .dossier-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 580px;
      max-width: 90vw;
      background: #ffffff;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #f8fafc;
    }

    .drawer-header h2 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .drawer-sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
    }
    .close-btn:hover { color: #0f172a; }

    .drawer-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .dossier-strip {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }

    .strip-item {
      display: flex;
      flex-direction: column;
    }
    .strip-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .strip-val {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .gold-text { color: #b45309; }

    .dossier-actions-bar {
      margin-bottom: 24px;
    }

    .section-block {
      margin-bottom: 28px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 12px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .timeline-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 4px 6px;
      height: fit-content;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
    }
    .timeline-badge.detailing-badge {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .timeline-content {
      flex: 1;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 13px;
    }
    .timeline-date { color: #94a3b8; }

    .product-tag {
      font-size: 11.5px;
      font-weight: 600;
      color: #4f46e5;
      margin-bottom: 4px;
    }

    .timeline-outcome {
      font-size: 12.5px;
      color: #334155;
      margin: 0 0 6px 0;
      line-height: 1.4;
    }

    .commitment-pill {
      font-size: 11.5px;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .task-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }

    .task-status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
      margin-right: 8px;
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
      width: 520px;
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

    .form-row input, .form-row select, .form-row-grid input, .form-row-grid select {
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
    .muted-text {
      color: #94a3b8;
      font-size: 13px;
      font-style: italic;
    }
  `]
})
export class HcpDirectoryComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  readonly doctors = signal<HealthcareProfessional[]>([]);
  readonly loading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');
  readonly selectedSpecialty = signal<string>('');
  readonly selectedTier = signal<string>('');
  readonly selectedTerritory = signal<string>('');

  // Dossier
  readonly selectedDocForDossier = signal<HealthcareProfessional | null>(null);
  readonly dossierData = signal<any>(null);
  readonly loadingDossier = signal<boolean>(false);

  // Register Modal
  readonly showRegisterModal = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly registerError = signal<string | null>(null);
  readonly accountOptions = signal<Array<{ id: string; name: string; territory?: string }>>([]);

  newHcp = {
    full_name: '',
    title: '',
    specialty: 'Medical Oncology',
    license_number: '',
    account_id: '',
    territory: 'North',
    email: '',
    phone: '',
  };

  // Schedule Quick Visit Modal
  readonly showScheduleModal = signal<boolean>(false);
  readonly selectedDoctorForSchedule = signal<HealthcareProfessional | null>(null);
  readonly submittingSchedule = signal<boolean>(false);

  scheduleForm = {
    activity_type: 'visit',
    occurred_at: '',
    purpose: '',
    location: '',
  };

  readonly filteredDoctors = computed(() => {
    let list = this.doctors();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(d =>
        d.full_name.toLowerCase().includes(search) ||
        (d.license_number && d.license_number.toLowerCase().includes(search)) ||
        (d.account_name && d.account_name.toLowerCase().includes(search)) ||
        (d.specialty && d.specialty.toLowerCase().includes(search))
      );
    }
    const spec = this.selectedSpecialty();
    if (spec) {
      list = list.filter(d => d.specialty && d.specialty.toLowerCase().includes(spec.toLowerCase()));
    }
    const tier = this.selectedTier();
    if (tier) {
      list = list.filter(d => d.prescribing_tier && d.prescribing_tier.includes(tier));
    }
    const terr = this.selectedTerritory();
    if (terr) {
      list = list.filter(d => d.territory && d.territory.toLowerCase() === terr.toLowerCase());
    }
    return list;
  });

  readonly totalCount = computed(() => this.doctors().length);
  readonly kolCount = computed(() => this.doctors().filter(d => d.kol_status).length);
  readonly totalInteractions = computed(() =>
    this.doctors().reduce((acc, cur) => acc + (cur.interactions_count || 0), 0)
  );

  ngOnInit(): void {
    this.loadDoctors();
    this.loadAccounts();
  }

  loadDoctors(): void {
    this.loading.set(true);
    this.salesService.getContacts().subscribe({
      next: (docs) => {
        this.doctors.set(docs || []);
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

  getInitials(name: string): string {
    if (!name) return 'DR';
    const clean = name.replace(/^(Dr\.|Doctor|Prof\.|Professor)\s+/i, '');
    const parts = clean.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  openDossier(doc: HealthcareProfessional): void {
    this.selectedDocForDossier.set(doc);
    this.loadingDossier.set(true);
    this.salesService.getContactProfile(doc.id).subscribe({
      next: (data) => {
        this.dossierData.set(data);
        this.loadingDossier.set(false);
      },
      error: () => this.loadingDossier.set(false),
    });
  }

  closeDossier(): void {
    this.selectedDocForDossier.set(null);
    this.dossierData.set(null);
  }

  openRegisterModal(): void {
    this.registerError.set(null);
    this.newHcp = {
      full_name: '',
      title: '',
      specialty: 'Medical Oncology',
      license_number: '',
      account_id: this.accountOptions().length > 0 ? this.accountOptions()[0].id : '',
      territory: 'North',
      email: '',
      phone: '',
    };
    this.showRegisterModal.set(true);
  }

  submitNewHcp(): void {
    if (!this.newHcp.full_name || !this.newHcp.account_id) {
      this.registerError.set('Physician name and hospital affiliation are required.');
      return;
    }
    this.submitting.set(true);
    this.registerError.set(null);

    this.salesService.createContact(this.newHcp).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showRegisterModal.set(false);
        this.loadDoctors();
      },
      error: (err) => {
        this.submitting.set(false);
        this.registerError.set(err.error?.detail || 'Failed to register physician.');
      },
    });
  }

  openScheduleModal(doc: HealthcareProfessional): void {
    this.selectedDoctorForSchedule.set(doc);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    this.scheduleForm = {
      activity_type: 'visit',
      occurred_at: tomorrow.toISOString().slice(0, 16),
      purpose: `Clinical Review on Accord Pharma therapeutic portfolio with Dr. ${doc.full_name}`,
      location: doc.account_name || 'Hospital Clinic',
    };
    this.showScheduleModal.set(true);
  }

  submitSchedule(): void {
    const doc = this.selectedDoctorForSchedule();
    if (!doc) return;
    this.submittingSchedule.set(true);

    this.salesService.createActivity({
      activity_type: this.scheduleForm.activity_type,
      account_id: doc.account_id,
      contact_id: doc.id,
      status: 'planned',
      occurred_at: new Date(this.scheduleForm.occurred_at).toISOString(),
      purpose: this.scheduleForm.purpose,
      location: this.scheduleForm.location,
      priority: doc.kol_status ? 'high' : 'normal',
    }).subscribe({
      next: () => {
        this.submittingSchedule.set(false);
        this.showScheduleModal.set(false);
        this.loadDoctors();
      },
      error: () => this.submittingSchedule.set(false),
    });
  }
}
