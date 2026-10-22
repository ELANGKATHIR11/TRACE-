const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const [apps, docs, rules, findings] = await Promise.all([
    prisma.application.count(),
    prisma.document.count(),
    prisma.ruleSet.count(),
    prisma.complianceFinding.count(),
  ]);
  console.log({ apps, docs, rules, findings });
  const sampleApps = await prisma.application.findMany({ select: { id: true, code: true, programName: true, currentStage: true } });
  console.log('Sample applications:', sampleApps);
  await prisma.$disconnect();
}

inspect();
