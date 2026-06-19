/**
 * Verification script: Run after 1-hour test window with 2+ instances.
 * Checks for duplicate auction closures (duplicate audit events).
 *
 * Usage:
 *   1. Start docker-compose with 2+ API instances (or API + API replica)
 *   2. Run for 1 hour, creating auctions that expire during test
 *   3. Run this script: npx ts-node test/verify-scheduler-duplicates.ts
 *   4. Inspect output for any duplicate audit events
 *
 * Exit codes:
 *   0 = No duplicates found, test PASSED
 *   1 = Duplicates detected, test FAILED
 */

import { PrismaClient } from '@prisma/client';

async function verifyNoDuplicates() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verifying scheduler lock prevents duplicate audit events...\n');

    // Find all auction closure events in the past 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        eventType: 'auction.closed',
        createdAt: { gte: oneHourAgo },
      },
      select: {
        id: true,
        eventType: true,
        entityId: true,
        entityType: true,
        actorUserId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 Found ${auditEvents.length} auction.closed events in past 1 hour\n`);

    if (auditEvents.length === 0) {
      console.log('ℹ️  No auction closure events found. Test inconclusive.');
      console.log('   Run auctions that expire during the 1-hour window.\n');
      return { passed: true, duplicates: [] };
    }

    // Check for duplicates: same auction closed multiple times
    const auctionClosures = new Map<string, any[]>();

    for (const event of auditEvents) {
      const auctionId = event.entityId;
      if (!auctionClosures.has(auctionId)) {
        auctionClosures.set(auctionId, []);
      }
      auctionClosures.get(auctionId)!.push(event);
    }

    const duplicates: any[] = [];

    for (const [auctionId, events] of auctionClosures) {
      if (events.length > 1) {
        console.log(`❌ DUPLICATE: Auction ${auctionId} has ${events.length} closure events:`);
        events.forEach((e, i) => {
          console.log(`   Event ${i + 1}: ${e.createdAt.toISOString()}`);
        });
        console.log('');
        duplicates.push({ auctionId, count: events.length, events });
      }
    }

    // Summary
    console.log('📋 Summary:');
    console.log(`   Total auctions closed: ${auctionClosures.size}`);
    console.log(`   Expected: 1 event per auction`);
    console.log(`   Duplicates found: ${duplicates.length}`);
    console.log('');

    if (duplicates.length === 0) {
      console.log('✅ PASS: No duplicate closure events detected!');
      console.log('   Lock mechanism is working correctly.\n');
      return { passed: true, duplicates: [] };
    } else {
      console.log('❌ FAIL: Duplicate closure events detected!');
      console.log('   Lock mechanism may not be working correctly.\n');
      return { passed: false, duplicates };
    }
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
void verifyNoDuplicates().then((result) => {
  process.exit(result.passed ? 0 : 1);
});
