import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="page-heading">
      <div><span class="eyebrow">PREFERENCES</span><h1>Settings</h1><p>Manage your account information and sign-in credentials.</p></div>
    </section>
    @if (message()) { <div class="notice success" role="status">{{ message() }}</div> }
    @if (error()) { <div class="notice danger" role="alert">{{ error() }}</div> }
    <div class="settings-grid">
      <section class="settings-card profile-card">
        <div class="card-heading"><span class="card-icon">♙</span><div><h2>Profile</h2><p>Account information provided by your administrator.</p></div></div>
        @if (user(); as current) {
          <div class="profile-row"><span>Full name</span><b>{{ current.full_name }}</b></div>
          <div class="profile-row"><span>Work email</span><b>{{ current.email }}</b></div>
          <div class="profile-row"><span>Territory</span><b>{{ current.territory || 'Not assigned' }}</b></div>
          <div class="profile-row"><span>Roles</span><b>{{ current.roles.join(', ') }}</b></div>
          <div class="profile-row"><span>Account status</span><b>{{ current.is_active ? 'Active' : 'Inactive' }}</b></div>
        }
      </section>
      <section class="settings-card">
        <div class="card-heading"><span class="card-icon blue">⌑</span><div><h2>Change password</h2><p>Choose a strong password with at least 12 characters.</p></div></div>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <mat-form-field appearance="outline"><mat-label>Current password</mat-label><input matInput type="password" autocomplete="current-password" formControlName="current_password" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>New password</mat-label><input matInput type="password" autocomplete="new-password" formControlName="new_password" />@if (passwordForm.controls.new_password.hasError('minlength')) { <mat-error>Use at least 12 characters</mat-error> }@if (passwordForm.controls.new_password.hasError('pattern')) { <mat-error>Include uppercase, lowercase and a number</mat-error> }</mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Confirm new password</mat-label><input matInput type="password" autocomplete="new-password" formControlName="confirm_password" />@if (passwordForm.hasError('passwordMismatch')) { <mat-error>Passwords do not match</mat-error> }</mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="passwordForm.invalid || saving()">{{ saving() ? 'Updating…' : 'Update password' }}</button>
        </form>
      </section>
      <section class="settings-card info-card">
        <div class="card-heading"><span class="card-icon green">i</span><div><h2>Application</h2><p>About this workspace</p></div></div>
        <div class="profile-row"><span>Product</span><b>PharmaConnect CRM</b></div>
        <div class="profile-row"><span>Environment</span><b>Local development</b></div>
        <div class="profile-row"><span>Data source</span><b>FastAPI backend</b></div>
        <p class="privacy-note">Profile and role changes are managed by an administrator. Secrets and server configuration are never available in this interface.</p>
      </section>
    </div>
  `,
  styles: [`
    :host { display:block; }.page-heading { margin:0 0 21px; }.eyebrow { color:#5d8bb2; letter-spacing:1.2px; font-size:10px; font-weight:700; }h1 { color:#1b3044; font-size:25px; letter-spacing:-.6px; margin:7px 0 5px; }.page-heading p { color:#758594; font-size:12px; margin:0; }
    .settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }.settings-card { background:#fff; border:1px solid #e5eaf0; border-radius:10px; padding:19px; }
    .card-heading { display:flex; align-items:center; gap:11px; margin-bottom:17px; }.card-icon { width:34px; height:34px; border-radius:9px; background:#f0edfb; color:#7365ad; display:grid; place-items:center; }.card-icon.blue { background:#eaf4fc; color:#347daf; }.card-icon.green { background:#eaf7f1; color:#338367; }.card-heading h2 { margin:0 0 4px; color:#30475b; font-size:13px; }.card-heading p { margin:0; color:#8997a2; font-size:10px; }
    .profile-row { display:flex; justify-content:space-between; gap:10px; padding:11px 0; border-top:1px solid #eef1f3; color:#82909b; font-size:10px; }.profile-row b { color:#40566a; font-weight:600; text-align:right; overflow-wrap:anywhere; }
    form { display:grid; gap:2px; }mat-form-field { width:100%; }form button { justify-self:start; min-height:38px; border-radius:7px; font-size:11px; }.privacy-note { border-top:1px solid #eef1f3; padding-top:13px; margin:10px 0 0; color:#8795a1; line-height:1.6; font-size:10px; }
    .notice { border-radius:8px; padding:11px 14px; margin-bottom:15px; font-size:11px; }.notice.success { color:#176343; background:#edf8f2; border:1px solid #ccebd8; }.notice.danger { color:#a12a2a; background:#fff1f0; border:1px solid #ffd8d5; }
    @media(max-width:760px) { .settings-grid { grid-template-columns:1fr; } }
  `],
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user = this.auth.user;
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    confirm_password: ['', Validators.required],
  }, { validators: (control) => control.get('new_password')?.value === control.get('confirm_password')?.value ? null : { passwordMismatch: true } });

  changePassword(): void {
    if (this.passwordForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    const { current_password, new_password } = this.passwordForm.getRawValue();
    this.api.post<void>('/auth/change-password', { current_password, new_password }).subscribe({
      next: () => {
        this.message.set('Password updated. Sign in again with your new credentials.');
        this.auth.clearSession();
        window.setTimeout(() => void this.router.navigate(['/login']), 1200);
      },
      error: (error: unknown) => {
        this.error.set(this.describeError(error));
        this.saving.set(false);
      },
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'The backend is unreachable. Try again after it is running.';
      const detail = error.error?.detail;
      return typeof detail === 'string' ? detail : `Password change failed (HTTP ${error.status}).`;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}
