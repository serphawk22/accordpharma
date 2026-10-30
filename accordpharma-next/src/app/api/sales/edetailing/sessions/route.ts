import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.contact_id || !body.account_id || !body.product_name) {
      return NextResponse.json({ error: 'Missing session parameters' }, { status: 400 });
    }

    const result = db.logDetailingSession({
      contact_id: body.contact_id,
      account_id: body.account_id,
      product_name: body.product_name,
      duration_seconds: Number(body.duration_seconds || 180),
      sentiment: body.sentiment || 'very_receptive',
      objections: body.objections || [],
      sample_units_requested: Number(body.sample_units_requested || 0),
      notes: body.notes || '',
    });

    return NextResponse.json({
      success: true,
      activity: result.activity,
      task: result.task,
      message: 'Detailing encounter and CRM compliance records logged successfully',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to record detailing session' }, { status: 500 });
  }
}
