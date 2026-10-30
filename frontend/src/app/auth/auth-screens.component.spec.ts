import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthScreensComponent } from './auth-screens.component';

describe('AuthScreensComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthScreensComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'login' }),
            snapshot: { data: { mode: 'login' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
  });

  it('requires a valid email and password before enabling login', () => {
    const fixture = TestBed.createComponent(AuthScreensComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.loginForm.invalid).toBeTrue();
    component.loginForm.setValue({ email: 'not-an-email', password: 'secret' });
    expect(component.loginForm.invalid).toBeTrue();
    component.loginForm.setValue({ email: 'rep@example.test', password: 'secret' });
    expect(component.loginForm.valid).toBeTrue();
  });
});
