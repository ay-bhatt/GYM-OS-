import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const planId = params.id;
    const body = await request.json();

    // Fetch existing plan to verify ownership
    let planQuery = supabase
      .from('membership_plans')
      .select('id, gym_id, price, discount')
      .eq('id', planId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      planQuery = planQuery.eq('gym_id', session.gymId);
    }

    const { data: existingPlan, error: fetchError } = await planQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    const allowedFields = ['name', 'duration_days', 'description', 'status'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle price/discount changes — recalculate final_price
    const price = body.price !== undefined ? Number(body.price) : Number(existingPlan.price);
    const discount = body.discount !== undefined ? Number(body.discount) : Number(existingPlan.discount);

    if (body.price !== undefined || body.discount !== undefined) {
      const finalPrice = price - discount;
      if (finalPrice < 0) {
        return NextResponse.json({ error: 'Discount cannot exceed price' }, { status: 400 });
      }
      updateData.price = price;
      updateData.discount = discount;
      updateData.final_price = finalPrice;
    }

    const { data: updatedPlan, error: updateError } = await supabase
      .from('membership_plans')
      .update(updateData)
      .eq('id', planId)
      .select('id, gym_id, name, duration_days, price, discount, final_price, description, status, created_at, updated_at')
      .maybeSingle();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedPlan });
  } catch (error) {
    console.error('Plan PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const planId = params.id;

    // Verify ownership before deleting
    let planQuery = supabase
      .from('membership_plans')
      .select('id, gym_id')
      .eq('id', planId);

    if (session.role === 'GYM_ADMIN') {
      if (!session.gymId) {
        return NextResponse.json({ error: 'No gym associated with account' }, { status: 403 });
      }
      planQuery = planQuery.eq('gym_id', session.gymId);
    }

    const { data: existingPlan, error: fetchError } = await planQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', planId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Plan DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
