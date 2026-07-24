import { PrismaClient } from '@prisma/client';

// PT-043 (AUD-017): minimal idempotent seed so `npm run db:seed` works (previously there was no
// seed script and `prisma.seed` config, so the command failed). Extend with test fixtures as needed.
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding IronLoot database…');

  // Ensure a default GLOBAL platform commission config exists (10%).
  const existing = await prisma.commissionConfig.findFirst({ where: { type: 'GLOBAL' } });
  if (!existing) {
    await prisma.commissionConfig.create({
      data: { type: 'GLOBAL', ratePercent: 10, updatedBy: 'seed' },
    });
    console.log('  + default GLOBAL commission config (10%)');
  } else {
    console.log('  = GLOBAL commission config already present');
  }

  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
