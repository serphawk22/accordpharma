import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private readonly api = inject(ApiService);
  readonly unreadCount = signal(0);

  refresh(): void {
    this.api.get<{ read_at: string | null }[]>('/notifications', { unread_only: true, limit: 100 }).pipe(
      map((items) => items.length),
      catchError(() => of(0)),
    ).subscribe((count) => this.unreadCount.set(count));
  }

  markRead(id: string): Observable<Record<string, unknown>> {
    return this.api.patch<Record<string, unknown>>(`/notifications/${encodeURIComponent(id)}/read`, undefined).pipe(
      tap(() => this.unreadCount.update((count) => Math.max(0, count - 1))),
    );
  }

  markAllRead(): Observable<void> {
    return this.api.patch<void>('/notifications/read-all', undefined).pipe(
      tap(() => this.unreadCount.set(0)),
    );
  }
}
