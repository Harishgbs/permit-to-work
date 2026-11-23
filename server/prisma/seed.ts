import { PrismaClient, type PermitStatus, type PermitType, type Prisma, type Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'DemoPass123!';

const plantData = [
  { name: 'Demo Plant', location: 'Demo site' },
  { name: 'North Plant', location: 'North site' },
];

const areaData = [
  { plant: 'Demo Plant', name: 'Maintenance Bay A' },
  { plant: 'Demo Plant', name: 'Electrical Room' },
  { plant: 'Demo Plant', name: 'Confined Space Zone' },
  { plant: 'North Plant', name: 'Assembly Line' },
  { plant: 'North Plant', name: 'Utility Yard' },
];

const equipmentData = [
  { area: 'Maintenance Bay A', tag: 'PMP-101', name: 'Process pump 101' },
  { area: 'Maintenance Bay A', tag: 'CMP-201', name: 'Compressor 201' },
  { area: 'Electrical Room', tag: 'ELE-301', name: 'Main switchboard 301' },
  { area: 'Confined Space Zone', tag: 'TNK-401', name: 'Storage tank 401' },
  { area: 'Assembly Line', tag: 'CNV-501', name: 'Conveyor 501' },
  { area: 'Utility Yard', tag: 'PMP-601', name: 'Utility pump 601' },
];

const userData: { name: string; email: string; role: Role; area: string | null }[] = [
  { name: 'Demo Requester', email: 'requester@example.com', role: 'REQUESTER', area: 'Maintenance Bay A' },
  { name: 'Demo Area Owner', email: 'area-owner@example.com', role: 'AREA_OWNER', area: 'Maintenance Bay A' },
  { name: 'Demo Safety Officer', email: 'safety-officer@example.com', role: 'SAFETY_OFFICER', area: null },
  { name: 'Demo Administrator', email: 'admin@example.com', role: 'ADMIN', area: null },
];

interface PermitSeed {
  number: string;
  type: PermitType;
  status: PermitStatus;
  plant: string;
  area: string;
  equipment: string;
  description: string;
  hazards: string;
  ppe: string;
  precautions: string;
  typeData: Prisma.InputJsonValue;
}

const permitData: PermitSeed[] = [
  {
    number: 'PTW-DEMO-0001',
    type: 'HOT_WORK',
    status: 'PENDING_APPROVAL',
    plant: 'Demo Plant',
    area: 'Maintenance Bay A',
    equipment: 'PMP-101',
    description: 'Replace worn pump bearing',
    hazards: 'Hot surfaces, sparks, nearby combustibles',
    ppe: 'Heat-resistant gloves, safety glasses, FR clothing',
    precautions: 'Fire watch present; gas test before ignition',
    typeData: { hotWork: { gasTestRequired: true, fireWatchRequired: true } },
  },
  {
    number: 'PTW-DEMO-0002',
    type: 'CONFINED_SPACE',
    status: 'DRAFT',
    plant: 'Demo Plant',
    area: 'Confined Space Zone',
    equipment: 'TNK-401',
    description: 'Inspect tank interior',
    hazards: 'Limited oxygen, residual chemical vapour',
    ppe: 'Respirator, harness, gas monitor',
    precautions: 'Ventilate and test atmosphere before entry',
    typeData: { confinedSpace: { entryMonitorRequired: true, rescuePlanRequired: true } },
  },
  {
    number: 'PTW-DEMO-0003',
    type: 'WORKING_AT_HEIGHT',
    status: 'APPROVED',
    plant: 'Demo Plant',
    area: 'Maintenance Bay A',
    equipment: 'CMP-201',
    description: 'Service compressor at elevated platform',
    hazards: 'Fall from height, dropped objects',
    ppe: 'Harness, hard hat, safety shoes',
    precautions: 'Guardrails inspected; tool tethers in use',
    typeData: { workingAtHeight: { heightMetres: 4, fallArrestRequired: true } },
  },
  {
    number: 'PTW-DEMO-0004',
    type: 'ELECTRICAL_LOTO',
    status: 'ACTIVE',
    plant: 'Demo Plant',
    area: 'Electrical Room',
    equipment: 'ELE-301',
    description: 'Replace switchboard contactor',
    hazards: 'Electrical arc flash, stored energy',
    ppe: 'Arc-rated suit, insulated gloves, face shield',
    precautions: 'Isolation points locked and tagged; verify zero energy',
    typeData: { electricalLoto: { isolationPoints: 3, verifiedDeEnergized: true } },
  },
  {
    number: 'PTW-DEMO-0005',
    type: 'HOT_WORK',
    status: 'SUSPENDED',
    plant: 'North Plant',
    area: 'Assembly Line',
    equipment: 'CNV-501',
    description: 'Weld conveyor support bracket',
    hazards: 'Sparks near packaging material',
    ppe: 'Welding helmet, fire-resistant clothing',
    precautions: 'Work paused pending fire-watch reassignment',
    typeData: { hotWork: { gasTestRequired: true, fireWatchRequired: true } },
  },
  {
    number: 'PTW-DEMO-0006',
    type: 'CONFINED_SPACE',
    status: 'REJECTED',
    plant: 'Demo Plant',
    area: 'Confined Space Zone',
    equipment: 'TNK-401',
    description: 'Clean tank sludge',
    hazards: 'Toxic atmosphere, engulfment',
    ppe: 'Respirator, chemical suit, harness',
    precautions: 'Rescue plan incomplete; resubmission required',
    typeData: { confinedSpace: { entryMonitorRequired: true, rescuePlanRequired: false } },
  },
  {
    number: 'PTW-DEMO-0007',
    type: 'WORKING_AT_HEIGHT',
    status: 'EXPIRED',
    plant: 'North Plant',
    area: 'Utility Yard',
    equipment: 'PMP-601',
    description: 'Repaint utility pipework',
    hazards: 'Fall from ladder, chemical exposure',
    ppe: 'Harness, gloves, eye protection',
    precautions: 'Permit validity elapsed before work completed',
    typeData: { workingAtHeight: { heightMetres: 3, fallArrestRequired: true } },
  },
  {
    number: 'PTW-DEMO-0008',
    type: 'ELECTRICAL_LOTO',
    status: 'CLOSED',
    plant: 'Demo Plant',
    area: 'Electrical Room',
    equipment: 'ELE-301',
    description: 'Test control circuit',
    hazards: 'Unexpected energisation',
    ppe: 'Insulated gloves, voltage tester',
    precautions: 'LOTO removed after work completion',
    typeData: { electricalLoto: { isolationPoints: 2, verifiedDeEnergized: true } },
  },
  {
    number: 'PTW-DEMO-0009',
    type: 'HOT_WORK',
    status: 'CLOSED_VERIFIED',
    plant: 'Demo Plant',
    area: 'Maintenance Bay A',
    equipment: 'PMP-101',
    description: 'Cut corroded pipe section',
    hazards: 'Fire, hot metal',
    ppe: 'Welding helmet, gloves, FR clothing',
    precautions: 'Final fire watch completed and signed off',
    typeData: { hotWork: { gasTestRequired: true, fireWatchRequired: true } },
  },
  {
    number: 'PTW-DEMO-0010',
    type: 'CONFINED_SPACE',
    status: 'CANCELLED',
    plant: 'North Plant',
    area: 'Assembly Line',
    equipment: 'CNV-501',
    description: 'Inspect under-floor pit',
    hazards: 'Confined space, poor ventilation',
    ppe: 'Gas monitor, harness',
    precautions: 'Cancelled because production schedule changed',
    typeData: { confinedSpace: { entryMonitorRequired: true, rescuePlanRequired: true } },
  },
];

async function main() {
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const plantIds = new Map<string, string>();
  for (const plant of plantData) {
    const record = await prisma.plant.upsert({
      where: { name: plant.name },
      update: { location: plant.location },
      create: plant,
    });
    plantIds.set(plant.name, record.id);
  }

  const areaIds = new Map<string, string>();
  for (const area of areaData) {
    const plantId = plantIds.get(area.plant)!;
    const record = await prisma.area.upsert({
      where: { plantId_name: { plantId, name: area.name } },
      update: {},
      create: { name: area.name, plantId },
    });
    areaIds.set(`${area.plant}/${area.name}`, record.id);
  }

  const equipmentIds = new Map<string, string>();
  for (const item of equipmentData) {
    const areaId = areaIds.get(`Demo Plant/${item.area}`) ?? areaIds.get(`North Plant/${item.area}`)!;
    const record = await prisma.equipment.upsert({
      where: { areaId_tag: { areaId, tag: item.tag } },
      update: { name: item.name },
      create: { tag: item.tag, name: item.name, areaId },
    });
    equipmentIds.set(`${item.area}/${item.tag}`, record.id);
  }

  const userIds = new Map<string, string>();
  for (const user of userData) {
    const areaId = user.area ? areaIds.get(`Demo Plant/${user.area}`)! : null;
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash: demoPasswordHash, role: user.role, areaId },
      create: {
        name: user.name,
        email: user.email,
        passwordHash: demoPasswordHash,
        role: user.role,
        areaId,
      },
    });
    userIds.set(user.email, record.id);
  }

  for (const [index, permit] of permitData.entries()) {
    const areaId = areaIds.get(`${permit.plant}/${permit.area}`)!;
    const equipmentId = equipmentIds.get(`${permit.area}/${permit.equipment}`)!;
    const requesterId = userIds.get('requester@example.com')!;
    const plannedStartAt = new Date(Date.UTC(2026, 11, 1 + (index % 5), 8, 0));
    const plannedEndAt = new Date(plannedStartAt.getTime() + 8 * 60 * 60 * 1000);

    const record = await prisma.permit.upsert({
      where: { permitNumber: permit.number },
      update: {},
      create: {
        permitNumber: permit.number,
        type: permit.type,
        status: permit.status,
        requesterId,
        contractorTeam: 'Demo Contractors',
        workDescription: permit.description,
        plantId: plantIds.get(permit.plant)!,
        areaId,
        equipmentId,
        workLocation: `${permit.area}, ${permit.equipment}`,
        plannedStartAt,
        plannedEndAt,
        identifiedHazards: permit.hazards,
        requiredPpe: permit.ppe,
        precautions: permit.precautions,
        typeData: permit.typeData,
      },
    });

    if (index === 0) {
      await prisma.approval.upsert({
        where: { permitId_step: { permitId: record.id, step: 1 } },
        update: {},
        create: {
          permitId: record.id,
          approverId: userIds.get('area-owner@example.com')!,
          step: 1,
          status: 'PENDING',
        },
      });
    }

    const existingAuditEntry = await prisma.auditLog.count({
      where: { permitId: record.id, action: 'CREATED' },
    });

    if (existingAuditEntry === 0) {
      await prisma.auditLog.create({
        data: { permitId: record.id, actorId: requesterId, action: 'CREATED', toValue: 'DRAFT' },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
