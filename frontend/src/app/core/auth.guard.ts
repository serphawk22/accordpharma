import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureUser().pipe(
    map((valid) => valid || router.createUrlTree(['/login'])),
  );
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'] as string[] | undefined;
  return auth.ensureUser().pipe(
    map((valid) => {
      if (!valid) {
        return router.createUrlTree(['/login']);
      }
      return !roles || auth.hasRole(roles)
        ? true
        : router.createUrlTree(['/forbidden']);
    }),
  );
};
