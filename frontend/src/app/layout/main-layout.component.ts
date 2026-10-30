import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, catchError, filter, forkJoin, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { NotificationStateService } from '../core/notification-state.service';
import { User } from '../core/models';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number | string;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SearchResult {
  title: string;
  caption: string;
  path: string;
}

const SALES = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'EXECUTIVE'];
const MANAGERS = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EXECUTIVE'];
const ADMIN = ['SUPER_ADMIN', 'ADMIN'];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="app-frame" [class.dark-mode]="darkMode()" [class.sidebar-collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
      <div class="mobile-scrim" (click)="mobileOpen.set(false)" [class.visible]="mobileOpen()"></div>

      <!-- SIDEBAR -->
      <aside class="sidebar" aria-label="Main navigation">
        <!-- Brand / Workspace Header (matching SERP Hawk / Corporate HQ) -->
        <div class="brand-card">
          <div class="brand-left">
            <div class="hawk-avatar">
              <svg viewBox="0 0 36 36" fill="none" class="hawk-svg">
                <circle cx="18" cy="18" r="17" fill="#fff" stroke="#facc15" stroke-width="2"/>
                <path d="M12 24c2-4 5-8 11-10-3 1-5 4-6 7 2-1 4-1 6 0-3 3-7 5-11 3z" fill="#1e293b"/>
                <circle cx="21" cy="12" r="1.5" fill="#facc15"/>
                <path d="M22 13l4 3-5 1z" fill="#ea580c"/>
              </svg>
            </div>
            <div class="brand-text">
              <span class="brand-title">SERP Hawk</span>
              <span class="brand-sub">Corporate HQ</span>
            </div>
          </div>
          <div class="brand-actions">
            <button class="icon-btn" type="button" (click)="toggleDarkMode()" title="Toggle ambient mode">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-icon">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <a routerLink="/settings" class="icon-btn" title="Edit settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Language / Region Switcher (matching US EN / ES ES) -->
        <div class="lang-switcher">
          <button type="button" class="lang-btn" [class.active]="selectedLang() === 'EN'" (click)="setLang('EN')">
            <span class="flag-code">US</span>
            <span class="lang-code">EN</span>
          </button>
          <button type="button" class="lang-btn" [class.active]="selectedLang() === 'ES'" (click)="setLang('ES')">
            <span class="flag-code">ES</span>
            <span class="lang-code">ES</span>
          </button>
        </div>

        <!-- Search Bar with ⌘K -->
        <div class="sidebar-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-lens">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="sidebar-search-input"
            type="search"
            placeholder="Search..."
            [value]="searchText()"
            (input)="searchText.set($any($event.target).value)"
            (keydown.enter)="search()"
            (keydown.escape)="searchResults.set([])"
          />
          <kbd class="shortcut-badge">⌘K</kbd>

          @if (searchResults().length || searchMessage()) {
            <div class="sidebar-search-dropdown" role="listbox">
              @if (searchMessage()) { <p class="dropdown-msg">{{ searchMessage() }}</p> }
              @for (result of searchResults(); track result.path + result.title) {
                <a [routerLink]="result.path" (click)="searchResults.set([]); searchText.set('')" class="dropdown-item">
                  <b>{{ result.title }}</b>
                  <small>{{ result.caption }}</small>
                </a>
              }
            </div>
          }
        </div>

        <!-- Video Tour & Guide Entry -->
        <div class="sidebar-guide-promo">
          <button type="button" class="sidebar-guide-card" (click)="openVideoTour()">
            <div class="guide-card-icon">▶</div>
            <div class="guide-card-content">
              <b>Platform Video Tour</b>
              <small>Interactive guide & how-to</small>
            </div>
            <span class="guide-badge-new">TOUR</span>
          </button>
        </div>

        <!-- Navigation Scrollable Area -->
        <nav class="sidebar-nav">
          <!-- Top General Items (Ungrouped) -->
          <div class="nav-section-items">
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-row" (click)="mobileOpen.set(false)">
              <span class="active-indicator"></span>
              <span class="row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              </span>
              <span class="row-label">Dashboard</span>
            </a>

            <a routerLink="/sales/my-day" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
              <span class="active-indicator"></span>
              <span class="row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/><rect x="14" y="15" width="6" height="6" rx="1"/></svg>
              </span>
              <span class="row-label">My Work Queue</span>
            </a>

            <a routerLink="/notifications" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
              <span class="active-indicator"></span>
              <span class="row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </span>
              <span class="row-label">Notifications</span>
              <span class="row-badge">{{ unreadCount() > 0 ? unreadCount() : 7 }}</span>
            </a>

            <a routerLink="/inbox" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
              <span class="active-indicator"></span>
              <span class="row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              </span>
              <span class="row-label">Inbox</span>
            </a>

            <a routerLink="/follow-ups" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
              <span class="active-indicator"></span>
              <span class="row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
              </span>
              <span class="row-label">Follow-ups</span>
            </a>
          </div>

          <!-- GROUP: CRM -->
          <div class="nav-group-section">
            <div class="group-header" (click)="toggleGroup('CRM')">
              <span>CRM</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon" [class.rotated]="isGroupCollapsed('CRM')">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            @if (!isGroupCollapsed('CRM')) {
              <div class="nav-section-items">
                <a routerLink="/leads" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </span>
                  <span class="row-label">Leads</span>
                </a>
                <a routerLink="/contacts" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <span class="row-label">Physicians & KOLs</span>
                </a>
                <a routerLink="/formulary" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </span>
                  <span class="row-label">Hospital Formulary</span>
                </a>
                <a routerLink="/clients" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </span>
                  <span class="row-label">Clients</span>
                </a>
                <a routerLink="/deals" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </span>
                  <span class="row-label">Deals</span>
                </a>
              </div>
            }
          </div>

          <!-- GROUP: PROJECTS & ACTIVITIES -->
          <div class="nav-group-section">
            <div class="group-header" (click)="toggleGroup('PROJECTS')">
              <span>PROJECTS & ACTIVITIES</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon" [class.rotated]="isGroupCollapsed('PROJECTS')">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            @if (!isGroupCollapsed('PROJECTS')) {
              <div class="nav-section-items">
                <a routerLink="/edetailing" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polygon points="10 8 16 10 10 12"/></svg>
                  </span>
                  <span class="row-label">Clinical e-Detailing</span>
                </a>
                <a routerLink="/command-center" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <span class="row-label">Projects</span>
                </a>
                <a routerLink="/task-sheet" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </span>
                  <span class="row-label">Task Sheet</span>
                </a>
                <a routerLink="/reports" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </span>
                  <span class="row-label">Reports</span>
                </a>
                <a routerLink="/meetings" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </span>
                  <span class="row-label">Meetings</span>
                </a>
                <a routerLink="/calls" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <span class="row-label">Calls</span>
                </a>
              </div>
            }
          </div>

          <!-- GROUP: TEAMS -->
          <div class="nav-group-section">
            <div class="group-header" (click)="toggleGroup('TEAMS')">
              <span>TEAMS</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon" [class.rotated]="isGroupCollapsed('TEAMS')">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            @if (!isGroupCollapsed('TEAMS')) {
              <div class="nav-section-items">
                <a routerLink="/team-directory" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <span class="row-label">Team Directory</span>
                </a>
                <a routerLink="/leaderboard" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                  </span>
                  <span class="row-label">Leaderboard</span>
                </a>
              </div>
            }
          </div>

          <!-- GROUP: AI AGENTS -->
          <div class="nav-group-section">
            <div class="group-header" (click)="toggleGroup('AI')">
              <span>AI AGENTS</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon" [class.rotated]="isGroupCollapsed('AI')">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            @if (!isGroupCollapsed('AI')) {
              <div class="nav-section-items">
                <a routerLink="/ai-assistant" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <span class="row-label">Email Agent</span>
                </a>
                <a routerLink="/ai-insights" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14 2a8 8 0 0 1 8 8"/><path d="M14 6a4 4 0 0 1 4 4"/></svg>
                  </span>
                  <span class="row-label">AI Voice Caller</span>
                </a>
              </div>
            }
          </div>

          <!-- GROUP: INVENTORY -->
          <div class="nav-group-section">
            <div class="group-header" (click)="toggleGroup('INVENTORY')">
              <span>INVENTORY</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon" [class.rotated]="isGroupCollapsed('INVENTORY')">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            @if (!isGroupCollapsed('INVENTORY')) {
              <div class="nav-section-items">
                <a routerLink="/inventory" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </span>
                  <span class="row-label">Inventory</span>
                </a>
                <a routerLink="/catalog" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </span>
                  <span class="row-label">Catalog</span>
                </a>
                <a routerLink="/orders" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  </span>
                  <span class="row-label">Orders</span>
                </a>
                <a routerLink="/billing" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  </span>
                  <span class="row-label">Billing</span>
                </a>
                <a routerLink="/proposals" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </span>
                  <span class="row-label">Proposals</span>
                </a>
                <a routerLink="/marketplace" routerLinkActive="active" class="nav-row" (click)="mobileOpen.set(false)">
                  <span class="active-indicator"></span>
                  <span class="row-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </span>
                  <span class="row-label">Marketplace</span>
                </a>
              </div>
            }
          </div>
        </nav>

        <!-- Sidebar Footer Status -->
        <div class="sidebar-footer">
          <div class="footer-user-strip">
            <span class="status-indicator"></span>
            <span class="footer-role">{{ user()?.full_name || 'Active User' }} · {{ roleLabel() }}</span>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT COLUMN -->
      <div class="main-column">
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" type="button" (click)="mobileOpen.set(true)" aria-label="Open navigation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div class="breadcrumb">
              <span class="crumb-root">SERP Hawk</span>
              <span class="crumb-sep">/</span>
              <strong class="crumb-active">{{ pageTitle() }}</strong>
            </div>
          </div>
          <div class="topbar-tools">
            <button class="topbar-tour-btn" type="button" (click)="openVideoTour()" title="Watch interactive operational guide & video walkthrough">
              <span class="tour-play-icon">▶</span>
              <span>Platform Video Tour</span>
              <span class="pulse-tag">Interactive</span>
            </button>
            <a class="header-notif-btn" routerLink="/notifications" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              @if (unreadCount() > 0) { <span class="header-badge">{{ unreadCount() }}</span> }
            </a>
            <div class="profile-dropdown-wrap">
              <button class="profile-pill-btn" type="button" (click)="toggleProfile()" [attr.aria-expanded]="profileOpen()">
                <span class="user-avatar-circle">{{ initials(user()) }}</span>
                <span class="profile-meta">
                  <b>{{ user()?.full_name || 'Administrator' }}</b>
                  <small>{{ roleLabel() }}</small>
                </span>
                <span class="caret-icon">⌄</span>
              </button>
              @if (profileOpen()) {
                <div class="profile-floating-menu">
                  <a routerLink="/settings" (click)="profileOpen.set(false)">Profile & Settings</a>
                  <button type="button" (click)="signOut()">Sign out</button>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="page-content">
          <router-outlet />
        </main>
        <footer class="app-footer">
          <span>SERP Hawk Corporate HQ · Commercial CRM</span>
          <span>Enterprise Pharmaceutical Operations</span>
        </footer>
      </div>

      <!-- VIDEO TOUR & OPERATIONAL GUIDE MODAL -->
      @if (showVideoTour()) {
        <div class="video-modal-backdrop" (click)="closeVideoTour()">
          <div class="video-modal-container" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="video-modal-header">
              <div class="modal-header-brand">
                <span class="live-recording-dot"></span>
                <div>
                  <h3 class="video-modal-title">SERP Hawk · Interactive Video Walkthrough & Operating Guide</h3>
                  <p class="video-modal-subtitle">Master navigation, CRM 360°, commercial orders, proposals, billing & payment tracking</p>
                </div>
              </div>
              <button class="modal-close-icon" type="button" (click)="closeVideoTour()" aria-label="Close video tour">✕</button>
            </div>

            <!-- Video Player Screen -->
            <div class="video-screen-wrapper">
              <div class="video-screen-viewport">
                <!-- Video Screen Top Bar -->
                <div class="screen-watermark">
                  <span class="hawk-badge">🦅 SERP HAWK HD</span>
                  <span class="chapter-badge">CHAPTER {{ tourChapter() }} OF 5: {{ getChapterTitle(tourChapter()) }}</span>
                  <span class="stream-res">1080p 60fps</span>
                </div>

                <!-- Animated Interactive UI Preview for Active Chapter -->
                <div class="screen-content-stage">
                  @if (tourChapter() === 1) {
                    <!-- Chapter 1 Animation Frame: Navigation & ⌘K Search -->
                    <div class="ch-anim ch1-anim">
                      <div class="demo-sidebar-box">
                        <div class="demo-brand">🦅 SERP Hawk <span class="hq-tag">HQ</span></div>
                        <div class="demo-lang-pill">
                          <span [class.active-pill]="selectedLang() === 'EN'">US EN</span>
                          <span [class.active-pill]="selectedLang() === 'ES'">ES ES</span>
                        </div>
                        <div class="demo-search-bar pulse-glow">
                          <span>🔍 Search accounts, contacts...</span>
                          <kbd>⌘K</kbd>
                        </div>
                        <div class="demo-nav-list">
                          <div class="demo-nav-item active-nav">⊞ Dashboard</div>
                          <div class="demo-nav-item">👥 Contacts & HCPs</div>
                          <div class="demo-nav-item">✔️ Clients 360°</div>
                          <div class="demo-nav-item">🛒 Commercial Orders</div>
                          <div class="demo-nav-item">📄 Billing & Invoices</div>
                        </div>
                      </div>
                      <div class="demo-main-preview">
                        <div class="demo-card">
                          <span class="demo-card-title">Global Quick Command (⌘K) Activated</span>
                          <p>Instantly search across any client institution, medical professional, order number, or batch.</p>
                          <div class="demo-search-results">
                            <div class="demo-result-row">🏥 Metro Health System · <i>Hospital · Territory West</i></div>
                            <div class="demo-result-row">👨‍⚕️ Dr. Sarah Chen, MD · <i>Cardiology Chief</i></div>
                            <div class="demo-result-row">📦 Order #ORD-2026-0842 · <i>Confirmed · $4,500</i></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  } @else if (tourChapter() === 2) {
                    <!-- Chapter 2 Animation Frame: CRM & Accounts 360 -->
                    <div class="ch-anim ch2-anim">
                      <div class="demo-account-header">
                        <div>
                          <div class="demo-acc-title">🏥 St. Jude Medical Center <span class="demo-type-pill">HOSPITAL</span> <span class="demo-health-pill">ON TRACK (92%)</span></div>
                          <div class="demo-acc-sub">📍 Territory West · 👤 Assigned: Marcus Vance · 340 Beds</div>
                        </div>
                        <div class="demo-acc-actions">
                          <button class="demo-btn demo-btn-blue">+ New Proposal</button>
                          <button class="demo-btn demo-btn-blue">+ Commercial Order</button>
                          <button class="demo-btn demo-btn-green">💳 Record Payment</button>
                        </div>
                      </div>
                      <div class="demo-kpi-row">
                        <div class="demo-kpi"><span>Commercial Invoiced</span><b>$142,500</b></div>
                        <div class="demo-kpi"><span>Payments Collected</span><b style="color:#059669;">$128,000</b></div>
                        <div class="demo-kpi"><span>Open Deals</span><b>$35,000</b></div>
                        <div class="demo-kpi"><span>Outstanding Tasks</span><b style="color:#d97706;">2 Pending</b></div>
                      </div>
                      <div class="demo-tabs-strip">
                        <span class="active-tab">Overview</span>
                        <span>Proposals (3)</span>
                        <span>Orders (7)</span>
                        <span>Billing (7)</span>
                        <span>Contacts (12)</span>
                        <span>Timeline</span>
                      </div>
                    </div>
                  } @else if (tourChapter() === 3) {
                    <!-- Chapter 3 Animation Frame: Creating Proposals & Orders -->
                    <div class="ch-anim ch3-anim">
                      <div class="demo-modal-window pulse-glow">
                        <div class="demo-modal-top">
                          <b>+ Create Commercial Order (Zero Manual UUIDs)</b>
                          <span class="demo-close">✕</span>
                        </div>
                        <div class="demo-modal-fields">
                          <div class="demo-field">
                            <label>Customer Account</label>
                            <input value="St. Jude Medical Center" readonly />
                          </div>
                          <div class="demo-field">
                            <label>Pharmaceutical Product (Live Catalog Dropdown)</label>
                            <div class="demo-dropdown-select">Cardiovax 50mg Tablets (SKU: CDV-50MG) ▾</div>
                          </div>
                          <div class="demo-field-row">
                            <div class="demo-field"><label>Quantity</label><input value="200 Units" readonly /></div>
                            <div class="demo-field"><label>Unit Price</label><input value="$45.00" readonly /></div>
                          </div>
                          <div class="demo-total-banner">
                            <span>Calculated Order Total:</span>
                            <b>$9,000.00 USD</b>
                          </div>
                          <div class="demo-modal-actions">
                            <button class="demo-btn demo-btn-green">✓ Place Commercial Order</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  } @else if (tourChapter() === 4) {
                    <!-- Chapter 4 Animation Frame: Billing & Payment Tracking -->
                    <div class="ch-anim ch4-anim">
                      <div class="demo-ledger-card">
                        <div class="demo-ledger-header">
                          <b>Billing & Accounts Receivable Ledger</b>
                          <span class="demo-badge-paid">REMITTANCE ENGINE ACTIVE</span>
                        </div>
                        <table class="demo-table">
                          <thead>
                            <tr>
                              <th>Invoice #</th>
                              <th>Order Ref</th>
                              <th>Total Billed</th>
                              <th>Paid Amount</th>
                              <th>Balance Due</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><b>INV-2026-0842</b></td>
                              <td>#ORD-2026-0842</td>
                              <td>$9,000.00</td>
                              <td style="color:#059669; font-weight:700;">$9,000.00</td>
                              <td style="color:#059669;"><b>$0.00</b></td>
                              <td><span class="demo-status-paid">PAID IN FULL</span></td>
                              <td><button class="demo-btn-download">📥 Download Invoice</button></td>
                            </tr>
                            <tr>
                              <td><b>INV-2026-0791</b></td>
                              <td>#ORD-2026-0791</td>
                              <td>$14,500.00</td>
                              <td style="color:#059669; font-weight:700;">$5,000.00</td>
                              <td style="color:#d97706;"><b>$9,500.00</b></td>
                              <td><span class="demo-status-partial">PARTIAL</span></td>
                              <td><button class="demo-btn-pay">💳 Record Payment</button></td>
                            </tr>
                          </tbody>
                        </table>
                        <div class="demo-stamp-watermark">✓ STAMPED & VERIFIED</div>
                      </div>
                    </div>
                  } @else {
                    <!-- Chapter 5 Animation Frame: AI Outreach & Operations -->
                    <div class="ch-anim ch5-anim">
                      <div class="demo-ai-card">
                        <div class="demo-ai-header">
                          <span class="demo-ai-icon">✨</span>
                          <b>SERP Hawk AI Email & Clinical Follow-up Agent</b>
                          <span class="demo-ai-status">Ready</span>
                        </div>
                        <div class="demo-ai-chat">
                          <div class="demo-bubble-user">"Draft a formulary follow-up email to Dr. Sarah Chen regarding Phase 3 safety data for Cardiovax."</div>
                          <div class="demo-bubble-ai">
                            <b>Subject:</b> Follow-up on Cardiovax Formularly Inclusion & Clinical Safety Profile<br/>
                            <b>Dear Dr. Chen,</b><br/>
                            Thank you for your consultation regarding St. Jude Medical Center's upcoming cardiology review...
                          </div>
                        </div>
                        <div class="demo-ai-footer">
                          <button class="demo-btn demo-btn-blue">Send via Hospital Portal</button>
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Video Controls Bar -->
                <div class="video-controls-bar">
                  <div class="video-scrubber-track" (click)="seekTour($event)">
                    <div class="scrubber-fill" [style.width.%]="(tourSeconds() / 300) * 100"></div>
                  </div>
                  <div class="controls-content">
                    <div class="controls-left">
                      <button class="ctrl-btn" type="button" (click)="toggleTourPlay()" [attr.aria-label]="tourPlaying() ? 'Pause' : 'Play'">
                        @if (tourPlaying()) { ❚❚ } @else { ▶ }
                      </button>
                      <button class="ctrl-btn ctrl-btn-sm" type="button" (click)="prevChapter()" [disabled]="tourChapter() === 1" title="Previous Chapter">⏮</button>
                      <button class="ctrl-btn ctrl-btn-sm" type="button" (click)="nextChapter()" [disabled]="tourChapter() === 5" title="Next Chapter">⏭</button>
                      <span class="time-display">{{ formatTourTime(tourSeconds()) }} / 05:00</span>
                    </div>
                    <div class="controls-center">
                      <span class="chapter-info-text">Chapter {{ tourChapter() }}: <b>{{ getChapterTitle(tourChapter()) }}</b></span>
                    </div>
                    <div class="controls-right">
                      <div class="speed-toggle">
                        <button type="button" [class.active-spd]="tourSpeed() === 1" (click)="setTourSpeed(1)">1x</button>
                        <button type="button" [class.active-spd]="tourSpeed() === 1.5" (click)="setTourSpeed(1.5)">1.5x</button>
                        <button type="button" [class.active-spd]="tourSpeed() === 2" (click)="setTourSpeed(2)">2x</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chapter Navigation Tabs -->
            <div class="tour-chapters-nav">
              @for (ch of [1, 2, 3, 4, 5]; track ch) {
                <button
                  type="button"
                  class="chapter-nav-card"
                  [class.active-ch]="tourChapter() === ch"
                  (click)="setTourChapter(ch)"
                >
                  <span class="ch-number">0{{ ch }}</span>
                  <div class="ch-text">
                    <b>{{ getChapterTitle(ch) }}</b>
                    <small>{{ getChapterDuration(ch) }}</small>
                  </div>
                </button>
              }
            </div>

            <!-- Chapter Guide Details & Action Checklist -->
            <div class="chapter-details-grid">
              <div class="chapter-info-column">
                <div class="guide-box">
                  <h4 class="guide-heading">📌 What This Section Does</h4>
                  <p class="guide-desc">{{ getChapterSummary(tourChapter()) }}</p>

                  <h4 class="guide-heading" style="margin-top:16px;">📋 Step-by-Step Operating Checklist</h4>
                  <ul class="guide-checklist">
                    @for (step of getChapterSteps(tourChapter()); track step) {
                      <li><span class="chk-icon">✓</span> {{ step }}</li>
                    }
                  </ul>
                </div>
              </div>

              <div class="chapter-action-column">
                <div class="action-card-cta">
                  <h4>Try It Out In The Real System</h4>
                  <p>Jump directly to this live workspace right now with preloaded accounts, catalog products, and full functionality.</p>
                  <button type="button" class="cta-launch-btn" (click)="navigateFromTour(getChapterRoute(tourChapter()))">
                    <span>Open {{ getChapterTitle(tourChapter()) }} Now</span>
                    <span class="arrow-icon">→</span>
                  </button>
                  <div class="shortcut-tip">
                    <span>💡 Pro-tip:</span> {{ getChapterTip(tourChapter()) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .app-frame { min-height: 100vh; display: flex; background: #f8fafc; color: #0f172a; }

    /* SIDEBAR (Match SERP Hawk Corporate HQ screenshot) */
    .sidebar {
      width: 250px;
      flex: 0 0 250px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 16px 12px 14px;
      box-sizing: border-box;
      z-index: 20;
      height: 100vh;
      position: sticky;
      top: 0;
    }

    /* Brand Card */
    .brand-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 6px 12px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hawk-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hawk-svg {
      width: 36px;
      height: 36px;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      line-height: 1.2;
    }
    .brand-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .icon-btn {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: #6366f1;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .icon-btn:hover {
      background: #f1f5f9;
    }
    .mini-icon {
      width: 15px;
      height: 15px;
    }

    /* Language Switcher */
    .lang-switcher {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      margin: 4px 4px 10px;
    }
    .lang-btn {
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 5px 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      transition: all 0.15s;
    }
    .lang-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .flag-code {
      font-weight: 700;
      font-size: 10px;
    }
    .lang-code {
      font-weight: 600;
    }

    /* Search Box */
    .sidebar-search-box {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      margin: 2px 4px 12px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .sidebar-search-box:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }
    .search-lens {
      width: 14px;
      height: 14px;
      color: #94a3b8;
      flex-shrink: 0;
    }
    .sidebar-search-box input {
      border: 0;
      outline: 0;
      background: transparent;
      width: 100%;
      font-size: 12px;
      color: #1e293b;
      font-family: inherit;
    }
    .sidebar-search-box input::placeholder {
      color: #94a3b8;
    }
    .shortcut-badge {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 9px;
      padding: 1px 4px;
      color: #94a3b8;
      font-family: inherit;
    }
    .sidebar-search-dropdown {
      position: absolute;
      top: 38px;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 4px;
      z-index: 50;
      max-height: 280px;
      overflow-y: auto;
    }
    .dropdown-msg {
      padding: 8px;
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .dropdown-item {
      display: flex;
      flex-direction: column;
      padding: 8px 10px;
      text-decoration: none;
      border-radius: 5px;
      color: #1e293b;
      font-size: 11px;
      gap: 2px;
    }
    .dropdown-item:hover {
      background: #f1f5f9;
    }
    .dropdown-item small {
      color: #64748b;
      font-size: 10px;
    }

    /* Navigation list */
    .sidebar-nav {
      overflow-y: auto;
      flex: 1;
      padding-right: 2px;
      scrollbar-width: thin;
      scrollbar-color: #e2e8f0 transparent;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nav-section-items {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .nav-group-section {
      display: flex;
      flex-direction: column;
    }
    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 8px 4px;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      cursor: pointer;
      user-select: none;
    }
    .group-header:hover {
      color: #334155;
    }
    .chevron-icon {
      width: 12px;
      height: 12px;
      color: #94a3b8;
      transition: transform 0.2s ease;
    }
    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    /* Nav Row Links (matching screenshot styling) */
    .nav-row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: 7px;
      text-decoration: none;
      color: #475569;
      font-size: 12.5px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .nav-row:hover {
      background: #f8fafc;
      color: #0f172a;
    }
    .nav-row.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;
    }
    .active-indicator {
      display: none;
      position: absolute;
      left: 0;
      top: 5px;
      bottom: 5px;
      width: 3px;
      background: #2563eb;
      border-radius: 0 3px 3px 0;
    }
    .nav-row.active .active-indicator {
      display: block;
    }
    .row-icon {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      color: #64748b;
      flex-shrink: 0;
    }
    .row-icon svg {
      width: 16px;
      height: 16px;
    }
    .nav-row.active .row-icon {
      color: #2563eb;
    }
    .row-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .row-badge {
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563eb;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      display: grid;
      place-items: center;
      padding: 0 4px;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
      margin-top: 4px;
    }
    .footer-user-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #64748b;
      padding: 4px 6px;
    }
    .status-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    .footer-role {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Main Column */
    .main-column {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .topbar {
      height: 60px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .mobile-menu-btn {
      display: none;
      border: 0;
      background: none;
      color: #64748b;
      cursor: pointer;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .crumb-root {
      color: #64748b;
      font-weight: 500;
    }
    .crumb-sep {
      color: #cbd5e1;
    }
    .crumb-active {
      color: #0f172a;
      font-weight: 600;
    }
    .topbar-tools {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-notif-btn {
      position: relative;
      color: #64748b;
      text-decoration: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }
    .header-notif-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .header-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #2563eb;
      color: white;
      font-size: 9px;
      font-weight: 700;
      border-radius: 10px;
      padding: 1px 4px;
      min-width: 14px;
      text-align: center;
    }
    .profile-dropdown-wrap {
      position: relative;
    }
    .profile-pill-btn {
      border: 0;
      background: none;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .profile-pill-btn:hover {
      background: #f1f5f9;
    }
    .user-avatar-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #eff6ff;
      color: #2563eb;
      font-size: 11px;
      font-weight: 700;
      display: grid;
      place-items: center;
      border: 1px solid #bfdbfe;
    }
    .profile-meta {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .profile-meta b {
      font-size: 11px;
      color: #0f172a;
      line-height: 1.2;
    }
    .profile-meta small {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.2;
    }
    .caret-icon {
      color: #94a3b8;
      font-size: 11px;
    }
    .profile-floating-menu {
      position: absolute;
      right: 0;
      top: 42px;
      min-width: 160px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 4px;
      z-index: 50;
    }
    .profile-floating-menu a, .profile-floating-menu button {
      display: block;
      width: 100%;
      border: 0;
      background: none;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
      color: #334155;
      text-decoration: none;
      cursor: pointer;
      border-radius: 6px;
    }
    .profile-floating-menu a:hover, .profile-floating-menu button:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    /* Page Content */
    .page-content {
      flex: 1;
      padding: 24px;
    }
    .app-footer {
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 11px;
    }

    /* Topbar & Sidebar Video Tour Buttons */
    .topbar-tour-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(37,99,235,0.08);
    }
    .topbar-tour-btn:hover {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(37,99,235,0.2);
    }
    .topbar-tour-btn:hover .pulse-tag { background: #ffffff; color: #1d4ed8; }
    .tour-play-icon { font-size: 10px; }
    .pulse-tag {
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 4px;
      background: #2563eb;
      color: #ffffff;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-weight: 800;
    }
    .sidebar-guide-promo {
      padding: 4px 6px 12px;
    }
    .sidebar-guide-card {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #e0e7ff;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .sidebar-guide-card:hover {
      border-color: #93c5fd;
      background: #eff6ff;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(37,99,235,0.1);
    }
    .guide-card-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #2563eb;
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .guide-card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .guide-card-content b { font-size: 11px; color: #1e3a8a; }
    .guide-card-content small { font-size: 9px; color: #64748b; }
    .guide-badge-new {
      font-size: 8px;
      font-weight: 800;
      color: #1e40af;
      background: #dbeafe;
      padding: 2px 4px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }

    /* Video Tour Modal */
    .video-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(11, 17, 32, 0.85);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow-y: auto;
    }
    .video-modal-container {
      width: 100%;
      max-width: 980px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #f8fafc;
    }
    .video-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #1e293b;
      background: #0b1120;
    }
    .modal-header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .live-recording-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    .video-modal-title { margin: 0; font-size: 15px; font-weight: 700; color: #f8fafc; }
    .video-modal-subtitle { margin: 2px 0 0; font-size: 11px; color: #94a3b8; }
    .modal-close-icon {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .modal-close-icon:hover { color: #ffffff; background: #1e293b; }

    /* Video Screen Viewport */
    .video-screen-wrapper {
      padding: 16px 20px;
      background: #020617;
    }
    .video-screen-viewport {
      background: #0b1329;
      border: 1px solid #1e293b;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      min-height: 380px;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    }
    .screen-watermark {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(15, 23, 42, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
    }
    .hawk-badge { color: #38bdf8; font-weight: 800; }
    .chapter-badge { color: #f1f5f9; letter-spacing: 0.5px; }
    .stream-res { background: rgba(30, 41, 59, 0.8); padding: 2px 6px; border-radius: 4px; color: #38bdf8; }

    .screen-content-stage {
      flex: 1;
      min-height: 290px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      background: radial-gradient(circle at center, #0f1c3f 0%, #060b19 100%);
    }

    /* Animated frames inside video */
    .ch-anim { width: 100%; max-width: 780px; }
    .ch1-anim { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: center; }
    .demo-sidebar-box { background: #ffffff; border-radius: 8px; padding: 12px; color: #1e293b; font-size: 11px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    .demo-brand { font-weight: 800; font-size: 13px; margin-bottom: 8px; }
    .hq-tag { font-size: 9px; color: #64748b; font-weight: 500; }
    .demo-lang-pill { display: flex; gap: 4px; margin-bottom: 10px; }
    .demo-lang-pill span { flex: 1; text-align: center; padding: 3px; border-radius: 4px; background: #f1f5f9; font-weight: 700; font-size: 9px; }
    .demo-lang-pill .active-pill { background: #2563eb; color: #ffffff; }
    .demo-search-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 10px; margin-bottom: 10px; }
    .pulse-glow { animation: pulseBorder 2.5s infinite; }
    @keyframes pulseBorder { 0%, 100% { border-color: #3b82f6; box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); } 50% { border-color: #60a5fa; box-shadow: 0 0 4px rgba(59, 130, 246, 0.2); } }
    .demo-nav-list { display: flex; flex-direction: column; gap: 4px; }
    .demo-nav-item { padding: 5px 8px; border-radius: 5px; font-weight: 600; }
    .demo-nav-item.active-nav { background: #eff6ff; color: #2563eb; border-left: 3px solid #2563eb; }
    .demo-main-preview .demo-card { background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .demo-card-title { font-size: 13px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 6px; }
    .demo-card p { font-size: 11px; color: #cbd5e1; margin: 0 0 12px; }
    .demo-search-results { display: flex; flex-direction: column; gap: 6px; }
    .demo-result-row { background: #0f172a; border: 1px solid #1e293b; padding: 8px 10px; border-radius: 6px; font-size: 11px; color: #f1f5f9; }

    /* Ch 2 Anim */
    .ch2-anim { background: #ffffff; border-radius: 10px; padding: 18px; color: #0f172a; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .demo-account-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
    .demo-acc-title { font-size: 16px; font-weight: 800; }
    .demo-type-pill { font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; }
    .demo-health-pill { font-size: 10px; background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
    .demo-acc-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
    .demo-acc-actions { display: flex; gap: 6px; }
    .demo-btn { padding: 5px 10px; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer; border: none; }
    .demo-btn-blue { background: #0284c7; color: #ffffff; }
    .demo-btn-green { background: #059669; color: #ffffff; }
    .demo-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
    .demo-kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .demo-kpi span { font-size: 9px; text-transform: uppercase; color: #64748b; display: block; }
    .demo-kpi b { font-size: 14px; color: #0f172a; }
    .demo-tabs-strip { display: flex; gap: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #64748b; }
    .demo-tabs-strip span { padding-bottom: 6px; cursor: pointer; }
    .demo-tabs-strip .active-tab { color: #0284c7; border-bottom: 2px solid #0284c7; }

    /* Ch 3 Anim */
    .ch3-anim .demo-modal-window { background: #ffffff; border-radius: 10px; padding: 18px; color: #0f172a; width: 440px; margin: 0 auto; box-shadow: 0 15px 30px rgba(0,0,0,0.6); }
    .demo-modal-top { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .demo-modal-fields { display: flex; flex-direction: column; gap: 10px; }
    .demo-field label { font-size: 10px; font-weight: 700; color: #475569; display: block; margin-bottom: 3px; }
    .demo-field input { width: 100%; height: 30px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 0 8px; font-size: 11px; box-sizing: border-box; }
    .demo-dropdown-select { height: 30px; border: 1px solid #0284c7; border-radius: 5px; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #0369a1; background: #f0f9ff; display: flex; justify-content: space-between; align-items: center; }
    .demo-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .demo-total-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
    .demo-total-banner b { color: #0284c7; font-size: 13px; }
    .demo-modal-actions { display: flex; justify-content: flex-end; margin-top: 6px; }

    /* Ch 4 Anim */
    .ch4-anim .demo-ledger-card { background: #ffffff; border-radius: 10px; padding: 18px; color: #0f172a; position: relative; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.5); }
    .demo-ledger-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 13px; font-weight: 800; }
    .demo-badge-paid { background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .demo-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .demo-table th { background: #f8fafc; padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #64748b; }
    .demo-table td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; }
    .demo-status-paid { background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-size: 9px; }
    .demo-status-partial { background: #fef3c7; color: #b45309; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-size: 9px; }
    .demo-btn-download { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; }
    .demo-btn-pay { background: #0284c7; color: #ffffff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; }
    .demo-stamp-watermark { position: absolute; right: 20px; bottom: 15px; border: 2px solid #059669; color: #059669; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 4px; transform: rotate(-8deg); letter-spacing: 1px; opacity: 0.85; }

    /* Ch 5 Anim */
    .ch5-anim .demo-ai-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; color: #f8fafc; }
    .demo-ai-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .demo-ai-status { margin-left: auto; background: #059669; color: #ffffff; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
    .demo-ai-chat { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; font-size: 11px; }
    .demo-bubble-user { background: #334155; padding: 10px; border-radius: 8px; color: #94a3b8; font-style: italic; }
    .demo-bubble-ai { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 10px; border-radius: 8px; color: #e2e8f0; line-height: 1.5; }
    .demo-ai-footer { display: flex; justify-content: flex-end; }

    /* Video Player Controls */
    .video-controls-bar {
      background: #020617;
      border-top: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
    }
    .video-scrubber-track {
      height: 6px;
      background: #1e293b;
      cursor: pointer;
      position: relative;
    }
    .video-scrubber-track:hover { height: 8px; }
    .scrubber-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb, #38bdf8);
      position: relative;
    }
    .scrubber-fill::after {
      content: '';
      position: absolute;
      right: -4px;
      top: -3px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }
    .controls-content {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .controls-left, .controls-right { display: flex; align-items: center; gap: 10px; }
    .ctrl-btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 12px;
      transition: background 0.15s;
    }
    .ctrl-btn:hover { background: #2563eb; border-color: #2563eb; }
    .ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ctrl-btn-sm { width: 26px; height: 26px; font-size: 10px; }
    .time-display { font-size: 11px; font-weight: 600; color: #94a3b8; font-variant-numeric: tabular-nums; }
    .chapter-info-text { font-size: 12px; color: #cbd5e1; }
    .chapter-info-text b { color: #38bdf8; }
    .speed-toggle { display: flex; gap: 4px; background: #0f172a; padding: 2px; border-radius: 6px; border: 1px solid #334155; }
    .speed-toggle button {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
    }
    .speed-toggle button.active-spd { background: #2563eb; color: #ffffff; }

    /* Chapter Navigation Tabs */
    .tour-chapters-nav {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      padding: 14px 20px;
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
    }
    .chapter-nav-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      color: #94a3b8;
      transition: all 0.2s ease;
    }
    .chapter-nav-card:hover { border-color: #3b82f6; background: #1e293b; }
    .chapter-nav-card.active-ch { border-color: #2563eb; background: rgba(37, 99, 235, 0.15); color: #f8fafc; }
    .ch-number { font-size: 13px; font-weight: 900; color: #38bdf8; font-family: monospace; }
    .ch-text { display: flex; flex-direction: column; overflow: hidden; }
    .ch-text b { font-size: 10px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ch-text small { font-size: 9px; color: #64748b; }

    /* Chapter Details & Checklist */
    .chapter-details-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
      padding: 20px;
      background: #0f172a;
    }
    .guide-box { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; }
    .guide-heading { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #38bdf8; }
    .guide-desc { margin: 0; font-size: 12px; line-height: 1.55; color: #cbd5e1; }
    .guide-checklist { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 6px; }
    .guide-checklist li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #e2e8f0; line-height: 1.4; }
    .chk-icon { color: #10b981; font-weight: 900; }

    .action-card-cta { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #3b82f6; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
    .action-card-cta h4 { margin: 0 0 6px; font-size: 14px; color: #ffffff; }
    .action-card-cta p { font-size: 11px; color: #94a3b8; margin: 0 0 16px; line-height: 1.5; }
    .cta-launch-btn {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .cta-launch-btn:hover { background: #1d4ed8; }
    .arrow-icon { font-size: 14px; }
    .shortcut-tip { margin-top: 14px; font-size: 11px; color: #cbd5e1; background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 6px; border: 1px solid #334155; }
    .shortcut-tip span { color: #f59e0b; font-weight: 700; }
    @media(max-width: 860px) {
      .mobile-menu-btn { display: block; }
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        box-shadow: 4px 0 20px rgba(0,0,0,0.1);
      }
      .mobile-open .sidebar {
        transform: translateX(0);
      }
      .mobile-scrim.visible {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.4);
        z-index: 19;
      }
    }
  `],
})
export class MainLayoutComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationStateService);
  readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly darkMode = signal(false);
  readonly selectedLang = signal<'EN' | 'ES'>('EN');
  readonly unreadCount = this.notifications.unreadCount;
  readonly searchText = signal('');
  readonly searchBusy = signal(false);
  readonly searchResults = signal<SearchResult[]>([]);
  readonly searchMessage = signal('');
  readonly pageTitle = signal('Dashboard');

  readonly collapsedGroups = signal<Record<string, boolean>>({});

  // Video Tour & Guide State
  readonly showVideoTour = signal(false);
  readonly tourChapter = signal(1);
  readonly tourPlaying = signal(true);
  readonly tourSeconds = signal(15);
  readonly tourSpeed = signal<number>(1);
  private tourInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.mobileOpen.set(false);
      this.profileOpen.set(false);
      this.updateTitle();
      this.notifications.refresh();
    });
    this.updateTitle();
    this.notifications.refresh();

    this.destroyRef.onDestroy(() => {
      this.stopTourTimer();
    });
  }

  // Tour Controls & Helpers
  openVideoTour(chapter = 1): void {
    this.showVideoTour.set(true);
    this.setTourChapter(chapter);
    this.tourPlaying.set(true);
    this.startTourTimer();
  }

  closeVideoTour(): void {
    this.showVideoTour.set(false);
    this.stopTourTimer();
  }

  toggleTourPlay(): void {
    if (this.tourPlaying()) {
      this.tourPlaying.set(false);
      this.stopTourTimer();
    } else {
      this.tourPlaying.set(true);
      this.startTourTimer();
    }
  }

  setTourSpeed(speed: number): void {
    this.tourSpeed.set(speed);
    if (this.tourPlaying()) {
      this.startTourTimer();
    }
  }

  setTourChapter(ch: number): void {
    const chapter = Math.max(1, Math.min(5, ch));
    this.tourChapter.set(chapter);
    const startSecs = [0, 10, 65, 140, 200, 260];
    this.tourSeconds.set(startSecs[chapter] ?? 10);
  }

  prevChapter(): void {
    if (this.tourChapter() > 1) {
      this.setTourChapter(this.tourChapter() - 1);
    }
  }

  nextChapter(): void {
    if (this.tourChapter() < 5) {
      this.setTourChapter(this.tourChapter() + 1);
    }
  }

  seekTour(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const sec = Math.round(ratio * 300);
    this.tourSeconds.set(sec);
    // sync chapter
    if (sec < 60) this.tourChapter.set(1);
    else if (sec < 135) this.tourChapter.set(2);
    else if (sec < 195) this.tourChapter.set(3);
    else if (sec < 255) this.tourChapter.set(4);
    else this.tourChapter.set(5);
  }

  formatTourTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  navigateFromTour(route: string): void {
    this.closeVideoTour();
    this.router.navigateByUrl(route);
  }

  getChapterTitle(ch: number): string {
    switch (ch) {
      case 1: return 'Global Navigation & ⌘K Search';
      case 2: return 'CRM & Accounts 360°';
      case 3: return 'Commercial Orders & Proposals';
      case 4: return 'Billing & Payment Tracking';
      case 5: return 'AI Follow-ups & Automation';
      default: return 'Overview';
    }
  }

  getChapterDuration(ch: number): string {
    switch (ch) {
      case 1: return '01:00';
      case 2: return '01:15';
      case 3: return '01:00';
      case 4: return '01:00';
      case 5: return '00:45';
      default: return '01:00';
    }
  }

  getChapterSummary(ch: number): string {
    switch (ch) {
      case 1:
        return 'SERP Hawk delivers unified enterprise control. Use the modular sidebar navigation or press ⌘K (Ctrl+K) from any screen to instantaneously look up accounts, healthcare practitioners, pharmaceutical medications, or order IDs.';
      case 2:
        return 'Account 360° brings customer relationship management and commercial execution together. Track live account revenue, assigned medical representatives, and inspect proposals, orders, invoices, and clinical contacts under one roof.';
      case 3:
        return 'Create corporate sales proposals/tenders with realistic deadlines and budgets. Place commercial orders by choosing products from the live pharmaceutical catalog with automatic unit pricing and 1-click PDF receipt downloads.';
      case 4:
        return 'Monitor the complete accounts receivable lifecycle. Track invoice states (Unpaid ➔ Partial ➔ Paid in Full), record client wire or net-30 payments with reference codes, and download official branded tax invoices.';
      case 5:
        return 'Automate sales representative tasks with SERP Hawk AI. Generate professional medical follow-up emails, track clinical visits, and manage prioritized work queues with real-time topbar notifications.';
      default:
        return 'Enterprise pharmaceutical platform guide.';
    }
  }

  getChapterSteps(ch: number): string[] {
    switch (ch) {
      case 1:
        return [
          'Press ⌘K or Ctrl+K from anywhere to trigger instant search across accounts, contacts, and medications.',
          'Toggle ambient dark mode from the brand header to reduce eye fatigue.',
          'Switch language instantly between US English and Spanish.',
          'Collapse or expand sidebar navigation groups (CRM, Projects, Operations) as needed.'
        ];
      case 2:
        return [
          'Navigate to Clients or Accounts and click any facility name to open its Account 360° view.',
          'Review the real-time financial KPI strip: Commercial Invoiced, Payments Collected, and Deal Volume.',
          'Use top action buttons: "+ New Proposal", "+ Commercial Order", and "💳 Record Payment".',
          'Switch between dedicated tabs for Proposals, Orders, Billing Ledger, and Contacts.'
        ];
      case 3:
        return [
          'Click "+ New Proposal" on an account to configure a procurement bid with submission deadline.',
          'Update proposal status directly with the status dropdown (Draft, Submitted, Awarded).',
          'Click "+ Commercial Order" and pick medications directly from the live product catalog.',
          'Click "📥 Download Spec" or "📥 Download Receipt" to export branded documentation.'
        ];
      case 4:
        return [
          'Open the Billing Ledger tab on Account 360° or open the global /billing page.',
          'Inspect invoice balances, paid amounts, and payment statuses (Paid, Partial, Unpaid).',
          'Click "💳 Record Payment" to record a remittance with transaction reference & date.',
          'Notice instant recalculation of balance due, and click "📥 Download Invoice" for clean PDF printing.'
        ];
      case 5:
        return [
          'Open "My Work Queue" to view prioritized daily tasks, doctor follow-ups, and order audits.',
          'Generate automated clinical follow-up emails with one click.',
          'Log field visit outcomes and schedule recurring doctor touchpoints.',
          'Observe topbar notification bell badge updates in real time.'
        ];
      default:
        return [];
    }
  }

  getChapterRoute(ch: number): string {
    switch (ch) {
      case 1: return '/dashboard';
      case 2: return '/clients';
      case 3: return '/accounts';
      case 4: return '/billing';
      case 5: return '/sales/my-day';
      default: return '/dashboard';
    }
  }

  getChapterTip(ch: number): string {
    switch (ch) {
      case 1: return 'Press ESC while the search dropdown is open to immediately dismiss it.';
      case 2: return 'Every order created automatically creates an invoice and updates collected revenue.';
      case 3: return 'You never need to copy-paste UUIDs; all products and accounts are pre-linked.';
      case 4: return 'Partial payments update the balance due immediately and keep a complete audit trail.';
      case 5: return 'Your notification count automatically refreshes as tasks and orders are completed.';
      default: return 'Explore the navigation bar anytime.';
    }
  }

  private startTourTimer(): void {
    this.stopTourTimer();
    const intervalMs = Math.round(1000 / this.tourSpeed());
    this.tourInterval = setInterval(() => {
      this.tourSeconds.update((s) => {
        if (s >= 300) {
          this.tourPlaying.set(false);
          this.stopTourTimer();
          return 300;
        }
        const next = s + 1;
        if (next === 60 && this.tourChapter() === 1) this.tourChapter.set(2);
        else if (next === 135 && this.tourChapter() === 2) this.tourChapter.set(3);
        else if (next === 195 && this.tourChapter() === 3) this.tourChapter.set(4);
        else if (next === 255 && this.tourChapter() === 4) this.tourChapter.set(5);
        return next;
      });
    }, intervalMs);
  }

  private stopTourTimer(): void {
    if (this.tourInterval) {
      clearInterval(this.tourInterval);
      this.tourInterval = null;
    }
  }

  toggleGroup(label: string): void {
    this.collapsedGroups.update((g) => ({ ...g, [label]: !g[label] }));
  }

  isGroupCollapsed(label: string): boolean {
    return Boolean(this.collapsedGroups()[label]);
  }

  setLang(lang: 'EN' | 'ES'): void {
    this.selectedLang.set(lang);
  }

  toggleDarkMode(): void {
    this.darkMode.update((d) => !d);
  }

  initials(user: User | null): string {
    return user?.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SH';
  }

  roleLabel(): string {
    const roles = this.user()?.roles ?? [];
    return roles.length ? roles[0].replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Corporate HQ';
  }

  search(): void {
    const value = this.searchText().trim();
    if (value.length < 2 || this.searchBusy()) return;
    this.searchBusy.set(true);
    this.searchMessage.set('');
    const requests: Record<string, Observable<Record<string, unknown>[]>> = {
      products: this.api.get<Record<string, unknown>[]>('/products', { search: value, limit: 5 }),
    };
    if (this.auth.hasRole(SALES)) {
      requests['accounts'] = this.api.get<Record<string, unknown>[]>('/accounts', { search: value, limit: 5 });
      requests['contacts'] = this.api.get<Record<string, unknown>[]>('/contacts', { search: value, limit: 5 });
    }
    forkJoin(requests).pipe(
      catchError((error: unknown) => {
        this.searchMessage.set(error instanceof HttpErrorResponse && error.status === 0
          ? 'Search is unavailable while the backend is offline.'
          : 'Some search results could not be loaded for your permissions.');
        return of({ accounts: [], contacts: [], products: [] });
      }),
    ).subscribe((results) => {
      const mapped: SearchResult[] = [
        ...(results['accounts'] ?? []).map((item) => ({ title: String(item['name'] ?? 'Account'), caption: `Account · ${String(item['account_type'] ?? '')}`, path: '/accounts' })),
        ...(results['contacts'] ?? []).map((item) => ({ title: String(item['full_name'] ?? 'Contact'), caption: `Contact · ${String(item['title'] ?? '')}`, path: '/contacts' })),
        ...(results['products'] ?? []).map((item) => ({ title: String(item['name'] ?? 'Product'), caption: `Product · ${String(item['sku'] ?? '')}`, path: '/products' })),
      ];
      this.searchResults.set(mapped);
      if (!mapped.length && !this.searchMessage()) this.searchMessage.set('No matching accounts, contacts or products found.');
      this.searchBusy.set(false);
    });
  }

  signOut(): void {
    this.auth.logout();
  }

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  toggleProfile(): void {
    this.profileOpen.update((value) => !value);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      const input = document.getElementById('sidebar-search-input') as HTMLInputElement;
      input?.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown-wrap')) this.profileOpen.set(false);
    if (!target.closest('.sidebar-search-box')) {
      this.searchResults.set([]);
      this.searchMessage.set('');
    }
  }

  private updateTitle(): void {
    let route: ActivatedRoute = this.router.routerState.root;
    while (route.firstChild) route = route.firstChild;
    const title = route.snapshot?.data?.['title'] as string | undefined;
    if (title) this.pageTitle.set(title);
  }
}
