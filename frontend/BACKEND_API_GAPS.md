# Backend API coverage and gaps

The frontend uses the FastAPI routes defined under `backend/app/api`. It does not use fabricated records or write to browser storage as a substitute for database persistence.

## Integrated endpoints

- Authentication: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`.
- Sales Representative Workspace (Workspace A): `GET /sales/my-day` (performance strip, daily schedule, accounts needing attention, overdue activities, deals closing soon, target progress), `POST /sales/activities` (schedule visit/call/meeting), `PATCH /sales/activities/{id}` (start, reschedule, complete with outcome/products/objections/follow-up task).
- Account 360° Profile (Workspace B): `GET /sales/accounts` (enriched directory with rule-based health flags), `GET /sales/accounts/{id}/overview`, `GET /sales/accounts/{id}/contacts`, `POST /contacts`, `GET /sales/accounts/{id}/timeline` (unified chronological stream), `GET /sales/accounts/{id}/orders`, `GET /sales/accounts/{id}/notes`, `POST /sales/accounts/{id}/notes`, `GET /sales/accounts/{id}/insights` (deterministic 30/60/90d touchpoint cadence & rule-based recommendations), `GET /sales/accounts/{id}/history` (reassignment audit log), `POST /sales/accounts/{id}/reassign` (audited transfer of ownership).
- Sales Pipeline Kanban: `GET /sales/pipeline` (stage columns: Prospecting, Qualification, Proposal, Negotiation, Won, Lost), `PATCH /opportunities/{id}` (stage transitions requiring `lost_reason` on Lost), `GET /sales/opportunities/{id}` (detail drawer with stage history and linked tasks).
- Activity Center: `GET /sales/activities` (filtered by mine/all, type, status), `PATCH /sales/activities/{id}` (outcome documentation).
- Lead Management: `GET /sales/leads`, `POST /sales/leads`, `PATCH /sales/leads/{id}` (qualification), `POST /sales/leads/{id}/convert` (conversion to existing/new account, contact, and pipeline opportunity without duplicate accounts).
- Manager Command Center (Workspace C): `GET /sales/command-center` (executive KPIs: won revenue, quota attainment, pipeline win rate, unengaged accounts), `GET /sales/team-performance` (rep detailing metrics, attainment %, win rate), `GET /sales/team-performance/{id}` (rep drill-down profile with monthly revenue and quiet accounts).
- Account Coverage: `GET /sales/coverage` (30-day touchpoint coverage, uncontacted account surveillance, rep breakdown).
- Sales Reporting: `GET /sales/reports/catalog`, `POST /sales/reports/run` (audited SQL-backed reporting queries), `POST /sales/reports/ask` (natural-language query mapper with transparent calculation methods).
- Operations: orders and order details/list, inventory balances and lots, tenders, support tickets, notifications, and user administration where allowed.
- Restricted records: pharmacovigilance intake listing, with restricted content omitted from the list display and global search.
- Audit: read-only `GET /audit-events` for authorized roles.

## Known limitations

- There is no global search endpoint. The client makes three bounded list requests to the existing account/contact/product search parameters; it does not search orders, tenders, support, or restricted records.
- There is no distributor listing/detail API, despite distributor relationships being used by order and inventory endpoints.
- There are no dedicated compliance review/list APIs, AI assistant/chat or forecasting APIs, automation management/execution APIs, or approval inbox/decision APIs. Their frontend routes explain the missing capability and do not simulate persistence.
- The sales activity endpoint is limited to recent activities and opportunity-linked activity history. There is no standalone activity search/calendar/task API.
- Dashboard aggregation currently provides account/opportunity counts, open pipeline amount, activity count, pipeline stages, and role-scoped alerts. Active contact count, order KPIs, monthly sales history, and territory chart data are not returned and therefore appear as unavailable rather than zero.
- Order browsing, one-line draft creation, submit and cancel actions are integrated. The current composer accepts account, distributor and product IDs rather than pretending the missing distributor lookup exists; create/submit responses are treated as success only after the server confirms them.
- Inventory balances, low-stock filtering and lot listing are integrated. Adjustments are sent to the backend with idempotency keys and require the lot number in the UI; there is no distributor name lookup endpoint.
- Audit events are read-only and the list omits event metadata.
- User administration currently supports listing, creating and activation status changes. Full user detail/edit and role-assignment screens are not implemented.
- The pharmacovigilance list omits the restricted report payload and supports the backend's status update action. Case detail/history/follow-up flows are not implemented in this phase.
- Tender creation and list filtering are available, but there is no tender document upload or history API. Support ticket creation and listing are available, but ticket comments/detail views are not included.

## Authorization note

Navigation visibility and route guards are usability controls only. The FastAPI backend remains authoritative for access to every record and action. A `403` response is shown as an authorization error; it does not cause data to be exposed.
