const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/billing — all charges across all patients
router.get('/all', async (req, res) => {
  const { status } = req.query;
  const charges = await prisma.charge.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
    },
  });
  res.json(charges);
});

// GET /api/billing/summary
router.get('/summary', async (req, res) => {
  const [paid, pending, denied] = await Promise.all([
    prisma.charge.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'paid' } }),
    prisma.charge.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'pending' } }),
    prisma.charge.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'denied' } }),
  ]);

  res.json({
    paid: { total: paid._sum.amount || 0, count: paid._count },
    pending: { total: pending._sum.amount || 0, count: pending._count },
    denied: { total: denied._sum.amount || 0, count: denied._count },
  });
});

// GET /api/patients/:patientId/billing
router.get('/', async (req, res) => {
  const { patientId } = req.params;
  const charges = await prisma.charge.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(charges);
});

// POST /api/patients/:patientId/billing
router.post('/', async (req, res) => {
  const { patientId } = req.params;
  const { description, amount, cptCode, status } = req.body;

  if (!description || amount === undefined) {
    return res.status(400).json({ error: 'description and amount are required' });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const charge = await prisma.charge.create({
    data: {
      description,
      amount: parseFloat(amount),
      cptCode,
      status: status || 'pending',
      patientId,
    },
  });

  res.status(201).json(charge);
});

// PATCH /api/billing/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'denied'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be pending, paid, or denied' });
  }

  const charge = await prisma.charge.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(charge);
});

// DELETE /api/billing/:id
router.delete('/:id', async (req, res) => {
  await prisma.charge.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
