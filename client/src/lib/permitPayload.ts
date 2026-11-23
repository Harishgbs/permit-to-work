import type { PermitPayload, PermitType, PermitTypeData } from '../types/api';

export interface PermitFormValues {
  contractorTeam: string;
  workDescription: string;
  plantId: string;
  areaId: string;
  equipmentId: string;
  workLocation: string;
  plannedStartAt: string;
  plannedEndAt: string;
  identifiedHazards: string;
  requiredPpe: string;
  precautions: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requiredText(value: string | null | undefined, label: string): string {
  const normalized = (value ?? '').trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

export function requiredUuid(value: string | null | undefined, label: string): string {
  const normalized = (value ?? '').trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a valid UUID.`);
  }

  return normalized;
}

export function toIsoDateTime(value: string | null | undefined, label: string): string {
  const normalized = (value ?? '').trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }

  return date.toISOString();
}

export function normalizePermitFormValues(form: PermitFormValues): PermitFormValues {
  return {
    contractorTeam: requiredText(form.contractorTeam, 'Contractor team'),
    workDescription: requiredText(form.workDescription, 'Work description'),
    plantId: requiredUuid(form.plantId, 'Plant ID'),
    areaId: requiredUuid(form.areaId, 'Area ID'),
    equipmentId: requiredUuid(form.equipmentId, 'Equipment ID'),
    workLocation: requiredText(form.workLocation, 'Work location'),
    plannedStartAt: toIsoDateTime(form.plannedStartAt, 'Planned start'),
    plannedEndAt: toIsoDateTime(form.plannedEndAt, 'Planned end'),
    identifiedHazards: requiredText(form.identifiedHazards, 'Identified hazards'),
    requiredPpe: requiredText(form.requiredPpe, 'Required PPE'),
    precautions: requiredText(form.precautions, 'Precautions'),
  };
}

export function buildPermitPayload(
  form: PermitFormValues,
  type: PermitType,
  typeData: PermitTypeData,
): PermitPayload {
  const values = normalizePermitFormValues(form);

  if (new Date(values.plannedEndAt) <= new Date(values.plannedStartAt)) {
    throw new Error('Planned end must be after planned start.');
  }

  return {
    type,
    contractorTeam: values.contractorTeam,
    workDescription: values.workDescription,
    plantId: values.plantId,
    areaId: values.areaId,
    equipmentId: values.equipmentId,
    workLocation: values.workLocation,
    plannedStartAt: values.plannedStartAt,
    plannedEndAt: values.plannedEndAt,
    identifiedHazards: values.identifiedHazards,
    requiredPpe: values.requiredPpe,
    precautions: values.precautions,
    typeData,
  };
}
