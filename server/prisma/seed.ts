import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plant = await prisma.plant.upsert({
    where: { name: 'Demo Plant' },
    update: {},
    create: { name: 'Demo Plant', location: 'Demo site' },
  });

  const area = await prisma.area.upsert({
    where: { plantId_name: { plantId: plant.id, name: 'Maintenance Bay A' } },
    update: {},
    create: { name: 'Maintenance Bay A', plantId: plant.id },
  });

  const equipment = await prisma.equipment.upsert({
    where: { areaId_tag: { areaId: area.id, tag: 'PMP-101' } },
    update: {},
    create: { tag: 'PMP-101', name: 'Process pump 101', areaId: area.id },
  });

  const requester = await prisma.user.upsert({
    where: { email: 'requester@example.com' },
    update: {},
    create: {
      name: 'Demo Requester',
      email: 'requester@example.com',
      passwordHash: 'placeholder-not-a-login-hash',
      role: 'REQUESTER',
      areaId: area.id,
    },
  });

  const areaOwner = await prisma.user.upsert({
    where: { email: 'area-owner@example.com' },
    update: {},
    create: {
      name: 'Demo Area Owner',
      email: 'area-owner@example.com',
      passwordHash: 'placeholder-not-a-login-hash',
      role: 'AREA_OWNER',
      areaId: area.id,
    },
  });

  const permit = await prisma.permit.upsert({
    where: { permitNumber: 'PTW-DEMO-0001' },
    update: {},
    create: {
      permitNumber: 'PTW-DEMO-0001',
      type: 'HOT_WORK',
      requesterId: requester.id,
      contractorTeam: 'Demo Contractors',
      workDescription: 'Replace worn pump bearing',
      plantId: plant.id,
      areaId: area.id,
      equipmentId: equipment.id,
      workLocation: 'Bay A, pump skid 2',
      plannedStartAt: new Date('2026-12-01T08:00:00Z'),
      plannedEndAt: new Date('2026-12-01T16:00:00Z'),
      identifiedHazards: 'Hot surfaces, sparks, nearby combustibles',
      requiredPpe: 'Heat-resistant gloves, safety glasses, FR clothing',
      precautions: 'Fire watch present; gas test before ignition',
      status: 'PENDING_APPROVAL',
      typeData: { hotWork: { gasTestRequired: true, fireWatchRequired: true } },
    },
  });

  await prisma.approval.upsert({
    where: { permitId_step: { permitId: permit.id, step: 1 } },
    update: {},
    create: { permitId: permit.id, approverId: areaOwner.id, step: 1, status: 'PENDING' },
  });

  const existingAuditEntry = await prisma.auditLog.count({
    where: { permitId: permit.id, action: 'CREATED' },
  });

  if (existingAuditEntry === 0) {
    await prisma.auditLog.create({
      data: { permitId: permit.id, actorId: requester.id, action: 'CREATED', toValue: 'DRAFT' },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
