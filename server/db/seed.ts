import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  console.log('[Seed] Starting database seed...');

  // Hash password for all users
  const defaultPassword = 'TraceSecure2026!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Users
  const users = [
    {
      id: 'USR-REV-01',
      name: 'Dr. Arvind Deshmukh',
      role: 'authorized_reviewer',
      roleLabel: 'Authorized Reviewer / Verifier',
      title: 'Senior Scrutiny Lead — Technical Education Cell',
      organization: 'TRACE Regulatory Scrutiny Panel',
      email: 'arvind.deshmukh@trace-scrutiny.demo.in',
      badgeCode: 'REV-LEAD-01',
      permissionsDescription:
        'Authorized to inspect evidence, confirm/correct OCR fields, create & assign corrective tasks, resolve findings, and transition workflow stages.',
      passwordHash,
    },
    {
      id: 'USR-ICO-01',
      name: 'Prof. Meera Krishnan',
      role: 'institution_compliance_officer',
      roleLabel: 'Institution Compliance Officer',
      title: 'Dean of Regulatory Compliance & Nodal Officer',
      organization: 'Vidyapeeth Institute of Engineering & Pharmaceutical Sciences (VIEPS)',
      institutionId: 'INST-VIEPS-01',
      email: 'meera.krishnan@vieps-tech.demo.edu',
      badgeCode: 'ICO-VIEPS',
      permissionsDescription:
        'Authorized to prepare intake checklists, upload remediation documents, respond to deficiency tasks, and run pre-submission validation.',
      passwordHash,
    },
    {
      id: 'USR-IAD-01',
      name: 'Dr. S. Raghavan',
      role: 'institution_administrator',
      roleLabel: 'Institution Administrator',
      title: 'Principal & Head of Institution',
      organization: 'Vidyapeeth Institute of Engineering & Pharmaceutical Sciences (VIEPS)',
      institutionId: 'INST-VIEPS-01',
      email: 'principal@vieps-tech.demo.edu',
      badgeCode: 'IAD-VIEPS',
      permissionsDescription:
        'Authorized to manage institutional registry profile, authorize formal application submissions, and assign internal compliance owners.',
      passwordHash,
    },
    {
      id: 'USR-SYS-01',
      name: 'Rajeshwari Nair',
      role: 'regulatory_system_administrator',
      roleLabel: 'Regulatory System Administrator',
      title: 'Director — Digital Policy & Rulebook Governance',
      organization: 'TRACE Policy & Systems Directorate',
      email: 'rajeshwari.nair@trace-policy.demo.in',
      badgeCode: 'SYS-ADMIN',
      permissionsDescription:
        'Authorized to manage rulebook editions, publish approved rule-set versions, configure workflow stages, and administer roles.',
      passwordHash,
    },
    {
      id: 'USR-AUD-01',
      name: 'Vikramaditya Sen',
      role: 'auditor',
      roleLabel: 'Auditor',
      title: 'Principal Oversight Auditor',
      organization: 'Independent Regulatory Quality Audit Cell',
      email: 'v.sen@audit-oversight.demo.in',
      badgeCode: 'AUD-CELL',
      permissionsDescription:
        'Read-only access across all applications, Evidence-to-Action chains, rule versions, and immutable audit trail records.',
      passwordHash,
    },
  ];

  // 2. Institutions
  const institutions = [
    {
      id: 'INST-VIEPS-01',
      name: 'Vidyapeeth Institute of Engineering & Pharmaceutical Sciences (VIEPS)',
      code: 'SYN-INST-2014-88421',
      type: 'Private Self-Financed',
      region: 'Western Region (Maharashtra)',
      address: 'Plot 14, Knowledge Corridor, Hinjawadi Phase III, Pune 411057',
      establishedYear: 2014,
      accreditationStatus: 'NBA Accredited (Valid through June 2027)',
      contactEmail: 'meera.krishnan@vieps-tech.demo.edu',
      contactPhone: '+91-20-4009-8821',
    },
    {
      id: 'INST-KCE-02',
      name: 'Kaveri College of Autonomous Engineering & Robotics',
      code: 'SYN-INST-2009-33109',
      type: 'State Government Autonomous',
      region: 'South-Western Region (Karnataka)',
      address: 'Sector 7, Institutional Ring Road, Mysuru 570018',
      establishedYear: 2009,
      accreditationStatus: 'NBA Accredited / NAAC A+',
      contactEmail: 'registrar@kaveri-eng.demo.edu',
      contactPhone: '+91-821-249-1102',
    },
    {
      id: 'INST-NITS-03',
      name: 'Nalanda Institute of Technical & Management Studies',
      code: 'SYN-INST-2018-61904',
      type: 'Private Self-Financed',
      region: 'South-Central Region (Telangana)',
      address: 'Survey 92, Medchal Tech Park Road, Hyderabad 501401',
      establishedYear: 2018,
      accreditationStatus: 'Provisional Approval Active',
      contactEmail: 'compliance@nalanda-tech.demo.edu',
      contactPhone: '+91-40-2319-7740',
    },
  ];

  // 3. RuleSets & Regulatory Sources
  const ruleSets = [
    {
      id: 'RS-APH-2026-V2',
      title: 'AICTE Approval Process Handbook (APH 2026-27)',
      code: 'APH-2026-27-V2',
      edition: 'Edition 2026-27',
      academicYear: '2026-27',
      version: 'v2.0 (Published)',
      status: 'Published',
      description: 'Official statutory guidelines governing Technical Education approval, intake expansion, and norms.',
      publishedAt: new Date('2026-01-15T00:00:00Z'),
      publishedBy: 'Rajeshwari Nair (Regulatory System Admin)',
      publishedNote: 'Ratified by AICTE Executive Council Notification No. F.AICTE/AB/APH/2026-27.',
    },
    {
      id: 'RS-APH-2026-V1',
      title: 'AICTE Approval Process Handbook (APH 2026-27 Draft)',
      code: 'APH-2026-27-V1',
      edition: 'Edition 2026-27 Draft',
      academicYear: '2026-27',
      version: 'v1.0 (Superseded)',
      status: 'Superseded',
      description: 'Draft consultative version published for public review.',
      publishedAt: new Date('2025-11-01T00:00:00Z'),
      publishedBy: 'System Administrator',
      publishedNote: 'Superseded by ratified Version 2.0.',
    },
  ];

  const regulatorySources = [
    {
      id: 'SRC-APH-2026',
      title: 'Approval Process Handbook 2026-27 Official Gazette',
      publicationCode: 'AICTE-APH-2026-PUB',
      edition: '2026-27',
      academicYear: '2026-27',
      authority: 'All India Council for Technical Education (AICTE), New Delhi',
      sourceUrl: 'https://www.aicte-india.org/bureaus/approval/handbook-2026',
      publicationDate: new Date('2026-01-10T00:00:00Z'),
      status: 'Official Published',
      effectiveFrom: new Date('2026-02-01T00:00:00Z'),
      effectiveTo: new Date('2027-06-30T00:00:00Z'),
    },
  ];

  const regulatoryClauses = [
    {
      id: 'APH-2026-CL-4.2.b',
      sourceId: 'SRC-APH-2026',
      ruleSetId: 'RS-APH-2026-V2',
      clauseNumber: 'Clause 4.2(b)',
      title: 'Cutoff Date for Instructional Building Readiness & Commissioning',
      excerpt:
        'All physical laboratory and instructional infrastructure for the academic year 2026-27 must be completed, inspected, and certified by an authorized structural engineer on or before 30-Jun-2026. Any post-dated completion is deemed deficient.',
      fullText:
        'Clause 4.2(b): For any institution applying for Increase in Intake or New Technical Program, the building completion certificate and structural stability certificate issued by a registered municipal or town planning engineer must attest physical readiness achieved no later than June 30 of the admission calendar year. Post-dated handovers violate mandatory intake readiness.',
      pageReference: 'Page 54, Chapter IV',
      category: 'Infrastructure Readiness',
      applicability: 'Increase in Intake, New Technical Program',
      isMandatory: true,
      penaltyDescription: 'Rejection of intake increase or deficiency notice issued with 14-day remediation window.',
      remediationGuidance:
        'Submit a revised engineer stability certificate reflecting actual ready-for-possession date on or prior to 30-Jun-2026 with corroborating municipal occupancy permit.',
    },
    {
      id: 'APH-2026-CL-4.1.a',
      sourceId: 'SRC-APH-2026',
      ruleSetId: 'RS-APH-2026-V2',
      clauseNumber: 'Clause 4.1(a)',
      title: 'Minimum Built-up Carpet Area for Engineering & Technology Intake',
      excerpt:
        'Institutions operating undergraduate Engineering programs must maintain a minimum instructional carpet area of 3,150 Sq.m for an intake of up to 240 students, plus dedicated AI & data laboratory space of 600 Sq.m.',
      fullText:
        'Clause 4.1(a): Norms for Instructional Area. The carpet area for classrooms, tutorial rooms, laboratories, and workshops must satisfy the prescribed scale per student seat. For intake tier 240, minimum 3,150 Sq.m exclusive instructional carpet area is mandatory.',
      pageReference: 'Page 48, Chapter IV',
      category: 'Infrastructure Norms',
      applicability: 'All Technical Programs',
      isMandatory: true,
      penaltyDescription: 'Proportional reduction of sanctioned intake.',
      remediationGuidance: 'Allocate and certify additional carpet area verified by a licensed architect.',
    },
    {
      id: 'APH-2026-CL-7.4',
      sourceId: 'SRC-APH-2026',
      ruleSetId: 'RS-APH-2026-V2',
      clauseNumber: 'Clause 7.4',
      title: 'Fire Safety Certificate & Municipal No Objection Certificate (NOC)',
      excerpt:
        'Every institution must hold a valid, non-expired Fire Safety Certificate issued by the competent State Fire Rescue Services covering all instructional and residential wings.',
      fullText:
        'Clause 7.4: Fire and Life Safety. The Fire Safety NOC must remain valid through the entire academic year. Expired certificates or certificates omitting high-risk research wings trigger immediate suspension of intake scrutiny until renewed.',
      pageReference: 'Page 79, Chapter VII',
      category: 'Safety & Statutory NOC',
      applicability: 'All Institutions',
      isMandatory: true,
      penaltyDescription: 'Immediate freezing of application review.',
      remediationGuidance: 'Upload valid Fire Safety Renewal Certificate or valid extension endorsement.',
    },
    {
      id: 'APH-2026-CL-8.2',
      sourceId: 'SRC-APH-2026',
      ruleSetId: 'RS-APH-2026-V2',
      clauseNumber: 'Clause 8.2',
      title: 'Joint Fixed Deposit Receipt (FDR) / Security Deposit Authentication',
      excerpt:
        'Institutions must establish and maintain an unencumbered Joint Fixed Deposit Receipt in the joint names of the Trust/Society and Regional Officer, AICTE, authenticated directly with the issuing scheduled commercial bank.',
      fullText:
        'Clause 8.2: Financial Security Deposit. The deposit must be in an approved scheduled bank with auto-renewal endorsement. Automated confirmation from the branch manager or manual independent treasury verification is required.',
      pageReference: 'Page 91, Chapter VIII',
      category: 'Financial Assurance',
      applicability: 'All Private Institutions',
      isMandatory: true,
      penaltyDescription: 'Non-issuance of Extension of Approval.',
      remediationGuidance: 'Submit bank confirmation letter countersigned by Branch Head.',
    },
    {
      id: 'APH-2026-CL-5.3',
      sourceId: 'SRC-APH-2026',
      ruleSetId: 'RS-APH-2026-V2',
      clauseNumber: 'Clause 5.3',
      title: 'Faculty-to-Student Cadre Ratio & Cadre Balance Norms',
      excerpt:
        'Undergraduate Engineering programs must maintain a minimum Teacher-Student Ratio of 1:20 (1:15 for NBA accredited departments) with cadre proportion 1:2:6 for Professor, Associate Professor, and Assistant Professor.',
      fullText:
        'Clause 5.3: Faculty Norms. Cadre deficiency in the Professor category exceeding 50% constitutes a major deficiency notice under scrutiny regulations.',
      pageReference: 'Page 62, Chapter V',
      category: 'Faculty Cadre Norms',
      applicability: 'All Technical Programs',
      isMandatory: true,
      penaltyDescription: 'Reduction of 25% intake capacity.',
      remediationGuidance: 'Submit appointment orders of approved Senior Professors or formal Board advertisement notice.',
    },
  ];

  // 4. Applications
  const applications = [
    {
      id: 'APP-2026-0842',
      code: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      category: 'Increase in Intake',
      academicYear: '2026-27',
      programName: 'B.Tech — Computer Science & Engineering (AI & Data Engineering)',
      requestedIntake: 240,
      currentIntake: 180,
      ruleSetId: 'RS-APH-2026-V2',
      currentStage: 'Corrections required',
      officialOutcome: 'Not yet issued (Internal workflow active)',
      submittedAt: new Date('2026-10-08T09:30:00Z'),
      lastEvaluatedAt: new Date('2026-10-21T08:15:00Z'),
    },
    {
      id: 'APP-2026-0891',
      code: 'APP-2026-0891',
      institutionId: 'INST-VIEPS-01',
      category: 'New Technical Program',
      academicYear: '2026-27',
      programName: 'M.Tech — Semiconductor Packaging & Microelectronics',
      requestedIntake: 30,
      currentIntake: 0,
      ruleSetId: 'RS-APH-2026-V2',
      currentStage: 'Awaiting additional evidence',
      officialOutcome: 'Not yet issued (Internal workflow active)',
      submittedAt: new Date('2026-10-10T11:00:00Z'),
      lastEvaluatedAt: new Date('2026-10-19T16:40:00Z'),
    },
    {
      id: 'APP-2026-0904',
      code: 'APP-2026-0904',
      institutionId: 'INST-VIEPS-01',
      category: 'Extension of Approval (EoA)',
      academicYear: '2026-27',
      programName: 'B.Pharm — Pharmaceutical Sciences (Annual EoA Renewal)',
      requestedIntake: 100,
      currentIntake: 100,
      ruleSetId: 'RS-APH-2026-V2',
      currentStage: 'Under review',
      officialOutcome: 'Not yet issued (Internal workflow active)',
      submittedAt: new Date('2026-10-14T10:15:00Z'),
      lastEvaluatedAt: new Date('2026-10-20T12:10:00Z'),
    },
    {
      id: 'APP-2026-0775',
      code: 'APP-2026-0775',
      institutionId: 'INST-KCE-02',
      category: 'Extension of Approval (EoA)',
      academicYear: '2026-27',
      programName: 'B.Tech — Robotics & Cyber-Physical Systems',
      requestedIntake: 120,
      currentIntake: 120,
      ruleSetId: 'RS-APH-2026-V2',
      currentStage: 'Review completed',
      officialOutcome: 'EoA Recommended by Scrutiny Committee',
      submittedAt: new Date('2026-10-01T08:00:00Z'),
      lastEvaluatedAt: new Date('2026-10-18T17:00:00Z'),
    },
    {
      id: 'APP-2026-0819',
      code: 'APP-2026-0819',
      institutionId: 'INST-NITS-03',
      category: 'Extension of Approval (EoA)',
      academicYear: '2026-27',
      programName: 'B.Tech — Electrical & EV Mobility Engineering',
      requestedIntake: 60,
      currentIntake: 60,
      ruleSetId: 'RS-APH-2026-V2',
      currentStage: 'Corrections required',
      officialOutcome: 'Deficiency Notice Issued',
      submittedAt: new Date('2026-09-29T09:00:00Z'),
      lastEvaluatedAt: new Date('2026-10-17T15:30:00Z'),
    },
  ];

  // 5. Documents
  const documents = [
    {
      id: 'DOC-2026-101',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      title: 'Building Completion & Structural Stability Certificate (Block-C AI Lab Wing)',
      category: 'Infrastructure',
      fileType: 'PDF',
      fileName: 'VIEPS_BlockC_Structural_Completion_v1.pdf',
      fileSize: '2.4 MB',
      sha256: '8f94e2c17643bda65721e48f0293da82c5f609e7c3b281f692049b0a7d2',
      uploadedBy: 'Prof. Meera Krishnan',
      expiryDate: new Date('2031-03-31T00:00:00Z'),
      currentVersion: 'v1.0',
      requiredByClauseId: 'APH-2026-CL-4.2.b',
      isMandatory: true,
      validationState: 'Mismatch detected',
      ocrConfidenceAvg: 98.4,
      crossDocConsistency: 'Potential inconsistency detected',
      integrityScreening: 'Signature & hash structure intact',
      issuerVerification: 'Registry reference format matched (Not issuer-authenticated)',
      ruleEvaluation: 'Deficiency triggered',
      humanReviewOutcome: 'Unreviewed',
      recommendedNextAction: 'Resolve cross-document completion date mismatch with Sworn Affidavit',
    },
    {
      id: 'DOC-2026-102',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      title: 'Sworn Affidavit of Head of Institution on Land & Building Possession',
      category: 'Legal & Affidavit',
      fileType: 'PDF',
      fileName: 'VIEPS_Head_Sworn_Affidavit_2026.pdf',
      fileSize: '1.8 MB',
      sha256: '3a71b402e887fc19d45e098a72b0124ca6e9871034f590bc987109247ab1e56',
      uploadedBy: 'Dr. S. Raghavan',
      expiryDate: new Date('2027-06-30T00:00:00Z'),
      currentVersion: 'v1.0',
      requiredByClauseId: 'APH-2026-CL-4.2.b',
      isMandatory: true,
      validationState: 'Validated',
      ocrConfidenceAvg: 99.1,
      crossDocConsistency: 'Potential inconsistency detected',
      integrityScreening: 'Signature & hash structure intact',
      issuerVerification: 'Registry reference format matched (Not issuer-authenticated)',
      ruleEvaluation: 'Criteria satisfied',
      humanReviewOutcome: 'Confirmed by reviewer',
      recommendedNextAction: 'Counterpart document DOC-2026-101 requires date correction',
    },
    {
      id: 'DOC-2026-103',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      title: 'Fire Safety Certificate & Comprehensive NOC Renewal',
      category: 'Safety & NOC',
      fileType: 'PDF',
      fileName: 'VIEPS_Fire_Safety_NOC_2026_27.pdf',
      fileSize: '3.1 MB',
      sha256: 'e5b72109cf89a42b1097e3a89012f45cb8921a437890e12b76901f4a9812e65',
      uploadedBy: 'Prof. Meera Krishnan',
      expiryDate: new Date('2027-04-15T00:00:00Z'),
      currentVersion: 'v1.0',
      requiredByClauseId: 'APH-2026-CL-7.4',
      isMandatory: true,
      validationState: 'Validated',
      ocrConfidenceAvg: 97.8,
      crossDocConsistency: 'Consistent across records',
      integrityScreening: 'Signature & hash structure intact',
      issuerVerification: 'Confirmed via issuing authority record',
      ruleEvaluation: 'Criteria satisfied',
      humanReviewOutcome: 'Confirmed by reviewer',
      recommendedNextAction: 'NOC active through April 2027',
    },
    {
      id: 'DOC-2026-201',
      applicationId: 'APP-2026-0891',
      institutionId: 'INST-VIEPS-01',
      title: 'Cleanroom Semiconductor Lab Environmental & Safety Annex-B',
      category: 'Safety & NOC',
      fileType: 'PDF',
      fileName: 'VIEPS_Cleanroom_Fire_NOC_Draft.pdf',
      fileSize: '1.2 MB',
      sha256: '772189a0bc43f1092e8812c45ab89012fae459012b678120e981245fa0192bc',
      uploadedBy: 'Prof. Meera Krishnan',
      currentVersion: 'v1.0',
      requiredByClauseId: 'APH-2026-CL-7.4',
      isMandatory: true,
      validationState: 'Missing information',
      ocrConfidenceAvg: 92.5,
      crossDocConsistency: 'Missing counterpart document',
      integrityScreening: 'Unsigned scan — structure intact',
      issuerVerification: 'Pending external authority confirmation',
      ruleEvaluation: 'Deficiency triggered',
      humanReviewOutcome: 'Correction requested',
      recommendedNextAction: 'Upload certified final Annex-B issued by Municipal Fire Rescue Authority',
    },
    {
      id: 'DOC-2026-301',
      applicationId: 'APP-2026-0904',
      institutionId: 'INST-VIEPS-01',
      title: 'Joint Fixed Deposit Receipt (FDR) Certificate — SBI Treasury Branch',
      category: 'Financial',
      fileType: 'PDF',
      fileName: 'VIEPS_Joint_FDR_Certificate_SBI.pdf',
      fileSize: '1.9 MB',
      sha256: '990145fa82104bc12e98710fa4521098cb9812fa45e09812bc890124fe0912a',
      uploadedBy: 'Dr. S. Raghavan',
      expiryDate: new Date('2034-03-31T00:00:00Z'),
      currentVersion: 'v1.0',
      requiredByClauseId: 'APH-2026-CL-8.2',
      isMandatory: true,
      validationState: 'Verification pending',
      ocrConfidenceAvg: 99.5,
      crossDocConsistency: 'Consistent across records',
      integrityScreening: 'Signature & hash structure intact',
      issuerVerification: 'Pending external authority confirmation',
      ruleEvaluation: 'Conditional — requires physical scrutiny',
      humanReviewOutcome: 'Unreviewed',
      recommendedNextAction: 'Complete manual independent issuer confirmation with SBI Treasury Branch',
    },
  ];

  // 6. Findings
  const findings = [
    {
      id: 'FIND-2026-0042',
      title: 'Block-C Completion Date Mismatch: Conflicts with Cutoff & Affidavit',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      requirementId: 'REQ-INFRA-READY-2026',
      requirementTitle: 'Mandatory Completion & Readiness of Instructional Facilities by 30-Jun-2026',
      ruleSetId: 'RS-APH-2026-V2',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      academicYear: '2026-27',
      clauseId: 'APH-2026-CL-4.2.b',
      clauseNumber: 'Clause 4.2(b)',
      clauseExcerpt:
        'All physical laboratory and instructional infrastructure must be completed, inspected, and certified on or before 30-Jun-2026. Any post-dated completion is deemed deficient.',
      sourceDocumentTitle: 'AICTE Approval Process Handbook 2026-27 Official Gazette',
      sourcePageRef: 'Page 54, Chapter IV',
      documentId: 'DOC-2026-101',
      documentTitle: 'Building Completion & Structural Stability Certificate (Block-C AI Lab Wing)',
      pageNumber: 2,
      boundingBoxId: 'BBOX-101-P2-DATE',
      fieldId: 'FLD-101-02',
      fieldKey: 'handover_completion_date',
      fieldLabel: 'Final Handover / Commissioning Completion Date',
      extractedValue: '14-Aug-2026',
      expectedValue: 'On or before 30-Jun-2026 (Per Clause 4.2.b) and matching Affidavit (01-May-2026)',
      discrepancyNote:
        'Building Completion Certificate records handover completion on 14-Aug-2026, which is 45 days past the mandatory regulatory cutoff (30-Jun-2026) and directly contradicts the sworn affidavit declaring 01-May-2026.',
      severity: 'Critical',
      lifecycleStatus: 'Task Assigned',
      assignedTaskId: 'TSK-2026-0842',
    },
    {
      id: 'FIND-2026-0089',
      title: 'Missing Fire Safety Annex-B for Cleanroom High-Temperature Wing',
      applicationId: 'APP-2026-0891',
      institutionId: 'INST-VIEPS-01',
      requirementId: 'REQ-FIRE-NOC-2026',
      requirementTitle: 'Unbroken Fire Safety NOC Coverage for All Specialized Instructional Wings',
      ruleSetId: 'RS-APH-2026-V2',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      academicYear: '2026-27',
      clauseId: 'APH-2026-CL-7.4',
      clauseNumber: 'Clause 7.4',
      clauseExcerpt: 'Every institution must hold a valid, non-expired Fire Safety Certificate covering all wings.',
      sourceDocumentTitle: 'AICTE Approval Process Handbook 2026-27 Official Gazette',
      sourcePageRef: 'Page 79, Chapter VII',
      documentId: 'DOC-2026-201',
      documentTitle: 'Cleanroom Semiconductor Lab Environmental & Safety Annex-B',
      pageNumber: 1,
      severity: 'Critical',
      lifecycleStatus: 'Task Assigned',
      assignedTaskId: 'TSK-2026-0891',
      discrepancyNote: 'Draft certificate uploaded without municipal seal or fire station commanding officer endorsement.',
    },
    {
      id: 'FIND-2026-0094',
      title: 'Awaiting Independent State Bank Treasury Issuer Confirmation for Joint FDR',
      applicationId: 'APP-2026-0904',
      institutionId: 'INST-VIEPS-01',
      requirementId: 'REQ-FDR-AUTH-2026',
      requirementTitle: 'Independent Commercial Bank Treasury Verification of Joint Security FDR',
      ruleSetId: 'RS-APH-2026-V2',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      academicYear: '2026-27',
      clauseId: 'APH-2026-CL-8.2',
      clauseNumber: 'Clause 8.2',
      clauseExcerpt: 'Institutions must maintain an authenticated Joint Fixed Deposit Receipt with AICTE Regional Officer.',
      sourceDocumentTitle: 'AICTE Approval Process Handbook 2026-27 Official Gazette',
      sourcePageRef: 'Page 91, Chapter VIII',
      documentId: 'DOC-2026-301',
      documentTitle: 'Joint Fixed Deposit Receipt (FDR) Certificate — SBI Treasury Branch',
      pageNumber: 1,
      severity: 'Moderate',
      lifecycleStatus: 'Open',
      discrepancyNote:
        'Cryptographic hash and registry format intact, but external banking API query timed out. Requires manual reviewer follow-up.',
    },
  ];

  // 7. Tasks
  const tasks = [
    {
      id: 'TSK-2026-0842',
      findingId: 'FIND-2026-0042',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      taskCode: 'TSK-2026-0842',
      title: 'Upload Corrected Structural Completion Certificate with Reconciled Date',
      description:
        'Obtain revised endorsement from licensed structural engineer Er. Kulkarni confirming physical lab readiness on or prior to 30-Jun-2026, matching the sworn affidavit.',
      assigneeName: 'Prof. Meera Krishnan',
      assigneeRole: 'institution_compliance_officer',
      priority: 'Urgent',
      status: 'Open',
      dueDate: new Date('2026-10-25T18:00:00Z'),
      requiredAction:
        'Submit corrected PDF version v2.0 and run automated re-validation to demonstrate resolution of FIND-2026-0042.',
    },
    {
      id: 'TSK-2026-0891',
      findingId: 'FIND-2026-0089',
      applicationId: 'APP-2026-0891',
      institutionId: 'INST-VIEPS-01',
      taskCode: 'TSK-2026-0891',
      title: 'Obtain & Upload Municipal Fire Rescue NOC Annex-B for Cleanroom Wing',
      description:
        'Submit the signed and sealed Fire Safety NOC Annex-B covering the High-Temperature Cleanroom Wing from Pune Municipal Fire Department.',
      assigneeName: 'Prof. Meera Krishnan',
      assigneeRole: 'institution_compliance_officer',
      priority: 'High',
      status: 'Open',
      dueDate: new Date('2026-10-27T18:00:00Z'),
      requiredAction: 'Upload certified municipal Fire NOC Annex-B and link to APP-2026-0891.',
    },
  ];

  // 8. Obligations
  const obligations = [
    {
      id: 'OBL-2026-01',
      title: 'Annual Comprehensive Fire Safety Audit & Equipment Servicing Report',
      institutionId: 'INST-VIEPS-01',
      applicationId: 'APP-2026-0842',
      clauseId: 'APH-2026-CL-7.4',
      clauseNumber: 'Clause 7.4',
      regulationRef: 'AICTE APH 2026-27 Chapter VII Norms',
      academicYear: '2026-27',
      category: 'Safety & NOC',
      dueDate: new Date('2026-11-15T00:00:00Z'),
      frequency: 'Annual',
      status: 'Upcoming',
      evidenceRequired: 'Fire Department Servicing Logbook and Refill Slips',
      penaltyRisk: 'Withdrawal of Scrutiny Clearance',
    },
    {
      id: 'OBL-2026-02',
      title: 'Mandatory Anti-Ragging Sworn Affidavits (100% Student & Parent Enrolment)',
      institutionId: 'INST-VIEPS-01',
      applicationId: 'APP-2026-0842',
      clauseId: 'APH-2026-CL-4.2.b',
      clauseNumber: 'Clause 9.1',
      regulationRef: 'UGC & AICTE Anti-Ragging Directives 2009 / 2026',
      academicYear: '2026-27',
      category: 'Student Welfare & Governance',
      dueDate: new Date('2026-10-31T00:00:00Z'),
      frequency: 'Semester Intake',
      status: 'Upcoming',
      evidenceRequired: 'National Anti-Ragging Portal Registry Download Receipt',
      penaltyRisk: 'Notice of Non-Compliance',
    },
  ];

  // 9. Alerts
  const alerts = [
    {
      id: 'ALT-2026-01',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      code: 'ALT-DISCREPANCY-0842',
      type: 'DISCREPANCY_FLAG',
      severity: 'Critical',
      title: 'Cross-Document Date Conflict on Block-C Completion Certificate',
      message:
        'Building Completion Certificate date (14-Aug-2026) exceeds regulatory cutoff (30-Jun-2026) and conflicts with Affidavit (01-May-2026). Task TSK-2026-0842 dispatched.',
      sourceClauseId: 'APH-2026-CL-4.2.b',
      targetRole: 'institution_compliance_officer',
      triggeredAt: new Date('2026-10-12T14:20:00Z'),
      acknowledged: false,
      channels: JSON.stringify([
        { channel: 'IN_APP', status: 'DELIVERED', timestamp: '2026-10-12T14:20:01Z' },
        { channel: 'EMAIL', status: 'PENDING_CONFIG', timestamp: '2026-10-12T14:20:02Z', note: 'SMTP unconfigured' },
      ]),
    },
    {
      id: 'ALT-2026-02',
      applicationId: 'APP-2026-0891',
      institutionId: 'INST-VIEPS-01',
      code: 'ALT-MISSING-DOC-0891',
      type: 'MISSING_EVIDENCE',
      severity: 'Major',
      title: 'Mandatory Fire Safety Annex-B Missing for Cleanroom Wing',
      message: 'New Technical Program application requires certified Fire NOC Annex-B. Submission deadline approaching.',
      sourceClauseId: 'APH-2026-CL-7.4',
      targetRole: 'institution_compliance_officer',
      triggeredAt: new Date('2026-10-14T09:10:00Z'),
      acknowledged: false,
      channels: JSON.stringify([
        { channel: 'IN_APP', status: 'DELIVERED', timestamp: '2026-10-14T09:10:01Z' },
      ]),
    },
  ];

  // 10. Audit Events
  const auditEvents = [
    {
      id: 'AUD-001',
      actorId: 'USR-ICO-01',
      actorName: 'Prof. Meera Krishnan',
      actorRole: 'institution_compliance_officer',
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: 'APP-2026-0842',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      newState: 'Validation in progress',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      evidenceReference: 'DOC-2026-101, DOC-2026-102, DOC-2026-103',
      outcome: 'Success',
      timestamp: new Date('2026-10-08T09:30:00Z'),
    },
    {
      id: 'AUD-002',
      actorId: 'USR-SYS-01',
      actorName: 'TRACE Automated Screening Engine',
      actorRole: 'regulatory_system_administrator',
      action: 'DOCUMENT_VALIDATION_COMPLETED',
      entityType: 'Document',
      entityId: 'DOC-2026-101',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      previousState: 'Needs manual review',
      newState: 'Mismatch detected',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      evidenceReference: 'APH-2026-CL-4.2.b; SHA256: 8f94e2c1...',
      outcome: 'FindingCreated',
      timestamp: new Date('2026-10-12T14:20:00Z'),
    },
    {
      id: 'AUD-003',
      actorId: 'USR-REV-01',
      actorName: 'Dr. Arvind Deshmukh',
      actorRole: 'authorized_reviewer',
      action: 'TASK_ASSIGNED',
      entityType: 'CorrectiveTask',
      entityId: 'TSK-2026-0842',
      applicationId: 'APP-2026-0842',
      institutionId: 'INST-VIEPS-01',
      newState: 'Open',
      ruleVersion: 'APH 2026-27 v2.0 (Published)',
      evidenceReference: 'FIND-2026-0042',
      outcome: 'Success',
      timestamp: new Date('2026-10-12T15:00:00Z'),
    },
  ];

  // Execute clean seeding in transaction
  console.log('[Seed] Seeding institutions...');
  for (const inst of institutions) {
    await prisma.institution.upsert({
      where: { id: inst.id },
      update: inst,
      create: inst,
    });
  }

  console.log('[Seed] Seeding users...');
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: u,
      create: u,
    });
  }

  console.log('[Seed] Seeding ruleSets and regulatory sources...');
  for (const rs of ruleSets) {
    await prisma.ruleSet.upsert({
      where: { id: rs.id },
      update: rs,
      create: rs,
    });
  }

  for (const src of regulatorySources) {
    await prisma.regulatorySource.upsert({
      where: { id: src.id },
      update: src,
      create: src,
    });
  }

  for (const clause of regulatoryClauses) {
    await prisma.regulatoryClause.upsert({
      where: { id: clause.id },
      update: clause,
      create: clause,
    });
  }

  console.log('[Seed] Seeding applications...');
  for (const app of applications) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: app,
      create: app,
    });
  }

  console.log('[Seed] Seeding documents...');
  for (const doc of documents) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: doc,
      create: doc,
    });
  }

  console.log('[Seed] Seeding findings...');
  for (const f of findings) {
    await prisma.complianceFinding.upsert({
      where: { id: f.id },
      update: f,
      create: f,
    });
  }

  console.log('[Seed] Seeding tasks...');
  for (const t of tasks) {
    await prisma.correctiveTask.upsert({
      where: { id: t.id },
      update: t,
      create: t,
    });
  }

  console.log('[Seed] Seeding obligations...');
  for (const o of obligations) {
    await prisma.complianceObligation.upsert({
      where: { id: o.id },
      update: o,
      create: o,
    });
  }

  console.log('[Seed] Seeding alerts...');
  for (const a of alerts) {
    await prisma.alert.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  console.log('[Seed] Seeding audit events...');
  for (const aud of auditEvents) {
    await prisma.auditEvent.upsert({
      where: { id: aud.id },
      update: aud,
      create: aud,
    });
  }

  console.log('[Seed] Seeding SystemSetting & Control Center configuration...');
  await prisma.systemSetting.upsert({
    where: { id: 'CURRENT' },
    update: {},
    create: {
      id: 'CURRENT',
      appName: 'TRACE — Regulatory Assurance & Compliance Engine',
      environmentLabel: 'Production GovTech (Statutory AY 2026-27)',
      defaultAcademicYear: '2026-27',
      defaultLanguage: 'en-IN',
      timezone: 'Asia/Kolkata',
      maxUploadSizeBytes: 26214400, // 25 MB
      maxPagesPerDoc: 50,
      allowedDocFormats: JSON.stringify(['PDF', 'PNG', 'JPEG', 'TIFF']),
      docProcessingTimeoutSeconds: 60,
      documentRetentionDays: 1825, // 5 statutory cycles
      maintenanceMode: false,
      ocrLanguages: JSON.stringify(['eng', 'hin']),
      ocrTimeoutSeconds: 45,
      renderDpi: 200,
      batchSize: 4,
      maxConcurrentJobs: 2,
      retryPolicyMaxRetries: 2,
      cacheEnabled: true,
      cacheInvalidationPolicy: 'On Document Remediated',
      runOptionalMlAnalysis: true,
      reminderLeadDays: 7,
      escalationIntervalHours: 48,
      notificationRetryLimit: 3,
      processingJobRetentionDays: 90,
      auditLogRetentionDays: 3650, // 10 Years Legal Hold
      updatedBy: 'USR-SYS-01',
      version: 1,
    },
  });

  console.log('[Seed] Seeding ML/DL model registry...');
  const initialModels = [
    {
      id: 'doc-layout-cnn',
      name: 'DocumentLayoutCNN',
      purpose: 'Visual layout density classification, seal/signature region detection & structural page categorization',
      modelType: 'DL (PyTorch CNN)',
      currentVersion: 'v2.1',
      availableVersionsJson: JSON.stringify(['v2.0', 'v2.1']),
      artifactPath: 'fastapi_engine/models/document_layout_cnn.pt',
      artifactSizeBytes: 2203032,
      isEnabled: true,
      status: 'Available',
      trainingStatus: 'Trained',
      lastTrainedAt: new Date('2026-10-22T10:05:38Z'),
      datasetName: 'AICTE-DocLayout-Corpus',
      datasetVersion: 'v2.0',
      metricsJson: JSON.stringify({
        accuracy: 0.998,
        precision: 0.998,
        recall: 0.997,
        f1: 0.997,
        testLoss: 0.0124,
      }),
      inferenceThreshold: 0.85,
      timeoutSeconds: 30,
      lastInferenceAt: new Date(),
      avgLatencyMs: 14.2,
      evaluationReportJson: JSON.stringify({
        classes: ['Certificate/NOC', 'Sworn Affidavit', 'Financial FDR', 'Architectural Site Plan'],
        perClassF1: [0.998, 0.996, 0.999, 0.995],
        evaluatedSamples: 400,
        testedHardware: 'NVIDIA GeForce RTX 5060 Laptop GPU',
      }),
      previousVersion: 'v2.0',
      previousMetricsJson: JSON.stringify({
        accuracy: 0.984,
        precision: 0.982,
        recall: 0.985,
        f1: 0.983,
      }),
    },
    {
      id: 'compliance-risk-gbdt',
      name: 'ComplianceRiskGBDT',
      purpose: 'Multi-parameter non-conformance risk vector scoring & scrutiny prioritization',
      modelType: 'ML (Gradient Boosting Decision Trees)',
      currentVersion: 'v1.8',
      availableVersionsJson: JSON.stringify(['v1.7', 'v1.8']),
      artifactPath: 'fastapi_engine/models/compliance_risk_gbdt.joblib',
      artifactSizeBytes: 660137,
      isEnabled: true,
      status: 'Available',
      trainingStatus: 'Trained',
      lastTrainedAt: new Date('2026-10-22T10:05:40Z'),
      datasetName: 'APH-RiskVector-ScrutinyDB',
      datasetVersion: 'v1.8',
      metricsJson: JSON.stringify({
        accuracy: 0.999,
        precision: 0.999,
        recall: 0.998,
        f1: 0.998,
        aucRoc: 0.9994,
      }),
      inferenceThreshold: 0.75,
      timeoutSeconds: 15,
      lastInferenceAt: new Date(),
      avgLatencyMs: 4.8,
      evaluationReportJson: JSON.stringify({
        classes: ['Low Risk (Expedited)', 'Moderate Risk (Standard)', 'High Risk (Urgent/Critical)'],
        perClassF1: [0.999, 0.998, 0.998],
        evaluatedSamples: 1000,
        testedHardware: 'Host CPU Multi-Threaded / sklearn GBDT',
      }),
      previousVersion: 'v1.7',
      previousMetricsJson: JSON.stringify({
        accuracy: 0.981,
        precision: 0.979,
        recall: 0.982,
        f1: 0.98,
      }),
    },
  ];

  for (const m of initialModels) {
    await prisma.mlModelRecord.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  console.log('[Seed] Seeding allowlisted dataset manifests...');
  const datasets = [
    {
      id: 'dataset-doclayout-v2',
      name: 'AICTE Gazette & Layout Training Corpus',
      source: 'Internal Statutory Archive & Technical Gazette Repository (Allowlisted)',
      version: 'v2.0',
      licenseStatus: 'Government Open Data License (GODL-India)',
      sizeBytes: 18454912,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      trainSamples: 2000,
      valSamples: 400,
      testSamples: 200,
      isAllowlisted: true,
      isDownloaded: true,
      localPath: 'fastapi_engine/datasets/doclayout_v2',
    },
    {
      id: 'dataset-riskvector-v1',
      name: 'Technical Education Scrutiny Risk Corpus',
      source: 'State Directorate of Technical Education Historic Scrutiny Data (Allowlisted)',
      version: 'v1.8',
      licenseStatus: 'Statutory Restricted Regulatory License',
      sizeBytes: 8388608,
      checksumSha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      trainSamples: 5000,
      valSamples: 1000,
      testSamples: 500,
      isAllowlisted: true,
      isDownloaded: true,
      localPath: 'fastapi_engine/datasets/riskvector_v1',
    },
  ];

  for (const ds of datasets) {
    await prisma.datasetManifest.upsert({
      where: { id: ds.id },
      update: ds,
      create: ds,
    });
  }

  console.log('[Seed] Seeding initial configuration audit event...');
  await prisma.configAuditEvent.create({
    data: {
      section: 'General',
      action: 'INITIAL_BOOTSTRAP',
      details: 'System configuration and ML model registry initialized to statutory defaults for AY 2026-27.',
      actorId: 'USR-SYS-01',
      actorName: 'Rajeshwari Nair',
      actorRole: 'regulatory_system_administrator',
      ipAddress: '127.0.0.1',
      newValueJson: JSON.stringify({ version: 1, environment: 'Production GovTech' }),
    },
  });

  console.log('[Seed] Database seeded successfully!');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[Seed Error]:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
