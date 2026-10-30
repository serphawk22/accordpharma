import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { NotificationStateService } from '../../core/notification-state.service';
import { FEATURE_ALIASES, FEATURE_DEFINITIONS, UNAVAILABLE_FEATURES } from '../../core/feature-definitions';
import { FeatureDefinition, FormField, PageColumn } from '../../core/models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">CRM WORKSPACE</span>
        <h1>{{ definition().title }}</h1>
        <p>{{ definition().description }}</p>
      </div>
      @if (canCreate()) {
        <button mat-flat-button color="primary" type="button" (click)="toggleCreate()">
          {{ showCreate() ? 'Close form' : (definition().createLabel || 'Create record') }}
        </button>
      }
    </section>

    @if (definition().unavailableReason) {
      <div class="info-banner" role="status">
        <span aria-hidden="true">ⓘ</span>
        <p>{{ definition().unavailableReason }}</p>
      </div>
    }

    @if (showCreate() && canCreate()) {
      <section class="create-panel">
        <div class="create-heading"><div><h2>{{ definition().createLabel || 'Create record' }}</h2><p>Changes are sent to the CRM backend for validation and persistence.</p></div></div>
        @if (formError()) { <div class="error-banner" role="alert">{{ formError() }}</div> }
        <form [formGroup]="createForm" (ngSubmit)="create()">
          <div class="form-grid">
            @for (field of definition().fields || []; track field.key) {
              @if (isSelectField(field.key)) {
                <div class="custom-select-field" [class.wide-field]="field.key === 'account_id' || field.key === 'product_id'">
                  <label class="custom-field-label">
                    {{ field.label }} @if (field.required) { <span class="req">*</span> }
                  </label>
                  @if (field.key === 'account_id') {
                    <select class="crm-form-select" [formControlName]="field.key">
                      <option value="">-- Choose Customer Account / Hospital --</option>
                      @for (acc of accountOptions(); track acc.id) {
                        <option [value]="acc.id">{{ acc.name }} {{ acc.territory ? '• ' + acc.territory : '' }}</option>
                      }
                    </select>
                  } @else if (field.key === 'product_id') {
                    <select class="crm-form-select" [formControlName]="field.key" (change)="onProductSelectChanged($any($event.target).value)">
                      <option value="">-- Choose Pharmaceutical Product --</option>
                      @for (prod of productOptions(); track prod.id) {
                        <option [value]="prod.id">{{ prod.name }} (SKU: {{ prod.sku }})</option>
                      }
                    </select>
                  } @else if (field.key === 'distributor_id') {
                    <select class="crm-form-select" [formControlName]="field.key">
                      <option value="">-- Direct Fulfillment / Choose Distributor (Optional) --</option>
                      @for (dist of distributorOptions(); track dist.id) {
                        <option [value]="dist.id">{{ dist.account_name || 'Distributor Partner' }} {{ dist.region ? '• ' + dist.region : '' }}</option>
                      }
                    </select>
                  } @else if (field.key === 'stage') {
                    <select class="crm-form-select" [formControlName]="field.key">
                      <option value="prospecting">Prospecting</option>
                      <option value="qualification">Qualification</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  } @else if (field.key === 'priority') {
                    <select class="crm-form-select" [formControlName]="field.key">
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  }
                  @if (createForm.controls[field.key]?.touched && createForm.controls[field.key]?.hasError('required')) {
                    <span class="field-error-msg">This selection is required</span>
                  }
                </div>
              } @else if (field.type === 'textarea') {
                <mat-form-field appearance="outline" class="wide-field">
                  <mat-label>{{ field.label }}</mat-label>
                  <textarea matInput [formControlName]="field.key" rows="3" [maxlength]="field.maxLength || null"></textarea>
                  @if (createForm.controls[field.key]?.hasError('required')) { <mat-error>This field is required</mat-error> }
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outline">
                  <mat-label>{{ field.label }}</mat-label>
                  <input matInput [type]="inputType(field)" [formControlName]="field.key" [maxlength]="field.maxLength || null" [min]="field.type === 'number' && field.key !== 'quantity_delta' ? 0 : null" [step]="field.type === 'number' ? 'any' : null" />
                  @if (createForm.controls[field.key]?.hasError('required')) { <mat-error>This field is required</mat-error> }
                  @if (createForm.controls[field.key]?.hasError('email')) { <mat-error>Enter a valid email</mat-error> }
                  @if (createForm.controls[field.key]?.hasError('minlength')) { <mat-error>Use at least 12 characters</mat-error> }
                  @if (field.key === 'password' && createForm.controls[field.key]?.hasError('pattern')) { <mat-error>Include uppercase, lowercase and a number</mat-error> }
                  @if (createForm.controls[field.key]?.hasError('pattern')) { <mat-error>Enter a nonzero whole-number adjustment</mat-error> }
                </mat-form-field>
              }
            }
          </div>
          <div class="form-actions">
            <button mat-button type="button" (click)="showCreate.set(false)">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="createForm.invalid || creating()">
              {{ creating() ? 'Saving…' : 'Save record' }}
            </button>
          </div>
        </form>
      </section>
    }

    @if (definition().endpoint) {
      <section class="data-panel">
        <div class="table-toolbar">
          <div class="record-count">
            <b>{{ rows().length }}</b>
            <span>{{ rows().length === 1 ? 'record' : 'records' }} on this page</span>
          </div>
          <div class="filters">
            @if (definition().endpoint === '/inventory') {
              <button mat-button type="button" (click)="toggleLowStock()" [attr.aria-pressed]="lowStockOnly()">
                {{ lowStockOnly() ? 'Show all stock' : 'Low stock only' }}
              </button>
            }
            @if (definition().endpoint === '/notifications') {
              <button mat-button type="button" (click)="markAllRead()" [disabled]="loading()">Mark all read</button>
            }
            @if (definition().searchParam) {
              <label class="search-filter">
                <span aria-hidden="true">⌕</span>
                <input type="search" aria-label="Filter records" placeholder="Search this list" [value]="searchValue()" (input)="searchValue.set($any($event.target).value)" (keydown.enter)="applyFilters()" />
                <button type="button" (click)="applyFilters()">Search</button>
              </label>
            }
            @if (definition().filterKey && definition().filterOptions?.length) {
              <label class="select-filter">
                <span class="sr-only">Filter by {{ definition().filterKey }}</span>
                <select [value]="filterValue()" (change)="filterValue.set($any($event.target).value); applyFilters()">
                  <option value="">All {{ definition().filterKey }}</option>
                  @for (option of definition().filterOptions; track option) { <option [value]="option">{{ option.replaceAll('_', ' ') }}</option> }
                </select>
              </label>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="table-state"><mat-spinner diameter="26" /><span>Loading records…</span></div>
        } @else if (error()) {
          <div class="table-state error-state">
            <span class="state-icon">!</span><b>Couldn’t load {{ definition().title.toLowerCase() }}</b>
            <p>{{ error() }}</p>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <button mat-stroked-button type="button" (click)="load()">Try again</button>
              @if (error().includes('session') || error().includes('Sign in') || error().includes('authenticated')) {
                <a mat-flat-button color="primary" routerLink="/login" style="background:#2563eb; color:#fff; padding:4px 12px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center;">Sign in again</a>
              }
            </div>
          </div>
        } @else if (!rows().length) {
          <div class="table-state empty-state">
            <span class="state-icon">▤</span><b>No records found</b>
            <p>{{ searchValue() || filterValue() ? 'Try changing or clearing your filters.' : 'No records are currently available in your access scope.' }}</p>
            @if (canCreate()) { <button mat-stroked-button type="button" (click)="showCreate.set(true)">Create the first record</button> }
          </div>
        } @else {
          <div class="table-scroll">
            <table>
              <thead><tr>@for (column of definition().columns || []; track column.key) { <th>{{ column.label }}</th> }@if (hasRowActions()) { <th>Actions</th> }</tr></thead>
              <tbody>
                @for (row of rows(); track row['id'] || row['order_number'] || $index) {
                  <tr>
                    @for (column of definition().columns || []; track column.key) {
                      <td [class.status-cell]="column.format === 'status'">
                        @if (definition().endpoint === '/pharmacovigilance/intakes' && column.key === 'status') {
                          <select class="pv-status" [value]="row['status']" [attr.aria-label]="'Update case status for ' + row['report_reference']" (change)="updatePvStatus(row, $any($event.target).value, $any($event.target))">
                            @for (status of pvStatuses; track status) { <option [value]="status">{{ status.replaceAll('_', ' ') }}</option> }
                          </select>
                        } @else if (column.format === 'status') {
                          <span class="status-badge" [class]="statusClass(row[column.key])">{{ displayValue(row[column.key], column) }}</span>
                        } @else if (column.key === 'expiry_date' && row[column.key]) {
                          <span class="expiry-value" [class.expired]="isExpired(row[column.key])">{{ displayValue(row[column.key], column) }}</span>
                          @if (isExpired(row[column.key])) { <span class="expiry-tag">Expired</span> }
                          @else if (isNearExpiry(row[column.key])) { <span class="expiry-tag soon">Expiring soon</span> }
                        } @else {
                          <span [title]="displayValue(row[column.key], column)">{{ displayValue(row[column.key], column) }}</span>
                        }
                      </td>
                    }
                    @if (definition().endpoint === '/notifications') {
                      <td class="row-action">@if (!row['read_at']) { <button mat-button type="button" (click)="markRead(row)">Mark read</button> } @else { <span>Read</span> }</td>
                    }
                    @if (definition().endpoint === '/users') {
                      <td class="row-action"><button mat-button type="button" [disabled]="row['id'] === currentUserId()" (click)="updateUserStatus(row)">{{ row['is_active'] ? 'Deactivate' : 'Activate' }}</button></td>
                    }
                    @if (definition().endpoint === '/orders') {
                      <td class="row-action">
                        @if (row['status'] === 'draft') {
                          <button mat-button class="btn-order-submit" type="button" [disabled]="isActionBusy(row)" (click)="submitOrder(row)">{{ isActionBusy(row) ? 'Submitting…' : '✓ Submit' }}</button>
                          <button mat-button class="btn-order-cancel" type="button" [disabled]="isActionBusy(row)" (click)="cancelOrder(row)">Cancel</button>
                        } @else {
                          <span class="order-confirmed-label">{{ row['status'] === 'submitted' ? '✓ Submitted' : 'Cancelled' }}</span>
                        }
                      </td>
                    }
                    @if (definition().endpoint === '/tenders') {
                      <td class="row-action">
                        <select class="status-change-dropdown" [value]="row['status']" [disabled]="isActionBusy(row)" (change)="updateTenderStatus(row, $any($event.target).value, $any($event.target))">
                          <option value="draft">Draft</option>
                          <option value="open">Open</option>
                          <option value="submitted">Submitted</option>
                          <option value="awarded">Awarded</option>
                          <option value="closed">Closed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    }
                    @if (definition().endpoint === '/products') {
                      <td class="row-action">
                        <button mat-button type="button" [disabled]="isActionBusy(row)" (click)="toggleProductActive(row)">
                          {{ row['is_active'] ? 'Deactivate' : 'Activate' }}
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span>Showing {{ offset() + 1 }}–{{ offset() + rows().length }} records</span>
            <div>
              <button mat-button type="button" (click)="previousPage()" [disabled]="offset() === 0 || loading()">Previous</button>
              <button mat-button type="button" (click)="nextPage()" [disabled]="rows().length < pageSize || loading()">Next</button>
            </div>
          </div>
        }
      </section>
    } @else {
      <section class="unavailable-panel">
        <div class="unavailable-symbol">◇</div>
        <h2>This workspace is not connected yet</h2>
        <p>{{ definition().unavailableReason || 'The required backend endpoint has not been implemented.' }}</p>
        <span>No sample records are being shown.</span>
      </section>
    }
  `,
  styles: [`
    :host { display:block; }
    .page-heading { display:flex; align-items:center; justify-content:space-between; gap:18px; margin:0 0 21px; }
    .eyebrow { color:#5d8bb2; letter-spacing:1.2px; font-size:10px; font-weight:700; }
    h1 { font-size:25px; letter-spacing:-.6px; color:#1b3044; margin:7px 0 5px; }
    .page-heading p { color:#758594; font-size:12px; margin:0; }
    .page-heading button,.form-actions button { border-radius:7px; font-size:11px; }
    .info-banner { display:flex; align-items:flex-start; gap:10px; color:#486a85; background:#eef6fc; border:1px solid #d6e9f6; padding:11px 14px; border-radius:8px; margin-bottom:15px; }
    .info-banner p { margin:0; font-size:10px; line-height:1.5; }
    .create-panel,.data-panel,.unavailable-panel { background:#fff; border:1px solid #e5eaf0; border-radius:10px; box-shadow:0 2px 8px #19324a05; }
    .create-panel { padding:18px; margin-bottom:16px; }
    .create-heading h2 { margin:0 0 5px; font-size:14px; color:#293f53; }
    .create-heading p { margin:0 0 16px; color:#8795a1; font-size:10px; }
    .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px 14px; }
    .form-grid mat-form-field { width:100%; }
    .wide-field { grid-column:1/-1; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; }
    .error-banner { background:#fff2f1; border:1px solid #f4d1cd; color:#9f3833; border-radius:7px; padding:10px 12px; margin-bottom:14px; font-size:11px; }
    .data-panel { overflow:hidden; }
    .table-toolbar { padding:13px 16px; min-height:57px; display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid #e9edf1; }
    .record-count { display:flex; align-items:baseline; gap:7px; color:#82919d; font-size:10px; }
    .record-count b { color:#30475b; font-size:13px; }
    .filters { display:flex; align-items:center; gap:8px; }
    .search-filter { height:32px; width:min(250px,30vw); display:flex; align-items:center; gap:7px; padding:0 7px 0 10px; border:1px solid #e0e7ed; border-radius:7px; color:#82919d; }
    .search-filter input { min-width:0; flex:1; border:0; outline:0; background:transparent; font-size:10px; color:#30475b; }
    .search-filter button { border:0; background:none; color:#2b74ad; font-size:9px; font-weight:650; cursor:pointer; }
    .select-filter select { height:32px; border:1px solid #e0e7ed; border-radius:7px; background:#fff; color:#526779; font-size:10px; padding:0 9px; text-transform:capitalize; }
    .table-scroll { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; text-align:left; }
    th { background:#f8fafb; color:#84929e; font-size:9px; letter-spacing:.35px; font-weight:650; padding:11px 14px; white-space:nowrap; }
    td { color:#526779; font-size:10px; padding:12px 14px; border-top:1px solid #edf0f3; max-width:240px; }
    td > span:not(.status-badge):not(.expiry-tag) { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    tbody tr:hover { background:#fbfcfd; }
    .status-badge { display:inline-flex; align-items:center; padding:4px 8px; border-radius:14px; text-transform:capitalize; font-size:9px; line-height:1.2; background:#edf1f4; color:#5e6e7a; white-space:nowrap; }
    .status-badge.positive { color:#267453; background:#eaf7f0; }.status-badge.warning { color:#98641c; background:#fff4e3; }.status-badge.negative { color:#ac4747; background:#fff0ee; }.status-badge.info { color:#286e9f; background:#eaf4fb; }
    .expiry-value.expired { color:#b34b4b; font-weight:700; }
    .expiry-tag { display:inline-block; margin:4px 0 0; color:#a34545; font-size:8px; }
    .expiry-tag.soon { color:#a46d25; }
    .pv-status { max-width:130px; padding:5px 7px; border:1px solid #dfe7ed; border-radius:6px; color:#526779; background:#fff; font-size:9px; text-transform:capitalize; }
    .row-action { white-space:nowrap; }.row-action button { font-size:9px; }
    .table-footer { min-height:47px; display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:1px solid #edf0f3; padding:5px 12px 5px 16px; color:#8795a1; font-size:9px; }
    .table-footer > div { display:flex; }
    .table-footer button { font-size:10px; }
    .table-state { min-height:250px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:25px; color:#81909d; font-size:11px; text-align:center; }
    .table-state b { color:#465c6f; font-size:12px; }
    .table-state p { max-width:420px; margin:0; line-height:1.6; color:#8a98a3; font-size:10px; }
    .table-state button { margin-top:3px; font-size:10px; }
    .state-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; background:#edf4f9; color:#5586ac; font-size:14px; font-weight:700; }
    .error-state .state-icon { background:#fff0ee; color:#b84a4a; }
    .unavailable-panel { min-height:310px; padding:40px 24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
    .unavailable-symbol { width:48px; height:48px; display:grid; place-items:center; background:#eff6fb; color:#6097bf; border-radius:14px; font-size:23px; }
    .unavailable-panel h2 { color:#31495d; margin:15px 0 7px; font-size:15px; }
    .unavailable-panel p { max-width:550px; color:#7e8d99; font-size:11px; line-height:1.65; margin:0; }
    .unavailable-panel > span { color:#9ba7b0; font-size:9px; margin-top:12px; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    @media(max-width:700px) {
      .page-heading { align-items:flex-start; }
      .page-heading button { white-space:nowrap; }
      .table-toolbar { align-items:flex-start; flex-direction:column; gap:9px; }
      .filters { width:100%; flex-wrap:wrap; }
      .search-filter { flex:1; width:auto; }
      .form-grid { grid-template-columns:1fr; }
      .wide-field { grid-column:auto; }
      td,th { padding:10px; }
    }
    .custom-select-field { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
    .custom-field-label { font-size:11px; font-weight:600; color:#4a6176; }
    .custom-field-label .req { color:#c93b3b; margin-left:2px; }
    .crm-form-select { height:40px; padding:0 10px; border-radius:7px; border:1px solid #d0dbe5; background:#fbfdff; color:#1c354d; font-size:11px; font-family:inherit; outline:none; transition:border-color 0.15s ease; }
    .crm-form-select:focus { border-color:#2b74ad; background:#fff; }
    .field-error-msg { font-size:10px; color:#c93b3b; }
    .status-change-dropdown { height:28px; border-radius:6px; border:1px solid #ced8e1; background:#fff; font-size:10px; font-weight:600; color:#3b5266; padding:0 6px; cursor:pointer; text-transform:capitalize; }
    .status-change-dropdown:focus { border-color:#2b74ad; outline:none; }
    .btn-order-submit { color:#1e704a !important; font-weight:600 !important; background:#eaf7f0 !important; border-radius:6px !important; margin-right:4px !important; }
    .btn-order-cancel { color:#b03838 !important; border-radius:6px !important; }
    .order-confirmed-label { font-size:10px; font-weight:600; color:#267453; background:#eaf7f0; padding:4px 8px; border-radius:12px; }
  `],
})
export class FeaturePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationStateService);
  readonly definition = signal<FeatureDefinition>({
    title: 'Workspace',
    description: 'CRM records',
    unavailableReason: 'No endpoint configuration was found for this page.',
  });
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly formError = signal('');
  readonly searchValue = signal('');
  readonly filterValue = signal('');
  readonly offset = signal(0);
  readonly lowStockOnly = signal(false);
  readonly pvStatuses = ['received', 'in_review', 'follow_up', 'closed'];
  readonly busyRowIds = signal<string[]>([]);
  private pendingIdempotencyKey: string | null = null;
  private loadSubscription: Subscription | null = null;
  readonly pageSize = 50;
  readonly createForm = new FormRecord<FormControl<string>>({});
  readonly accountOptions = signal<{ id: string; name: string; territory?: string }[]>([]);
  readonly productOptions = signal<{ id: string; name: string; sku: string; category?: string }[]>([]);
  readonly distributorOptions = signal<{ id: string; account_name?: string; region?: string }[]>([]);
  readonly canCreate = computed(() => {
    const definition = this.definition();
    return Boolean(definition.createEndpoint) &&
      (!definition.roleRequired || this.auth.hasRole(definition.roleRequired));
  });

  ngOnInit(): void {
    this.loadPickers();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const slug = String(data['feature'] ?? '');
      const key = FEATURE_ALIASES[slug];
      this.definition.set(
        (key ? FEATURE_DEFINITIONS[key] : undefined) ??
          UNAVAILABLE_FEATURES[slug] ??
          this.definition(),
      );
      this.buildForm();
      this.searchValue.set('');
      this.filterValue.set('');
      this.offset.set(0);
      this.lowStockOnly.set(false);
      this.pendingIdempotencyKey = null;
      this.rows.set([]);
      this.loaded.set(false);
      this.error.set('');
      if (this.definition().endpoint) this.load();
    });
  }

  load(): void {
    const definition = this.definition();
    if (!definition.endpoint) return;
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const endpoint = definition.endpoint === '/inventory' && this.lowStockOnly()
      ? '/inventory/low-stock'
      : definition.endpoint;
    const query: Record<string, string | number | boolean | undefined> = {
      ...definition.query,
      limit: this.pageSize,
      offset: this.offset(),
    };
    if (definition.searchParam && this.searchValue().trim()) {
      query[definition.searchParam] = this.searchValue().trim();
    }
    if (definition.filterKey && this.filterValue()) {
      query[definition.filterKey] = this.filterValue();
    }
    if (endpoint === '/inventory/low-stock') query['threshold'] = 10;
    this.loadSubscription = this.api.get<unknown[]>(endpoint, query).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (items) => {
        this.rows.set(Array.isArray(items) ? items.filter(this.isRecord) : []);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(this.describeError(error));
        this.loaded.set(true);
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.offset.set(0);
    this.load();
  }

  toggleCreate(): void {
    this.showCreate.update((visible) => !visible);
  }

  toggleLowStock(): void {
    this.lowStockOnly.update((enabled) => !enabled);
    this.offset.set(0);
    this.load();
  }

  hasRowActions(): boolean {
    return ['/notifications', '/users', '/orders', '/tenders', '/products'].includes(this.definition().endpoint ?? '');
  }

  isSelectField(key: string): boolean {
    return ['account_id', 'product_id', 'distributor_id', 'stage', 'priority'].includes(key);
  }

  onProductSelectChanged(productId: string): void {
    if (this.definition().createEndpoint === '/orders') {
      if (!this.createForm.controls['quantity']?.value) {
        this.createForm.controls['quantity']?.setValue('10');
      }
      if (!this.createForm.controls['unit_price']?.value) {
        this.createForm.controls['unit_price']?.setValue('45.00');
      }
    }
  }

  loadPickers(): void {
    this.api.get<{ id: string; name: string; territory?: string }[]>('/sales/accounts?limit=100').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => this.accountOptions.set(res || []),
      error: () => {},
    });

    this.api.get<{ id: string; name: string; sku: string; category?: string }[]>('/products?limit=100').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => this.productOptions.set(res || []),
      error: () => {},
    });

    this.api.get<{ id: string; account_name?: string; region?: string }[]>('/distributors').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => this.distributorOptions.set(res || []),
      error: () => {},
    });
  }

  currentUserId(): string | null {
    return this.auth.user()?.id ?? null;
  }

  nextPage(): void {
    if (this.rows().length < this.pageSize) return;
    this.offset.update((offset) => offset + this.pageSize);
    this.load();
  }

  previousPage(): void {
    this.offset.update((offset) => Math.max(offset - this.pageSize, 0));
    this.load();
  }

  inputType(field: FormField): string {
    if (field.key === 'password') return 'password';
    return field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text';
  }

  displayValue(value: unknown, column: PageColumn): string {
    if (value === null || value === undefined || value === '') return '—';
    if (column.key === 'items' && Array.isArray(value)) return `${value.length} items`;
    if (column.format === 'date') {
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    }
    if (column.format === 'currency') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(numeric) : '—';
    }
    if (column.format === 'status' && typeof value === 'boolean') return value ? 'Active' : 'Inactive';
    if (Array.isArray(value)) return value.map(String).join(', ');
    if (typeof value === 'object') return '—';
    const text = String(value);
    return column.format === 'truncate' && text.length > 64 ? `${text.slice(0, 64)}…` : text;
  }

  statusClass(value: unknown): string {
    const status = typeof value === 'boolean' ? (value ? 'active' : 'inactive') : String(value).toLowerCase();
    if (['active', 'open', 'won', 'submitted', 'resolved', 'awarded', 'in_review'].includes(status)) return 'positive';
    if (['draft', 'waiting', 'prospecting', 'qualification', 'proposal', 'negotiation', 'normal', 'pending', 'in_progress'].includes(status)) return 'warning';
    if (['inactive', 'archived', 'closed', 'lost', 'rejected', 'urgent', 'high'].includes(status)) return 'negative';
    return 'info';
  }

  isExpired(value: unknown): boolean {
    return typeof value === 'string' && value < new Date().toISOString().slice(0, 10);
  }

  isNearExpiry(value: unknown): boolean {
    if (typeof value !== 'string' || this.isExpired(value)) return false;
    const delta = new Date(value).getTime() - Date.now();
    return delta <= 1000 * 60 * 60 * 24 * 90;
  }

  create(): void {
    if (this.createForm.invalid || this.creating()) return;
    const definition = this.definition();
    if (!definition.createEndpoint) return;
    this.creating.set(true);
    this.formError.set('');
    const payload = this.createPayload(definition.fields ?? []);
    const idempotentEndpoint = ['/orders', '/inventory/adjustments'].includes(definition.createEndpoint);
    if (idempotentEndpoint && !this.pendingIdempotencyKey) {
      this.pendingIdempotencyKey = crypto.randomUUID();
    }
    const headers = idempotentEndpoint && this.pendingIdempotencyKey
      ? { 'Idempotency-Key': this.pendingIdempotencyKey }
      : undefined;
    this.api.post<Record<string, unknown>>(definition.createEndpoint, payload, headers).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.showCreate.set(false);
        this.createForm.reset();
        this.offset.set(0);
        this.pendingIdempotencyKey = null;
        this.load();
        this.creating.set(false);
      },
      error: (error: unknown) => {
        this.formError.set(this.describeError(error));
        this.creating.set(false);
      },
    });
  }

  markRead(row: Record<string, unknown>): void {
    if (typeof row['id'] !== 'string' || row['read_at']) return;
    this.notifications.markRead(row['id']).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => this.rows.update((items) => items.map((item) => item['id'] === row['id'] ? { ...item, ...updated } : item)),
      error: (error: unknown) => this.error.set(this.describeError(error)),
    });
  }

  markAllRead(): void {
    this.notifications.markAllRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.rows.update((items) => items.map((item) => ({ ...item, read_at: item['read_at'] || new Date().toISOString() }))),
      error: (error: unknown) => this.error.set(this.describeError(error)),
    });
  }

  updateUserStatus(row: Record<string, unknown>): void {
    if (typeof row['id'] !== 'string' || row['id'] === this.currentUserId()) return;
    const nextStatus = !Boolean(row['is_active']);
    if (!window.confirm(`${nextStatus ? 'Activate' : 'Deactivate'} this user account?`)) return;
    this.api.patch<Record<string, unknown>>(`/users/${encodeURIComponent(row['id'])}/status`, {
      is_active: nextStatus,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => this.rows.update((items) =>
        items.map((item) => item['id'] === row['id'] ? { ...item, ...updated } : item),
      ),
      error: (error: unknown) => this.error.set(this.describeError(error)),
    });
  }

  updatePvStatus(row: Record<string, unknown>, status: string, control: HTMLSelectElement): void {
    if (typeof row['id'] !== 'string' || !this.pvStatuses.includes(status)) {
      control.value = String(row['status'] ?? '');
      return;
    }
    if (status === 'closed' && !window.confirm('Close this safety intake? Confirm only after the required review is complete.')) {
      control.value = String(row['status'] ?? '');
      return;
    }
    this.api.patch<Record<string, unknown>>(
      `/pharmacovigilance/intakes/${encodeURIComponent(row['id'])}`,
      { status },
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => this.rows.update((items) =>
        items.map((item) => item['id'] === row['id'] ? { ...item, ...updated } : item),
      ),
      error: (error: unknown) => {
        this.error.set(this.describeError(error));
        control.value = String(row['status'] ?? '');
      },
    });
  }

  isActionBusy(row: Record<string, unknown>): boolean {
    return typeof row['id'] === 'string' && this.busyRowIds().includes(row['id']);
  }

  submitOrder(row: Record<string, unknown>): void {
    if (typeof row['id'] !== 'string' || row['status'] !== 'draft') return;
    if (!window.confirm('Submit this draft order? The backend will validate availability and reserve stock.')) return;
    this.runOrderAction(row, this.api.patch<Record<string, unknown>>(`/orders/${encodeURIComponent(row['id'])}`, { status: 'submitted' }));
  }

  cancelOrder(row: Record<string, unknown>): void {
    if (typeof row['id'] !== 'string' || row['status'] !== 'draft') return;
    if (!window.confirm('Cancel this draft order?')) return;
    this.runOrderAction(row, this.api.post<Record<string, unknown>>(`/orders/${encodeURIComponent(row['id'])}/cancel`, undefined));
  }

  updateTenderStatus(row: Record<string, unknown>, status: string, control?: HTMLSelectElement): void {
    if (typeof row['id'] !== 'string') return;
    const oldStatus = String(row['status'] ?? '');
    if (status === oldStatus) return;
    this.runOrderAction(row, this.api.patch<Record<string, unknown>>(`/tenders/${encodeURIComponent(row['id'])}`, { status }));
  }

  toggleProductActive(row: Record<string, unknown>): void {
    if (typeof row['id'] !== 'string') return;
    const nextActive = !Boolean(row['is_active']);
    this.runOrderAction(row, this.api.patch<Record<string, unknown>>(`/products/${encodeURIComponent(row['id'])}`, { is_active: nextActive }));
  }

  private runOrderAction(row: Record<string, unknown>, request: Observable<Record<string, unknown>>): void {
    const id = String(row['id']);
    this.busyRowIds.update((ids) => [...ids, id]);
    this.error.set('');
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busyRowIds.update((ids) => ids.filter((item) => item !== id))),
    ).subscribe({
      next: (updated) => this.rows.update((items) => items.map((item) => item['id'] === id ? { ...item, ...updated } : item)),
      error: (error: unknown) => this.error.set(this.describeError(error)),
    });
  }

  private buildForm(): void {
    for (const key of Object.keys(this.createForm.controls)) this.createForm.removeControl(key);
    for (const field of this.definition().fields ?? []) {
      const validators = field.required ? [Validators.required] : [];
      if (field.type === 'email') validators.push(Validators.email);
      if (field.key === 'password') {
        validators.push(Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/));
      }
      if (field.key === 'quantity_delta') validators.push(Validators.pattern(/^-?[1-9]\d*$/));
      if (['quantity', 'unit_price'].includes(field.key)) validators.push(Validators.min(field.key === 'quantity' ? 1 : 0));
      if (field.key === 'probability') validators.push(Validators.max(100));
      if (field.maxLength) validators.push(Validators.maxLength(field.maxLength));
      this.createForm.addControl(field.key, new FormControl('', { nonNullable: true, validators }));
    }
  }

  private createPayload(fields: FormField[]): Record<string, unknown> {
    const raw = this.createForm.getRawValue();
    if (this.definition().createEndpoint === '/orders') {
      return {
        account_id: raw['account_id'],
        distributor_id: raw['distributor_id'] || null,
        items: [{
          product_id: raw['product_id'],
          quantity: Number(raw['quantity']),
          unit_price: raw['unit_price'],
        }],
      };
    }
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      const value = raw[field.key]?.trim();
      if (value === undefined || value === '') continue;
      if (field.type === 'number') result[field.key] = Number(value);
      else if (field.key === 'roles') result['roles'] = value.split(',').map((role) => role.trim()).filter(Boolean);
      else if (field.key === 'due_at') result[field.key] = `${value}T00:00:00Z`;
      else result[field.key] = value;
    }
    if (definitionIsProduct(this.definition())) result['is_active'] = true;
    return result;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Server connection interrupted or session expired. Please click Try again or Sign in again.';
      if (error.status === 401) return 'Your session has expired. Sign in again to view these records.';
      if (error.status === 403) return 'Your account role is not authorized to access this resource.';
      const detail = error.error?.detail;
      if (Array.isArray(detail)) return detail.map((item) => `${item.loc?.slice(-1)[0] ?? 'Field'}: ${item.msg}`).join('; ');
      return typeof detail === 'string' ? detail : `Request failed with HTTP ${error.status}.`;
    }
    return 'An unexpected error occurred while communicating with the backend.';
  }
}

function definitionIsProduct(definition: FeatureDefinition): boolean {
  return definition.createEndpoint === '/products';
}
