import { prisma } from '../server/db/prisma';
import { INITIAL_TRACE_STORE } from '../src/tests/fixtures/demo-data';

async function main() {
  console.log('[Seed Pages] Seeding document pages into PostgreSQL...');
  let pagesInserted = 0;

  const dbDocs = await prisma.document.findMany({ select: { id: true } });
  const existingDocIds = new Set(dbDocs.map((d) => d.id));

  for (const doc of INITIAL_TRACE_STORE.documents) {
    if (!existingDocIds.has(doc.id)) continue;
    if (doc.pages && Array.isArray(doc.pages)) {
      for (const p of doc.pages) {
        const existing = await prisma.documentPage.findFirst({
          where: { documentId: doc.id, pageNumber: p.pageNumber },
        });

        if (!existing) {
          await prisma.documentPage.create({
            data: {
              documentId: doc.id,
              pageNumber: p.pageNumber,
              title: p.title || `Document Page ${p.pageNumber}`,
              headerAuthority: p.headerAuthority || 'Competent Regulatory Authority',
              certificateNumber: p.certificateNumber || `SYN-REF-${doc.id}`,
              issueDate: p.issueDate || '2026-04-28',
              bodyLines: JSON.stringify(p.bodyLines || []),
              stampText: p.stampText || 'OFFICIAL RECORD',
              signatory: p.signatory || 'Authorized Signatory',
            },
          });
          pagesInserted++;
        }
      }
    }
  }

  console.log(`[Seed Pages] Successfully seeded ${pagesInserted} document pages.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
