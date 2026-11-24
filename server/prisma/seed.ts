import { PrismaClient, type ApprovalStatus, type PermitStatus, type PermitType, type Prisma, type Role } from '@prisma/client';
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
    typeData: {
      hotWorkType: 'WELDING',
      fireWatch: true,
      extinguisherType: 'CO2',
      combustiblesClearanceRadiusMetres: 11,
      gasReadings: { lel: 0, o2: 20.9, recordedAt: '2026-12-01T07:45:00.000Z' },
    },
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
    typeData: {
      spaceId: 'TNK-401',
      entryPoint: 'Top manway',
      atmosphericReadings: { o2: 20.6, lel: 0, h2s: 0, co: 2, recordedAt: '2026-12-02T07:45:00.000Z' },
      attendant: 'Seed Attendant',
      rescuePlan: 'Tripod and winch standby',
      ventilation: 'Forced air, 1200 m3/h',
      entryExitLog: 'Tank entry register',
    },
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
    typeData: {
      heightMetres: 4,
      accessMethod: 'SCAFFOLD',
      fallArrest: true,
      anchorCheck: 'Anchor point A7 inspected',
      barricading: true,
    },
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
    typeData: {
      equipmentTag: 'ELE-301',
      voltage: 415,
      isolationPoints: ['Main breaker', 'Feeder isolator', 'Contactor isolation'],
      lockNumbers: ['LOTO-301-A', 'LOTO-301-B', 'LOTO-301-C'],
      tagNumbers: ['TAG-301-A', 'TAG-301-B', 'TAG-301-C'],
      earthingApplied: true,
      testedDead: true,
      testedDeadBy: 'Seed Electrician',
    },
  },
  {
    number: 'PTW-DEMO-0005',
    type: 'HOT_WORK',
    status: 'SUSPENDED',
    plant: 'North Plant',
    area: 'Assembly Line',
    equipment: 'CNV-501',
    description: 'Solder conveyor sensor connections',
    hazards: 'Hot iron near packaging material',
    ppe: 'Soldering iron stand, heat-resistant gloves, eye protection',
    precautions: 'Work paused pending fire-watch reassignment',
    typeData: {
      hotWorkType: 'SOLDERING',
      fireWatch: true,
      extinguisherType: 'Dry powder',
      combustiblesClearanceRadiusMetres: 12,
      gasReadings: { lel: 0, o2: 20.8, recordedAt: '2026-12-03T07:45:00.000Z' },
    },
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
    typeData: {
      spaceId: 'TNK-401',
      entryPoint: 'Bottom hatch',
      atmosphericReadings: { o2: 19.4, lel: 0, h2s: 5, co: 12, recordedAt: '2026-12-04T07:45:00.000Z' },
      attendant: 'Seed Attendant',
      rescuePlan: 'Incomplete rescue plan',
      ventilation: 'Natural ventilation',
      entryExitLog: 'Tank entry register',
    },
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
    typeData: {
      heightMetres: 3,
      accessMethod: 'LADDER',
      fallArrest: true,
      anchorCheck: 'Utility yard anchor rail inspected',
      barricading: true,
    },
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
    typeData: {
      equipmentTag: 'ELE-301',
      voltage: 230,
      isolationPoints: ['Control circuit breaker', 'Test isolator'],
      lockNumbers: ['LOTO-CTL-1', 'LOTO-CTL-2'],
      tagNumbers: ['TAG-CTL-1', 'TAG-CTL-2'],
      earthingApplied: true,
      testedDead: true,
      testedDeadBy: 'Seed Electrician',
    },
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
    typeData: {
      hotWorkType: 'CUTTING',
      fireWatch: true,
      extinguisherType: 'CO2',
      combustiblesClearanceRadiusMetres: 10,
      gasReadings: { lel: 0, o2: 20.9, recordedAt: '2026-12-06T07:45:00.000Z' },
    },
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
    typeData: {
      spaceId: 'CNV-PIT-01',
      entryPoint: 'Access stair',
      atmosphericReadings: { o2: 20.7, lel: 0, h2s: 0, co: 3, recordedAt: '2026-12-07T07:45:00.000Z' },
      attendant: 'Seed Attendant',
      rescuePlan: 'Tripod and winch standby',
      ventilation: 'Forced air, 800 m3/h',
      entryExitLog: 'Pit entry register',
    },
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
    const validityEnded = permit.status === 'EXPIRED';
    const validitySet = ['ACTIVE', 'SUSPENDED', 'CLOSED', 'CLOSED_VERIFIED', 'EXPIRED'].includes(permit.status);
    const validUntil = validitySet
      ? new Date(Date.now() + (validityEnded ? -1 : 7) * 24 * 60 * 60 * 1000)
      : null;

    const record = await prisma.permit.upsert({
      where: { permitNumber: permit.number },
      update: { typeData: permit.typeData, validUntil },
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
        validUntil,
      },
    });

    if (permit.status !== 'DRAFT') {
      const approvalDefinitions: { step: number; requiredRole: Role; approverId: string }[] = [
        { step: 1, requiredRole: 'AREA_OWNER', approverId: userIds.get('area-owner@example.com')! },
        { step: 2, requiredRole: 'SAFETY_OFFICER', approverId: userIds.get('safety-officer@example.com')! },
      ];

      for (const definition of approvalDefinitions) {
        const status: ApprovalStatus =
          permit.status === 'REJECTED' && definition.step === 2
            ? 'REJECTED'
            : permit.status === 'PENDING_APPROVAL'
              ? 'PENDING'
              : 'APPROVED';

        await prisma.approval.upsert({
          where: { permitId_step: { permitId: record.id, step: definition.step } },
          update: {
            requiredRole: definition.requiredRole,
            approverId: status === 'PENDING' ? null : definition.approverId,
            status,
            decidedAt: status === 'PENDING' ? null : new Date(),
          },
          create: {
            permitId: record.id,
            requiredRole: definition.requiredRole,
            approverId: status === 'PENDING' ? null : definition.approverId,
            step: definition.step,
            status,
            decidedAt: status === 'PENDING' ? null : new Date(),
          },
        });
      }
    }

    const existingAuditEntry = await prisma.auditLog.count({
      where: { permitId: record.id, action: { in: ['CREATED', 'PERMIT_CREATED'] } },
    });

    if (existingAuditEntry === 0) {
      await prisma.auditLog.create({
        data: { permitId: record.id, actorId: requesterId, action: 'PERMIT_CREATED', toValue: 'DRAFT' },
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
