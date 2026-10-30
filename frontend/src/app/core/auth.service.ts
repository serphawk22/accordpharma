import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenResponse, User } from './models';

const ACCESS_KEY = 'pharmaconnect.access';
const REFRESH_KEY = 'pharmaconnect.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  readonly user = signal<User | null>(null);

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  }

  get authenticated(): boolean {
    return Boolean(this.accessToken);
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      switchMap(() => this.loadCurrentUser()),
      catchError((error) => {
        this.clearSession();
        throw error;
      }),
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me`).pipe(tap((user) => this.user.set(user)));
  }

  refresh(): Observable<TokenResponse> {
    const token = this.refreshToken;
    if (!token) {
      throw new Error('No refresh token is available');
    }
    return this.http
      .post<TokenResponse>(`${this.baseUrl}/auth/refresh`, { refresh_token: token })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    if (refreshToken && this.accessToken) {
      this.http
        .post<void>(`${this.baseUrl}/auth/logout`, { refresh_token: refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
  }

  ensureUser(): Observable<boolean> {
    if (!this.authenticated) {
      return of(false);
    }
    if (this.user()) {
      return of(true);
    }
    return this.loadCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  hasRole(roles: string[]): boolean {
    return roles.length === 0 || this.user()?.roles.some((role) => roles.includes(role)) === true;
  }

  private storeTokens(tokens: TokenResponse): void {
    sessionStorage.setItem(ACCESS_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  }
}
