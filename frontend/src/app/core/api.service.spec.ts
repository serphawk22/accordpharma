import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the configured API base URL and encodes query parameters', () => {
    api.get<unknown[]>('/accounts', { search: 'North clinic', limit: 10 }).subscribe();
    const request = http.expectOne((item) => item.url === 'http://127.0.0.1:8000/api/v1/accounts');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('North clinic');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush([]);
  });

  it('accepts endpoint paths without a leading slash', () => {
    api.get<{ status: string }>('health').subscribe((result) => expect(result.status).toBe('healthy'));
    http.expectOne('http://127.0.0.1:8000/api/v1/health').flush({ status: 'healthy' });
  });
});
