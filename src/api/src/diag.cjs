const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.create({ data: {
    email: `diag-${Date.now()}@ironloot.test`, username: `diag-${Date.now()}`, passwordHash: 'x' } });
  await p.wallet.createMany({ data: [{ userId: u.id, balance: 0, heldFunds: 0, isActive: true }], skipDuplicates: true });

  const dep = async (amount, ref) => p.$transaction(async (tx) => {
    const w = await tx.wallet.findUniqueOrThrow({ where: { userId: u.id } });
    const nb = Number(w.balance) + amount;
    await tx.ledger.create({ data: { walletId: w.id, type: 'DEPOSIT', amount,
      balanceBefore: w.balance, balanceAfter: nb, referenceId: ref, referenceType: 'PAYMENT',
      description: 'diag' } });
    await tx.wallet.update({ where: { id: w.id }, data: { balance: nb } });
    return nb;
  });

  const r = await Promise.allSettled([dep(100, `diag-a-${Date.now()}`), dep(250, `diag-b-${Date.now()}`)]);
  console.log('ESTADOS:', r.map(x => x.status + (x.status === 'rejected' ? ' -> ' + String(x.reason).split('\n')[0] : ' -> ' + x.value)).join(' | '));
  const w = await p.wallet.findUnique({ where: { userId: u.id } });
  const l = await p.ledger.count({ where: { walletId: w.id } });
  console.log('SALDO FINAL:', String(w.balance), ' ASIENTOS:', l, ' ESPERADO: 350 / 2');
  await p.ledger.deleteMany({ where: { walletId: w.id } });
  await p.wallet.delete({ where: { id: w.id } });
  await p.user.delete({ where: { id: u.id } });
  await p.$disconnect();
})();
