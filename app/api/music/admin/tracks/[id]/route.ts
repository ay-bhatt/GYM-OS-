import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function writeAuditLog(
  supabase: ReturnType<typeof createServerClient>,
  payload: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  }
) {
  await supabase.from('audit_logs').insert({
    actor_id: payload.actorId,
    action: payload.action,
    target_type: payload.targetType,
    target_id: payload.targetId,
    details: payload.details ?? null,
  });
}

const VALID_STATUSES = new Set(['active', 'disabled', 'license_review', 'pending_review', 'broken', 'removed', 'blocked']);

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const lookupId = params.id;
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .or(`id.eq.${lookupId},provider_track_id.eq.${lookupId}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[api/music/admin/tracks/:id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const lookupId = params.id;
    const body = await request.json();

    const { data: existing, error: fetchError } = await supabase
      .from('music_tracks')
      .select('*')
      .or(`id.eq.${lookupId},provider_track_id.eq.${lookupId}`)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of [
      'title',
      'artist',
      'album',
      'genre',
      'sub_genre',
      'country_or_region',
      'language',
      'source',
      'source_url',
      'license_name',
      'license_url',
      'attribution_text',
      'verification_notes',
      'provider_track_url',
      'artwork_url',
      'stream_url',
    ]) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    for (const field of ['commercial_use_allowed', 'public_performance_allowed', 'attribution_required', 'is_explicit']) {
      if (body[field] !== undefined) updateData[field] = Boolean(body[field]);
    }

    for (const field of ['bpm', 'duration']) {
      if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
        updateData[field] = Number(body[field]);
      }
    }

    if (body.energy_level !== undefined) {
      const energy = Number(body.energy_level);
      if (!Number.isFinite(energy) || energy < 1 || energy > 5) {
        return NextResponse.json({ error: 'Energy level must be between 1 and 5.' }, { status: 400 });
      }
      updateData.energy_level = energy;
    }

    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim();
      if (!VALID_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: 'Invalid track status.' }, { status: 400 });
      }
      updateData.status = nextStatus;
    }

    if (body.verification_date !== undefined) {
      updateData.verification_date = body.verification_date || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('music_tracks')
      .update(updateData)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();

    if (updateError) throw updateError;

    void writeAuditLog(supabase, {
      actorId: session.userId,
      action: 'music_track.updated',
      targetType: 'music_track',
      targetId: existing.id,
      details: {
        provider_track_id: existing.provider_track_id,
        changes: Object.keys(updateData),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/music/admin/tracks/:id] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const supabase = createServerClient();
    const lookupId = params.id;
    const body = await request.json().catch(() => ({}));

    const { data: existing, error: fetchError } = await supabase
      .from('music_tracks')
      .select('*')
      .or(`id.eq.${lookupId},provider_track_id.eq.${lookupId}`)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    if (!body.confirmTrackId || !String(body.confirmTrackId).trim()) {
      return NextResponse.json({ error: 'Track ID confirmation is required.' }, { status: 400 });
    }

    if (normalize(String(body.confirmTrackId)) !== normalize(existing.provider_track_id)) {
      return NextResponse.json({ error: 'Type the exact provider track ID to confirm deletion.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('music_tracks')
      .delete()
      .eq('id', existing.id);

    if (deleteError) throw deleteError;

    void writeAuditLog(supabase, {
      actorId: session.userId,
      action: 'music_track.deleted',
      targetType: 'music_track',
      targetId: existing.id,
      details: {
        provider_track_id: existing.provider_track_id,
        title: existing.title,
      },
    });

    return NextResponse.json({ data: { id: existing.id } });
  } catch (error) {
    console.error('[api/music/admin/tracks/:id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
