import { Router } from 'express';
import { prisma } from '../db/prisma';
import { assertTenantAccess } from '../middleware/auth';

export const institutionsRouter = Router();

institutionsRouter.get('/', async (_req, res) => {
  try {
    const institutions = await prisma.institution.findMany({
      include: {
        applications: true,
        findings: {
          where: { lifecycleStatus: { not: 'Resolved' } },
        },
        obligations: {
          where: { status: { in: ['Upcoming', 'Awaiting evidence', 'Under remediation', 'Overdue'] } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = institutions.map((inst) => {
      return {
        id: inst.id,
        name: inst.name,
        permanentId: inst.code,
        type: inst.type,
        state: inst.region.split('(')[1]?.replace(')', '') || 'Maharashtra',
        city: inst.address.includes('Pune') ? 'Pune' : inst.address.includes('Mysuru') ? 'Mysuru' : 'Hyderabad',
        address: inst.address,
        establishedYear: inst.establishedYear,
        campusAreaAcres: 12.4,
        builtUpAreaSqm: 28450,
        applicableCategories: [
          'Extension of Approval (EoA)',
          'Increase in Intake',
          'New Technical Program',
        ],
        programs: [
          {
            id: 'PRG-01',
            name: 'B.Tech — Computer Science & Engineering (AI & Data Engineering)',
            level: 'UG (B.Tech / B.Pharm)',
            sanctionedIntake: 180,
            facultyCount: 14,
            accreditationStatus: inst.accreditationStatus,
          },
        ],
        complianceContacts: [
          {
            name: 'Prof. Meera Krishnan',
            designation: 'Dean of Regulatory Compliance',
            role: 'Primary Nodal Officer',
            email: inst.contactEmail,
            phone: inst.contactPhone,
          },
        ],
        openFindingsCount: inst.findings.length,
        upcomingObligationsCount: inst.obligations.length,
        checklistCompletionPct: inst.findings.length === 0 ? 100 : 82,
      };
    });

    res.json({ institutions: enriched });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch institutions', detail: error?.message });
  }
});

institutionsRouter.get('/:id', async (req, res) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: {
        applications: true,
        documents: true,
        findings: true,
        tasks: true,
        obligations: true,
      },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    if (!assertTenantAccess(req, res, institution.id, 'institution profile')) {
      return;
    }

    res.json({ institution });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch institution', detail: error?.message });
  }
});
