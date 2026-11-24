export type Role = 'REQUESTER' | 'AREA_OWNER' | 'SAFETY_OFFICER' | 'ADMIN';

export type PermitType = 'HOT_WORK' | 'CONFINED_SPACE' | 'WORKING_AT_HEIGHT' | 'ELECTRICAL_LOTO';

export type PermitStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CLOSED'
  | 'CLOSED_VERIFIED'
  | 'CANCELLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Permission =
  | 'permit:create'
  | 'permit:read'
  | 'permit:approve'
  | 'permit:activate'
  | 'permit:suspend'
  | 'permit:close'
  | 'permit:cancel'
  | 'permit:worklog'
  | 'permit:verify'
  | 'user:manage';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  areaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reference {
  id: string;
  name: string;
}

export interface AreaReference extends Reference {
  plantId: string;
  plantName: string;
}

export interface EquipmentReference {
  id: string;
  tag: string;
  name: string | null;
}

export interface Approval {
  id: string;
  permitId: string;
  approverId: string | null;
  requiredRole: Role;
  step: number;
  status: ApprovalStatus;
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HotWorkMethod = 'WELDING' | 'GRINDING' | 'CUTTING' | 'SOLDERING';
export type AccessMethod = 'SCAFFOLD' | 'LADDER' | 'MEWP' | 'ROPE';

export interface HotWorkData {
  hotWorkType: HotWorkMethod;
  fireWatch: boolean;
  extinguisherType: string;
  combustiblesClearanceRadiusMetres: number;
  gasReadings: {
    lel: number;
    o2: number;
    recordedAt: string;
  };
}

export interface ConfinedSpaceData {
  spaceId: string;
  entryPoint: string;
  atmosphericReadings: {
    o2: number;
    lel: number;
    h2s: number;
    co: number;
    recordedAt: string;
  };
  attendant: string;
  rescuePlan: string;
  ventilation: string;
  entryExitLog: string;
}

export interface WorkingAtHeightData {
  heightMetres: number;
  accessMethod: AccessMethod;
  fallArrest: boolean;
  anchorCheck: string;
  barricading: boolean;
}

export interface ElectricalLotoData {
  equipmentTag: string;
  voltage: number;
  isolationPoints: string[];
  lockNumbers: string[];
  tagNumbers: string[];
  earthingApplied: boolean;
  testedDead: true;
  testedDeadBy: string;
}

export type PermitTypeData = HotWorkData | ConfinedSpaceData | WorkingAtHeightData | ElectricalLotoData;

export interface Permit {
  id: string;
  permitNumber: string;
  type: PermitType;
  requesterId: string;
  contractorTeam: string;
  workDescription: string;
  plantId: string;
  areaId: string;
  equipmentId: string | null;
  workLocation: string;
  plannedStartAt: string;
  plannedEndAt: string;
  identifiedHazards: string | null;
  requiredPpe: string | null;
  precautions: string | null;
  status: PermitStatus;
  typeData: PermitTypeData;
  validUntil: string | null;
  completionNotes: string | null;
  verificationAreaClean: boolean | null;
  verificationComment: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  requester: Pick<PublicUser, 'id' | 'name' | 'email' | 'role'>;
  plant: Reference;
  area: Reference;
  equipment: EquipmentReference | null;
  verifiedBy: Pick<PublicUser, 'id' | 'name' | 'email' | 'role'> | null;
  approvals: Approval[];
  _count: { workLogs: number };
}

export interface PermitListResponse {
  data: Permit[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PermitQuery {
  page?: number;
  pageSize?: number;
  status?: PermitStatus;
  type?: PermitType;
  plantId?: string;
  areaId?: string;
  startDate?: string;
  endDate?: string;
  myApprovalsPending?: boolean;
  search?: string;
}

export interface PermitPayload {
  type: PermitType;
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
  typeData: PermitTypeData;
}

export interface WorkLog {
  id: string;
  permitId: string;
  actorId: string;
  note: string;
  createdAt: string;
}

export interface PermitAuditEntry {
  id: string;
  permitId: string;
  action: string;
  actor: Pick<PublicUser, 'id' | 'name' | 'email'> | null;
  systemAction: boolean;
  fromValue: string | null;
  toValue: string | null;
  comment: string | null;
  timestamp: string;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
}

export interface ActionResponse {
  comment?: string;
}

export interface CloseResponse {
  completionNotes: string;
}

export interface VerifyResponse {
  areaClean: true;
  comment?: string;
}

export interface ReasonResponse {
  reason: string;
}

export interface ActivationResponse {
  validUntil?: string;
  comment?: string;
}

export interface WorkLogResponse {
  note: string;
}
