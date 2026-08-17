'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { hasMembership, isFeePaid, memberInitials } from '@/lib/member-visual';

export type GymMemberCardData = {
  id: string;
  member_id: string;
  name: string;
  phone?: string | null;
  gender?: string | null;
  status: string;
  plan_id?: string | null;
  amount_paid?: number | null;
  expiry_date?: string | null;
  planName?: string | null;
  meta?: string;
};

export function GymMemberCard({
  member,
  href,
  meta,
}: {
  member: GymMemberCardData;
  href?: string;
  meta?: string;
}) {
  const paid = isFeePaid(member);
  const memberPlan = hasMembership(member);
  const initials = memberInitials(member.name);
  const genderLabel = member.gender ? member.gender : 'Member';

  const content = (
    <article
      className={`relative overflow-hidden rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        paid
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-rose-100 bg-rose-50'
      }`}
    >
      {memberPlan && (
        <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
          <Star className="h-3.5 w-3.5 fill-white" />
        </span>
      )}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white ${
            paid ? 'bg-emerald-500' : 'bg-rose-400'
          }`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{member.name}</p>
          <p className="truncate text-xs text-zinc-500">
            {member.member_id} · {genderLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${
            paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {paid ? 'Fee paid' : 'Fee due'}
        </span>
        <span className="capitalize text-zinc-500">{member.status}</span>
      </div>
      {(meta || member.planName || member.phone) && (
        <p className="mt-2 truncate text-xs text-zinc-500">
          {meta || member.planName || member.phone}
        </p>
      )}
    </article>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
