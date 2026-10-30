import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard, roleGuard } from './auth.guard';

describe('authentication route guards', () => {
  const authStub = {
    ensureUser: () => of(true),
    hasRole: (roles: string[]) => roles.includes('ADMIN'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
  });

  it('allows a route after the current user is validated', async () => {
    const result = await resolveGuard(TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    ));
    expect(result).toBeTrue();
  });

  it('checks role permissions before activating a restricted route', async () => {
    const state = { url: '/restricted' } as RouterStateSnapshot;
    const allowed = await resolveGuard(TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['ADMIN'] } } as unknown as ActivatedRouteSnapshot, state),
    ));
    const denied = await resolveGuard(TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['PHARMACOVIGILANCE_OFFICER'] } } as unknown as ActivatedRouteSnapshot, state),
    ));
    expect(allowed).toBeTrue();
    expect(denied).toEqual(jasmine.any(UrlTree));
  });
});

function resolveGuard(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}
