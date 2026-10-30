import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesService } from '../../../core/sales.service';
import { DetailingProduct, DetailingSlide, HealthcareProfessional } from '../../../core/models';

@Component({
  selector: 'app-edetailing-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="edetailing-workspace" [class.presentation-mode]="presentationMode()">
      <!-- TOP CONTROL BAR -->
      <header class="studio-header">
        <div class="header-main">
          <span class="eyebrow">INTERACTIVE VISUAL AID (IVA) · CLINICAL DETAILING</span>
          <h1>Clinical e-Detailing Studio</h1>
        </div>

        <div class="header-hcp-picker">
          <div class="picker-label">Target Prescriber:</div>
          <select [ngModel]="selectedContactId()" (ngModelChange)="onContactSelected($event)" class="hcp-select">
            <option value="">-- Choose Physician (HCP) --</option>
            @for (doc of doctors(); track doc.id) {
              <option [value]="doc.id">{{ doc.full_name }} ({{ doc.specialty || 'General' }} · {{ doc.account_name || 'Hospital' }})</option>
            }
          </select>
        </div>

        <div class="header-timer">
          <div class="timer-dot"></div>
          <span class="timer-text">{{ formattedSessionTime() }}</span>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="togglePresentationMode()">
            {{ presentationMode() ? 'Exit Fullscreen' : 'Presenter Mode' }}
          </button>
          <button type="button" class="btn btn-primary" (click)="openFeedbackDrawer()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Complete & Sync to CRM
          </button>
        </div>
      </header>

      <!-- THERAPEUTIC PRODUCT TABS -->
      <nav class="product-tabs" role="tablist">
        @for (prod of products(); track prod.id; let idx = $index) {
          <button
            type="button"
            class="product-tab-btn"
            [class.active]="selectedProductIndex() === idx"
            (click)="selectProduct(idx)"
          >
            <span class="tab-category">{{ prod.category }}</span>
            <span class="tab-name">{{ prod.product_name }}</span>
            <span class="tab-badge">{{ prod.slides.length }} Clinical Slides</span>
          </button>
        }
      </nav>

      <!-- MAIN PRESENTER STAGE -->
      <div class="presenter-container">
        <!-- SLIDE THUMBNAILS NAVIGATOR -->
        <aside class="slide-nav-rail">
          <div class="rail-title">CLINICAL SLIDES</div>
          <div class="thumbs-list">
            @for (slide of currentProduct()?.slides || []; track slide.slide_id; let sIdx = $index) {
              <button
                type="button"
                class="thumb-btn"
                [class.active]="currentSlideIndex() === sIdx"
                (click)="currentSlideIndex.set(sIdx)"
              >
                <div class="thumb-number">0{{ sIdx + 1 }}</div>
                <div class="thumb-meta">
                  <span class="thumb-title">{{ slide.title }}</span>
                  <small class="thumb-metric">{{ slide.key_metric }}</small>
                </div>
              </button>
            }
          </div>
        </aside>

        <!-- CURRENT SLIDE STAGE -->
        <main class="slide-stage" [attr.aria-label]="currentSlide()?.title">
          <div class="stage-slide-card">
            <!-- Slide Header -->
            <div class="slide-header">
              <div class="slide-eyebrow">
                <span>{{ currentProduct()?.product_name }}</span> ·
                <span class="indication-tag">{{ currentProduct()?.indication }}</span>
              </div>
              <h2 class="slide-title">{{ currentSlide()?.title }}</h2>
              <p class="slide-subtitle">{{ currentSlide()?.subtitle }}</p>
            </div>

            <!-- Visual Content Canvas -->
            <div class="slide-visual-canvas">
              @if (currentSlide()?.chart_type === 'moa_cascade') {
                <div class="moa-diagram-card">
                  <div class="moa-flow">
                    <div class="flow-step receptor-step">
                      <div class="step-icon">🔒</div>
                      <h4>Receptor Binding</h4>
                      <p>Selective sub-nanomolar binding to intracellular ATP tyrosine kinase pocket</p>
                      <span class="metric-pill">0.42 nM IC50</span>
                    </div>

                    <div class="flow-arrow">➔</div>

                    <div class="flow-step signal-step">
                      <div class="step-icon">⚡</div>
                      <h4>Signaling Interruption</h4>
                      <p>Blocks Ras-Raf-MEK-ERK & Akt/mTOR downstream neo-vascular cascade</p>
                      <span class="metric-pill blue">100% Pathway Halting</span>
                    </div>

                    <div class="flow-arrow">➔</div>

                    <div class="flow-step outcome-step">
                      <div class="step-icon">🎯</div>
                      <h4>Tumor Regression</h4>
                      <p>Disrupts endothelial pericyte recruitment, triggering micro-vessel apoptosis</p>
                      <span class="metric-pill green">Sustained Remission</span>
                    </div>
                  </div>
                </div>
              } @else if (currentSlide()?.chart_type === 'kaplan_meier_os') {
                <div class="survival-chart-card">
                  <div class="chart-header">
                    <div class="chart-legend">
                      <span class="legend-box accord-blue"></span> <b>OncoTarget-700 (n=421): Median OS 24.8 mo</b>
                    </div>
                    <div class="chart-legend">
                      <span class="legend-box comparator-grey"></span> Standard of Care (n=421): Median OS 14.2 mo
                    </div>
                    <div class="hazard-badge">Hazard Ratio: {{ currentSlide()?.hazard_ratio }}</div>
                  </div>

                  <!-- Visual SVG Curve -->
                  <div class="svg-curve-wrap">
                    <svg viewBox="0 0 500 200" class="km-curve-svg">
                      <line x1="40" y1="20" x2="40" y2="170" stroke="#cbd5e1" stroke-width="2"/>
                      <line x1="40" y1="170" x2="480" y2="170" stroke="#cbd5e1" stroke-width="2"/>
                      
                      <!-- Standard Care Curve -->
                      <path d="M 40 30 Q 120 70, 200 110 T 320 145 T 440 165" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4"/>
                      
                      <!-- Accord Pharma Curve -->
                      <path d="M 40 30 Q 140 45, 240 70 T 360 95 T 460 120" fill="none" stroke="#4f46e5" stroke-width="4"/>

                      <circle cx="240" cy="70" r="5" fill="#4f46e5"/>
                      <circle cx="360" cy="95" r="5" fill="#4f46e5"/>

                      <text x="50" y="15" font-size="11" fill="#64748b">100% OS</text>
                      <text x="50" y="95" font-size="11" fill="#64748b">50% OS</text>
                      <text x="240" y="190" font-size="11" fill="#64748b">Month 12</text>
                      <text x="360" y="190" font-size="11" fill="#64748b">Month 24</text>
                      <text x="440" y="190" font-size="11" fill="#64748b">Month 36</text>
                    </svg>
                  </div>
                  <div class="curve-footnote">+10.6 Months Clinically Significant Overall Survival Extension (p < 0.0001)</div>
                </div>
              } @else if (currentSlide()?.chart_type === 'lipid_clearance_curve') {
                <div class="survival-chart-card">
                  <div class="chart-header">
                    <div class="chart-legend">
                      <span class="legend-box accord-blue"></span> <b>CardioVas-XR + High-Intensity Statin: 63.4% LDL-C Drop</b>
                    </div>
                    <span class="hazard-badge">p < 0.0001 vs Placebo</span>
                  </div>
                  <div class="svg-curve-wrap">
                    <svg viewBox="0 0 500 180" class="km-curve-svg">
                      <line x1="40" y1="20" x2="40" y2="160" stroke="#cbd5e1" stroke-width="2"/>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" stroke-width="2"/>
                      
                      <!-- Statin Alone -->
                      <path d="M 40 40 L 120 70 L 240 72 L 360 74 L 460 75" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4"/>
                      <!-- CardioVas-XR -->
                      <path d="M 40 40 L 120 130 L 240 132 L 360 134 L 460 135" fill="none" stroke="#059669" stroke-width="4"/>

                      <circle cx="120" cy="130" r="5" fill="#059669"/>
                      <circle cx="460" cy="135" r="5" fill="#059669"/>

                      <text x="50" y="35" font-size="11" fill="#64748b">Baseline 148 mg/dL</text>
                      <text x="260" y="125" font-size="11" fill="#059669" font-weight="bold">52 mg/dL Sustained</text>
                      <text x="120" y="175" font-size="11" fill="#64748b">Wk 12</text>
                      <text x="240" y="175" font-size="11" fill="#64748b">Wk 24</text>
                      <text x="460" y="175" font-size="11" fill="#64748b">Wk 52</text>
                    </svg>
                  </div>
                </div>
              } @else {
                <div class="generic-visual-card">
                  <div class="key-callout">
                    <div class="callout-number">{{ currentSlide()?.key_metric || 'Statistically Robust' }}</div>
                    <div class="callout-caption">Demonstrated in randomized clinical trials</div>
                  </div>
                  <div class="clinical-desc-box">
                    <p>{{ currentSlide()?.content }}</p>
                  </div>
                </div>
              }
            </div>

            <!-- Slide Evidence Footer -->
            <div class="slide-footer">
              <div class="evidence-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="book-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>Peer-Reviewed Publication: <b>{{ currentSlide()?.clinical_evidence }}</b></span>
              </div>
              <div class="slide-counter">
                Slide {{ currentSlideIndex() + 1 }} of {{ currentProduct()?.slides?.length || 0 }}
              </div>
            </div>
          </div>

          <!-- Presenter Controls Bar -->
          <div class="stage-nav-bar">
            <button
              type="button"
              class="nav-btn"
              [disabled]="currentSlideIndex() === 0"
              (click)="previousSlide()"
            >
              ❮ Previous Clinical Slide
            </button>

            <div class="nav-dots">
              @for (slide of currentProduct()?.slides || []; track slide.slide_id; let dIdx = $index) {
                <span
                  class="dot"
                  [class.active]="currentSlideIndex() === dIdx"
                  (click)="currentSlideIndex.set(dIdx)"
                ></span>
              }
            </div>

            <button
              type="button"
              class="nav-btn next"
              [disabled]="currentSlideIndex() >= (currentProduct()?.slides?.length || 1) - 1"
              (click)="nextSlide()"
            >
              Next Clinical Slide ❯
            </button>
          </div>
        </main>
      </div>

      <!-- PHYSICIAN FEEDBACK & OBJECTION CAPTURE DRAWER -->
      @if (showFeedbackDrawer()) {
        <div class="drawer-scrim" (click)="showFeedbackDrawer.set(false)"></div>
        <div class="feedback-drawer" role="dialog" aria-modal="true">
          <div class="drawer-header">
            <div>
              <span class="eyebrow">PHYSICIAN ENGAGEMENT CAPTURE</span>
              <h2>Log Detailing Session Outcome</h2>
              <p class="drawer-sub">Document physician feedback, clinical objections, and sample requests into CRM.</p>
            </div>
            <button type="button" class="close-btn" (click)="showFeedbackDrawer.set(false)">✕</button>
          </div>

          <form (ngSubmit)="submitDetailingSession()" class="drawer-form">
            <!-- Target Physician Confirmation -->
            <div class="form-row">
              <label>Target Healthcare Professional (HCP) *</label>
              <select [(ngModel)]="feedbackData.contact_id" name="contact_id" (ngModelChange)="onFeedbackContactChange($event)" required>
                <option value="">-- Select Physician --</option>
                @for (doc of doctors(); track doc.id) {
                  <option [value]="doc.id">{{ doc.full_name }} ({{ doc.specialty }} · {{ doc.account_name }})</option>
                }
              </select>
            </div>

            <!-- Physician Sentiment -->
            <div class="form-row">
              <label>Physician Sentiment & Prescribing Intent</label>
              <div class="sentiment-grid">
                @for (opt of sentimentOptions; track opt) {
                  <button
                    type="button"
                    class="sentiment-pill"
                    [class.selected]="feedbackData.sentiment === opt"
                    (click)="feedbackData.sentiment = opt"
                  >
                    {{ opt }}
                  </button>
                }
              </div>
            </div>

            <!-- Clinical Objections Raised -->
            <div class="form-row">
              <label>Clinical & Institutional Objections Raised</label>
              <div class="objections-checklist">
                @for (obj of objectionOptions; track obj) {
                  <label class="check-item">
                    <input
                      type="checkbox"
                      [checked]="feedbackData.objections.includes(obj)"
                      (change)="toggleObjection(obj)"
                    />
                    <span>{{ obj }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Sample Drop Request -->
            <div class="form-row sample-row">
              <div>
                <label>Drug Samples Requested (Units)</label>
                <small class="muted-label">Physician-requested starter packs for trial</small>
              </div>
              <div class="sample-stepper">
                <button type="button" (click)="decrementSamples()">−</button>
                <span class="sample-count">{{ feedbackData.sample_units_requested }}</span>
                <button type="button" (click)="incrementSamples()">+</button>
              </div>
            </div>

            <!-- Physician Commitments -->
            <div class="form-row">
              <label>Physician Clinical Commitments</label>
              <textarea
                [(ngModel)]="feedbackData.commitments"
                name="commitments"
                rows="2"
                placeholder="e.g. Doctor agreed to initiate 2 patients; requested P&T formulary monograph dossier"
              ></textarea>
            </div>

            <!-- Follow-up Task -->
            <div class="form-row">
              <label>Follow-up Action (Auto-creates CRM Task)</label>
              <input
                type="text"
                [(ngModel)]="feedbackData.next_action"
                name="next_action"
                placeholder="e.g. Deliver starter packs and review biomarker tolerability"
              />
            </div>

            <div class="form-row">
              <label>Follow-up Due Within</label>
              <select [(ngModel)]="feedbackData.follow_up_due_days" name="follow_up_due_days">
                <option [ngValue]="3">3 Days (Urgent / High-Volume)</option>
                <option [ngValue]="7">7 Days (Standard)</option>
                <option [ngValue]="14">14 Days (Bi-Weekly Check)</option>
                <option [ngValue]="30">30 Days (Next Month Follow-up)</option>
              </select>
            </div>

            @if (feedbackError()) {
              <div class="error-msg">{{ feedbackError() }}</div>
            }
            @if (feedbackSuccess()) {
              <div class="success-msg">{{ feedbackSuccess() }}</div>
            }

            <div class="drawer-actions">
              <button type="button" class="btn btn-outline" (click)="showFeedbackDrawer.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submittingFeedback()">
                {{ submittingFeedback() ? 'Saving to CRM...' : 'Confirm & Save Detailing Session' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .edetailing-workspace {
      padding: 24px;
      max-width: 1500px;
      margin: 0 auto;
      font-family: inherit;
    }

    .edetailing-workspace.presentation-mode {
      position: fixed;
      inset: 0;
      background: #0f172a;
      color: #f8fafc;
      z-index: 2000;
      overflow-y: auto;
      padding: 30px;
    }

    /* TOP HEADER */
    .studio-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
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

    .studio-header h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .presentation-mode .studio-header h1 { color: #ffffff; }

    .header-hcp-picker {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 6px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .presentation-mode .header-hcp-picker {
      background: #1e293b;
      border-color: #334155;
    }

    .picker-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }

    .hcp-select {
      border: none;
      font-size: 13px;
      font-weight: 600;
      outline: none;
      background: transparent;
      color: #0f172a;
      max-width: 280px;
    }
    .presentation-mode .hcp-select { color: #f8fafc; }

    .header-timer {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      padding: 8px 14px;
      border-radius: 999px;
      font-family: monospace;
      font-weight: 700;
      font-size: 14px;
      color: #334155;
    }
    .presentation-mode .header-timer {
      background: #1e293b;
      color: #f8fafc;
    }

    .timer-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    /* BUTTONS */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
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
    .presentation-mode .btn-outline {
      background: #1e293b;
      border-color: #475569;
      color: #f8fafc;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* PRODUCT TABS */
    .product-tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .product-tab-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .presentation-mode .product-tab-btn {
      background: #1e293b;
      border-color: #334155;
      color: #f8fafc;
    }

    .product-tab-btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .product-tab-btn.active {
      border-color: #6366f1;
      background: #f5f3ff;
      box-shadow: 0 0 0 1px #6366f1;
    }
    .presentation-mode .product-tab-btn.active {
      background: #312e81;
      border-color: #818cf8;
    }

    .tab-category {
      font-size: 10.5px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tab-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .presentation-mode .tab-name { color: #ffffff; }

    .tab-badge {
      font-size: 11px;
      color: #64748b;
    }

    /* PRESENTER STAGE */
    .presenter-container {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 20px;
      min-height: 580px;
    }

    /* RAIL */
    .slide-nav-rail {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .presentation-mode .slide-nav-rail {
      background: #1e293b;
      border-color: #334155;
    }

    .rail-title {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
    }

    .thumbs-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
    }

    .thumb-btn {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .presentation-mode .thumb-btn {
      background: #0f172a;
      border-color: #334155;
    }

    .thumb-btn.active {
      background: #eff6ff;
      border-color: #6366f1;
    }
    .presentation-mode .thumb-btn.active {
      background: #312e81;
      border-color: #818cf8;
    }

    .thumb-number {
      font-size: 12px;
      font-weight: 800;
      color: #6366f1;
    }

    .thumb-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .thumb-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.3;
      margin-bottom: 3px;
    }
    .presentation-mode .thumb-title { color: #f8fafc; }

    .thumb-metric {
      font-size: 10.5px;
      font-weight: 600;
      color: #10b981;
    }

    /* STAGE */
    .slide-stage {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .stage-slide-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .presentation-mode .stage-slide-card {
      background: #1e293b;
      border-color: #334155;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .slide-header {
      margin-bottom: 24px;
    }

    .slide-eyebrow {
      font-size: 12px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .indication-tag {
      color: #64748b;
      font-weight: 500;
      text-transform: none;
    }

    .slide-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }
    .presentation-mode .slide-title { color: #ffffff; }

    .slide-subtitle {
      font-size: 15px;
      color: #64748b;
      margin: 0;
    }

    /* VISUAL CANVAS */
    .slide-visual-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    /* MOA DIAGRAM */
    .moa-diagram-card {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
    }
    .presentation-mode .moa-diagram-card {
      background: #0f172a;
      border-color: #334155;
    }

    .moa-flow {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 16px;
    }

    .flow-step {
      flex: 1;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 18px 14px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
    }
    .presentation-mode .flow-step {
      background: #1e293b;
      border-color: #475569;
    }

    .step-icon {
      font-size: 26px;
      margin-bottom: 6px;
    }

    .flow-step h4 {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .presentation-mode .flow-step h4 { color: #ffffff; }

    .flow-step p {
      font-size: 11.5px;
      color: #64748b;
      margin: 0 0 10px 0;
      line-height: 1.4;
    }

    .flow-arrow {
      font-size: 22px;
      color: #94a3b8;
    }

    .metric-pill {
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
      padding: 3px 8px;
      border-radius: 999px;
      display: inline-block;
    }
    .metric-pill.blue { background: #dbeafe; color: #1e40af; }
    .metric-pill.green { background: #d1fae5; color: #065f46; }

    /* SURVIVAL CHART */
    .survival-chart-card {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .presentation-mode .survival-chart-card {
      background: #0f172a;
      border-color: #334155;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      font-size: 12.5px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-box {
      width: 14px;
      height: 4px;
      border-radius: 2px;
    }
    .legend-box.accord-blue { background: #4f46e5; height: 5px; }
    .legend-box.comparator-grey { background: #94a3b8; }

    .hazard-badge {
      background: #10b981;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .svg-curve-wrap {
      width: 100%;
      height: 200px;
    }

    .km-curve-svg {
      width: 100%;
      height: 100%;
    }

    .curve-footnote {
      font-size: 12px;
      font-weight: 700;
      color: #4f46e5;
      text-align: center;
      margin-top: 8px;
    }

    /* GENERIC CALLOUT */
    .generic-visual-card {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .presentation-mode .generic-visual-card {
      background: #0f172a;
      border-color: #334155;
    }

    .key-callout {
      text-align: center;
      min-width: 200px;
      border-right: 1px solid #e2e8f0;
      padding-right: 24px;
    }

    .callout-number {
      font-size: 32px;
      font-weight: 900;
      color: #4f46e5;
      line-height: 1.1;
      margin-bottom: 6px;
    }

    .callout-caption {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    .clinical-desc-box {
      flex: 1;
      font-size: 15px;
      color: #334155;
      line-height: 1.6;
    }
    .presentation-mode .clinical-desc-box { color: #cbd5e1; }

    /* FOOTER */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      font-size: 12px;
      color: #64748b;
    }
    .presentation-mode .slide-footer { border-color: #334155; }

    .evidence-tag {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .book-icon {
      width: 14px;
      height: 14px;
    }

    /* NAV BAR */
    .stage-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 18px;
    }
    .presentation-mode .stage-nav-bar {
      background: #1e293b;
      border-color: #334155;
    }

    .nav-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .nav-btn:hover:not(:disabled) {
      background: #f1f5f9;
    }
    .nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nav-btn.next {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .nav-btn.next:hover:not(:disabled) {
      background: #4338ca;
    }

    .nav-dots {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #cbd5e1;
      cursor: pointer;
    }
    .dot.active {
      background: #6366f1;
      transform: scale(1.2);
    }

    /* FEEDBACK DRAWER */
    .drawer-scrim {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      z-index: 2100;
    }

    .feedback-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 560px;
      max-width: 95vw;
      background: #ffffff;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 2101;
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s ease;
      color: #0f172a;
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
      margin: 0 0 4px 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
    }

    .drawer-form {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }

    .form-row input, .form-row select, .form-row textarea {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
    }

    .sentiment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .sentiment-pill {
      padding: 8px 10px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .sentiment-pill.selected {
      background: #e0e7ff;
      border-color: #6366f1;
      color: #3730a3;
    }

    .objections-checklist {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #334155;
      cursor: pointer;
    }

    .sample-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .muted-label {
      font-size: 11px;
      color: #64748b;
      display: block;
    }

    .sample-stepper {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sample-stepper button {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-weight: 700;
      cursor: pointer;
    }

    .sample-count {
      font-size: 16px;
      font-weight: 800;
      min-width: 20px;
      text-align: center;
    }

    .drawer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 14px;
    }

    .error-msg {
      font-size: 12px;
      color: #dc2626;
      background: #fee2e2;
      padding: 8px 12px;
      border-radius: 6px;
    }

    .success-msg {
      font-size: 12px;
      color: #065f46;
      background: #d1fae5;
      padding: 8px 12px;
      border-radius: 6px;
    }
  `]
})
export class EdetailingStudioComponent implements OnInit, OnDestroy {
  private readonly salesService = inject(SalesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly products = signal<DetailingProduct[]>([]);
  readonly doctors = signal<HealthcareProfessional[]>([]);
  readonly selectedProductIndex = signal<number>(0);
  readonly currentSlideIndex = signal<number>(0);
  readonly presentationMode = signal<boolean>(false);
  readonly sessionSeconds = signal<number>(0);
  readonly selectedContactId = signal<string>('');
  readonly selectedAccountId = signal<string>('');

  // Feedback Drawer
  readonly showFeedbackDrawer = signal<boolean>(false);
  readonly submittingFeedback = signal<boolean>(false);
  readonly feedbackError = signal<string | null>(null);
  readonly feedbackSuccess = signal<string | null>(null);

  private timerInterval: any = null;

  readonly sentimentOptions = [
    'Highly Receptive / Fast-Adopter',
    'Receptive / Wants Trial Data',
    'Neutral / Habit Competitor',
    'Formulary Restricted',
  ];

  readonly objectionOptions = [
    'Hospital P&T Formulary Restriction',
    'Prior Authorization paperwork burden',
    'Elderly patient tolerability concern',
    'Competitor drug habit / loyalty',
    'Co-pay assistance needed',
  ];

  feedbackData = {
    contact_id: '',
    account_id: '',
    product_name: '',
    slides_covered: [] as string[],
    duration_seconds: 180,
    sentiment: 'Highly Receptive / Fast-Adopter',
    objections: [] as string[],
    sample_units_requested: 2,
    commitments: '',
    next_action: '',
    follow_up_due_days: 7,
  };

  readonly currentProduct = computed(() => {
    const prods = this.products();
    const idx = this.selectedProductIndex();
    return prods[idx] || null;
  });

  readonly currentSlide = computed(() => {
    const prod = this.currentProduct();
    if (!prod || !prod.slides) return null;
    return prod.slides[this.currentSlideIndex()] || null;
  });

  readonly formattedSessionTime = computed(() => {
    const total = this.sessionSeconds();
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  ngOnInit(): void {
    this.startTimer();
    this.loadPortfolio();
    this.loadDoctors();

    // Check query params if launched from HCP card
    this.route.queryParams.subscribe((params) => {
      if (params['contactId']) {
        this.selectedContactId.set(params['contactId']);
        this.feedbackData.contact_id = params['contactId'];
      }
      if (params['accountId']) {
        this.selectedAccountId.set(params['accountId']);
        this.feedbackData.account_id = params['accountId'];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.sessionSeconds.update(s => s + 1);
    }, 1000);
  }

  loadPortfolio(): void {
    this.salesService.getEdetailingPortfolio().subscribe({
      next: (res) => {
        this.products.set(res.portfolio || []);
      },
    });
  }

  loadDoctors(): void {
    this.salesService.getContacts().subscribe({
      next: (docs) => {
        this.doctors.set(docs || []);
        // If query param set, ensure account_id is populated
        if (this.selectedContactId()) {
          const doc = docs.find(d => d.id === this.selectedContactId());
          if (doc) {
            this.selectedAccountId.set(doc.account_id);
            this.feedbackData.account_id = doc.account_id;
          }
        }
      },
    });
  }

  onContactSelected(contactId: string): void {
    this.selectedContactId.set(contactId);
    this.feedbackData.contact_id = contactId;
    const doc = this.doctors().find(d => d.id === contactId);
    if (doc) {
      this.selectedAccountId.set(doc.account_id);
      this.feedbackData.account_id = doc.account_id;
    }
  }

  selectProduct(index: number): void {
    this.selectedProductIndex.set(index);
    this.currentSlideIndex.set(0);
  }

  nextSlide(): void {
    const prod = this.currentProduct();
    if (!prod) return;
    if (this.currentSlideIndex() < prod.slides.length - 1) {
      this.currentSlideIndex.update(i => i + 1);
    }
  }

  previousSlide(): void {
    if (this.currentSlideIndex() > 0) {
      this.currentSlideIndex.update(i => i - 1);
    }
  }

  togglePresentationMode(): void {
    this.presentationMode.update(m => !m);
  }

  openFeedbackDrawer(): void {
    const prod = this.currentProduct();
    this.feedbackData.product_name = prod ? prod.product_name : 'Accord Pharma Therapeutics';
    this.feedbackData.duration_seconds = this.sessionSeconds();
    this.feedbackData.slides_covered = (prod?.slides || []).map(s => s.title);
    if (!this.feedbackData.contact_id && this.selectedContactId()) {
      this.feedbackData.contact_id = this.selectedContactId();
    }
    if (!this.feedbackData.account_id && this.selectedAccountId()) {
      this.feedbackData.account_id = this.selectedAccountId();
    }
    this.feedbackError.set(null);
    this.feedbackSuccess.set(null);
    this.showFeedbackDrawer.set(true);
  }

  onFeedbackContactChange(contactId: string): void {
    const doc = this.doctors().find(d => d.id === contactId);
    if (doc) {
      this.feedbackData.account_id = doc.account_id;
      this.selectedAccountId.set(doc.account_id);
    }
  }

  toggleObjection(obj: string): void {
    const idx = this.feedbackData.objections.indexOf(obj);
    if (idx >= 0) {
      this.feedbackData.objections.splice(idx, 1);
    } else {
      this.feedbackData.objections.push(obj);
    }
  }

  incrementSamples(): void {
    this.feedbackData.sample_units_requested += 2;
  }

  decrementSamples(): void {
    if (this.feedbackData.sample_units_requested >= 2) {
      this.feedbackData.sample_units_requested -= 2;
    }
  }

  submitDetailingSession(): void {
    if (!this.feedbackData.contact_id || !this.feedbackData.account_id) {
      this.feedbackError.set('Please select the physician detailing recipient.');
      return;
    }

    this.submittingFeedback.set(true);
    this.feedbackError.set(null);

    this.salesService.logEdetailingSession(this.feedbackData).subscribe({
      next: (res) => {
        this.submittingFeedback.set(false);
        this.feedbackSuccess.set(res.message || 'Session recorded successfully to CRM.');
        setTimeout(() => {
          this.showFeedbackDrawer.set(false);
          this.router.navigate(['/contacts']);
        }, 1200);
      },
      error: (err) => {
        this.submittingFeedback.set(false);
        this.feedbackError.set(err.error?.detail || 'Failed to sync detailing session.');
      },
    });
  }
}
