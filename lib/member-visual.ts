export function isFeePaid(member: { status: string; amount_paid?: number | null }) {
  return member.status !== 'expired' && Number(member.amount_paid || 0) > 0;
}

export function hasMembership(member: { plan_id?: string | null }) {
  return Boolean(member.plan_id);
}

export function memberInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatClock(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
