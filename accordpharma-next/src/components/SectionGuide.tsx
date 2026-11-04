'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Check, ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

type GuideContent = {
  title: string;
  purpose: string;
  workflow: string;
  terms: [string, string, string];
  tip: string;
};

const guides: Record<string, GuideContent> = {
  '/': {
    title: 'Dashboard',
    purpose: 'Use the dashboard to orient your day, spot changes that need attention, and reach the most important parts of the workspace quickly.',
    workflow: 'Review the headline metrics first, open an item that needs action, then use the navigation to continue into the relevant account, task, or report.',
    terms: ['KPI: a measurable indicator of progress.', 'Pipeline: the value and stage of active sales opportunities.', 'Activity: a logged customer-facing interaction.'],
    tip: 'Treat summary numbers as a starting point. Open the source records and confirm their owner, date, and status before making a decision.',
  },
  '/tasks': {
    title: 'My Work Queue',
    purpose: 'Keep follow-ups and assigned work visible so important customer commitments do not get lost.',
    workflow: 'Scan due dates and priority, open a task for context, then update its status after the work is actually completed.',
    terms: ['Due date: when an action is expected.', 'Owner: the person accountable for the task.', 'Status: the current state of the work.'],
    tip: 'Keep task titles action-oriented and record the next step when you close an item.',
  },
  '/notifications': {
    title: 'Notifications',
    purpose: 'See updates and reminders that may require your attention without searching through every module.',
    workflow: 'Review the newest items, follow the linked record when available, and mark a notification read only after reviewing it.',
    terms: ['Unread: not yet acknowledged.', 'Alert: an item that may need action.', 'Source record: the account or workflow the update refers to.'],
    tip: 'A notification is a prompt, not proof that the underlying work is complete; verify the source record.',
  },
  '/inbox': {
    title: 'Inbox',
    purpose: 'Bring incoming work and requests into one place so they can be triaged and routed consistently.',
    workflow: 'Sort new items by urgency, identify the account and request, assign or respond through the supported workflow, and track the follow-up.',
    terms: ['Triage: decide urgency and next owner.', 'Assignment: who is responsible next.', 'Resolution: the documented outcome.'],
    tip: 'Do not include sensitive patient or safety details in general notes; use the restricted Pharmacovigilance workflow.',
  },
  '/follow-ups': {
    title: 'Follow-ups',
    purpose: 'Make sure promises made during customer interactions turn into timely, traceable next steps.',
    workflow: 'Review upcoming and overdue follow-ups, confirm the account and context, complete the action, and record the outcome.',
    terms: ['Follow-up: a promised next action.', 'Overdue: past its target date.', 'Outcome: what happened and what comes next.'],
    tip: 'When an action cannot be completed, reschedule it with a clear reason instead of leaving a stale due date.',
  },
  '/leads': {
    title: 'Leads',
    purpose: 'Organize potential customer relationships before they become qualified accounts or opportunities.',
    workflow: 'Capture the source and contact, qualify fit and interest, record the next action, then progress or disqualify the lead with a reason.',
    terms: ['Lead: an unqualified potential relationship.', 'Qualification: confirming fit and intent.', 'Conversion: moving a lead into an active CRM relationship.'],
    tip: 'Use consistent qualification notes so another teammate can understand why a lead moved forward.',
  },
  '/contacts': {
    title: 'Physicians & KOLs',
    purpose: 'Maintain professional contact context so commercial engagement can be relevant, coordinated, and compliant.',
    workflow: 'Find the person, verify their account and professional details, review interaction history, and log any new engagement through the approved workflow.',
    terms: ['HCP: healthcare professional.', 'KOL: key opinion leader.', 'Affiliation: an organization associated with the contact.'],
    tip: 'Keep profiles business-relevant and accurate; never use a contact record to store unnecessary sensitive personal information.',
  },
  '/targeting-matrix': {
    title: 'Prescriber Decile Matrix',
    purpose: 'Compare prescriber segments and focus effort according to approved territory and engagement priorities.',
    workflow: 'Review the segmentation criteria, compare groups, validate the underlying period and territory, then plan appropriate outreach.',
    terms: ['Decile: one of ten ranked groups.', 'Segment: a group with shared attributes.', 'Coverage: the portion of a target group reached.'],
    tip: 'A ranking is a planning aid, not a clinical recommendation or a substitute for approved targeting policy.',
  },
  '/kol-network': {
    title: 'KOL Network & Sunshine',
    purpose: 'Understand professional relationships and keep collaboration and transfer-of-value information visible for responsible review.',
    workflow: 'Review the professional relationship and context, verify engagement details, and follow the organization’s disclosure and approval process.',
    terms: ['KOL: key opinion leader.', 'Engagement: a documented professional interaction.', 'Transfer of value: a reportable payment or benefit where applicable.'],
    tip: 'Confirm disclosure and approval requirements before recording or arranging any transfer of value.',
  },
  '/formulary': {
    title: 'Hospital Formulary',
    purpose: 'Track product status within healthcare organizations and understand where formulary decisions stand.',
    workflow: 'Select the organization and product, inspect committee status and dates, document the next milestone, and follow up with the responsible owner.',
    terms: ['Formulary: an organization’s approved medicine list.', 'P&T: Pharmacy and Therapeutics committee.', 'Status: the current review or listing stage.'],
    tip: 'Distinguish a submitted request from an approved listing; verify the latest committee decision and effective date.',
  },
  '/pt-modeler': {
    title: 'P&T Budget Modeler',
    purpose: 'Explore planning assumptions that may help prepare for Pharmacy and Therapeutics committee discussions.',
    workflow: 'Confirm the scenario inputs, review assumptions and outputs, compare alternatives, and share only validated estimates with the intended audience.',
    terms: ['P&T: Pharmacy and Therapeutics committee.', 'Scenario: a set of planning assumptions.', 'Budget impact: estimated financial effect over a period.'],
    tip: 'Model outputs are estimates, not commitments or clinical evidence; label assumptions and validate inputs.',
  },
  '/hub-services': {
    title: 'Patient Access & Hub Services',
    purpose: 'Understand access-support workflows and coordinate appropriate non-clinical assistance.',
    workflow: 'Review the program and eligibility context, route the request to its authorized owner, and track the next step without duplicating sensitive records.',
    terms: ['Hub: a patient access support service.', 'Enrollment: entry into an eligible program.', 'Access barrier: a non-clinical obstacle to therapy access.'],
    tip: 'Use approved channels and minimum necessary information; do not enter identifiable patient data into general CRM notes.',
  },
  '/accounts': {
    title: 'Clients (Accounts 360°)',
    purpose: 'Keep a complete, shared view of organizations, relationships, opportunities, and engagement history.',
    workflow: 'Search for an existing organization before creating one, review ownership and territory, then open its detail page to understand linked work.',
    terms: ['Account: an organization or customer entity.', 'Territory: the assigned geographic or business scope.', 'Account owner: the teammate accountable for the relationship.'],
    tip: 'Avoid duplicate accounts by searching names and locations before creating a new record.',
  },
  '/pipeline': {
    title: 'Deals (Sales Pipeline)',
    purpose: 'Track potential business from early qualification through close so teams can prioritize and forecast consistently.',
    workflow: 'Review each opportunity’s stage, value, and next action; update only when the stage criteria are met and keep the expected close date current.',
    terms: ['Opportunity: a potential commercial outcome.', 'Stage: the current milestone in the sales process.', 'Forecast: an estimate of potential future results.'],
    tip: 'Pipeline value is not booked revenue. Use evidence-based stage changes and realistic close dates.',
  },
  '/next-best-action': {
    title: 'Next-Best-Action',
    purpose: 'Surface suggested next steps that can help plan customer engagement using the context available in the workspace.',
    workflow: 'Review the suggestion and its supporting context, check that it is appropriate for the account and your role, then accept, defer, or dismiss it as supported.',
    terms: ['Recommendation: a suggested action.', 'Signal: an input that may inform a suggestion.', 'Human review: a person validates before acting.'],
    tip: 'Treat recommendations as decision support only; apply policy, judgment, and required approvals before outreach.',
  },
  '/call-planner': {
    title: 'Daily Call Planner',
    purpose: 'Plan field and customer interactions in a practical sequence while keeping priorities and time visible.',
    workflow: 'Review planned calls, confirm account and contact context, arrange the day, then record outcomes and follow-ups after each interaction.',
    terms: ['Call plan: a proposed set of interactions.', 'Route: a suggested visit sequence.', 'Call objective: the intended purpose of an interaction.'],
    tip: 'Confirm appointments and local travel conditions independently; a suggested route may not reflect real-time conditions.',
  },
  '/edetailing': {
    title: 'e-Detailing Studio',
    purpose: 'Support structured, approved product discussions with reusable digital materials.',
    workflow: 'Choose the appropriate approved material, present it in context, capture permitted engagement details, and record follow-up needs.',
    terms: ['Detail: a structured product discussion.', 'Approved content: current material cleared for use.', 'Session: a recorded presentation interaction.'],
    tip: 'Check the content version and local market approval before presenting materials; do not make unsupported claims.',
  },
  '/clm-analytics': {
    title: 'CLM Analytics',
    purpose: 'Understand how closed-loop marketing materials are used and where engagement may need improvement.',
    workflow: 'Select a reporting period and segment, compare usage and engagement measures, then translate findings into a testable content improvement.',
    terms: ['CLM: closed-loop marketing.', 'Engagement: an interaction with a content asset.', 'Completion rate: the share of sessions reaching an endpoint.'],
    tip: 'Check sample size and reporting dates before comparing teams or drawing conclusions from engagement metrics.',
  },
  '/speaker-bureau': {
    title: 'Speaker Bureau',
    purpose: 'Coordinate speaker programs and professional engagements with clear ownership and compliance oversight.',
    workflow: 'Review speaker eligibility and event details, complete required approvals, track logistics, then reconcile and document the event.',
    terms: ['Speaker program: an educational event with a presenter.', 'Fair-market value: a compensation benchmark.', 'Reconciliation: matching planned and actual event details.'],
    tip: 'Complete required approvals and fair-market-value checks before confirming compensation or event commitments.',
  },
  '/command-center': {
    title: 'Command Center',
    purpose: 'Bring cross-functional operational signals together to identify issues that need coordinated attention.',
    workflow: 'Review the signal and its source, confirm severity and ownership, open the relevant record, and track resolution to closure.',
    terms: ['Signal: a notable change or event.', 'Escalation: routing an issue to a higher support level.', 'Owner: the person responsible for resolution.'],
    tip: 'Prioritize verified, time-sensitive issues and use the source record as the authoritative detail.',
  },
  '/task-sheet': {
    title: 'Task Sheet',
    purpose: 'Provide a focused view for organizing and tracking structured work across the day or team.',
    workflow: 'Review assignments and dates, clarify ownership, update progress as work changes, and close tasks with an outcome.',
    terms: ['Assignment: work allocated to a person.', 'Priority: relative urgency.', 'Completion: a documented finished state.'],
    tip: 'Use one clear owner and a specific next action to prevent work from being overlooked.',
  },
  '/reports': {
    title: 'Reports',
    purpose: 'Turn workspace activity into a consistent view of progress, workload, and areas that need investigation.',
    workflow: 'Choose a report and time range, verify filters and scope, inspect trends, and share findings with appropriate context.',
    terms: ['Metric: a measured value.', 'Period: the time window being reported.', 'Filter: a condition limiting included records.'],
    tip: 'Check data freshness, filters, and access scope before comparing or exporting a report.',
  },
  '/meetings': {
    title: 'Meetings',
    purpose: 'Coordinate planned discussions and preserve context so attendees can prepare and follow through.',
    workflow: 'Review the agenda and participants, confirm the time and objective, then capture permitted notes and assigned follow-ups.',
    terms: ['Agenda: topics planned for discussion.', 'Attendee: a meeting participant.', 'Action item: follow-up work assigned after a meeting.'],
    tip: 'Record factual, business-relevant notes and avoid including confidential information that does not belong in CRM.',
  },
  '/calls': {
    title: 'Calls',
    purpose: 'Keep customer call planning and outcomes organized for continuity across the commercial team.',
    workflow: 'Review the call objective and contact context, complete the interaction, log the outcome, and create any needed follow-up.',
    terms: ['Call objective: intended purpose.', 'Disposition: outcome of the call.', 'Next step: agreed follow-up action.'],
    tip: 'Record an outcome promptly while keeping notes accurate, concise, and compliant.',
  },
  '/team-directory': {
    title: 'Team Directory',
    purpose: 'Find the right colleague or role owner for coordination, escalation, and territory handoffs.',
    workflow: 'Search by name, role, or territory, confirm the person’s current responsibility, and contact them through approved channels.',
    terms: ['Role: a set of access and responsibilities.', 'Territory: an assigned operating area.', 'Handoff: transfer of work ownership.'],
    tip: 'Confirm current ownership before sharing customer details or transferring an account.',
  },
  '/leaderboard': {
    title: 'Leaderboard',
    purpose: 'Compare selected performance measures to recognize progress and identify where coaching may help.',
    workflow: 'Review the measure definition and period, compare like-for-like groups, then use the result to guide constructive follow-up.',
    terms: ['Ranking: relative position on a measure.', 'Quota: a defined target.', 'Attainment: progress toward that target.'],
    tip: 'Interpret rankings in context; territory, time period, and data completeness can affect comparisons.',
  },
  '/ai-assistant': {
    title: 'AI Assistant',
    purpose: 'Help users explore information or draft work more efficiently while keeping people responsible for decisions.',
    workflow: 'Provide a non-sensitive prompt, review the response against trusted source records, revise it, and obtain required approval before use.',
    terms: ['Prompt: an instruction to an AI system.', 'Grounding: checking output against trusted data.', 'Hallucination: plausible-sounding but incorrect output.'],
    tip: 'Never enter credentials, patient-identifiable details, or confidential data unless an approved workflow explicitly permits it.',
  },
  '/ai-insights': {
    title: 'AI Insights',
    purpose: 'Review analytical signals that may help identify patterns or questions for further investigation.',
    workflow: 'Check the insight’s scope and inputs, open the source records, validate the pattern, and document human-reviewed action.',
    terms: ['Insight: a pattern or observation.', 'Model: a system that generates an estimate.', 'Confidence: an indication of uncertainty, not a guarantee.'],
    tip: 'AI-generated insights can be incomplete or biased; validate evidence and do not use them alone for consequential decisions.',
  },
  '/samples': {
    title: 'Samples',
    purpose: 'Track sample requests and distribution so inventory and compliance obligations remain visible.',
    workflow: 'Verify eligibility and product, record the request and quantity, follow approval and delivery steps, then reconcile receipt.',
    terms: ['Sample: a product unit supplied under policy.', 'Reconciliation: matching issued and received quantities.', 'Chain of custody: record of handling and transfer.'],
    tip: 'Follow applicable sample limits, documentation, and recipient-signature requirements before distribution.',
  },
  '/cold-chain-iot': {
    title: 'Cold Chain IoT',
    purpose: 'Monitor temperature-sensitive logistics signals and direct exceptions to the responsible operations team.',
    workflow: 'Review the reading, time, and device context, assess the excursion using approved criteria, and escalate without assuming product disposition.',
    terms: ['Excursion: a reading outside a defined range.', 'Telemetry: remotely collected device data.', 'Disposition: an authorized decision on affected stock.'],
    tip: 'Do not release or discard product based solely on a screen alert; follow validated quality procedures.',
  },
  '/inventory': {
    title: 'Inventory',
    purpose: 'Maintain visibility of stock levels, lots, expiry, and movements across the distribution network.',
    workflow: 'Filter by location and product, check available balance and lot details, record movements with a reason, and investigate risk alerts.',
    terms: ['Lot: a traceable batch of product.', 'Expiry: the date after which product must not be used.', 'Stock risk: a potential shortage, expiry, or handling issue.'],
    tip: 'Reconcile quantities against the authoritative system before adjusting stock; never substitute demo values for physical counts.',
  },
  '/catalog': {
    title: 'Catalog',
    purpose: 'Browse product and service information used by ordering and commercial workflows.',
    workflow: 'Search by name or identifier, verify the item and market context, and use only currently approved product details.',
    terms: ['SKU: a unique stock-keeping identifier.', 'Market: the region where an item is offered.', 'Availability: whether an item can be selected for a workflow.'],
    tip: 'Confirm market approval and current catalog status before referencing a product or placing an order.',
  },
  '/orders': {
    title: 'Orders',
    purpose: 'Track customer orders from creation through fulfillment with clear ownership and line-item detail.',
    workflow: 'Verify the account and distributor, review product and quantity, submit through the supported process, and monitor status changes.',
    terms: ['Order: a customer request for goods.', 'Line item: a product and quantity in an order.', 'Fulfillment: processing and delivery of an order.'],
    tip: 'Confirm stock and customer details before submission; submitted orders may have controlled cancellation rules.',
  },
  '/billing': {
    title: 'Billing',
    purpose: 'Review billing activity and payment status so finance-related follow-up is timely and traceable.',
    workflow: 'Confirm the account and invoice reference, compare balance and due date, then route disputes or overdue items to the appropriate owner.',
    terms: ['Invoice: a request for payment.', 'Receivable: an amount owed.', 'Reconciliation: matching billing entries to payment records.'],
    tip: 'Treat displayed billing data as operational reference and verify financial decisions in the authoritative finance system.',
  },
  '/proposals': {
    title: 'Proposals',
    purpose: 'Prepare and track commercial proposals with clear assumptions, review status, and next steps.',
    workflow: 'Select the customer context, build the proposal from approved inputs, complete required reviews, and track delivery and response.',
    terms: ['Proposal: a commercial offer for review.', 'Assumption: an input used in a proposal.', 'Approval: required authorization before release.'],
    tip: 'Do not send pricing or commitments until the appropriate review and approval is complete.',
  },
  '/marketplace': {
    title: 'Marketplace',
    purpose: 'Explore available programs, services, and offerings relevant to the commercial workspace.',
    workflow: 'Review the listing and eligibility, verify terms and market availability, then follow the approved request or enrollment process.',
    terms: ['Listing: an item available for review.', 'Eligibility: criteria for access.', 'Enrollment: joining an offering or program.'],
    tip: 'A listing does not itself constitute approval, availability, or a customer commitment; verify current terms.',
  },
  '/competitive-intel': {
    title: 'Competitive Intelligence',
    purpose: 'Organize market observations to support informed planning while maintaining lawful and ethical information practices.',
    workflow: 'Record the observation and source, distinguish fact from interpretation, date the information, and share only with authorized colleagues.',
    terms: ['Source: where information came from.', 'Observation: a documented market fact.', 'Inference: a reasoned interpretation of observations.'],
    tip: 'Use public or otherwise authorized sources only; never solicit or store another organization’s confidential information.',
  },
  '/mir': {
    title: 'Medical Information Requests',
    purpose: 'Route unsolicited medical questions to qualified medical information colleagues and track a compliant response.',
    workflow: 'Capture the request accurately, classify and route it promptly, track response ownership, and close only after the appropriate response is documented.',
    terms: ['MI: medical information.', 'Unsolicited request: a question initiated by an external requester.', 'Response owner: the qualified team responsible for answering.'],
    tip: 'Do not answer clinical questions from memory or promotional content; route them through the approved medical information process.',
  },
  '/tenders': {
    title: 'Tenders',
    purpose: 'Coordinate formal customer procurement opportunities, deadlines, requirements, and submission review.',
    workflow: 'Confirm the tender reference and due date, assign owners to requirements, complete reviews, and track submission and outcome.',
    terms: ['Tender: a formal request for a commercial bid.', 'Requirement: a condition the bid must satisfy.', 'Submission deadline: the final time for receipt.'],
    tip: 'Work backward from the verified deadline and obtain required legal, pricing, and compliance reviews before submission.',
  },
  '/pharmacovigilance': {
    title: 'Pharmacovigilance',
    purpose: 'Route potential safety information to qualified safety personnel for timely assessment and reporting.',
    workflow: 'Capture only the minimum information needed, submit through the restricted intake, and let authorized safety staff assess and follow up.',
    terms: ['Adverse event: an untoward medical occurrence after product use.', 'Intake: initial receipt of a safety report.', 'Restricted record: information limited to authorized roles.'],
    tip: 'Report potential safety information promptly even when details are incomplete; never put patient details in general CRM notes.',
  },
  '/compliance': {
    title: 'Compliance & Audits',
    purpose: 'Review control activities and documented decisions so commercial work follows applicable policy and regulation.',
    workflow: 'Open the relevant review, inspect evidence and ownership, record findings through the approved process, and track remediation.',
    terms: ['Control: a step that reduces risk.', 'Finding: an observed gap requiring assessment.', 'Remediation: action taken to address a finding.'],
    tip: 'Keep findings factual and evidence-based; escalate urgent or reportable concerns through established channels.',
  },
  '/settings': {
    title: 'Settings & Profile',
    purpose: 'Manage personal preferences and review account settings that shape how you use the workspace.',
    workflow: 'Review each setting before changing it, save only intended updates, and contact an administrator for access or organization-level changes.',
    terms: ['Profile: your user identity and preferences.', 'Role: your access permissions.', 'Session: your current authenticated sign-in.'],
    tip: 'Never share passwords or session links. Use the approved password reset and access request processes.',
  },
  '/login': {
    title: 'Sign in',
    purpose: 'Authenticate securely before accessing organization and customer information.',
    workflow: 'Enter your assigned account details, verify the organization sign-in page, and sign out when using a shared device.',
    terms: ['Authentication: verifying who you are.', 'MFA: an additional sign-in factor.', 'Session: a temporary authenticated connection.'],
    tip: 'Never share credentials or use demo login shortcuts with real customer data.',
  },
};

function getGuide(pathname: string): GuideContent {
  const route = Object.keys(guides)
    .filter((key) => pathname === key || (key !== '/' && pathname.startsWith(`${key}/`)))
    .sort((a, b) => b.length - a.length)[0];
  if (route) return guides[route];
  const fallbackTitle = pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'Workspace';
  return {
    title: fallbackTitle.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    purpose: 'Use this section to review its records, understand current status, and identify the next action for your role.',
    workflow: 'Start with the filters and summary, open a record for context, then use the supported actions and verify the resulting status.',
    terms: ['Owner: the person accountable for the record.', 'Status: the current workflow state.', 'Next action: the follow-up needed to move work forward.'],
    tip: 'Check the source record and your access scope before making changes or sharing information.',
  };
}

export default function SectionGuide() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const guide = useMemo(() => getGuide(pathname || '/'), [pathname]);
  const steps = useMemo(
    () => [
      { title: 'Why this section matters', body: guide.purpose },
      { title: 'How to use it', body: guide.workflow },
      { title: 'Key terms', body: guide.terms.join('\n') },
      { title: 'Good practice', body: guide.tip },
    ],
    [guide],
  );
  const seenKey = `accord_section_guide_seen:${pathname}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStep(0);
      if (!isAuthenticated || pathname === '/login') {
        setIsOpen(false);
        return;
      }
      try {
        setIsOpen(!localStorage.getItem(seenKey));
      } catch {
        setIsOpen(false);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, pathname, seenKey]);

  const closeGuide = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(seenKey, 'true');
    } catch {
      // The guide remains available from its button when storage is disabled.
    }
  }, [seenKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuide();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeGuide, isOpen]);

  const startGuide = () => {
    setStep(0);
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={startGuide}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-400/40 bg-slate-900 px-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        aria-label={`Open ${guide.title} section guide`}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        Guide
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeGuide();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="section-guide-title"
            aria-describedby="section-guide-description"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                    Section guide · {step + 1} of {steps.length}
                  </p>
                  <h2 id="section-guide-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {guide.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeGuide}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close section guide"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <div className="mb-5 flex gap-1.5" aria-hidden="true">
                {steps.map((item, index) => (
                  <span
                    key={item.title}
                    className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{steps[step].title}</h3>
              <p
                id="section-guide-description"
                className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300"
              >
                {steps[step].body}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeGuide}
                  className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Skip guide
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep((current) => current - 1)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </button>
                  )}
                  {step < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep((current) => current + 1)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white transition hover:bg-sky-500"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeGuide}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white transition hover:bg-sky-500"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Finish
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
