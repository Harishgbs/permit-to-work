import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Field from '../../components/ui/Field';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../lib/api';
import { formatType, fromDateTimeInputValue, toDateTimeInputValue } from '../../lib/format';
import type {
  ConfinedSpaceData,
  ElectricalLotoData,
  EquipmentReference,
  HotWorkData,
  Permit,
  PermitPayload,
  PermitType,
  PermitTypeData,
  Reference,
  WorkingAtHeightData,
} from '../../types/api';

interface ReferenceOption extends Reference {
  knownAs?: string;
}

interface EquipmentOption extends EquipmentReference {
  plantId: string;
  areaId: string;
}

interface ReferenceData {
  plants: ReferenceOption[];
  areas: ReferenceOption[];
  equipment: EquipmentOption[];
}

interface TypeDataForm {
  hotWorkType: HotWorkData['hotWorkType'];
  fireWatch: boolean;
  extinguisherType: string;
  combustiblesRadius: string;
  gasLel: string;
  gasO2: string;
  gasRecordedAt: string;
  spaceId: string;
  entryPoint: string;
  atmO2: string;
  atmLel: string;
  atmH2s: string;
  atmCo: string;
  atmRecordedAt: string;
  attendant: string;
  rescuePlan: string;
  ventilation: string;
  entryExitLog: string;
  heightMetres: string;
  accessMethod: string;
  fallArrest: boolean;
  anchorCheck: string;
  barricading: boolean;
  equipmentTag: string;
  voltage: string;
  isolationPoints: string;
  lockTagNumbers: string;
  earthing: boolean;
  testedDeadBy: string;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';
const textareaClass = `${inputClass} min-h-[96px] resize-y`;
const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600';

const permitTypes: PermitType[] = [
  'HOT_WORK',
  'CONFINED_SPACE',
  'WORKING_AT_HEIGHT',
  'ELECTRICAL_LOTO',
];

function emptyTypeData(): TypeDataForm {
  const now = toDateTimeInputValue(new Date().toISOString());

  return {
    hotWorkType: 'WELDING',
    fireWatch: false,
    extinguisherType: '',
    combustiblesRadius: '',
    gasLel: '',
    gasO2: '',
    gasRecordedAt: now,
    spaceId: '',
    entryPoint: '',
    atmO2: '',
    atmLel: '',
    atmH2s: '',
    atmCo: '',
    atmRecordedAt: now,
    attendant: '',
    rescuePlan: '',
    ventilation: '',
    entryExitLog: '',
    heightMetres: '',
    accessMethod: '',
    fallArrest: false,
    anchorCheck: '',
    barricading: false,
    equipmentTag: '',
    voltage: '',
    isolationPoints: '',
    lockTagNumbers: '',
    earthing: false,
    testedDeadBy: '',
  };
}

function typeDataFromPermit(permit: Permit | null | undefined): TypeDataForm {
  const base = emptyTypeData();
  if (!permit) return base;

  if (permit.type === 'HOT_WORK') {
    const data = permit.typeData as HotWorkData;
    return {
      ...base,
      hotWorkType: data.hotWorkType,
      fireWatch: data.fireWatch,
      extinguisherType: data.extinguisherType,
      combustiblesRadius: String(data.combustiblesClearanceRadiusMetres),
      gasLel: String(data.gasReadings.lel),
      gasO2: String(data.gasReadings.o2),
      gasRecordedAt: toDateTimeInputValue(data.gasReadings.recordedAt),
    };
  }

  if (permit.type === 'CONFINED_SPACE') {
    const data = permit.typeData as ConfinedSpaceData;
    return {
      ...base,
      spaceId: data.spaceId,
      entryPoint: data.entryPoint,
      atmO2: String(data.atmosphericReadings.o2),
      atmLel: String(data.atmosphericReadings.lel),
      atmH2s: String(data.atmosphericReadings.h2s),
      atmCo: String(data.atmosphericReadings.co),
      atmRecordedAt: toDateTimeInputValue(data.atmosphericReadings.recordedAt),
      attendant: data.attendant,
      rescuePlan: data.rescuePlan,
      ventilation: data.ventilation,
      entryExitLog: data.entryExitLog,
    };
  }

  if (permit.type === 'WORKING_AT_HEIGHT') {
    const data = permit.typeData as WorkingAtHeightData;
    return {
      ...base,
      heightMetres: String(data.heightMetres),
      accessMethod: data.accessMethod,
      fallArrest: data.fallArrest,
      anchorCheck: data.anchorCheck,
      barricading: data.barricading,
    };
  }

  const data = permit.typeData as ElectricalLotoData;
  return {
    ...base,
    equipmentTag: data.equipmentTag,
    voltage: String(data.voltage),
    isolationPoints: String(data.isolationPoints),
    lockTagNumbers: data.lockTagNumbers.join(', '),
    earthing: data.earthing,
    testedDeadBy: data.testedDeadBy,
  };
}

async function loadReferences(): Promise<ReferenceData> {
  const first = await api.listPermits({ page: 1, pageSize: 50 });
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => index + 2).map(
      (page) => api.listPermits({ page, pageSize: 50 }),
    ),
  );
  const permits = [...first.data, ...remaining.flatMap((page) => page.data)];

  const plants = new Map<string, ReferenceOption>();
  const areas = new Map<string, ReferenceOption>();
  const equipment = new Map<string, EquipmentOption>();

  for (const permit of permits) {
    plants.set(permit.plant.id, permit.plant);
    areas.set(permit.area.id, permit.area);
    if (permit.equipment) {
      equipment.set(permit.equipment.id, {
        ...permit.equipment,
        plantId: permit.plantId,
        areaId: permit.areaId,
      });
    }
  }

  return {
    plants: [...plants.values()],
    areas: [...areas.values()],
    equipment: [...equipment.values()],
  };
}

function requiredNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!value || !Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return parsed;
}

function requiredDateTime(value: string, label: string): string {
  if (!value) throw new Error(`${label} is required.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid.`);
  return date.toISOString();
}

export default function PermitForm({
  initial,
  onSubmit,
  submitLabel,
  onCancel,
  busy,
}: {
  initial?: Permit | null;
  onSubmit: (payload: PermitPayload) => Promise<void>;
  submitLabel: string;
  onCancel: () => void;
  busy: boolean;
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<PermitType>(initial?.type ?? 'HOT_WORK');
  const [form, setForm] = useState({
    contractorTeam: initial?.contractorTeam ?? '',
    workDescription: initial?.workDescription ?? '',
    plantId: initial?.plantId ?? '',
    areaId: initial?.areaId ?? '',
    equipmentId: initial?.equipmentId ?? '',
    workLocation: initial?.workLocation ?? '',
    plannedStartAt: toDateTimeInputValue(initial?.plannedStartAt),
    plannedEndAt: toDateTimeInputValue(initial?.plannedEndAt),
    identifiedHazards: initial?.identifiedHazards ?? '',
    requiredPpe: initial?.requiredPpe ?? '',
    precautions: initial?.precautions ?? '',
  });
  const [typeData, setTypeData] = useState<TypeDataForm>(() => typeDataFromPermit(initial));
  const { data: references } = useAsyncData(loadReferences, []);

  const steps = useMemo(() => ['Work details', 'Safety controls', 'Review'], []);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setTypeField = <K extends keyof TypeDataForm>(key: K, value: TypeDataForm[K]) => {
    setTypeData((current) => ({ ...current, [key]: value }));
  };

  const validateStepOne = () => {
    const required: Array<[string, string]> = [
      ['contractorTeam', 'Contractor team'],
      ['workDescription', 'Work description'],
      ['plantId', 'Plant ID'],
      ['areaId', 'Area ID'],
      ['workLocation', 'Work location'],
      ['plannedStartAt', 'Planned start'],
      ['plannedEndAt', 'Planned end'],
    ];

    for (const [key, label] of required) {
      if (!form[key as keyof typeof form]) throw new Error(`${label} is required.`);
    }

    if (new Date(form.plannedEndAt) <= new Date(form.plannedStartAt)) {
      throw new Error('Planned end must be after planned start.');
    }
  };

  const buildTypeData = (): PermitTypeData => {
    if (type === 'HOT_WORK') {
      return {
        hotWorkType: typeData.hotWorkType,
        fireWatch: typeData.fireWatch,
        extinguisherType: typeData.extinguisherType,
        combustiblesClearanceRadiusMetres: requiredNumber(
          typeData.combustiblesRadius,
          'Combustibles clearance radius',
        ),
        gasReadings: {
          lel: requiredNumber(typeData.gasLel, 'Gas LEL'),
          o2: requiredNumber(typeData.gasO2, 'Gas O2'),
          recordedAt: requiredDateTime(typeData.gasRecordedAt, 'Gas reading time'),
        },
      };
    }

    if (type === 'CONFINED_SPACE') {
      return {
        spaceId: typeData.spaceId,
        entryPoint: typeData.entryPoint,
        atmosphericReadings: {
          o2: requiredNumber(typeData.atmO2, 'Atmospheric O2'),
          lel: requiredNumber(typeData.atmLel, 'Atmospheric LEL'),
          h2s: requiredNumber(typeData.atmH2s, 'Atmospheric H2S'),
          co: requiredNumber(typeData.atmCo, 'Atmospheric CO'),
          recordedAt: requiredDateTime(typeData.atmRecordedAt, 'Atmospheric reading time'),
        },
        attendant: typeData.attendant,
        rescuePlan: typeData.rescuePlan,
        ventilation: typeData.ventilation,
        entryExitLog: typeData.entryExitLog,
      };
    }

    if (type === 'WORKING_AT_HEIGHT') {
      return {
        heightMetres: requiredNumber(typeData.heightMetres, 'Height'),
        accessMethod: typeData.accessMethod,
        fallArrest: typeData.fallArrest,
        anchorCheck: typeData.anchorCheck,
        barricading: typeData.barricading,
      };
    }

    return {
      equipmentTag: typeData.equipmentTag,
      voltage: requiredNumber(typeData.voltage, 'Voltage'),
      isolationPoints: requiredNumber(typeData.isolationPoints, 'Isolation points'),
      lockTagNumbers: typeData.lockTagNumbers
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      earthing: typeData.earthing,
      testedDead: true,
      testedDeadBy: typeData.testedDeadBy,
    };
  };

  const buildPayload = (): PermitPayload => ({
    type,
    contractorTeam: form.contractorTeam,
    workDescription: form.workDescription,
    plantId: form.plantId,
    areaId: form.areaId,
    equipmentId: form.equipmentId,
    workLocation: form.workLocation,
    plannedStartAt: fromDateTimeInputValue(form.plannedStartAt),
    plannedEndAt: fromDateTimeInputValue(form.plannedEndAt),
    identifiedHazards: form.identifiedHazards,
    requiredPpe: form.requiredPpe,
    precautions: form.precautions,
    typeData: buildTypeData(),
  });

  const handleNext = () => {
    setError(null);

    try {
      if (step === 0) {
        validateStepOne();
      } else if (step === 1) {
        buildTypeData();
      }
      setStep((current) => Math.min(current + 1, 2));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Check the form values');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (step < 2) {
        handleNext();
        return;
      }

      validateStepOne();
      await onSubmit(buildPayload());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save permit');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <ol className="flex flex-wrap gap-2" aria-label="Form progress">
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  index <= step ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {index < step ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className={`text-sm font-medium ${index === step ? 'text-slate-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {index < steps.length - 1 && <span className="mx-2 hidden h-px w-8 bg-slate-200 sm:block" />}
            </li>
          ))}
        </ol>
      </Card>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 0 && (
        <Card title="Work details" description="Describe the task and where it will be performed.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="permit-type" label="Permit type" required>
              <select
                id="permit-type"
                value={type}
                onChange={(event) => setType(event.target.value as PermitType)}
                className={inputClass}
              >
                {permitTypes.map((item) => (
                  <option key={item} value={item}>
                    {formatType(item)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="contractor-team" label="Contractor team" required>
              <input
                id="contractor-team"
                value={form.contractorTeam}
                onChange={(event) => setField('contractorTeam', event.target.value)}
                className={inputClass}
                placeholder="e.g. North Maintenance"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="work-description" label="Work description" required>
                <textarea
                  id="work-description"
                  value={form.workDescription}
                  onChange={(event) => setField('workDescription', event.target.value)}
                  className={textareaClass}
                  placeholder="Describe the exact work to be carried out"
                />
              </Field>
            </div>
            <Field id="plant-id" label="Plant ID" required hint="Start typing to use a known plant.">
              <input
                id="plant-id"
                list="plant-options"
                value={form.plantId}
                onChange={(event) => setField('plantId', event.target.value)}
                className={inputClass}
              />
              <datalist id="plant-options">
                {references?.plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field id="area-id" label="Area ID" required hint="Start typing to use a known area.">
              <input
                id="area-id"
                list="area-options"
                value={form.areaId}
                onChange={(event) => setField('areaId', event.target.value)}
                className={inputClass}
              />
              <datalist id="area-options">
                {references?.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field id="equipment-id" label="Equipment ID" hint="Optional; known tags are suggested.">
              <input
                id="equipment-id"
                list="equipment-options"
                value={form.equipmentId}
                onChange={(event) => setField('equipmentId', event.target.value)}
                className={inputClass}
              />
              <datalist id="equipment-options">
                {references?.equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tag} {item.name ?? ''}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field id="work-location" label="Specific work location" required>
              <input
                id="work-location"
                value={form.workLocation}
                onChange={(event) => setField('workLocation', event.target.value)}
                className={inputClass}
                placeholder="e.g. Boiler bay, level 2"
              />
            </Field>
            <Field id="planned-start" label="Planned start" required>
              <input
                id="planned-start"
                type="datetime-local"
                value={form.plannedStartAt}
                onChange={(event) => setField('plannedStartAt', event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="planned-end" label="Planned end" required>
              <input
                id="planned-end"
                type="datetime-local"
                value={form.plannedEndAt}
                onChange={(event) => setField('plannedEndAt', event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="identified-hazards" label="Identified hazards">
                <textarea
                  id="identified-hazards"
                  value={form.identifiedHazards}
                  onChange={(event) => setField('identifiedHazards', event.target.value)}
                  className={textareaClass}
                />
              </Field>
            </div>
            <Field id="required-ppe" label="Required PPE">
              <input
                id="required-ppe"
                value={form.requiredPpe}
                onChange={(event) => setField('requiredPpe', event.target.value)}
                className={inputClass}
                placeholder="e.g. Arc-rated suit, gloves, goggles"
              />
            </Field>
            <Field id="precautions" label="Precautions">
              <input
                id="precautions"
                value={form.precautions}
                onChange={(event) => setField('precautions', event.target.value)}
                className={inputClass}
                placeholder="e.g. Isolate adjacent drains"
              />
            </Field>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="Safety controls" description={`Requirements for ${formatType(type)} work.`}>
          {type === 'HOT_WORK' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="hot-work-type" label="Hot work method" required>
                <select
                  id="hot-work-type"
                  value={typeData.hotWorkType}
                  onChange={(event) => setTypeField('hotWorkType', event.target.value as HotWorkData['hotWorkType'])}
                  className={inputClass}
                >
                  {['WELDING', 'GRINDING', 'CUTTING', 'BRAZING', 'OTHER'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="extinguisher" label="Fire extinguisher type" required>
                <input
                  id="extinguisher"
                  value={typeData.extinguisherType}
                  onChange={(event) => setTypeField('extinguisherType', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="clearance" label="Combustibles clearance (m)" required>
                <input
                  id="clearance"
                  type="number"
                  min="0"
                  step="0.1"
                  value={typeData.combustiblesRadius}
                  onChange={(event) => setTypeField('combustiblesRadius', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={typeData.fireWatch}
                    onChange={(event) => setTypeField('fireWatch', event.target.checked)}
                    className={checkboxClass}
                  />
                  Fire watch assigned
                </label>
              </div>
              <Field id="gas-lel" label="Gas LEL (%)" required>
                <input
                  id="gas-lel"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={typeData.gasLel}
                  onChange={(event) => setTypeField('gasLel', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="gas-o2" label="Gas O2 (%)" required>
                <input
                  id="gas-o2"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={typeData.gasO2}
                  onChange={(event) => setTypeField('gasO2', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="gas-time" label="Gas reading time" required>
                <input
                  id="gas-time"
                  type="datetime-local"
                  value={typeData.gasRecordedAt}
                  onChange={(event) => setTypeField('gasRecordedAt', event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {type === 'CONFINED_SPACE' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="space-id" label="Space ID" required>
                <input
                  id="space-id"
                  value={typeData.spaceId}
                  onChange={(event) => setTypeField('spaceId', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="entry-point" label="Entry point" required>
                <input
                  id="entry-point"
                  value={typeData.entryPoint}
                  onChange={(event) => setTypeField('entryPoint', event.target.value)}
                  className={inputClass}
                />
              </Field>
              {[
                { key: 'atmO2' as const, label: 'Atmospheric O2 (%)', id: 'atm-o2' },
                { key: 'atmLel' as const, label: 'Atmospheric LEL (%)', id: 'atm-lel' },
                { key: 'atmH2s' as const, label: 'Atmospheric H2S (ppm)', id: 'atm-h2s' },
                { key: 'atmCo' as const, label: 'Atmospheric CO (ppm)', id: 'atm-co' },
              ].map((item) => (
                <Field key={item.id} id={item.id} label={item.label} required>
                  <input
                    id={item.id}
                    type="number"
                    min="0"
                    step="0.1"
                    value={typeData[item.key]}
                    onChange={(event) => setTypeField(item.key, event.target.value)}
                    className={inputClass}
                  />
                </Field>
              ))}
              <Field id="atm-time" label="Atmospheric reading time" required>
                <input
                  id="atm-time"
                  type="datetime-local"
                  value={typeData.atmRecordedAt}
                  onChange={(event) => setTypeField('atmRecordedAt', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="attendant" label="Attendant" required>
                <input
                  id="attendant"
                  value={typeData.attendant}
                  onChange={(event) => setTypeField('attendant', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field id="rescue-plan" label="Rescue plan" required>
                  <textarea
                    id="rescue-plan"
                    value={typeData.rescuePlan}
                    onChange={(event) => setTypeField('rescuePlan', event.target.value)}
                    className={textareaClass}
                  />
                </Field>
              </div>
              <Field id="ventilation" label="Ventilation" required>
                <input
                  id="ventilation"
                  value={typeData.ventilation}
                  onChange={(event) => setTypeField('ventilation', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="entry-log" label="Entry/exit log" required>
                <input
                  id="entry-log"
                  value={typeData.entryExitLog}
                  onChange={(event) => setTypeField('entryExitLog', event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {type === 'WORKING_AT_HEIGHT' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="height" label="Height (m)" required>
                <input
                  id="height"
                  type="number"
                  min="0"
                  step="0.1"
                  value={typeData.heightMetres}
                  onChange={(event) => setTypeField('heightMetres', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="access-method" label="Access method" required>
                <input
                  id="access-method"
                  value={typeData.accessMethod}
                  onChange={(event) => setTypeField('accessMethod', event.target.value)}
                  className={inputClass}
                  placeholder="e.g. MEWP, scaffold, ladder"
                />
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={typeData.fallArrest}
                    onChange={(event) => setTypeField('fallArrest', event.target.checked)}
                    className={checkboxClass}
                  />
                  Fall arrest in use
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={typeData.barricading}
                    onChange={(event) => setTypeField('barricading', event.target.checked)}
                    className={checkboxClass}
                  />
                  Barricading in place
                </label>
              </div>
              <div className="sm:col-span-2">
                <Field id="anchor-check" label="Anchor point check" required>
                  <input
                    id="anchor-check"
                    value={typeData.anchorCheck}
                    onChange={(event) => setTypeField('anchorCheck', event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}

          {type === 'ELECTRICAL_LOTO' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="equipment-tag" label="Equipment tag" required>
                <input
                  id="equipment-tag"
                  value={typeData.equipmentTag}
                  onChange={(event) => setTypeField('equipmentTag', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="voltage" label="Voltage" required>
                <input
                  id="voltage"
                  type="number"
                  min="0"
                  step="0.1"
                  value={typeData.voltage}
                  onChange={(event) => setTypeField('voltage', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="isolation-points" label="Isolation points" required>
                <input
                  id="isolation-points"
                  type="number"
                  min="1"
                  step="1"
                  value={typeData.isolationPoints}
                  onChange={(event) => setTypeField('isolationPoints', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="lock-tags" label="Lock/tag numbers" required hint="Separate multiple values with commas.">
                <input
                  id="lock-tags"
                  value={typeData.lockTagNumbers}
                  onChange={(event) => setTypeField('lockTagNumbers', event.target.value)}
                  className={inputClass}
                  placeholder="LT-001, LT-002"
                />
              </Field>
              <Field id="tested-by" label="Tested dead by" required>
                <input
                  id="tested-by"
                  value={typeData.testedDeadBy}
                  onChange={(event) => setTypeField('testedDeadBy', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={typeData.earthing}
                    onChange={(event) => setTypeField('earthing', event.target.checked)}
                    className={checkboxClass}
                  />
                  Earthing applied
                </label>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <strong>Tested dead confirmation:</strong> this permit type requires a positive
                test-dead confirmation before submission.
              </div>
            </div>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card title="Review permit" description="Check the details before saving.">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{formatType(type)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contractor</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{form.contractorTeam}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Work</dt>
              <dd className="mt-1 text-sm text-slate-700">{form.workDescription}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plant / area</dt>
              <dd className="mt-1 text-sm text-slate-700">
                {references?.plants.find((plant) => plant.id === form.plantId)?.name ?? form.plantId}
                {' · '}
                {references?.areas.find((area) => area.id === form.areaId)?.name ?? form.areaId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
              <dd className="mt-1 text-sm text-slate-700">{form.workLocation}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned window</dt>
              <dd className="mt-1 text-sm text-slate-700">
                {form.plannedStartAt} → {form.plannedEndAt}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Controls</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                <Badge tone="teal">{type.replaceAll('_', ' ')}</Badge>
                {typeData.fireWatch && <Badge tone="amber">Fire watch</Badge>}
                {typeData.fallArrest && <Badge tone="amber">Fall arrest</Badge>}
                {typeData.earthing && <Badge tone="amber">Earthing</Badge>}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {references?.plants.length === 0 && (
        <EmptyState
          title="No known reference data yet"
          message="No prior permits exist to suggest plants, areas or equipment. You can still enter valid IDs directly."
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                setError(null);
                setStep((current) => current - 1);
              }}
            >
              Back
            </Button>
          )}
        </div>
        <Button
          type="submit"
          loading={busy}
          icon={step < 2 ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : undefined}
        >
          {step < 2 ? 'Continue' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
