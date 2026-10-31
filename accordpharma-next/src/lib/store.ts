import {
  Account,
  HealthcareProfessional,
  DetailingProduct,
  HospitalFormularyItem,
  CommercialOrder,
  SalesActivity,
  CRMTask,
  Lead,
  LeadNote,
  LeadConversation,
  LeadMeeting,
  Opportunity,
  InventoryItem,
  Proposal,
  Tender,
  NotificationItem,
  SampleItem,
  SampleDispensation,
  BudgetImpactScenario,
  MedicalInfoRequest,
  SunshinePaymentRecord,
  DailyCallPlan,
  SlideEngagementMetric,
  PatientHubCase,
  PrescriberDecileTarget,
  NextBestAction,
  SpeakerBureauEvent,
  CompetitiveBattlecard,
  ColdChainSensorReading,
} from './types';

// In-Memory Seeded Database for Full-Stack Next.js
export const initialAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'St. Jude Metropolitan Medical Center',
    account_type: 'HOSPITAL',
    territory: 'Territory West - Metro',
    owner_id: 'usr-1',
    owner_name: 'Marcus Vance',
    beds: 540,
    health_status: 'healthy',
    health_score: 94,
    total_invoiced: 485000,
    total_collected: 412000,
    open_deals_count: 3,
    created_at: '2025-01-15T08:00:00Z',
  },
  {
    id: 'acc-2',
    name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    account_type: 'HOSPITAL',
    territory: 'Territory West - Oncology',
    owner_id: 'usr-1',
    owner_name: 'Marcus Vance',
    beds: 320,
    health_status: 'healthy',
    health_score: 91,
    total_invoiced: 620000,
    total_collected: 580000,
    open_deals_count: 5,
    created_at: '2025-02-10T10:30:00Z',
  },
  {
    id: 'acc-3',
    name: 'Northwestern Heart & Vascular Institute',
    account_type: 'CLINIC',
    territory: 'Territory Midwest - Cardiology',
    owner_id: 'usr-2',
    owner_name: 'Elena Rostova',
    beds: 180,
    health_status: 'attention',
    health_score: 72,
    total_invoiced: 210000,
    total_collected: 140000,
    open_deals_count: 2,
    created_at: '2025-03-01T14:15:00Z',
  },
  {
    id: 'acc-4',
    name: 'Memorial Sloan Regional Health System',
    account_type: 'HOSPITAL',
    territory: 'Territory East - Oncology',
    owner_id: 'usr-3',
    owner_name: 'David Chen',
    beds: 720,
    health_status: 'at_risk',
    health_score: 58,
    total_invoiced: 180000,
    total_collected: 95000,
    open_deals_count: 1,
    created_at: '2025-04-12T09:00:00Z',
  },
];

export const initialHCPs: HealthcareProfessional[] = [
  {
    id: 'hcp-1',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    full_name: 'Dr. Sarah Chen, MD',
    title: 'Chief of Interventional Cardiology',
    specialty: 'Cardiology',
    license_number: 'NPI-1948201948',
    prescribing_tier: 'Key Opinion Leader (KOL)',
    kol_status: true,
    email: 'sarah.chen@stjude-health.org',
    phone: '+1 (415) 892-4412',
    country: 'United States',
    territory: 'Territory West - Metro',
    last_interaction_at: '2026-10-24T14:30:00Z',
    next_scheduled_visit: '2026-11-04T10:00:00Z',
    interactions_count: 14,
    status: 'ACTIVE',
  },
  {
    id: 'hcp-2',
    account_id: 'acc-2',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    full_name: 'Dr. Aris Thorne, MD, PhD',
    title: 'Director of Thoracic Oncology Research',
    specialty: 'Oncology',
    license_number: 'NPI-1092837482',
    prescribing_tier: 'Tier 1 (High Decile)',
    kol_status: true,
    email: 'thorne.aris@cedars-oncology.org',
    phone: '+1 (310) 902-8819',
    country: 'United States',
    territory: 'Territory West - Oncology',
    last_interaction_at: '2026-10-22T11:00:00Z',
    next_scheduled_visit: '2026-11-02T15:30:00Z',
    interactions_count: 22,
    status: 'ACTIVE',
  },
  {
    id: 'hcp-3',
    account_id: 'acc-3',
    account_name: 'Northwestern Heart & Vascular Institute',
    full_name: 'Dr. Michael Rodriguez, MD, FACC',
    title: 'Senior Heart Failure Specialist',
    specialty: 'Cardiology',
    license_number: 'NPI-1849203912',
    prescribing_tier: 'Tier 1 (High Decile)',
    kol_status: false,
    email: 'm.rodriguez@nw-heart.org',
    phone: '+1 (312) 554-9021',
    country: 'United States',
    territory: 'Territory Midwest - Cardiology',
    last_interaction_at: '2026-10-18T16:15:00Z',
    next_scheduled_visit: '2026-11-08T11:00:00Z',
    interactions_count: 9,
    status: 'ACTIVE',
  },
  {
    id: 'hcp-4',
    account_id: 'acc-4',
    account_name: 'Memorial Sloan Regional Health System',
    full_name: 'Dr. Evelyn Vance, MD',
    title: 'Head of Neuro-Oncology & Clinical Trials',
    specialty: 'Neurology',
    license_number: 'NPI-1492039481',
    prescribing_tier: 'Tier 2 (Medium Decile)',
    kol_status: false,
    email: 'e.vance@sloancare.org',
    phone: '+1 (212) 774-1290',
    country: 'United States',
    territory: 'Territory East - Oncology',
    last_interaction_at: '2026-10-12T09:45:00Z',
    next_scheduled_visit: '2026-11-15T14:00:00Z',
    interactions_count: 6,
    status: 'ACTIVE',
  },
  {
    id: 'hcp-5',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    full_name: 'Dr. Jonathan Blake, MD',
    title: 'Chief Medical Officer & P&T Vice Chair',
    specialty: 'Endocrinology',
    license_number: 'NPI-1394829104',
    prescribing_tier: 'Key Opinion Leader (KOL)',
    kol_status: true,
    email: 'j.blake@stjude-health.org',
    phone: '+1 (415) 892-7731',
    country: 'United States',
    territory: 'Territory West - Metro',
    last_interaction_at: '2026-10-25T13:00:00Z',
    next_scheduled_visit: '2026-11-10T09:30:00Z',
    interactions_count: 18,
    status: 'ACTIVE',
  },
];

export const initialDetailingProducts: DetailingProduct[] = [
  {
    id: 'prod-onco-700',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    indication: 'Advanced EGFR-Exon 20 insertion Non-Small Cell Lung Carcinoma (NSCLC)',
    regulatory_approval: 'FDA Priority Approval (Oct 2025)',
    category: 'Targeted Oncology',
    slides: [
      {
        slide_id: 'slide-1',
        title: 'Unmet Need in Refractory Exon-20 NSCLC',
        subtitle: 'Overcoming Conventional Tyrosine Kinase Inhibitor Resistance',
        content:
          'Patients harboring EGFR Exon-20 insertions experience steric hindrance that blocks 1st and 3rd generation TKIs. Median overall survival under historical chemotherapy is capped at 13.6 months.',
        key_metric: '78% Historical Progression Rate at 12 Months',
        chart_type: 'survival_curve',
        hazard_ratio: 'HR = 0.44 (95% CI: 0.32-0.59)',
        clinical_evidence: 'Phase III ACCORD-LUNG pivotal randomized trial (N=680). Superiority demonstrated at p < 0.0001.',
      },
      {
        slide_id: 'slide-2',
        title: 'Biochemical Selectivity & Kinase Binding',
        subtitle: 'Covalent αC-Helix Lock Mechanism',
        content:
          'OncoTarget-700 forms an irreversible covalent bond with Cysteine-797 while accommodating the αC-helix loop insertion via an optimized fluoro-pyrrolidine warhead, preserving wild-type EGFR.',
        key_metric: '32x Greater Selectivity vs WT-EGFR',
        chart_type: 'biochemical_cascade',
        clinical_evidence: 'Cryo-EM structural crystallography resolving kinase binding at 1.84Å resolution.',
      },
      {
        slide_id: 'slide-3',
        title: 'Progression-Free & Overall Survival Endpoints',
        subtitle: 'Kaplan-Meier Primary Efficacy Curve',
        content:
          'Median progression-free survival (PFS) was extended to 21.8 months vs 8.4 months in the platinum-doublet chemotherapy arm, demonstrating durable responses across central nervous system metastases.',
        key_metric: 'Median PFS: 21.8 Months (vs 8.4 Mo Control)',
        chart_type: 'survival_curve',
        hazard_ratio: 'HR = 0.38 (p < 0.001)',
        clinical_evidence: 'Confirmed Independent Review Facility (IRF) assessed response rate: 64.2%.',
      },
      {
        slide_id: 'slide-4',
        title: 'Safety Profile & Dosing Flexibility',
        subtitle: 'Low Discontinuation Rate and Manageable Tolerability',
        content:
          'Grade 3/4 adverse events occurred in only 11.4% of patients. No QTc prolongation or interstitial lung disease signals observed. Once-daily oral administration (140mg) with or without food.',
        key_metric: '92.4% Dose Retention Rate',
        chart_type: 'dosing_matrix',
        clinical_evidence: 'ACCORD-LUNG Global Safety Registry with 18-month follow-up.',
      },
    ],
  },
  {
    id: 'prod-cardio-xr',
    product_name: 'CardioVas-XR (Vasocordin Extended-Release)',
    indication: 'Resistant Hypertension with Concomitant Heart Failure with Preserved Ejection Fraction (HFpEF)',
    regulatory_approval: 'FDA Approved (Mar 2025)',
    category: 'Cardiovascular Therapeutics',
    slides: [
      {
        slide_id: 'slide-c1',
        title: 'Dual Endothelin-A & Neprilysin Modulation',
        subtitle: 'Next-Generation Hemodynamic Optimization',
        content:
          'CardioVas-XR simultaneously blunts ETA-mediated systemic vasoconstriction while preventing the degradation of vasodilatory atrial natriuretic peptide (ANP), lowering central aortic stiffness.',
        key_metric: '-24.6 mmHg Sustained 24h Systolic Reduction',
        chart_type: 'biochemical_cascade',
        hazard_ratio: 'HR = 0.61 for HF Hospitalization',
        clinical_evidence: 'PRESERVE-HF Multicenter Trial (N=1,420).',
      },
      {
        slide_id: 'slide-c2',
        title: 'Cardiovascular Outcomes & Renal Preservation',
        subtitle: '42% Reduction in Composite Heart Failure Endpoints',
        content:
          'Statistically significant reduction in combined CV mortality and urgent heart failure visits. Preserves estimated glomerular filtration rate (eGFR) slope over 36 months.',
        key_metric: '42% Lower Risk of HF Hospitalization',
        chart_type: 'survival_curve',
        hazard_ratio: 'HR = 0.58 (95% CI: 0.49-0.70, p < 0.0001)',
        clinical_evidence: 'Phase III Double-Blind Active Comparator vs ACE/ARB standard of care.',
      },
    ],
  },
  {
    id: 'prod-neuro-iv',
    product_name: 'NeuroGuard-IV (Cerebrolin Infusion)',
    indication: 'Acute Ischemic Stroke Neuroprotection within 8-Hour Therapeutic Window',
    regulatory_approval: 'EMA & FDA Fast-Track Designated',
    category: 'Neurovascular Intensive Care',
    slides: [
      {
        slide_id: 'slide-n1',
        title: 'Penumbra Cell Rescuing Mechanism',
        subtitle: 'Glutamate Excitotoxicity & Mitochondrial Membrane Shielding',
        content:
          'Rapid intravenous administration halts the ischemic biochemical cascade by scavenging free radicals and preserving mitochondrial ATP synthesis in hypoperfused cerebral tissue.',
        key_metric: '68% Modified Rankin Scale (mRS 0-1) at 90 Days',
        chart_type: 'biochemical_cascade',
        hazard_ratio: 'p < 0.0005 vs Placebo',
        clinical_evidence: 'PROTECT-STROKE Global Registry Trial.',
      },
    ],
  },
];

export const initialFormularies: HospitalFormularyItem[] = [
  {
    id: 'form-1',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    territory: 'Territory West - Metro',
    product_id: 'prod-cardio-xr',
    product_name: 'CardioVas-XR 50mg Tablets',
    product_sku: 'CVX-50MG-100',
    category: 'Cardiology',
    formulary_tier: 'Tier 1 Preferred',
    pt_status: 'Approved',
    pt_meeting_date: '2026-10-14',
    physician_champion: 'Dr. Sarah Chen, MD',
    protocol_requirements: 'Unrestricted formulary inclusion for Cardiology & Internal Medicine.',
    competitor_displaced: 'Novartis Entresto (Partial Switch)',
    annual_potential_value: 185000,
    updated_at: '2026-10-20T12:00:00Z',
  },
  {
    id: 'form-2',
    account_id: 'acc-2',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    territory: 'Territory West - Oncology',
    product_id: 'prod-onco-700',
    product_name: 'OncoTarget-700 (Zenocamtinib 140mg)',
    product_sku: 'OCT-140MG-60',
    category: 'Targeted Oncology',
    formulary_tier: 'Tier 1 Preferred',
    pt_status: 'Approved',
    pt_meeting_date: '2026-09-28',
    physician_champion: 'Dr. Aris Thorne, MD, PhD',
    protocol_requirements: 'First-line EGFR Exon-20 positive NSCLC molecular pathology verified.',
    competitor_displaced: 'JNJ Rybrevant (IV to Oral Switch)',
    annual_potential_value: 340000,
    updated_at: '2026-10-22T15:30:00Z',
  },
  {
    id: 'form-3',
    account_id: 'acc-3',
    account_name: 'Northwestern Heart & Vascular Institute',
    territory: 'Territory Midwest - Cardiology',
    product_id: 'prod-cardio-xr',
    product_name: 'CardioVas-XR 100mg Tablets',
    product_sku: 'CVX-100MG-100',
    category: 'Cardiology',
    formulary_tier: 'Tier 2 Prior Auth',
    pt_status: 'Under Evaluation',
    pt_meeting_date: '2026-11-12',
    physician_champion: 'Dr. Michael Rodriguez, MD',
    protocol_requirements: 'Requires prior trial of ACE inhibitor or ARB for at least 6 weeks.',
    competitor_displaced: 'Pending Committee Vote',
    annual_potential_value: 120000,
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'form-4',
    account_id: 'acc-4',
    account_name: 'Memorial Sloan Regional Health System',
    territory: 'Territory East - Oncology',
    product_id: 'prod-onco-700',
    product_name: 'OncoTarget-700 (Zenocamtinib 140mg)',
    product_sku: 'OCT-140MG-60',
    category: 'Targeted Oncology',
    formulary_tier: 'Tier 2 Prior Auth',
    pt_status: 'Pending Review',
    pt_meeting_date: '2026-11-18',
    physician_champion: 'Dr. Evelyn Vance, MD',
    protocol_requirements: 'Dossier submitted; waiting on Pharmacy Director safety sign-off.',
    competitor_displaced: 'Takeda Exkivity (Legacy)',
    annual_potential_value: 210000,
    updated_at: '2026-10-15T09:00:00Z',
  },
];

export const initialOrders: CommercialOrder[] = [
  {
    id: 'ord-842',
    order_number: 'ORD-2026-0842',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    product_id: 'prod-cardio-xr',
    product_name: 'CardioVas-XR 50mg Tablets',
    sku: 'CVX-50MG-100',
    quantity: 200,
    unit_price: 45.0,
    total_price: 9000.0,
    status: 'CONFIRMED',
    created_at: '2026-10-26T11:20:00Z',
  },
  {
    id: 'ord-841',
    order_number: 'ORD-2026-0841',
    account_id: 'acc-2',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    product_id: 'prod-onco-700',
    product_name: 'OncoTarget-700 140mg (60 caps)',
    sku: 'OCT-140MG-60',
    quantity: 40,
    unit_price: 850.0,
    total_price: 34000.0,
    status: 'CONFIRMED',
    created_at: '2026-10-25T16:00:00Z',
  },
  {
    id: 'ord-839',
    order_number: 'ORD-2026-0839',
    account_id: 'acc-3',
    account_name: 'Northwestern Heart & Vascular Institute',
    product_id: 'prod-cardio-xr',
    product_name: 'CardioVas-XR 100mg Tablets',
    sku: 'CVX-100MG-100',
    quantity: 100,
    unit_price: 65.0,
    total_price: 6500.0,
    status: 'DELIVERED',
    created_at: '2026-10-20T14:45:00Z',
  },
];

export const initialActivities: SalesActivity[] = [
  {
    id: 'act-1',
    account_id: 'acc-1',
    contact_id: 'hcp-1',
    activity_type: 'detailing',
    purpose: 'CardioVas-XR Phase III Efficacy & HFpEF Prescribing Guidance',
    sentiment: 'very_receptive',
    outcome: 'Physician requested 10 starter sample titration packs and committed to 5 patient switches.',
    occurred_at: '2026-10-24T14:30:00Z',
    rep_name: 'Marcus Vance',
  },
  {
    id: 'act-2',
    account_id: 'acc-2',
    contact_id: 'hcp-2',
    activity_type: 'detailing',
    purpose: 'OncoTarget-700 Exon-20 Kaplan-Meier Survival Curve Presentation',
    sentiment: 'very_receptive',
    outcome: 'Dr. Thorne agreed to co-author institutional protocol and add to hospital Tier 1 order set.',
    occurred_at: '2026-10-22T11:00:00Z',
    rep_name: 'Marcus Vance',
  },
  {
    id: 'act-3',
    account_id: 'acc-3',
    contact_id: 'hcp-3',
    activity_type: 'visit',
    purpose: 'Formulary P&T Committee Follow-up on Prior Authorization ease',
    sentiment: 'neutral',
    outcome: 'Addressed questions on eGFR preservation. Follow-up meeting scheduled before committee vote.',
    occurred_at: '2026-10-18T16:15:00Z',
    rep_name: 'Elena Rostova',
  },
];

export const initialTasks: CRMTask[] = [
  {
    id: 'tsk-1',
    title: 'Deliver 10 CardioVas-XR Clinical Titration Sample Packs to Dr. Sarah Chen',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    due_at: '2026-10-30T17:00:00Z',
    priority: 'high',
    status: 'pending',
    assigned_to: 'Marcus Vance',
  },
  {
    id: 'tsk-2',
    title: 'Submit OncoTarget-700 Phase III ACCORD Trial Reprints to Memorial Sloan P&T Board',
    account_id: 'acc-4',
    account_name: 'Memorial Sloan Regional Health System',
    due_at: '2026-11-03T12:00:00Z',
    priority: 'urgent',
    status: 'in_progress',
    assigned_to: 'David Chen',
  },
  {
    id: 'tsk-3',
    title: 'Draft Annual Volume Supply Tender for Cedars-Sinai Inpatient Pharmacy',
    account_id: 'acc-2',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    due_at: '2026-11-06T18:00:00Z',
    priority: 'normal',
    status: 'pending',
    assigned_to: 'Marcus Vance',
  },
];

export const initialLeads: Lead[] = [
  {
    id: 'ld-1',
    full_name: 'Dr. Christopher Palmer, MD',
    title: 'Associate Director of Medical Oncology',
    institution: 'Baylor Scott & White Medical Center',
    specialty: 'Oncology',
    status: 'new',
    source: 'Inbound Conference Lead (ASCO 2026)',
    estimated_value: 240000,
    email: 'c.palmer@bswhealth.org',
    phone: '+1 (214) 820-0111',
    territory: 'Territory South - Texas',
    assigned_rep: 'David Chen',
    assigned_rep_id: 'usr-3',
    qualification_score: 45,
    qualification_details: {
      prescribing_authority: true,
      active_patient_volume: true,
      budget_readiness: false,
      formulary_alignment: false,
    },
    notes: [
      {
        id: 'not-101',
        text: 'Met at ASCO poster session on EGFR Exon-20 inhibitors. Dr. Palmer expressed deep interest in the median PFS data of 21.8 months.',
        author: 'David Chen',
        created_at: '2026-10-25T14:30:00Z',
      },
    ],
    conversations: [
      {
        id: 'cnv-101',
        type: 'in_person',
        summary: 'Brief 10-minute conference discussion on OncoTarget-700 Phase III toxicity profile and rash management.',
        sentiment: 'very_receptive',
        outcome: 'Requested full clinical monograph and journal reprints sent to his institutional email.',
        rep_name: 'David Chen',
        occurred_at: '2026-10-25T11:00:00Z',
      },
    ],
    meetings: [
      {
        id: 'mtg-101',
        title: 'Virtual Clinical Overview: OncoTarget-700 Monograph Review',
        scheduled_at: '2026-11-04T15:00:00Z',
        duration_minutes: 30,
        location: 'Microsoft Teams Hybrid Video',
        status: 'scheduled',
      },
    ],
    created_at: '2026-10-25T09:00:00Z',
  },
  {
    id: 'ld-2',
    full_name: 'Dr. Kimberly Adams, MD',
    title: 'Chief of Cardiology',
    institution: 'Scripps Memorial Hospital La Jolla',
    specialty: 'Cardiology',
    status: 'qualified',
    source: 'Medical Representative Field Scout',
    estimated_value: 180000,
    email: 'adams.k@scrippshealth.org',
    phone: '+1 (858) 626-4123',
    territory: 'Territory West - California',
    assigned_rep: 'Marcus Vance',
    assigned_rep_id: 'usr-1',
    qualification_score: 90,
    qualification_details: {
      prescribing_authority: true,
      active_patient_volume: true,
      budget_readiness: true,
      formulary_alignment: true,
    },
    notes: [
      {
        id: 'not-102',
        text: 'Confirmed Dr. Adams chairs the regional heart failure task force. She oversees approximately 45 high-risk HFpEF patient discharges monthly.',
        author: 'Marcus Vance',
        created_at: '2026-10-23T16:15:00Z',
      },
      {
        id: 'not-103',
        text: 'CardioVas-XR dual modulation mechanism solves a critical clinical gap in resistant systolic hypertension with preserved EF.',
        author: 'Marcus Vance',
        created_at: '2026-10-26T10:00:00Z',
      },
    ],
    conversations: [
      {
        id: 'cnv-102',
        type: 'call',
        summary: 'Follow-up call regarding starter sample titration protocol and inpatient hospital discharge kits.',
        sentiment: 'very_receptive',
        outcome: 'Agreed to initiate 5 patient evaluations once P&T temporary review clearance is provided.',
        rep_name: 'Marcus Vance',
        occurred_at: '2026-10-24T14:00:00Z',
      },
    ],
    meetings: [
      {
        id: 'mtg-102',
        title: 'Cardiology Department In-Service Lunch & Detailing Session',
        scheduled_at: '2026-11-06T12:00:00Z',
        duration_minutes: 45,
        location: 'Scripps La Jolla Cardiology Conference Room B',
        status: 'scheduled',
      },
    ],
    created_at: '2026-10-22T14:30:00Z',
  },
  {
    id: 'ld-3',
    full_name: 'Dr. Raymond Zhao, MD',
    title: 'Director of Neuro-Interventional Surgery',
    institution: 'Houston Methodist Neurological Institute',
    specialty: 'Neurology',
    status: 'qualified',
    source: 'Formulary Pre-Dossier Inquiry',
    estimated_value: 310000,
    email: 'r.zhao@houstonmethodist.org',
    phone: '+1 (713) 790-3311',
    territory: 'Territory South - Texas',
    assigned_rep: 'Elena Rostova',
    assigned_rep_id: 'usr-2',
    qualification_score: 85,
    qualification_details: {
      prescribing_authority: true,
      active_patient_volume: true,
      budget_readiness: true,
      formulary_alignment: true,
    },
    notes: [
      {
        id: 'not-104',
        text: 'NeuroGuard-IV acute ischemic stroke trial data matches their comprehensive stroke center protocol goals.',
        author: 'Elena Rostova',
        created_at: '2026-10-20T11:00:00Z',
      },
    ],
    conversations: [
      {
        id: 'cnv-103',
        type: 'email',
        summary: 'Detailed email exchange providing STROKE-ACCORD Day-90 mRS functional independence data tables.',
        sentiment: 'very_receptive',
        outcome: 'Lead requested formal meeting with our Medical Science Liaison.',
        rep_name: 'Elena Rostova',
        occurred_at: '2026-10-21T16:45:00Z',
      },
    ],
    meetings: [
      {
        id: 'mtg-103',
        title: 'Neuro-ICU Protocol Review & MSL Briefing',
        scheduled_at: '2026-11-08T10:00:00Z',
        duration_minutes: 60,
        location: 'Houston Methodist Neuro-Institute 5th Floor',
        status: 'scheduled',
      },
    ],
    created_at: '2026-10-19T11:15:00Z',
  },
  {
    id: 'ld-4',
    full_name: 'Dr. Sandra Bell, MD',
    title: 'Head of Ambulatory Endocrinology',
    institution: 'Vanderbilt University Medical Center',
    specialty: 'Endocrinology',
    status: 'converted',
    source: 'Key Opinion Leader Peer Referral',
    estimated_value: 145000,
    email: 'sandra.bell@vumc.org',
    phone: '+1 (615) 322-5000',
    territory: 'Territory Southeast',
    assigned_rep: 'Marcus Vance',
    assigned_rep_id: 'usr-1',
    qualification_score: 100,
    qualification_details: {
      prescribing_authority: true,
      active_patient_volume: true,
      budget_readiness: true,
      formulary_alignment: true,
    },
    notes: [
      {
        id: 'not-105',
        text: 'Successfully converted to active prescriber account. Opportunity opened for outpatient health system expansion.',
        author: 'Marcus Vance',
        created_at: '2026-10-21T09:00:00Z',
      },
    ],
    conversations: [],
    meetings: [],
    converted_opportunity_id: 'opp-2',
    created_at: '2026-10-15T16:00:00Z',
  },
];

export const initialOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    name: 'Cedars-Sinai Inpatient Zenocamtinib Formulary Expansion',
    account_id: 'acc-2',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    stage: 'NEGOTIATION',
    estimated_value: 340000,
    probability: 80,
    expected_close_date: '2026-11-20',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    rep_name: 'Marcus Vance',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'opp-2',
    name: 'St. Jude Metropolitan High-Risk HFpEF Outpatient Switch',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    stage: 'PROPOSAL',
    estimated_value: 195000,
    probability: 65,
    expected_close_date: '2026-12-05',
    product_name: 'CardioVas-XR 50mg Tablets',
    rep_name: 'Marcus Vance',
    created_at: '2026-10-01T14:00:00Z',
  },
  {
    id: 'opp-3',
    name: 'Northwestern Heart & Vascular Tier 2 Protocol Review',
    account_id: 'acc-3',
    account_name: 'Northwestern Heart & Vascular Institute',
    stage: 'QUALIFICATION',
    estimated_value: 125000,
    probability: 45,
    expected_close_date: '2026-12-18',
    product_name: 'CardioVas-XR 100mg Tablets',
    rep_name: 'Elena Rostova',
    created_at: '2026-10-10T11:00:00Z',
  },
  {
    id: 'opp-4',
    name: 'Memorial Sloan Regional Acute Stroke Intensive Supply',
    account_id: 'acc-4',
    account_name: 'Memorial Sloan Regional Health System',
    stage: 'PROSPECTING',
    estimated_value: 280000,
    probability: 25,
    expected_close_date: '2027-01-15',
    product_name: 'NeuroGuard-IV Infusion 50ml',
    rep_name: 'David Chen',
    created_at: '2026-10-18T15:30:00Z',
  },
  {
    id: 'opp-5',
    name: 'Metro Regional Hospital Health System Tier 1 Preferred Tender',
    account_id: 'acc-1',
    account_name: 'St. Jude Metropolitan Medical Center',
    stage: 'WON',
    estimated_value: 420000,
    probability: 100,
    expected_close_date: '2026-10-12',
    product_name: 'CardioVas-XR (Vasocordin)',
    rep_name: 'Marcus Vance',
    created_at: '2026-08-20T09:00:00Z',
  },
];

export const initialInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    product_name: 'OncoTarget-700 140mg Capsules (60 count)',
    sku: 'OCT-140MG-60',
    lot_number: 'LOT-2026-OCT-881',
    batch_number: 'BCH-99214',
    warehouse: 'San Francisco Regional Cold Storage',
    quantity: 1420,
    storage_condition: '15°C to 25°C (Controlled Room Temperature)',
    expiry_date: '2028-06-30',
    status: 'IN_STOCK',
  },
  {
    id: 'inv-2',
    product_name: 'CardioVas-XR 50mg Tablets (100 count bottle)',
    sku: 'CVX-50MG-100',
    lot_number: 'LOT-2026-CVX-412',
    batch_number: 'BCH-84190',
    warehouse: 'Los Angeles Distribution Hub',
    quantity: 4850,
    storage_condition: '20°C to 25°C (Excursions Permitted to 15-30°C)',
    expiry_date: '2027-11-30',
    status: 'IN_STOCK',
  },
  {
    id: 'inv-3',
    product_name: 'CardioVas-XR 100mg Tablets (100 count bottle)',
    sku: 'CVX-100MG-100',
    lot_number: 'LOT-2026-CVX-509',
    batch_number: 'BCH-84198',
    warehouse: 'Chicago Central Depot',
    quantity: 820,
    storage_condition: '20°C to 25°C Dry Store',
    expiry_date: '2027-12-15',
    status: 'LOW_STOCK',
  },
  {
    id: 'inv-4',
    product_name: 'NeuroGuard-IV Infusion 50ml Vials (10 pack)',
    sku: 'NGD-50ML-10',
    lot_number: 'LOT-2026-NGD-102',
    batch_number: 'BCH-77412',
    warehouse: 'Memphis Bio-Logistics Center',
    quantity: 2600,
    storage_condition: '2°C to 8°C (Refrigerated Dark)',
    expiry_date: '2028-03-31',
    status: 'IN_STOCK',
  },
];

export const initialProposals: Proposal[] = [
  {
    id: 'prp-1',
    title: 'Annual Inpatient Formulary Supply Agreement 2026/2027',
    account_name: 'Cedars-Sinai Comprehensive Cancer Pavilion',
    tier: 'Tier 1 Preferred Access',
    value: 480000,
    discount_percent: 12.5,
    status: 'UNDER_REVIEW',
    valid_until: '2026-11-30',
    created_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'prp-2',
    title: 'Outpatient Cardiology Strategic Partnership',
    account_name: 'St. Jude Metropolitan Medical Center',
    tier: 'System-wide Dual Dispense',
    value: 290000,
    discount_percent: 8.0,
    status: 'CLIENT_REVIEW',
    valid_until: '2026-12-15',
    created_at: '2026-10-22T14:00:00Z',
  },
  {
    id: 'prp-3',
    title: 'Heart Failure Registry Pilot & Starter Titration Supply',
    account_name: 'Northwestern Heart & Vascular Institute',
    tier: 'Clinical Evaluation Pilot',
    value: 110000,
    discount_percent: 5.0,
    status: 'DRAFT',
    valid_until: '2026-12-31',
    created_at: '2026-10-24T09:30:00Z',
  },
];

export const initialTenders: Tender[] = [
  {
    id: 'tnd-1',
    reference: 'TND-2026-WMC-091',
    title: 'Western Regional Health Authority Targeted Oncology Supply',
    account_name: 'Regional Hospital Purchasing Alliance',
    status: 'OPEN',
    value: 1250000,
    due_at: '2026-11-28',
    owner_name: 'Marcus Vance',
  },
  {
    id: 'tnd-2',
    reference: 'TND-2026-MET-044',
    title: 'Metropolitan Inpatient Cardiovascular Standard Formulations',
    account_name: 'St. Jude Metropolitan Medical Center',
    status: 'AWARDED',
    value: 680000,
    due_at: '2026-10-15',
    owner_name: 'Marcus Vance',
  },
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Formulary Approval Confirmed',
    body: 'Cedars-Sinai P&T Board voted unanimously for OncoTarget-700 Tier 1 Preferred coverage.',
    type: 'clinical',
    created_at: '2026-10-27T10:15:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Urgent Task Reminder',
    body: 'Deliver 10 CardioVas-XR titration sample units to Dr. Sarah Chen due in 48 hours.',
    type: 'task',
    created_at: '2026-10-26T16:00:00Z',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Commercial Order Processed',
    body: 'Order #ORD-2026-0842 ($9,000) confirmed for St. Jude Metropolitan Medical Center.',
    type: 'update',
    created_at: '2026-10-26T11:25:00Z',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Low Stock Alert in Central Depot',
    body: 'CardioVas-XR 100mg Tablets inventory fell below 1,000 units in Chicago Depot.',
    type: 'alert',
    created_at: '2026-10-25T08:30:00Z',
    read: true,
  },
];

export const initialSampleItems: SampleItem[] = [
  {
    id: 'smp-1',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    dosage: '140mg Starter Titration Pack (14 Caps)',
    ndc_code: '72891-102-14',
    lot_number: 'LOT-OT7-2026A',
    expiry_date: '2027-08-31',
    trunk_stock: 48,
    allocated_quota: 60,
    cold_chain_required: false,
    temp_range: 'Controlled Room Temp (20°C - 25°C)',
  },
  {
    id: 'smp-2',
    product_name: 'CardioVas-XR (Vasocordin ER)',
    dosage: '50mg Sustained-Release Box (30 Tablets)',
    ndc_code: '72891-205-30',
    lot_number: 'LOT-CVX-9941B',
    expiry_date: '2027-11-30',
    trunk_stock: 75,
    allocated_quota: 100,
    cold_chain_required: false,
    temp_range: 'Store below 25°C',
  },
  {
    id: 'smp-3',
    product_name: 'NeuroShield-IV (Cerebrolysin-X)',
    dosage: '250mg Vials (Pack of 5 Starter Vials)',
    ndc_code: '72891-310-05',
    lot_number: 'LOT-NS4-8812C',
    expiry_date: '2027-04-15',
    trunk_stock: 30,
    allocated_quota: 40,
    cold_chain_required: true,
    temp_range: 'Refrigerate (2°C - 8°C) • Cold Chain Monitored',
  },
  {
    id: 'smp-4',
    product_name: 'Immunex-Alpha (Interleukin-15 Fusion)',
    dosage: '100mcg Prefilled Autoinjector Kit',
    ndc_code: '72891-440-02',
    lot_number: 'LOT-IMX-0129D',
    expiry_date: '2027-06-30',
    trunk_stock: 20,
    allocated_quota: 30,
    cold_chain_required: true,
    temp_range: 'Refrigerate (2°C - 8°C) • Do Not Freeze',
  },
];

export const initialSampleDispensations: SampleDispensation[] = [
  {
    id: 'dsp-101',
    physician_name: 'Dr. Gregory House, MD',
    physician_title: 'Chief of Medical Oncology',
    institution: 'St. Jude Metropolitan Medical Center',
    license_number: 'MD-883921-CA',
    dea_number: 'BH9281729',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    dosage: '140mg Starter Titration Pack',
    lot_number: 'LOT-OT7-2026A',
    quantity: 2,
    dispensed_at: '2026-10-27T10:45:00Z',
    rep_name: 'Marcus Vance',
    rep_id: 'usr-1',
    pdma_verified: true,
    notes: 'Prescriber initiating clinical evaluation for 2 refractory Exon-20 NSCLC outpatients.',
  },
  {
    id: 'dsp-102',
    physician_name: 'Dr. Kimberly Adams, MD',
    physician_title: 'Chief of Cardiology',
    institution: 'Scripps Memorial Hospital La Jolla',
    license_number: 'MD-449102-CA',
    dea_number: 'BA4829103',
    product_name: 'CardioVas-XR (Vasocordin ER)',
    dosage: '50mg Sustained-Release Box',
    lot_number: 'LOT-CVX-9941B',
    quantity: 3,
    dispensed_at: '2026-10-26T14:15:00Z',
    rep_name: 'Marcus Vance',
    rep_id: 'usr-1',
    pdma_verified: true,
    notes: 'Inpatient cardiology transition starter titration for newly diagnosed HFpEF cohort.',
  },
  {
    id: 'dsp-103',
    physician_name: 'Dr. Christopher Palmer, MD',
    physician_title: 'Associate Director of Medical Oncology',
    institution: 'Baylor Scott & White Medical Center',
    license_number: 'MD-310928-TX',
    dea_number: 'CP1092837',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    dosage: '140mg Starter Titration Pack',
    lot_number: 'LOT-OT7-2026A',
    quantity: 2,
    dispensed_at: '2026-10-25T16:00:00Z',
    rep_name: 'David Chen',
    rep_id: 'usr-3',
    pdma_verified: true,
    notes: 'Provided following ASCO conference clinical review discussion.',
  },
];

export const initialBudgetScenarios: BudgetImpactScenario[] = [
  {
    id: 'bim-1',
    hospital_name: 'St. Jude Metropolitan Medical Center',
    therapeutic_area: 'Cardiovascular Care',
    product_name: 'CardioVas-XR (Vasocordin Extended-Release)',
    eligible_patients: 450,
    adoption_rate_pct: 40,
    annual_drug_cost_per_patient: 3200,
    readmission_reduction_pct: 38,
    avg_readmission_cost: 15400,
    length_of_stay_reduction_days: 1.8,
    daily_bed_cost: 2200,
    gross_drug_spend: 576000,
    total_offset_savings: 1642800,
    net_budget_impact: -1066800,
    roi_percentage: 185,
    created_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 'bim-2',
    hospital_name: 'Houston Methodist Neurological Institute',
    therapeutic_area: 'Neuro-Critical Care',
    product_name: 'NeuroShield-IV (Cerebrolysin-X)',
    eligible_patients: 180,
    adoption_rate_pct: 50,
    annual_drug_cost_per_patient: 5400,
    readmission_reduction_pct: 44,
    avg_readmission_cost: 21000,
    length_of_stay_reduction_days: 3.2,
    daily_bed_cost: 2800,
    gross_drug_spend: 486000,
    total_offset_savings: 1438000,
    net_budget_impact: -952000,
    roi_percentage: 196,
    created_at: '2026-10-22T14:30:00Z',
  },
];

export const initialMedicalInfoRequests: MedicalInfoRequest[] = [
  {
    id: 'mir-101',
    request_number: 'MIR-2026-0042',
    physician_name: 'Dr. Gregory House, MD',
    institution: 'St. Jude Metropolitan Medical Center',
    specialty: 'Oncology',
    unsolicited_question:
      'Can OncoTarget-700 be co-administered with anti-PD-1 checkpoint inhibitors in patients with asymptomatic brain metastases harboring EGFR Exon-20 insertion?',
    category: 'Clinical Trial Data',
    urgency: 'Standard (3-5 Days)',
    commercial_rep: 'Marcus Vance',
    assigned_msl: 'Dr. Aris Thorne, PharmD (Medical Affairs)',
    status: 'DOSSIER_PREPARED',
    msl_response_summary:
      'Phase I/II combo cohort data (N=42) showed no dose-limiting toxicities. Reprint of ESMO 2025 poster enclosed.',
    created_at: '2026-10-26T11:00:00Z',
  },
  {
    id: 'mir-102',
    request_number: 'MIR-2026-0043',
    physician_name: 'Dr. Raymond Zhao, MD',
    institution: 'Houston Methodist Neurological Institute',
    specialty: 'Neurology',
    unsolicited_question:
      'What is the pharmacokinetics and blood-brain barrier permeability profile of NeuroShield-IV in acute ischemic stroke vs hemorrhagic transformation?',
    category: 'Mechanism of Action',
    urgency: 'Urgent (24h)',
    commercial_rep: 'Elena Rostova',
    assigned_msl: 'Dr. Elena Vasquez, MD, PhD (Senior Neuro MSL)',
    status: 'MSL_ASSIGNED',
    created_at: '2026-10-28T09:15:00Z',
  },
];

export const initialSunshineRecords: SunshinePaymentRecord[] = [
  {
    id: 'sun-1',
    hcp_name: 'Dr. Christopher Palmer, MD',
    hcp_npi: '1092837461',
    institution: 'Baylor Scott & White Medical Center',
    specialty: 'Oncology',
    category: 'Food & Beverage',
    amount: 68.5,
    event_title: 'ASCO Oncology Congress Scientific Dinner: EGFR-Exon 20 Working Group',
    date: '2026-10-25',
    rep_or_manager: 'David Chen',
    compliance_flag: 'COMPLIANT',
    notes: 'Under $100 per-physician institutional meal policy limit.',
  },
  {
    id: 'sun-2',
    hcp_name: 'Dr. Kimberly Adams, MD',
    hcp_npi: '1482910392',
    institution: 'Scripps Memorial Hospital La Jolla',
    specialty: 'Cardiology',
    category: 'Speaker Honorarium',
    amount: 2500.0,
    event_title: 'Cardiovascular Grand Rounds: Resistant HFpEF Hemodynamics',
    date: '2026-10-24',
    rep_or_manager: 'Marcus Vance',
    compliance_flag: 'COMPLIANT',
    notes: 'Fair market value (FMV) tier 1 cardiology opinion leader rate.',
  },
  {
    id: 'sun-3',
    hcp_name: 'Dr. Gregory House, MD',
    hcp_npi: '1982736450',
    institution: 'St. Jude Metropolitan Medical Center',
    specialty: 'Oncology',
    category: 'Advisory Board Fee',
    amount: 4500.0,
    event_title: 'National Precision Oncology Advisory Board (Q3 Fall Session)',
    date: '2026-10-18',
    rep_or_manager: 'Marcus Vance',
    compliance_flag: 'NEARING_LIMIT',
    notes: 'Annual aggregate reaches $8,500 of $10,000 threshold. Sunshine CMS reportable.',
  },
];

export const initialDailyCallPlans: DailyCallPlan[] = [
  {
    id: 'dcp-1',
    time_slot: '08:30 AM',
    physician_name: 'Dr. Gregory House, MD',
    institution: 'St. Jude Metropolitan Medical Center',
    department: 'Department of Medical Oncology (Wing 4B)',
    specialty: 'Oncology',
    rep_name: 'Marcus Vance',
    date: '2026-10-29',
    status: 'COMPLETED',
    pre_call_objective: 'Present Phase III ACCORD-LUNG overall survival curve; dispense 2 starter titration packs.',
    target_product: 'OncoTarget-700 (Zenocamtinib)',
    past_objections: 'Concern over grade 3 diarrhea / dermatologic rash management.',
    key_clinical_trial: 'ACCORD-LUNG (HR = 0.38, Median PFS 21.8 Mo)',
    samples_to_leave: '2 Starter Titration Packs',
    post_call_summary:
      'Dr. House reviewed the αC-helix binding mechanism and agreed to initiate 2 refractory Exon-20 outpatients. Signed for samples.',
    sentiment: 'receptive',
  },
  {
    id: 'dcp-2',
    time_slot: '10:45 AM',
    physician_name: 'Dr. Kimberly Adams, MD',
    institution: 'Scripps Memorial Hospital La Jolla',
    department: 'Division of Cardiovascular Medicine',
    specialty: 'Cardiology',
    rep_name: 'Marcus Vance',
    date: '2026-10-29',
    status: 'IN_PROGRESS',
    pre_call_objective:
      'Walk through the Hospital P&T Budget Impact Model showing $1.06M net savings in HF readmissions.',
    target_product: 'CardioVas-XR (Vasocordin ER)',
    past_objections: 'Budget constraints on Tier 2 formulary additions.',
    key_clinical_trial: 'PRESERVE-HF Trial (42% Lower HF Hospitalization)',
    samples_to_leave: '3 Sample Boxes',
  },
  {
    id: 'dcp-3',
    time_slot: '01:30 PM',
    physician_name: 'Dr. Raymond Zhao, MD',
    institution: 'Houston Methodist Neurological Institute',
    department: 'Neuro-Interventional Surgery Suite',
    specialty: 'Neurology',
    rep_name: 'Elena Rostova',
    date: '2026-10-29',
    status: 'SCHEDULED',
    pre_call_objective:
      'Detail blood-brain barrier penetration data and discuss institutional formulary sponsor letter.',
    target_product: 'NeuroShield-IV (Cerebrolysin-X)',
    past_objections: 'Wants independent radiologic imaging confirmation of neuro-rescue.',
    key_clinical_trial: 'RESCUE-NEURO Phase III Trial',
    samples_to_leave: '1 Hospital Evaluation Starter Kit',
  },
  {
    id: 'dcp-4',
    time_slot: '03:45 PM',
    physician_name: 'Dr. Christopher Palmer, MD',
    institution: 'Baylor Scott & White Medical Center',
    department: 'Thoracic Oncology Clinic',
    specialty: 'Oncology',
    rep_name: 'David Chen',
    date: '2026-10-29',
    status: 'SCHEDULED',
    pre_call_objective: 'Deliver journal reprints from ASCO and confirm P&T formulary timeline for next month.',
    target_product: 'OncoTarget-700 (Zenocamtinib)',
    key_clinical_trial: 'Cryo-EM 1.84Å Selectivity Paper',
  },
];

export const initialSlideEngagementMetrics: SlideEngagementMetric[] = [
  {
    slide_id: 'slide-1',
    slide_title: 'Unmet Need in Refractory Exon-20 NSCLC',
    product_name: 'OncoTarget-700',
    total_presentations: 124,
    avg_dwell_time_seconds: 68,
    physician_reaction_score: 84,
    frequently_questioned: false,
    recommended_reprint: 'Lancet Oncology 2025 Epidemiology Review',
  },
  {
    slide_id: 'slide-2',
    slide_title: 'Biochemical Selectivity & Covalent αC-Helix Lock',
    product_name: 'OncoTarget-700',
    total_presentations: 119,
    avg_dwell_time_seconds: 94,
    physician_reaction_score: 93,
    frequently_questioned: false,
    recommended_reprint: 'Cryo-EM Kinase Selectivity Study (Nature Struct Mol Biol)',
  },
  {
    slide_id: 'slide-3',
    slide_title: 'Progression-Free & Overall Survival Endpoints',
    product_name: 'OncoTarget-700',
    total_presentations: 128,
    avg_dwell_time_seconds: 112,
    physician_reaction_score: 96,
    frequently_questioned: false,
    recommended_reprint: 'ACCORD-LUNG Pivotal Phase III Reprint (NEJM 2025)',
  },
  {
    slide_id: 'slide-4',
    slide_title: 'Safety Profile & Adverse Event Mitigation',
    product_name: 'OncoTarget-700',
    total_presentations: 115,
    avg_dwell_time_seconds: 126,
    physician_reaction_score: 72,
    frequently_questioned: true,
    recommended_reprint: 'Proactive Dermatologic & GI Toxicity Management Algorithm',
  },
  {
    slide_id: 'slide-c1',
    slide_title: 'Dual Endothelin-A & Neprilysin Modulation',
    product_name: 'CardioVas-XR',
    total_presentations: 98,
    avg_dwell_time_seconds: 76,
    physician_reaction_score: 88,
    frequently_questioned: false,
    recommended_reprint: 'Circulation 2025 Mechanism Brief',
  },
  {
    slide_id: 'slide-c2',
    slide_title: 'Cardiovascular Outcomes & 42% HF Risk Reduction',
    product_name: 'CardioVas-XR',
    total_presentations: 104,
    avg_dwell_time_seconds: 105,
    physician_reaction_score: 95,
    frequently_questioned: false,
    recommended_reprint: 'PRESERVE-HF Primary Endpoint Publication (JACC)',
  },
];

export const initialHubCases: PatientHubCase[] = [
  {
    id: 'hub-101',
    case_number: 'HUB-2026-0914',
    patient_pseudonym: 'PT-4482-TX',
    prescriber_name: 'Dr. Christopher Palmer, MD',
    institution: 'Baylor Scott & White Medical Center',
    product_name: 'OncoTarget-700 (Zenocamtinib)',
    diagnosis_code: 'C34.90 (Advanced NSCLC with EGFR-Exon 20 insertion)',
    primary_payer: 'Aetna Commercial PPO',
    prior_auth_status: 'APPROVED',
    copay_card_enrolled: true,
    patient_out_of_pocket: 0,
    specialty_pharmacy: 'Accredo Health Specialty Pharmacy',
    time_to_first_dose_days: 4,
    created_at: '2026-10-21T09:00:00Z',
    updated_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 'hub-102',
    case_number: 'HUB-2026-0915',
    patient_pseudonym: 'PT-8192-CA',
    prescriber_name: 'Dr. Kimberly Adams, MD',
    institution: 'Scripps Memorial Hospital La Jolla',
    product_name: 'CardioVas-XR (Vasocordin ER)',
    diagnosis_code: 'I50.32 (Chronic diastolic heart failure / HFpEF)',
    primary_payer: 'UnitedHealthcare Medicare Advantage',
    prior_auth_status: 'APPEAL_SUBMITTED',
    copay_card_enrolled: true,
    patient_out_of_pocket: 15,
    specialty_pharmacy: 'CVS Specialty Care',
    time_to_first_dose_days: 7,
    created_at: '2026-10-23T11:15:00Z',
    updated_at: '2026-10-28T16:00:00Z',
  },
  {
    id: 'hub-103',
    case_number: 'HUB-2026-0916',
    patient_pseudonym: 'PT-1104-NY',
    prescriber_name: 'Dr. Gregory House, MD',
    institution: 'St. Jude Metropolitan Medical Center',
    product_name: 'NeuroShield-IV (Cerebrolysin-X)',
    diagnosis_code: 'G93.40 (Encephalopathy / Neuro-rescue)',
    primary_payer: 'Blue Cross Blue Shield Federal',
    prior_auth_status: 'DISPENSED',
    copay_card_enrolled: false,
    patient_out_of_pocket: 25,
    specialty_pharmacy: 'Walgreens AllianceRx Specialty',
    time_to_first_dose_days: 3,
    created_at: '2026-10-24T13:45:00Z',
    updated_at: '2026-10-27T10:20:00Z',
  },
];

export const initialDecileTargets: PrescriberDecileTarget[] = [
  {
    id: 'dec-1',
    physician_name: 'Dr. Gregory House, MD',
    specialty: 'Oncology',
    institution: 'St. Jude Metropolitan Medical Center',
    territory: 'Territory West - California',
    decile: 10,
    monthly_call_target: 4,
    actual_calls_mtd: 3,
    coverage_status: 'ON_TRACK',
    last_visited_date: '2026-10-29',
    primary_product: 'OncoTarget-700 (Zenocamtinib)',
  },
  {
    id: 'dec-2',
    physician_name: 'Dr. Kimberly Adams, MD',
    specialty: 'Cardiology',
    institution: 'Scripps Memorial Hospital La Jolla',
    territory: 'Territory West - California',
    decile: 9,
    monthly_call_target: 3,
    actual_calls_mtd: 1,
    coverage_status: 'UNDER_CALLED',
    last_visited_date: '2026-10-12',
    primary_product: 'CardioVas-XR (Vasocordin ER)',
  },
  {
    id: 'dec-3',
    physician_name: 'Dr. Christopher Palmer, MD',
    specialty: 'Oncology',
    institution: 'Baylor Scott & White Medical Center',
    territory: 'Territory South - Texas',
    decile: 9,
    monthly_call_target: 3,
    actual_calls_mtd: 3,
    coverage_status: 'ON_TRACK',
    last_visited_date: '2026-10-25',
    primary_product: 'OncoTarget-700 (Zenocamtinib)',
  },
  {
    id: 'dec-4',
    physician_name: 'Dr. Raymond Zhao, MD',
    specialty: 'Neurology',
    institution: 'Houston Methodist Neurological Institute',
    territory: 'Territory South - Texas',
    decile: 8,
    monthly_call_target: 2,
    actual_calls_mtd: 0,
    coverage_status: 'UNDER_CALLED',
    last_visited_date: '2026-09-28',
    primary_product: 'NeuroShield-IV (Cerebrolysin-X)',
  },
  {
    id: 'dec-5',
    physician_name: 'Dr. Sandra Bell, MD',
    specialty: 'Endocrinology',
    institution: 'Vanderbilt University Medical Center',
    territory: 'Territory Southeast',
    decile: 7,
    monthly_call_target: 2,
    actual_calls_mtd: 2,
    coverage_status: 'ON_TRACK',
    last_visited_date: '2026-10-20',
    primary_product: 'CardioVas-XR (Vasocordin ER)',
  },
];

export const initialNextBestActions: NextBestAction[] = [
  {
    id: 'nba-1',
    physician_name: 'Dr. Kimberly Adams, MD',
    institution: 'Scripps Memorial Hospital La Jolla',
    specialty: 'Cardiology',
    product_name: 'CardioVas-XR',
    trigger_source: 'Adverse Event Inquiry',
    recommended_action: 'Dispatch Dose Titration & Tolerability Clinical Monograph',
    suggested_channel: 'Approved Rep Email',
    impact_priority: 'HIGH',
    status: 'ACTIVE',
    rationale: 'Doctor queried starter titration tolerability 2 days ago. Sending clinical protocol mitigates delay in patient initiations.',
    created_at: '2026-10-28T08:30:00Z',
  },
  {
    id: 'nba-2',
    physician_name: 'Dr. Raymond Zhao, MD',
    institution: 'Houston Methodist Neurological Institute',
    specialty: 'Neurology',
    product_name: 'NeuroShield-IV',
    trigger_source: 'High Decile Inactivity',
    recommended_action: 'Schedule In-Person Detailing on Blood-Brain Barrier Penetration',
    suggested_channel: 'In-Person Detailing',
    impact_priority: 'HIGH',
    status: 'ACTIVE',
    rationale: 'Decile 8 prescriber has 0 visits recorded this month. Priority territory gap.',
    created_at: '2026-10-29T06:00:00Z',
  },
  {
    id: 'nba-3',
    physician_name: 'Dr. Christopher Palmer, MD',
    institution: 'Baylor Scott & White Medical Center',
    specialty: 'Oncology',
    product_name: 'OncoTarget-700',
    trigger_source: 'Email Engagement',
    recommended_action: 'Deliver physical reprint of Nature Cryo-EM 1.84Å Selectivity publication',
    suggested_channel: 'Clinical Reprint Dispatch',
    impact_priority: 'MEDIUM',
    status: 'ACTIVE',
    rationale: 'Prescriber opened ASCO electronic summary 3 times; requested hard-copy journal reprint.',
    created_at: '2026-10-27T15:20:00Z',
  },
  {
    id: 'nba-4',
    physician_name: 'Dr. Gregory House, MD',
    institution: 'St. Jude Metropolitan Medical Center',
    specialty: 'Oncology',
    product_name: 'OncoTarget-700',
    trigger_source: 'P&T Review Delayed',
    recommended_action: 'Offer Medical Director Consultation with MSL Dr. Aris Thorne',
    suggested_channel: 'MSL Scientific Handoff',
    impact_priority: 'OPPORTUNITY',
    status: 'ACTIVE',
    rationale: 'Hospital P&T meeting scheduled for next month. Connecting pharmacy chair with MSL expedites tier placement.',
    created_at: '2026-10-26T12:00:00Z',
  },
];

export const initialSpeakerEvents: SpeakerBureauEvent[] = [
  {
    id: 'spk-1',
    event_title: 'Overcoming Resistance in EGFR Exon-20 NSCLC: A Multidisciplinary Dinner Symposium',
    event_type: 'Dinner Symposium',
    speaker_hcp_name: 'Dr. Christopher Palmer, MD',
    therapeutic_area: 'Precision Oncology',
    venue_name: 'The Capital Grille - Dallas Uptown',
    event_date: '2026-11-18',
    target_attendance: 18,
    confirmed_rsvps: 14,
    honorarium_fee: 2500,
    compliance_approval: 'APPROVED',
    event_status: 'UPCOMING',
  },
  {
    id: 'spk-2',
    event_title: 'Next-Generation Dual Modulation in Resistant HFpEF: Clinical Outcomes from PRESERVE-HF',
    event_type: 'Grand Rounds Lecture',
    speaker_hcp_name: 'Dr. Kimberly Adams, MD',
    therapeutic_area: 'Cardiovascular Care',
    venue_name: 'Scripps Memorial Hospital Grand Auditorium',
    event_date: '2026-11-24',
    target_attendance: 30,
    confirmed_rsvps: 22,
    honorarium_fee: 3000,
    compliance_approval: 'APPROVED',
    event_status: 'UPCOMING',
  },
];

export const initialBattlecards: CompetitiveBattlecard[] = [
  {
    id: 'bat-1',
    competitor_product: 'Amivantamab (Rybrevant) & Mobocertinib',
    competitor_maker: 'Janssen / Takeda',
    accord_counterpart: 'OncoTarget-700 (Zenocamtinib)',
    indication: 'Refractory EGFR Exon-20 Insertion NSCLC',
    accord_clinical_advantage:
      'Once-daily oral capsule (vs 4-hour IV infusion with 68% infusion-reaction rate). Median PFS of 21.8 months vs 8.3 months historical standard.',
    primary_objection: 'Physicians familiar with standard IV chemotherapy premedication protocols.',
    recommended_counter:
      'Highlight out-of-hospital oral convenience, 92.4% dose retention, and superior blood-brain barrier CNS lesion control.',
    displaced_accounts_count: 14,
    hospital_market_share_pct: 38,
  },
  {
    id: 'bat-2',
    competitor_product: 'Sacubitril/Valsartan (Entresto) + Generic ARB',
    competitor_maker: 'Novartis',
    accord_counterpart: 'CardioVas-XR (Vasocordin ER)',
    indication: 'Resistant Hypertension with Concomitant HFpEF',
    accord_clinical_advantage:
      'Dual Endothelin-A receptor blockade prevents ETA vasoconstriction while preserving ANP without precipitating symptomatic hypotension in preserved EF patients.',
    primary_objection: 'Generic ARBs are already Tier 1 formulary on hospital drug lists.',
    recommended_counter:
      'Present PRESERVE-HF trial demonstrating 42% lower risk of 30-day heart failure hospitalization ($1.06M net hospital budget savings).',
    displaced_accounts_count: 22,
    hospital_market_share_pct: 44,
  },
];

export const initialColdChainSensors: ColdChainSensorReading[] = [
  {
    id: 'sens-1',
    sensor_uuid: 'BLE-IOT-TX01',
    rep_name: 'David Chen',
    trunk_unit_id: 'Trunk Refrigerator #03 (Dallas)',
    monitored_product: 'OncoTarget-700 & Immunex-Alpha Starter Packs',
    current_temp_celsius: 4.2,
    min_temp_24h: 3.1,
    max_temp_24h: 5.8,
    battery_pct: 88,
    status: 'OPTIMAL_2_8C',
    last_ping_at: '2026-10-29T14:30:00Z',
  },
  {
    id: 'sens-2',
    sensor_uuid: 'BLE-IOT-CA02',
    rep_name: 'Marcus Vance',
    trunk_unit_id: 'Mobile Cooler Unit #01 (Los Angeles)',
    monitored_product: 'NeuroShield-IV Clinical Starter Vials',
    current_temp_celsius: 4.8,
    min_temp_24h: 3.4,
    max_temp_24h: 6.1,
    battery_pct: 94,
    status: 'OPTIMAL_2_8C',
    last_ping_at: '2026-10-29T14:35:00Z',
  },
  {
    id: 'sens-3',
    sensor_uuid: 'BLE-IOT-NY03',
    rep_name: 'Sarah Jenkins',
    trunk_unit_id: 'Trunk Refrigerator #04 (New York)',
    monitored_product: 'Immunex-Alpha Autoinjector Kits',
    current_temp_celsius: 7.6,
    min_temp_24h: 4.0,
    max_temp_24h: 7.9,
    battery_pct: 76,
    status: 'OPTIMAL_2_8C',
    last_ping_at: '2026-10-29T14:40:00Z',
  },
];

// Persistent Global Store (Singleton across Next.js server runtime)
class PharmaDataStore {
  accounts: Account[] = [...initialAccounts];
  hcps: HealthcareProfessional[] = [...initialHCPs];
  detailingProducts: DetailingProduct[] = [...initialDetailingProducts];
  formularies: HospitalFormularyItem[] = [...initialFormularies];
  orders: CommercialOrder[] = [...initialOrders];
  activities: SalesActivity[] = [...initialActivities];
  tasks: CRMTask[] = [...initialTasks];
  leads: Lead[] = [...initialLeads];
  opportunities: Opportunity[] = [...initialOpportunities];
  inventory: InventoryItem[] = [...initialInventory];
  proposals: Proposal[] = [...initialProposals];
  tenders: Tender[] = [...initialTenders];
  notifications: NotificationItem[] = [...initialNotifications];
  samples: SampleItem[] = [...initialSampleItems];
  sampleDispensations: SampleDispensation[] = [...initialSampleDispensations];
  budgetScenarios: BudgetImpactScenario[] = [...initialBudgetScenarios];
  medicalInfoRequests: MedicalInfoRequest[] = [...initialMedicalInfoRequests];
  sunshineRecords: SunshinePaymentRecord[] = [...initialSunshineRecords];
  dailyCallPlans: DailyCallPlan[] = [...initialDailyCallPlans];
  slideEngagementMetrics: SlideEngagementMetric[] = [...initialSlideEngagementMetrics];
  hubCases: PatientHubCase[] = [...initialHubCases];
  decileTargets: PrescriberDecileTarget[] = [...initialDecileTargets];
  nextBestActions: NextBestAction[] = [...initialNextBestActions];
  speakerEvents: SpeakerBureauEvent[] = [...initialSpeakerEvents];
  battlecards: CompetitiveBattlecard[] = [...initialBattlecards];
  coldChainSensors: ColdChainSensorReading[] = [...initialColdChainSensors];

  // Leads
  getLeads() {
    return this.leads;
  }
  getLead(id: string) {
    return this.leads.find((l) => l.id === id);
  }
  addLead(lead: Omit<Lead, 'id' | 'created_at'>) {
    const newLead: Lead = {
      ...lead,
      id: `ld-${Date.now()}`,
      created_at: new Date().toISOString(),
      notes: lead.notes || [],
      conversations: lead.conversations || [],
      meetings: lead.meetings || [],
      qualification_score: lead.qualification_score || 25,
      qualification_details: lead.qualification_details || {
        prescribing_authority: false,
        active_patient_volume: false,
        budget_readiness: false,
        formulary_alignment: false,
      },
    };
    this.leads.unshift(newLead);
    return newLead;
  }
  updateLead(id: string, patch: Partial<Lead>) {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch);
    return lead;
  }
  assignLeadRep(id: string, rep_name: string, rep_id?: string) {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.assigned_rep = rep_name;
    if (rep_id) lead.assigned_rep_id = rep_id;
    return lead;
  }
  addLeadNote(id: string, text: string, author: string = 'Current Specialist') {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    if (!lead.notes) lead.notes = [];
    const note: LeadNote = {
      id: `not-${Date.now()}`,
      text,
      author,
      created_at: new Date().toISOString(),
    };
    lead.notes.unshift(note);
    return note;
  }
  addLeadConversation(
    id: string,
    convo: Omit<LeadConversation, 'id' | 'occurred_at'> & { occurred_at?: string }
  ) {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    if (!lead.conversations) lead.conversations = [];
    const newConvo: LeadConversation = {
      ...convo,
      id: `cnv-${Date.now()}`,
      occurred_at: convo.occurred_at || new Date().toISOString(),
    };
    lead.conversations.unshift(newConvo);
    if (lead.status === 'new') {
      lead.status = 'contacted';
    }
    return newConvo;
  }
  addLeadMeeting(id: string, meeting: Omit<LeadMeeting, 'id'>) {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    if (!lead.meetings) lead.meetings = [];
    const newMeeting: LeadMeeting = {
      ...meeting,
      id: `mtg-${Date.now()}`,
    };
    lead.meetings.unshift(newMeeting);
    return newMeeting;
  }
  qualifyLead(id: string, details: NonNullable<Lead['qualification_details']>) {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.qualification_details = details;
    let score = 0;
    if (details.prescribing_authority) score += 30;
    if (details.active_patient_volume) score += 25;
    if (details.budget_readiness) score += 25;
    if (details.formulary_alignment) score += 20;
    lead.qualification_score = score;
    if (score >= 70 && lead.status !== 'converted') {
      lead.status = 'qualified';
    } else if (score < 50 && lead.status === 'qualified') {
      lead.status = 'contacted';
    }
    return lead;
  }
  convertLeadToOpportunity(
    leadId: string,
    params: {
      deal_name: string;
      estimated_value: number;
      expected_close_date: string;
      target_product: string;
      rep_name: string;
    }
  ) {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return null;

    lead.status = 'converted';
    const oppId = `opp-${Date.now()}`;
    lead.converted_opportunity_id = oppId;

    const newOpp: Opportunity = {
      id: oppId,
      name: params.deal_name,
      account_id: `acc-${Date.now()}`,
      account_name: lead.institution,
      stage: 'QUALIFICATION',
      estimated_value: params.estimated_value,
      probability: 65,
      expected_close_date: params.expected_close_date,
      product_name: params.target_product,
      rep_name: params.rep_name || lead.assigned_rep || 'Marcus Vance',
      created_at: new Date().toISOString(),
    };
    this.opportunities.unshift(newOpp);

    // Also register in Healthcare Professionals directory if not already there
    const existingHcp = this.hcps.find((h) => h.full_name === lead.full_name);
    if (!existingHcp) {
      this.hcps.unshift({
        id: `hcp-${Date.now()}`,
        account_id: newOpp.account_id,
        account_name: lead.institution,
        full_name: lead.full_name,
        title: lead.title,
        specialty: lead.specialty,
        license_number: `MD-${Math.floor(100000 + Math.random() * 900000)}`,
        prescribing_tier: 'Tier 1 (High Decile)',
        kol_status: true,
        email: lead.email,
        phone: lead.phone,
        country: 'United States',
        territory: lead.territory,
        interactions_count: (lead.conversations?.length || 0) + (lead.meetings?.length || 0),
        status: 'ACTIVE',
      });
    }

    return { lead, opportunity: newOpp };
  }

  // Opportunities / Pipeline
  getOpportunities() {
    return this.opportunities;
  }
  addOpportunity(opp: Omit<Opportunity, 'id' | 'created_at'>) {
    const newOpp: Opportunity = {
      ...opp,
      id: `opp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.opportunities.unshift(newOpp);
    return newOpp;
  }
  updateOpportunityStage(id: string, stage: Opportunity['stage']) {
    const opp = this.opportunities.find((o) => o.id === id);
    if (opp) {
      opp.stage = stage;
      return opp;
    }
    return null;
  }

  // Inventory
  getInventory() {
    return this.inventory;
  }

  // Proposals
  getProposals() {
    return this.proposals;
  }

  // Tenders
  getTenders() {
    return this.tenders;
  }

  // Notifications
  getNotifications() {
    return this.notifications;
  }
  markNotificationRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    return notif;
  }

  // Accounts
  getAccounts() {
    return this.accounts;
  }
  getAccount(id: string) {
    return this.accounts.find((a) => a.id === id);
  }
  addAccount(acc: Account) {
    this.accounts.unshift(acc);
    return acc;
  }

  // HCPs
  getHCPs() {
    return this.hcps;
  }
  getHCP(id: string) {
    return this.hcps.find((h) => h.id === id);
  }
  addHCP(hcp: Omit<HealthcareProfessional, 'id' | 'interactions_count' | 'status'>) {
    const newHCP: HealthcareProfessional = {
      ...hcp,
      id: `hcp-${Date.now()}`,
      interactions_count: 0,
      status: 'ACTIVE',
    };
    this.hcps.unshift(newHCP);
    return newHCP;
  }
  updateHCP(id: string, patch: Partial<HealthcareProfessional>) {
    const idx = this.hcps.findIndex((h) => h.id === id);
    if (idx !== -1) {
      this.hcps[idx] = { ...this.hcps[idx], ...patch };
      return this.hcps[idx];
    }
    return null;
  }

  // Detailing Products & Sessions
  getDetailingProducts() {
    return this.detailingProducts;
  }
  logDetailingSession(params: {
    contact_id: string;
    account_id: string;
    product_name: string;
    duration_seconds: number;
    sentiment: 'very_receptive' | 'neutral' | 'skeptical';
    objections: string[];
    sample_units_requested: number;
    notes?: string;
  }) {
    const contact = this.getHCP(params.contact_id);
    const account = this.getAccount(params.account_id);

    const activity: SalesActivity = {
      id: `act-${Date.now()}`,
      account_id: params.account_id,
      contact_id: params.contact_id,
      activity_type: 'detailing',
      purpose: `${params.product_name} Clinical e-Detailing Presentation (${Math.round(params.duration_seconds / 60)} min)`,
      sentiment: params.sentiment,
      outcome: `Prescriber sentiment: ${params.sentiment}. Objections noted: ${
        params.objections.length ? params.objections.join(', ') : 'None'
      }. Samples requested: ${params.sample_units_requested} units. ${params.notes || ''}`,
      occurred_at: new Date().toISOString(),
      rep_name: 'Marcus Vance',
    };
    this.activities.unshift(activity);

    // Update contact stats
    if (contact) {
      contact.interactions_count += 1;
      contact.last_interaction_at = activity.occurred_at;
    }

    // Auto-create CRM task if samples requested or follow-up needed
    let createdTask: CRMTask | null = null;
    if (params.sample_units_requested > 0 || params.objections.length > 0) {
      createdTask = {
        id: `tsk-${Date.now()}`,
        title: `Follow-up: Deliver ${params.sample_units_requested} ${params.product_name} titration units to ${
          contact?.full_name || 'Prescriber'
        }`,
        account_id: params.account_id,
        account_name: account?.name || 'Account',
        due_at: new Date(Date.now() + 5 * 86400000).toISOString(),
        priority: 'high',
        status: 'pending',
        assigned_to: 'Marcus Vance',
      };
      this.tasks.unshift(createdTask);
    }

    return { activity, task: createdTask };
  }

  // Formularies
  getFormularies() {
    return this.formularies;
  }
  getAccountFormularies(accountId: string) {
    return this.formularies.filter((f) => f.account_id === accountId);
  }
  updateFormulary(id: string, patch: Partial<HospitalFormularyItem>) {
    const idx = this.formularies.findIndex((f) => f.id === id);
    if (idx !== -1) {
      this.formularies[idx] = { ...this.formularies[idx], ...patch, updated_at: new Date().toISOString() };
      return this.formularies[idx];
    }
    return null;
  }

  // Orders
  getOrders() {
    return this.orders;
  }
  createOrder(order: Omit<CommercialOrder, 'id' | 'order_number' | 'created_at'>) {
    const newOrder: CommercialOrder = {
      ...order,
      id: `ord-${Date.now()}`,
      order_number: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    // Update account invoiced total
    const acc = this.getAccount(order.account_id);
    if (acc) {
      acc.total_invoiced += order.total_price;
    }

    return newOrder;
  }

  // Tasks
  getTasks() {
    return this.tasks;
  }
  completeTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = 'completed';
    }
    return task;
  }

  // 1. Samples & PDMA
  getSampleItems() {
    return this.samples;
  }
  getSampleDispensations() {
    return this.sampleDispensations;
  }
  dispenseSample(disp: Omit<SampleDispensation, 'id' | 'dispensed_at'>) {
    const newDisp: SampleDispensation = {
      ...disp,
      id: `dsp-${Date.now()}`,
      dispensed_at: new Date().toISOString(),
    };
    this.sampleDispensations.unshift(newDisp);

    // Deduct trunk stock
    const item = this.samples.find(
      (s) => s.product_name.includes(disp.product_name) || s.lot_number === disp.lot_number
    );
    if (item) {
      item.trunk_stock = Math.max(0, item.trunk_stock - disp.quantity);
    }
    return newDisp;
  }

  // 2. Hospital P&T Budget Impact Modeler
  getBudgetScenarios() {
    return this.budgetScenarios;
  }
  addBudgetScenario(scenario: Omit<BudgetImpactScenario, 'id' | 'created_at'>) {
    const newScen: BudgetImpactScenario = {
      ...scenario,
      id: `bim-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.budgetScenarios.unshift(newScen);
    return newScen;
  }

  // 3. Medical Information Requests (MIR) / MSL Handoff
  getMedicalInfoRequests() {
    return this.medicalInfoRequests;
  }
  addMedicalInfoRequest(req: Omit<MedicalInfoRequest, 'id' | 'request_number' | 'created_at'>) {
    const newReq: MedicalInfoRequest = {
      ...req,
      id: `mir-${Date.now()}`,
      request_number: `MIR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
    };
    this.medicalInfoRequests.unshift(newReq);
    return newReq;
  }
  updateMIRStatus(
    id: string,
    status: MedicalInfoRequest['status'],
    assigned_msl?: string,
    msl_response_summary?: string
  ) {
    const mir = this.medicalInfoRequests.find((m) => m.id === id);
    if (mir) {
      mir.status = status;
      if (assigned_msl) mir.assigned_msl = assigned_msl;
      if (msl_response_summary) mir.msl_response_summary = msl_response_summary;
      if (status === 'FULFILLED') mir.closed_at = new Date().toISOString();
      return mir;
    }
    return null;
  }

  // 4. Sunshine Act & KOL Spend
  getSunshineRecords() {
    return this.sunshineRecords;
  }
  addSunshineRecord(rec: Omit<SunshinePaymentRecord, 'id'>) {
    const newRec: SunshinePaymentRecord = {
      ...rec,
      id: `sun-${Date.now()}`,
    };
    this.sunshineRecords.unshift(newRec);
    return newRec;
  }

  // 5. Daily Call Planner
  getDailyCallPlans(date?: string) {
    if (date) {
      return this.dailyCallPlans.filter((p) => p.date === date);
    }
    return this.dailyCallPlans;
  }
  updateDailyCallPlan(id: string, patch: Partial<DailyCallPlan>) {
    const plan = this.dailyCallPlans.find((p) => p.id === id);
    if (plan) {
      Object.assign(plan, patch);
      return plan;
    }
    return null;
  }
  addDailyCallPlan(plan: Omit<DailyCallPlan, 'id'>) {
    const newPlan: DailyCallPlan = {
      ...plan,
      id: `dcp-${Date.now()}`,
    };
    this.dailyCallPlans.push(newPlan);
    return newPlan;
  }

  // 6. CLM & Slide Analytics
  getSlideEngagementMetrics() {
    return this.slideEngagementMetrics;
  }

  // 7. Patient Access, Hub Services & Copay Assistance
  getHubCases() {
    return this.hubCases;
  }
  updateHubCaseStatus(id: string, status: PatientHubCase['prior_auth_status']) {
    const c = this.hubCases.find((item) => item.id === id);
    if (c) {
      c.prior_auth_status = status;
      c.updated_at = new Date().toISOString();
      return c;
    }
    return null;
  }
  addHubCase(caseData: Omit<PatientHubCase, 'id' | 'case_number' | 'created_at' | 'updated_at'>) {
    const newCase: PatientHubCase = {
      ...caseData,
      id: `hub-${Date.now()}`,
      case_number: `HUB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.hubCases.unshift(newCase);
    return newCase;
  }

  // 8. Prescriber Decile Matrix & R&F Optimizer
  getDecileTargets() {
    return this.decileTargets;
  }
  logDecileCall(id: string) {
    const target = this.decileTargets.find((t) => t.id === id);
    if (target) {
      target.actual_calls_mtd += 1;
      target.last_visited_date = new Date().toISOString().split('T')[0];
      if (target.actual_calls_mtd >= target.monthly_call_target) {
        target.coverage_status = 'ON_TRACK';
      }
      return target;
    }
    return null;
  }

  // 9. Omnichannel Next-Best-Action (NBA) Engine
  getNextBestActions() {
    return this.nextBestActions;
  }
  acceptNextBestAction(id: string) {
    const nba = this.nextBestActions.find((n) => n.id === id);
    if (nba) {
      nba.status = 'ACCEPTED';
      return nba;
    }
    return null;
  }
  dismissNextBestAction(id: string) {
    const nba = this.nextBestActions.find((n) => n.id === id);
    if (nba) {
      nba.status = 'DISMISSED';
      return nba;
    }
    return null;
  }

  // 10. Speaker Bureau & Medical Symposium Manager
  getSpeakerEvents() {
    return this.speakerEvents;
  }
  addSpeakerEvent(evt: Omit<SpeakerBureauEvent, 'id'>) {
    const newEvt: SpeakerBureauEvent = {
      ...evt,
      id: `spk-${Date.now()}`,
    };
    this.speakerEvents.unshift(newEvt);
    return newEvt;
  }

  // 11. Competitive Intelligence & Brand Switch Radar
  getCompetitiveBattlecards() {
    return this.battlecards;
  }

  // 12. Cold-Chain IoT Fleet & Trunk Stock Telemetry
  getColdChainSensors() {
    return this.coldChainSensors;
  }
  quarantineColdChainUnit(id: string) {
    const sensor = this.coldChainSensors.find((s) => s.id === id);
    if (sensor) {
      sensor.status = 'QUARANTINED';
      return sensor;
    }
    return null;
  }
}

// Global singleton to survive Next.js dev reloads
const globalStore = global as unknown as { __pharmaStore?: PharmaDataStore };
export const db = globalStore.__pharmaStore || new PharmaDataStore();
if (process.env.NODE_ENV !== 'production') {
  globalStore.__pharmaStore = db;
}
