const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/patients
router.get('/', async (req, res) => {
  const { search, status } = req.query;
  const where = {};

  if (status) where.status = status;

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { mrn: { contains: search, mode: 'insensitive' } },
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { notes: true, charges: true } },
    },
  });

  res.json(patients);
});

// GET /api/patients/stats
router.get('/stats', async (req, res) => {
  const [total, waiting, inProgress, completed, totalRevenue, pendingRevenue] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { status: 'Waiting' } }),
    prisma.patient.count({ where: { status: 'InProgress' } }),
    prisma.patient.count({ where: { status: 'Completed' } }),
    prisma.charge.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
    prisma.charge.aggregate({ _sum: { amount: true }, where: { status: 'pending' } }),
  ]);

  res.json({
    total,
    waiting,
    inProgress,
    completed,
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingRevenue: pendingRevenue._sum.amount || 0,
  });
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true, email: true } } },
      },
      charges: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

// POST /api/patients
router.post('/', async (req, res) => {
  const { firstName, lastName, dateOfBirth, gender, email, phone, address, status, insurance } = req.body;

  if (!firstName || !lastName || !dateOfBirth || !gender) {
    return res.status(400).json({ error: 'firstName, lastName, dateOfBirth, gender are required' });
  }

  const patient = await prisma.patient.create({
    data: {
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      email,
      phone,
      address,
      status: status || 'Waiting',
      insurance,
    },
  });

  res.status(201).json(patient);
});

// PUT /api/patients/:id
router.put('/:id', async (req, res) => {
  const { firstName, lastName, dateOfBirth, gender, email, phone, address, status, insurance } = req.body;

  const patient = await prisma.patient.update({
    where: { id: req.params.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      ...(gender && { gender }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(status && { status }),
      ...(insurance !== undefined && { insurance }),
    },
  });

  res.json(patient);
});

// PATCH /api/patients/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Waiting', 'InProgress', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be Waiting, InProgress, or Completed' });
  }

  const patient = await prisma.patient.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(patient);
});

// DELETE /api/patients/:id
router.delete('/:id', async (req, res) => {
  await prisma.patient.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
