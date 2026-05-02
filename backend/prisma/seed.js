const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create demo provider account
  const hashedPassword = await bcrypt.hash('password123', 10);
  const provider = await prisma.user.upsert({
    where: { email: 'dr.smith@medchart.com' },
    update: {},
    create: {
      email: 'dr.smith@medchart.com',
      password: hashedPassword,
      name: 'Dr. Sarah Smith',
      role: 'provider',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@medchart.com' },
    update: {},
    create: {
      email: 'admin@medchart.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  // Create 3 demo patients
  const patient1 = await prisma.patient.upsert({
    where: { mrn: 'MRN-001' },
    update: {},
    create: {
      firstName: 'James',
      lastName: 'Wilson',
      dateOfBirth: new Date('1975-03-14'),
      gender: 'Male',
      email: 'james.wilson@email.com',
      phone: '(555) 234-5678',
      address: '742 Evergreen Terrace, Springfield, IL 62701',
      status: 'Waiting',
      insurance: 'BlueCross BlueShield',
      mrn: 'MRN-001',
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { mrn: 'MRN-002' },
    update: {},
    create: {
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: new Date('1988-07-22'),
      gender: 'Female',
      email: 'maria.garcia@email.com',
      phone: '(555) 345-6789',
      address: '1600 Pennsylvania Ave, Chicago, IL 60601',
      status: 'InProgress',
      insurance: 'Aetna',
      mrn: 'MRN-002',
    },
  });

  const patient3 = await prisma.patient.upsert({
    where: { mrn: 'MRN-003' },
    update: {},
    create: {
      firstName: 'Robert',
      lastName: 'Chen',
      dateOfBirth: new Date('1962-11-05'),
      gender: 'Male',
      email: 'robert.chen@email.com',
      phone: '(555) 456-7890',
      address: '350 Fifth Avenue, New York, NY 10118',
      status: 'Completed',
      insurance: 'United Healthcare',
      mrn: 'MRN-003',
    },
  });

  // Add notes for patients
  await prisma.note.createMany({
    data: [
      {
        content: 'Patient presents with persistent cough lasting 2 weeks. No fever. Lungs clear on auscultation. Recommend chest X-ray and follow-up in 1 week.',
        type: 'soap',
        patientId: patient1.id,
        authorId: provider.id,
      },
      {
        content: 'Blood pressure 142/88. Patient reports compliance with medication. Reviewed diet and exercise plan. Continue current regimen with monthly monitoring.',
        type: 'general',
        patientId: patient2.id,
        authorId: provider.id,
      },
      {
        content: 'Post-op follow-up: incision healing well, no signs of infection. Patient reports minimal pain (2/10). Cleared for light activity.',
        type: 'assessment',
        patientId: patient3.id,
        authorId: provider.id,
      },
    ],
  });

  // Add billing charges
  await prisma.charge.createMany({
    data: [
      {
        description: 'Office Visit - Level 3',
        amount: 185.00,
        status: 'pending',
        cptCode: '99213',
        patientId: patient1.id,
      },
      {
        description: 'Chest X-Ray',
        amount: 225.00,
        status: 'pending',
        cptCode: '71046',
        patientId: patient1.id,
      },
      {
        description: 'Office Visit - Level 4',
        amount: 250.00,
        status: 'paid',
        cptCode: '99214',
        patientId: patient2.id,
      },
      {
        description: 'EKG Interpretation',
        amount: 89.00,
        status: 'paid',
        cptCode: '93000',
        patientId: patient2.id,
      },
      {
        description: 'Post-Op Follow-Up',
        amount: 145.00,
        status: 'paid',
        cptCode: '99024',
        patientId: patient3.id,
      },
      {
        description: 'Wound Care',
        amount: 175.00,
        status: 'denied',
        cptCode: '97597',
        patientId: patient3.id,
      },
    ],
  });

  console.log('Seed complete.');
  console.log('Login: dr.smith@medchart.com / password123');
  console.log('Login: admin@medchart.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
