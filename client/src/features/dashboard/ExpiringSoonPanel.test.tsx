import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ExpiryIndicator from '../../components/ui/ExpiryIndicator';
import type { Permit } from '../../types/api';
import ExpiringSoonPanel from './ExpiringSoonPanel';

const MINUTE = 60_000;
const NOW = Date.parse('2026-11-24T12:00:00.000Z');

function permit(overrides: Partial<Permit> = {}): Permit {
  return {
    id: 'permit-1',
    permitNumber: 'PTW-2026-000101',
    type: 'HOT_WORK',
    requesterId: 'user-1',
    contractorTeam: 'Acme',
    workDescription: 'Replace pump bearing',
    plantId: 'plant-1',
    areaId: 'area-1',
    equipmentId: 'equipment-1',
    workLocation: 'Maintenance Bay A',
    plannedStartAt: '2026-11-24T08:00:00.000Z',
    plannedEndAt: '2026-11-24T14:00:00.000Z',
    identifiedHazards: null,
    requiredPpe: null,
    precautions: null,
    status: 'ACTIVE',
    typeData: {} as Permit['typeData'],
    validUntil: new Date(NOW + 90 * MINUTE).toISOString(),
    version: 1,
    createdAt: '2026-11-24T07:00:00.000Z',
    updatedAt: '2026-11-24T08:00:00.000Z',
    requester: {
      id: 'user-1',
      name: 'Test Requester',
      email: 'requester@example.com',
      role: 'REQUESTER',
    },
    plant: { id: 'plant-1', name: 'Plant A' },
    area: { id: 'area-1', name: 'Area A' },
    equipment: { id: 'equipment-1', tag: 'EQ-101', name: 'Pump A' },
    approvals: [],
    _count: { workLogs: 0 },
    ...overrides,
  };
}

function renderPanel(permits: Permit[]): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ExpiringSoonPanel permits={permits} now={NOW} />
    </MemoryRouter>,
  );
}

describe('expiring soon UI', () => {
  it('renders dashboard warnings from API permit data only for active permits within two hours', () => {
    const soon = permit();
    const later = permit({
      id: 'permit-2',
      permitNumber: 'PTW-2026-000102',
      validUntil: new Date(NOW + 3 * 60 * MINUTE).toISOString(),
    });
    const expired = permit({
      id: 'permit-3',
      permitNumber: 'PTW-2026-000103',
      status: 'EXPIRED',
      validUntil: new Date(NOW - MINUTE).toISOString(),
    });

    const html = renderPanel([soon, later, expired]);

    expect(html).toContain('Expiring Soon');
    expect(html).toContain('Active permits expiring within the next 2 hours.');
    expect(html).toContain('PTW-2026-000101');
    expect(html).toContain('Hot Work');
    expect(html).toContain('EQ-101');
    expect(html).toContain('Expires in 1 hour 30 minutes');
    expect(html).toContain('href="/permits/permit-1"');
    expect(html).not.toContain('PTW-2026-000102');
    expect(html).not.toContain('PTW-2026-000103');
  });

  it('renders a safe fallback for an invalid expiry value', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ExpiryIndicator
          permit={{ status: 'ACTIVE', validUntil: 'not-a-date' }}
          now={NOW}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Expiry time unavailable');
    expect(html).not.toContain('Expiring Soon');
  });
});
