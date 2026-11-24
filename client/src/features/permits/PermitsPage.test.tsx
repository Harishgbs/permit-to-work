import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MyApprovalsPendingToggle } from './PermitsPage';

function renderToggle(visible: boolean, checked: boolean): string {
  return renderToStaticMarkup(
    <MyApprovalsPendingToggle visible={visible} checked={checked} onChange={() => undefined} />,
  );
}

describe('My Approvals Pending filter', () => {
  it('hides the toggle from requesters', () => {
    expect(renderToggle(false, false)).toBe('');
  });

  it('renders the toggle as disabled for approvers', () => {
    const html = renderToggle(true, false);

    expect(html).toContain('My Approvals Pending');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('checked');
  });

  it('renders the toggle as enabled for approvers', () => {
    const html = renderToggle(true, true);

    expect(html).toContain('My Approvals Pending');
    expect(html).toContain('checked');
  });
});
