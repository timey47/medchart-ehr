const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/patients/:patientId/notes
router.get('/', async (req, res) => {
  const { patientId } = req.params;
  const notes = await prisma.note.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(notes);
});

// POST /api/patients/:patientId/notes
router.post('/', async (req, res) => {
  const { patientId } = req.params;
  const { content, type } = req.body;

  if (!content) return res.status(400).json({ error: 'content is required' });

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const note = await prisma.note.create({
    data: {
      content,
      type: type || 'general',
      patientId,
      authorId: req.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(note);
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  const { content, type } = req.body;
  const note = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      ...(content && { content }),
      ...(type && { type }),
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(note);
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  await prisma.note.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
