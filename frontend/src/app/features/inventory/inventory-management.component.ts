import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

export interface InventoryItem {
  id: string;
  distributor_id: string;
  distributor_name?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  quantity: number;
  updated_at: string;
}

export interface InventoryLotItem {
  id: string;
  distributor_id: string;
  distributor_name?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  lot_number: string;
  batch_number?: string;
  expiry_date?: string;
  storage_conditions?: string;
  quantity: number;
  updated_at: string;
}

export interface InventoryMovementItem {
  id: string;
  inventory_snapshot_id: string;
  inventory_lot_id?: string;
  changed_by_id: string;
  changed_by_name?: string;
  distributor_id?: string;
  distributor_name?: string;
  product_id?: string;
  product_name?: string;
  quantity_delta: number;
  reason: string;
  lot_number?: string;
  batch_number?: string;
  expiry_date?: string;
  storage_conditions?: string;
  created_at: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  category?: string;
  is_active: boolean;
}

export interface DistributorOption {
  id: string;
  account_name?: string;
  region?: string;
}

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="inventory-workspace">
      <!-- HEADER -->
      <header class="page-header">
        <div>
          <div class="eyebrow">COMMERCIAL OPERATIONS & SUPPLY CHAIN</div>
          <h1>Inventory & Stock Operations</h1>
          <p class="subtitle">
            Enterprise pharmaceutical stock balances, batch & lot compliance tracking, and distribution movements.
          </p>
        </div>
        <div class="header-actions">
          <button class="crm-btn crm-btn-secondary" (click)="refreshAll()">
            🔄 Refresh Data
          </button>
          <button class="crm-btn crm-btn-primary" (click)="openAdjustModal()">
            <span>⚖</span> Adjust Stock / Intake
          </button>
        </div>
      </header>

      <!-- KPI METRICS BANNER -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon icon-blue">📦</div>
          <div class="kpi-content">
            <span class="kpi-label">TOTAL STOCK UNITS</span>
            <span class="kpi-val">{{ totalStockUnits() | number }}</span>
            <span class="kpi-sub">Across all regional warehouses</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon icon-emerald">💊</div>
          <div class="kpi-content">
            <span class="kpi-label">ACTIVE FORMULATIONS</span>
            <span class="kpi-val">{{ activeProductsCount() }}</span>
            <span class="kpi-sub">Catalog pharmaceuticals tracked</span>
          </div>
        </div>

        <div class="kpi-card" [class.highlight-amber]="lowStockCount() > 0">
          <div class="kpi-icon icon-amber">⚠️</div>
          <div class="kpi-content">
            <span class="kpi-label">LOW STOCK WARNINGS</span>
            <span class="kpi-val">{{ lowStockCount() }}</span>
            <span class="kpi-sub">Balances ≤ 20 units threshold</span>
          </div>
        </div>

        <div class="kpi-card" [class.highlight-rose]="expiringLotsCount() > 0">
          <div class="kpi-icon icon-rose">⏳</div>
          <div class="kpi-content">
            <span class="kpi-label">EXPIRING LOTS (< 180D)</span>
            <span class="kpi-val">{{ expiringLotsCount() }}</span>
            <span class="kpi-sub">Batches requiring FIFO liquidation</span>
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

      <!-- NAVIGATION TABS -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'balances'"
          (click)="activeTab.set('balances')"
        >
          <span>📦 Warehouse Balances</span>
          <span class="tab-badge">{{ balances().length }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'lots'"
          (click)="activeTab.set('lots')"
        >
          <span>🏷️ Batch & Lot Expiry Tracking</span>
          <span class="tab-badge">{{ lots().length }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'movements'"
          (click)="activeTab.set('movements')"
        >
          <span>📜 Traceable Movement Ledger</span>
          <span class="tab-badge">{{ movements().length }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'low-stock'"
          (click)="activeTab.set('low-stock')"
        >
          <span>⚠️ Low Stock & Reorders</span>
          <span class="tab-badge alert">{{ lowStockItems().length }}</span>
        </button>
      </div>

      <!-- TAB 1: STOCK BALANCES -->
      @if (activeTab() === 'balances') {
        <section class="tab-content">
          <div class="toolbar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Filter by product name, SKU, or warehouse partner..."
                class="crm-search-input"
              />
            </div>
            <div class="filter-controls">
              <select [(ngModel)]="stockFilter" class="crm-select">
                <option value="ALL">All Stock Levels</option>
                <option value="IN_STOCK">In Stock (> 20 units)</option>
                <option value="LOW">Low Stock (1 - 20 units)</option>
                <option value="OUT">Out of Stock (0 units)</option>
              </select>
            </div>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading warehouse inventory balances...</span>
            </div>
          } @else {
            <div class="table-card">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Product & Formulation</th>
                    <th>SKU Code</th>
                    <th>Therapeutic Category</th>
                    <th>Warehouse / Channel Partner</th>
                    <th>Stock Balance</th>
                    <th>Health Status</th>
                    <th>Last Counted</th>
                    <th style="text-align: right;">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @if (filteredBalances().length === 0) {
                    <tr>
                      <td colspan="8" class="empty-cell">No inventory records matching criteria.</td>
                    </tr>
                  } @else {
                    @for (b of filteredBalances(); track b.id) {
                      <tr>
                        <td>
                          <div class="product-title">{{ b.product_name || 'Pharmaceutical Product' }}</div>
                          <span class="product-uuid">{{ b.product_id | slice:0:8 }}</span>
                        </td>
                        <td>
                          <span class="sku-badge">{{ b.product_sku || 'N/A' }}</span>
                        </td>
                        <td>
                          <span class="category-pill">{{ b.product_category || 'General Pharma' }}</span>
                        </td>
                        <td>
                          <div class="distributor-name">🏢 {{ b.distributor_name || 'Regional Depot' }}</div>
                        </td>
                        <td>
                          <div class="stock-qty-cell">
                            <span class="stock-number" [class.text-rose]="b.quantity === 0" [class.text-amber]="b.quantity > 0 && b.quantity <= 20">
                              {{ b.quantity | number }} units
                            </span>
                            <div class="stock-bar-track">
                              <div
                                class="stock-bar-fill"
                                [style.width.%]="calcBarWidth(b.quantity)"
                                [class.bar-green]="b.quantity > 20"
                                [class.bar-amber]="b.quantity > 0 && b.quantity <= 20"
                                [class.bar-red]="b.quantity === 0"
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          @if (b.quantity === 0) {
                            <span class="status-badge badge-red">Depleted / Stockout</span>
                          } @else if (b.quantity <= 20) {
                            <span class="status-badge badge-amber">Low Stock Warning</span>
                          } @else {
                            <span class="status-badge badge-green">Healthy Inventory</span>
                          }
                        </td>
                        <td class="text-subtle">
                          {{ b.updated_at | slice:0:10 }}
                        </td>
                        <td style="text-align: right;">
                          <button class="crm-btn crm-btn-xs crm-btn-secondary" (click)="quickAdjust(b)">
                            ⚖ Adjust
                          </button>
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

      <!-- TAB 2: BATCH & LOT EXPIRY TRACKING -->
      @if (activeTab() === 'lots') {
        <section class="tab-content">
          <div class="notice-info">
            🛡️ <b>Pharmaceutical Regulatory Compliance:</b> All manufactured lots are tracked under serialized lot and batch records with cold-chain storage status and mandatory expiration monitoring.
          </div>

          @if (loadingLots()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading lot and batch records...</span>
            </div>
          } @else {
            <div class="table-card">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Lot Number</th>
                    <th>Batch #</th>
                    <th>Product & SKU</th>
                    <th>Warehouse Location</th>
                    <th>Lot Quantity</th>
                    <th>Storage / Cold Chain</th>
                    <th>Expiration Date</th>
                    <th>Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  @if (lots().length === 0) {
                    <tr>
                      <td colspan="8" class="empty-cell">No active lot balances found.</td>
                    </tr>
                  } @else {
                    @for (lot of lots(); track lot.id) {
                      <tr>
                        <td>
                          <span class="lot-tag">🏷️ {{ lot.lot_number }}</span>
                        </td>
                        <td>
                          <span class="text-subtle">{{ lot.batch_number || 'BATCH-STD' }}</span>
                        </td>
                        <td>
                          <div class="product-title">{{ lot.product_name || 'Pharmaceutical Item' }}</div>
                          <small class="text-subtle">SKU: {{ lot.product_sku || 'N/A' }}</small>
                        </td>
                        <td>
                          <span>{{ lot.distributor_name || 'Central Facility' }}</span>
                        </td>
                        <td>
                          <b>{{ lot.quantity | number }}</b> units
                        </td>
                        <td>
                          <span class="storage-tag">❄ {{ lot.storage_conditions || 'Controlled 15-25°C' }}</span>
                        </td>
                        <td>
                          <b>{{ lot.expiry_date || 'Undated' }}</b>
                        </td>
                        <td>
                          <span class="status-badge" [class]="getExpiryBadgeClass(lot.expiry_date)">
                            {{ getExpiryLabel(lot.expiry_date) }}
                          </span>
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

      <!-- TAB 3: TRACEABLE MOVEMENTS LEDGER -->
      @if (activeTab() === 'movements') {
        <section class="tab-content">
          @if (loadingMovements()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading inventory movement history...</span>
            </div>
          } @else {
            <div class="table-card">
              <table class="crm-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Quantity Delta</th>
                    <th>Adjustment Reason</th>
                    <th>Lot Ref</th>
                    <th>Operator / Actor</th>
                  </tr>
                </thead>
                <tbody>
                  @if (movements().length === 0) {
                    <tr>
                      <td colspan="7" class="empty-cell">No movement events recorded in the ledger yet.</td>
                    </tr>
                  } @else {
                    @for (m of movements(); track m.id) {
                      <tr>
                        <td class="text-subtle">{{ m.created_at | slice:0:19 }}</td>
                        <td>
                          <b>{{ m.product_name || 'Product' }}</b>
                        </td>
                        <td>{{ m.distributor_name || 'Warehouse Partner' }}</td>
                        <td>
                          @if (m.quantity_delta > 0) {
                            <span class="delta-positive">+{{ m.quantity_delta | number }} units</span>
                          } @else {
                            <span class="delta-negative">{{ m.quantity_delta | number }} units</span>
                          }
                        </td>
                        <td>
                          <span class="reason-tag">{{ m.reason }}</span>
                        </td>
                        <td>
                          <span class="text-subtle">{{ m.lot_number || '—' }}</span>
                        </td>
                        <td>
                          <span class="operator-tag">👤 {{ m.changed_by_name || 'Operator' }}</span>
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

      <!-- TAB 4: LOW STOCK & REORDERS -->
      @if (activeTab() === 'low-stock') {
        <section class="tab-content">
          <div class="urgent-banner">
            ⚠️ <b>Restock Critical Notice:</b> The following products are below the minimum safety threshold (20 units). Initiate restock shipments or draft purchase orders to prevent clinical supply disruption.
          </div>

          <div class="low-stock-grid">
            @for (item of lowStockItems(); track item.id) {
              <div class="low-stock-card">
                <div class="lsc-header">
                  <span class="status-badge badge-red">CRITICAL STOCK: {{ item.quantity }} UNITS</span>
                  <span class="sku-badge">{{ item.product_sku || 'SKU' }}</span>
                </div>
                <h3>{{ item.product_name }}</h3>
                <p class="lsc-location">Warehouse: <b>{{ item.distributor_name }}</b></p>
                <div class="lsc-actions">
                  <button class="crm-btn crm-btn-sm crm-btn-primary" (click)="quickAdjust(item)">
                    <span>⚖</span> Restock (+ Inbound)
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- MODAL: ADJUST STOCK / INTAKE -->
      @if (showAdjustModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <div>
                <h2>Adjust Stock / Log Inbound Shipment</h2>
                <p class="modal-sub">Record positive stock intake or negative stock reallocation with full audit trace.</p>
              </div>
              <button class="close-btn" (click)="closeAdjustModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Product Formulation <span class="req">*</span></label>
                  <select [(ngModel)]="adjustForm.product_id" class="crm-select">
                    <option value="">-- Choose Product --</option>
                    @for (p of products(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.sku }})</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>Depot / Warehouse <span class="req">*</span></label>
                  <select [(ngModel)]="adjustForm.distributor_id" class="crm-select">
                    <option value="">-- Choose Warehouse --</option>
                    @for (d of distributors(); track d.id) {
                      <option [value]="d.id">{{ d.account_name || 'Distributor Facility' }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Quantity Delta (+ or -) <span class="req">*</span></label>
                  <input
                    type="number"
                    [(ngModel)]="adjustForm.quantity_delta"
                    class="crm-input"
                    placeholder="e.g. 50 for intake, -10 for damage"
                  />
                  <small class="text-subtle">Use positive for replenishment, negative for sample/damage.</small>
                </div>

                <div class="form-group">
                  <label>Reason for Adjustment <span class="req">*</span></label>
                  <select [(ngModel)]="adjustForm.reason" class="crm-select">
                    <option value="New Production Batch Intake">New Production Batch Intake</option>
                    <option value="Physical Inventory Count Reconciliation">Physical Count Reconciliation</option>
                    <option value="Hospital Formulary Transfer">Hospital Formulary Transfer</option>
                    <option value="Damaged / Quarantine Expiration">Damaged / Quarantine Expiration</option>
                    <option value="Clinical Sample Distribution">Clinical Sample Distribution</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Lot Number <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="adjustForm.lot_number"
                    class="crm-input"
                    placeholder="e.g. LOT-2026-092"
                  />
                </div>

                <div class="form-group">
                  <label>Batch Number</label>
                  <input
                    type="text"
                    [(ngModel)]="adjustForm.batch_number"
                    class="crm-input"
                    placeholder="e.g. BATCH-A04"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    [(ngModel)]="adjustForm.expiry_date"
                    class="crm-input"
                  />
                </div>

                <div class="form-group">
                  <label>Storage / Cold Chain Conditions</label>
                  <input
                    type="text"
                    [(ngModel)]="adjustForm.storage_conditions"
                    class="crm-input"
                    placeholder="e.g. Cold Chain 2°C - 8°C"
                  />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="crm-btn crm-btn-secondary" (click)="closeAdjustModal()" [disabled]="submitting()">
                Cancel
              </button>
              <button
                class="crm-btn crm-btn-primary"
                (click)="submitAdjust()"
                [disabled]="submitting() || !adjustForm.product_id || !adjustForm.distributor_id || !adjustForm.quantity_delta || !adjustForm.lot_number"
              >
                @if (submitting()) { Recording Adjustment... } @else { Submit Stock Adjustment }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .inventory-workspace { padding: 24px 32px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; }
    .page-header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 10px; }

    /* KPI GRID */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .kpi-card.highlight-amber { border-color: #fcd34d; background: #fffbeb; }
    .kpi-card.highlight-rose { border-color: #fda4af; background: #fff1f2; }
    .kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .icon-blue { background: #e0f2fe; }
    .icon-emerald { background: #dcfce7; }
    .icon-amber { background: #fef3c7; }
    .icon-rose { background: #ffe4e6; }
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
    .tab-badge.alert { background: #fee2e2; color: #b91c1c; font-weight: 700; }

    /* TOOLBAR & SEARCH */
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input-wrap { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; height: 38px; flex: 1; max-width: 480px; }
    .search-icon { font-size: 14px; color: #94a3b8; }
    .crm-search-input { border: none; outline: none; width: 100%; font-size: 13px; color: #1e293b; }
    .crm-select { height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13px; background: #ffffff; color: #334155; outline: none; }

    /* TABLES */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .crm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .crm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .crm-table td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .crm-table tr:hover td { background: #f8fafc; }
    .empty-cell { text-align: center; padding: 40px !important; color: #94a3b8; }
    .product-title { font-weight: 600; color: #0f172a; font-size: 13px; }
    .product-uuid { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .sku-badge { font-size: 11px; font-weight: 700; background: #f1f5f9; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .category-pill { font-size: 11px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; }
    .distributor-name { font-size: 13px; color: #334155; }
    .stock-qty-cell { display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
    .stock-number { font-weight: 700; font-size: 13px; }
    .stock-bar-track { height: 5px; width: 100%; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .stock-bar-fill { height: 100%; border-radius: 999px; }
    .bar-green { background: #10b981; }
    .bar-amber { background: #f59e0b; }
    .bar-red { background: #ef4444; }

    /* STATUS BADGES */
    .status-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .badge-green { background: #ecfdf5; color: #047857; }
    .badge-amber { background: #fffbeb; color: #b45309; }
    .badge-red { background: #fef2f2; color: #b91c1c; }
    .badge-slate { background: #f1f5f9; color: #64748b; }
    .lot-tag { font-family: monospace; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 6px; border-radius: 4px; }
    .storage-tag { font-size: 11px; color: #0284c7; background: #f0f9ff; padding: 2px 6px; border-radius: 4px; }
    .reason-tag { font-size: 12px; color: #334155; }
    .operator-tag { font-size: 12px; color: #64748b; }
    .delta-positive { color: #059669; font-weight: 700; }
    .delta-negative { color: #dc2626; font-weight: 700; }
    .text-subtle { color: #94a3b8; font-size: 12px; }
    .text-rose { color: #e11d48; }
    .text-amber { color: #d97706; }

    /* NOTICES & LOW STOCK GRID */
    .notice-info { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .urgent-banner { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; padding: 14px 18px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
    .low-stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .low-stock-card { background: #ffffff; border: 1px solid #fecdd3; border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px rgba(225, 29, 72, 0.05); }
    .lsc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .low-stock-card h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .lsc-location { font-size: 12px; color: #64748b; margin: 0 0 14px; }
    .lsc-actions { display: flex; justify-content: flex-end; }

    /* BUTTONS */
    .crm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .crm-btn-xs { height: 26px; padding: 0 8px; font-size: 11px; }
    .crm-btn-sm { height: 30px; padding: 0 10px; font-size: 12px; }
    .crm-btn-primary { background: #0284c7; color: #ffffff; }
    .crm-btn-primary:hover:not(:disabled) { background: #0369a1; }
    .crm-btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .crm-btn-secondary:hover:not(:disabled) { background: #f8fafc; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #64748b; }

    /* MODAL */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #ffffff; border-radius: 12px; width: 100%; max-width: 580px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
    .modal-sub { font-size: 12px; color: #64748b; margin: 0; }
    .close-btn { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; max-height: 75vh; overflow-y: auto; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 12px 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .req { color: #e11d48; }
    .crm-input { height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #1e293b; background: #ffffff; outline: none; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .crm-banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .banner-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .banner-danger { background: #fef2f2; border: 1px solid #fecdd3; color: #991b1b; }
    .crm-banner button { background: none; border: none; font-size: 16px; cursor: pointer; color: inherit; }
  `],
})
export class InventoryManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  activeTab = signal<'balances' | 'lots' | 'movements' | 'low-stock'>('balances');
  loading = signal<boolean>(true);
  loadingLots = signal<boolean>(false);
  loadingMovements = signal<boolean>(false);
  submitting = signal<boolean>(false);

  balances = signal<InventoryItem[]>([]);
  lots = signal<InventoryLotItem[]>([]);
  movements = signal<InventoryMovementItem[]>([]);
  products = signal<ProductOption[]>([]);
  distributors = signal<DistributorOption[]>([]);

  searchQuery = '';
  stockFilter = 'ALL';

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showAdjustModal = signal<boolean>(false);

  adjustForm = {
    product_id: '',
    distributor_id: '',
    quantity_delta: 50,
    reason: 'New Production Batch Intake',
    lot_number: '',
    batch_number: 'BATCH-A01',
    expiry_date: '',
    storage_conditions: 'Controlled 15°C - 25°C',
  };

  // KPIs
  totalStockUnits = computed(() => {
    return this.balances().reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  });

  activeProductsCount = computed(() => {
    const ids = new Set(this.balances().map((b) => b.product_id));
    return ids.size || this.products().length;
  });

  lowStockCount = computed(() => {
    return this.balances().filter((b) => b.quantity <= 20).length;
  });

  expiringLotsCount = computed(() => {
    const now = new Date().getTime();
    const threshold = 180 * 24 * 60 * 60 * 1000;
    return this.lots().filter((l) => {
      if (!l.expiry_date) return false;
      const exp = new Date(l.expiry_date).getTime();
      return exp - now <= threshold;
    }).length;
  });

  lowStockItems = computed(() => {
    return this.balances().filter((b) => b.quantity <= 20);
  });

  filteredBalances = computed(() => {
    let list = this.balances();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        (b.product_name && b.product_name.toLowerCase().includes(q)) ||
        (b.product_sku && b.product_sku.toLowerCase().includes(q)) ||
        (b.distributor_name && b.distributor_name.toLowerCase().includes(q))
      );
    }
    if (this.stockFilter === 'IN_STOCK') {
      list = list.filter((b) => b.quantity > 20);
    } else if (this.stockFilter === 'LOW') {
      list = list.filter((b) => b.quantity > 0 && b.quantity <= 20);
    } else if (this.stockFilter === 'OUT') {
      list = list.filter((b) => b.quantity === 0);
    }
    return list;
  });

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadBalances();
    this.loadLots();
    this.loadMovements();
    this.loadProductsAndDistributors();
  }

  loadBalances(): void {
    this.loading.set(true);
    this.api.get<InventoryItem[]>('/inventory', { limit: 150 }).subscribe({
      next: (res) => {
        this.balances.set(res || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load inventory balances.');
      },
    });
  }

  loadLots(): void {
    this.loadingLots.set(true);
    this.api.get<InventoryLotItem[]>('/inventory/lots', { limit: 100 }).subscribe({
      next: (res) => {
        this.lots.set(res || []);
        this.loadingLots.set(false);
      },
      error: () => this.loadingLots.set(false),
    });
  }

  loadMovements(): void {
    this.loadingMovements.set(true);
    this.api.get<InventoryMovementItem[]>('/inventory/movements', { limit: 100 }).subscribe({
      next: (res) => {
        this.movements.set(res || []);
        this.loadingMovements.set(false);
      },
      error: () => this.loadingMovements.set(false),
    });
  }

  loadProductsAndDistributors(): void {
    this.api.get<ProductOption[]>('/products', { limit: 150 }).subscribe({
      next: (res) => this.products.set(res || []),
      error: () => {},
    });

    this.api.get<DistributorOption[]>('/distributors').subscribe({
      next: (res) => this.distributors.set(res || []),
      error: () => {},
    });
  }

  calcBarWidth(qty: number): number {
    const max = 250;
    return Math.min(100, Math.round((qty / max) * 100));
  }

  getExpiryBadgeClass(dateStr?: string): string {
    if (!dateStr) return 'badge-slate';
    const days = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'badge-red';
    if (days < 90) return 'badge-rose';
    if (days < 180) return 'badge-amber';
    return 'badge-green';
  }

  getExpiryLabel(dateStr?: string): string {
    if (!dateStr) return 'Standard Expiry';
    const days = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days < 90) return `Urgent: ${days}d left`;
    if (days < 180) return `Monitor: ${days}d left`;
    return `Valid: ${days}d`;
  }

  openAdjustModal(): void {
    const defaultProd = this.products()[0]?.id || '';
    const defaultDist = this.distributors()[0]?.id || '';
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    const expStr = d.toISOString().slice(0, 10);
    this.adjustForm = {
      product_id: defaultProd,
      distributor_id: defaultDist,
      quantity_delta: 50,
      reason: 'New Production Batch Intake',
      lot_number: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      batch_number: 'BATCH-B01',
      expiry_date: expStr,
      storage_conditions: 'Controlled 15°C - 25°C',
    };
    this.showAdjustModal.set(true);
  }

  quickAdjust(item: InventoryItem): void {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    this.adjustForm = {
      product_id: item.product_id,
      distributor_id: item.distributor_id,
      quantity_delta: item.quantity <= 10 ? 100 : 50,
      reason: item.quantity <= 10 ? 'Physical Inventory Count Reconciliation' : 'New Production Batch Intake',
      lot_number: `LOT-RESTOCK-${Math.floor(100 + Math.random() * 900)}`,
      batch_number: 'BATCH-R01',
      expiry_date: d.toISOString().slice(0, 10),
      storage_conditions: 'Controlled 15°C - 25°C',
    };
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
  }

  submitAdjust(): void {
    if (!this.adjustForm.product_id || !this.adjustForm.distributor_id || !this.adjustForm.quantity_delta || !this.adjustForm.lot_number) {
      return;
    }
    this.submitting.set(true);
    const body = {
      product_id: this.adjustForm.product_id,
      distributor_id: this.adjustForm.distributor_id,
      quantity_delta: Number(this.adjustForm.quantity_delta),
      reason: this.adjustForm.reason,
      lot_number: this.adjustForm.lot_number,
      batch_number: this.adjustForm.batch_number || null,
      expiry_date: this.adjustForm.expiry_date || null,
      storage_conditions: this.adjustForm.storage_conditions || null,
    };

    const idempotencyKey = `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.api.post('/inventory/adjustments', body, { 'Idempotency-Key': idempotencyKey }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAdjustModal.set(false);
        this.successMessage.set(`Successfully recorded stock adjustment (${body.quantity_delta > 0 ? '+' : ''}${body.quantity_delta} units) for Lot ${body.lot_number}.`);
        setTimeout(() => this.successMessage.set(null), 6000);
        this.refreshAll();
      },
      error: (err: any) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to submit stock adjustment.');
      },
    });
  }
}
