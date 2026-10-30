import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');
  const tier = searchParams.get('tier');

  let list = db.getFormularies();
  if (accountId) {
    list = list.filter((f) => f.account_id === accountId);
  }
  if (tier) {
    list = list.filter((f) => f.formulary_tier === tier);
  }

  return NextResponse.json({
    items: list,
    total: list.length,
    tier1_count: list.filter((f) => f.formulary_tier === 'Tier 1 Preferred').length,
    total_potential_value: list.reduce((acc, curr) => acc + curr.annual_potential_value, 0),
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Formulary item ID required' }, { status: 400 });
    }
    const updated = db.updateFormulary(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Formulary item not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update formulary item' }, { status: 500 });
  }
}
