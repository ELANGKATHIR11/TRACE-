import { Router } from 'express';
import { prisma } from '../db/prisma';

export const analyticsRouter = Router();

analyticsRouter.get('/', async (_req, res) => {
  try {
    const totalApps = await prisma.application.count();
    const stageGroups = await prisma.application.groupBy({
      by: ['currentStage'],
      _count: true,
    });

    const activeFindings = await prisma.complianceFinding.findMany({
      where: { lifecycleStatus: { not: 'Resolved' } },
    });

    const findingsBySeverity = {
      Critical: activeFindings.filter((f) => f.severity === 'Critical').length,
      Major: activeFindings.filter((f) => f.severity === 'Major').length,
      Moderate: activeFindings.filter((f) => f.severity === 'Moderate').length,
      Observation: activeFindings.filter((f) => f.severity === 'Observation').length,
    };

    const overdueTasks = await prisma.correctiveTask.count({
      where: {
        status: { not: 'Completed' },
        dueDate: { lt: new Date() },
      },
    });

    const upcomingObligations = await prisma.complianceObligation.count({
      where: {
        status: { in: ['Upcoming', 'Awaiting evidence', 'Under remediation', 'Overdue'] },
      },
    });

    const stageDistribution = stageGroups.map((g) => ({
      stage: g.currentStage,
      count: g._count,
    }));

    res.json({
      metrics: {
        totalApplications: totalApps,
        activeFindingsCount: activeFindings.length,
        criticalFindingsCount: findingsBySeverity.Critical,
        overdueTasksCount: overdueTasks,
        upcomingObligationsCount: upcomingObligations,
        findingsBySeverity,
        stageDistribution,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute analytics', detail: error?.message });
  }
});
