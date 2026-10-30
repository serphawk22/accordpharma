import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <main class="auth-page">
      <section class="auth-brand">
        <a class="brand-lockup" routerLink="/login" aria-label="PharmaConnect CRM home">
          <span class="brand-mark">P</span>
          <span>PharmaConnect <b>CRM</b></span>
        </a>
        <div class="brand-message">
          <span class="eyebrow">CONNECTED CARE. CLEARER WORKFLOWS.</span>
          <h1>Build stronger<br />healthcare relationships.</h1>
          <p>A secure workspace for customer engagement, commercial operations and field teams.</p>
        </div>
        <div class="brand-foot">A configurable pharmaceutical CRM platform</div>
      </section>

      <section class="auth-panel">
        @if (mode() === 'login') {
          <div class="auth-card">
            <div class="auth-heading">
              <span class="eyebrow">WELCOME BACK</span>
              <h2>Sign in to your workspace</h2>
              <p>Use your organization account to continue.</p>
            </div>
            @if (route.snapshot.queryParamMap.get('reason') === 'session') {
              <div class="notice warning" role="status">Your session ended. Please sign in again.</div>
            }
            @if (route.snapshot.queryParamMap.get('reset') === 'complete') {
              <div class="notice success" role="status">Your password was updated. Sign in with your new password.</div>
            }
            @if (error()) { <div class="notice danger" role="alert">{{ error() }}</div> }
            <form [formGroup]="loginForm" (ngSubmit)="signIn()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>Work email</mat-label>
                <input matInput type="email" autocomplete="username" formControlName="email" />
                @if (loginForm.controls.email.hasError('required')) {
                  <mat-error>Email is required</mat-error>
                } @else if (loginForm.controls.email.hasError('email')) {
                  <mat-error>Enter a valid email address</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" formControlName="password" />
                <button mat-button matSuffix type="button" class="visibility-toggle" (click)="togglePassword()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
                @if (loginForm.controls.password.hasError('required')) {
                  <mat-error>Password is required</mat-error>
                }
              </mat-form-field>
              <div class="auth-options"><a routerLink="/forgot-password">Forgot password?</a></div>
              <button mat-flat-button color="primary" class="auth-submit" type="submit" [disabled]="loginForm.invalid || busy()">
                @if (busy()) { <mat-spinner diameter="19" /> } @else { Sign in }
              </button>
            </form>
            <div class="auth-footnote">Your access is protected by your organization’s role permissions.</div>
          </div>
        } @else if (mode() === 'forgot') {
          <div class="auth-card">
            <div class="auth-heading">
              <span class="eyebrow">ACCOUNT RECOVERY</span>
              <h2>Reset your password</h2>
              <p>Enter your work email. If a matching account exists, follow the reset instructions sent by your administrator.</p>
            </div>
            @if (notice()) { <div class="notice success" role="status">{{ notice() }}</div> }
            @if (error()) { <div class="notice danger" role="alert">{{ error() }}</div> }
            <form [formGroup]="forgotForm" (ngSubmit)="requestReset()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>Work email</mat-label>
                <input matInput type="email" autocomplete="email" formControlName="email" />
                @if (forgotForm.controls.email.hasError('email')) { <mat-error>Enter a valid email address</mat-error> }
              </mat-form-field>
              <button mat-flat-button color="primary" class="auth-submit" type="submit" [disabled]="forgotForm.invalid || busy()">
                {{ busy() ? 'Sending…' : 'Request reset link' }}
              </button>
            </form>
            <a class="back-link" routerLink="/login">← Back to sign in</a>
          </div>
        } @else {
          <div class="auth-card">
            <div class="auth-heading">
              <span class="eyebrow">ACCOUNT RECOVERY</span>
              <h2>Choose a new password</h2>
              <p>Use at least 12 characters, including uppercase, lowercase and a number.</p>
            </div>
            @if (error()) { <div class="notice danger" role="alert">{{ error() }}</div> }
            <form [formGroup]="resetForm" (ngSubmit)="resetPassword()" class="auth-form">
              <mat-form-field appearance="outline">
                <mat-label>Reset token</mat-label>
                <input matInput formControlName="token" autocomplete="off" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input matInput type="password" autocomplete="new-password" formControlName="new_password" />
                @if (resetForm.controls.new_password.hasError('minlength')) { <mat-error>Use at least 12 characters</mat-error> }
                @if (resetForm.controls.new_password.hasError('pattern')) { <mat-error>Include uppercase, lowercase and a number</mat-error> }
              </mat-form-field>
              <button mat-flat-button color="primary" class="auth-submit" type="submit" [disabled]="resetForm.invalid || busy()">
                {{ busy() ? 'Updating…' : 'Update password' }}
              </button>
            </form>
            <a class="back-link" routerLink="/login">← Back to sign in</a>
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; }
    .auth-page { min-height:100vh; display:grid; grid-template-columns:minmax(300px, 42%) 1fr; background:#fff; }
    .auth-brand { background:#102a43; color:#fff; display:flex; flex-direction:column; justify-content:space-between; padding:42px clamp(28px,6vw,88px); }
    .brand-lockup { color:#fff; display:flex; align-items:center; gap:12px; text-decoration:none; font-size:17px; font-weight:600; letter-spacing:-.3px; }
    .brand-lockup b { color:#91c8ff; font-weight:700; }
    .brand-mark { display:grid; place-items:center; width:36px; height:36px; border-radius:11px; color:#102a43; background:#a5d5ff; font-size:21px; font-weight:800; }
    .brand-message { max-width:440px; padding:52px 0; }
    .brand-message h1 { font-size:clamp(34px,4vw,55px); line-height:1.12; letter-spacing:-1.7px; margin:18px 0; }
    .brand-message p { color:#c4d4e1; max-width:360px; line-height:1.7; font-size:15px; }
    .eyebrow { color:#5685ad; font-size:11px; font-weight:700; letter-spacing:1.3px; }
    .auth-brand .eyebrow { color:#a5d5ff; }
    .brand-foot { color:#aec2d2; font-size:12px; border-top:1px solid #29465f; padding-top:18px; }
    .auth-panel { display:grid; place-items:center; padding:40px 24px; }
    .auth-card { width:min(100%, 430px); }
    .auth-heading { margin-bottom:30px; }
    .auth-heading h2 { font-size:28px; letter-spacing:-.7px; margin:10px 0 8px; color:#162b40; }
    .auth-heading p { margin:0; color:#64778a; line-height:1.55; font-size:14px; }
    .auth-form { display:grid; gap:5px; }
    .auth-form mat-form-field { width:100%; }
    .auth-options { display:flex; justify-content:flex-end; margin:-4px 0 14px; }
    .auth-options a,.back-link { color:#1769aa; text-decoration:none; font-weight:600; font-size:13px; }
    .auth-submit { width:100%; min-height:46px; border-radius:8px; }
    .visibility-toggle { font-size:12px; }
    .auth-footnote { color:#8493a1; font-size:12px; text-align:center; border-top:1px solid #e8edf2; padding-top:18px; margin-top:24px; }
    .back-link { display:inline-block; margin-top:23px; }
    .notice { padding:12px 14px; border-radius:8px; margin:0 0 17px; font-size:13px; line-height:1.45; }
    .notice.danger { color:#a12a2a; background:#fff1f0; border:1px solid #ffd8d5; }
    .notice.success { color:#166343; background:#edf8f2; border:1px solid #ccebd8; }
    .notice.warning { color:#79520b; background:#fff8e6; border:1px solid #f4e2b5; }
    @media(max-width:760px) {
      .auth-page { grid-template-columns:1fr; }
      .auth-brand { min-height:190px; padding:24px; }
      .brand-message { padding:28px 0 10px; }
      .brand-message h1 { font-size:31px; }
      .brand-message p,.brand-foot { display:none; }
      .auth-panel { padding:38px 22px; align-items:start; }
    }
  `],
})
export class AuthScreensComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly mode = toSignal(
    this.route.data.pipe(map((data) => data['mode'] as 'login' | 'forgot' | 'reset')),
    { initialValue: this.route.snapshot.data['mode'] as 'login' | 'forgot' | 'reset' },
  );
  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly resetForm = this.fb.nonNullable.group({
    token: [this.route.snapshot.queryParamMap.get('token') ?? '', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
  });

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loginForm.reset();
      this.error.set('');
      this.notice.set('');
      this.busy.set(false);
    });
  }

  signIn(): void {
    if (this.loginForm.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.loginForm.getRawValue().email.trim(), this.loginForm.getRawValue().password).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (err: unknown) => this.error.set(this.describeError(err)),
      complete: () => this.busy.set(false),
    });
  }

  requestReset(): void {
    if (this.forgotForm.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.api.post<{ message: string }>('/auth/forgot-password', this.forgotForm.getRawValue()).subscribe({
      next: (response) => this.notice.set(response.message),
      error: (err: unknown) => this.error.set(this.describeError(err)),
      complete: () => this.busy.set(false),
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.post<void>('/auth/reset-password', this.resetForm.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { reset: 'complete' } }),
      error: (err: unknown) => this.error.set(this.describeError(err)),
      complete: () => this.busy.set(false),
    });
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'The backend is unreachable. Check that FastAPI is running at 127.0.0.1:8000.';
      if (error.status === 401) return 'Email or password was not accepted.';
      const detail = error.error?.detail;
      return typeof detail === 'string' ? detail : `The request could not be completed (HTTP ${error.status}).`;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}
