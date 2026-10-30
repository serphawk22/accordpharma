import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenResponse } from './models';

const RETRIED = new HttpContextToken<boolean>(() => false);
let refreshRequest: Observable<TokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'].some(
          (path) => request.url.includes(path),
        ) ||
        request.context.get(RETRIED) ||
        !auth.refreshToken
      ) {
        return throwError(() => error);
      }

      if (!refreshRequest) {
        refreshRequest = auth.refresh().pipe(
          shareReplay({ bufferSize: 1, refCount: false }),
          finalize(() => {
            refreshRequest = null;
          }),
        );
      }

      return refreshRequest.pipe(
        catchError((refreshError: unknown) => {
          auth.clearSession();
          void router.navigate(['/login'], { queryParams: { reason: 'session' } });
          return throwError(() => refreshError);
        }),
        switchMap((tokens) =>
          next(
            request.clone({
              context: request.context.set(RETRIED, true),
              setHeaders: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
            }),
          ),
        ),
      );
    }),
  );
};
