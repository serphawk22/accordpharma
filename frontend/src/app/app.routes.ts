import { Routes } from '@angular/router';
import { AuthScreensComponent } from './auth/auth-screens.component';
import { authGuard, roleGuard } from './core/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ForbiddenComponent } from './features/shared/forbidden.component';
import { FeaturePageComponent } from './features/shared/feature-page.component';
import { SettingsComponent } from './features/settings/settings.component';
import { MainLayoutComponent } from './layout/main-layout.component';

// Sales CRM Feature Components
import { MyDayComponent } from './features/sales/my-day/my-day.component';
import { AccountListComponent } from './features/sales/accounts/account-list.component';
import { AccountDetailComponent } from './features/sales/accounts/account-detail.component';
import { PipelineKanbanComponent } from './features/sales/pipeline/pipeline-kanban.component';
import { ActivityCenterComponent } from './features/sales/activities/activity-center.component';
import { LeadManagementComponent } from './features/sales/leads/lead-management.component';
import { CommandCenterComponent } from './features/sales/command-center/command-center.component';
import { RepProfileComponent } from './features/sales/team/rep-profile.component';
import { AccountCoverageComponent } from './features/sales/coverage/account-coverage.component';
import { SalesReportingComponent } from './features/sales/reports/sales-reporting.component';
import { InventoryManagementComponent } from './features/inventory/inventory-management.component';
import { ProposalNegotiationComponent } from './features/proposals/proposal-negotiation.component';
import { HcpDirectoryComponent } from './features/sales/hcp/hcp-directory.component';
import { EdetailingStudioComponent } from './features/sales/edetailing/edetailing-studio.component';
import { FormularyTrackerComponent } from './features/sales/formulary/formulary-tracker.component';

const SALES = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'EXECUTIVE'];
const MANAGERS = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EXECUTIVE'];

export const routes: Routes = [
  { path: 'login', component: AuthScreensComponent, data: { mode: 'login', title: 'Sign in' } },
  { path: 'forgot-password', component: AuthScreensComponent, data: { mode: 'forgot', title: 'Forgot password' } },
  { path: 'reset-password', component: AuthScreensComponent, data: { mode: 'reset', title: 'Reset password' } },
  { path: 'forbidden', component: ForbiddenComponent, data: { title: 'Access restricted' } },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Dashboard' } },
      { path: 'settings', component: SettingsComponent, data: { title: 'Settings' } },

      // Core Sales Workspaces
      { path: 'sales/my-day', component: MyDayComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'My Day' } },

      // Accounts 360
      { path: 'accounts', component: AccountListComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Accounts 360°' } },
      { path: 'sales/accounts', component: AccountListComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Accounts 360°' } },
      { path: 'accounts/:id', component: AccountDetailComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Account 360° Profile' } },
      { path: 'sales/accounts/:id', component: AccountDetailComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Account 360° Profile' } },

      // Pipeline
      { path: 'pipeline', component: PipelineKanbanComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Pipeline' } },
      { path: 'sales/pipeline', component: PipelineKanbanComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Pipeline' } },

      // Activities
      { path: 'activities', component: ActivityCenterComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Activities' } },
      { path: 'sales/activities', component: ActivityCenterComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Activities' } },

      // Leads
      { path: 'leads', component: LeadManagementComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Lead Management' } },
      { path: 'sales/leads', component: LeadManagementComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Lead Management' } },

      // Manager Command Center & Rep Profiles
      { path: 'command-center', component: CommandCenterComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Sales Command Center' } },
      { path: 'admin/command-center', component: CommandCenterComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Sales Command Center' } },
      { path: 'sales/team-performance/:id', component: RepProfileComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Representative Profile' } },
      { path: 'sales/reps/:id', component: RepProfileComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Representative Profile' } },

      // Coverage
      { path: 'coverage', component: AccountCoverageComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Territory Coverage' } },
      { path: 'sales/coverage', component: AccountCoverageComponent, canActivate: [roleGuard], data: { roles: MANAGERS, title: 'Territory Coverage' } },

      // Reports & Natural Language
      { path: 'reports', component: SalesReportingComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Reports & Analytics' } },
      { path: 'sales/reports', component: SalesReportingComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Sales Reports & Analytics' } },

      // Inventory & Supply Chain Workspaces
      { path: 'inventory', component: InventoryManagementComponent, canActivate: [roleGuard], data: { roles: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'DISTRIBUTOR_MANAGER', 'INVENTORY_MANAGER', 'EXECUTIVE'], title: 'Inventory & Stock Operations' } },
      { path: 'inventory/lots', component: InventoryManagementComponent, canActivate: [roleGuard], data: { roles: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'DISTRIBUTOR_MANAGER', 'INVENTORY_MANAGER', 'EXECUTIVE'], title: 'Inventory Lots' } },

      // Proposals & Commercial Negotiations
      { path: 'proposals', component: ProposalNegotiationComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Proposals & Deal Negotiations' } },
      { path: 'sales/proposals', component: ProposalNegotiationComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Proposals & Deal Negotiations' } },

      // Navigation Aliases matching SERP Hawk / Modern CRM Workspace
      { path: 'clients', redirectTo: 'accounts' },
      { path: 'deals', redirectTo: 'pipeline' },
      { path: 'catalog', redirectTo: 'products' },
      { path: 'marketplace', redirectTo: 'distributors' },
      { path: 'task-sheet', redirectTo: 'activities' },
      { path: 'meetings', redirectTo: 'activities' },
      { path: 'calls', redirectTo: 'activities' },
      { path: 'leaderboard', redirectTo: 'coverage' },
      { path: 'team-directory', redirectTo: 'command-center' },
      { path: 'my-work-queue', redirectTo: 'sales/my-day' },
      { path: 'follow-ups', redirectTo: 'sales/my-day' },
      { path: 'inbox', redirectTo: 'activities' },

      // Healthcare Professionals (HCP) & Key Opinion Leaders
      { path: 'contacts', component: HcpDirectoryComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Physicians & KOLs' } },
      { path: 'hcp', component: HcpDirectoryComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Physicians & KOLs' } },
      { path: 'sales/contacts', component: HcpDirectoryComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Physicians & KOLs' } },

      // Clinical e-Detailing & Visual Efficacy Aid (IVA)
      { path: 'edetailing', component: EdetailingStudioComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Clinical e-Detailing Studio' } },
      { path: 'sales/edetailing', component: EdetailingStudioComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Clinical e-Detailing Studio' } },

      // Hospital Formulary & P&T Committee Access
      { path: 'formulary', component: FormularyTrackerComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Hospital Formulary & P&T Access' } },
      { path: 'sales/formulary', component: FormularyTrackerComponent, canActivate: [roleGuard], data: { roles: SALES, title: 'Hospital Formulary & P&T Access' } },

      // Generic modules using FeaturePageComponent
      ...[
        ['products', 'Products', []],
        ['orders', 'Orders', ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'DISTRIBUTOR_MANAGER', 'INVENTORY_MANAGER', 'EXECUTIVE']],
        ['billing', 'Billing & Commercial Invoices', ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MEDICAL_REPRESENTATIVE', 'DISTRIBUTOR_MANAGER', 'INVENTORY_MANAGER', 'EXECUTIVE']],
        ['distributors', 'Distributors', ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER', 'DISTRIBUTOR_MANAGER']],
        ['tenders', 'Tenders', ['SUPER_ADMIN', 'ADMIN', 'TENDER_MANAGER', 'SALES_MANAGER']],
        ['support', 'Customer support', ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_SUPPORT', ...SALES]],
        ['compliance', 'Compliance', ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER']],
        ['pharmacovigilance', 'Pharmacovigilance', ['SUPER_ADMIN', 'PHARMACOVIGILANCE_OFFICER']],
        ['ai-assistant', 'AI assistant', SALES],
        ['ai-insights', 'AI insights', SALES],
        ['automations', 'Automations', ['SUPER_ADMIN', 'ADMIN']],
        ['approvals', 'Approvals', ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TENDER_MANAGER', 'COMPLIANCE_OFFICER']],
        ['notifications', 'Notifications', []],
        ['audit-logs', 'Audit logs', ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER']],
        ['users', 'User management', ['SUPER_ADMIN', 'ADMIN']],
      ].map(([path, title, roles]) => ({
        path: String(path),
        component: FeaturePageComponent,
        canActivate: [roleGuard],
        data: { feature: String(path), title: String(title), roles: roles as string[] },
      })),
    ],
  },
  { path: '**', redirectTo: '' },
];
