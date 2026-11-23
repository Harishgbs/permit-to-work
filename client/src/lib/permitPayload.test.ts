import { describe, expect, it } from 'vitest';
import {
  buildPermitPayload,
  normalizePermitFormValues,
  type PermitFormValues,
} from './permitPayload';
import {
  createPermitSchema,
  updatePermitSchema,
} from '../../../server/src/modules/permits/permit.validation';
import type { PermitType, PermitTypeData } from '../types/api';

const PLANT_ID = '11111111-1111-4111-8111-111111111111';
const AREA_ID = '22222222-2222-4222-8222-222222222222';
const EQUIPMENT_ID = '33333333-3333-4333-8333-333333333333';

function validForm(): PermitFormValues {
  return {
    contractorTeam: '  North Maintenance  ',
    workDescription: '  Replace pump bearing  ',
    plantId: `  ${PLANT_ID}  `,
    areaId: AREA_ID,
    equipmentId: EQUIPMENT_ID,
    workLocation: '  Maintenance Bay A  ',
    plannedStartAt: '2026-11-24T08:00',
    plannedEndAt: '2026-11-24T10:00',
    identifiedHazards: '  Sparks and hot surfaces  ',
    requiredPpe: '  Gloves, goggles, FR clothing  ',
    precautions: '  Fire watch present  ',
  };
}

function typeDataFor(type: PermitType): PermitTypeData {
  switch (type) {
    case 'HOT_WORK':
      return {
        hotWorkType: 'WELDING',
        fireWatch: true,
        extinguisherType: 'CO2',
        combustiblesClearanceRadiusMetres: 11,
        gasReadings: { lel: 0, o2: 20.9, recordedAt: '2026-11-24T07:45:00.000Z' },
      };
    case 'CONFINED_SPACE':
      return {
        spaceId: 'TANK-12',
        entryPoint: 'Top manway',
        atmosphericReadings: {
          o2: 20.9,
          lel: 0,
          h2s: 0,
          co: 0,
          recordedAt: '2026-11-24T07:45:00.000Z',
        },
        attendant: 'Attendant A',
        rescuePlan: 'Tripod retrieval',
        ventilation: 'Forced air',
        entryExitLog: 'Log book 4',
      };
    case 'WORKING_AT_HEIGHT':
      return {
        heightMetres: 6,
        accessMethod: 'MEWP',
        fallArrest: true,
        anchorCheck: 'Certified anchor A2',
        barricading: true,
      };
    case 'ELECTRICAL_LOTO':
      return {
        equipmentTag: 'MCC-7',
        voltage: 415,
        isolationPoints: 2,
        lockTagNumbers: ['LT-001', 'LT-002'],
        earthing: true,
        testedDead: true,
        testedDeadBy: 'Electrician B',
      };
  }
}

const permitTypes: PermitType[] = [
  'HOT_WORK',
  'CONFINED_SPACE',
  'WORKING_AT_HEIGHT',
  'ELECTRICAL_LOTO',
];

describe('permit payload normalization', () => {
  it('trims values and rejects empty required text instead of sending empty strings', () => {
    expect(normalizePermitFormValues(validForm())).toMatchObject({
      contractorTeam: 'North Maintenance',
      workDescription: 'Replace pump bearing',
      identifiedHazards: 'Sparks and hot surfaces',
      requiredPpe: 'Gloves, goggles, FR clothing',
      precautions: 'Fire watch present',
    });

    expect(() =>
      normalizePermitFormValues({ ...validForm(), identifiedHazards: '   ' }),
    ).toThrow('Identified hazards is required.');
    expect(() => normalizePermitFormValues({ ...validForm(), requiredPpe: '' })).toThrow(
      'Required PPE is required.',
    );
    expect(() => normalizePermitFormValues({ ...validForm(), precautions: '  ' })).toThrow(
      'Precautions is required.',
    );
  });

  it('never sends an empty string for a UUID field', () => {
    expect(() => normalizePermitFormValues({ ...validForm(), plantId: '' })).toThrow(
      'Plant ID must be a valid UUID.',
    );
    expect(() => normalizePermitFormValues({ ...validForm(), areaId: 'not-a-uuid' })).toThrow(
      'Area ID must be a valid UUID.',
    );
    expect(() => normalizePermitFormValues({ ...validForm(), equipmentId: '   ' })).toThrow(
      'Equipment ID must be a valid UUID.',
    );
  });

  it('accepts and trims valid UUIDs', () => {
    const normalized = normalizePermitFormValues(validForm());

    expect(normalized.plantId).toBe(PLANT_ID);
    expect(normalized.areaId).toBe(AREA_ID);
    expect(normalized.equipmentId).toBe(EQUIPMENT_ID);
  });

  it('builds payloads with no empty top-level string values', () => {
    const payload = buildPermitPayload(validForm(), 'HOT_WORK', typeDataFor('HOT_WORK'));

    for (const value of Object.values(payload)) {
      if (typeof value === 'string') {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it.each(permitTypes)(
    'builds a %s payload accepted by create and edit backend validation',
    (type) => {
      const payload = buildPermitPayload(validForm(), type, typeDataFor(type));

      expect(createPermitSchema.safeParse(payload).success).toBe(true);
      expect(updatePermitSchema.safeParse(payload).success).toBe(true);
    },
  );
});
